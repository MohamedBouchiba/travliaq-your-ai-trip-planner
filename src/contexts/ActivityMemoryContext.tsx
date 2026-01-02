/**
 * Activity Memory Context (Refactored v2)
 *
 * Manages activities with full Viator API integration
 * - Search activities from API
 * - Personalized recommendations
 * - CRUD operations with real activity data
 * - Budget synchronization
 * - localStorage persistence
 */

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { usePreferenceMemory } from "./PreferenceMemoryContext";
import { useAccommodationMemory } from "./AccommodationMemoryContext";
import { eventBus } from "@/lib/eventBus";
import { activityService, recommendationService, activityCacheService } from "@/services/activities";
import type {
  ActivityEntry,
  ViatorActivity,
  ActivitySearchParams,
  ActivitySearchResponse,
  ActivityFilters,
} from "@/types/activity";
import { toast } from "sonner";

// Re-export types for consumers
export type { ActivityEntry, ViatorActivity, ActivityFilters } from "@/types/activity";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ActivitySearchState {
  isSearching: boolean;
  searchResults: ViatorActivity[];
  totalResults: number;
  currentPage: number;
  hasMore: boolean;
  lastSearchParams: ActivitySearchParams | null;
  error: string | null;
}

// Destination for activities
// Activities inherit from accommodations but can have additional destinations
export interface ActivityDestination {
  id: string;
  city: string;
  countryCode: string;
  checkIn: Date | null;
  checkOut: Date | null;
  lat?: number;
  lng?: number;
  isInherited?: boolean; // true if inherited from accommodation, false if added locally
}

// ActivityFilters is now imported from @/types/activity

export interface ActivityMemory {
  // Planned activities
  activities: ActivityEntry[];

  // Local destinations (added specifically in Activities panel, NOT inherited)
  localDestinations: ActivityDestination[];

  // Search state
  search: ActivitySearchState;

  // Recommendations
  recommendations: ViatorActivity[];
  isLoadingRecommendations: boolean;

  // Selection
  selectedActivityId: string | null;

  // Active filters
  activeFilters: ActivityFilters;
}

interface ActivityMemoryContextValue {
  state: ActivityMemory;

  // Computed destinations: accommodations + local (inherited logic)
  allDestinations: ActivityDestination[];

  // Search operations
  searchActivities: (params: ActivitySearchParams) => Promise<void>;
  loadMoreResults: () => Promise<void>;
  clearSearch: () => void;

  // Recommendations
  loadRecommendations: (destinationId: string) => Promise<void>;

  // CRUD operations
  addActivityFromSearch: (viatorActivity: ViatorActivity, destinationId: string) => void;
  addManualActivity: (activity: Partial<ActivityEntry>) => string;
  updateActivity: (id: string, updates: Partial<ActivityEntry>) => void;
  removeActivity: (id: string) => void;

  // Local destination operations (only for locally added destinations)
  addLocalDestination: (destination: Omit<ActivityDestination, 'id' | 'isInherited'>) => string;
  removeLocalDestination: (id: string) => void;
  updateLocalDestination: (id: string, updates: Partial<ActivityDestination>) => void;

  // Selection
  selectActivity: (id: string | null) => void;
  getSelectedActivity: () => ActivityEntry | null;

  // Filters
  updateFilters: (filters: Partial<ActivityFilters>) => void;

  // Queries
  getActivitiesByDestination: (destId: string) => ActivityEntry[];
  getActivitiesByDate: (date: Date) => ActivityEntry[];
  getTotalBudget: () => number;

  // Computed
  totalActivitiesCount: number;

