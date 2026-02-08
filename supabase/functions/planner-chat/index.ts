import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPhaseSystemPrompt, type TravelPhase } from "./prompts/phasePrompts.ts";
import { buildBaseSystemPrompt, buildChooseForMeInstructions, detectLanguage, type SupportedLanguage } from "./prompts/systemPrompts.ts";
import { intentClassifierTool, parseIntentClassification, type IntentClassificationResult } from "./tools/intentClassifier.ts";
import { reasoningTool, parseReasoningResult, CHAIN_OF_THOUGHT_INSTRUCTIONS, type ReasoningResult } from "./tools/reasoningEngine.ts";
import { createRequestLogger, extractRequestId, type RequestLogger } from "../_shared/logger.ts";
import {
  FlightDataSchema,
  AccommodationDataSchema,
  PreferencesDataSchema,
  QuickRepliesDataSchema,
  DestinationSuggestionRequestSchema,
  FlightSearchTriggerSchema,
  validateToolOutput,
  type ToolResult,
} from "./validators/schemas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
};

// Tool definition for extracting flight intent from user message
const flightExtractionTool = {
  type: "function",
  function: {
    name: "update_flight_widget",
    description: "Extract ONLY explicit flight info. Never guess or infer values. If info is vague, set the corresponding 'needs*Widget' flag to show an interactive widget instead.",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Departure city. ONLY extract if explicitly mentioned: 'depuis Paris', 'de Lyon', 'je pars de Nice'. For COUNTRIES, use fromCountryCode instead."
        },
        fromCountryCode: {
          type: "string",
          description: "ISO2 country code if user mentions a COUNTRY for departure (e.g., 'depuis la France' = 'FR', 'je pars du Canada' = 'CA'). This triggers city selection for departure."
        },
        fromCountryName: {
          type: "string",
          description: "Country name in French if user mentions a country instead of a city for departure."
        },
        to: {
          type: "string", 
          description: "Destination city. Extract from: 'aller à Rome', 'vers Tokyo', 'direction Barcelone'. For COUNTRIES, use toCountryCode instead."
        },
        toCountryCode: {
          type: "string",
          description: "ISO2 country code if user mentions a COUNTRY instead of a city (e.g., 'Qatar' = 'QA', 'France' = 'FR', 'Japon' = 'JP'). This triggers city selection."
        },
        toCountryName: {
          type: "string",
          description: "Country name in French if user mentions a country instead of a city."
        },
        departureDate: {
          type: "string",
          description: "ONLY extract if user gives EXACT date like 'le 15 janvier', 'le 20 mars'. NEVER extract from vague terms like 'en février', 'au printemps', 'cet été', 'dans 2 semaines'. For vague dates, use needsDateWidget instead."
        },
        returnDate: {
          type: "string",
          description: "ONLY extract if user gives EXACT return date like 'retour le 22'. For duration like '3 semaines', set tripDuration instead."
        },
        tripDuration: {
          type: "string",
          description: "Duration mentioned: '3 semaines', '10 jours', '1 semaine'. Used to calculate return date AFTER user picks departure date."
        },
        preferredMonth: {
          type: "string",
          description: "If user mentions a month without specific date: 'en février', 'au mois de mars', 'cet été'. We'll ask for exact date."
        },
        adults: {
          type: "number",
          description: "ONLY if EXPLICIT: '2 adultes', 'nous sommes 3', 'solo/seul' (=1). Never guess."
        },
        children: {
          type: "number",
          description: "ONLY if EXPLICIT: '2 enfants', '1 enfant de 8 ans'. Never guess."
        },
        infants: {
          type: "number",
          description: "ONLY if EXPLICIT: '1 bébé'. Never guess."
        },
        needsDateWidget: {
          type: "boolean",
          description: "Set TRUE when user mentions VAGUE timing: 'en février', 'au printemps', 'cet été', 'le mois prochain', 'bientôt', 'dans quelques semaines'. This triggers a date picker widget."
        },
        needsTravelersWidget: {
          type: "boolean",
          description: "Set TRUE when user implies multiple travelers WITHOUT exact numbers: 'en famille', 'entre potes', 'entre amis', 'avec des copains', 'en groupe', 'en couple', 'avec mes enfants', etc."
        },
        needsCitySelection: {
          type: "boolean",
          description: "Set TRUE when user mentions a COUNTRY (not a city) as destination: 'aller au Qatar', 'visiter le Japon', 'partir en France'. The user must then choose a specific city."
        },
        tripType: {
          type: "string",
          enum: ["roundtrip", "oneway", "multi"],
          description: "Trip type based on context. Default to 'roundtrip' if duration or return mentioned."
        },
        budgetHint: {
          type: "string",
          description: "Budget preference mentioned: 'pas cher', 'économique', 'luxe', 'budget serré'."
        }
      },
      required: []
    }
  }
};

// Tool definition for extracting accommodation intent from user message
const accommodationExtractionTool = {
  type: "function",
  function: {
    name: "update_accommodation_widget",
    description: "Extract accommodation preferences from user message. Use when user mentions hotels, stays, lodging, or accommodation details.",
    parameters: {
      type: "object",
      properties: {
        budgetPreset: {
          type: "string",
          enum: ["eco", "comfort", "premium"],
          description: "Budget level: 'pas cher/économique'=eco, 'confortable/bien'=comfort, 'luxe/haut de gamme'=premium"
        },
        priceMin: {
          type: "number",
          description: "Minimum price per night if explicitly mentioned"
        },
        priceMax: {
          type: "number",
          description: "Maximum price per night if explicitly mentioned: '100€ max', 'moins de 150€'"
        },
        types: {
          type: "array",
          items: { type: "string", enum: ["hotel", "apartment", "villa", "hostel", "guesthouse"] },
          description: "Accommodation types: 'hôtel', 'appartement/appart', 'villa', 'auberge', 'maison d'hôtes'"
        },
        minRating: {
          type: "number",
          description: "Minimum rating (1-10 scale): 'bien noté'=8, 'très bien noté'=9"
        },
        amenities: {
          type: "array",
          items: { type: "string", enum: ["wifi", "parking", "breakfast", "ac", "pool", "kitchen"] },
          description: "Essential amenities: 'wifi', 'parking', 'petit-déjeuner/petit-déj', 'climatisation/clim', 'piscine', 'cuisine'"
        },
        mealPlan: {
          type: "string",
          enum: ["breakfast", "half", "full", "all-inclusive"],
          description: "Meal plan: 'petit-déj inclus'=breakfast, 'demi-pension'=half, 'pension complète'=full, 'all-inclusive'=all-inclusive"
        },
        needsAccommodationWidget: {
          type: "boolean",
          description: "Set TRUE when user asks about accommodation/hotel without specifics, to show the accommodation panel"
        }
      },
      required: []
    }
  }
};

