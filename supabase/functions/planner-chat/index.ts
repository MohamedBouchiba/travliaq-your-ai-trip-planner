import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPhaseSystemPrompt, normalizeTravelPhase, isWidgetValidInPhase, type TravelPhase } from "./prompts/phasePrompts.ts";
import { detectLanguage, getLocalizedContent, type SupportedLanguage } from "./prompts/systemPrompts.ts";
import { createRequestLogger, extractRequestId, type RequestLogger } from "../_shared/logger.ts";
import { checkRateLimit as checkRateLimitDB, cleanupRateLimits } from "../_shared/rateLimit.ts";
import {
  FlightDataSchema,
  AccommodationDataSchema,
  PreferencesDataSchema,
  QuickRepliesDataSchema,
  DestinationSuggestionRequestSchema,
  FlightSearchTriggerSchema,
  validateToolOutput,
} from "./validators/schemas.ts";

// Import tools from modular files
import { intentClassifierTool, parseIntentClassification, type IntentClassificationResult } from "./tools/intentClassifier.ts";
import { parseReasoningResult, type ReasoningResult } from "./tools/reasoningEngine.ts";
import { flightExtractionTool } from "./tools/flightExtractor.ts";
import { accommodationExtractionTool } from "./tools/accommodationExtractor.ts";
import { preferenceExtractionTool } from "./tools/preferenceExtractor.ts";
import { quickRepliesExtractionTool } from "./tools/quickReplies.ts";
import { destinationSuggestionTool } from "./tools/destinationSuggestions.ts";
import { flightSearchTriggerTool } from "./tools/flightSearchTrigger.ts";
import { tripRecapTool } from "./tools/tripRecap.ts";
import { TOOL_NAMES } from "./tools/index.ts";

// Import utilities
import {
  generateToolRunId,
  getCachedToolResult,
  cacheToolResult,
  buildToolResponseMessage,
  shouldContinueToolLoop,
  createEmptyCollectedData,
  mergeToolData,
  MULTI_TOOL_CONFIG,
  type CollectedToolData,
  type ToolExecutionResult,
} from "./utils/toolExecutor.ts";
import { fetchWithRetry } from "./utils/fetchWithRetry.ts";
import { truncateMessages, estimateMessagesTokens } from "./utils/tokenEstimator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

// ============================================================================
// DATE YEAR NORMALIZATION - Safety net against LLM hallucinating past years
// ============================================================================
/**
 * Normalize dates extracted by LLM tools to ensure they use the correct year.
 * If a date is in the past relative to currentDate, bump it to the current or next year.
 */
