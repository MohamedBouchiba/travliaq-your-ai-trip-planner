/**
 * Preference Types, Defaults, and Selectors
 * Consolidated from src/contexts/preferences/
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface StyleAxes {
  chillVsIntense: number;      // 0-100 (0=Chill, 100=Intense)
  cityVsNature: number;        // 0-100 (0=Ville, 100=Nature)
  ecoVsLuxury: number;         // 0-100 (miroir de comfortLevel)
  touristVsLocal: number;      // 0-100 (0=Touristique, 100=Authentique)
}

export interface MustHaves {
  accessibilityRequired: boolean;
  petFriendly: boolean;
  familyFriendly: boolean;
  highSpeedWifi: boolean;
}

export interface WorkPreferences {
  needsWifi: boolean;
  workationMode: boolean;
}

export interface TripContext {
  occasion?: "honeymoon" | "anniversary" | "birthday" | "vacation" | "workation" | "other";
  flexibility: "fixed" | "flexible" | "very_flexible";
}

export type TravelStyle = "solo" | "couple" | "family" | "friends" | "pet";

export interface TripPreferences {
  id: string;

  // === BASE ===
  travelStyle: TravelStyle;

  // === STYLE AXES (Égaliseur) ===
  styleAxes: StyleAxes;
  styleAxesOrder: (keyof StyleAxes)[];

  // === INTERESTS ===
  interests: string[]; // Max 5: ["culture", "food", "nature", "beach", "wellness", "sport", "adventure", "nightlife", "shopping", "workation"]

  // === MUST-HAVES ===
  mustHaves: MustHaves;

  // === WORK PREFERENCES ===
  workPreferences: WorkPreferences;

  // === TRIP CONTEXT ===
  tripContext: TripContext;

  // === LEGACY (backward compatible) ===
  pace: "relaxed" | "moderate" | "intense";
  comfortLevel: number; // 0-100 - mirror of styleAxes.ecoVsLuxury
  dietaryRestrictions: string[];
  accessibilityNeeds: string[];

  // === USER CONFIRMATION FLAGS ===
  styleAxesUserConfirmed: boolean; // true when user explicitly confirmed style widget or chose a preset

  // === METADATA ===
  confidenceScore: number; // 0-100 - profile completion
  lastUpdated: Date;
  detectedFromChat: boolean;
  manualOverrides: string[]; // Fields manually overridden by user
}

export interface PreferenceMemory {
  preferences: TripPreferences;
}

// ============================================================================
// COMPUTED FILTERS FOR OTHER WIDGETS
// ============================================================================

export interface HotelFiltersFromPreferences {
  priceMin: number;
  priceMax: number;
  minStars: number;
  amenities: string[];
  types: string[];
}

export interface ActivityFiltersFromPreferences {
  categories: string[];
  priceRange: [number, number];
  ratingMin: number;
  timeOfDay: string[];
}

export interface FlightPreferencesComputed {
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  flexibility: "exact" | "flexible" | "very_flexible";
}

// ============================================================================
// COMFORT LABELS
// ============================================================================

export type ComfortLabel = "Économique" | "Confort" | "Premium" | "Luxe";

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_STYLE_AXES: StyleAxes = {
  chillVsIntense: 50,
  cityVsNature: 50,
  ecoVsLuxury: 50,
  touristVsLocal: 50,
};

export const DEFAULT_STYLE_AXES_ORDER: (keyof StyleAxes)[] = [
  "chillVsIntense",
  "cityVsNature",
  "ecoVsLuxury",
  "touristVsLocal",
];

export const DEFAULT_MUST_HAVES: MustHaves = {
  accessibilityRequired: false,
  petFriendly: false,
  familyFriendly: false,
  highSpeedWifi: false,
};

export const DEFAULT_WORK_PREFERENCES: WorkPreferences = {
  needsWifi: false,
  workationMode: false,
};

export const DEFAULT_TRIP_CONTEXT: TripContext = {
  occasion: undefined,
  flexibility: "flexible",
};

export const DEFAULT_PREFERENCES: TripPreferences = {
  id: crypto.randomUUID(),
  travelStyle: "solo",
  styleAxes: DEFAULT_STYLE_AXES,
  styleAxesOrder: DEFAULT_STYLE_AXES_ORDER,
  interests: [],
  mustHaves: DEFAULT_MUST_HAVES,
  workPreferences: DEFAULT_WORK_PREFERENCES,
  tripContext: DEFAULT_TRIP_CONTEXT,
  // Legacy
  pace: "moderate",
  comfortLevel: 50,
  dietaryRestrictions: [],
  accessibilityNeeds: [],
  // User confirmation flags
  styleAxesUserConfirmed: false,
  // Metadata
  confidenceScore: 0,
  lastUpdated: new Date(),
  detectedFromChat: false,
  manualOverrides: [],
};

export const DEFAULT_MEMORY: PreferenceMemory = {
  preferences: DEFAULT_PREFERENCES,
};

/**
 * Create fresh default preferences with new ID
 */
export function createDefaultPreferences(): TripPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    id: crypto.randomUUID(),
    lastUpdated: new Date(),
  };
}

/**
 * Create fresh default memory with new preferences
 */
export function createDefaultMemory(): PreferenceMemory {
  return {
    preferences: createDefaultPreferences(),
  };
}

// ============================================================================
// SELECTORS
// ============================================================================

export function selectComfortLabel(prefs: TripPreferences): ComfortLabel {
  const level = prefs.styleAxes.ecoVsLuxury;
  if (level < 25) return "Économique";
  if (level < 50) return "Confort";
  if (level < 75) return "Premium";
  return "Luxe";
}

