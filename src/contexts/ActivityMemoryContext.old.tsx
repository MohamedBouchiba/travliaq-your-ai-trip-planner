/**
 * Activity Memory Context
 * Manages activities planning state with localStorage persistence
 * Pattern: Similar to FlightMemory and AccommodationMemory for consistency
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { usePreferenceMemory } from "./PreferenceMemoryContext";
import { eventBus } from "@/lib/eventBus";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ActivityEntry {
  id: string;

  // Liaison avec destination
  destinationId: string; // ID de l'hébergement lié
  city: string;
  country: string;

  // Données de l'activité
  title: string;
  category: "culture" | "outdoor" | "food" | "wellness" | "shopping" | "nightlife";
  duration: "short" | "medium" | "long"; // < 2h, 2-4h, > 4h

  // Timing
  date: Date | null; // Date prévue pour l'activité
  timeSlot: "morning" | "afternoon" | "evening" | "flexible" | null;

  // Budget
  priceMin: number;
  priceMax: number;

  // Métadonnées
  rating: number | null; // 0-5
  isBooked: boolean;
  notes: string;

  // Sync flags
  syncedFromDestination?: boolean; // Créé automatiquement depuis destination
  userModified?: boolean; // User a modifié manuellement
}

export interface ActivityMemory {
  activities: ActivityEntry[];
  activeActivityIndex: number;

  // Préférences par défaut (appliquées aux nouvelles activités)
  defaultCategories: string[]; // ["culture", "food"]
  defaultDurationRange: string[]; // ["short", "medium"]
  defaultBudgetRange: [number, number]; // [0, 150]
}

interface ActivityMemoryContextValue {
  memory: ActivityMemory;

  // CRUD Activities
  addActivity: (activity?: Partial<ActivityEntry>) => string; // Returns ID
  removeActivity: (id: string) => void;
  updateActivity: (id: string, updates: Partial<ActivityEntry>) => void;

  // Bulk operations
  updateMemoryBatch: (updater: (prev: ActivityMemory) => ActivityMemory) => void;

  // Getters
  getActiveActivity: () => ActivityEntry | null;
  getActivitiesByDestination: (destinationId: string) => ActivityEntry[];
  getActivitiesByCity: (city: string) => ActivityEntry[];

  // Setters
  setActiveActivity: (id: string) => void;
  setDefaultCategories: (categories: string[]) => void;
  setDefaultBudgetRange: (range: [number, number]) => void;

  // Computed
  totalActivitiesCount: number;
  isReadyToSearch: boolean;

  // Serialization (pour chat AI context)
  getSerializedState: () => Record<string, unknown>;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = "travliaq_activity_memory";

const defaultMemory: ActivityMemory = {
  activities: [],
  activeActivityIndex: 0,
  defaultCategories: ["culture", "food"],
  defaultDurationRange: ["short", "medium"],
  defaultBudgetRange: [0, 150],
};

function serializeMemory(memory: ActivityMemory): string {
  return JSON.stringify({
    ...memory,
    activities: memory.activities.map(a => ({
      ...a,
      date: a.date?.toISOString() || null,
    })),
  });
}

function deserializeMemory(json: string): ActivityMemory | null {
  try {
    const parsed = JSON.parse(json);
    return {
      ...parsed,
      activities: parsed.activities.map((a: any) => ({
        ...a,
        date: a.date ? new Date(a.date) : null,
      })),
    };
  } catch (error) {
    console.warn("[ActivityMemory] Failed to deserialize:", error);
    return null;
  }
}

function loadFromStorage(): ActivityMemory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const deserialized = deserializeMemory(stored);
      if (deserialized) {
        return deserialized;
      }
    }
  } catch (error) {
    console.warn("[ActivityMemory] Failed to load from storage:", error);
  }
  return defaultMemory;
}

// ============================================================================
// CONTEXT
// ============================================================================

const ActivityMemoryContext = createContext<ActivityMemoryContextValue | undefined>(undefined);

export function ActivityMemoryProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<ActivityMemory>(() => loadFromStorage());
  const [isHydrated, setIsHydrated] = useState(false);

  // Access preferences for synchronization
  const { memory: { preferences } } = usePreferenceMemory();

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
      console.warn("[ActivityMemory] Failed to save:", error);
    }
  }, [memory, isHydrated]);

  // Sync preferences to activity defaults
  useEffect(() => {
    if (!isHydrated) return;

    const { interests, comfortLevel } = preferences;

    // Map comfort level to budget range
    const budgetRange: [number, number] =
      comfortLevel < 25 ? [0, 50] :
      comfortLevel < 50 ? [20, 100] :
      comfortLevel < 75 ? [50, 200] : [100, 500];

    // Map interests to default categories
    const categoryMap: Record<string, string> = {
      culture: "culture",
      food: "food",
      nature: "outdoor",
      beach: "outdoor",
      wellness: "wellness",
      sport: "outdoor",
    };

    const defaultCategories = interests
      .map(i => categoryMap[i])
      .filter(Boolean);

    setMemory(prev => ({
      ...prev,
      defaultBudgetRange: budgetRange,
      defaultCategories: defaultCategories.length > 0 ? defaultCategories : ["culture"],
    }));
  }, [preferences, isHydrated]);

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const addActivity = useCallback((activity?: Partial<ActivityEntry>): string => {
    const id = crypto.randomUUID();

    setMemory(prev => ({
      ...prev,
      activities: [...prev.activities, {
        id,
        destinationId: activity?.destinationId || "",
        city: activity?.city || "",
        country: activity?.country || "",
        title: activity?.title || "Nouvelle activité",
        category: activity?.category || "culture",
        duration: activity?.duration || "medium",
        priceMin: activity?.priceMin ?? prev.defaultBudgetRange[0],
        priceMax: activity?.priceMax ?? prev.defaultBudgetRange[1],
        date: activity?.date || null,
        timeSlot: activity?.timeSlot || "flexible",
        rating: activity?.rating || null,
        isBooked: activity?.isBooked || false,
        notes: activity?.notes || "",
        syncedFromDestination: activity?.syncedFromDestination || false,
        userModified: activity?.userModified || false,
      }],
    }));

    // Flash the activities tab to indicate an update
    eventBus.emit("tab:flash", { tab: "activities" });

    return id;
  }, []);

  const removeActivity = useCallback((id: string) => {
    setMemory(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== id),
      // Adjust active index if needed
      activeActivityIndex: prev.activeActivityIndex >= prev.activities.length - 1
        ? Math.max(0, prev.activities.length - 2)
        : prev.activeActivityIndex,
    }));
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<ActivityEntry>) => {
    setMemory(prev => ({
      ...prev,
      activities: prev.activities.map(a =>
        a.id === id
          ? { ...a, ...updates, userModified: true }
          : a
      ),
    }));

    // Flash the activities tab to indicate an update
    eventBus.emit("tab:flash", { tab: "activities" });
  }, []);

  const updateMemoryBatch = useCallback((updater: (prev: ActivityMemory) => ActivityMemory) => {
    setMemory(updater);
  }, []);

  // ============================================================================
  // GETTERS
  // ============================================================================

  const getActiveActivity = useCallback((): ActivityEntry | null => {
    return memory.activities[memory.activeActivityIndex] || null;
  }, [memory.activities, memory.activeActivityIndex]);

  const getActivitiesByDestination = useCallback((destinationId: string): ActivityEntry[] => {
    return memory.activities.filter(a => a.destinationId === destinationId);
  }, [memory.activities]);

  const getActivitiesByCity = useCallback((city: string): ActivityEntry[] => {
    return memory.activities.filter(
      a => a.city.toLowerCase() === city.toLowerCase()
    );
  }, [memory.activities]);

  const getSerializedState = useCallback((): Record<string, unknown> => {
    return {
      totalActivities: memory.activities.length,
      activitiesByCity: memory.activities.reduce((acc, activity) => {
        if (!acc[activity.city]) {
          acc[activity.city] = [];
        }
        acc[activity.city].push({
          title: activity.title,
          category: activity.category,
          duration: activity.duration,
          price: `${activity.priceMin}-${activity.priceMax}€`,
        });
        return acc;
      }, {} as Record<string, any[]>),
      defaultCategories: memory.defaultCategories,
      defaultBudgetRange: memory.defaultBudgetRange,
    };
  }, [memory]);

  // ============================================================================
  // SETTERS
  // ============================================================================

  const setActiveActivity = useCallback((id: string) => {
    const index = memory.activities.findIndex(a => a.id === id);
    if (index >= 0) {
      setMemory(prev => ({ ...prev, activeActivityIndex: index }));
    }
  }, [memory.activities]);

  const setDefaultCategories = useCallback((categories: string[]) => {
    setMemory(prev => ({ ...prev, defaultCategories: categories }));
  }, []);

  const setDefaultBudgetRange = useCallback((range: [number, number]) => {
    setMemory(prev => ({ ...prev, defaultBudgetRange: range }));
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalActivitiesCount = useMemo(() => memory.activities.length, [memory.activities]);
  const isReadyToSearch = useMemo(() => memory.activities.length > 0, [memory.activities]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<ActivityMemoryContextValue>(() => ({
    memory,
    addActivity,
    removeActivity,
    updateActivity,
    updateMemoryBatch,
    getActiveActivity,
    getActivitiesByDestination,
    getActivitiesByCity,
    setActiveActivity,
    setDefaultCategories,
    setDefaultBudgetRange,
    totalActivitiesCount,
    isReadyToSearch,
    getSerializedState,
  }), [
    memory,
    addActivity,
    removeActivity,
    updateActivity,
    updateMemoryBatch,
    getActiveActivity,
    getActivitiesByDestination,
    getActivitiesByCity,
    setActiveActivity,
    setDefaultCategories,
    setDefaultBudgetRange,
    totalActivitiesCount,
    isReadyToSearch,
    getSerializedState,
  ]);

  return (
    <ActivityMemoryContext.Provider value={value}>
      {children}
    </ActivityMemoryContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useActivityMemory(): ActivityMemoryContextValue {
  const context = useContext(ActivityMemoryContext);
  if (!context) {
    throw new Error("useActivityMemory must be used within ActivityMemoryProvider");
  }
  return context;
}