export function normalizeExtractedYears(collectedData: CollectedToolData, currentDate: string): void {
  const today = new Date(currentDate + "T00:00:00Z");
  const currentYear = today.getFullYear();

  function fixDate(dateStr: string | undefined): string | undefined {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parsed = new Date(dateStr + "T00:00:00Z");
    if (isNaN(parsed.getTime())) return dateStr;
    
    // If the year is in the past (before current year), fix it
    if (parsed.getFullYear() < currentYear) {
      const candidateThisYear = new Date(Date.UTC(currentYear, parsed.getMonth(), parsed.getDate()));
      if (candidateThisYear >= today) {
        return `${currentYear}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
      }
      // Date this year is also past, use next year
      return `${currentYear + 1}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
    return dateStr;
  }

  // Fix flight data dates
  if (collectedData.flightData) {
    collectedData.flightData.departureDate = fixDate(collectedData.flightData.departureDate as string | undefined) as string;
    collectedData.flightData.returnDate = fixDate(collectedData.flightData.returnDate as string | undefined) as string;
    // Fix legs dates
    if (collectedData.flightData.legs && Array.isArray(collectedData.flightData.legs)) {
      for (const leg of collectedData.flightData.legs as Array<{ date?: string }>) {
        if (leg.date) leg.date = fixDate(leg.date);
      }
    }
  }

  // Fix intent classification dates
  if (collectedData.intentClassification?.entities) {
    const e = collectedData.intentClassification.entities;
    if (e.exactDepartureDate) e.exactDepartureDate = fixDate(e.exactDepartureDate);
    if (e.exactReturnDate) e.exactReturnDate = fixDate(e.exactReturnDate);
  }
}

// ============================================================================
// RATE LIMITING - Per-user, per-minute, persistent via Supabase
// ============================================================================
const MAX_REQUESTS_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

async function checkRateLimit(userId: string, log: RequestLogger): Promise<boolean> {
  const allowed = await checkRateLimitDB(userId, MAX_REQUESTS_PER_MINUTE, "planner-chat", RATE_LIMIT_WINDOW_MS);
  if (!allowed) {
    log.warn("rate_limit", "Rate limit exceeded", { user_id: userId });
  }
  if (Math.random() < 0.01) {
    cleanupRateLimits();
  }
  return allowed;
}

const MAX_MESSAGES = 50;

// All available tools for the LLM
// A1: plan_response (reasoningTool) removed — classify_intent already handles intent+reasoning
// in a dedicated call. Keeping plan_response caused redundant ReAct iterations.
const ALL_TOOLS = [
  intentClassifierTool,
  flightExtractionTool,
  accommodationExtractionTool,
  preferenceExtractionTool,
  destinationSuggestionTool,
  quickRepliesExtractionTool,
  flightSearchTriggerTool,
  tripRecapTool,
];

// A6: Phase-specific tool filtering — only expose relevant tools per phase
// classify_intent is always excluded from ReAct (handled in dedicated call)
// plan_response removed (A1) — reasoning now handled inline by the LLM
// generate_quick_replies is always included (needed in every phase)
const TOOL_NAMES_BY_PHASE: Record<TravelPhase, Set<string>> = {
  discovery: new Set([
    "update_preferences",
    "request_destination_suggestions",
    "generate_quick_replies",
  ]),
  logistics: new Set([
    "update_flight_widget",
    "update_preferences",
    "trigger_flight_search",
    "generate_quick_replies",
  ]),
  accommodation: new Set([
    "update_accommodation_widget",
    "update_preferences",
    "generate_quick_replies",
  ]),
  activities: new Set([
    "update_preferences",
    "generate_quick_replies",
  ]),
  recap: new Set([
    "generate_quick_replies",
    "generate_trip_recap",
  ]),
};

/**
 * Process a single tool call and return the result
 */
function processToolCall(
  toolCall: { id: string; function: { name: string; arguments: string } },
  requestId: string,
  collectedData: CollectedToolData,
  log: RequestLogger,
  preferencesState: { interests: string[]; style: string | null; pace: string | null },
  blockedWidgets: string[] = [],
): { result: ToolExecutionResult; updatedData: Partial<CollectedToolData> } {
  const toolRunId = generateToolRunId(requestId, toolCall.id);
  const toolName = toolCall.function?.name || "unknown";
  const toolStartTime = Date.now();
  
  // Check cache for idempotence
  const cachedResult = getCachedToolResult(toolRunId);
  if (cachedResult) {
    log.info("tool_cache", `Cache hit for ${toolName}`, { toolRunId });
    return { result: cachedResult, updatedData: {} };
  }
  
  log.toolStart(toolName);
  
  const updatedData: Partial<CollectedToolData> = {};
  let result: ToolExecutionResult = { success: true, data: { message: "Processed" } };
  
  try {
    switch (toolName) {
      case "plan_response": {
        const reasoningData = parseReasoningResult(toolCall.function.arguments);
        if (reasoningData) {
          updatedData.reasoningData = reasoningData;
          result = { success: true, data: { message: "Reasoning processed", reasoning: reasoningData } };
          
          if (reasoningData.confidence < 70) {
            log.warn("tool_execution", "Low confidence reasoning", { confidence: reasoningData.confidence });
          }
        }
        break;
      }
      
      case "classify_intent": {
        let intentClassification = parseIntentClassification(toolCall.function.arguments);
        if (intentClassification) {
          // Apply deterministic preference-first override (CR2: applyWidgetForcingLogic removed)
          intentClassification = applyPreferenceFirstLogic(intentClassification, preferencesState, log, blockedWidgets);
          // B5: Correct budget/style confusion
          intentClassification = applyBudgetStyleGuard(intentClassification, log);
          updatedData.intentClassification = intentClassification;
          result = { success: true, data: { message: "Intent classified", intent: intentClassification } };
        }
        break;
      }
      
      case "update_flight_widget": {
        const validationResult = validateToolOutput(FlightDataSchema, toolCall.function.arguments, toolName);
        if (validationResult.success && validationResult.data) {
          let flightData = validationResult.data;
          flightData = Object.fromEntries(
            Object.entries(flightData).filter(([_, v]) => v !== null && v !== undefined && v !== "")
          );
          if (Object.keys(flightData).length > 0) {
            updatedData.flightData = flightData;
            result = { success: true, data: { message: "Widget mis à jour", extracted: flightData } };
          }
        } else {
          result = {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: validationResult.error?.message || "Invalid flight data",
              suggestion: "Please ensure dates are in YYYY-MM-DD format and passenger counts are between 1-9"
            }
          };
        }
        break;
      }
      
      case "update_accommodation_widget": {
        const validationResult = validateToolOutput(AccommodationDataSchema, toolCall.function.arguments, toolName);
        if (validationResult.success && validationResult.data) {
          let accommodationData = validationResult.data;
          accommodationData = Object.fromEntries(
            Object.entries(accommodationData).filter(([_, v]) => 
              v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
            )
          );
          if (Object.keys(accommodationData).length > 0) {
            updatedData.accommodationData = accommodationData;
            result = { success: true, data: { message: "Accommodation updated", extracted: accommodationData } };
          }
        } else {
          result = {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: validationResult.error?.message || "Invalid accommodation data",
            }
          };
        }
        break;
      }
      
      case "update_preferences": {
        const validationResult = validateToolOutput(PreferencesDataSchema, toolCall.function.arguments, toolName);
        if (validationResult.success && validationResult.data) {
          let preferencesData = validationResult.data;
          preferencesData = Object.fromEntries(
            Object.entries(preferencesData).filter(([_, v]) =>
              v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
            )
          );
          // B14: Merge dietary restrictions with existing data (don't overwrite)
          if (preferencesData.dietaryRestrictions && collectedData.preferencesData?.dietaryRestrictions) {
            const merged = [...new Set([
              ...collectedData.preferencesData.dietaryRestrictions,
              ...preferencesData.dietaryRestrictions,
            ])];
            preferencesData.dietaryRestrictions = merged;
            log.info("dietary_merge", "Merged dietary restrictions from previous tool call", { merged });
          }
          if (Object.keys(preferencesData).length > 0) {
            updatedData.preferencesData = preferencesData;
            result = { success: true, data: { message: "Preferences updated", extracted: preferencesData } };
          }
        } else {
          result = {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: validationResult.error?.message || "Invalid preferences data",
            }
          };
        }
        break;
      }
      
      case "generate_quick_replies": {
        const validationResult = validateToolOutput(QuickRepliesDataSchema, toolCall.function.arguments, toolName);
        if (validationResult.success && validationResult.data) {
          let quickRepliesData = validationResult.data;
          if (quickRepliesData.replies && Array.isArray(quickRepliesData.replies)) {
            quickRepliesData.replies = quickRepliesData.replies
              .filter((r: unknown) => (r as { label?: string; message?: string })?.label && (r as { label?: string; message?: string })?.message)
              .slice(0, 4);
          }
          if (quickRepliesData.replies?.length > 0) {
            updatedData.quickRepliesData = quickRepliesData;
            result = { success: true, data: { message: "Quick replies generated", replies: quickRepliesData } };
          }
        } else {
          result = {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: validationResult.error?.message || "Invalid quick replies",
            }
          };
        }
        break;
      }
      
      case "request_destination_suggestions": {
        const validationResult = validateToolOutput(DestinationSuggestionRequestSchema, toolCall.function.arguments, toolName);
        if (validationResult.success && validationResult.data) {
          const destinationRequest = validationResult.data;
          if (destinationRequest.requestedCount > 5) {
            destinationRequest.requestedCount = 5;
            destinationRequest.exceededLimit = true;
          }
          updatedData.destinationSuggestionRequest = destinationRequest;
          result = { success: true, data: { message: "Destination suggestions requested", request: destinationRequest } };
        } else {
          result = {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: validationResult.error?.message || "Invalid destination request",
            }
          };
        }
        break;
      }
      
      case "trigger_flight_search": {
        const validationResult = validateToolOutput(FlightSearchTriggerSchema, toolCall.function.arguments, toolName);
        if (validationResult.success && validationResult.data) {
          const searchTrigger = validationResult.data;
          if (searchTrigger.confirmed) {
            updatedData.flightSearchTrigger = true;
          }
          result = { success: true, data: { message: "Flight search triggered", confirmed: searchTrigger.confirmed } };
        } else {
          result = {
            success: false,
            error: {
              code: "VALIDATION_FAILED",
              message: validationResult.error?.message || "Invalid search trigger",
            }
          };
        }
        break;
      }

      case "generate_trip_recap": {
        try {
          const recapData = JSON.parse(toolCall.function.arguments);
          if (recapData?.destination?.city) {
            updatedData.tripRecapData = recapData;
            result = { success: true, data: { message: "Trip recap generated", recap: recapData } };
          } else {
            result = { success: false, error: { code: "VALIDATION_FAILED", message: "Trip recap requires at least a destination" } };
          }
        } catch {
          result = { success: false, error: { code: "PARSE_ERROR", message: "Invalid trip recap JSON" } };
        }
        break;
      }

      default:
        log.warn("tool_execution", `Unknown tool: ${toolName}`);
        result = {
          success: false,
          error: {
            code: "UNKNOWN_TOOL",
            message: `Tool ${toolName} is not recognized`,
          }
        };
    }
  } catch (error) {
    log.error("tool_execution", `Error processing ${toolName}`, error instanceof Error ? error : undefined);
    result = {
      success: false,
      error: {
        code: "EXECUTION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      }
    };
  }
  
  const latency = Date.now() - toolStartTime;
  log.toolEnd(toolName, result.success, latency, JSON.stringify(updatedData).slice(0, 100));
  
  // Cache the result for idempotence
  cacheToolResult(toolRunId, result);
  
  return { result, updatedData };
}

