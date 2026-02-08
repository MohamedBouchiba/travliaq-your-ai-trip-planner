/**
 * Preference Extraction Tool
 * 
 * Detects travel preferences from user messages.
 * Always active - extracts any preference hints from conversation.
 */

export const preferenceExtractionTool = {
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

export type PreferenceExtractionResult = {
  travelStyle?: "solo" | "couple" | "family" | "friends";
  pace?: "relaxed" | "moderate" | "intense";
  chillVsIntense?: number;
  cityVsNature?: number;
  ecoVsLuxury?: number;
  touristVsLocal?: number;
  interests?: string[];
  occasion?: "honeymoon" | "anniversary" | "birthday" | "vacation" | "workation";
  needsWifi?: boolean;
  petFriendly?: boolean;
  accessibilityRequired?: boolean;
  familyFriendly?: boolean;
  dietaryRestrictions?: string[];
};
