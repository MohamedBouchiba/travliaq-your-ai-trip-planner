/**
 * Destination Suggestions Types
 * Based on the API specification for /api/v1/destinations/suggest
 */

// ===== Enums & Basic Types =====

export type TravelStyle = "solo" | "couple" | "family" | "friends" | "pet";

export type Occasion = 
  | "honeymoon" 
  | "anniversary" 
  | "birthday" 
  | "vacation" 
  | "workation" 
  | "other";

export type BudgetLevel = "budget" | "comfort" | "premium" | "luxury";

export type Interest = 
  | "culture" 
  | "food" 
  | "beach" 
  | "adventure" 
  | "nature" 
  | "nightlife" 
  | "history" 
  | "art" 
  | "shopping" 
  | "wellness" 
  | "sports";

// ===== Preference Structures =====

export interface StyleAxes {
  chillVsIntense: number;    // 0-100
  cityVsNature: number;      // 0-100
  ecoVsLuxury: number;       // 0-100
  touristVsLocal: number;    // 0-100
}

export interface MustHaves {
  accessibilityRequired?: boolean;
  petFriendly?: boolean;
  familyFriendly?: boolean;
  highSpeedWifi?: boolean;
}

export interface UserLocation {
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

// ===== Request Payload =====

export interface DestinationSuggestRequest {
  userLocation?: UserLocation;
  styleAxes?: Partial<StyleAxes>;
  styleAxesOrder?: (keyof StyleAxes)[];
  interests?: Interest[];
  mustHaves?: MustHaves;
  dietaryRestrictions?: string[];
  travelStyle?: TravelStyle;
  occasion?: Occasion;
  flexibility?: "fixed" | "flexible" | "very_flexible";
  budgetLevel?: BudgetLevel;
  travelMonth?: number;  // 1-12
  tripDuration?: string; // e.g. "weekend", "week", "2_weeks"
}

// ===== Response Types =====

export interface TopActivity {
  name: string;
  emoji: string;
  category: string;
}

export interface BudgetEstimate {
  min: number;
  max: number;
  currency: "EUR";
  duration: "per_day" | "7_days";
}

export interface DestinationSuggestion {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  headline: string;
  description: string;
  matchScore: number;
  keyFactors: string[];
  estimatedBudgetPerPerson: BudgetEstimate;
  topActivities: TopActivity[];
  bestSeasons: string[];
  flightDurationFromOrigin?: string | null;
  flightDurationMinutes?: number | null;
  flightPriceEstimate?: number | null;
  sourceAirportIata?: string | null;
  // New API fields
  imageUrl?: string;
  imageCredit?: string;
  flightPriceSource?: "api" | "cache" | "estimated";
}

export interface ProfileCompleteness {
  completionScore: number;
  keyFactors: string[];
}

export interface DestinationSuggestResponse {
  success: boolean;
  suggestions: DestinationSuggestion[];
  generatedAt: string;
  basedOnProfile: ProfileCompleteness;
}

// ===== Error Types =====

export interface SuggestionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SuggestionErrorResponse {
  success: false;
  error: SuggestionError;
}
