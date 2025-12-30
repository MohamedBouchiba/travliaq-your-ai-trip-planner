import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";

const STORAGE_KEY = "travliaq_travel_memory";

// Destination info for multi-destination support
export interface DestinationInfo {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  arrivalDate?: Date;
  departureDate?: Date;
  nights?: number;
}

// Global travel memory shared across all widgets
export interface TravelMemory {
  // Travelers (transversal - shared by flights, accommodation, activities)
  travelers: {
    adults: number;
    children: number;
    childrenAges: number[];
    infants: number;
  };

  // Destinations (multi-destination supported)
  destinations: DestinationInfo[];

  // Trip dates
  departureDate: Date | null;
  returnDate: Date | null;

  // Active destination index (for accommodation/activities widgets)
  activeDestinationIndex: number;
}

// Context value type
interface TravelMemoryContextValue {
  memory: TravelMemory;
  updateMemory: (partial: Partial<TravelMemory>) => void;
  resetMemory: () => void;
  
  // Travelers helpers
  updateTravelers: (travelers: Partial<TravelMemory["travelers"]>) => void;
  getTotalTravelers: () => number;
  
  // Destinations helpers
  addDestination: (destination: Omit<DestinationInfo, "id">) => void;
  removeDestination: (id: string) => void;
  updateDestination: (id: string, update: Partial<DestinationInfo>) => void;
  setActiveDestination: (index: number) => void;
  getActiveDestination: () => DestinationInfo | null;

  // Serialization for persistence
  getSerializedState: () => Record<string, unknown>;
  
  // Computed values
  hasDestinations: boolean;
  hasDates: boolean;
  hasTravelers: boolean;
}

// Initial state
const initialMemory: TravelMemory = {
  travelers: {
    adults: 1,
    children: 0,
    childrenAges: [],
    infants: 0,
  },
  destinations: [],
  departureDate: null,
  returnDate: null,
  activeDestinationIndex: 0,
};

// Serialize for localStorage
function serializeMemory(memory: TravelMemory): string {
  return JSON.stringify({
    ...memory,
    departureDate: memory.departureDate?.toISOString() || null,
    returnDate: memory.returnDate?.toISOString() || null,
    destinations: memory.destinations.map(d => ({
      ...d,
      arrivalDate: d.arrivalDate?.toISOString() || null,
      departureDate: d.departureDate?.toISOString() || null,
    })),
  });
}

// Deserialize from localStorage
function deserializeMemory(json: string): TravelMemory | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let departureDate = parsed.departureDate ? new Date(parsed.departureDate) : null;
    let returnDate = parsed.returnDate ? new Date(parsed.returnDate) : null;

    // Reset past dates
    if (departureDate && departureDate < today) {
      departureDate = null;
      returnDate = null;
    }
    if (returnDate && returnDate < today) {
      returnDate = null;
    }

    return {
      ...initialMemory,
      ...parsed,
      departureDate,
      returnDate,
      destinations: (parsed.destinations || []).map((d: any) => ({
        ...d,
        arrivalDate: d.arrivalDate ? new Date(d.arrivalDate) : undefined,
        departureDate: d.departureDate ? new Date(d.departureDate) : undefined,
      })),
      travelers: {
        ...initialMemory.travelers,
        ...parsed.travelers,
      },
    };
  } catch {
    return null;
  }
}

// Load from localStorage
function loadFromStorage(): TravelMemory {
  if (typeof window === "undefined") return initialMemory;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialMemory;
    return deserializeMemory(stored) || initialMemory;
  } catch {
    return initialMemory;
  }
}

const TravelMemoryContext = createContext<TravelMemoryContextValue | null>(null);

export function TravelMemoryProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<TravelMemory>(() => loadFromStorage());
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate on mount (memory already loaded in useState initializer)
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, serializeMemory(memory));
    } catch (error) {
      console.warn("[TravelMemory] Failed to save:", error);
    }
  }, [memory, isHydrated]);

  const updateMemory = useCallback((partial: Partial<TravelMemory>) => {
    setMemory(prev => {
      const updated = { ...prev, ...partial };
      if (partial.travelers) {
        updated.travelers = { ...prev.travelers, ...partial.travelers };
      }
      if (partial.destinations) {
        updated.destinations = partial.destinations;
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

  // Travelers helpers
  const updateTravelers = useCallback((travelers: Partial<TravelMemory["travelers"]>) => {
    setMemory(prev => ({
      ...prev,
      travelers: { ...prev.travelers, ...travelers },
    }));
  }, []);

  const getTotalTravelers = useCallback(() => {
    return memory.travelers.adults + memory.travelers.children + memory.travelers.infants;
  }, [memory.travelers]);

  // Destinations helpers
  const addDestination = useCallback((destination: Omit<DestinationInfo, "id">) => {
    setMemory(prev => ({
      ...prev,
      destinations: [...prev.destinations, { ...destination, id: crypto.randomUUID() }],
    }));
  }, []);

  const removeDestination = useCallback((id: string) => {
    setMemory(prev => ({
      ...prev,
      destinations: prev.destinations.filter(d => d.id !== id),
      activeDestinationIndex: Math.min(prev.activeDestinationIndex, Math.max(0, prev.destinations.length - 2)),
    }));
  }, []);

  const updateDestination = useCallback((id: string, update: Partial<DestinationInfo>) => {
    setMemory(prev => ({
      ...prev,
      destinations: prev.destinations.map(d => d.id === id ? { ...d, ...update } : d),
    }));
  }, []);

  const setActiveDestination = useCallback((index: number) => {
    setMemory(prev => ({
      ...prev,
      activeDestinationIndex: Math.min(index, prev.destinations.length - 1),
    }));
  }, []);

  const getActiveDestination = useCallback(() => {
    if (memory.destinations.length === 0) return null;
    return memory.destinations[memory.activeDestinationIndex] || memory.destinations[0];
  }, [memory.destinations, memory.activeDestinationIndex]);

  // Computed values
  const hasDestinations = useMemo(() => memory.destinations.length > 0, [memory.destinations]);
  const hasDates = useMemo(() => Boolean(memory.departureDate), [memory.departureDate]);
  const hasTravelers = useMemo(() => memory.travelers.adults >= 1, [memory.travelers.adults]);

  // Get serialized state for persistence
  const getSerializedState = useCallback((): Record<string, unknown> => {
    return JSON.parse(serializeMemory(memory));
  }, [memory]);

  const value: TravelMemoryContextValue = {
    memory,
    updateMemory,
    resetMemory,
    updateTravelers,
    getTotalTravelers,
    addDestination,
    removeDestination,
    updateDestination,
    setActiveDestination,
    getActiveDestination,
    getSerializedState,
    hasDestinations,
    hasDates,
    hasTravelers,
  };

  return (
    <TravelMemoryContext.Provider value={value}>
      {children}
    </TravelMemoryContext.Provider>
  );
}

export function useTravelMemory() {
  const context = useContext(TravelMemoryContext);
  if (!context) {
    throw new Error("useTravelMemory must be used within a TravelMemoryProvider");
  }
  return context;
}
