/**
 * Preference Memory Context
 * Manages trip preferences state with localStorage persistence
 * Pattern: Similar to FlightMemory and AccommodationMemory for consistency
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TripPreferences {
  id: string;

  // Rythme de voyage
  pace: "relaxed" | "moderate" | "intense";

  // Centres d'intérêt
  interests: string[]; // ["culture", "food", "nature", "beach", "wellness", "sport"]

  // Style de voyage
  travelStyle: "solo" | "couple" | "family" | "friends";

  // Confort & Budget
  comfortLevel: number; // 0-100 (0=économique, 100=premium)

  // Préférences alimentaires
  dietaryRestrictions: string[]; // ["vegetarian", "vegan", "halal", "kosher", "gluten-free"]

  // Accessibilité
  accessibilityNeeds: string[]; // ["wheelchair", "elevator", "visual-impairment", "hearing-impairment"]

  // Métadonnées
  lastUpdated: Date;
  detectedFromChat: boolean; // True si inféré par AI
}

export interface PreferenceMemory {
  preferences: TripPreferences;
}

interface PreferenceMemoryContextValue {
  memory: PreferenceMemory;

  // Preferences updates
  updatePreferences: (updates: Partial<TripPreferences>) => void;
  setPace: (pace: TripPreferences["pace"]) => void;
  toggleInterest: (interest: string) => void;
  setTravelStyle: (style: TripPreferences["travelStyle"]) => void;
  setComfortLevel: (level: number) => void;
  toggleDietaryRestriction: (restriction: string) => void;
  toggleAccessibilityNeed: (need: string) => void;

  // Getters
  getPreferences: () => TripPreferences;
  getPreferenceSummary: () => string; // Pour AI context
  getComfortLabel: () => "Économique" | "Confort" | "Premium" | "Luxe";

  // Reset
  resetToDefaults: () => void;

  // Serialization
  getSerializedState: () => Record<string, unknown>;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = "travliaq_preference_memory";

const defaultPreferences: TripPreferences = {
  id: crypto.randomUUID(),
  pace: "moderate",
  interests: ["culture", "food"],
  travelStyle: "couple",
  comfortLevel: 50, // Confort
  dietaryRestrictions: [],
  accessibilityNeeds: [],
  lastUpdated: new Date(),
  detectedFromChat: false,
};

const defaultMemory: PreferenceMemory = {
  preferences: defaultPreferences,
};

function serializeMemory(memory: PreferenceMemory): string {
  return JSON.stringify({
    preferences: {
      ...memory.preferences,
      lastUpdated: memory.preferences.lastUpdated.toISOString(),
    },
  });
}

function deserializeMemory(json: string): PreferenceMemory | null {
  try {
    const parsed = JSON.parse(json);
    return {
      preferences: {
        ...parsed.preferences,
        lastUpdated: new Date(parsed.preferences.lastUpdated),
      },
    };
  } catch (error) {
    console.warn("[PreferenceMemory] Failed to deserialize:", error);
    return null;
  }
}

function loadFromStorage(): PreferenceMemory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const deserialized = deserializeMemory(stored);
      if (deserialized) {
        return deserialized;
      }
    }
  } catch (error) {
    console.warn("[PreferenceMemory] Failed to load from storage:", error);
  }
  return defaultMemory;
}

// ============================================================================
// CONTEXT
// ============================================================================

const PreferenceMemoryContext = createContext<PreferenceMemoryContextValue | undefined>(undefined);

export function PreferenceMemoryProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<PreferenceMemory>(() => loadFromStorage());
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever memory changes
  useEffect(() => {
    if (!isHydrated) return;

    try {
      const serialized = serializeMemory(memory);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn("[PreferenceMemory] Failed to save:", error);
    }
  }, [memory, isHydrated]);

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  const updatePreferences = useCallback((updates: Partial<TripPreferences>) => {
    setMemory(prev => ({
      preferences: {
        ...prev.preferences,
        ...updates,
        lastUpdated: new Date(),
      },
    }));
  }, []);

  const setPace = useCallback((pace: TripPreferences["pace"]) => {
    setMemory(prev => ({
      preferences: {
        ...prev.preferences,
        pace,
        lastUpdated: new Date(),
        detectedFromChat: false, // User manual change
      },
    }));
  }, []);

  const toggleInterest = useCallback((interest: string) => {
    setMemory(prev => {
      const interests = prev.preferences.interests.includes(interest)
        ? prev.preferences.interests.filter(i => i !== interest)
        : [...prev.preferences.interests, interest];
      return {
        preferences: {
          ...prev.preferences,
          interests,
          lastUpdated: new Date(),
          detectedFromChat: false, // User manual change
        },
      };
    });
  }, []);

  const setTravelStyle = useCallback((travelStyle: TripPreferences["travelStyle"]) => {
    setMemory(prev => ({
      preferences: {
        ...prev.preferences,
        travelStyle,
        lastUpdated: new Date(),
        detectedFromChat: false, // User manual change
      },
    }));
  }, []);

  const setComfortLevel = useCallback((comfortLevel: number) => {
    setMemory(prev => ({
      preferences: {
        ...prev.preferences,
        comfortLevel: Math.max(0, Math.min(100, comfortLevel)), // Clamp 0-100
        lastUpdated: new Date(),
        detectedFromChat: false, // User manual change
      },
    }));
  }, []);

  const toggleDietaryRestriction = useCallback((restriction: string) => {
    setMemory(prev => {
      const dietaryRestrictions = prev.preferences.dietaryRestrictions.includes(restriction)
        ? prev.preferences.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.preferences.dietaryRestrictions, restriction];
      return {
        preferences: {
          ...prev.preferences,
          dietaryRestrictions,
          lastUpdated: new Date(),
          detectedFromChat: false, // User manual change
        },
      };
    });
  }, []);

  const toggleAccessibilityNeed = useCallback((need: string) => {
    setMemory(prev => {
      const accessibilityNeeds = prev.preferences.accessibilityNeeds.includes(need)
        ? prev.preferences.accessibilityNeeds.filter(n => n !== need)
        : [...prev.preferences.accessibilityNeeds, need];
      return {
        preferences: {
          ...prev.preferences,
          accessibilityNeeds,
          lastUpdated: new Date(),
          detectedFromChat: false, // User manual change
        },
      };
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setMemory({ preferences: { ...defaultPreferences, id: crypto.randomUUID() } });
  }, []);

  // ============================================================================
  // GETTERS
  // ============================================================================

  const getPreferences = useCallback((): TripPreferences => {
    return memory.preferences;
  }, [memory.preferences]);

  const getComfortLabel = useCallback((): "Économique" | "Confort" | "Premium" | "Luxe" => {
    const level = memory.preferences.comfortLevel;
    if (level < 25) return "Économique";
    if (level < 50) return "Confort";
    if (level < 75) return "Premium";
    return "Luxe";
  }, [memory.preferences.comfortLevel]);

  const getPreferenceSummary = useCallback((): string => {
    const { pace, interests, travelStyle, comfortLevel, dietaryRestrictions } = memory.preferences;

    const comfortLabel = comfortLevel < 25 ? "économique" :
                         comfortLevel < 50 ? "confort" :
                         comfortLevel < 75 ? "premium" : "luxe";

    let summary = `Voyage ${pace === "relaxed" ? "détendu" : pace === "moderate" ? "modéré" : "intensif"} en ${travelStyle}`;

    if (travelStyle === "solo") summary = summary.replace(" en solo", " solo");

    summary += `, niveau ${comfortLabel}.`;

    if (interests.length > 0) {
      summary += ` Centres d'intérêt: ${interests.join(", ")}.`;
    }

    if (dietaryRestrictions.length > 0) {
      summary += ` Restrictions alimentaires: ${dietaryRestrictions.join(", ")}.`;
    }

    return summary;
  }, [memory.preferences]);

  const getSerializedState = useCallback((): Record<string, unknown> => {
    return {
      pace: memory.preferences.pace,
      interests: memory.preferences.interests,
      travelStyle: memory.preferences.travelStyle,
      comfortLevel: memory.preferences.comfortLevel,
      comfortLabel: getComfortLabel(),
      dietaryRestrictions: memory.preferences.dietaryRestrictions,
      accessibilityNeeds: memory.preferences.accessibilityNeeds,
      detectedFromChat: memory.preferences.detectedFromChat,
    };
  }, [memory.preferences, getComfortLabel]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<PreferenceMemoryContextValue>(() => ({
    memory,
    updatePreferences,
    setPace,
    toggleInterest,
    setTravelStyle,
    setComfortLevel,
    toggleDietaryRestriction,
    toggleAccessibilityNeed,
    getPreferences,
    getPreferenceSummary,
    getComfortLabel,
    resetToDefaults,
    getSerializedState,
  }), [
    memory,
    updatePreferences,
    setPace,
    toggleInterest,
    setTravelStyle,
    setComfortLevel,
    toggleDietaryRestriction,
    toggleAccessibilityNeed,
    getPreferences,
    getPreferenceSummary,
    getComfortLabel,
    resetToDefaults,
    getSerializedState,
  ]);

  return (
    <PreferenceMemoryContext.Provider value={value}>
      {children}
    </PreferenceMemoryContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function usePreferenceMemory(): PreferenceMemoryContextValue {
  const context = useContext(PreferenceMemoryContext);
  if (!context) {
    throw new Error("usePreferenceMemory must be used within PreferenceMemoryProvider");
  }
  return context;
}
