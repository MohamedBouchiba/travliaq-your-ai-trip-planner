/**
 * Flight Extraction Tool
 * 
 * Extracts flight intent from user messages with strict validation rules.
 * Never guesses or infers values - uses widget triggers for ambiguous input.
 */

export const flightExtractionTool = {
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
          description: "Format YYYY-MM-DD. ONLY extract if user gives EXACT date like 'le 15 janvier', 'le 20 mars'. NEVER extract from vague terms like 'en février', 'au printemps', 'cet été'. Si l'utilisateur ne précise pas l'année, utilise l'année de la DATE ACTUELLE fournie dans le prompt système. Si la date résultante est dans le passé, utilise l'année suivante. Ne JAMAIS inventer 2024 ou 2025 si la date actuelle est en 2026."
        },
        returnDate: {
          type: "string",
          description: "Format YYYY-MM-DD. ONLY extract if user gives EXACT return date like 'retour le 22'. Même règle d'année: utilise l'année courante, ou suivante si passée. For duration like '3 semaines', set tripDuration instead."
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
        },
        legs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "string", description: "Departure city for this leg" },
              to: { type: "string", description: "Arrival city for this leg" },
              date: { type: "string", description: "Date for this leg (YYYY-MM-DD) if known" },
            },
            required: ["from", "to"],
          },
          description: "For multi-destination trips: ordered list of legs. E.g., 'Brussels->Istanbul->Doha->Oman->Bangkok->Brussels' = 5 legs. Use this INSTEAD of from/to when tripType is 'multi'."
        }
      },
      required: []
    }
  }
};

export type FlightExtractionResult = {
  from?: string;
  fromCountryCode?: string;
  fromCountryName?: string;
  to?: string;
  toCountryCode?: string;
  toCountryName?: string;
  departureDate?: string;
  returnDate?: string;
  tripDuration?: string;
  preferredMonth?: string;
  adults?: number;
  children?: number;
  infants?: number;
  needsDateWidget?: boolean;
  needsTravelersWidget?: boolean;
  needsCitySelection?: boolean;
  tripType?: "roundtrip" | "oneway" | "multi";
  budgetHint?: string;
  legs?: Array<{ from: string; to: string; date?: string }>;
};
