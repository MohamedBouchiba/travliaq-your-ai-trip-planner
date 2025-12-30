import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from "react";

// localStorage key
const STORAGE_KEY = "travliaq_flight_memory";

// Airport info structure - stores as much info as possible
export interface AirportInfo {
  // Location hierarchy (most precise to least)
  airport?: string;      // Airport name (e.g. "Charles de Gaulle")
  iata?: string;         // IATA code (e.g. "CDG")
  city?: string;         // City name (e.g. "Paris")
  country?: string;      // Country name (e.g. "France")
  countryCode?: string;  // Country code (e.g. "FR")
  
  // Coordinates - always use the most precise available
  lat?: number;
  lng?: number;
}

// A single leg for multi-destination trips
export interface FlightLegMemory {
  id: string;
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  date: Date | null;
}

// Saved state for each trip type to allow switching without data loss
export interface TripTypeData {
  roundtrip: {
    departure: AirportInfo | null;
    arrival: AirportInfo | null;
    departureDate: Date | null;
    returnDate: Date | null;
  };
  oneway: {
    departure: AirportInfo | null;
    arrival: AirportInfo | null;
    departureDate: Date | null;
  };
  multi: {
    legs: FlightLegMemory[];
  };
}

// Flight memory state
export interface FlightMemory {
  // Trip type determines how we interpret departure/arrival/legs
  tripType: "roundtrip" | "oneway" | "multi";

  // For roundtrip and oneway:
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  departureDate: Date | null;
  returnDate: Date | null; // Only for roundtrip

  // For multi-destination:
  legs: FlightLegMemory[];

  // Saved data for each trip type (allows switching without losing data)
  savedTripData: TripTypeData;

  // Passengers (same for all trip types)
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };

  // Optional fields
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  directOnly: boolean;
  flexibleDates: boolean;
}

// Missing fields type
export type MissingField = "departure" | "arrival" | "departureDate" | "returnDate" | "passengers" | "legs";

// Route point for map display
export interface MemoryRoutePoint {
  label: string;
  city?: string; // The actual city name (separate from airport name)
  country?: string;
  lat: number;
  lng: number;
  type: "departure" | "arrival" | "waypoint";
  legIndex?: number;
}

// Context value type
interface FlightMemoryContextValue {
  memory: FlightMemory;
  updateMemory: (partial: Partial<FlightMemory>) => void;
  resetMemory: () => void;
  isReadyToSearch: boolean;
  hasCompleteInfo: boolean;
  needsAirportSelection: { departure: boolean; arrival: boolean };
  missingFields: MissingField[];
  getMemorySummary: () => string;
  getRoutePoints: () => MemoryRoutePoint[];
  // Multi-destination helpers
  addLeg: () => void;
  removeLeg: (legId: string) => void;
  updateLeg: (legId: string, update: Partial<FlightLegMemory>) => void;
}

// Initial saved trip data
const initialSavedTripData: TripTypeData = {
  roundtrip: {
    departure: null,
    arrival: null,
    departureDate: null,
    returnDate: null,
  },
  oneway: {
    departure: null,
    arrival: null,
    departureDate: null,
  },
  multi: {
    legs: [],
  },
};

// Initial state
const initialMemory: FlightMemory = {
  tripType: "roundtrip",
  departure: null,
  arrival: null,
  departureDate: null,
  returnDate: null,
  legs: [],
  savedTripData: initialSavedTripData,
  passengers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  cabinClass: "economy",
  directOnly: false,
  flexibleDates: false,
};

// Helper to serialize memory (convert Dates to ISO strings)
function serializeMemory(memory: FlightMemory): string {
  const serializeTripData = (data: TripTypeData) => ({
    roundtrip: {
      ...data.roundtrip,
      departureDate: data.roundtrip.departureDate?.toISOString() || null,
      returnDate: data.roundtrip.returnDate?.toISOString() || null,
    },
    oneway: {
      ...data.oneway,
      departureDate: data.oneway.departureDate?.toISOString() || null,
    },
    multi: {
      legs: data.multi.legs.map(leg => ({
        ...leg,
        date: leg.date?.toISOString() || null,
      })),
    },
  });

  return JSON.stringify({
    ...memory,
    departureDate: memory.departureDate?.toISOString() || null,
    returnDate: memory.returnDate?.toISOString() || null,
    legs: memory.legs.map(leg => ({
      ...leg,
      date: leg.date?.toISOString() || null,
    })),
    savedTripData: serializeTripData(memory.savedTripData),
  });
}

