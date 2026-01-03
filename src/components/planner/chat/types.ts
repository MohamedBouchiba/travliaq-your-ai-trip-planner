/**
 * Chat Types - Centralized type definitions for the chat system
 */

import type { Airport } from "@/hooks/useNearestAirports";
import type {
  AirportChoice,
  DualAirportChoice,
  WidgetType,
  CitySelectionData,
  AirportConfirmationData,
} from "@/types/flight";

// Re-export for convenience
export type { AirportChoice, DualAirportChoice, WidgetType, CitySelectionData, AirportConfirmationData };

/**
 * Quick Reply Action Types
 */
export type QuickReplyAction =
  | { type: "sendMessage"; message: string }
  | { type: "triggerWidget"; widget: WidgetType }
  | { type: "emitEvent"; event: string; payload: unknown }
  | { type: "navigate"; tab: "flights" | "activities" | "stays" | "preferences" };

/**
 * Quick Reply - Clickable chip after assistant messages
 */
export interface QuickReply {
  id: string;
  label: string;
  icon?: string; // Emoji or Lucide icon name
  action: QuickReplyAction;
  variant?: "default" | "primary" | "outline";
}

/**
 * Rich Content Types for visual messages
 */
export type RichContentType =
  | "destinationCard"
  | "hotelCarousel"
  | "activityCarousel"
  | "flightPreview"
  | "image";

export interface DestinationCardData {
  city: string;
  country: string;
  countryCode: string;
  imageUrl?: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
}

export interface FlightPreviewData {
  fromIata: string;
  toIata: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  currency: string;
  airline?: string;
}

export interface ActivityCardData {
  id: string;
  title: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  duration?: string;
}

export interface HotelCardData {
  id: string;
  name: string;
  imageUrl?: string;
  pricePerNight?: number;
  currency?: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
}

export interface RichContent {
  type: RichContentType;
  data: DestinationCardData | FlightPreviewData | ActivityCardData[] | HotelCardData[] | { url: string; alt?: string };
}

/**
 * Widget Data passed to inline widgets
 */
export interface WidgetData {
  preferredMonth?: string; // e.g. "février", "march", "summer"
  tripDuration?: string;
  citySelection?: CitySelectionData;
  isDeparture?: boolean; // true if selecting departure city
  airportConfirmation?: AirportConfirmationData; // Multi-destination airport confirmation
}

/**
 * Chat Message - Core message type with support for widgets, quick replies, and rich content
 */
export interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;

  // Loading/streaming states
  isTyping?: boolean;
  isStreaming?: boolean;
  isHidden?: boolean;

  // Legacy widget support (existing functionality)
  airportChoices?: AirportChoice;
  dualAirportChoices?: DualAirportChoice;
  hasSearchButton?: boolean;
  widget?: WidgetType;
  widgetData?: WidgetData;

  // New: Quick Replies (Phase 2)
  quickReplies?: QuickReply[];

  // New: Rich Content (Phase 3)
  richContent?: RichContent[];
}

/**
 * Stored Message - Simplified version for persistence
 */
export interface StoredMessage {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  hasSearchButton?: boolean;
  isHidden?: boolean;
}

/**
 * Chat Session metadata
 */
export interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

/**
 * Props for the main chat container
 */
export interface ChatContainerProps {
  className?: string;
}

/**
 * Ref methods exposed by the chat component
 */
export interface ChatRef {
  injectSystemMessage: (event: unknown) => void;
  askAirportChoice: (choice: AirportChoice) => void;
  askDualAirportChoice: (choices: DualAirportChoice) => void;
  offerFlightSearch: (from: string, to: string) => void;
  handleAccommodationUpdate: (city: string, updates: unknown) => boolean;
  askAirportConfirmation: (data: AirportConfirmationData) => void;
  handleActivityUpdate: (city: string, updates: unknown) => boolean;
  handleAddActivityForCity: (city: string, activity: unknown) => string | null;
  handlePreferencesDetection: (detectedPrefs: unknown) => void;
}

/**
 * City coordinates for map actions
 */
export const CITY_COORDINATES: Record<string, [number, number]> = {
  "paris": [2.3522, 48.8566],
  "new york": [-74.0060, 40.7128],
  "nyc": [-74.0060, 40.7128],
  "barcelone": [2.1734, 41.3851],
  "barcelona": [2.1734, 41.3851],
  "rome": [12.4964, 41.9028],
  "tokyo": [139.6503, 35.6762],
  "londres": [-0.1278, 51.5074],
  "london": [-0.1278, 51.5074],
  "berlin": [13.4050, 52.5200],
  "amsterdam": [4.9041, 52.3676],
  "lisbonne": [-9.1393, 38.7223],
  "lisbon": [-9.1393, 38.7223],
  "bruxelles": [4.3517, 50.8503],
  "brussels": [4.3517, 50.8503],
  "madrid": [-3.7038, 40.4168],
  "vienne": [16.3738, 48.2082],
  "vienna": [16.3738, 48.2082],
  "prague": [14.4378, 50.0755],
  "budapest": [19.0402, 47.4979],
  "dubai": [55.2708, 25.2048],
  "singapour": [103.8198, 1.3521],
  "singapore": [103.8198, 1.3521],
  "sydney": [151.2093, -33.8688],
  "bangkok": [100.5018, 13.7563],
  "marrakech": [-7.9811, 31.6295],
  "le caire": [31.2357, 30.0444],
  "cairo": [31.2357, 30.0444],
};

/**
 * Get city coordinates from name
 */
export function getCityCoords(cityName: string): [number, number] | null {
  const normalized = cityName.toLowerCase().trim();
  return CITY_COORDINATES[normalized] || null;
}

/**
 * Month name to index mapping (French/English)
 */
export const MONTH_MAP: Record<string, number> = {
  "janvier": 0, "january": 0, "jan": 0,
  "février": 1, "fevrier": 1, "february": 1, "feb": 1,
  "mars": 2, "march": 2, "mar": 2,
  "avril": 3, "april": 3, "apr": 3,
  "mai": 4, "may": 4,
  "juin": 5, "june": 5, "jun": 5,
  "juillet": 6, "july": 6, "jul": 6,
  "août": 7, "aout": 7, "august": 7, "aug": 7,
  "septembre": 8, "september": 8, "sep": 8, "sept": 8,
  "octobre": 9, "october": 9, "oct": 9,
  "novembre": 10, "november": 10, "nov": 10,
  "décembre": 11, "decembre": 11, "december": 11, "dec": 11,
  // Seasons
  "printemps": 3, "spring": 3,
  "été": 6, "ete": 6, "summer": 6,
  "automne": 9, "autumn": 9, "fall": 9,
  "hiver": 0, "winter": 0,
};

/**
 * Parse month string to Date
 */
export function parsePreferredMonth(monthStr?: string): Date | null {
  if (!monthStr) return null;

  const normalized = monthStr.toLowerCase().trim();
  const monthIndex = MONTH_MAP[normalized];

  if (monthIndex !== undefined) {
    const now = new Date();
    let year = now.getFullYear();
    // If the month is in the past this year, use next year
    if (monthIndex < now.getMonth() || (monthIndex === now.getMonth() && now.getDate() > 15)) {
      year++;
    }
    return new Date(year, monthIndex, 1);
  }

  return null;
}
