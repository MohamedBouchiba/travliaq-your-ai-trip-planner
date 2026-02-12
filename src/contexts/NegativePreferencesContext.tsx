/**
 * NegativePreferencesContext - Tracks user dislikes and rejections
 * 
 * Stores negative preferences to ensure the AI never suggests
 * something the user has explicitly or implicitly rejected.
 */

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react";

// ===== Types =====

export type NegativePreferenceCategory =
  | "destination"
  | "airline"
  | "hotel"
  | "activity"
  | "timing"
  | "budget"
  | "style"
  | "food"
  | "transport"
  | "general";

export type NegativePreferenceSource = "explicit" | "implicit";

export interface NegativePreference {
  id: string;
  category: NegativePreferenceCategory;
  value: string;
  reason?: string;
  timestamp: number;
  source: NegativePreferenceSource;
}

interface NegativePreferencesContextValue {
  preferences: NegativePreference[];
  
  // Add a negative preference (explicit = user said it, implicit = inferred from behavior)
  addPreference: (
    category: NegativePreferenceCategory,
    value: string,
    source: NegativePreferenceSource,
    reason?: string
  ) => void;
  
  // Add multiple preferences at once (for batch rejections)
  addPreferences: (prefs: Omit<NegativePreference, "id" | "timestamp">[]) => void;
  
  // Check if something is in the negative list
  isDisliked: (category: NegativePreferenceCategory, value: string) => boolean;
  
  // Get all preferences for a category
  getByCategory: (category: NegativePreferenceCategory) => NegativePreference[];
  
  // Remove a preference (user changed their mind)
  removePreference: (id: string) => void;
  
  // Get all preferences for LLM context
  getContextForLLM: () => string;
  
  // Get a short summary of recent dislikes
  getRecentSummary: (count?: number) => string;
  
  // Clear all preferences (on session reset)
  clearAll: () => void;
}

// ===== Context =====

const NegativePreferencesContext = createContext<NegativePreferencesContextValue | null>(null);

// ===== Storage Key =====

import { STORAGE_KEYS } from "@/config/storageKeys";
const STORAGE_KEY = STORAGE_KEYS.NEGATIVE_PREFERENCES;

// ===== Provider =====

interface NegativePreferencesProviderProps {
  children: ReactNode;
}

