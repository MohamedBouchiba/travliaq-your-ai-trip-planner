import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPhaseSystemPrompt, normalizeTravelPhase, type TravelPhase } from "./prompts/phasePrompts.ts";
import { detectLanguage, type SupportedLanguage } from "./prompts/systemPrompts.ts";
import { createRequestLogger, extractRequestId, type RequestLogger } from "../_shared/logger.ts";
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
import { reasoningTool, parseReasoningResult, CHAIN_OF_THOUGHT_INSTRUCTIONS, type ReasoningResult } from "./tools/reasoningEngine.ts";
import { flightExtractionTool } from "./tools/flightExtractor.ts";
import { accommodationExtractionTool } from "./tools/accommodationExtractor.ts";
import { preferenceExtractionTool } from "./tools/preferenceExtractor.ts";
import { quickRepliesExtractionTool } from "./tools/quickReplies.ts";
import { destinationSuggestionTool } from "./tools/destinationSuggestions.ts";
import { flightSearchTriggerTool } from "./tools/flightSearchTrigger.ts";
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

// ============================================================================
// RATE LIMITING (Simple in-memory - resets on function cold start)
// In production, use Redis via Upstash for persistent rate limiting
// ============================================================================
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 20;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

function checkRateLimit(userId: string, log: RequestLogger): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);
  
  if (Math.random() < 0.01) {
    for (const [key, value] of rateLimits.entries()) {
      if (now > value.resetAt) {
        rateLimits.delete(key);
      }
    }
  }
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (limit.count >= MAX_REQUESTS_PER_MINUTE) {
    log.warn("rate_limit", "Rate limit exceeded", { 
      user_id: userId, 
      count: limit.count,
      resets_in_ms: limit.resetAt - now,
    });
    return false;
  }
  
  limit.count++;
  return true;
}

const MAX_MESSAGES = 50;

// All available tools for the LLM
const ALL_TOOLS = [
  reasoningTool,
  intentClassifierTool,
  flightExtractionTool,
  accommodationExtractionTool,
  preferenceExtractionTool,
  destinationSuggestionTool,
  quickRepliesExtractionTool,
  flightSearchTriggerTool,
];

/**
 * Process a single tool call and return the result
 */
