import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

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

// Initial state
const initialMemory: FlightMemory = {
  tripType: "roundtrip",
  departure: null,
  arrival: null,
  departureDate: null,
  returnDate: null,
  legs: [],
  passengers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  cabinClass: "economy",
  directOnly: false,
  flexibleDates: false,
};

const FlightMemoryContext = createContext<FlightMemoryContextValue | null>(null);

export function FlightMemoryProvider({ children }: { children: ReactNode }) {
  const [memory, setMemory] = useState<FlightMemory>(initialMemory);

  const updateMemory = useCallback((partial: Partial<FlightMemory>) => {
    setMemory((prev) => {
      const updated = { ...prev, ...partial };
      
      // Handle nested passengers update
      if (partial.passengers) {
        updated.passengers = { ...prev.passengers, ...partial.passengers };
      }

      // Handle nested legs update
      if (partial.legs) {
        updated.legs = partial.legs;
      }
      
      return updated;
    });
  }, []);

  const resetMemory = useCallback(() => {
    setMemory(initialMemory);
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
      memory.legs.forEach((leg, idx) => {
        if (leg.departure?.lat && leg.departure?.lng) {
          const label = leg.departure.iata
            ? `${leg.departure.airport || leg.departure.city} (${leg.departure.iata})`
            : leg.departure.city || `Étape ${idx + 1}`;
          points.push({
            label,
            lat: leg.departure.lat,
            lng: leg.departure.lng,
            type: idx === 0 ? "departure" : "waypoint",
            legIndex: idx,
          });
        }
        // Add arrival of last leg
        if (idx === memory.legs.length - 1 && leg.arrival?.lat && leg.arrival?.lng) {
          const label = leg.arrival.iata
            ? `${leg.arrival.airport || leg.arrival.city} (${leg.arrival.iata})`
            : leg.arrival.city || "Arrivée finale";
          points.push({
            label,
            lat: leg.arrival.lat,
            lng: leg.arrival.lng,
            type: "arrival",
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