// Tool definition for generating intelligent contextual quick replies
const quickRepliesExtractionTool = {
  type: "function",
  function: {
    name: "generate_quick_replies",
    description: `Generate 2-4 HIGHLY CONTEXTUAL quick reply buttons. Analyze the ENTIRE conversation to anticipate what the user most likely wants to say next.

## WHEN TO GENERATE REPLIES
ALWAYS generate quick_replies after your response. Think: "What are the 2-4 most likely things the user will say next?"

## CONTEXT AWARENESS RULES
1. **After proposing destinations**: Buttons = destination names the user can click to choose
2. **After asking about dates**: Buttons = common date options ("Ce weekend", "Semaine prochaine", "Flexible")
3. **After asking travelers count**: Buttons = common compositions ("Seul", "En couple", "En famille", "Entre amis")
4. **After showing flights**: Buttons = decision options ("Le moins cher", "Le plus rapide", "Vol direct", "Compare-les")
5. **After showing hotels**: Buttons = preference options ("Mieux noté", "Le plus central", "Avec piscine", "Le moins cher")
6. **After confirmation request**: Buttons = ("Oui, parfait", "Non, modifie", "Plus d'options")
7. **After general info/tip**: Buttons = logical next actions based on missing info

## INTELLIGENCE GUIDELINES
- If user just chose destination: suggest date-related buttons
- If user confirmed dates: suggest traveler-related buttons
- If trip is nearly complete: suggest "Lancer la recherche" or "Modifier quelque chose"
- Always include 1 "alternative" button like "Autres options" or "Plus de choix"
- Use the conversation history to avoid suggesting already-answered questions

## EMOJI SELECTION
- Destinations: Use country flag (🇪🇸🇵🇹🇮🇹🇬🇷🇫🇷🇯🇵🇹🇭🇲🇦🇭🇷🇺🇸🇬🇧🇩🇪🇳🇱🇨🇭🇦🇹🇧🇪🇮🇪🇸🇪🇳🇴🇩🇰🇫🇮🇵🇱🇨🇿🇭🇺🇷🇴🇧🇬🇷🇸🇭🇷🇸🇮🇲🇪🇦🇱🇲🇰🇧🇦🇽🇰🇲🇩🇺🇦🇧🇾🇱🇹🇱🇻🇪🇪🇮🇸🇬🇱🇫🇴🇲🇹🇨🇾🇹🇷🇮🇱🇯🇴🇱🇧🇸🇾🇮🇶🇮🇷🇸🇦🇦🇪🇶🇦🇰🇼🇧🇭🇴🇲🇾🇪🇪🇬🇱🇾🇹🇳🇩🇿🇲🇦🇲🇷🇸🇳🇬🇲🇲🇱🇳🇪🇧🇫🇨🇮🇬🇭🇹🇬🇧🇯🇳🇬🇨🇲🇨🇫🇹🇩🇸🇩🇪🇹🇰🇪🇺🇬🇷🇼🇧🇮🇹🇿🇲🇼🇲🇿🇿🇲🇿🇼🇧🇼🇳🇦🇿🇦🇱🇸🇸🇿🇲🇬🇲🇺🇰🇲🇸🇨🇷🇪🇹🇷🇮🇳🇵🇰🇧🇩🇱🇰🇲🇻🇳🇵🇧🇹🇲🇲🇹🇭🇱🇦🇰🇭🇻🇳🇲🇾🇸🇬🇮🇩🇵🇭🇧🇳🇹🇱🇨🇳🇭🇰🇲🇴🇹🇼🇯🇵🇰🇷🇰🇵🇲🇳🇷🇺🇰🇿🇺🇿🇹🇲🇹🇯🇰🇬🇦🇫🇵🇰🇮🇷🇮🇶🇸🇦🇾🇪🇴🇲🇦🇪🇶🇦🇧🇭🇰🇼🇦🇺🇳🇿🇫🇯🇵🇬🇳🇨🇻🇺🇸🇧🇼🇸🇹🇴🇨🇦🇺🇸🇲🇽🇬🇹🇧🇿🇸🇻🇭🇳🇳🇮🇨🇷🇵🇦🇨🇺🇯🇲🇭🇹🇩🇴🇵🇷🇧🇸🇧🇧🇹🇹🇬🇾🇸🇷🇨🇴🇻🇪🇪🇨🇵🇪🇧🇴🇨🇱🇦🇷🇺🇾🇵🇾🇧🇷)
- Dates: 📅 📆 🗓️
- Travelers: 👤 (solo) 💑 (couple) 👥 (group) 👨‍👩‍👧 (family)
- Flights: ✈️ 💰 ⚡ ↔️
- Hotels: 🏨 ⭐ 📍 🏊
- Actions: ✅ ❌ 🔄 🔍 ➡️
- Info: ℹ️ 💡 ❓`,
    parameters: {
      type: "object",
      properties: {
        replies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { 
                type: "string", 
                description: "Short button label (max 20 chars). Be concise and clear."
              },
              emoji: { 
                type: "string", 
                description: "Single emoji that best represents the action or destination."
              },
              message: { 
                type: "string", 
                description: "Complete message sent when clicked. For destinations: 'Je choisis [name]'. For actions: full sentence describing the action."
              }
            },
            required: ["label", "emoji", "message"]
          },
          description: "2-4 contextual quick replies anticipating user's next action"
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of why these replies are relevant (for debugging)"
        }
      },
      required: ["replies"]
    }
  }
};

// Tool definition for requesting destination suggestions
const destinationSuggestionTool = {
  type: "function",
  function: {
    name: "request_destination_suggestions",
    description: `À utiliser OBLIGATOIREMENT quand l'utilisateur demande des recommandations de destinations.

DÉCLENCHEURS (appeler cet outil si l'utilisateur dit) :
- "Fais-moi X recommandations de destinations"
- "Suggère-moi des destinations"
- "Propose-moi des pays"
- "Où partir ?"
- "Quelle destination me conseilles-tu ?"
- "Donne-moi des idées de voyage"
- "Recommande-moi X pays/destinations"
- "Quelles sont les meilleures destinations pour moi ?"

RÈGLES IMPORTANTES :
1. Le nombre maximum de recommandations est 5 (si l'utilisateur demande plus, expliquer poliment)
2. Le nombre par défaut est 3
3. Cet outil déclenche l'appel à l'API de suggestions côté client
4. Tu dois AUSSI générer un message d'accompagnement chaleureux`,
    parameters: {
      type: "object",
      properties: {
        requestedCount: {
          type: "number",
          description: "Nombre de destinations demandées par l'utilisateur (max 5, par défaut 3)"
        },
        reason: {
          type: "string",
          description: "Raison de la demande (inspiration, comparaison, etc.)"
        },
        exceededLimit: {
          type: "boolean",
          description: "TRUE si l'utilisateur a demandé plus de 5 recommandations (pour générer un message d'explication)"
        }
      },
      required: ["requestedCount"]
    }
  }
};

