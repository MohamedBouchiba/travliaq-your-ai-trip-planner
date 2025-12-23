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

// Flight memory state
export interface FlightMemory {
  // Mandatory fields
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  departureDate: Date | null;
  returnDate: Date | null;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  tripType: "roundtrip" | "oneway" | "multi";

  // Optional fields
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  directOnly: boolean;
  flexibleDates: boolean;
}

// Missing fields type
export type MissingField = "departure" | "arrival" | "departureDate" | "returnDate" | "passengers";

// Route point for map display
export interface MemoryRoutePoint {
  label: string;
  lat: number;
  lng: number;
  type: "departure" | "arrival";
}

// Context value type
interface FlightMemoryContextValue {
  memory: FlightMemory;
  updateMemory: (partial: Partial<FlightMemory>) => void;
  resetMemory: () => void;
  isReadyToSearch: boolean;
  missingFields: MissingField[];
  getMemorySummary: () => string;
  getRoutePoints: () => MemoryRoutePoint[];
}

// Initial state
const initialMemory: FlightMemory = {
  departure: null,
  arrival: null,
  departureDate: null,
  returnDate: null,
  passengers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  tripType: "roundtrip",
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
      
      return updated;
    });
  }, []);

  const resetMemory = useCallback(() => {
    setMemory(initialMemory);
  }, []);

  // Compute missing fields
  const missingFields = useMemo((): MissingField[] => {
    const missing: MissingField[] = [];
    
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
    if (memory.passengers.adults < 1) {
      missing.push("passengers");
    }
    
    return missing;
  }, [memory]);

  // Ready to search when all mandatory fields are filled
  const isReadyToSearch = useMemo(() => {
    return missingFields.length === 0;
  }, [missingFields]);

  // Get a summary of the current memory for the AI
  const getMemorySummary = useCallback(() => {
    const parts: string[] = [];
    
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
    
    const totalPassengers = memory.passengers.adults + memory.passengers.children + memory.passengers.infants;
    parts.push(`${totalPassengers} voyageur${totalPassengers > 1 ? "s" : ""}`);
    parts.push(`Type: ${memory.tripType === "roundtrip" ? "Aller-retour" : memory.tripType === "oneway" ? "Aller simple" : "Multi-destinations"}`);
    
    return parts.join(" | ");
  }, [memory]);

  // Get route points for map display - uses most precise coordinates available
  const getRoutePoints = useCallback((): MemoryRoutePoint[] => {
    const points: MemoryRoutePoint[] = [];
    
    if (memory.departure?.lat && memory.departure?.lng) {
      // Use airport name if available, otherwise city
      const label = memory.departure.iata 
        ? `${memory.departure.airport || memory.departure.city} (${memory.departure.iata})`
        : memory.departure.city || "Départ";
      points.push({
        label,
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
        lat: memory.arrival.lat,
        lng: memory.arrival.lng,
        type: "arrival",
      });
    }
    
    return points;
  }, [memory]);

  const value = useMemo(
    () => ({
      memory,
      updateMemory,
      resetMemory,
      isReadyToSearch,
      missingFields,
      getMemorySummary,
      getRoutePoints,
    }),
    [memory, updateMemory, resetMemory, isReadyToSearch, missingFields, getMemorySummary, getRoutePoints]
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
