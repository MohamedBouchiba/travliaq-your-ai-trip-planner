/**
 * Activity Memory Context - V2
 * Manages activities planning state with Travliaq API integration
 * Synchronized with AccommodationMemory for dates
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { usePreferenceMemory } from "./PreferenceMemoryContext";
import { useAccommodationMemory } from "./AccommodationMemoryContext";
import { eventBus } from "@/lib/eventBus";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// API Activity from Travliaq
export interface TravliaqActivity {
  id: string;
  title: string;
  description: string;
  images: {
    url: string;
    is_cover: boolean;
    variants: {
      small?: string;
      medium?: string;
      large?: string;
    };
  }[];
  pricing: {
    from_price: number;
    currency: string;
    original_price?: number;
    is_discounted: boolean;
  };
  rating: {
    average: number;
    count: number;
  };
  duration: {
    minutes: number;
    formatted: string;
  };
  categories: string[];
  flags: string[];
  booking_url: string;
  confirmation_type: string;
  location: {
    destination: string;
    country: string;
  };
  availability: string;
}

export interface ActivityEntry {
  id: string;

  // Liaison avec destination
  destinationId: string;
  city: string;
  country: string;
  countryCode: string;

  // API data (from Travliaq)
  viatorId?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imageVariants?: {
    small?: string;
    medium?: string;
    large?: string;
  };

  // Pricing
  fromPrice: number;
  currency: string;
  originalPrice?: number;
  isDiscounted: boolean;

  // Rating
  rating: number | null;
  reviewCount: number;

  // Duration
  durationMinutes: number;
  durationFormatted: string;

  // Categories & flags
  categories: string[];
  flags: string[];

  // Booking
  bookingUrl?: string;
  confirmationType?: string;

  // Coordinates for map (if available)
  lat?: number;
  lng?: number;

  // Dates (synced from accommodation)
  searchStartDate: Date | null;
  searchEndDate: Date | null;
  plannedDate: Date | null;
  timeSlot: "morning" | "afternoon" | "evening" | "flexible" | null;

  // Sync flags
  syncedFromAccommodation: boolean;
  userModifiedDates: boolean;
  isSaved: boolean;
}

export interface ActivityMemory {
  // Saved activities (user's selection)
  savedActivities: ActivityEntry[];
  
  // Search results cache per destination
  searchCache: Record<string, {
    activities: ActivityEntry[];
    timestamp: number;
    query: string;
  }>;

  // Active destination for activities
  activeDestinationId: string | null;

  // Default filter preferences
  defaultCategories: string[];
  defaultBudgetRange: [number, number];
  defaultRatingMin: number;
}

interface ActivityMemoryContextValue {
  memory: ActivityMemory;

  // Saved Activities CRUD
  saveActivity: (activity: TravliaqActivity, destinationId: string, destinationInfo: {
    city: string;
    country: string;
    countryCode: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
  }) => void;
  unsaveActivity: (id: string) => void;
  updateSavedActivity: (id: string, updates: Partial<ActivityEntry>) => void;
  getSavedActivitiesByDestination: (destinationId: string) => ActivityEntry[];
  isActivitySaved: (viatorId: string) => boolean;

  // Search cache
  setCachedSearch: (destinationId: string, activities: ActivityEntry[], query: string) => void;
  getCachedSearch: (destinationId: string) => { activities: ActivityEntry[]; query: string } | null;

  // Active destination
  setActiveDestination: (id: string | null) => void;

  // Preferences
  setDefaultCategories: (categories: string[]) => void;
  setDefaultBudgetRange: (range: [number, number]) => void;
  setDefaultRatingMin: (rating: number) => void;

  // Sync dates from accommodation
  syncDatesFromAccommodation: (destinationId: string, checkIn: Date | null, checkOut: Date | null) => void;

  // Computed
  totalSavedCount: number;

  // Serialization
  getSerializedState: () => Record<string, unknown>;

  // Legacy API (for backward compatibility with PlannerChat)
  addActivity: (activity: Partial<ActivityEntry>) => string;
  updateActivity: (id: string, updates: Partial<ActivityEntry>) => void;
  removeActivity: (id: string) => void;
  getActivitiesByCity: (city: string) => ActivityEntry[];
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = "travliaq_activity_memory_v2";

const defaultMemory: ActivityMemory = {
  savedActivities: [],
  searchCache: {},
  activeDestinationId: null,
  defaultCategories: [],
  defaultBudgetRange: [0, 200],
  defaultRatingMin: 0,
};

function serializeMemory(memory: ActivityMemory): string {
  return JSON.stringify({
    ...memory,
    savedActivities: memory.savedActivities.map(a => ({
      ...a,
      searchStartDate: a.searchStartDate?.toISOString() || null,
      searchEndDate: a.searchEndDate?.toISOString() || null,
      plannedDate: a.plannedDate?.toISOString() || null,
    })),
  });
}

function deserializeMemory(json: string): ActivityMemory | null {
  try {
    const parsed = JSON.parse(json);
    return {
      ...defaultMemory,
      ...parsed,
      savedActivities: (parsed.savedActivities || []).map((a: any) => ({
        ...a,
        searchStartDate: a.searchStartDate ? new Date(a.searchStartDate) : null,
        searchEndDate: a.searchEndDate ? new Date(a.searchEndDate) : null,
        plannedDate: a.plannedDate ? new Date(a.plannedDate) : null,
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
// HELPER: Convert API activity to ActivityEntry
// ============================================================================

function apiToActivityEntry(
  apiActivity: TravliaqActivity,
  destinationId: string,
  destinationInfo: {
    city: string;
    country: string;
    countryCode: string;
    checkIn?: Date | null;
    checkOut?: Date | null;
  }
): ActivityEntry {
  const coverImage = apiActivity.images.find(img => img.is_cover) || apiActivity.images[0];

  return {
    id: crypto.randomUUID(),
    destinationId,
    city: destinationInfo.city,
    country: destinationInfo.country,
    countryCode: destinationInfo.countryCode,
    viatorId: apiActivity.id,
    title: apiActivity.title,
    description: apiActivity.description,
    imageUrl: coverImage?.variants.medium || coverImage?.url,
    imageVariants: coverImage?.variants,
    fromPrice: apiActivity.pricing.from_price,
    currency: apiActivity.pricing.currency,
    originalPrice: apiActivity.pricing.original_price,
    isDiscounted: apiActivity.pricing.is_discounted,
    rating: apiActivity.rating.average,
    reviewCount: apiActivity.rating.count,
    durationMinutes: apiActivity.duration.minutes,
    durationFormatted: apiActivity.duration.formatted,
    categories: apiActivity.categories,
    flags: apiActivity.flags,
    bookingUrl: apiActivity.booking_url,
    confirmationType: apiActivity.confirmation_type,
    searchStartDate: destinationInfo.checkIn || null,
    searchEndDate: destinationInfo.checkOut || null,
    plannedDate: null,
    timeSlot: null,
    syncedFromAccommodation: !!(destinationInfo.checkIn || destinationInfo.checkOut),
    userModifiedDates: false,
    isSaved: true,
  };
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

    setMemory(prev => ({
      ...prev,
      defaultBudgetRange: budgetRange,
      defaultCategories: interests || [],
    }));
  }, [preferences, isHydrated]);

  // ============================================================================
  // SAVED ACTIVITIES OPERATIONS
  // ============================================================================

  const saveActivity = useCallback((
    apiActivity: TravliaqActivity,
    destinationId: string,
    destinationInfo: {
      city: string;
      country: string;
      countryCode: string;
      checkIn?: Date | null;
      checkOut?: Date | null;
    }
  ) => {
    setMemory(prev => {
      // Check if already saved
      if (prev.savedActivities.some(a => a.viatorId === apiActivity.id)) {
        return prev;
      }

      const entry = apiToActivityEntry(apiActivity, destinationId, destinationInfo);

      return {
        ...prev,
        savedActivities: [...prev.savedActivities, entry],
      };
    });

    eventBus.emit("tab:flash", { tab: "activities" });
  }, []);

  const unsaveActivity = useCallback((id: string) => {
    setMemory(prev => ({
      ...prev,
      savedActivities: prev.savedActivities.filter(a => a.id !== id),
    }));
  }, []);

  const updateSavedActivity = useCallback((id: string, updates: Partial<ActivityEntry>) => {
    setMemory(prev => ({
      ...prev,
      savedActivities: prev.savedActivities.map(a =>
        a.id === id ? { ...a, ...updates } : a
      ),
    }));
  }, []);

  const getSavedActivitiesByDestination = useCallback((destinationId: string): ActivityEntry[] => {
    return memory.savedActivities.filter(a => a.destinationId === destinationId);
  }, [memory.savedActivities]);

  const isActivitySaved = useCallback((viatorId: string): boolean => {
    return memory.savedActivities.some(a => a.viatorId === viatorId);
  }, [memory.savedActivities]);

  // ============================================================================
  // SEARCH CACHE
  // ============================================================================

  const setCachedSearch = useCallback((destinationId: string, activities: ActivityEntry[], query: string) => {
    setMemory(prev => ({
      ...prev,
      searchCache: {
        ...prev.searchCache,
        [destinationId]: {
          activities,
          timestamp: Date.now(),
          query,
        },
      },
    }));
  }, []);

  const getCachedSearch = useCallback((destinationId: string): { activities: ActivityEntry[]; query: string } | null => {
    const cache = memory.searchCache[destinationId];
    if (!cache) return null;

    // Cache valid for 1 hour
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - cache.timestamp > ONE_HOUR) {
      return null;
    }

    return { activities: cache.activities, query: cache.query };
  }, [memory.searchCache]);

  // ============================================================================
  // ACTIVE DESTINATION
  // ============================================================================

  const setActiveDestination = useCallback((id: string | null) => {
    setMemory(prev => ({ ...prev, activeDestinationId: id }));
  }, []);

  // ============================================================================
  // PREFERENCES
  // ============================================================================

  const setDefaultCategories = useCallback((categories: string[]) => {
    setMemory(prev => ({ ...prev, defaultCategories: categories }));
  }, []);

  const setDefaultBudgetRange = useCallback((range: [number, number]) => {
    setMemory(prev => ({ ...prev, defaultBudgetRange: range }));
  }, []);

  const setDefaultRatingMin = useCallback((rating: number) => {
    setMemory(prev => ({ ...prev, defaultRatingMin: rating }));
  }, []);

  // ============================================================================
  // DATE SYNCHRONIZATION
  // ============================================================================

  const syncDatesFromAccommodation = useCallback((
    destinationId: string,
    checkIn: Date | null,
    checkOut: Date | null
  ) => {
    setMemory(prev => ({
      ...prev,
      savedActivities: prev.savedActivities.map(a => {
        if (a.destinationId !== destinationId) return a;
        if (a.userModifiedDates) return a; // User has override, don't sync

        return {
          ...a,
          searchStartDate: checkIn,
          searchEndDate: checkOut,
          syncedFromAccommodation: true,
        };
      }),
    }));
  }, []);

  // ============================================================================
  // LEGACY API (backward compatibility with PlannerChat)
  // ============================================================================

  const addActivity = useCallback((activity: Partial<ActivityEntry>): string => {
    const id = crypto.randomUUID();
    
    const newActivity: ActivityEntry = {
      id,
      destinationId: activity.destinationId || "",
      city: activity.city || "",
      country: activity.country || "",
      countryCode: activity.countryCode || "",
      title: activity.title || "Nouvelle activité",
      description: activity.description,
      fromPrice: activity.fromPrice ?? 0,
      currency: activity.currency || "EUR",
      isDiscounted: activity.isDiscounted || false,
      rating: activity.rating ?? null,
      reviewCount: activity.reviewCount ?? 0,
      durationMinutes: activity.durationMinutes ?? 120,
      durationFormatted: activity.durationFormatted || "2h",
      categories: activity.categories || [],
      flags: activity.flags || [],
      searchStartDate: activity.searchStartDate || null,
      searchEndDate: activity.searchEndDate || null,
      plannedDate: activity.plannedDate || null,
      timeSlot: activity.timeSlot || null,
      syncedFromAccommodation: activity.syncedFromAccommodation || false,
      userModifiedDates: activity.userModifiedDates || false,
      isSaved: true,
    };

    setMemory(prev => ({
      ...prev,
      savedActivities: [...prev.savedActivities, newActivity],
    }));

    eventBus.emit("tab:flash", { tab: "activities" });
    return id;
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<ActivityEntry>) => {
    updateSavedActivity(id, updates);
  }, [updateSavedActivity]);

  const removeActivity = useCallback((id: string) => {
    unsaveActivity(id);
  }, [unsaveActivity]);

  const getActivitiesByCity = useCallback((city: string): ActivityEntry[] => {
    return memory.savedActivities.filter(
      a => a.city.toLowerCase() === city.toLowerCase()
    );
  }, [memory.savedActivities]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalSavedCount = useMemo(() => memory.savedActivities.length, [memory.savedActivities]);

  const getSerializedState = useCallback((): Record<string, unknown> => {
    return {
      totalSaved: memory.savedActivities.length,
      savedByCity: memory.savedActivities.reduce((acc, activity) => {
        if (!acc[activity.city]) {
          acc[activity.city] = [];
        }
        acc[activity.city].push({
          title: activity.title,
          price: `${activity.fromPrice}€`,
          duration: activity.durationFormatted,
        });
        return acc;
      }, {} as Record<string, any[]>),
      defaultCategories: memory.defaultCategories,
      defaultBudgetRange: memory.defaultBudgetRange,
    };
  }, [memory]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<ActivityMemoryContextValue>(() => ({
    memory,
    saveActivity,
    unsaveActivity,
    updateSavedActivity,
    getSavedActivitiesByDestination,
    isActivitySaved,
    setCachedSearch,
    getCachedSearch,
    setActiveDestination,
    setDefaultCategories,
    setDefaultBudgetRange,
    setDefaultRatingMin,
    syncDatesFromAccommodation,
    totalSavedCount,
    getSerializedState,
    // Legacy API
    addActivity,
    updateActivity,
    removeActivity,
    getActivitiesByCity,
  }), [
    memory,
    saveActivity,
    unsaveActivity,
    updateSavedActivity,
    getSavedActivitiesByDestination,
    isActivitySaved,
    setCachedSearch,
    getCachedSearch,
    setActiveDestination,
    setDefaultCategories,
    setDefaultBudgetRange,
    setDefaultRatingMin,
    syncDatesFromAccommodation,
    totalSavedCount,
    getSerializedState,
    addActivity,
    updateActivity,
    removeActivity,
    getActivitiesByCity,
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