/**
 * Deterministic preference-first override logic
 * Overrides LLM intent when user is indecisive and preferences are missing
 * 
 * CR2: applyWidgetForcingLogic removed (dead code: detectedEntities never existed,
 * keywords were French-only). Guards added to protect conversational intents.
 */
function applyPreferenceFirstLogic(
  intentClassification: IntentClassificationResult,
  preferencesState: { interests: string[]; style: string | null },
  log: RequestLogger,
  blockedWidgets: string[] = [],
): IntentClassificationResult {
  // GUARD: Never override conversational intents (CR2)
  const CONVERSATIONAL_INTENTS = [
    "greeting", "thank_you", "other", "ask_question",
    "compare_options", "ask_recommendations",
    "confirm_selection", "modify_selection", "cancel_or_restart",
  ];
  if (CONVERSATIONAL_INTENTS.includes(intentClassification.primaryIntent)) {
    return intentClassification;
  }

  // GUARD: Never override when LLM already assigned a specific non-preference widget (CR2)
  const NON_PREFERENCE_WIDGETS = [
    "budgetRangeSlider", "dietary", "mustHaves",
    "citySelector", "datePicker", "dateRangePicker",
    "travelersSelector", "tripTypeConfirm",
  ];
  if (intentClassification.widgetToShow?.type &&
      NON_PREFERENCE_WIDGETS.includes(intentClassification.widgetToShow.type)) {
    return intentClassification;
  }
  // Normalize: LLM sometimes returns widget types as primaryIntent (e.g. "preferenceInterests")
  const WIDGET_TYPE_AS_INTENT = [
    "preferenceInterests", "preferenceStyle", "dietary", "mustHaves",
    "citySelector", "datePicker", "dateRangePicker", "travelersSelector",
    "destinationSuggestions", "tripTypeConfirm",
  ];
  if (WIDGET_TYPE_AS_INTENT.includes(intentClassification.primaryIntent)) {
    log.info("preference_first", `Normalizing widget-as-intent: ${intentClassification.primaryIntent}`);
    // Set the widget if not already set
    if (!intentClassification.widgetToShow) {
      intentClassification.widgetToShow = {
        type: intentClassification.primaryIntent,
        reason: "Extracted from primaryIntent (LLM used widget type as intent)",
      };
    }
    // Map to proper intent
    if (["preferenceInterests", "preferenceStyle", "dietary", "mustHaves"].includes(intentClassification.primaryIntent)) {
      intentClassification.primaryIntent = "gather_preferences";
    } else if (intentClassification.primaryIntent === "destinationSuggestions") {
      intentClassification.primaryIntent = "ask_inspiration";
    } else {
      intentClassification.primaryIntent = "other";
    }
  }

  const isIndecisIntent = [
    "gather_preferences", "ask_inspiration", "search_destination"
  ].includes(intentClassification.primaryIntent);
  
  const isDestinationSuggestion = 
    intentClassification.widgetToShow?.type === "destinationSuggestions" ||
    intentClassification.primaryIntent === "ask_inspiration";

  if ((isIndecisIntent || isDestinationSuggestion) && !preferencesState.styleAxesConfigured) {
    // FIX: If preferenceStyle is blocked (already confirmed by user), do NOT force it again
    if (blockedWidgets.includes("preferenceStyle")) {
      log.info("preference_first", "preferenceStyle blocked (already confirmed), skipping override");
    } else {
      log.info("preference_first", "Overriding to preferenceStyle (styleAxes not configured)");
      intentClassification.primaryIntent = "gather_preferences";
      intentClassification.widgetToShow = {
        type: "preferenceStyle",
        reason: "Travel style needed before suggesting destinations",
      };
      return intentClassification;
    }
  }

  if ((isIndecisIntent || isDestinationSuggestion) && 
      (!preferencesState.interests || preferencesState.interests.length === 0)) {
    // FIX: If preferenceInterests is blocked (already confirmed), do NOT force it again
    if (blockedWidgets.includes("preferenceInterests")) {
      log.info("preference_first", "preferenceInterests blocked (already confirmed), skipping override");
    } else {
      log.info("preference_first", "Overriding to preferenceInterests (empty interests)");
      intentClassification.primaryIntent = "gather_preferences";
      intentClassification.widgetToShow = {
        type: "preferenceInterests",
        reason: "Preferences must be collected before suggesting destinations",
      };
      return intentClassification;
    }
  }

  return intentClassification;
}

/**
 * B5: Guard against budget/style confusion.
 * If the LLM assigned preferenceStyle but entities contain budget-related signals,
 * correct the widget to budgetRangeSlider.
 */
function applyBudgetStyleGuard(
  intent: IntentClassificationResult,
  log: RequestLogger
): IntentClassificationResult {
  if (intent.widgetToShow?.type !== "preferenceStyle") return intent;

  const entities = intent.entities || {};
  const hasBudgetSignal =
    entities.budgetLevel != null ||
    entities.budgetMin != null ||
    entities.budgetMax != null ||
    entities.priceRange != null;

  if (hasBudgetSignal) {
    log.info("budget_style_guard", "Correcting preferenceStyle → budgetRangeSlider (budget entities detected)", {
      entities: Object.keys(entities),
    });
    return {
      ...intent,
      widgetToShow: {
        type: "budgetRangeSlider",
        reason: "Budget-related entities detected, using budget widget instead of style widget",
      },
    };
  }

  return intent;
}