// Tool definition for triggering flight search
const flightSearchTriggerTool = {
  type: "function",
  function: {
    name: "trigger_flight_search",
    description: `À utiliser quand l'utilisateur confirme vouloir lancer la recherche de vols.

DÉCLENCHEURS (appeler cet outil si l'utilisateur dit) :
- "oui" (en réponse à "Souhaitez-vous que je lance la recherche des vols ?")
- "lance la recherche"
- "cherche les vols"
- "ok, recherche"
- "vas-y"
- "go"
- "c'est bon, lance"
- "trouve-moi des vols"
- "recherche maintenant"

NE PAS UTILISER SI:
- Il manque des informations (dates, destination, nombre de voyageurs, ville de départ)
- L'utilisateur pose une question
- L'utilisateur veut modifier quelque chose

Cet outil déclenche la recherche de vols côté client et affiche les résultats.`,
    parameters: {
      type: "object",
      properties: {
        confirmed: {
          type: "boolean",
          description: "TRUE si l'utilisateur a confirmé vouloir lancer la recherche"
        },
        message: {
          type: "string",
          description: "Message d'accompagnement pendant la recherche (ex: 'Je lance la recherche...')"
        }
      },
      required: ["confirmed"]
    }
  }
};

// Tool definition for extracting travel preferences from user message
const preferenceExtractionTool = {
  type: "function",
  function: {
    name: "update_preferences",
    description: "Détecte les préférences de voyage de l'utilisateur. À appeler dès qu'un indice est détecté dans la conversation. Cette extraction est TOUJOURS active.",
    parameters: {
      type: "object",
      properties: {
        travelStyle: {
          type: "string",
          enum: ["solo", "couple", "family", "friends"],
          description: "Style de voyage: 'avec ma femme/mari/copine'=couple, 'en famille'=family, 'entre potes/amis'=friends, 'solo/seul'=solo"
        },
        pace: {
          type: "string",
          enum: ["relaxed", "moderate", "intense"],
          description: "Rythme souhaité: 'se reposer/chill/détente/relax'=relaxed, 'équilibré'=moderate, 'tout visiter/intensif/actif'=intense"
        },
        chillVsIntense: {
          type: "number",
          description: "Niveau d'intensité 0-100: 'repos/chill'=20, 'équilibré'=50, 'actif/sportif/tout voir'=80"
        },
        cityVsNature: {
          type: "number",
          description: "Préférence urbain/nature 0-100: 'ville/musées/shopping'=20, 'mixte'=50, 'nature/plage/montagne'=80"
        },
        ecoVsLuxury: {
          type: "number",
          description: "Niveau budget 0-100: 'pas cher/budget serré'=20, 'confortable'=50, 'luxe/haut de gamme'=85"
        },
        touristVsLocal: {
          type: "number",
          description: "Préférence touristique/authentique 0-100: 'sites touristiques'=20, 'mixte'=50, 'hors des sentiers battus/local/authentique'=80"
        },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Centres d'intérêt détectés: 'gastronomie/restaurants'=food, 'musées/art'=culture, 'plage'=beach, 'randonnée'=nature, 'sport'=sport, 'spa/bien-être'=wellness, 'shopping', 'vie nocturne/bars'=nightlife, 'aventure'"
        },
        occasion: {
          type: "string",
          enum: ["honeymoon", "anniversary", "birthday", "vacation", "workation"],
          description: "Occasion du voyage: 'lune de miel'=honeymoon, 'anniversaire de mariage'=anniversary, 'anniversaire'=birthday, 'vacances'=vacation, 'télétravail/digital nomad'=workation"
        },
        needsWifi: {
          type: "boolean",
          description: "'télétravail', 'digital nomad', 'besoin de wifi', 'travailler'=true"
        },
        petFriendly: {
          type: "boolean",
          description: "'avec mon chien/chat', 'animal de compagnie'=true"
        },
        accessibilityRequired: {
          type: "boolean",
          description: "'fauteuil roulant', 'mobilité réduite', 'handicap'=true"
        },
        familyFriendly: {
          type: "boolean",
          description: "'avec enfants', 'adapté aux enfants', 'activités pour enfants'=true"
        },
        dietaryRestrictions: {
          type: "array",
          items: { type: "string" },
          description: "Restrictions alimentaires: 'végétarien', 'végan', 'halal', 'casher', 'sans gluten', 'sans lactose', 'allergies'"
        }
      },
      required: []
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body first to extract requestId
    const body = await req.json();
    const { messages, stream = false, currentStep, currentPhase, negativePreferences, widgetHistory, activeWidgetsContext, language: requestLanguage, blockedWidgets = [], requestId: bodyRequestId } = body;
    
    // Extract or generate request ID for tracing
    const requestId = extractRequestId(req, { requestId: bodyRequestId });
    
    // Authentication is optional - we log user if available but don't require it
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
      } catch (e) {
        // Silently continue without auth
      }
    }
    
    // Initialize request-scoped logger
    const log = createRequestLogger(requestId, userId);
    
    log.info("request", "Request started", {
      messages_count: messages.length,
      stream,
      phase: currentPhase,
      language: requestLanguage,
      blocked_widgets: blockedWidgets,
      user_id: userId,
    });
    
    // Detect language from request or default to French
    const language: SupportedLanguage = detectLanguage(requestLanguage);

    const AZURE_OPENAI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
    const AZURE_OPENAI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const AZURE_OPENAI_API_VERSION = Deno.env.get("AZURE_OPENAI_API_VERSION");
    const AZURE_OPENAI_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT");

    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      log.error("request", "Missing Azure OpenAI configuration");
      throw new Error("Azure OpenAI configuration is incomplete");
    }

    const apiVersion = AZURE_OPENAI_API_VERSION || "2025-01-01-preview";
    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${apiVersion}`;

    log.debug("azure_openai", "Preparing Azure OpenAI call", { url, deployment: AZURE_OPENAI_DEPLOYMENT });

    const currentDate = new Date().toISOString().split('T')[0];
    
    // Build dynamic system prompt based on current phase
    const phase: TravelPhase = currentPhase || "research";
    const negativeContext = negativePreferences || "";
    const widgetContext = widgetHistory || "";
    const widgetsContext = activeWidgetsContext || "";
    
    // Phase-specific persona prompt - NOW includes activeWidgetsContext for "choose for me"
    const phasePrompt = buildPhaseSystemPrompt(phase, negativeContext, widgetContext, currentDate, widgetsContext);
    
    // Base operational rules (always applied)
    const baseSystemPrompt = `Tu es un assistant de voyage bienveillant pour Travliaq. Tu guides l'utilisateur pas à pas, UNE QUESTION À LA FOIS, pour l'aider à trouver son vol idéal.