  // Serialization
  getSerializedState: () => Record<string, unknown>;
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY = "travliaq_activity_memory_v2";

const defaultMemory: ActivityMemory = {
  activities: [],
  localDestinations: [], // Only locally added destinations
  search: {
    isSearching: false,
    searchResults: [],
    totalResults: 0,
    currentPage: 1,
    hasMore: false,
    lastSearchParams: null,
    error: null,
  },
  recommendations: [],
  isLoadingRecommendations: false,
  selectedActivityId: null,
  activeFilters: {
    categories: [],
    priceRange: [0, 500],
    ratingMin: 0,
    durationMax: 480, // 8 hours
  },
};

function serializeMemory(memory: ActivityMemory): string {
  return JSON.stringify({
    activities: memory.activities.map((a) => ({
      ...a,
      date: a.date?.toISOString() || null,
      addedAt: a.addedAt.toISOString(),
    })),
    localDestinations: memory.localDestinations.map((d) => ({
      ...d,
      checkIn: d.checkIn?.toISOString() || null,
      checkOut: d.checkOut?.toISOString() || null,
    })),
    activeFilters: memory.activeFilters,
  });
}

function deserializeMemory(json: string): Partial<ActivityMemory> | null {
  try {
    const parsed = JSON.parse(json);
    return {
      activities: parsed.activities.map((a: any) => ({
        ...a,
        date: a.date ? new Date(a.date) : null,
        addedAt: new Date(a.addedAt),
      })),
      localDestinations: (parsed.localDestinations || parsed.destinations || []).map((d: any) => ({
        ...d,
        checkIn: d.checkIn ? new Date(d.checkIn) : null,
        checkOut: d.checkOut ? new Date(d.checkOut) : null,
        isInherited: false, // Local destinations are never inherited
      })),
      activeFilters: parsed.activeFilters || defaultMemory.activeFilters,
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
        return {
          ...defaultMemory,
          ...deserialized,
        };
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
  const [state, setState] = useState<ActivityMemory>(() => loadFromStorage());
  const [isHydrated, setIsHydrated] = useState(false);

  // Access other contexts
  const { memory: { preferences } } = usePreferenceMemory();
  const { memory: { accommodations } } = useAccommodationMemory();

  // Mark as hydrated on mount
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever activities or filters change
  useEffect(() => {
    if (!isHydrated) return;

    try {
      const serialized = serializeMemory(state);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.warn("[ActivityMemory] Failed to save:", error);
    }
  }, [state.activities, state.localDestinations, state.activeFilters, isHydrated]);

  // Sync preferences to filter defaults
  useEffect(() => {
    if (!isHydrated) return;

    const { comfortLevel } = preferences;

    // Map comfort level to budget range
    const budgetRange: [number, number] =
      comfortLevel < 25 ? [0, 80] :
      comfortLevel < 50 ? [0, 180] :
      comfortLevel < 75 ? [80, 350] : [180, 500];

    setState((prev) => ({
      ...prev,
      activeFilters: {
        ...prev.activeFilters,
        priceRange: budgetRange,
      },
    }));
  }, [preferences.comfortLevel, isHydrated]);

  // ============================================================================
  // COMPUTED: All destinations = inherited from accommodations + local
  // This is the INHERITANCE logic: Activities inherit from Accommodations
  // ============================================================================
  
  const allDestinations = useMemo<ActivityDestination[]>(() => {
    // 1. Get inherited destinations from accommodations
    const inheritedDestinations: ActivityDestination[] = accommodations
      .filter((acc) => acc.city && acc.city.length > 0)
      .map((acc) => ({
        id: acc.id,
        city: acc.city,
        countryCode: acc.countryCode || "",
        checkIn: acc.checkIn,
        checkOut: acc.checkOut,
        lat: acc.lat,
        lng: acc.lng,
        isInherited: true,
      }));

    // 2. Get local destinations (added only in Activities panel)
    const localDests = state.localDestinations.map((d) => ({
      ...d,
      isInherited: false,
    }));

    // 3. Combine: inherited first, then local
    return [...inheritedDestinations, ...localDests];
  }, [accommodations, state.localDestinations]);

  // Cleanup activities when their destination no longer exists
  useEffect(() => {
    if (!isHydrated) return;

    const validDestinationIds = new Set(allDestinations.map((d) => d.id));
    const activitiesToRemove = state.activities.filter(
      (a) => !validDestinationIds.has(a.destinationId)
    );

    if (activitiesToRemove.length > 0) {
      setState((prev) => ({
        ...prev,
        activities: prev.activities.filter((a) =>
          validDestinationIds.has(a.destinationId)
        ),
      }));

      toast.info(
        `${activitiesToRemove.length} activité${activitiesToRemove.length > 1 ? 's supprimée' : ' supprimée'} (destination retirée)`
      );
    }
  }, [allDestinations, isHydrated]);

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  const searchActivities = useCallback(async (params: ActivitySearchParams) => {
    setState((prev) => ({
      ...prev,
      search: {
        ...prev.search,
        isSearching: true,
        error: null,
      },
    }));

    try {
      // Check cache first
      const cached = activityCacheService.get<ActivitySearchResponse>('search', params);

      if (cached) {
        setState((prev) => ({
          ...prev,
          search: {
            ...prev.search,
            isSearching: false,
            searchResults: cached.results.activities,
            totalResults: cached.results.total_count,
            currentPage: params.page || 1,
            hasMore: cached.results.has_more,
            lastSearchParams: params,
          },
        }));
        return;
      }

      // Call API
      const response = await activityService.searchActivities(params);

      // Cache response
      activityCacheService.set('search', params, response);

      setState((prev) => ({
        ...prev,
        search: {
          ...prev.search,
          isSearching: false,
          searchResults: response.results.activities,
          totalResults: response.results.total_count,
          currentPage: params.page || 1,
          hasMore: response.results.has_more,
          lastSearchParams: params,
        },
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        search: {
          ...prev.search,
          isSearching: false,
          error: error.message || 'Erreur lors de la recherche',
        },
      }));

      toast.error(error.message || 'Erreur lors de la recherche d\'activités');
    }
  }, []);

  const loadMoreResults = useCallback(async () => {
    if (!state.search.lastSearchParams || !state.search.hasMore) return;

    const nextPage = state.search.currentPage + 1;
    const params = { ...state.search.lastSearchParams, page: nextPage };

    setState((prev) => ({
      ...prev,
      search: { ...prev.search, isSearching: true },
    }));

    try {
      const response = await activityService.searchActivities(params);

      setState((prev) => ({
        ...prev,
        search: {
          ...prev.search,
          isSearching: false,
          searchResults: [...prev.search.searchResults, ...response.results.activities],
          currentPage: nextPage,
          hasMore: response.results.has_more,
        },
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        search: { ...prev.search, isSearching: false },
      }));

      toast.error('Erreur lors du chargement des résultats suivants');
    }
  }, [state.search.lastSearchParams, state.search.hasMore, state.search.currentPage]);

  const clearSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      search: defaultMemory.search,
    }));
  }, []);

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  const loadRecommendations = useCallback(async (destinationId: string) => {
    // Use allDestinations (inherited + local)
    const destination = allDestinations.find((d) => d.id === destinationId);
    if (!destination) return;

    setState((prev) => ({ ...prev, isLoadingRecommendations: true }));

    try {
      const checkInValue = destination.checkIn;
      const startDate = typeof checkInValue === 'string' 
        ? checkInValue 
        : checkInValue instanceof Date 
          ? checkInValue.toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0];

      const recommendations = await recommendationService.getPersonalizedRecommendations(
        destination.city,
        destination.countryCode,
        startDate,
        {
          interests: preferences.interests,
          comfortLevel: preferences.comfortLevel,
        },
        state.activities.map((a) => ({
          id: a.viatorId || '',
          title: a.title,
          description: a.description,
          images: a.images,
          pricing: a.pricing,
          rating: a.rating,
          duration: a.duration,
          categories: a.categories,
          flags: a.flags,
          booking_url: a.bookingUrl || '',
          confirmation_type: '',
          location: { destination: a.city, country: a.country },
          availability: a.availability,
        }))
      );

      setState((prev) => ({
        ...prev,
        recommendations,
        isLoadingRecommendations: false,
      }));
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setState((prev) => ({ ...prev, isLoadingRecommendations: false }));
      toast.error('Erreur lors du chargement des recommandations');
    }
  }, [allDestinations, preferences, state.activities]);

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const addActivityFromSearch = useCallback((viatorActivity: ViatorActivity, destinationId: string) => {
    // Use allDestinations (inherited + local)
    const destination = allDestinations.find((d) => d.id === destinationId);

    if (!destination) {
      toast.error('Destination introuvable');
      return;
    }

    const newActivity: ActivityEntry = {
      id: crypto.randomUUID(),
      viatorId: viatorActivity.id,
      destinationId,
      city: destination.city,
      country: destination.countryCode,
      coordinates: undefined, // Will be populated from API later if needed
      title: viatorActivity.title,
      description: viatorActivity.description,
      images: viatorActivity.images,
      categories: viatorActivity.categories,
      viatorTags: [],
      pricing: viatorActivity.pricing,
      rating: viatorActivity.rating,
      duration: viatorActivity.duration,
      date: null,
      timeSlot: null,
      availability: viatorActivity.availability as any,
      isBooked: false,
      bookingUrl: viatorActivity.booking_url,
      flags: viatorActivity.flags,
      source: 'viator',
      addedAt: new Date(),
      userModified: false,
      notes: '',
    };

    setState((prev) => ({
      ...prev,
      activities: [...prev.activities, newActivity],
    }));

    // Flash activities tab
    eventBus.emit('tab:flash', { tab: 'activities' });

    toast.success(`${viatorActivity.title} ajouté au planning`);
  }, [allDestinations]);

  const addManualActivity = useCallback((activity: Partial<ActivityEntry>): string => {
    const id = crypto.randomUUID();

    const newActivity: ActivityEntry = {
      id,
      destinationId: activity.destinationId || '',
      city: activity.city || '',
      country: activity.country || '',
      title: activity.title || 'Nouvelle activité',
      description: activity.description || '',
      images: activity.images || [],
      categories: activity.categories || [],
      pricing: activity.pricing || {
        from_price: 0,
        currency: 'EUR',
        is_discounted: false,
      },
      rating: activity.rating || { average: 0, count: 0 },
      duration: activity.duration || { minutes: 0, formatted: 'Flexible' },
      date: activity.date || null,
      timeSlot: activity.timeSlot || 'flexible',
      availability: 'available',
      isBooked: false,
      flags: [],
      source: 'manual',
      addedAt: new Date(),
      userModified: false,
      notes: activity.notes || '',
    };

    setState((prev) => ({
      ...prev,
      activities: [...prev.activities, newActivity],
    }));

    eventBus.emit('tab:flash', { tab: 'activities' });

    return id;
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<ActivityEntry>) => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) =>
        a.id === id ? { ...a, ...updates, userModified: true } : a
      ),
    }));

    eventBus.emit('tab:flash', { tab: 'activities' });
  }, []);

  const removeActivity = useCallback((id: string) => {
    const activity = state.activities.find((a) => a.id === id);

    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));

    if (activity) {
      toast.success(`${activity.title} supprimé`);
    }
  }, [state.activities]);

  // ============================================================================
  // LOCAL DESTINATION OPERATIONS (only for locally added destinations)
  // These do NOT affect accommodations - one-way inheritance
  // ============================================================================

  const addLocalDestination = useCallback((destination: Omit<ActivityDestination, 'id' | 'isInherited'>): string => {
    const id = crypto.randomUUID();
    const newDestination: ActivityDestination = {
      ...destination,
      id,
      isInherited: false,
    };

    setState((prev) => ({
      ...prev,
      localDestinations: [...prev.localDestinations, newDestination],
    }));

    return id;
  }, []);

  const removeLocalDestination = useCallback((id: string) => {
    // Check if it's a local destination (not inherited)
    const localDest = state.localDestinations.find((d) => d.id === id);
    if (!localDest) {
      // It's an inherited destination - cannot remove from here
      toast.error("Cette destination provient des hébergements. Modifiez-la dans l'onglet Hébergements.");
      return;
    }

    setState((prev) => ({
      ...prev,
      localDestinations: prev.localDestinations.filter((d) => d.id !== id),
      // Also remove activities for this destination
      activities: prev.activities.filter((a) => a.destinationId !== id),
    }));
  }, [state.localDestinations]);

  const updateLocalDestination = useCallback((id: string, updates: Partial<ActivityDestination>) => {
    setState((prev) => ({
      ...prev,
      localDestinations: prev.localDestinations.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  }, []);

  // ============================================================================
  // SELECTION
  // ============================================================================

  const selectActivity = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedActivityId: id }));
  }, []);

  const getSelectedActivity = useCallback((): ActivityEntry | null => {
    return state.activities.find((a) => a.id === state.selectedActivityId) || null;
  }, [state.activities, state.selectedActivityId]);

  // ============================================================================
  // FILTERS
  // ============================================================================

  const updateFilters = useCallback((filters: Partial<ActivityFilters>) => {
    setState((prev) => ({
      ...prev,
      activeFilters: {
        ...prev.activeFilters,
        ...filters,
      },
    }));
  }, []);

  // ============================================================================
  // QUERIES
  // ============================================================================

  const getActivitiesByDestination = useCallback((destId: string): ActivityEntry[] => {
    return state.activities.filter((a) => a.destinationId === destId);
  }, [state.activities]);

  const getActivitiesByDate = useCallback((date: Date): ActivityEntry[] => {
    return state.activities.filter((a) => {
      if (!a.date) return false;
      return (
        a.date.getFullYear() === date.getFullYear() &&
        a.date.getMonth() === date.getMonth() &&
        a.date.getDate() === date.getDate()
      );
    });
  }, [state.activities]);

  const getTotalBudget = useCallback((): number => {
    return state.activities.reduce((sum, a) => sum + (a.pricing?.from_price || 0), 0);
  }, [state.activities]);

  // ============================================================================
  // SERIALIZATION
  // ============================================================================

  const getSerializedState = useCallback((): Record<string, unknown> => {
    return {
      totalActivities: state.activities.length,
      activitiesByCity: state.activities.reduce((acc, activity) => {
        if (!acc[activity.city]) {
          acc[activity.city] = [];
        }
        acc[activity.city].push({
          title: activity.title,
          categories: activity.categories,
          duration: activity.duration.formatted,
          price: `${activity.pricing.from_price}${activity.pricing.currency}`,
        });
        return acc;
      }, {} as Record<string, any[]>),
      totalBudget: getTotalBudget(),
    };
  }, [state.activities, getTotalBudget]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalActivitiesCount = useMemo(() => state.activities.length, [state.activities]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = useMemo<ActivityMemoryContextValue>(
    () => ({
      state,
      allDestinations, // Computed: accommodations + local
      searchActivities,
      loadMoreResults,
      clearSearch,
      loadRecommendations,
      addActivityFromSearch,
      addManualActivity,
      updateActivity,
      removeActivity,
      addLocalDestination,
      removeLocalDestination,
      updateLocalDestination,
      selectActivity,
      getSelectedActivity,
      updateFilters,
      getActivitiesByDestination,
      getActivitiesByDate,
      getTotalBudget,
      totalActivitiesCount,
      getSerializedState,
    }),
    [
      state,
      allDestinations,
      searchActivities,
      loadMoreResults,
      clearSearch,
      loadRecommendations,
      addActivityFromSearch,
      addManualActivity,
      updateActivity,
      removeActivity,
      addLocalDestination,
      removeLocalDestination,
      updateLocalDestination,
      selectActivity,
      getSelectedActivity,
      updateFilters,
      getActivitiesByDestination,
      getActivitiesByDate,
      getTotalBudget,
      totalActivitiesCount,
      getSerializedState,
    ]
  );

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
