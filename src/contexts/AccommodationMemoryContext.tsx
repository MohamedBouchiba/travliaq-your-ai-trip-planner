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

// Accommodation memory state
export interface AccommodationMemory {
  // Room configuration
  useAutoRooms: boolean;
  customRooms: RoomConfig[];

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

// Context value type
interface AccommodationMemoryContextValue {
  memory: AccommodationMemory;
  updateMemory: (partial: Partial<AccommodationMemory>) => void;
  resetMemory: () => void;

  // Budget helpers
  setBudgetPreset: (preset: BudgetPreset) => void;
  setCustomBudget: (min: number, max: number) => void;

  // Type helpers
  toggleType: (type: AccommodationType) => void;

  // Amenity helpers
  toggleAmenity: (amenity: EssentialAmenity) => void;

  // Rating helpers
  setMinRating: (rating: number | null) => void;

  // Room helpers
  getSuggestedRooms: () => RoomConfig[];
  setCustomRooms: (rooms: RoomConfig[]) => void;
  toggleAutoRooms: () => void;

  // Advanced filters
  updateAdvancedFilters: (filters: Partial<AdvancedFilters>) => void;

  // Computed values
  isReadyToSearch: boolean;
  getRoomsSummary: () => string;
}

// Budget presets values
export const BUDGET_PRESETS: Record<BudgetPreset, { min: number; max: number; label: string }> = {
  eco: { min: 0, max: 80, label: "Économique" },
  comfort: { min: 80, max: 180, label: "Confort" },
  premium: { min: 180, max: 500, label: "Premium" },
  custom: { min: 0, max: 500, label: "Personnalisé" },
};

// Initial state
const initialMemory: AccommodationMemory = {
  useAutoRooms: true,
  customRooms: [],
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
};

// Serialize for localStorage
function serializeMemory(memory: AccommodationMemory): string {
  return JSON.stringify(memory);
}

// Deserialize from localStorage
function deserializeMemory(json: string): AccommodationMemory | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...initialMemory,
      ...parsed,
      advancedFilters: {
        ...initialMemory.advancedFilters,
        ...parsed.advancedFilters,
      },
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

  const updateMemory = useCallback((partial: Partial<AccommodationMemory>) => {
    setMemory(prev => {
      const updated = { ...prev, ...partial };
      if (partial.advancedFilters) {
        updated.advancedFilters = { ...prev.advancedFilters, ...partial.advancedFilters };
      }
      return updated;
    });
  }, []);

  const resetMemory = useCallback(() => {
    setMemory(initialMemory);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Budget helpers
  const setBudgetPreset = useCallback((preset: BudgetPreset) => {
    const { min, max } = BUDGET_PRESETS[preset];
    setMemory(prev => ({
      ...prev,
      budgetPreset: preset,
      priceMin: min,
      priceMax: max,
    }));
  }, []);

  const setCustomBudget = useCallback((min: number, max: number) => {
    setMemory(prev => ({
      ...prev,
      budgetPreset: "custom",
      priceMin: min,
      priceMax: max,
    }));
  }, []);

  // Type helpers
  const toggleType = useCallback((type: AccommodationType) => {
    setMemory(prev => {
      if (type === "any") {
        return { ...prev, types: prev.types.includes("any") ? [] : ["any"] };
      }
      const newTypes = prev.types.filter(t => t !== "any");
      if (newTypes.includes(type)) {
        return { ...prev, types: newTypes.filter(t => t !== type) };
      }
      // Max 2 types
      if (newTypes.length >= 2) {
        return { ...prev, types: [newTypes[1], type] };
      }
      return { ...prev, types: [...newTypes, type] };
    });
  }, []);

  // Amenity helpers
  const toggleAmenity = useCallback((amenity: EssentialAmenity) => {
    setMemory(prev => {
      if (prev.amenities.includes(amenity)) {
        return { ...prev, amenities: prev.amenities.filter(a => a !== amenity) };
      }
      return { ...prev, amenities: [...prev.amenities, amenity] };
    });
  }, []);

  // Rating helpers
  const setMinRating = useCallback((rating: number | null) => {
    setMemory(prev => ({ ...prev, minRating: rating }));
  }, []);

  // Room helpers - suggest rooms based on travelers
  const getSuggestedRooms = useCallback((): RoomConfig[] => {
    const { adults, children, childrenAges } = travelMemory.travelers;
    const rooms: RoomConfig[] = [];

    // Simple logic: 2 adults = 1 room, family = 1 family room
    if (adults <= 2 && children === 0) {
      rooms.push({
        id: crypto.randomUUID(),
        adults,
        children: 0,
        childrenAges: [],
      });
    } else if (adults <= 2 && children > 0) {
      // Family room
      rooms.push({
        id: crypto.randomUUID(),
        adults,
        children,
        childrenAges,
      });
    } else {
      // Multiple rooms needed
      const roomsNeeded = Math.ceil(adults / 2);
      let remainingAdults = adults;
      let remainingChildren = children;
      const remainingChildrenAges = [...childrenAges];

      for (let i = 0; i < roomsNeeded; i++) {
        const roomAdults = Math.min(2, remainingAdults);
        remainingAdults -= roomAdults;
        
        // Distribute children to first room(s)
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
    setMemory(prev => ({
      ...prev,
      advancedFilters: { ...prev.advancedFilters, ...filters },
    }));
  }, []);

  // Computed values
  const isReadyToSearch = useMemo(() => {
    return hasDestinations && hasDates;
  }, [hasDestinations, hasDates]);

  const getRoomsSummary = useCallback((): string => {
    const rooms = memory.useAutoRooms ? getSuggestedRooms() : memory.customRooms;
    if (rooms.length === 0) return "Configuration automatique";
    
    if (rooms.length === 1) {
      const room = rooms[0];
      if (room.children > 0) {
        return `1 chambre familiale (${room.adults} ad. + ${room.children} enf.)`;
      }
      return room.adults === 1 ? "1 chambre simple" : "1 chambre double";
    }
    return `${rooms.length} chambres`;
  }, [memory.useAutoRooms, memory.customRooms, getSuggestedRooms]);

  const value: AccommodationMemoryContextValue = {
    memory,
    updateMemory,
    resetMemory,
    setBudgetPreset,
    setCustomBudget,
    toggleType,
    toggleAmenity,
    setMinRating,
    getSuggestedRooms,
    setCustomRooms,
    toggleAutoRooms,
    updateAdvancedFilters,
    isReadyToSearch,
    getRoomsSummary,
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
