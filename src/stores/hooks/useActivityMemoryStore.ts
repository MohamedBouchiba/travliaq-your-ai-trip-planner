/**
 * useActivityMemoryStore - Drop-in replacement for useActivityMemory (Context)
 * 
 * This hook provides the exact same API as ActivityMemoryContext
 * but uses Zustand under the hood for better performance.
 * 
 * Migration: Replace `useActivityMemory` import with `useActivityMemoryStore`
 */

import { useMemo, useCallback } from 'react';
import { usePlannerStoreV2 } from '../plannerStoreV2';
import { useAccommodationMemoryStore } from './useAccommodationMemoryStore';
import { activityService, recommendationService, activityCacheService } from '@/services/activities';
import { travliaqClient } from '@/services/api/travliaqClient';
import { toast } from 'sonner';
import type { 
  ActivityState,
  ActivityEntry, 
  ActivityDestination, 
  ActivityFilters,
  ViatorActivity as SliceViatorActivity,
  ActivitySearchState,
} from '../slices/activityTypes';
import type { ActivitySearchParams, ActivitySearchResponse, ViatorActivity as ApiViatorActivity } from '@/types/activity';

// Re-export types for compatibility (use Slice types)
export type { 
  ActivityEntry, 
  ActivityDestination, 
  ActivityFilters,
  ActivitySearchState,
};
export type { SliceViatorActivity as ViatorActivity };

// Memory structure (mirrors Context)
export interface ActivityMemory {
  activities: ActivityEntry[];
  localDestinations: ActivityDestination[];
  search: ActivitySearchState;
  recommendations: SliceViatorActivity[];
  isLoadingRecommendations: boolean;
  selectedActivityId: string | null;
  activeFilters: ActivityFilters;
}

// Context-compatible return type
export interface ActivityMemoryStoreValue {
  state: ActivityMemory;
  
  // Computed destinations: accommodations + local (inherited logic)
  allDestinations: ActivityDestination[];
  
  // Search operations
  searchActivities: (params: ActivitySearchParams) => Promise<void>;
  searchActivitiesByBounds: (params: {
    bounds: { north: number; south: number; east: number; west: number };
    startDate: string;
    endDate?: string;
    categories?: string[];
    priceRange?: { min?: number; max?: number };
    ratingMin?: number;
    currency?: string;
    language?: string;
  }) => Promise<{ attractions: SliceViatorActivity[]; activities: SliceViatorActivity[]; totalAttractions: number; totalActivities: number }>;
  loadMoreResults: () => Promise<void>;
  clearSearch: () => void;
  
  // Recommendations
  loadRecommendations: (destinationId: string) => Promise<void>;
  
  // CRUD operations
  addActivityFromSearch: (viatorActivity: SliceViatorActivity, destinationId: string) => void;
  addManualActivity: (activity: Partial<ActivityEntry>) => string;
  updateActivity: (id: string, updates: Partial<ActivityEntry>) => void;
  removeActivity: (id: string) => void;
  
  // Local destination operations
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
  
  // Reset
  resetMemory: () => void;
  
  // Serialization
  getSerializedState: () => Record<string, unknown>;
}

// Store last search params for pagination
let lastSearchParams: ActivitySearchParams | null = null;
let currentPage = 1;

/**
 * useActivityMemoryStore - Zustand-based replacement for useActivityMemory
 */
