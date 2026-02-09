/**
 * Intent Classification Tool
 * 
 * Defines the classify_intent tool for structured intent detection.
 * This tool provides reliable, structured output for widget triggering.
 */

/**
 * The classify_intent tool definition for Azure OpenAI
 */
export const intentClassifierTool = {
  type: "function",
  function: {
    name: "classify_intent",
    description: `OBLIGATOIRE pour CHAQUE message. Classifie l'intention de l'utilisateur et détermine le widget à afficher.

## RÈGLE CRITIQUE
Tu DOIS appeler cet outil en PREMIER pour CHAQUE message utilisateur avant de répondre.

## ORDRE DE PRIORITÉ DES WIDGETS
1. Destination (citySelector si pays mentionné)
2. Dates (dateRangePicker ou datePicker)
3. Voyageurs (travelersSelector)
4. Type de voyage (tripTypeConfirm)
5. Préférences (dietary, mustHaves, preferenceInterests, preferenceStyle)
6. Recherche

## LOGIQUE DE DÉTECTION

### DESTINATION
- Pays mentionné (Japon, France, Qatar) → widgetType: "citySelector"
- Ville mentionnée (Paris, Tokyo) → Pas de widget, extraire la ville

### DATES
- Mois vague ("en février", "cet été") → widgetType: "dateRangePicker" + preferredMonth
- Date exacte ("le 15 mars") → Pas de widget, extraire la date
- Durée ("3 semaines") → widgetType: "datePicker" + tripDuration

### VOYAGEURS
- Composition vague ("en famille", "entre amis") → widgetType: "travelersSelector"
- Nombre exact ("2 adultes") → Pas de widget, extraire le nombre
- "en couple" → Pas de widget, adults: 2

### PRÉFÉRENCES & CONTRAINTES (CRITIQUE - TOUJOURS DÉCLENCHER LE WIDGET APPROPRIÉ)

**dietary** - Restrictions alimentaires (PRIORITÉ 10):
- FR: "végétarien", "vegan", "halal", "casher", "sans gluten", "lactose", "allergie", "régime", "restriction alimentaire", "je mange", "intolérant"
- EN: "vegetarian", "vegan", "halal", "kosher", "gluten-free", "lactose", "allergy", "diet", "dietary restriction"

**mustHaves** - Accessibilité/animaux/critères obligatoires (PRIORITÉ 9):
- FR: "fauteuil roulant", "mobilité réduite", "PMR", "handicap", "accessible", "chien", "chat", "animal de compagnie", "avec mon chien", "wifi obligatoire", "piscine"
- EN: "wheelchair", "disability", "accessible", "mobility", "dog", "cat", "pet", "with my pet", "wifi", "pool"

**preferenceInterests** - Activités et centres d'intérêt (PRIORITÉ 7):
- FR: "plage", "culture", "nature", "gastronomie", "sport", "aventure", "spa", "wellness", "shopping", "musée", "randonnée", "montagne", "mer", "safari", "plongée", "surf", "ski", "j'aime", "j'adore", "passion", "fan de"
- EN: "beach", "culture", "nature", "gastronomy", "sport", "adventure", "spa", "shopping", "museum", "hiking", "mountain", "diving", "surfing", "i like", "i love", "passion"

**preferenceStyle** - Style de voyage et budget (PRIORITÉ 6):
- FR: "luxe", "économique", "pas cher", "budget", "backpacker", "routard", "premium", "haut de gamme", "5 étoiles", "confort", "relax", "zen", "chill", "intensif", "authentique", "romantique"
- EN: "luxury", "cheap", "budget", "backpacker", "premium", "high-end", "comfort", "relaxing", "chill", "authentic", "romantic"

**datePicker** - Dates de voyage (PRIORITÉ 5):
- FR: "quand partir", "quelle date", "quel mois", "janvier" à "décembre", "été", "hiver", "printemps", "automne", "vacances", "pâques", "noël"
- EN: "when to go", "what date", "which month", "january" to "december", "summer", "winter", "spring", "fall", "vacation", "easter", "christmas"

**travelersSelector** - Composition du groupe (PRIORITÉ 5):
- FR: "seul", "solo", "couple", "à deux", "famille", "en famille", "avec enfants", "groupe", "entre amis", "combien de personnes", "nous sommes", "on est"
- EN: "alone", "solo", "couple", "family", "with children", "with kids", "group", "with friends", "how many people", "we are"

**destinationSuggestions** - Inspiration (PRIORITÉ 4):
- FR: "inspire-moi", "où aller", "quelle destination", "idée de voyage", "suggestion", "recommandation", "conseille-moi", "je ne sais pas où", "surprise-moi"
- EN: "inspire me", "where to go", "travel idea", "suggestion", "recommend", "don't know where", "surprise me"

### INDÉCISION / AIDE (PRIORITÉ 11 - LA PLUS HAUTE)
- FR: "je sais pas", "je ne sais pas", "j'hésite", "aide-moi", "aucune idée", "pas d'idée", "je sais pas trop"
- EN: "I don't know", "no idea", "help me decide", "not sure", "I'm unsure"
- SI préférences vides (pas d'intérêts, pas de style) → primaryIntent: "gather_preferences", widgetType: "preferenceInterests"
- SI préférences partielles (intérêts mais pas de style) → primaryIntent: "gather_preferences", widgetType: "preferenceStyle"
- SI préférences complètes → primaryIntent: "ask_inspiration", widgetType: "destinationSuggestions" (maintenant pertinent car basé sur les préférences)
- IMPORTANT: L'utilisateur indécis doit d'abord exprimer ses envies AVANT de recevoir des suggestions de destinations

### ACTIONS SPÉCIALES
- "choisis pour moi" → primaryIntent: "delegate_choice"
- "lance la recherche" → primaryIntent: "trigger_search"
- "modifie" → primaryIntent: "modify_selection"`,
    parameters: {
      type: "object",
      properties: {
        primaryIntent: {
          type: "string",
          enum: [
            "search_destination",
            "provide_destination",
            "provide_departure_city",
            "provide_dates",
            "provide_duration",
            "flexible_dates",
            "provide_travelers",
            "specify_composition",
            "express_preference",
            "express_constraint",
            "ask_inspiration",
            "ask_recommendations",
            "compare_options",
            "confirm_selection",
            "modify_selection",
            "trigger_search",
            "delegate_choice",
            "cancel_or_restart",
            "gather_preferences",
            "ask_question",
            "greeting",
            "thank_you",
            "other"
          ],
          description: "L'intention principale détectée dans le message"
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Niveau de confiance (0-100). Moins de 50 = demander clarification"
        },
        entities: {
          type: "object",
          properties: {
            // Location
            destinationCity: { 
              type: "string", 
              description: "Ville de destination EXPLICITE (Paris, Tokyo, Rome)" 
            },
            destinationCountry: { 
              type: "string", 
              description: "Pays de destination en français" 
            },
            destinationCountryCode: { 
              type: "string", 
              description: "Code ISO2 du pays (JP, FR, QA)" 
            },
            departureCity: { 
              type: "string", 
              description: "Ville de départ EXPLICITE" 
            },
            departureCountryCode: { 
              type: "string", 
              description: "Code ISO2 du pays de départ" 
            },
            // Dates
            exactDepartureDate: { 
              type: "string", 
              description: "Date exacte format YYYY-MM-DD (seulement si EXPLICITE: 'le 15 mars')" 
            },
            exactReturnDate: { 
              type: "string", 
              description: "Date retour exacte format YYYY-MM-DD" 
            },
            preferredMonth: { 
              type: "string", 
              description: "Mois préféré si vague: 'février', 'été', 'printemps'" 
            },
            tripDuration: { 
              type: "string", 
              description: "Durée mentionnée: '3 semaines', '10 jours'" 
            },
            // Travelers
            adults: { 
              type: "number", 
              description: "Nombre d'adultes si EXPLICITE" 
            },
            children: { 
              type: "number", 
              description: "Nombre d'enfants si EXPLICITE" 
            },
            infants: { 
              type: "number", 
              description: "Nombre de bébés si EXPLICITE" 
            },
            travelStyle: { 
              type: "string", 
              enum: ["solo", "couple", "family", "friends", "group"],
              description: "Style déduit: 'seul'=solo, 'en couple'=couple, 'en famille'=family, 'entre amis'=friends"
            },
            // Preferences
            budgetLevel: {
              type: "string",
              enum: ["budget", "moderate", "luxury"],
              description: "Niveau budget: 'pas cher'=budget, 'confortable'=moderate, 'luxe'=luxury"
            },
            interests: {
              type: "array",
              items: { type: "string" },
              description: "Centres d'intérêt détectés: culture, plage, nature, gastronomie, etc."
            },
            // Dietary restrictions - CRITICAL: always extract when mentioned
            dietaryRestrictions: {
              type: "array",
              items: { type: "string" },
              description: "Restrictions alimentaires TOUJOURS extraites: 'je mange vegan'=['vegan'], 'halal'=['halal'], 'végétarien'=['vegetarian'], 'sans gluten'=['gluten-free'], 'casher'=['kosher'], 'pescatarien'=['pescatarian'], 'sans lactose'=['lactose-free'], 'sans œufs'=['no-eggs'], 'sans noix'=['no-nuts']"
            },
            // Accessibility needs
            accessibilityRequired: {
              type: "boolean",
              description: "'fauteuil roulant', 'mobilité réduite', 'handicap' = true"
            },
            petFriendly: {
              type: "boolean",
              description: "'avec mon chien', 'avec mon chat', 'animal de compagnie' = true"
            },
            familyFriendly: {
              type: "boolean",
              description: "'avec enfants', 'adapté aux enfants' = true"
            }
          },
          description: "Entités extraites du message"
        },
        widgetToShow: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "citySelector",
                "datePicker",
                "dateRangePicker",
                "travelersSelector",
                "tripTypeConfirm",
                "travelersConfirmBeforeSearch",
                "preferenceStyle",
                "preferenceInterests",
                "dietary",
                "mustHaves",
                "destinationSuggestions"
              ],
              description: "Type de widget à afficher"
            },
            reason: {
              type: "string",
              description: "Raison courte pour afficher ce widget"
            },
            data: {
              type: "object",
              description: "Données additionnelles pour le widget (preferredMonth, countryCode, etc.)"
            }
          },
          description: "Widget à afficher après cette réponse. NULL si aucun widget nécessaire."
        },
        nextExpectedIntent: {
          type: "string",
          enum: [
            "provide_destination",
            "provide_dates",
            "provide_travelers",
            "provide_departure_city",
            "trigger_search",
            "confirm_selection"
          ],
          description: "Prochaine intention attendue basée sur l'état actuel"
        },
        requiresClarification: {
          type: "boolean",
          description: "TRUE si le message est ambigu et nécessite clarification"
        },
        clarificationQuestion: {
          type: "string",
          description: "Question à poser si clarification nécessaire"
        }
      },
      required: ["primaryIntent", "confidence", "entities"]
    }
  }
};