// Helper to deserialize memory (convert ISO strings back to Dates)
function deserializeMemory(json: string): FlightMemory | null {
  try {
    const parsed = JSON.parse(json);
    
    // Validate basic structure
    if (!parsed || typeof parsed !== "object") return null;

    // Helper to deserialize saved trip data
    const deserializeTripData = (data: any): TripTypeData => {
      if (!data) return initialSavedTripData;
      return {
        roundtrip: {
          departure: data.roundtrip?.departure || null,
          arrival: data.roundtrip?.arrival || null,
          departureDate: data.roundtrip?.departureDate ? new Date(data.roundtrip.departureDate) : null,
          returnDate: data.roundtrip?.returnDate ? new Date(data.roundtrip.returnDate) : null,
        },
        oneway: {
          departure: data.oneway?.departure || null,
          arrival: data.oneway?.arrival || null,
          departureDate: data.oneway?.departureDate ? new Date(data.oneway.departureDate) : null,
        },
        multi: {
          legs: (data.multi?.legs || []).map((leg: any) => ({
            ...leg,
            date: leg.date ? new Date(leg.date) : null,
          })),
        },
      };
    };
    
    // Convert date strings back to Date objects
    const memory: FlightMemory = {
      ...initialMemory,
      ...parsed,
      departureDate: parsed.departureDate ? new Date(parsed.departureDate) : null,
      returnDate: parsed.returnDate ? new Date(parsed.returnDate) : null,
      legs: (parsed.legs || []).map((leg: any) => ({
        ...leg,
        date: leg.date ? new Date(leg.date) : null,
      })),
      savedTripData: deserializeTripData(parsed.savedTripData),
      passengers: {
        ...initialMemory.passengers,
        ...parsed.passengers,
      },
    };
    
    // Validate dates are not in the past (reset if they are)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (memory.departureDate && memory.departureDate < today) {
      memory.departureDate = null;
      memory.returnDate = null;
    }
    if (memory.returnDate && memory.returnDate < today) {
      memory.returnDate = null;
    }
    
    return memory;
  } catch {
    return null;
  }
}

// Load initial state from localStorage
function loadFromStorage(): FlightMemory {
  if (typeof window === "undefined") return initialMemory;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialMemory;
    
    const parsed = deserializeMemory(stored);
    return parsed || initialMemory;
  } catch {
    return initialMemory;
  }
}

const FlightMemoryContext = createContext<FlightMemoryContextValue | null>(null);