/**
 * Build a minimal system prompt for the dedicated classification call.
 * ~100 tokens instead of ~3000 — one task, one tool, clear instructions.
 */
function buildClassificationSystemPrompt(
  preferencesState: { interests: string[]; style: string | null; pace: string | null },
  blockedWidgets: string[] = [],
  currentDate?: string,
): string {
  const interestsStr = preferencesState.interests.length > 0
    ? preferencesState.interests.join(", ")
    : "VIDE";
  const styleStr = preferencesState.style || "NON DÉFINI";
  const blockedStr = blockedWidgets.length > 0
    ? blockedWidgets.join(", ")
    : "aucun";

  const dateStr = currentDate || new Date().toISOString().split("T")[0];
  const currentYear = dateStr.split("-")[0];

  return `Tu es un classificateur d'intention pour un assistant de voyage.
DATE ACTUELLE: ${dateStr}
RÈGLE DATES: Toute date sans année explicite utilise l'année ${currentYear}. Si la date résultante est dans le passé, utilise ${parseInt(currentYear) + 1}. Ne JAMAIS inventer une année comme 2024 ou 2025 si nous sommes en ${currentYear}.

Analyse le DERNIER message utilisateur en tenant compte du contexte conversationnel fourni.
Les messages précédents te donnent le contexte de la conversation.
Utilise-les pour désambiguïser les intentions (ex: "2" = sélection si liste proposée, "Valentine's trip" = style de voyage si pas de contexte de dates explicite).
Le DERNIER message utilisateur est celui à classifier. Appelle classify_intent.

CONTEXTE PRÉFÉRENCES ACTUELLES:
- Intérêts: ${interestsStr}
- Style: ${styleStr}

[WIDGETS DÉJÀ CONFIRMÉS] ${blockedStr}
RÈGLE: Ne JAMAIS suggérer un widget qui est dans la liste ci-dessus. Ces widgets ont déjà été complétés par l'utilisateur.

RÈGLE CRITIQUE: Si l'utilisateur hésite / ne sait pas et que le style est NON DÉFINI, 
primaryIntent = "gather_preferences", widgetType = "preferenceStyle".
Si le style existe mais les intérêts sont VIDES et "preferenceInterests" n'est PAS dans les widgets confirmés,
primaryIntent = "gather_preferences", widgetType = "preferenceInterests".
Si l'utilisateur répond négativement (non, pas spécialement, rien, etc.), primaryIntent = "other", widgetToShow = null.

RÈGLE CRITIQUE : NOMBRES EN CONTEXTE
Si le dernier message assistant contenait une liste numérotée (1. Option A / 2. Option B) 
et que l'utilisateur répond uniquement par un nombre ("2", "1", "3") :
→ primaryIntent: "confirm_selection"
→ entities.selectedOption: "[le numéro]"
→ NE PAS interpréter comme provide_travelers ou adults
Un nombre SEUL n'est JAMAIS un nombre de voyageurs sauf si le contexte 
parle explicitement de voyageurs/passagers/personnes.

RÈGLE LANGUE: Détecte la langue du DERNIER message utilisateur et renseigne detectedLanguage.
Exemples: "Bonjour, je cherche un vol" → "fr", "Hi I want to travel" → "en", "Hola quiero viajar" → "es".`;
}

/**
 * Build the system prompt
 * Language parameter controls the response language.
 * The LLM is also instructed to mirror the user's language dynamically.
 */
