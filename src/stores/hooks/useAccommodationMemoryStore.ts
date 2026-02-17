/**
 * useAccommodationMemoryStore - Drop-in replacement for useAccommodationMemory (Context)
 * 
 * This hook provides the exact same API as AccommodationMemoryContext
 * but uses Zustand under the hood for better performance.
 * 
 * Migration: Replace `useAccommodationMemory` import with `useAccommodationMemoryStore`
 */

import { useMemo, useCallback, useEffect } from 'react';
import { usePlannerStoreV2 } from '../plannerStoreV2';
import { useTravelMemoryStore } from './useTravelMemoryStore';
import type { 
  AccommodationEntry, 
  AccommodationState,
  BudgetPreset, 
  AccommodationType, 
  EssentialAmenity, 
  RoomConfig,
  AdvancedFilters,
  HotelSearchResult,
} from '../slices/accommodationTypes';
import type { HotelDetails } from '@/services/hotels/hotelService';

// Re-export types for compatibility
export type { 
  AccommodationEntry, 
  AccommodationState,
  BudgetPreset, 
  AccommodationType, 
  EssentialAmenity, 
  RoomConfig,
  AdvancedFilters,
  HotelSearchResult,
  HotelDetails,
};
export { BUDGET_PRESETS } from '../slices/accommodationTypes';

// Memory structure (mirrors Context)
export interface AccommodationMemory {
  accommodations: AccommodationEntry[];
  activeAccommodationIndex: number;
  useAutoRooms: boolean;
  customRooms: RoomConfig[];
  defaultBudgetPreset: BudgetPreset;
  defaultPriceMin: number;
  defaultPriceMax: number;
  hotelSearchResults: HotelSearchResult[];
  showHotelResults: boolean;
  selectedHotelForDetailId: string | null;
  isLoadingHotelDetails: boolean;
  hotelDetailsCache: Record<string, HotelDetails>;
}

// Context-compatible return type
export interface AccommodationMemoryStoreValue {
  memory: AccommodationMemory;
  
  // Accommodation list management
  addAccommodation: (entry?: Partial<AccommodationEntry>) => void;
  removeAccommodation: (id: string) => void;
  setActiveAccommodation: (index: number) => void;
  getActiveAccommodation: () => AccommodationEntry | null;
  updateAccommodation: (id: string, updates: Partial<AccommodationEntry>) => void;
  
  // Budget helpers for active accommodation
  setBudgetPreset: (preset: BudgetPreset) => void;
  setCustomBudget: (min: number, max: number) => void;
  
  // Default budget preferences
  setDefaultBudget: (preset: BudgetPreset, min: number, max: number) => void;
  
  // Type helpers for active accommodation
  toggleType: (type: AccommodationType) => void;
  
  // Amenity helpers for active accommodation
  toggleAmenity: (amenity: EssentialAmenity) => void;
  
  // Rating helpers for active accommodation
  setMinRating: (rating: number | null) => void;
  
  // Room helpers (shared)
  getSuggestedRooms: () => RoomConfig[];
  setCustomRooms: (rooms: RoomConfig[]) => void;
  toggleAutoRooms: () => void;
  
  // Advanced filters for active accommodation
  updateAdvancedFilters: (filters: Partial<AdvancedFilters>) => void;
  
  // Dates for active accommodation
  setDates: (checkIn: Date | null, checkOut: Date | null, isUserAction?: boolean) => void;
  
  // Destination for active accommodation
  setDestination: (city: string, country: string, countryCode: string, lat?: number, lng?: number) => void;
  
  // Reset
  resetMemory: () => void;
  
  // Batch update (for sync operations)
  updateMemoryBatch: (updater: (state: AccommodationState) => Partial<AccommodationState>) => void;
  
  // Hotel search state
  setHotelSearchResults: (results: HotelSearchResult[]) => void;
  setShowHotelResults: (show: boolean) => void;
  setSelectedHotelForDetailId: (id: string | null) => void;
  clearHotelSearch: () => void;
  setIsLoadingHotelDetails: (loading: boolean) => void;
  