export function selectProfileCompletion(prefs: TripPreferences): number {
  let score = 0;
  const weights = { travelStyle: 15, interests: 25, styleAxes: 30, mustHaves: 15, occasion: 15 };

  // Travel style selected (not default)
  if (prefs.travelStyle !== "solo") score += weights.travelStyle;
  else score += weights.travelStyle * 0.5; // Default still counts partially

  // Interests (at least 2)
  score += Math.min(1, prefs.interests.length / 2) * weights.interests;

  // Style axes modified (any deviation from 50)
  const axesModified = Object.values(prefs.styleAxes).filter(v => Math.abs(v - 50) > 10).length;
  score += (axesModified / 4) * weights.styleAxes;

  // Must-haves (any set)
  const mustHavesSet = Object.values(prefs.mustHaves).filter(Boolean).length;
  score += (mustHavesSet > 0 ? 1 : 0) * weights.mustHaves;

  // Occasion set
  if (prefs.tripContext.occasion) score += weights.occasion;

  return Math.round(score);
}

export function selectPreferenceSummary(prefs: TripPreferences): string {
  const comfortLabel = selectComfortLabel(prefs).toLowerCase();

  const styleLabels = {
    solo: "solo",
    couple: "en couple",
    family: "en famille",
    friends: "entre amis",
    pet: "avec animal",
  };

  let summary = `Voyage ${styleLabels[prefs.travelStyle]}`;
  summary += `, niveau ${comfortLabel}.`;

  if (prefs.interests.length > 0) {
    summary += ` Intérêts: ${prefs.interests.slice(0, 3).join(", ")}.`;
  }

  if (prefs.tripContext.occasion) {
    const occasionLabels: Record<string, string> = {
      honeymoon: "lune de miel",
      anniversary: "anniversaire",
      birthday: "anniversaire",
      vacation: "vacances",
      workation: "workation",
    };
    summary += ` Occasion: ${occasionLabels[prefs.tripContext.occasion] || prefs.tripContext.occasion}.`;
  }

  return summary;
}

export function selectHotelFilters(prefs: TripPreferences): HotelFiltersFromPreferences {
  const comfort = prefs.styleAxes.ecoVsLuxury;

  // Price ranges based on comfort
  let priceMin = 0, priceMax = 500, minStars = 2;
  if (comfort < 25) {
    priceMax = 80; minStars = 2;
  } else if (comfort < 50) {
    priceMax = 150; minStars = 3;
  } else if (comfort < 75) {
    priceMin = 50; priceMax = 300; minStars = 4;
  } else {
    priceMin = 100; priceMax = 500; minStars = 4;
  }

  // Amenities based on must-haves
  const amenities: string[] = [];
  if (prefs.mustHaves.highSpeedWifi || prefs.workPreferences.needsWifi) amenities.push("wifi");
  if (prefs.mustHaves.accessibilityRequired) amenities.push("wheelchair");
  if (prefs.mustHaves.petFriendly) amenities.push("pet-friendly");
  if (prefs.mustHaves.familyFriendly) amenities.push("family-rooms");

  // Types based on travel style
  let types: string[] = ["hotel"];
  if (prefs.travelStyle === "family") types = ["hotel", "apartment"];
  else if (prefs.travelStyle === "couple" && comfort > 70) types = ["hotel", "villa"];
  else if (prefs.travelStyle === "friends") types = ["apartment", "hotel"];

  return { priceMin, priceMax, minStars, amenities, types };
}

export function selectActivityFilters(prefs: TripPreferences): ActivityFiltersFromPreferences {
  const comfort = prefs.styleAxes.ecoVsLuxury;

  // Price range based on comfort
  let priceRange: [number, number] = [0, 500];
  if (comfort < 25) priceRange = [0, 30];
  else if (comfort < 50) priceRange = [0, 80];
  else if (comfort < 75) priceRange = [0, 150];

  // Rating based on comfort
  let ratingMin = 3.5;
  if (comfort >= 75) ratingMin = 4.5;
  else if (comfort >= 50) ratingMin = 4.0;

  // Categories from interests
  const categories = [...prefs.interests];

  // Time of day from chillVsIntense
  const timeOfDay: string[] = [];
  if (prefs.styleAxes.chillVsIntense < 40) {
    timeOfDay.push("morning", "afternoon"); // Relaxed = daytime
  } else if (prefs.styleAxes.chillVsIntense > 60) {
    timeOfDay.push("afternoon", "evening", "night"); // Intense = all day + night
  }

  return { categories, priceRange, ratingMin, timeOfDay };
}

export function selectFlightPreferences(prefs: TripPreferences): FlightPreferencesComputed {
  const comfort = prefs.styleAxes.ecoVsLuxury;

  let cabinClass: FlightPreferencesComputed["cabinClass"] = "economy";
  if (comfort >= 85) cabinClass = "business";
  else if (comfort >= 70) cabinClass = "premium_economy";

  const flexibility = prefs.tripContext.flexibility === "very_flexible"
    ? "very_flexible"
    : prefs.tripContext.flexibility === "flexible"
      ? "flexible"
      : "exact";

  return { cabinClass, flexibility };
}

export function selectSerializedState(prefs: TripPreferences): Record<string, unknown> {
  return {
    ...prefs,
    comfortLabel: selectComfortLabel(prefs),
    profileCompletion: selectProfileCompletion(prefs),
  };
}