export function FlightMemoryProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage
  const [memory, setMemory] = useState<FlightMemory>(() => loadFromStorage());
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = loadFromStorage();
    setMemory(stored);
    setIsHydrated(true);
  }, []);

  // Persist to localStorage whenever memory changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, serializeMemory(memory));
    } catch (error) {
      console.warn("[FlightMemory] Failed to save to localStorage:", error);
    }
  }, [memory, isHydrated]);

  const updateMemory = useCallback((partial: Partial<FlightMemory>) => {
    setMemory((prev) => {
      let updated = { ...prev, ...partial };
      
      // Handle nested passengers update
      if (partial.passengers) {
        updated.passengers = { ...prev.passengers, ...partial.passengers };
      }

      // Handle nested legs update
      if (partial.legs) {
        updated.legs = partial.legs;
      }

      // Handle trip type change - save current state and restore saved state
      if (partial.tripType && partial.tripType !== prev.tripType) {
        const newTripType = partial.tripType;
        const oldTripType = prev.tripType;

        console.log("[FlightMemory] Trip type change:", oldTripType, "->", newTripType);
        console.log("[FlightMemory] Current legs to save:", prev.legs.length, prev.legs.map(l => l.departure?.city + " -> " + l.arrival?.city));
        console.log("[FlightMemory] Current savedTripData.multi.legs:", prev.savedTripData.multi.legs.length);

        // Deep copy savedTripData to avoid mutation issues
        const newSavedTripData: TripTypeData = {
          roundtrip: { ...prev.savedTripData.roundtrip },
          oneway: { ...prev.savedTripData.oneway },
          multi: { 
            legs: [...prev.savedTripData.multi.legs], 
          },
        };
        
        // Save current state to savedTripData
        if (oldTripType === "roundtrip") {
          newSavedTripData.roundtrip = {
            departure: prev.departure,
            arrival: prev.arrival,
            departureDate: prev.departureDate,
            returnDate: prev.returnDate,
          };
        } else if (oldTripType === "oneway") {
          newSavedTripData.oneway = {
            departure: prev.departure,
            arrival: prev.arrival,
            departureDate: prev.departureDate,
          };
        } else if (oldTripType === "multi") {
          // Deep copy legs to preserve them
          newSavedTripData.multi = {
            legs: prev.legs.map(leg => ({ ...leg })),
          };
          console.log("[FlightMemory] Saved multi legs:", newSavedTripData.multi.legs.length);
        }

        // Restore saved state for new trip type
        if (newTripType === "roundtrip") {
          const saved = newSavedTripData.roundtrip;
          updated.departure = saved.departure;
          updated.arrival = saved.arrival;
          updated.departureDate = saved.departureDate;
          updated.returnDate = saved.returnDate;
          updated.legs = [];
        } else if (newTripType === "oneway") {
          const saved = newSavedTripData.oneway;
          // If coming from roundtrip, use roundtrip data if oneway is empty
          if (!saved.departure && prev.tripType === "roundtrip") {
            updated.departure = prev.departure;
            updated.arrival = prev.arrival;
            updated.departureDate = prev.departureDate;
          } else {
            updated.departure = saved.departure;
            updated.arrival = saved.arrival;
            updated.departureDate = saved.departureDate;
          }
          updated.returnDate = null;
          updated.legs = [];
        } else if (newTripType === "multi") {
          const saved = newSavedTripData.multi;
          console.log("[FlightMemory] Restoring multi legs:", saved.legs.length, saved.legs.map(l => l.departure?.city + " -> " + l.arrival?.city));
          
          // If legs are empty, create initial legs from current departure/arrival
          if (saved.legs.length === 0 && prev.departure && prev.arrival) {
            updated.legs = [
              {
                id: crypto.randomUUID(),
                departure: prev.departure,
                arrival: prev.arrival,
                date: prev.departureDate,
              },
              {
                id: crypto.randomUUID(),
                departure: prev.arrival,
                arrival: null,
                date: null,
              },
            ];
          } else if (saved.legs.length > 0) {
            // Restore saved legs with deep copy
            updated.legs = saved.legs.map(leg => ({ ...leg }));
          } else {
            // Empty multi with placeholder legs
            updated.legs = [
              { id: crypto.randomUUID(), departure: null, arrival: null, date: null },
              { id: crypto.randomUUID(), departure: null, arrival: null, date: null },
            ];
          }
          updated.departure = null;
          updated.arrival = null;
          updated.departureDate = null;
          updated.returnDate = null;
        }

        updated.savedTripData = newSavedTripData;
        console.log("[FlightMemory] Final updated.legs:", updated.legs.length);
        console.log("[FlightMemory] Final savedTripData.multi.legs:", newSavedTripData.multi.legs.length);
      }
      
      return updated;
    });
  }, []);

  const resetMemory = useCallback(() => {
    setMemory(initialMemory);
    // Also clear from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }, []);

  // Multi-destination helpers
  const addLeg = useCallback(() => {
    setMemory((prev) => ({
      ...prev,
      legs: [
        ...prev.legs,
        {
          id: crypto.randomUUID(),
          departure: null,
          arrival: null,
          date: null,
        },
      ],
    }));
  }, []);

  const removeLeg = useCallback((legId: string) => {
    setMemory((prev) => ({
      ...prev,
      legs: prev.legs.filter((l) => l.id !== legId),
    }));
  }, []);

  const updateLeg = useCallback((legId: string, update: Partial<FlightLegMemory>) => {
    setMemory((prev) => ({
      ...prev,
      legs: prev.legs.map((l) => (l.id === legId ? { ...l, ...update } : l)),
    }));
  }, []);

  // Compute missing fields (depends on tripType)
  const missingFields = useMemo((): MissingField[] => {
    const missing: MissingField[] = [];

    if (memory.tripType === "multi") {
      // For multi-destination, we need at least 2 legs with complete info
      const validLegs = memory.legs.filter(
        (l) => (l.departure?.iata || l.departure?.city) && (l.arrival?.iata || l.arrival?.city) && l.date
      );
      if (validLegs.length < 2) {
        missing.push("legs");
      }
    } else {
      // Roundtrip or oneway
      if (!memory.departure?.iata && !memory.departure?.city) {
        missing.push("departure");
      }
      if (!memory.arrival?.iata && !memory.arrival?.city) {
        missing.push("arrival");
      }
      if (!memory.departureDate) {
        missing.push("departureDate");
      }
      // Return date only required for roundtrip
      if (memory.tripType === "roundtrip" && !memory.returnDate) {
        missing.push("returnDate");
      }
    }

    if (memory.passengers.adults < 1) {
      missing.push("passengers");
    }
    
    return missing;
  }, [memory]);

  // Check if we need airport selection (have city but no IATA)
  const needsAirportSelection = useMemo(() => ({
    departure: Boolean(memory.departure?.city && !memory.departure?.iata),
    arrival: Boolean(memory.arrival?.city && !memory.arrival?.iata),
  }), [memory.departure, memory.arrival]);

  // Has complete basic info (cities, dates) but may still need airport selection
  const hasCompleteInfo = useMemo(() => {
    return missingFields.length === 0;
  }, [missingFields]);

  // Ready to search when all mandatory fields are filled AND airports are selected
  const isReadyToSearch = useMemo(() => {
    if (memory.tripType === "multi") {
      // For multi, each leg must have IATA codes
      const allLegsReady = memory.legs.every(
        (l) => l.departure?.iata && l.arrival?.iata && l.date
      );
      return hasCompleteInfo && allLegsReady;
    }
    return hasCompleteInfo && !needsAirportSelection.departure && !needsAirportSelection.arrival;
  }, [hasCompleteInfo, needsAirportSelection, memory.tripType, memory.legs]);

  // Get a summary of the current memory for the AI
  const getMemorySummary = useCallback(() => {
    const parts: string[] = [];

    const tripLabel =
      memory.tripType === "roundtrip"
        ? "Aller-retour"
        : memory.tripType === "oneway"
        ? "Aller simple"
        : "Multi-destinations";
    parts.push(`Type: ${tripLabel}`);

    if (memory.tripType === "multi") {
      memory.legs.forEach((leg, i) => {
        const dep = leg.departure?.iata || leg.departure?.city || "?";
        const arr = leg.arrival?.iata || leg.arrival?.city || "?";
        const date = leg.date ? leg.date.toLocaleDateString("fr-FR") : "?";
        parts.push(`Étape ${i + 1}: ${dep} → ${arr} (${date})`);
      });
    } else {
      if (memory.departure?.city || memory.departure?.iata) {
        let depStr = memory.departure.airport || memory.departure.city || "";
        if (memory.departure.iata) depStr += ` (${memory.departure.iata})`;
        if (memory.departure.country) depStr += `, ${memory.departure.country}`;
        parts.push(`Départ: ${depStr}`);
      }
      if (memory.arrival?.city || memory.arrival?.iata) {
        let arrStr = memory.arrival.airport || memory.arrival.city || "";
        if (memory.arrival.iata) arrStr += ` (${memory.arrival.iata})`;
        if (memory.arrival.country) arrStr += `, ${memory.arrival.country}`;
        parts.push(`Arrivée: ${arrStr}`);
      }
      if (memory.departureDate) {
        parts.push(`Date départ: ${memory.departureDate.toLocaleDateString("fr-FR")}`);
      }
      if (memory.returnDate) {
        parts.push(`Date retour: ${memory.returnDate.toLocaleDateString("fr-FR")}`);
      }
    }
    
    const totalPassengers = memory.passengers.adults + memory.passengers.children + memory.passengers.infants;
    parts.push(`${totalPassengers} voyageur${totalPassengers > 1 ? "s" : ""}`);
    
    return parts.join(" | ");
  }, [memory]);

  // Get route points for map display - uses most precise coordinates available
  const getRoutePoints = useCallback((): MemoryRoutePoint[] => {
    const points: MemoryRoutePoint[] = [];

    if (memory.tripType === "multi") {
      // For multi-destination, we need to build a chain of points
      memory.legs.forEach((leg, idx) => {
        // Add departure of each leg (but avoid duplicates)
        if (leg.departure?.lat && leg.departure?.lng) {
          const label = leg.departure.iata
            ? `${leg.departure.airport || leg.departure.city} (${leg.departure.iata})`
            : leg.departure.city || `Étape ${idx + 1}`;
          
          // Check if this point already exists (from previous leg's arrival)
          const lastPoint = points[points.length - 1];
          const isDuplicate = lastPoint && 
            Math.abs(lastPoint.lat - leg.departure.lat) < 0.01 && 
            Math.abs(lastPoint.lng - leg.departure.lng) < 0.01;
          
          if (!isDuplicate) {
            points.push({
              label,
              city: leg.departure.city,
              country: leg.departure.country,
              lat: leg.departure.lat,
              lng: leg.departure.lng,
              type: idx === 0 ? "departure" : "waypoint",
              legIndex: idx,
            });
          }
        }
        
        // Add arrival of each leg
        if (leg.arrival?.lat && leg.arrival?.lng) {
          const label = leg.arrival.iata
            ? `${leg.arrival.airport || leg.arrival.city} (${leg.arrival.iata})`
            : leg.arrival.city || "Destination";
          points.push({
            label,
            city: leg.arrival.city,
            country: leg.arrival.country,
            lat: leg.arrival.lat,
            lng: leg.arrival.lng,
            type: idx === memory.legs.length - 1 ? "arrival" : "waypoint",
            legIndex: idx,
          });
        }
      });
    } else {
      if (memory.departure?.lat && memory.departure?.lng) {
        const label = memory.departure.iata 
          ? `${memory.departure.airport || memory.departure.city} (${memory.departure.iata})`
          : memory.departure.city || "Départ";
        points.push({
          label,
          city: memory.departure.city,
          country: memory.departure.country,
          lat: memory.departure.lat,
          lng: memory.departure.lng,
          type: "departure",
        });
      }
      
      if (memory.arrival?.lat && memory.arrival?.lng) {
        const label = memory.arrival.iata
          ? `${memory.arrival.airport || memory.arrival.city} (${memory.arrival.iata})`
          : memory.arrival.city || "Arrivée";
        points.push({
          label,
          city: memory.arrival.city,
          country: memory.arrival.country,
          lat: memory.arrival.lat,
          lng: memory.arrival.lng,
          type: "arrival",
        });
      }
    }
    
    return points;
  }, [memory]);

  const value = useMemo(
    () => ({
      memory,
      updateMemory,
      resetMemory,
      isReadyToSearch,
      hasCompleteInfo,
      needsAirportSelection,
      missingFields,
      getMemorySummary,
      getRoutePoints,
      addLeg,
      removeLeg,
      updateLeg,
    }),
    [memory, updateMemory, resetMemory, isReadyToSearch, hasCompleteInfo, needsAirportSelection, missingFields, getMemorySummary, getRoutePoints, addLeg, removeLeg, updateLeg]
  );

  return (
    <FlightMemoryContext.Provider value={value}>
      {children}
    </FlightMemoryContext.Provider>
  );
}

export function useFlightMemory() {
  const context = useContext(FlightMemoryContext);
  if (!context) {
    throw new Error("useFlightMemory must be used within a FlightMemoryProvider");
  }
  return context;
}

// Export initial memory for resetting
export { initialMemory };