  // Hotel details cache
  setHotelDetails: (hotelId: string, details: HotelDetails) => void;
  getHotelDetailsFromCache: (hotelId: string) => HotelDetails | null;
  
  // Computed values
  isReadyToSearch: boolean;
  getRoomsSummary: () => string;
  getTotalNights: () => number;
  
  // Serialization
  getSerializedState: () => Record<string, unknown>;
}

/**
 * useAccommodationMemoryStore - Zustand-based replacement for useAccommodationMemory
 */
export function useAccommodationMemoryStore(): AccommodationMemoryStoreValue {
  const store = usePlannerStoreV2();
  const { memory: travelMemory } = useTravelMemoryStore();

  // Ensure exactly one accommodation exists on mount (after hydration)
  // Also clean up stale persisted state: if multiple empty accommodations exist, reset to one
  useEffect(() => {
    if (!store.isHydrated) return;
    if (store.accommodations.length === 0) {
      store.addAccommodation();
    } else if (store.accommodations.length > 1) {
      // Check if most accommodations are empty (no city set) — likely stale persisted data
      const nonEmpty = store.accommodations.filter((a) => a.city && a.city.trim() !== "");
      if (nonEmpty.length === 0) {
        // All empty — reset to just one
        store.updateAccommodationBatch(() => ({
          accommodations: [store.accommodations[0]],
          activeAccommodationIndex: 0,
        }));
      }
    }
  }, [store.isHydrated, store.accommodations.length, store.addAccommodation, store.accommodations, store.updateAccommodationBatch]);

  // Build memory object (mirrors Context structure)
  const memory = useMemo<AccommodationMemory>(() => ({
    accommodations: store.accommodations,
    activeAccommodationIndex: store.activeAccommodationIndex,
    useAutoRooms: store.useAutoRooms,
    customRooms: store.customRooms,
    defaultBudgetPreset: store.defaultBudgetPreset,
    defaultPriceMin: store.defaultPriceMin,
    defaultPriceMax: store.defaultPriceMax,
    hotelSearchResults: store.hotelSearchResults,
    showHotelResults: store.showHotelResults,
    selectedHotelForDetailId: store.selectedHotelForDetailId,
    isLoadingHotelDetails: store.isLoadingHotelDetails,
    hotelDetailsCache: store.hotelDetailsCache as Record<string, HotelDetails>,
  }), [
    store.accommodations,
    store.activeAccommodationIndex,
    store.useAutoRooms,
    store.customRooms,
    store.defaultBudgetPreset,
    store.defaultPriceMin,
    store.defaultPriceMax,
    store.hotelSearchResults,
    store.showHotelResults,
    store.selectedHotelForDetailId,
    store.isLoadingHotelDetails,
    store.hotelDetailsCache,
  ]);

  // Get active accommodation
  const getActiveAccommodation = useCallback((): AccommodationEntry | null => {
    return store.getActiveAccommodation();
  }, [store]);

  // Get suggested rooms based on travelers
  const getSuggestedRooms = useCallback((): RoomConfig[] => {
    if (!store.useAutoRooms && store.customRooms.length > 0) {
      return store.customRooms;
    }

    // Auto-generate rooms based on travelers
    const { adults, children, childrenAges } = travelMemory.travelers;
    const rooms: RoomConfig[] = [];

    // Simple logic: 1 room for every 2 adults + children
    const totalTravelers = adults + children;
    const numRooms = Math.ceil(totalTravelers / 2) || 1;

    for (let i = 0; i < numRooms; i++) {
      const roomAdults = i === 0 ? Math.min(2, adults) : Math.max(0, adults - 2);
      const roomChildren = i === 0 ? children : 0;
      
      rooms.push({
        id: crypto.randomUUID(),
        adults: roomAdults,
        children: roomChildren,
        childrenAges: i === 0 ? childrenAges : [],
      });
    }

    return rooms.length > 0 ? rooms : [{ id: crypto.randomUUID(), adults: 2, children: 0, childrenAges: [] }];
  }, [store, travelMemory.travelers]);

  // Get rooms summary
  const getRoomsSummary = useCallback((): string => {
    const rooms = getSuggestedRooms();
    const totalAdults = rooms.reduce((sum, r) => sum + r.adults, 0);
    const totalChildren = rooms.reduce((sum, r) => sum + r.children, 0);
    
    const parts: string[] = [];
    parts.push(`${rooms.length} chambre${rooms.length > 1 ? 's' : ''}`);
    parts.push(`${totalAdults} adulte${totalAdults > 1 ? 's' : ''}`);
    if (totalChildren > 0) {
      parts.push(`${totalChildren} enfant${totalChildren > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  }, [getSuggestedRooms]);

  // Get total nights
  const getTotalNights = useCallback((): number => {
    const active = getActiveAccommodation();
    if (!active?.checkIn || !active?.checkOut) return 0;
    
    const diffTime = active.checkOut.getTime() - active.checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [getActiveAccommodation]);

  // Check if ready to search
  const isReadyToSearch = useMemo(() => {
    const active = store.getActiveAccommodation();
    if (!active) return false;
    
    return Boolean(
      active.city &&
      active.checkIn &&
      active.checkOut &&
      active.checkOut > active.checkIn
    );
  }, [store]);

  // Reset memory
  const resetMemory = useCallback(() => {
    store.resetAccommodation();
  }, [store]);

  // Set dates wrapper
  const setDates = useCallback((checkIn: Date | null, checkOut: Date | null, isUserAction?: boolean) => {
    store.setAccommodationDates(checkIn, checkOut, isUserAction);
  }, [store]);

  // Set destination wrapper
  const setDestination = useCallback((city: string, country: string, countryCode: string, lat?: number, lng?: number) => {
    store.setAccommodationDestination(city, country, countryCode, lat, lng);
  }, [store]);

  // Get serialized state
  const getSerializedState = useCallback((): Record<string, unknown> => {
    return {
      accommodations: memory.accommodations.map(acc => ({
        ...acc,
        checkIn: acc.checkIn?.toISOString() ?? null,
        checkOut: acc.checkOut?.toISOString() ?? null,
      })),
      activeAccommodationIndex: memory.activeAccommodationIndex,
      useAutoRooms: memory.useAutoRooms,
      customRooms: memory.customRooms,
      defaultBudgetPreset: memory.defaultBudgetPreset,
      defaultPriceMin: memory.defaultPriceMin,
      defaultPriceMax: memory.defaultPriceMax,
    };
  }, [memory]);

  return {
    memory,
    
    // Accommodation management
    addAccommodation: store.addAccommodation,
    removeAccommodation: store.removeAccommodation,
    setActiveAccommodation: store.setActiveAccommodation,
    getActiveAccommodation,
    updateAccommodation: store.updateAccommodation,
    
    // Budget
    setBudgetPreset: store.setBudgetPreset,
    setCustomBudget: store.setCustomBudget,
    setDefaultBudget: store.setDefaultBudget,
    
    // Type & Amenities
    toggleType: store.toggleAccommodationType,
    toggleAmenity: store.toggleAmenity,
    setMinRating: store.setMinRating,
    
    // Rooms
    getSuggestedRooms,
    setCustomRooms: store.setCustomRooms,
    toggleAutoRooms: store.toggleAutoRooms,
    
    // Advanced filters
    updateAdvancedFilters: store.updateAdvancedFilters,
    
    // Dates & Destination
    setDates,
    setDestination,
    
    // Reset
    resetMemory,
    
    // Hotel search
    setHotelSearchResults: store.setHotelSearchResults,
    setShowHotelResults: store.setShowHotelResults,
    setSelectedHotelForDetailId: store.setSelectedHotelForDetailId,
    clearHotelSearch: store.clearHotelSearch,
    setIsLoadingHotelDetails: store.setIsLoadingHotelDetails,
    
    // Hotel details cache
    setHotelDetails: store.setHotelDetails,
    getHotelDetailsFromCache: store.getHotelDetailsFromCache,
    
    // Batch update
    updateMemoryBatch: store.updateAccommodationBatch,
    
    // Computed
    isReadyToSearch,
    getRoomsSummary,
    getTotalNights,
    
    // Serialization
    getSerializedState,
  };
}
