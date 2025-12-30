import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";
import { useTravelMemory } from "./TravelMemoryContext";

const STORAGE_KEY = "travliaq_accommodation_memory";

// Room configuration
export interface RoomConfig {
  id: string;
  adults: number;
  children: number;
  childrenAges: number[];
}

// Budget presets
export type BudgetPreset = "eco" | "comfort" | "premium" | "custom";

// Accommodation types
export type AccommodationType = "hotel" | "apartment" | "villa" | "hostel" | "guesthouse" | "any";

// Essential amenities (80% of use cases)
export type EssentialAmenity = "wifi" | "parking" | "breakfast" | "ac" | "pool" | "kitchen";

// Meal plans
export type MealPlan = "none" | "breakfast" | "half" | "full" | "all-inclusive";

// Advanced filters
export interface AdvancedFilters {
  mealPlan: MealPlan | null;
  views: string[];
  services: string[];
  accessibility: string[];
}

// Single accommodation entry (one per city/dates)
export interface AccommodationEntry {
  id: string;
  // Destination
  city: string;
  country: string;
  countryCode: string;
  lat?: number;
  lng?: number;
  // Dates (independent from flights)
  checkIn: Date | null;
  checkOut: Date | null;
  // Flag to indicate if dates are synced from flights
  syncedFromFlight?: boolean;
  // Budget (per night)
  budgetPreset: BudgetPreset;
  priceMin: number;
  priceMax: number;
  // Accommodation type (max 2)
  types: AccommodationType[];
  // Minimum rating (1-10 scale)
  minRating: number | null;
  // Essential amenities
  amenities: EssentialAmenity[];
  // Advanced filters
  advancedFilters: AdvancedFilters;
}

// Accommodation memory state
export interface AccommodationMemory {
  // List of accommodations (one per city/segment)
  accommodations: AccommodationEntry[];
  // Active accommodation index
  activeAccommodationIndex: number;
  // Shared room configuration
  useAutoRooms: boolean;
  customRooms: RoomConfig[];
}

// Context value type
interface AccommodationMemoryContextValue {
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
  setDates: (checkIn: Date | null, checkOut: Date | null) => void;
  
  // Destination for active accommodation
  setDestination: (city: string, country: string, countryCode: string, lat?: number, lng?: number) => void;

  // Reset
  resetMemory: () => void;

  // Computed values
  isReadyToSearch: boolean;
  getRoomsSummary: () => string;
  getTotalNights: () => number;
}

// Budget presets values
export const BUDGET_PRESETS: Record<BudgetPreset, { min: number; max: number; label: string }> = {
  eco: { min: 0, max: 80, label: "Économique" },
  comfort: { min: 80, max: 180, label: "Confort" },
  premium: { min: 180, max: 500, label: "Premium" },
  custom: { min: 0, max: 500, label: "Personnalisé" },
};

// Create a default accommodation entry
const createDefaultAccommodation = (): AccommodationEntry => ({
  id: crypto.randomUUID(),
  city: "",
  country: "",
  countryCode: "",
  checkIn: null,
  checkOut: null,
  budgetPreset: "comfort",
  priceMin: 80,
  priceMax: 180,
  types: [],
  minRating: null,
  amenities: [],
  advancedFilters: {
    mealPlan: null,
    views: [],
    services: [],
    accessibility: [],
  },
});

// Initial state
const initialMemory: AccommodationMemory = {
  accommodations: [createDefaultAccommodation()],
  activeAccommodationIndex: 0,
  useAutoRooms: true,
  customRooms: [],
};

// Serialize for localStorage (convert Dates to ISO strings)
function serializeMemory(memory: AccommodationMemory): string {
  const serializable = {
    ...memory,
    accommodations: memory.accommodations.map(acc => ({
      ...acc,
      checkIn: acc.checkIn ? acc.checkIn.toISOString() : null,
      checkOut: acc.checkOut ? acc.checkOut.toISOString() : null,
    })),
  };
  return JSON.stringify(serializable);
}

// Deserialize from localStorage (convert ISO strings to Dates)
function deserializeMemory(json: string): AccommodationMemory | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    
    const accommodations = (parsed.accommodations || []).map((acc: any) => ({
      ...createDefaultAccommodation(),
      ...acc,
      checkIn: acc.checkIn ? new Date(acc.checkIn) : null,
      checkOut: acc.checkOut ? new Date(acc.checkOut) : null,
      advancedFilters: {
        ...createDefaultAccommodation().advancedFilters,
        ...acc.advancedFilters,
      },
    }));
    
    return {
      accommodations: accommodations.length > 0 ? accommodations : [createDefaultAccommodation()],
      activeAccommodationIndex: parsed.activeAccommodationIndex || 0,
      useAutoRooms: parsed.useAutoRooms ?? true,
      customRooms: parsed.customRooms || [],
    };
  } catch {
    return null;
  }
}

