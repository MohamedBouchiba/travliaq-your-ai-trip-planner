/**
 * Trip Recap Tool
 *
 * Generates a structured trip summary from conversation context.
 * Called by the LLM when the user asks for a recap ("fais-moi un recap",
 * "résumé du voyage", etc.) or when the recap phase is reached.
 */

export const tripRecapTool = {
  type: "function",
  function: {
    name: "generate_trip_recap",
    description: `Generate a structured trip recap/summary from the conversation.
Call this tool when the user asks for a recap, summary, or itinerary of their trip.

IMPORTANT: Only include fields for which you have CONFIRMED data from the conversation.
Do NOT invent prices, dates, or details that were not discussed.
Leave fields as null if unknown.`,
    parameters: {
      type: "object",
      properties: {
        destination: {
          type: "object",
          properties: {
            city: { type: "string", description: "Destination city name" },
            country: { type: "string", description: "Country name" },
            countryCode: { type: "string", description: "ISO country code (e.g. FR, ES)" },
          },
          required: ["city", "country"],
        },
        dates: {
          type: "object",
          properties: {
            departure: { type: "string", description: "Departure date (YYYY-MM-DD)" },
            return: { type: "string", description: "Return date (YYYY-MM-DD)" },
            duration: { type: "string", description: "Trip duration (e.g. '7 jours')" },
          },
        },
        travelers: {
          type: "object",
          properties: {
            adults: { type: "number" },
            children: { type: "number" },
            infants: { type: "number" },
            description: { type: "string", description: "e.g. 'En couple', '2 adultes + 1 enfant'" },
          },
        },
        flight: {
          type: "object",
          properties: {
            fromCity: { type: "string" },
            fromIata: { type: "string" },
            toCity: { type: "string" },
            toIata: { type: "string" },
            airline: { type: "string" },
            price: { type: "number", description: "Price ONLY if from API results" },
            currency: { type: "string" },
            tripType: { type: "string", enum: ["roundtrip", "oneway", "multi"] },
          },
        },
        accommodation: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", description: "hotel, apartment, hostel, etc." },
            stars: { type: "number" },
            pricePerNight: { type: "number", description: "Price ONLY if from API results" },
            currency: { type: "string" },
            neighborhood: { type: "string" },
          },
        },
        activities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number", description: "Day number (1, 2, 3...)" },
              title: { type: "string" },
              description: { type: "string" },
            },
            required: ["title"],
          },
          description: "Planned activities (if any were discussed)",
        },
        budget: {
          type: "object",
          properties: {
            estimated: { type: "number", description: "Total estimated budget ONLY if calculated from real data" },
            currency: { type: "string" },
            breakdown: { type: "string", description: "Brief breakdown of costs" },
          },
        },
        notes: {
          type: "string",
          description: "Any additional notes, preferences, or constraints mentioned",
        },
      },
      required: ["destination"],
    },
  },
};

export interface TripRecapData {
  destination: {
    city: string;
    country: string;
    countryCode?: string;
  };
  dates?: {
    departure?: string;
    return?: string;
    duration?: string;
  };
  travelers?: {
    adults?: number;
    children?: number;
    infants?: number;
    description?: string;
  };
  flight?: {
    fromCity?: string;
    fromIata?: string;
    toCity?: string;
    toIata?: string;
    airline?: string;
    price?: number;
    currency?: string;
    tripType?: string;
  };
  accommodation?: {
    name?: string;
    type?: string;
    stars?: number;
    pricePerNight?: number;
    currency?: string;
    neighborhood?: string;
  };
  activities?: Array<{
    day?: number;
    title: string;
    description?: string;
  }>;
  budget?: {
    estimated?: number;
    currency?: string;
    breakdown?: string;
  };
  notes?: string;
}