export function NegativePreferencesProvider({ children }: NegativePreferencesProviderProps) {
  const [preferences, setPreferences] = useState<NegativePreference[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only keep preferences from last 30 days
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const recent = parsed.filter((p: NegativePreference) => p.timestamp > thirtyDaysAgo);
        setPreferences(recent);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage errors
    }
  }, [preferences]);

  const addPreference = useCallback((
    category: NegativePreferenceCategory,
    value: string,
    source: NegativePreferenceSource,
    reason?: string
  ) => {
    const normalizedValue = value.toLowerCase().trim();
    
    setPreferences((prev) => {
      // Check if already exists
      const exists = prev.some(
        (p) => p.category === category && p.value.toLowerCase() === normalizedValue
      );
      if (exists) return prev;

      const newPref: NegativePreference = {
        id: `neg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category,
        value: normalizedValue,
        reason,
        timestamp: Date.now(),
        source,
      };

      // Keep max 100 preferences
      return [...prev.slice(-99), newPref];
    });
  }, []);

  const addPreferences = useCallback((prefs: Omit<NegativePreference, "id" | "timestamp">[]) => {
    setPreferences((prev) => {
      const newPrefs = prefs
        .filter((p) => {
          const normalizedValue = p.value.toLowerCase().trim();
          return !prev.some(
            (existing) => existing.category === p.category && existing.value.toLowerCase() === normalizedValue
          );
        })
        .map((p) => ({
          ...p,
          id: `neg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          value: p.value.toLowerCase().trim(),
        }));

      return [...prev.slice(-(100 - newPrefs.length)), ...newPrefs];
    });
  }, []);

  const isDisliked = useCallback((category: NegativePreferenceCategory, value: string): boolean => {
    const normalizedValue = value.toLowerCase().trim();
    return preferences.some(
      (p) => p.category === category && p.value.toLowerCase() === normalizedValue
    );
  }, [preferences]);

  const getByCategory = useCallback((category: NegativePreferenceCategory): NegativePreference[] => {
    return preferences.filter((p) => p.category === category);
  }, [preferences]);

  const removePreference = useCallback((id: string) => {
    setPreferences((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getContextForLLM = useCallback((): string => {
    if (preferences.length === 0) return "";

    const categoryLabels: Record<NegativePreferenceCategory, string> = {
      destination: "Destinations à éviter",
      airline: "Compagnies aériennes à éviter",
      hotel: "Types d'hébergement à éviter",
      activity: "Activités à éviter",
      timing: "Horaires à éviter",
      budget: "Contraintes budget",
      style: "Styles à éviter",
      food: "Restrictions alimentaires",
      transport: "Transports à éviter",
      general: "Autres restrictions",
    };

    const grouped: Record<string, string[]> = {};
    
    for (const pref of preferences) {
      const label = categoryLabels[pref.category];
      if (!grouped[label]) grouped[label] = [];
      
      const entry = pref.reason ? `${pref.value} (${pref.reason})` : pref.value;
      grouped[label].push(entry);
    }

    const lines = Object.entries(grouped).map(
      ([category, values]) => `• ${category}: ${values.join(", ")}`
    );

    return `[PRÉFÉRENCES NÉGATIVES - NE PAS PROPOSER]\n${lines.join("\n")}`;
  }, [preferences]);

  const getRecentSummary = useCallback((count = 5): string => {
    const recent = preferences.slice(-count);
    if (recent.length === 0) return "";

    return recent.map((p) => `pas de ${p.value}`).join(", ");
  }, [preferences]);

  const clearAll = useCallback(() => {
    setPreferences([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const value: NegativePreferencesContextValue = {
    preferences,
    addPreference,
    addPreferences,
    isDisliked,
    getByCategory,
    removePreference,
    getContextForLLM,
    getRecentSummary,
    clearAll,
  };

  return (
    <NegativePreferencesContext.Provider value={value}>
      {children}
    </NegativePreferencesContext.Provider>
  );
}

// ===== Hook =====

export function useNegativePreferences(): NegativePreferencesContextValue {
  const context = useContext(NegativePreferencesContext);
  if (!context) {
    throw new Error("useNegativePreferences must be used within a NegativePreferencesProvider");
  }
  return context;
}

// ===== Helper: Extract negative preferences from user message =====

export interface ExtractedNegative {
  category: NegativePreferenceCategory;
  value: string;
  reason?: string;
}

/**
 * Extract negative preferences from a user message
 */
export function extractNegativeFromMessage(message: string): ExtractedNegative[] {
  const negatives: ExtractedNegative[] = [];
  const lowerMessage = message.toLowerCase();

  // Patterns for detecting negative preferences
  const patterns = [
    // "je n'aime pas X"
    { regex: /je n['']aime pas (?:les? )?(.+?)(?:\s*[,.]|$)/gi, category: "general" as const },
    // "pas de X"
    { regex: /pas de (?:les? )?(.+?)(?:\s*[,.]|$)/gi, category: "general" as const },
    // "éviter X"
    { regex: /[ée]viter? (?:les? )?(.+?)(?:\s*[,.]|$)/gi, category: "general" as const },
    // "sans X"
    { regex: /sans (?:les? )?(.+?)(?:\s*[,.]|$)/gi, category: "general" as const },
    // "je déteste X"
    { regex: /je d[ée]teste (?:les? )?(.+?)(?:\s*[,.]|$)/gi, category: "general" as const },
    // "pas intéressé par X"
    { regex: /pas int[ée]ress[ée]e? par (?:les? )?(.+?)(?:\s*[,.]|$)/gi, category: "general" as const },
  ];

  for (const { regex } of patterns) {
    let match;
    while ((match = regex.exec(lowerMessage)) !== null) {
      const value = match[1]?.trim();
      if (value && value.length > 1 && value.length < 50) {
        // Detect specific categories from value
        let detectedCategory: NegativePreferenceCategory = "general";
        
        if (/escale|correspondance|vol|avion/i.test(value)) {
          detectedCategory = "transport";
        } else if (/h[oô]tel|auberge|hostel|airbnb/i.test(value)) {
          detectedCategory = "hotel";
        } else if (/ryanair|easyjet|air france|compagnie/i.test(value)) {
          detectedCategory = "airline";
        } else if (/matin|soir|nuit|t[oô]t|tard/i.test(value)) {
          detectedCategory = "timing";
        } else if (/cher|budget|prix|co[uû]t/i.test(value)) {
          detectedCategory = "budget";
        } else if (/viande|poisson|gluten|lactose|v[ée]g[ée]tarien/i.test(value)) {
          detectedCategory = "food";
        } else if (/mus[ée]e|temple|plage|randonn[ée]e|sport/i.test(value)) {
          detectedCategory = "activity";
        }

        negatives.push({
          category: detectedCategory,
          value,
        });
      }
    }
  }

  return negatives;
}