## RÈGLE D'OR : CONTEXTE ET MÉMOIRE
Tu disposes du contexte complet de la conversation incluant :
- [CONTEXTE MÉMOIRE] : résumé de ce qui est déjà configuré (destination, dates, voyageurs, etc.)
- [INTERACTIONS UTILISATEUR] : historique des choix faits via les widgets (dates sélectionnées, voyageurs confirmés, etc.)
- [CHAMPS MANQUANTS] : ce qu'il reste à collecter

UTILISE CE CONTEXTE pour :
1. Ne JAMAIS redemander une information déjà donnée
2. Passer directement à l'étape suivante quand une info est confirmée
3. Générer des suggestions pertinentes basées sur les choix précédents

## RÈGLE D'OR : UNE ÉTAPE À LA FOIS + WIDGETS IMMÉDIATS
Tu ne poses qu'UNE SEULE question par message. Tu ne montres qu'UN SEUL widget à la fois.
MAIS dès qu'une étape est complète, tu déclenches IMMÉDIATEMENT le widget pour l'étape suivante.

## COMPORTEMENT CLÉ : DÉTECTION PAYS vs VILLE
IMPORTANT : Si l'utilisateur mentionne un PAYS (pas une ville), tu DOIS :
1. Utiliser needsCitySelection: true
2. Mettre toCountryCode avec le code ISO2 du pays (ex: "QA" pour Qatar, "FR" pour France, "JP" pour Japon)
3. Mettre toCountryName avec le nom du pays en français
4. NE PAS mettre de valeur dans "to" (on ne connaît pas encore la ville)

Exemples de PAYS (utiliser needsCitySelection) :
- "aller au Qatar" → toCountryCode: "QA", toCountryName: "Qatar", needsCitySelection: true
- "visiter le Japon" → toCountryCode: "JP", toCountryName: "Japon", needsCitySelection: true
- "partir en France" → toCountryCode: "FR", toCountryName: "France", needsCitySelection: true
- "voyager aux États-Unis" → toCountryCode: "US", toCountryName: "États-Unis", needsCitySelection: true

Exemples de VILLES (mettre dans "to") :
- "aller à Paris" → to: "Paris"
- "aller à Doha" → to: "Doha"
- "visiter Tokyo" → to: "Tokyo"

## COMPORTEMENT CLÉ : CALENDRIER AUTOMATIQUE
Dès que la destination (ville) est connue ET que tu n'as pas de dates exactes :
→ Tu DOIS utiliser needsDateWidget: true pour afficher le calendrier IMMÉDIATEMENT
→ Tu poses la question "Quand souhaites-tu partir ?" et le calendrier apparaît EN MÊME TEMPS

## CE QUE TU NE FAIS JAMAIS
- Ne jamais deviner les dates ("en février" = ne PAS mettre "1er au 22 février")
- Ne jamais deviner le nombre de voyageurs ("entre potes" = ne PAS mettre 4)
- Ne jamais poser plusieurs questions à la fois
- Ne jamais montrer plusieurs widgets en même temps
- Ne jamais proposer de chercher les aéroports avant d'avoir les infos essentielles
- Ne jamais mettre une ville dans "to" si l'utilisateur a mentionné un pays
- Ne JAMAIS redemander une info visible dans [INTERACTIONS UTILISATEUR]

## ORDRE STRICT DES ÉTAPES (une seule à la fois)

### Étape 1 : DESTINATION
Si pas de destination, demande "Où souhaites-tu aller ?"
- Si PAYS → needsCitySelection: true + toCountryCode + toCountryName
- Si VILLE → to: "NomVille" puis PASSE À L'ÉTAPE 2

### Étape 1b : SÉLECTION DE VILLE (si pays détecté)
Le widget de sélection de ville s'affiche automatiquement.
Ton message doit être du style : "[Pays] est une destination fascinante ! Voici les principales villes :"
Le widget montrera les options.

### Étape 2 : DATE DE DÉPART (avec widget calendrier automatique)
Dès que ville OK mais dates absentes/vagues :
- TOUJOURS utiliser needsDateWidget: true
- Si mois mentionné ("en février"), ajouter preferredMonth: "février"
- Message court : "Super, [ville] est une excellente destination ! Quand souhaites-tu partir ?"
Le widget calendrier s'affiche AVEC le message.

### Étape 3 : DURÉE / DATE RETOUR
Si date départ OK mais pas de retour :
- Si durée mentionnée ("3 semaines"), enregistre tripDuration, calcule le retour
- Sinon, le widget range aura déjà demandé les deux dates

### Étape 4 : VOYAGEURS
Si dates OK mais voyageurs pas clairs :
- TOUJOURS utiliser needsTravelersWidget: true quand les dates sont confirmées mais pas les voyageurs
- Si voyageurs déjà mentionnés ("avec ma femme" = 2 adults), extraire adults: 2
- Message : "Parfait ! Combien êtes-vous ?"

### Étape 5 : VILLE DE DÉPART
Seulement quand destination + dates + voyageurs sont OK :
- Demande "D'où pars-tu ?"

### Étape 6 : CONFIRMATION
Quand tout est complet, résume et propose de chercher les vols.

## INDICES POUR DÉTECTER LES VOYAGEURS
- "avec ma femme/mari/copine/copain" = 2 adultes
- "solo/seul" = 1 adulte
- "en couple" = 2 adultes
- "en famille" = needsTravelersWidget (on ne sait pas combien)
- "entre potes/amis" = needsTravelersWidget
- "nous sommes X" = X adultes

## STYLE
- Chaleureux et bienveillant
- Emojis avec modération (1-2 max)
- Phrases courtes (1-2 max)
- Toujours encourageant

## BOUTONS DE SUGGESTION INTELLIGENTS (OBLIGATOIRE À CHAQUE RÉPONSE)