// Load from localStorage
function loadFromStorage(): AccommodationMemory {
  if (typeof window === "undefined") return initialMemory;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialMemory;
    return deserializeMemory(stored) || initialMemory;
  } catch {
    return initialMemory;
  }
}

const AccommodationMemoryContext = createContext<AccommodationMemoryContextValue | null>(null);

export function AccommodationMemoryProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<AccommodationMemory>(() => loadFromStorage());
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Access travel memory for room suggestions
  const { memory: travelMemory, hasDestinations, hasDates } = useTravelMemory();

  // Hydrate on mount
  useEffect(() => {
    const stored = loadFromStorage();
    setMemory(stored);
    setIsHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeMemory(memory));
    } catch (error) {
      console.warn("[AccommodationMemory] Failed to save:", error);
    }
  }, [memory, isHydrated]);

  // Get active accommodation
  const getActiveAccommodation = useCallback((): AccommodationEntry | null => {
    return memory.accommodations[memory.activeAccommodationIndex] || null;
  }, [memory.accommodations, memory.activeAccommodationIndex]);

  // Add new accommodation
  const addAccommodation = useCallback((entry?: Partial<AccommodationEntry>) => {
    const newAccommodation: AccommodationEntry = {
      ...createDefaultAccommodation(),
      ...entry,
    };
    setMemory(prev => ({
      ...prev,
      accommodations: [...prev.accommodations, newAccommodation],
      activeAccommodationIndex: prev.accommodations.length,
    }));
  }, []);

  // Remove accommodation
  const removeAccommodation = useCallback((id: string) => {
    setMemory(prev => {
      const newAccommodations = prev.accommodations.filter(a => a.id !== id);
      // Ensure at least one accommodation exists
      if (newAccommodations.length === 0) {
        return {
          ...prev,
          accommodations: [createDefaultAccommodation()],
          activeAccommodationIndex: 0,
        };
      }
      // Adjust active index if needed
      const newIndex = Math.min(prev.activeAccommodationIndex, newAccommodations.length - 1);
      return {
        ...prev,
        accommodations: newAccommodations,
        activeAccommodationIndex: newIndex,
      };
    });
  }, []);

  // Set active accommodation
  const setActiveAccommodation = useCallback((index: number) => {
    setMemory(prev => ({
      ...prev,
      activeAccommodationIndex: Math.max(0, Math.min(index, prev.accommodations.length - 1)),
    }));
  }, []);

  // Update specific accommodation
  const updateAccommodation = useCallback((id: string, updates: Partial<AccommodationEntry>) => {
    setMemory(prev => ({
      ...prev,
      accommodations: prev.accommodations.map(acc => 
        acc.id === id 
          ? { 
              ...acc, 
              ...updates,
              advancedFilters: updates.advancedFilters 
                ? { ...acc.advancedFilters, ...updates.advancedFilters }
                : acc.advancedFilters,
            }
          : acc
      ),
    }));
  }, []);

  // Update active accommodation helper
  const updateActive = useCallback((updates: Partial<AccommodationEntry>) => {
    const active = getActiveAccommodation();
    if (active) {
      updateAccommodation(active.id, updates);
    }
  }, [getActiveAccommodation, updateAccommodation]);

  // Budget helpers
  const setBudgetPreset = useCallback((preset: BudgetPreset) => {
    const { min, max } = BUDGET_PRESETS[preset];
    updateActive({ budgetPreset: preset, priceMin: min, priceMax: max });
  }, [updateActive]);

  const setCustomBudget = useCallback((min: number, max: number) => {
    updateActive({ budgetPreset: "custom", priceMin: min, priceMax: max });
  }, [updateActive]);

  // Type helpers
  const toggleType = useCallback((type: AccommodationType) => {
    const active = getActiveAccommodation();
    if (!active) return;
    
    if (type === "any") {
      updateActive({ types: active.types.includes("any") ? [] : ["any"] });
      return;
    }
    const newTypes = active.types.filter(t => t !== "any");
    if (newTypes.includes(type)) {
      updateActive({ types: newTypes.filter(t => t !== type) });
    } else if (newTypes.length >= 2) {
      updateActive({ types: [newTypes[1], type] });
    } else {
      updateActive({ types: [...newTypes, type] });
    }
  }, [getActiveAccommodation, updateActive]);

  // Amenity helpers
  const toggleAmenity = useCallback((amenity: EssentialAmenity) => {
    const active = getActiveAccommodation();
    if (!active) return;
    
    if (active.amenities.includes(amenity)) {
      updateActive({ amenities: active.amenities.filter(a => a !== amenity) });
    } else {
      updateActive({ amenities: [...active.amenities, amenity] });
    }
  }, [getActiveAccommodation, updateActive]);

  // Rating helpers
  const setMinRating = useCallback((rating: number | null) => {
    updateActive({ minRating: rating });
  }, [updateActive]);

  // Dates helpers
  const setDates = useCallback((checkIn: Date | null, checkOut: Date | null) => {
    updateActive({ checkIn, checkOut });
  }, [updateActive]);

  // Destination helpers
  const setDestination = useCallback((city: string, country: string, countryCode: string, lat?: number, lng?: number) => {
    updateActive({ city, country, countryCode, lat, lng });
  }, [updateActive]);

  // Room helpers - suggest rooms based on travelers
  const getSuggestedRooms = useCallback((): RoomConfig[] => {
    const { adults, children, childrenAges } = travelMemory.travelers;
    const rooms: RoomConfig[] = [];

    if (adults <= 2 && children === 0) {
      rooms.push({
        id: crypto.randomUUID(),
        adults,
        children: 0,
        childrenAges: [],
      });
    } else if (adults <= 2 && children > 0) {
      rooms.push({
        id: crypto.randomUUID(),
        adults,
        children,
        childrenAges,
      });
    } else {
      const roomsNeeded = Math.ceil(adults / 2);
      let remainingAdults = adults;
      let remainingChildren = children;
      const remainingChildrenAges = [...childrenAges];

      for (let i = 0; i < roomsNeeded; i++) {
        const roomAdults = Math.min(2, remainingAdults);
        remainingAdults -= roomAdults;
        
        const roomChildren = i === 0 ? Math.min(2, remainingChildren) : 0;
        const roomChildrenAges = remainingChildrenAges.splice(0, roomChildren);
        remainingChildren -= roomChildren;

        rooms.push({
          id: crypto.randomUUID(),
          adults: roomAdults,
          children: roomChildren,
          childrenAges: roomChildrenAges,
        });
      }
    }

    return rooms;
  }, [travelMemory.travelers]);

  const setCustomRooms = useCallback((rooms: RoomConfig[]) => {
    setMemory(prev => ({
      ...prev,
      useAutoRooms: false,
      customRooms: rooms,
    }));
  }, []);

  const toggleAutoRooms = useCallback(() => {
    setMemory(prev => ({
      ...prev,
      useAutoRooms: !prev.useAutoRooms,
    }));
  }, []);

  // Advanced filters
  const updateAdvancedFilters = useCallback((filters: Partial<AdvancedFilters>) => {
    const active = getActiveAccommodation();
    if (!active) return;
    updateActive({
      advancedFilters: { ...active.advancedFilters, ...filters },
    });
  }, [getActiveAccommodation, updateActive]);

  const resetMemory = useCallback(() => {
    setMemory(initialMemory);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Computed values
  const isReadyToSearch = useMemo(() => {
    const active = getActiveAccommodation();
    if (!active) return false;
    // Ready if we have a destination (from widget or from flights)
    return (active.city.length > 0) || hasDestinations;
  }, [getActiveAccommodation, hasDestinations]);

  const getRoomsSummary = useCallback((): string => {
    const rooms = memory.useAutoRooms ? getSuggestedRooms() : memory.customRooms;
    if (rooms.length === 0) return "Configuration automatique";
    
    if (rooms.length === 1) {
      const room = rooms[0];
      if (room.children > 0) {
        return `1 chambre familiale (${room.adults} adultes + ${room.children} enfants)`;
      }
      return room.adults === 1 ? "1 chambre simple" : "1 chambre double";
    }
    return `${rooms.length} chambres`;
  }, [memory.useAutoRooms, memory.customRooms, getSuggestedRooms]);

  const getTotalNights = useCallback((): number => {
    return memory.accommodations.reduce((total, acc) => {
      if (acc.checkIn && acc.checkOut) {
        const days = Math.ceil((acc.checkOut.getTime() - acc.checkIn.getTime()) / (1000 * 60 * 60 * 24));
        return total + Math.max(0, days);
      }
      return total;
    }, 0);
  }, [memory.accommodations]);

  const value: AccommodationMemoryContextValue = {
    memory,
    addAccommodation,
    removeAccommodation,
    setActiveAccommodation,
    getActiveAccommodation,
    updateAccommodation,
    setBudgetPreset,
    setCustomBudget,
    toggleType,
    toggleAmenity,
    setMinRating,
    getSuggestedRooms,
    setCustomRooms,
    toggleAutoRooms,
    updateAdvancedFilters,
    setDates,
    setDestination,
    resetMemory,
    isReadyToSearch,
    getRoomsSummary,
    getTotalNights,
  };

  return (
    <AccommodationMemoryContext.Provider value={value}>
      {children}
    </AccommodationMemoryContext.Provider>
  );
}

export function useAccommodationMemory() {
  const context = useContext(AccommodationMemoryContext);
  if (!context) {
    throw new Error("useAccommodationMemory must be used within an AccommodationMemoryProvider");
  }
  return context;
}
