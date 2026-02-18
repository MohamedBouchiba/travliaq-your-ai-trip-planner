/**
 * Chat Types - Centralized type definitions for the chat system
 */

import type { Airport } from "@/hooks/useNearestAirports";
import { destinationIndex } from "@/services/destinationIndex";
import { cityCoordinates } from "../map/constants";
import type {
  AirportChoice,
  DualAirportChoice,
  WidgetType,
  CitySelectionData,
  AirportConfirmationData,
} from "@/types/flight";
import type { StreamErrorType } from "./hooks/chatStreamTypes";
import type { DestinationSuggestion, ProfileCompleteness } from "@/types/destinations";

// Re-export for convenience
export type { AirportChoice, DualAirportChoice, WidgetType, CitySelectionData, AirportConfirmationData };

/**
 * Quick Reply Action Types
 */
export type QuickReplyAction =
  | { type: "sendMessage"; message: string }
  | { type: "fillInput"; message: string }
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
 * E2: Trip recap structured data from the backend
 */
export interface TripRecapData {
  destination: { city: string; country: string; countryCode?: string };
  dates?: { departure?: string; return?: string; duration?: string };
  travelers?: { adults?: number; children?: number; infants?: number; description?: string };
  flight?: { fromCity?: string; fromIata?: string; toCity?: string; toIata?: string; airline?: string; price?: number; currency?: string; tripType?: string };
  accommodation?: { name?: string; type?: string; stars?: number; pricePerNight?: number; currency?: string; neighborhood?: string };
  activities?: Array<{ day?: number; title: string; description?: string }>;
  budget?: { estimated?: number; currency?: string; breakdown?: string };
  notes?: string;
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
  // Destination suggestions widget data
  suggestions?: DestinationSuggestion[];
  basedOnProfile?: ProfileCompleteness;
  
  // Budget range slider
  presets?: unknown[];
  label?: string;
  currency?: string;
  showSlider?: boolean;
  perPerson?: boolean;
  initialValue?: boolean;
  
  // Quick filter chips
  chips?: unknown[];
  multiSelect?: boolean;
  
  // Star rating selector
  initialMin?: number;
  initialMax?: number;
  
  // Cabin class / Duration / Time of day
  selected?: unknown;
  compact?: boolean;
  options?: unknown[];
  
  // Comparison widget - use unknown[] to allow flexible item structures
  items?: unknown[];
  metrics?: unknown[];
  allowRemove?: boolean;
  expandable?: boolean;
  highlightBest?: boolean;
  showWinner?: boolean;
  
  // Conflict alert - use unknown[] to allow flexible conflict structures
  conflicts?: unknown[];
  showResolved?: boolean;
  
  // Price alert
  alert?: unknown;
  onAction?: () => void;

  // Quick filter chips
  filterGroups?: unknown[];

  // Trip recap (E2)
  tripRecap?: TripRecapData;
}

/**
 * Chat Message - Core message type with support for widgets, quick replies, and rich content
 */
export interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  timestamp?: number; // Date.now() when message was created

  // Loading/streaming states
  isTyping?: boolean;
  isStreaming?: boolean;
  isHidden?: boolean;

  // C2: Error state for user-visible error messages with retry
  errorType?: StreamErrorType;

  // Legacy widget support (existing functionality)
  airportChoices?: AirportChoice;
  dualAirportChoices?: DualAirportChoice;
  hasSearchButton?: boolean;
  widget?: WidgetType;
  widgetData?: WidgetData;

  // Widget confirmed state (widget stays visible in read-only mode)
  widgetConfirmed?: boolean;
  widgetSelectedValue?: unknown;
  widgetDisplayLabel?: string;

  // Widget dismissed (user typed instead of using widget)
  widgetDismissed?: boolean;

  // Auto-generated user message (from widget selection)
  isAutoGenerated?: boolean;

  // New: Quick Replies (Phase 2)
  quickReplies?: QuickReply[];

  // New: Rich Content (Phase 3)
  richContent?: RichContent[];

  // Internal: used to trigger a flash/scroll-to animation when the same message is re-triggered
  _flashKey?: number;
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
 * Get city coordinates from name.
 * Primary source: DB-backed destinationIndex.
 * Fallback: static cityCoordinates from map/constants.ts (will be replaced by geocoding API).
 */
export function getCityCoords(cityName: string): [number, number] | null {
  // Primary: DB-backed index
  const fromIndex = destinationIndex.getCoords(cityName);
  if (fromIndex) return fromIndex;

  // FALLBACK: static coordinates from map/constants.ts — will be replaced by destinationIndex geocoding API
  const normalized = cityName.toLowerCase().trim();
  const coords = cityCoordinates[normalized];
  if (coords) return [coords.lng, coords.lat];
  return null;
}

/**
 * Lexical parsing lookup: maps month/season names (FR/EN) to month indices.
 * This is NOT display text — it's used to parse user input like "mars" or "july" into Date objects.
 * date-fns/locale does not provide a reverse parser (name → index), so this mapping is required.
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