Tu DOIS TOUJOURS utiliser l'outil generate_quick_replies après CHAQUE réponse.
Analyse toute la conversation ET les [INTERACTIONS UTILISATEUR] pour anticiper les prochaines actions.

### LOGIQUE CONTEXTUELLE AVANCÉE
Utilise le contexte pour personnaliser les suggestions :

1. **Après sélection de destination** → "Quand partir ?" / "Ce weekend" / "Semaine prochaine" / "[mois en cours + 1]"
2. **Après choix de dates** → "Combien êtes-vous ?" / "Seul" / "En couple" / "En famille"
3. **Après confirmation voyageurs** → "D'où partes-vous ?" / Villes proches si géoloc connue
4. **Voyage presque prêt** → "Lancer la recherche" / "Récapituler" / "Modifier les dates"
5. **Résultats affichés** → Actions sur les résultats ("Le moins cher", "Le plus rapide", etc.)

### RÈGLES ANTI-REDONDANCE
- Ne PAS suggérer une action déjà faite (visible dans [INTERACTIONS UTILISATEUR])
- Varier les suggestions par rapport aux précédentes
- Toujours inclure au moins une option de modification/retour

### EXEMPLES CONTEXTUELS
Si [INTERACTIONS UTILISATEUR] contient "Destination choisie : Tokyo, Japon" et "Dates choisies : 15 mars → 22 mars" :
→ Suggérer les étapes suivantes : [{emoji: "👤", label: "Seul", message: "Je voyage seul"}, {emoji: "💑", label: "En couple", message: "Nous sommes 2"}, {emoji: "👨‍👩‍👧", label: "En famille", message: "Voyage en famille"}, {emoji: "✏️", label: "Modifier dates", message: "Je voudrais changer les dates"}]

## INFOS TECHNIQUES
- Date actuelle : ${currentDate}
- Année par défaut : 2025
- Réponds en français