function processToolCall(
  toolCall: { id: string; function: { name: string; arguments: string } },
  requestId: string,
  collectedData: CollectedToolData,
  log: RequestLogger,
  preferencesState: { interests: string[]; style: string | null; pace: string | null },
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
          // Apply keyword-based widget forcing logic
          intentClassification = applyWidgetForcingLogic(intentClassification, log);
          // Apply deterministic preference-first override
          intentClassification = applyPreferenceFirstLogic(intentClassification, preferencesState, log);
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
 * Apply keyword-based widget forcing logic to intent classification
 */
function applyWidgetForcingLogic(
  intentClassification: IntentClassificationResult,
  log: RequestLogger
): IntentClassificationResult {
  const entities = intentClassification.entities;
  
  // Map intent entities to flightData for backward compatibility
  if (entities.destinationCity || entities.destinationCountryCode || entities.preferredMonth || entities.adults) {
    // This data will be extracted via update_flight_widget tool
  }
  
  // Keyword-based widget forcing
  const userMessage = intentClassification.detectedEntities?.join(" ") || "";
  const messageLower = userMessage.toLowerCase();
  
  // Skip if widget already assigned
  if (intentClassification.widgetToShow) {
    return intentClassification;
  }
  
  // Priority keywords for widget forcing
  const keywordChecks = [
    { keywords: ["régime", "végétarien", "végan", "halal", "casher", "gluten", "allergi"], widget: "dietary" },
    { keywords: ["accessib", "fauteuil", "handicap", "mobilité réduite", "animal", "chien", "chat"], widget: "mustHaves" },
    { keywords: ["intérêt", "activité", "plage", "musée", "nature", "culture", "sport", "randonnée"], widget: "preferenceInterests" },
    { keywords: ["style", "budget", "luxe", "économique", "confort"], widget: "preferenceStyle" },
    { keywords: ["date", "quand", "février", "mars", "avril", "weekend", "semaine"], widget: "datePicker" },
    { keywords: ["famille", "potes", "amis", "couple", "seul", "solo", "groupe", "combien"], widget: "travelersSelector" },
    { keywords: ["inspire", "où aller", "destination", "idée", "recommand", "suggère", "propose"], widget: "destinationSuggestions" },
  ];
  
  for (const check of keywordChecks) {
    if (check.keywords.some(kw => messageLower.includes(kw))) {
      intentClassification.widgetToShow = {
        type: check.widget,
        reason: `Keyword match for ${check.widget}`,
      };
      log.info("widget_forcing", `Forced ${check.widget} widget based on keywords`);
      break;
    }
}

/**
 * Deterministic preference-first override logic
 * Overrides LLM intent when user is indecisive and preferences are missing
 */
function applyPreferenceFirstLogic(
  intentClassification: IntentClassificationResult,
  preferencesState: { interests: string[]; style: string | null },
  log: RequestLogger
): IntentClassificationResult {
  const isIndecisIntent = [
    "gather_preferences", "ask_inspiration", "search_destination"
  ].includes(intentClassification.primaryIntent);
  
  const isDestinationSuggestion = 
    intentClassification.widgetToShow?.type === "destinationSuggestions" ||
    intentClassification.primaryIntent === "ask_inspiration";

  // If user is indecis OR system wants to show destinations
  // BUT preferences are empty -> override to preferenceInterests
  if ((isIndecisIntent || isDestinationSuggestion) && 
      (!preferencesState.interests || preferencesState.interests.length === 0)) {
    log.info("preference_first", "Overriding to preferenceInterests (empty interests)");
    intentClassification.primaryIntent = "gather_preferences";
    intentClassification.widgetToShow = {
      type: "preferenceInterests",
      reason: "Preferences must be collected before suggesting destinations",
    };
    return intentClassification;
  }

  // If interests exist but no style -> preferenceStyle
  if ((isIndecisIntent || isDestinationSuggestion) && !preferencesState.style) {
    log.info("preference_first", "Overriding to preferenceStyle (missing style)");
    intentClassification.primaryIntent = "gather_preferences";
    intentClassification.widgetToShow = {
      type: "preferenceStyle",
      reason: "Travel style needed before suggesting destinations",
    };
    return intentClassification;
  }

  return intentClassification;
}
  
  return intentClassification;
}

/**
 * Build the system prompt
 */
function buildSystemPrompt(phase: TravelPhase, negativeContext: string, widgetContext: string, currentDate: string, widgetsContext: string): string {
  const phasePrompt = buildPhaseSystemPrompt(phase, negativeContext, widgetContext, currentDate, widgetsContext);
  
  return `Tu es un assistant de voyage bienveillant pour Travliaq. Tu guides l'utilisateur pas à pas, UNE QUESTION À LA FOIS, pour l'aider à planifier son voyage idéal.

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
NE SAUTE PAS de phase. NE MÉLANGE PAS les phases.
Si l'utilisateur pose une question hors-phase, réponds brièvement puis recentre sur la phase en cours.

## RÈGLE CRITIQUE : PRÉFÉRENCES AVANT DESTINATIONS
Si l'utilisateur dit "je sais pas", "je ne sais pas où aller", "aide-moi", "j'hésite" :
1. Vérifie si les préférences sont renseignées (interests, travelStyle, pace, etc.)
2. Si les préférences sont VIDES ou INCOMPLÈTES :
   - NE PAS proposer de destinations tout de suite
   - D'abord demander les préférences via le widget preferenceInterests ou preferenceStyle
   - Utiliser l'outil update_preferences pour extraire les indices
   - Poser UNE question sur les envies : "Qu'est-ce qui te fait rêver ? Plage, culture, aventure ?"
3. SEULEMENT après avoir collecté au moins les intérêts, proposer des destinations adaptées

## STYLE
- Chaleureux et bienveillant
- Emojis avec modération (1-2 max)
- Phrases courtes

## INFOS TECHNIQUES
- Date actuelle : ${currentDate}
- Année par défaut : 2025
- Réponds en français

${phasePrompt}

${CHAIN_OF_THOUGHT_INSTRUCTIONS}`;
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
    if (!checkRateLimit(userId, log)) {
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
    
    const AZURE_OPENAI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
    const AZURE_OPENAI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const AZURE_OPENAI_API_VERSION = Deno.env.get("AZURE_OPENAI_API_VERSION") || "2025-01-01-preview";
    const AZURE_OPENAI_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT");

    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      log.error("request", "Missing Azure OpenAI configuration");
      throw new Error("Azure OpenAI configuration is incomplete");
    }

    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
    const currentDate = new Date().toISOString().split('T')[0];
    const phase: TravelPhase = normalizeTravelPhase(currentPhase);
    const systemPrompt = buildSystemPrompt(
      phase,
      negativePreferences || "",
      widgetHistory || "",
      currentDate,
      activeWidgetsContext || ""
    );

    // ========================================================================
    // MULTI-TOOL LOOP (ReAct Pattern) with real execution logging
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
    
    let loopCount = 0;
    let collectedData = createEmptyCollectedData();
    let conversationMessages = [
      { role: "system", content: systemPrompt },
      ...limitedMessages,
    ];
    let finalContent = "";
    let lastResponse: unknown = null;
    
    while (loopCount <= MULTI_TOOL_CONFIG.MAX_LOOPS) {
      log.info("multi_tool", `Tool loop iteration ${loopCount + 1}`, { loopCount });
      
      log.azureCall("start");
      const azureStartTime = Date.now();
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "api-key": AZURE_OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: 600,
          tools: ALL_TOOLS,
          // Force tool usage on first iteration to ensure classify_intent is called
          tool_choice: loopCount === 0 ? "required" : "auto",
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error("azure_openai", "API error", new Error(errorText), { status: response.status });
        throw new Error(`Azure OpenAI error: ${errorText}`);
      }

      const data = await response.json();
      const azureLatency = Date.now() - azureStartTime;
      log.azureCall("end", azureLatency, data.usage?.total_tokens);
      
      lastResponse = data;
      const choice = data.choices?.[0];
      finalContent = choice?.message?.content || "";
      
      // If no tool calls, we're done
      if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
        log.info("multi_tool", "No tool calls, ending loop", { loopCount });
        break;
      }
      
      const toolCalls = choice.message.tool_calls;
      const toolNames = toolCalls.map((tc: { function?: { name?: string } }) => tc.function?.name || "unknown");
      
      log.info("tool_execution", `Processing ${toolCalls.length} tool calls`, { tools: toolNames });
      
      // Process each tool call
      const toolResponses: { role: "tool"; tool_call_id: string; content: string }[] = [];
      for (const toolCall of toolCalls) {
        const toolStartTime = Date.now();
        const { result, updatedData } = processToolCall(toolCall, requestId, collectedData, log, preferencesState);
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
      
      // Check if we should continue
      if (!shouldContinueToolLoop(loopCount + 1, true, toolNames, log)) {
        // Make one final call to get the response
        conversationMessages = [
          ...conversationMessages,
          choice.message,
          ...toolResponses,
        ];
        loopCount++;
        break;
      }
      
      // Add tool calls and responses to conversation for next iteration
      conversationMessages = [
        ...conversationMessages,
        choice.message,
        ...toolResponses,
      ];
      
      loopCount++;
    }
    
    // Post-loop: If preference-first override was applied, suppress destination suggestions
    if (collectedData.intentClassification?.primaryIntent === "gather_preferences") {
      if (collectedData.destinationSuggestionRequest) {
        log.info("preference_first", "Suppressing destinationSuggestionRequest due to gather_preferences override");
        collectedData.destinationSuggestionRequest = null;
      }
    }
    
    // Fallback: if classify_intent was never called, detect indecision from user message
    if (!collectedData.intentClassification) {
      const lastUserMsg = limitedMessages.filter((m: { role: string }) => m.role === "user").pop();
      const userText = (lastUserMsg?.content || "").toLowerCase();
      const indecisionPatterns = ["sais pas", "ne sais pas", "aucune idée", "pas d'idée", "hésite", "aide-moi", "inspire", "où aller"];
      const isIndecis = indecisionPatterns.some(p => userText.includes(p));
      
      if (isIndecis && (!preferencesState.interests || preferencesState.interests.length === 0)) {
        log.info("preference_first_fallback", "No classify_intent called, but indecision detected. Injecting preferenceInterests.");
        collectedData.intentClassification = {
          primaryIntent: "gather_preferences",
          confidence: 90,
          entities: {},
          widgetToShow: {
            type: "preferenceInterests",
            reason: "Fallback: indecision detected without preferences",
          },
        };
      } else if (isIndecis && !preferencesState.style) {
        log.info("preference_first_fallback", "No classify_intent called, indecision detected. Injecting preferenceStyle.");
        collectedData.intentClassification = {
          primaryIntent: "gather_preferences",
          confidence: 90,
          entities: {},
          widgetToShow: {
            type: "preferenceStyle",
            reason: "Fallback: indecision detected without style",
          },
        };
      }
    }
    
    if (!finalContent && loopCount > 0) {
      log.info("multi_tool", "Making final content generation call");
      
      const finalResponse = await fetch(url, {
        method: "POST",
        headers: {
          "api-key": AZURE_OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: 300,
          stream: stream,
        }),
      });

      if (!finalResponse.ok) {
        finalContent = "J'ai mis à jour les informations.";
      } else if (stream) {
        // Return streaming response
        return createStreamingResponse(finalResponse, collectedData, log, requestId, toolExecutionLog);
      } else {
        const finalData = await finalResponse.json();
        finalContent = finalData.choices?.[0]?.message?.content || "J'ai mis à jour les informations.";
      }
    }
    
    if (!finalContent) {
      finalContent = "Désolé, je n'ai pas pu générer de réponse.";
    }
    
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
    console.error("planner-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Create a streaming response from Azure OpenAI
 */
function createStreamingResponse(
  azureResponse: Response,
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
      
      const reader = azureResponse.body!.getReader();
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
      
      // Stream content character by character
      for (const char of content) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: char })}\n\n`));
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
}
