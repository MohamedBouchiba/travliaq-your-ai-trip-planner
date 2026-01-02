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
} from "@/types/activity";
import { toast } from "sonner";

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

export interface ActivityFilters {
  categories: string[];
  priceRange: [number, number];
  ratingMin: number;
  durationMax: number; // in minutes
}

export interface ActivityMemory {
  // Planned activities
  activities: ActivityEntry[];

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
  }, [state.activities, state.activeFilters, isHydrated]);

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

  // Cleanup activities when destinations are removed
  useEffect(() => {
    if (!isHydrated) return;

    const validDestinationIds = new Set(accommodations.map((a) => a.id));
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
  }, [accommodations, isHydrated]);

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
    const destination = accommodations.find((a) => a.id === destinationId);
    if (!destination) return;

    setState((prev) => ({ ...prev, isLoadingRecommendations: true }));

    try {
      const startDate = destination.checkIn || new Date().toISOString().split('T')[0];

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
  }, [accommodations, preferences, state.activities]);

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const addActivityFromSearch = useCallback((viatorActivity: ViatorActivity, destinationId: string) => {
    const destination = accommodations.find((a) => a.id === destinationId);

    if (!destination) {
      toast.error('Destination introuvable');
      return;
    }

    const newActivity: ActivityEntry = {
      id: crypto.randomUUID(),
      viatorId: viatorActivity.id,
      destinationId,
      city: destination.city,
      country: destination.country,
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
  }, [accommodations]);

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
      searchActivities,
      loadMoreResults,
      clearSearch,
      loadRecommendations,
      addActivityFromSearch,
      addManualActivity,
      updateActivity,
      removeActivity,
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
      searchActivities,
      loadMoreResults,
      clearSearch,
      loadRecommendations,
      addActivityFromSearch,
      addManualActivity,
      updateActivity,
      removeActivity,
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