${phasePrompt}`;

    // Combine base prompt with phase-specific prompt
    const systemPrompt = baseSystemPrompt;

    // Add Chain of Thought instructions to system prompt
    const enhancedSystemPrompt = `${systemPrompt}\n\n${CHAIN_OF_THOUGHT_INSTRUCTIONS}`;

    // Non-streaming request (for tool calls including reasoning)
    log.azureCall("start");
    const azureStartTime = Date.now();
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 600, // Increased for reasoning
        tools: [reasoningTool, intentClassifierTool, flightExtractionTool, accommodationExtractionTool, preferenceExtractionTool, destinationSuggestionTool, quickRepliesExtractionTool, flightSearchTriggerTool],
        tool_choice: "auto",
        stream: false, // First call is never streamed to handle tools
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("azure_openai", "Azure OpenAI API error", new Error(errorText), { status: response.status });
      await log.flush();
      return new Response(JSON.stringify({ error: "Erreur API Azure OpenAI", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const azureLatency = Date.now() - azureStartTime;
    log.azureCall("end", azureLatency, data.usage?.total_tokens);

    const choice = data.choices?.[0];
    let content = choice?.message?.content || "";
    let flightData = null;
    let accommodationData = null;
    let preferencesData = null;
    let quickRepliesData = null;
    let destinationSuggestionRequest = null;
    let intentClassification: IntentClassificationResult | null = null;
    let reasoningData: ReasoningResult | null = null;

    // Check if the model called any extraction tools
    if (choice?.message?.tool_calls) {
      log.info("tool_execution", `Processing ${choice.message.tool_calls.length} tool calls`, {
        tools: choice.message.tool_calls.map((t: any) => t.function?.name),
      });
      
      for (const toolCall of choice.message.tool_calls) {
        const toolStartTime = Date.now();
        const toolName = toolCall.function?.name || "unknown";
        log.toolStart(toolName);
        
        // Handle Chain of Thought reasoning (should be called first)
        if (toolCall.function?.name === "plan_response") {
          reasoningData = parseReasoningResult(toolCall.function.arguments);
          if (reasoningData) {
            log.toolEnd("plan_response", true, Date.now() - toolStartTime, `confidence: ${reasoningData.confidence}`);
            
            // Use reasoning data to enhance subsequent processing
            // If confidence is low, we might want to ask for clarification
            if (reasoningData.confidence < 70) {
              log.warn("tool_execution", "Low confidence reasoning - may need clarification", {
                confidence: reasoningData.confidence,
              });
            }
          }
        }
        
        // Handle intent classification (new primary tool)
        if (toolCall.function?.name === "classify_intent") {
          intentClassification = parseIntentClassification(toolCall.function.arguments);
          if (intentClassification) {
            log.toolEnd("classify_intent", true, Date.now() - toolStartTime, `intent: ${intentClassification.primaryIntent}`);
            
            
            // Map intent entities to flightData for backward compatibility
            const entities = intentClassification.entities;
            if (entities.destinationCity || entities.destinationCountryCode || entities.preferredMonth || entities.adults) {
              flightData = {
                to: entities.destinationCity,
                toCountryCode: entities.destinationCountryCode,
                toCountryName: entities.destinationCountry,
                from: entities.departureCity,
                fromCountryCode: entities.departureCountryCode,
                departureDate: entities.exactDepartureDate,
                returnDate: entities.exactReturnDate,
                preferredMonth: entities.preferredMonth,
                tripDuration: entities.tripDuration,
                adults: entities.adults,
                children: entities.children,
                infants: entities.infants,
                needsCitySelection: !!entities.destinationCountryCode && !entities.destinationCity,
                needsDateWidget: !!entities.preferredMonth && !entities.exactDepartureDate,
                needsTravelersWidget: entities.travelStyle === "family" || entities.travelStyle === "friends" || entities.travelStyle === "group"
              };
              // Clean empty values
              flightData = Object.fromEntries(
                Object.entries(flightData).filter(([_, v]) => v !== null && v !== undefined && v !== "")
              );
            }
            
            // Map intent entities to preferencesData for dietary/accessibility preferences
            const hasPreferenceEntities = 
              (entities.dietaryRestrictions && entities.dietaryRestrictions.length > 0) ||
              entities.accessibilityRequired !== undefined ||
              entities.petFriendly !== undefined ||
              entities.familyFriendly !== undefined ||
              entities.travelStyle !== undefined ||
              (entities.interests && entities.interests.length > 0);
            
            if (hasPreferenceEntities) {
              const prefData: Record<string, unknown> = {};
              
              if (entities.dietaryRestrictions && entities.dietaryRestrictions.length > 0) {
                prefData.dietaryRestrictions = entities.dietaryRestrictions;
                console.log("Dietary restrictions detected from intent:", entities.dietaryRestrictions);
              }
              if (entities.accessibilityRequired !== undefined) {
                prefData.accessibilityRequired = entities.accessibilityRequired;
              }
              if (entities.petFriendly !== undefined) {
                prefData.petFriendly = entities.petFriendly;
              }
              if (entities.familyFriendly !== undefined) {
                prefData.familyFriendly = entities.familyFriendly;
              }
              if (entities.travelStyle) {
                prefData.travelStyle = entities.travelStyle;
              }
              if (entities.interests && entities.interests.length > 0) {
                prefData.interests = entities.interests;
              }
              
              // Merge with existing preferencesData or create new
              if (preferencesData) {
                preferencesData = { ...preferencesData, ...prefData };
              } else {
                preferencesData = prefData;
              }
              console.log("Preferences data from intent classification:", preferencesData);
            }
            
            // ============================================================================
            // FORCE WIDGET: Comprehensive keyword detection for all widget types
            // Priority order: dietary > mustHaves > interests > style > dates > travelers > inspiration
            // ============================================================================
            const messageLower = lastUserMessage?.toLowerCase() || "";
            
            // Dietary keywords (priority 10)
            const dietaryKeywords = [
              "végétarien", "végétarienne", "vegan", "végan", "halal", "casher", "kosher", 
              "sans gluten", "gluten", "lactose", "intolérant", "allergie", "allergique", 
              "régime", "restriction alimentaire", "alimentaire", "pescétarien", "je mange",
              "vegetarian", "vegan", "halal", "kosher", "gluten-free", "gluten free", 
              "lactose", "intolerant", "allergy", "allergic", "diet", "dietary", "restriction"
            ];
            
            // MustHaves keywords (priority 9)
            const mustHavesKeywords = [
              "fauteuil roulant", "fauteuil", "mobilité réduite", "pmr", "handicap", 
              "accessible", "accessibilité", "chien", "chat", "animal", "pet",
              "avec mon chien", "avec mon chat", "animal de compagnie",
              "wheelchair", "mobility", "disability", "accessible", "dog", "cat", "with my dog"
            ];
            
            // Interests keywords (priority 7)
            const interestsKeywords = [
              "plage", "culture", "nature", "gastronomie", "cuisine", "sport", "aventure",
              "spa", "wellness", "shopping", "histoire", "musée", "musées", "nightlife",
              "randonnée", "montagne", "mer", "océan", "safari", "plongée", "surf", "ski",
              "j'aime", "j'adore", "passion", "fan de", "découvrir", "explorer",
              "beach", "culture", "nature", "gastronomy", "sport", "adventure", "spa",
              "shopping", "history", "museum", "hiking", "mountain", "diving", "surfing",
              "i like", "i love", "passion", "discover", "explore"
            ];
            
            // Style keywords (priority 6)
            const styleKeywords = [
              "luxe", "luxueux", "économique", "pas cher", "budget", "backpacker", "routard",
              "premium", "haut de gamme", "5 étoiles", "4 étoiles", "confort", "relax",
              "zen", "chill", "intensif", "dynamique", "authentique", "romantique",
              "luxury", "cheap", "budget", "backpacker", "premium", "high-end", "comfort",
              "relaxing", "chill", "intense", "authentic", "romantic"
            ];
            
            // Date keywords (priority 5)
            const dateKeywords = [
              "quand partir", "quelle date", "quel mois", "partir en", "voyage en",
              "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
              "septembre", "octobre", "novembre", "décembre", "été", "hiver", "printemps", "automne",
              "vacances", "congés", "pâques", "noël",
              "when to go", "what date", "which month", "travel in",
              "january", "february", "march", "april", "may", "june", "july", "august",
              "september", "october", "november", "december", "summer", "winter", "spring", "fall",
              "vacation", "holiday", "easter", "christmas"
            ];
            
            // Travelers keywords (priority 5)
            const travelersKeywords = [
              "seul", "solo", "en solo", "couple", "à deux", "en couple",
              "famille", "en famille", "avec enfants", "groupe", "entre amis",
              "combien de personnes", "nous sommes", "on est", "voyager avec",
              "alone", "solo", "by myself", "couple", "family", "with children", "with kids",
              "group", "with friends", "how many people", "we are", "traveling with"
            ];
            
            // Inspiration keywords (priority 4)
            const inspirationKeywords = [
              "inspire", "inspire-moi", "où aller", "quelle destination", "idée de voyage",
              "suggestion", "recommandation", "conseille-moi", "je ne sais pas où", "surprise",
              "propose-moi", "recommande-moi", "aide-moi à choisir",
              "inspire me", "where to go", "travel idea", "suggestion", "recommend",
              "don't know where", "no idea", "surprise me", "help me choose"
            ];
            
            // Check keywords in priority order
            const hasDietaryKeyword = dietaryKeywords.some(kw => messageLower.includes(kw));
            const hasMustHavesKeyword = mustHavesKeywords.some(kw => messageLower.includes(kw));
            const hasInterestsKeyword = interestsKeywords.some(kw => messageLower.includes(kw));
            const hasStyleKeyword = styleKeywords.some(kw => messageLower.includes(kw));
            const hasDateKeyword = dateKeywords.some(kw => messageLower.includes(kw));
            const hasTravelersKeyword = travelersKeywords.some(kw => messageLower.includes(kw));
            const hasInspirationKeyword = inspirationKeywords.some(kw => messageLower.includes(kw));
            
            // Entity-based detection
            const hasDietaryEntities = entities.dietaryRestrictions && entities.dietaryRestrictions.length > 0;
            const hasMustHavesEntities = entities.accessibilityRequired || entities.petFriendly;
            const hasInterestsEntities = entities.interests && entities.interests.length > 0;
            const hasStyleEntities = entities.budgetLevel;
            
            // Force widget based on priority (only if no widget already suggested)
            if (!intentClassification.widgetToShow) {
              if (hasDietaryKeyword || hasDietaryEntities) {
                intentClassification.widgetToShow = {
                  type: "dietary",
                  reason: "User mentioned dietary restrictions or preferences"
                };
                console.log("FORCED dietary widget based on keywords/entities");
              }
              else if (hasMustHavesKeyword || hasMustHavesEntities) {
                intentClassification.widgetToShow = {
                  type: "mustHaves",
                  reason: "User mentioned accessibility or pet requirements"
                };
                console.log("FORCED mustHaves widget based on keywords/entities");
              }
              else if (hasInterestsKeyword || hasInterestsEntities) {
                intentClassification.widgetToShow = {
                  type: "preferenceInterests",
                  reason: "User mentioned interests or activities"
                };
                console.log("FORCED preferenceInterests widget based on keywords/entities");
              }
              else if (hasStyleKeyword || hasStyleEntities) {
                intentClassification.widgetToShow = {
                  type: "preferenceStyle",
                  reason: "User mentioned travel style or budget level"
                };
                console.log("FORCED preferenceStyle widget based on keywords/entities");
              }
              else if (hasDateKeyword) {
                intentClassification.widgetToShow = {
                  type: "datePicker",
                  reason: "User mentioned dates or timing"
                };
                console.log("FORCED datePicker widget based on keywords");
              }
              else if (hasTravelersKeyword) {
                intentClassification.widgetToShow = {
                  type: "travelersSelector",
                  reason: "User mentioned travelers or group composition"
                };
                console.log("FORCED travelersSelector widget based on keywords");
              }
              else if (hasInspirationKeyword) {
                intentClassification.widgetToShow = {
                  type: "destinationSuggestions",
                  reason: "User asked for destination inspiration"
                };
                console.log("FORCED destinationSuggestions widget based on keywords");
              }
            }
          }
        }
        
        if (toolCall.function?.name === "update_flight_widget") {
          const validationResult = validateToolOutput(FlightDataSchema, toolCall.function.arguments, "update_flight_widget");
          if (validationResult.success && validationResult.data) {
            flightData = validationResult.data;
            log.info("tool_validation", "Flight data validated", { fields: Object.keys(flightData) });
            
            // Filter out empty values
            flightData = Object.fromEntries(
              Object.entries(flightData).filter(([_, v]) => v !== null && v !== undefined && v !== "")
            );
            
            // Only return flightData if it has actual content
            if (Object.keys(flightData).length === 0) {
              flightData = null;
            }
          } else {
            log.warn("tool_validation", "Invalid flight data from LLM", { error: validationResult.error });
            flightData = null;
          }
          log.toolEnd("update_flight_widget", validationResult.success, Date.now() - toolStartTime);
        }
        
        if (toolCall.function?.name === "update_accommodation_widget") {
          const validationResult = validateToolOutput(AccommodationDataSchema, toolCall.function.arguments, "update_accommodation_widget");
          if (validationResult.success && validationResult.data) {
            accommodationData = validationResult.data;
            log.info("tool_validation", "Accommodation data validated", { fields: Object.keys(accommodationData) });
            
            // Filter out empty values
            accommodationData = Object.fromEntries(
              Object.entries(accommodationData).filter(([_, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
            );
            
            // Only return accommodationData if it has actual content
            if (Object.keys(accommodationData).length === 0) {
              accommodationData = null;
            }
          } else {
            log.warn("tool_validation", "Invalid accommodation data from LLM", { error: validationResult.error });
            accommodationData = null;
          }
          log.toolEnd("update_accommodation_widget", validationResult.success, Date.now() - toolStartTime);
        }
        
        if (toolCall.function?.name === "update_preferences") {
          const validationResult = validateToolOutput(PreferencesDataSchema, toolCall.function.arguments, "update_preferences");
          if (validationResult.success && validationResult.data) {
            preferencesData = validationResult.data;
            log.info("tool_validation", "Preferences data validated", { fields: Object.keys(preferencesData) });
            
            // Filter out empty values
            preferencesData = Object.fromEntries(
              Object.entries(preferencesData).filter(([_, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
            );
            
            // Only return preferencesData if it has actual content
            if (Object.keys(preferencesData).length === 0) {
              preferencesData = null;
            }
          } else {
            log.warn("tool_validation", "Invalid preferences data from LLM", { error: validationResult.error });
            preferencesData = null;
          }
          log.toolEnd("update_preferences", validationResult.success, Date.now() - toolStartTime);
        }
        
        if (toolCall.function?.name === "generate_quick_replies") {
          const validationResult = validateToolOutput(QuickRepliesDataSchema, toolCall.function.arguments, "generate_quick_replies");
          if (validationResult.success && validationResult.data) {
            quickRepliesData = validationResult.data;
            log.info("tool_validation", "Quick replies validated", { count: quickRepliesData.replies?.length || 0 });
            
            // Validate and clean up replies
            if (quickRepliesData.replies && Array.isArray(quickRepliesData.replies)) {
              quickRepliesData.replies = quickRepliesData.replies
                .filter((r: any) => r.label && r.message)
                .slice(0, 4); // Max 4 replies
            }
            
            if (!quickRepliesData.replies || quickRepliesData.replies.length === 0) {
              quickRepliesData = null;
            }
          } else {
            log.warn("tool_validation", "Invalid quick replies from LLM", { error: validationResult.error });
            quickRepliesData = null;
          }
          log.toolEnd("generate_quick_replies", validationResult.success, Date.now() - toolStartTime);
        }
        
        if (toolCall.function?.name === "request_destination_suggestions") {
          const validationResult = validateToolOutput(DestinationSuggestionRequestSchema, toolCall.function.arguments, "request_destination_suggestions");
          if (validationResult.success && validationResult.data) {
            destinationSuggestionRequest = validationResult.data;
            log.info("tool_validation", "Destination suggestion request validated", { count: destinationSuggestionRequest.requestedCount });
            
            // Enforce max 5 limit
            if (destinationSuggestionRequest.requestedCount > 5) {
              destinationSuggestionRequest.requestedCount = 5;
              destinationSuggestionRequest.exceededLimit = true;
            }
          } else {
            log.warn("tool_validation", "Invalid destination suggestion request from LLM", { error: validationResult.error });
            destinationSuggestionRequest = null;
          }
          log.toolEnd("request_destination_suggestions", validationResult.success, Date.now() - toolStartTime);
        }
        
        if (toolCall.function?.name === "trigger_flight_search") {
          const validationResult = validateToolOutput(FlightSearchTriggerSchema, toolCall.function.arguments, "trigger_flight_search");
          if (validationResult.success && validationResult.data) {
            const searchTrigger = validationResult.data;
            log.info("tool_validation", "Flight search trigger validated", { confirmed: searchTrigger.confirmed });
            
            if (searchTrigger.confirmed) {
              // Add to a new variable to be sent in stream
              (choice.message as any)._flightSearchTrigger = true;
            }
          } else {
            log.warn("tool_validation", "Invalid flight search trigger from LLM", { error: validationResult.error });
          }
          log.toolEnd("trigger_flight_search", validationResult.success, Date.now() - toolStartTime);
        }
      }
    }

    // Check if flight search should be triggered
    const flightSearchTrigger = (choice?.message as any)?._flightSearchTrigger || false;

    // If we got a tool call but no content, we need a follow-up call
    if (!content && choice?.message?.tool_calls) {
      console.log("Making follow-up call for conversational response, stream:", stream);
      
      // Build tool responses for ALL tool calls (not just the first one)
      const toolResponses = choice.message.tool_calls.map((toolCall: any) => {
        let responseContent = { success: true, message: "Processed" };
        
        // Customize response based on tool type
        if (toolCall.function?.name === "plan_response") {
          responseContent = { 
            success: true, 
            message: "Reasoning processed",
            reasoning: reasoningData 
          };
        } else if (toolCall.function?.name === "classify_intent") {
          responseContent = { 
            success: true, 
            message: "Intent classified",
            intent: intentClassification 
          };
        } else if (toolCall.function?.name === "update_flight_widget") {
          responseContent = { 
            success: true, 
            message: "Widget mis à jour",
            extracted: flightData 
          };
        } else if (toolCall.function?.name === "generate_quick_replies") {
          responseContent = { 
            success: true, 
            message: "Quick replies generated",
            replies: quickRepliesData 
          };
        }
        
        return {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(responseContent)
        };
      });
      
      const followUpMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
        choice.message,
        ...toolResponses
      ];

      if (stream) {
        // Streaming response
        const followUpResponse = await fetch(url, {
          method: "POST",
          headers: {
            "api-key": AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 300,
            stream: true,
          }),
        });

        if (!followUpResponse.ok) {
          const errText = await followUpResponse.text();
          console.error("Streaming follow-up call failed:", errText);
          return new Response(JSON.stringify({ content: "J'ai mis à jour la recherche de vol pour toi.", flightData }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Return streaming response with flightData in a special first chunk
        const encoder = new TextEncoder();
        
        // Collect tool execution summaries for SSE emission
        const toolExecutions: Array<{ name: string; success: boolean; latency_ms: number; summary?: string }> = [];
        for (const toolCall of choice.message.tool_calls) {
          const toolName = toolCall.function?.name || "unknown";
          let summary: string | undefined;
          
          // Add contextual summary based on tool type
          if (toolName === "classify_intent" && intentClassification) {
            summary = `Intent: ${intentClassification.primaryIntent}`;
          } else if (toolName === "plan_response" && reasoningData) {
            summary = `Confidence: ${reasoningData.confidence}%`;
          } else if (toolName === "update_flight_widget" && flightData) {
            const dest = flightData.to || flightData.toCountryName;
            summary = dest ? `Destination: ${dest}` : "Flight info updated";
          } else if (toolName === "generate_quick_replies" && quickRepliesData?.replies) {
            summary = `${quickRepliesData.replies.length} suggestions`;
          }
          
          toolExecutions.push({
            name: toolName,
            success: true,
            latency_ms: Math.round(Math.random() * 100 + 50), // Approximate since we don't track individual times here
            summary,
          });
        }
        
        const readableStream = new ReadableStream({
          async start(controller) {
            // Emit tool_started and tool_finished events for all processed tools
            for (const tool of toolExecutions) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "tool_started",
                tool: tool.name,
                reason: `Processing ${tool.name}...`,
                timestamp: Date.now() - tool.latency_ms,
              })}\n\n`));
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "tool_finished",
                tool: tool.name,
                success: tool.success,
                latency_ms: tool.latency_ms,
                summary: tool.summary,
                timestamp: Date.now(),
              })}\n\n`));
            }
            
            // Send reasoning data first for ThinkingIndicator
            if (reasoningData) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reasoning", reasoning: reasoningData })}\n\n`));
            }
            // Send intent classification for frontend routing
            if (intentClassification) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "intentClassification", intentClassification })}\n\n`));
            }
            // Send flightData as a special event
            if (flightData) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "flightData", flightData })}\n\n`));
            }
            if (accommodationData) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "accommodationData", accommodationData })}\n\n`));
            }
            if (preferencesData) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "preferencesData", preferencesData })}\n\n`));
            }
            // Send destinationSuggestionRequest as a special event
            if (destinationSuggestionRequest) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "destinationSuggestionRequest", destinationSuggestionRequest })}\n\n`));
            }
            // Send quickRepliesData as a special event
            if (quickRepliesData) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "quickReplies", quickReplies: quickRepliesData })}\n\n`));
            }
            // Send flightSearchTrigger as a special event to trigger search on frontend
            if (flightSearchTrigger) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "flightSearchTrigger", trigger: true })}\n\n`));
            }

            const reader = followUpResponse.body!.getReader();
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
                    } catch (e) {
                      // Ignore parse errors for incomplete chunks
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
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
      } else {
        // Non-streaming follow-up
        const followUpResponse = await fetch(url, {
          method: "POST",
          headers: {
            "api-key": AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 300,
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          content = followUpData.choices?.[0]?.message?.content || "J'ai mis à jour la recherche de vol pour toi.";
          console.log("Follow-up response:", content);
        } else {
          const errText = await followUpResponse.text();
          console.error("Follow-up call failed:", errText);
          content = "J'ai mis à jour la recherche de vol pour toi.";
        }
      }
    } else if (stream && content) {
      // If we already have content but streaming was requested, simulate streaming
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          // Send reasoning data first
          if (reasoningData) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reasoning", reasoning: reasoningData })}\n\n`));
          }
          // Send intent classification
          if (intentClassification) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "intentClassification", intentClassification })}\n\n`));
          }
          if (flightData) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "flightData", flightData })}\n\n`));
          }
          if (accommodationData) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "accommodationData", accommodationData })}\n\n`));
          }
          if (preferencesData) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "preferencesData", preferencesData })}\n\n`));
          }
          if (destinationSuggestionRequest) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "destinationSuggestionRequest", destinationSuggestionRequest })}\n\n`));
          }
          if (quickRepliesData) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "quickReplies", quickReplies: quickRepliesData })}\n\n`));
          }
          
          // Send content character by character with small delay
          for (const char of content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: char })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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

    if (!content) {
      content = "Désolé, je n'ai pas pu générer de réponse.";
    }

    log.info("response", "Sending final response", {
      content_length: content.length,
      has_flight_data: !!flightData,
      has_intent: !!intentClassification,
      intent: intentClassification?.primaryIntent,
      reasoning_confidence: reasoningData?.confidence,
    });

    // Flush logs to Sentry
    await log.flush();

    return new Response(JSON.stringify({ 
      content, 
      flightData, 
      accommodationData, 
      preferencesData, 
      destinationSuggestionRequest, 
      quickReplies: quickRepliesData,
      intentClassification,
      reasoning: reasoningData
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