/**
 * Parse the intent classification response
 */
export interface IntentClassificationResult {
  primaryIntent: string;
  confidence: number;
  entities: {
    destinationCity?: string;
    destinationCountry?: string;
    destinationCountryCode?: string;
    departureCity?: string;
    departureCountryCode?: string;
    exactDepartureDate?: string;
    exactReturnDate?: string;
    preferredMonth?: string;
    tripDuration?: string;
    adults?: number;
    children?: number;
    infants?: number;
    travelStyle?: "solo" | "couple" | "family" | "friends" | "group";
    budgetLevel?: "budget" | "moderate" | "luxury";
    interests?: string[];
    // Preferences
    dietaryRestrictions?: string[];
    accessibilityRequired?: boolean;
    petFriendly?: boolean;
    familyFriendly?: boolean;
  };
  widgetToShow?: {
    type: string;
    reason: string;
    data?: Record<string, unknown>;
  };
  nextExpectedIntent?: string;
  requiresClarification?: boolean;
  clarificationQuestion?: string;
}

/**
 * Validate and clean intent classification result
 */
export function parseIntentClassification(args: string): IntentClassificationResult | null {
  try {
    const parsed = JSON.parse(args);
    
    // Validate required fields
    if (!parsed.primaryIntent || typeof parsed.confidence !== 'number') {
      console.error("Invalid intent classification: missing required fields");
      return null;
    }
    
    // Ensure entities is an object
    if (!parsed.entities || typeof parsed.entities !== 'object') {
      parsed.entities = {};
    }
    
    // Clean up empty values in entities
    parsed.entities = Object.fromEntries(
      Object.entries(parsed.entities).filter(([_, v]) => 
        v !== null && v !== undefined && v !== "" && 
        !(Array.isArray(v) && v.length === 0)
      )
    );
    
    return parsed as IntentClassificationResult;
  } catch (e) {
    console.error("Failed to parse intent classification:", e);
    return null;
  }
}