export function useActivityMemoryStore(): ActivityMemoryStoreValue {
  const store = usePlannerStoreV2();
  const { memory: accommodationMemory } = useAccommodationMemoryStore();

  // Build state object (mirrors Context structure)
  const state = useMemo<ActivityMemory>(() => ({
    activities: store.activities,
    localDestinations: store.localDestinations,
    search: store.search,
    recommendations: store.recommendations,
    isLoadingRecommendations: store.isLoadingRecommendations,
    selectedActivityId: store.selectedActivityId,
    activeFilters: store.activeFilters,
  }), [
    store.activities,
    store.localDestinations,
    store.search,
    store.recommendations,
    store.isLoadingRecommendations,
    store.selectedActivityId,
    store.activeFilters,
  ]);

  // All destinations (inherited from accommodations + local)
  const allDestinations = useMemo<ActivityDestination[]>(() => {
    // 1. Get inherited destinations from accommodations
    const inheritedDestinations: ActivityDestination[] = accommodationMemory.accommodations
      .filter((acc) => acc.city && acc.city.length > 0)
      .map((acc) => ({
        id: acc.id,
        city: acc.city,
        countryCode: acc.countryCode || '',
        checkIn: acc.checkIn,
        checkOut: acc.checkOut,
        lat: acc.lat,
        lng: acc.lng,
        isInherited: true,
        syncedFromAccommodation: acc.syncedFromFlight || false,
        accommodationId: acc.id,
        userOverridden: false,
      }));

    // 2. Get local destinations (added only in Activities panel)
    const localDests = state.localDestinations.map((d) => ({
      ...d,
      isInherited: false,
    }));

    // 3. Combine: inherited first, then local
    return [...inheritedDestinations, ...localDests];
  }, [accommodationMemory.accommodations, state.localDestinations]);

  // Search activities
  const searchActivities = useCallback(async (params: ActivitySearchParams) => {
    store.setActivitySearching(true);

    try {
      // Check cache first
      const cached = activityCacheService.get<ActivitySearchResponse>('search', params);

      if (cached) {
        const activities = cached.results.activities || [];
        // Cast to slice ViatorActivity type (compatible structure)
        store.setActivitySearchResults(activities as unknown as SliceViatorActivity[], cached.results.total_count || 0, cached.results.has_more || false);
        lastSearchParams = params;
        currentPage = params.page || 1;
        return;
      }

      // Call API
      const response = await activityService.searchActivities(params);

      // Cache response
      activityCacheService.set('search', params, response);

      const activities = response.results.activities || [];
      // Cast to slice ViatorActivity type (compatible structure)
      store.setActivitySearchResults(activities as unknown as SliceViatorActivity[], response.results.total_count || activities.length, response.results.has_more || false);
      lastSearchParams = params;
      currentPage = params.page || 1;
    } catch (error: any) {
      store.setActivitySearchError(error.message || 'Erreur lors de la recherche');
      toast.error(error.message || "Erreur lors de la recherche d'activités");
    }
  }, [store]);

  // Search by map bounds
  const searchActivitiesByBounds = useCallback(async (params: {
    bounds: { north: number; south: number; east: number; west: number };
    startDate: string;
    endDate?: string;
    categories?: string[];
    priceRange?: { min?: number; max?: number };
    ratingMin?: number;
    currency?: string;
    language?: string;
  }) => {
    store.setActivitySearching(true);

    try {
      const { data } = await travliaqClient.post<ActivitySearchResponse>(
        '/api/v1/activities/search',
        {
          search_mode: 'both',
          location: {
            geo: {
              bounds: params.bounds,
            },
          },
          dates: {
            start: params.startDate,
            end: params.endDate,
          },
          filters: {
            categories: params.categories,
            price_range: params.priceRange,
            rating_min: params.ratingMin,
          },
          currency: params.currency || 'EUR',
          language: params.language || 'fr',
          pagination: {
            page: 1,
            limit: 40,
          },
        }
      );

      const activities = (data.results.activities || []) as unknown as SliceViatorActivity[];
      store.setActivitySearchResults(activities, data.results.total_count || activities.length, data.results.has_more || false);
      lastSearchParams = null; // Bounds search doesn't use standard params

      return {
        attractions: activities.slice(0, 15),
        activities: activities,
        totalAttractions: Math.min(activities.length, 15),
        totalActivities: data.results.total_count || activities.length,
      };
    } catch (error: any) {
      store.setActivitySearchError(error.message || 'Erreur lors de la recherche par zone');
      toast.error(error.message || "Erreur lors de la recherche d'activités dans cette zone");
      throw error;
    }
  }, [store]);

  // Load more results
  const loadMoreResults = useCallback(async () => {
    if (!lastSearchParams || !store.search.hasMore) return;

    const nextPage = currentPage + 1;
    const params = { ...lastSearchParams, page: nextPage };

    store.setActivitySearching(true);

    try {
      const response = await activityService.searchActivities(params);
      const newActivities = (response.results.activities || []) as unknown as SliceViatorActivity[];
      
      // Append to existing results
      const allActivities = [...store.search.activities, ...newActivities];
      store.setActivitySearchResults(allActivities, response.results.total_count || allActivities.length, response.results.has_more || false);
      currentPage = nextPage;
    } catch (error: any) {
      store.setActivitySearching(false);
      toast.error('Erreur lors du chargement des résultats suivants');
    }
  }, [store]);

  // Load recommendations
  const loadRecommendations = useCallback(async (destinationId: string) => {
    const destination = allDestinations.find((d) => d.id === destinationId);
    if (!destination) return;

    store.setLoadingRecommendations(true);

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
          interests: [],
          comfortLevel: 50,
        },
        []
      );

      store.setRecommendations(recommendations as unknown as SliceViatorActivity[]);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      store.setLoadingRecommendations(false);
      toast.error('Erreur lors du chargement des recommandations');
    }
  }, [store, allDestinations]);

  // Get selected activity
  const getSelectedActivity = useCallback((): ActivityEntry | null => {
    return store.getSelectedActivity();
  }, [store]);

  // Get activities by destination
  const getActivitiesByDestination = useCallback((destId: string): ActivityEntry[] => {
    return store.getActivitiesByDestination(destId);
  }, [store]);

  // Get activities by date
  const getActivitiesByDate = useCallback((date: Date): ActivityEntry[] => {
    return store.getActivitiesByDate(date);
  }, [store]);

  // Get total budget
  const getTotalBudget = useCallback((): number => {
    return store.getTotalActivityBudget();
  }, [store]);

  // Total activities count
  const totalActivitiesCount = state.activities.length;

  // Reset memory
  const resetMemory = useCallback(() => {
    store.resetActivities();
    lastSearchParams = null;
    currentPage = 1;
  }, [store]);

  // Get serialized state
  const getSerializedState = useCallback((): Record<string, unknown> => {
    return {
      totalActivities: state.activities.length,
      activitiesByCity: state.activities.reduce((acc, activity) => {
        const city = ('city' in activity ? String(activity.city) : null) || 'Unknown';
        if (!acc[city]) {
          acc[city] = [];
        }
        acc[city].push({
          title: activity.title,
          categories: activity.categories,
          price: activity.price,
          currency: activity.currency,
        });
        return acc;
      }, {} as Record<string, any[]>),
      totalBudget: getTotalBudget(),
    };
  }, [state.activities, getTotalBudget]);

  return {
    state,
    allDestinations,
    
    // Search operations
    searchActivities,
    searchActivitiesByBounds,
    loadMoreResults,
    clearSearch: store.clearActivitySearch,
    
    // Recommendations
    loadRecommendations,
    
    // CRUD
    addActivityFromSearch: store.addActivityFromSearch,
    addManualActivity: store.addManualActivity,
    updateActivity: store.updateActivity,
    removeActivity: store.removeActivity,
    
    // Local destinations
    addLocalDestination: store.addLocalDestination,
    removeLocalDestination: store.removeLocalDestination,
    updateLocalDestination: store.updateLocalDestination,
    
    // Selection
    selectActivity: store.selectActivity,
    getSelectedActivity,
    
    // Filters
    updateFilters: store.updateActivityFilters,
    
    // Queries
    getActivitiesByDestination,
    getActivitiesByDate,
    getTotalBudget,
    
    // Computed
    totalActivitiesCount,
    
    // Reset
    resetMemory,
    
    // Serialization
    getSerializedState,
  };
}