function buildSystemPrompt(phase: TravelPhase, negativeContext: string, widgetContext: string, currentDate: string, widgetsContext: string, language: SupportedLanguage = "fr"): string {
  const phasePrompt = buildPhaseSystemPrompt(phase, negativeContext, widgetContext, currentDate, widgetsContext);
  const content = getLocalizedContent(language);
  
  // Language-specific response instruction
  const languageInstructions: Record<SupportedLanguage, string> = {
    fr: "Réponds en français",
    en: "Respond in English",
    es: "Responde en español",
  };
  const responseLanguage = languageInstructions[language] || languageInstructions.en;
  
  return `## RÈGLE ABSOLUE NUMÉRO 1 : LANGUE
Tu DOIS répondre dans la MÊME LANGUE que le dernier message de l'utilisateur.
Si l'utilisateur écrit en français, tu réponds en français. AUCUNE EXCEPTION.
Ne réponds JAMAIS en anglais sauf si l'utilisateur écrit en anglais.
La langue de l'utilisateur PRIME sur toute autre instruction.

${content.persona} Tu guides l'utilisateur pas à pas, UNE QUESTION À LA FOIS, pour l'aider à planifier son voyage idéal.

## RAPPEL LANGUE
${responseLanguage}. Si l'utilisateur écrit dans une autre langue, utilise SA langue.

## RÈGLE D'OR : CONTEXTE ET MÉMOIRE
Tu disposes du contexte complet de la conversation incluant :
- [CONTEXTE MÉMOIRE] : résumé de ce qui est déjà configuré
- [INTERACTIONS UTILISATEUR] : historique des choix faits via les widgets
- [CHAMPS MANQUANTS] : ce qu'il reste à collecter

## RÈGLE D'OR : UNE ÉTAPE À LA FOIS + WIDGETS IMMÉDIATS
Tu ne poses qu'UNE SEULE question par message. Tu ne montres qu'UN SEUL widget à la fois.

## COMPORTEMENT CLÉ : DÉTECTION PAYS vs VILLE
Si l'utilisateur mentionne un PAYS :
1. Utiliser needsCitySelection: true
2. Mettre toCountryCode avec le code ISO2
3. NE PAS mettre de valeur dans "to"

## WORKFLOW PAR PHASES
Le voyage se planifie en 5 phases :
1. DISCOVERY → Préférences puis destination
2. LOGISTICS → Dates, voyageurs, ville départ, vols
3. ACCOMMODATION → Type, critères, comparaison, sélection hôtel
4. ACTIVITIES → Rythme, intérêts spécifiques, planning jour par jour
5. RECAP → Résumé complet, ajustements, export

Tu es actuellement en PHASE ci-dessous.
Suis les instructions spécifiques de la phase active.
Suis la phase en cours EN PRIORITÉ. Cependant, si l'utilisateur pose une question hors-phase (activités, comparaison, budget, informations générales sur une destination), réponds COMPLÈTEMENT à sa question sans la bloquer. Après avoir répondu, rappelle brièvement où vous en êtes dans le processus et propose de continuer. Ne refuse JAMAIS de répondre à une question pertinente au voyage.

## RÈGLE CRITIQUE : PRÉFÉRENCES AVANT DESTINATIONS
Si l'utilisateur dit "je sais pas", "je ne sais pas où aller", "aide-moi", "j'hésite" :
1. Vérifie si les préférences sont renseignées (interests, travelStyle, pace, etc.)
2. Si les préférences sont VIDES ou INCOMPLÈTES :
   - NE PAS proposer de destinations tout de suite
   - D'abord demander les préférences via le widget preferenceInterests ou preferenceStyle
   - Utiliser l'outil update_preferences pour extraire les indices
   - Afficher le widget preferenceStyle pour collecter les envies (NE PAS lister les options dans le texte)
3. SEULEMENT après avoir collecté au moins les intérêts, proposer des destinations adaptées

## RÈGLE : SUGGESTIONS DE DESTINATIONS (ANTI-PROACTIVITÉ)
N'appelle JAMAIS request_destination_suggestions de ta propre initiative.
Tu ne dois l'appeler QUE si l'utilisateur demande EXPLICITEMENT des suggestions
(ex: "propose-moi des destinations", "inspire-moi", "où partir ?", "oui" en réponse à ta question).
Après avoir collecté les préférences, pose la question :
"Souhaitez-vous que je vous propose des destinations adaptées à vos goûts ?"
Attends la réponse AVANT d'appeler l'outil.
Si l'utilisateur dit "non", "pas pour l'instant", ou mentionne directement une destination, ne propose PAS de suggestions.

## STYLE
- Chaleureux et bienveillant
- Emojis avec modération (1-2 max)
- Phrases courtes

## RÈGLE CRITIQUE : TEXTE COURT QUAND WIDGET AFFICHÉ
Quand widgetToShow est défini dans classify_intent, ton texte doit être TRÈS COURT (1-2 phrases max).
Le widget EST l'interface — il affiche déjà les options. Tu ne dois JAMAIS les répéter dans le texte.

RÈGLE ABSOLUE : NE FAIS JAMAIS de liste à puces (- ou •) quand un widget est affiché. Le widget EST la liste.

Exemples corrects par widget :
- preferenceStyle → "On va d'abord cerner ton style de voyage pour te faire les meilleures recommandations :"
- preferenceInterests → "Sélectionne les activités qui te tentent le plus :"
- dietary → "Indique tes restrictions alimentaires ci-dessous :"
- dateRangePicker → "Choisis tes dates de voyage :"
- travelersSelector → "Combien êtes-vous ? 🧳"

Exemples INTERDITS (NE FAIS JAMAIS ÇA) :
- "Indique ce qui t'attire : 🏖️ Plage, 🏛️ Culture, 🌲 Aventure, 🛍️ Shopping" ← INTERDIT : c'est une liste qui duplique le widget
- "Voici les options : - Option A - Option B - Option C" ← INTERDIT : le widget montre déjà les options
- Tout texte contenant des tirets (-), puces (•) ou emojis listant des catégories quand un widget est visible ← INTERDIT

## INFOS TECHNIQUES
- Date actuelle : ${currentDate}
- ${content.defaultYear}
- ${responseLanguage}

${phasePrompt}

## RÈGLES CRITIQUES : ANTI-HALLUCINATION
Tu ne DOIS JAMAIS inventer ou estimer :
- Prix (vols, hôtels, activités) → utilise trigger_flight_search ou dis "lançons une recherche"
- Horaires de vols ou disponibilités → utilise les outils de recherche
- Météo, distances, durées de trajet → dis "je n'ai pas cette donnée précise"
- Visa, réglementations → renvoie vers les sources officielles
- Notes/avis → ne cite jamais de chiffre sans source API

Si tu n'as pas l'info : dis-le clairement et propose un outil ou une action concrète.

## RECHERCHE DE VOLS - COMPORTEMENT ATTENDU
Quand trigger_flight_search est appelé, le formulaire de recherche est PRÉ-REMPLI dans l'onglet Vols.
L'utilisateur doit VÉRIFIER le formulaire et lancer la recherche manuellement.
NE DIS JAMAIS "je recherche" ou "les résultats arrivent".
DIS : "J'ai pré-rempli le formulaire de recherche dans l'onglet Vols. Vérifiez les détails et lancez la recherche quand vous êtes prêt."

## RÉFLEXION AVANT RÉPONSE
Avant de répondre, pense brièvement :
1. Que veut l'utilisateur ? (intention explicite + implicite)
2. Que sais-tu déjà ? (destination, dates, voyageurs, préférences)
3. Quelle est la prochaine étape logique ?
4. Quel outil appeler ? (update_preferences, update_flight_widget, generate_quick_replies, etc.)
Si confiance faible, demande une clarification plutôt que de deviner.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      messages, 
      stream = false, 
      currentPhase, 
      negativePreferences, 
      widgetHistory, 
      activeWidgetsContext, 
      language: requestLanguage, 
      blockedWidgets = [], 
      requestId: bodyRequestId,
      preferencesState: rawPreferencesState,
    } = body;
    
    // Parse preferences state for deterministic override logic
    const preferencesState = {
      interests: Array.isArray(rawPreferencesState?.interests) ? rawPreferencesState.interests as string[] : [],
      style: typeof rawPreferencesState?.style === "string" ? rawPreferencesState.style : null,
      pace: typeof rawPreferencesState?.pace === "string" ? rawPreferencesState.pace : null,
      styleAxesConfigured: rawPreferencesState?.styleAxesConfigured === true,
    };
    
    const requestId = extractRequestId(req, { requestId: bodyRequestId });
    
    // Optional authentication
    const authHeader = req.headers.get("authorization");
    let userId = "anonymous";
    
    if (authHeader && authHeader !== "Bearer undefined" && authHeader !== "Bearer null") {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (!authError && user) {
          userId = user.id;
        }
      } catch (_e) {
        // Continue without auth
      }
    }
    
    const log = createRequestLogger(requestId, userId);
    
    // Rate limiting
    if (!(await checkRateLimit(userId, log))) {
      log.error("rate_limit", "Request blocked by rate limit");
      await log.flush();
      return new Response(JSON.stringify({ 
        error: "Trop de requêtes. Veuillez patienter.",
        code: "RATE_LIMITED",
        retryAfter: 60,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
    
    const limitedMessages = Array.isArray(messages) ? messages.slice(-MAX_MESSAGES) : messages;
    
    log.info("request", "Request started", {
      messages_count: limitedMessages.length,
      stream,
      phase: currentPhase,
    });
    
    const language: SupportedLanguage = detectLanguage(requestLanguage);
    
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    if (!OPENAI_API_KEY) {
      log.error("request", "Missing OPENAI_API_KEY");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const url = "https://api.openai.com/v1/chat/completions";
    const currentDate = new Date().toISOString().split('T')[0];
    const phase: TravelPhase = normalizeTravelPhase(currentPhase);
    const systemPrompt = buildSystemPrompt(
      phase,
      negativePreferences || "",
      widgetHistory || "",
      currentDate,
      activeWidgetsContext || "",
      language
    );

    // ========================================================================
    // STEP 1: DEDICATED INTENT CLASSIFICATION (Classify First architecture)
    // Lightweight call: minimal prompt, single tool, forced tool_choice.
    // Guarantees classify_intent is always called regardless of LLM behavior.
    // ========================================================================
    interface ToolExecutionEntry {
      tool: string;
      status: "finished" | "failed";
      latency_ms: number;
      summary: string;
      timestamp: number;
      loopIteration: number;
    }
    const toolExecutionLog: ToolExecutionEntry[] = [];
    
    let collectedData = createEmptyCollectedData();
    
    // CR4: Send last 4 messages (2 user/assistant pairs) for contextual classification
    const recentMessages = limitedMessages.slice(-4);
    const hasUserMessage = recentMessages.some((m: { role: string }) => m.role === "user");
    
    // B6: Detect number-only replies after numbered lists and inject disambiguation context
    const classifyMessages = [...recentMessages];
    const lastUserMsg = classifyMessages.filter((m: { role: string }) => m.role === "user").pop();
    const lastAssistantMsg = classifyMessages.filter((m: { role: string }) => m.role === "assistant").pop();
    if (lastUserMsg && lastAssistantMsg) {
      const userText = (lastUserMsg as { content: string }).content.trim();
      const assistantText = (lastAssistantMsg as { content: string }).content;
      const isNumberOnly = /^\d{1,2}$/.test(userText);
      const hasNumberedList = /\d+\.\s+.+/m.test(assistantText);
      if (isNumberOnly && hasNumberedList) {
        log.info("number_disambiguation", "Number-only reply after numbered list detected, injecting context", {
          userReply: userText,
        });
        // Inject a system hint right before the user message to reinforce disambiguation
        const hintIdx = classifyMessages.lastIndexOf(lastUserMsg);
        if (hintIdx > 0) {
          classifyMessages.splice(hintIdx, 0, {
            role: "system",
            content: `ATTENTION: Le dernier message assistant contenait une liste numérotée. L'utilisateur répond "${userText}" — c'est une SÉLECTION dans la liste (confirm_selection), PAS un nombre de voyageurs.`,
          });
        }
      }
    }

    if (hasUserMessage) {
      const classifyStartTime = Date.now();
      log.info("classify_first", "Starting dedicated intent classification call", { contextMessages: recentMessages.length });

      try {
        const classifyResponse = await fetchWithRetry(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              { role: "system", content: buildClassificationSystemPrompt(preferencesState, blockedWidgets, currentDate) },
              ...classifyMessages,
            ],
            temperature: 0.3,
            max_tokens: 200,
            tools: [intentClassifierTool],
            tool_choice: { type: "function", function: { name: "classify_intent" } },
            stream: false,
          }),
        }, log, "classify_first");
        
        const classifyLatency = Date.now() - classifyStartTime;
        
        if (classifyResponse.ok) {
          const classifyData = await classifyResponse.json();
          const classifyToolCall = classifyData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (classifyToolCall?.function?.name === "classify_intent") {
            const { result, updatedData } = processToolCall(classifyToolCall, requestId, collectedData, log, preferencesState, blockedWidgets);
            collectedData = mergeToolData(collectedData, updatedData);
            
            toolExecutionLog.push({
              tool: "classify_intent",
              status: result.success ? "finished" : "failed",
              latency_ms: classifyLatency,
              summary: `Intent: ${collectedData.intentClassification?.primaryIntent || "unknown"}, Widget: ${collectedData.intentClassification?.widgetToShow?.type || "none"}`,
              timestamp: Date.now(),
              loopIteration: -1,
            });
            
            log.info("classify_first", "Intent classification completed", {
              intent: collectedData.intentClassification?.primaryIntent,
              widget: collectedData.intentClassification?.widgetToShow?.type,
              confidence: collectedData.intentClassification?.confidence,
              latency_ms: classifyLatency,
            });
          } else {
            log.warn("classify_first", "Classification call did not return classify_intent tool call");
          }
        } else {
          const errorText = await classifyResponse.text();
          log.error("classify_first", "Classification call failed", new Error(errorText));
        }
      } catch (classifyError) {
        log.error("classify_first", "Classification call threw", classifyError instanceof Error ? classifyError : undefined);
      }
    }

    // ========================================================================
    // STEP 2: REACT LOOP (without classify_intent — already done above)
    // ========================================================================
    // B13: Widget-phase validation — suppress widgets that don't belong in the current phase
    const classifiedWidget = collectedData.intentClassification?.widgetToShow?.type;
    if (classifiedWidget && !isWidgetValidInPhase(classifiedWidget, phase)) {
      log.info("widget_phase_guard", `Widget "${classifiedWidget}" not valid in phase "${phase}", suppressing`, {
        widget: classifiedWidget,
        phase,
      });
      collectedData.intentClassification = {
        ...collectedData.intentClassification!,
        widgetToShow: undefined,
      };
    }

    const preferenceFirstApplied = collectedData.intentClassification?.primaryIntent === "gather_preferences";
    // A6: Filter tools by current phase + existing guards
    const phaseToolNames = TOOL_NAMES_BY_PHASE[phase];
    const reActTools = ALL_TOOLS.filter(t => {
      if (t.function.name === "classify_intent") return false;
      // B3: If preference-first override was applied, remove destination suggestions
      if (preferenceFirstApplied && t.function.name === "request_destination_suggestions") return false;
      // A6: Only include tools valid for the current phase
      if (!phaseToolNames.has(t.function.name)) return false;
      return true;
    });

    // FIX-B1: Inject trigger_flight_search when intent is trigger_search with sufficient entities,
    // regardless of current phase. This prevents the tool from being unavailable in discovery/activities.
    const classifiedIntent = collectedData.intentClassification?.primaryIntent;
    const classifiedEntities = collectedData.intentClassification?.entities;
    const hasSearchableContext = classifiedEntities?.destinationCity &&
      (classifiedEntities?.exactDepartureDate || classifiedEntities?.preferredMonth);
    if (
      (classifiedIntent === "trigger_search" || classifiedIntent === "confirm_selection") &&
      hasSearchableContext
    ) {
      const hasTriggerTool = reActTools.some(t => t.function.name === "trigger_flight_search");
      if (!hasTriggerTool) {
        reActTools.push(flightSearchTriggerTool);
        log.info("tool_injection", "Injected trigger_flight_search for search intent outside logistics phase", { phase, intent: classifiedIntent });
      }
      // Also inject flight extraction tool if missing (needed to update widget)
      const hasFlightTool = reActTools.some(t => t.function.name === "update_flight_widget");
      if (!hasFlightTool) {
        reActTools.push(flightExtractionTool);
        log.info("tool_injection", "Injected update_flight_widget for search intent outside logistics phase", { phase });
      }
    }
    log.info("tool_filtering", `Phase "${phase}": ${reActTools.length} tools available`, {
      tools: reActTools.map(t => t.function.name),
    });
    
    let loopCount = 0;
    // A4: Truncate messages to stay within token budget (80% of context window)
    const MAX_CONTEXT_TOKENS = 12000; // ~80% of 16384 for GPT-4o-mini
    const rawMessages = [
      { role: "system", content: systemPrompt },
      ...limitedMessages,
    ];
    let conversationMessages = truncateMessages(rawMessages, MAX_CONTEXT_TOKENS, log);
    let finalContent = "";
    let lastResponse: unknown = null;
    
    while (loopCount <= MULTI_TOOL_CONFIG.MAX_LOOPS) {
      log.info("multi_tool", `Tool loop iteration ${loopCount + 1}`, { loopCount });
      
      log.llmCall("start");
      const llmStartTime = Date.now();
      
      const response = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: MULTI_TOOL_CONFIG.REACT_MAX_TOKENS,
          tools: reActTools,
          tool_choice: "auto",
          stream: false,
        }),
      }, log, "react_loop");

      if (!response.ok) {
        const errorText = await response.text();
        log.error("openai", "API error", new Error(errorText), { status: response.status });
        throw new Error(`OpenAI error: ${errorText}`);
      }

      const data = await response.json();
      const llmLatency = Date.now() - llmStartTime;
      log.llmCall("end", llmLatency, data.usage?.total_tokens);
      
      lastResponse = data;
      const choice = data.choices?.[0];

      if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
        // C4: Only use content as finalContent when there are NO tool calls
        // (this is the LLM's actual response, not a placeholder during tool processing)
        finalContent = choice?.message?.content || "";
        log.info("multi_tool", "No tool calls, ending loop", { loopCount });
        break;
      }
      
      const toolCalls = choice.message.tool_calls;
      const toolNames = toolCalls.map((tc: { function?: { name?: string } }) => tc.function?.name || "unknown");
      
      log.info("tool_execution", `Processing ${toolCalls.length} tool calls`, { tools: toolNames });
      
      const toolResponses: { role: "tool"; tool_call_id: string; content: string }[] = [];
      for (const toolCall of toolCalls) {
        const toolStartTime = Date.now();
        const { result, updatedData } = processToolCall(toolCall, requestId, collectedData, log, preferencesState, blockedWidgets);
        const toolLatency = Date.now() - toolStartTime;
        
        toolExecutionLog.push({
          tool: toolCall.function?.name || "unknown",
          status: result.success ? "finished" : "failed",
          latency_ms: toolLatency,
          summary: result.success 
            ? (typeof result.data?.message === "string" ? result.data.message : "OK")
            : (typeof result.error?.message === "string" ? result.error.message : "Failed"),
          timestamp: Date.now(),
          loopIteration: loopCount,
        });
        
        collectedData = mergeToolData(collectedData, updatedData);
        toolResponses.push(buildToolResponseMessage(toolCall.id, result));
      }
      
      if (!shouldContinueToolLoop(loopCount + 1, true, toolNames, log)) {
        conversationMessages = [
          ...conversationMessages,
          choice.message,
          ...toolResponses,
        ];
        loopCount++;
        break;
      }
      
      conversationMessages = [
        ...conversationMessages,
        choice.message,
        ...toolResponses,
      ];
      
      loopCount++;
    }
    
    // Post-loop: suppress destination suggestions if preferences override was applied
    if (collectedData.intentClassification?.primaryIntent === "gather_preferences") {
      if (collectedData.destinationSuggestionRequest) {
        log.info("preference_first", "Suppressing destinationSuggestionRequest due to gather_preferences override");
        collectedData.destinationSuggestionRequest = null;
      }
    }
    
    // C4: Always make final content call when tools were used (loopCount > 0)
    // even if some content was captured, because tool-iteration content is just placeholders
    // C1: Include generate_quick_replies so the LLM can produce quick replies
    const quickRepliesTool = ALL_TOOLS.find(t => t.function.name === "generate_quick_replies");
    if (!finalContent && loopCount > 0) {
      log.info("multi_tool", "Making final content generation call");

      const needsQuickReplies = quickRepliesTool && !collectedData.quickRepliesData;
      // A3: Use real streaming when we don't need to process tool_calls from the response
      const useRealStreaming = stream && !needsQuickReplies;

      const finalCallBody: Record<string, unknown> = {
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: MULTI_TOOL_CONFIG.FINAL_CONTENT_MAX_TOKENS,
        stream: useRealStreaming,
      };
      // C1: Add quick replies tool so the LLM can generate suggestions
      if (needsQuickReplies) {
        finalCallBody.tools = [quickRepliesTool];
        finalCallBody.tool_choice = "auto";
      }

      // A3: Real streaming — emit collected data then stream OpenAI response directly
      if (useRealStreaming) {
        log.info("streaming", "Using real streaming for final content");
        // Normalize dates before streaming (won't have access to content after)
        normalizeExtractedYears(collectedData, currentDate);

        const streamingResponse = await fetchWithRetry(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...finalCallBody, model: OPENAI_MODEL }),
        }, log, "final_content_stream");

        if (streamingResponse.ok) {
          return createStreamingResponse(streamingResponse, collectedData, log, requestId, toolExecutionLog);
        }
        // If streaming call failed, fall through to non-streaming fallback
        log.warn("streaming", "Streaming call failed, falling back to non-streaming");
      }

      const finalResponse = await fetchWithRetry(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...finalCallBody, model: OPENAI_MODEL, stream: false }),
      }, log, "final_content");

      if (!finalResponse.ok) {
        finalContent = "J'ai mis à jour les informations.";
      } else {
        const finalData = await finalResponse.json();
        const finalChoice = finalData.choices?.[0];
        finalContent = finalChoice?.message?.content || "J'ai mis à jour les informations.";

        // C1: Process quick replies if the LLM called generate_quick_replies
        if (finalChoice?.message?.tool_calls) {
          for (const tc of finalChoice.message.tool_calls) {
            if (tc.function?.name === "generate_quick_replies") {
              const { result, updatedData } = processToolCall(tc, requestId, collectedData, log, preferencesState, blockedWidgets);
              if (result.success) {
                collectedData = mergeToolData(collectedData, updatedData);
                log.info("quick_replies", "Quick replies generated in final call");
              }
            }
          }
        }
      }

      // Now stream if requested (simulated since content is already generated)
      if (stream && finalContent) {
        return createSimulatedStreamingResponse(finalContent, collectedData, log, toolExecutionLog);
      }
    }
    
    if (!finalContent) {
      finalContent = "Désolé, je n'ai pas pu générer de réponse.";
    }
    
    // Normalize extracted years (safety net against LLM hallucinating past years)
    normalizeExtractedYears(collectedData, currentDate);

    // Strip <action> tags from content (LLM sometimes generates these instead of using tools)
    finalContent = finalContent.replace(/<action>[\s\S]*?<\/action>/g, "").trim();

    // Handle streaming for collected data
    if (stream && finalContent) {
      return createSimulatedStreamingResponse(finalContent, collectedData, log, toolExecutionLog);
    }

    log.info("response", "Sending final response", {
      content_length: finalContent.length,
      has_flight_data: !!collectedData.flightData,
      has_intent: !!collectedData.intentClassification,
      loop_count: loopCount,
    });

    await log.flush();

    return new Response(JSON.stringify({ 
      content: finalContent, 
      flightData: collectedData.flightData, 
      accommodationData: collectedData.accommodationData, 
      preferencesData: collectedData.preferencesData, 
      destinationSuggestionRequest: collectedData.destinationSuggestionRequest, 
      quickReplies: collectedData.quickRepliesData,
      intentClassification: collectedData.intentClassification,
      reasoning: collectedData.reasoningData,
      flightSearchTrigger: collectedData.flightSearchTrigger,
      toolExecutions: toolExecutionLog,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Bug 5: Enhanced error logging for 500 diagnosis
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("[planner-chat] FATAL ERROR:", {
      name: errorName,
      message: errorMessage,
      stack: errorStack?.split("\n").slice(0, 5).join("\n"),
      timestamp: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      errorType: errorName,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Create a streaming response from OpenAI
 */
function createStreamingResponse(
  openaiResponse: Response,
  collectedData: CollectedToolData,
  log: RequestLogger,
  requestId: string,
  toolLog: { tool: string; status: string; latency_ms: number; summary: string; timestamp: number; loopIteration: number }[] = []
): Response {
  const encoder = new TextEncoder();
  
  const readableStream = new ReadableStream({
    async start(controller) {
      // Emit collected data first
      emitCollectedDataEvents(controller, encoder, collectedData, toolLog);
      
      const reader = openaiResponse.body!.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(line => line.trim() !== "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              if (jsonStr === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: delta })}\n\n`));
                }
              } catch (_e) {
                // Ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
        log.flush();
        controller.close();
      }
    }
  });

  return new Response(readableStream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Create a simulated streaming response for pre-generated content
 */
function createSimulatedStreamingResponse(
  content: string,
  collectedData: CollectedToolData,
  log: RequestLogger,
  toolLog: { tool: string; status: string; latency_ms: number; summary: string; timestamp: number; loopIteration: number }[] = []
): Response {
  const encoder = new TextEncoder();
  
  const readableStream = new ReadableStream({
    async start(controller) {
      // Emit collected data first
      emitCollectedDataEvents(controller, encoder, collectedData, toolLog);
      
      // A3: Stream content in word-sized chunks (not character by character)
      // Split by spaces and punctuation boundaries for natural-looking streaming
      const words = content.match(/\S+\s*/g) || [content];
      for (const word of words) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: word })}\n\n`));
      }
      
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      await log.flush();
      controller.close();
    }
  });

  return new Response(readableStream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Emit SSE events for collected tool data
 */
function emitCollectedDataEvents(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: CollectedToolData,
  toolLog: { tool: string; status: string; latency_ms: number; summary: string; timestamp: number; loopIteration: number }[] = []
): void {
  // 1. Emit REAL tool executions from the log (replaces fake random latencies)
  for (const entry of toolLog) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "tool_started",
      tool: entry.tool,
      reason: `Processing ${entry.tool}...`,
      timestamp: entry.timestamp - entry.latency_ms,
    })}\n\n`));
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "tool_finished",
      tool: entry.tool,
      success: entry.status === "finished",
      latency_ms: entry.latency_ms,
      summary: entry.summary,
      timestamp: entry.timestamp,
      loopIteration: entry.loopIteration,
    })}\n\n`));
  }
  
  // 2. Emit data events for the frontend to consume
  if (data.reasoningData) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reasoning", reasoning: data.reasoningData })}\n\n`));
  }
  
  if (data.intentClassification) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "intentClassification", intentClassification: data.intentClassification })}\n\n`));
  }
  
  if (data.flightData) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "flightData", flightData: data.flightData })}\n\n`));
  }
  
  if (data.accommodationData) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "accommodationData", accommodationData: data.accommodationData })}\n\n`));
  }
  
  if (data.preferencesData) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "preferencesData", preferencesData: data.preferencesData })}\n\n`));
  }
  
  if (data.destinationSuggestionRequest) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "destinationSuggestionRequest", destinationSuggestionRequest: data.destinationSuggestionRequest })}\n\n`));
  }
  
  if (data.quickRepliesData) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "quickReplies", quickReplies: data.quickRepliesData })}\n\n`));
  }
  
  if (data.flightSearchTrigger) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "flightSearchTrigger", trigger: true })}\n\n`));
  }

  if (data.tripRecapData) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tripRecapData", tripRecapData: data.tripRecapData })}\n\n`));
  }
}
