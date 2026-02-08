/**
 * Accommodation Extraction Tool
 * 
 * Extracts accommodation preferences from user messages.
 */

export const accommodationExtractionTool = {
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

export type AccommodationExtractionResult = {
  budgetPreset?: "eco" | "comfort" | "premium";
  priceMin?: number;
  priceMax?: number;
  types?: Array<"hotel" | "apartment" | "villa" | "hostel" | "guesthouse">;
  minRating?: number;
  amenities?: Array<"wifi" | "parking" | "breakfast" | "ac" | "pool" | "kitchen">;
  mealPlan?: "breakfast" | "half" | "full" | "all-inclusive";
  needsAccommodationWidget?: boolean;
};
