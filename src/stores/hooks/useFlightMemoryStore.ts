/**
 * useFlightMemoryStore - Drop-in replacement for useFlightMemory (Context)
 * 
 * This hook provides the exact same API as FlightMemoryContext
 * but uses Zustand under the hood for better performance.
 * 
 * Migration: Replace `useFlightMemory` import with `useFlightMemoryStore`
 */

import { useMemo, useCallback } from 'react';
import { usePlannerStoreV2 } from '../plannerStoreV2';
import type { AirportInfo, FlightLegMemory, TripType, CabinClass, FlightPassengers } from '../types';

// Re-export types for compatibility
export type { AirportInfo, FlightLegMemory, TripType, CabinClass, FlightPassengers };

// Missing fields type (same as Context)
export type MissingField = "departure" | "arrival" | "departureDate" | "returnDate" | "passengers" | "legs";

// Route point for map display
export interface MemoryRoutePoint {
  label: string;
  city?: string;
  country?: string;
  lat: number;
  lng: number;
  type: "departure" | "arrival" | "waypoint";
  legIndex?: number;
}

// Memory structure (mirrors Context)
export interface FlightMemory {
  tripType: TripType;
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  departureDate: Date | null;
  returnDate: Date | null;
  legs: FlightLegMemory[];
  passengers: FlightPassengers;
  cabinClass: CabinClass;
  directOnly: boolean;
  flexibleDates: boolean;
}

// Context-compatible return type
export interface FlightMemoryStoreValue {
  memory: FlightMemory;
  updateMemory: (partial: Partial<FlightMemory>) => void;
  resetMemory: () => void;
  isReadyToSearch: boolean;
  hasCompleteInfo: boolean;
  needsAirportSelection: { departure: boolean; arrival: boolean };
  missingFields: MissingField[];
  getMemorySummary: () => string;
  getRoutePoints: () => MemoryRoutePoint[];
  getSerializedState: () => Record<string, unknown>;
  addLeg: () => void;
  removeLeg: (legId: string) => void;
  updateLeg: (legId: string, update: Partial<FlightLegMemory>) => void;
}

/**
 * useFlightMemoryStore - Zustand-based replacement for useFlightMemory
 */
export function useFlightMemoryStore(): FlightMemoryStoreValue {
  const store = usePlannerStoreV2();

  // Build memory object (mirrors Context structure)
  const memory = useMemo<FlightMemory>(() => ({
    tripType: store.tripType,
    departure: store.departure,
    arrival: store.arrival,
    departureDate: store.flightDepartureDate,
    returnDate: store.flightReturnDate,
    legs: store.legs,
    passengers: store.passengers,
    cabinClass: store.cabinClass,
    directOnly: store.directOnly,
    flexibleDates: store.flexibleDates,
  }), [
    store.tripType,
    store.departure,
    store.arrival,
    store.flightDepartureDate,
    store.flightReturnDate,
    store.legs,
    store.passengers,
    store.cabinClass,
    store.directOnly,
    store.flexibleDates,
  ]);

  // Compute missing fields
  const missingFields = useMemo((): MissingField[] => {
    const missing: MissingField[] = [];

    if (memory.tripType === "multi") {
      const validLegs = memory.legs.filter(
        (l) => (l.departure?.iata || l.departure?.city) && (l.arrival?.iata || l.arrival?.city) && l.date
      );
      if (validLegs.length < 2) {
        missing.push("legs");
      }
    } else {
      if (!memory.departure?.iata && !memory.departure?.city) {
        missing.push("departure");
      }
      if (!memory.arrival?.iata && !memory.arrival?.city) {
        missing.push("arrival");
      }
      if (!memory.departureDate) {
        missing.push("departureDate");
      }
      if (memory.tripType === "roundtrip" && !memory.returnDate) {
        missing.push("returnDate");
      }
    }

    if (memory.passengers.adults < 1) {
      missing.push("passengers");
    }

    return missing;
  }, [memory]);

  // Needs airport selection
  const needsAirportSelection = useMemo(() => ({
    departure: Boolean(memory.departure?.city && !memory.departure?.iata),
    arrival: Boolean(memory.arrival?.city && !memory.arrival?.iata),
  }), [memory.departure, memory.arrival]);

  // Has complete info
  const hasCompleteInfo = missingFields.length === 0;

  // Ready to search
  const isReadyToSearch = useMemo(() => {
    if (memory.tripType === "multi") {
      const allLegsReady = memory.legs.every(
        (l) => l.departure?.iata && l.arrival?.iata && l.date
      );
      return hasCompleteInfo && allLegsReady;
    }
    return hasCompleteInfo && !needsAirportSelection.departure && !needsAirportSelection.arrival;
  }, [hasCompleteInfo, needsAirportSelection, memory.tripType, memory.legs]);

  // Update memory (Context-compatible API)
  const updateMemory = useCallback((partial: Partial<FlightMemory>) => {
    if (partial.tripType !== undefined) {
      store.setTripType(partial.tripType);
    }
    if (partial.departure !== undefined) {
      store.setDeparture(partial.departure);
    }
    if (partial.arrival !== undefined) {
      store.setArrival(partial.arrival);
    }
    if (partial.departureDate !== undefined || partial.returnDate !== undefined) {
      store.setFlightDates(
        partial.departureDate ?? store.flightDepartureDate,
        partial.returnDate ?? store.flightReturnDate
      );
    }
    if (partial.passengers !== undefined) {
      store.setPassengers(partial.passengers);
    }
    if (partial.cabinClass !== undefined) {
      store.setCabinClass(partial.cabinClass);
    }
    if (partial.directOnly !== undefined) {
      store.setDirectOnly(partial.directOnly);
    }
    if (partial.flexibleDates !== undefined) {
      store.setFlexibleDates(partial.flexibleDates);
    }
  }, [store]);

  // Reset memory
  const resetMemory = useCallback(() => {
    store.resetFlight();
  }, [store]);

  // Get memory summary
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
      // Build a compact route chain: BRU → Istanbul → Doha → Muscat → Bangkok → BRU
      const cities: string[] = [];
      memory.legs.forEach((leg) => {
        const dep = leg.departure?.iata || leg.departure?.city || "?";
        if (cities.length === 0 || cities[cities.length - 1] !== dep) {
          cities.push(dep);
        }
        const arr = leg.arrival?.iata || leg.arrival?.city || "?";
        cities.push(arr);
      });
      if (cities.length > 0) {
        parts.push(cities.join(" → "));
      }
      // Also show dates if any legs have them
      const datesStr = memory.legs
        .filter(l => l.date)
        .map((l, i) => `Étape ${i + 1}: ${l.date!.toLocaleDateString("fr-FR")}`)
        .join(", ");
      if (datesStr) parts.push(datesStr);
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

  // Get route points for map
  const getRoutePoints = useCallback((): MemoryRoutePoint[] => {
    const points: MemoryRoutePoint[] = [];

    if (memory.tripType === "multi") {
      memory.legs.forEach((leg, idx) => {
        if (leg.departure?.lat && leg.departure?.lng) {
          const label = leg.departure.iata
            ? `${leg.departure.airport || leg.departure.city} (${leg.departure.iata})`
            : leg.departure.city || `Étape ${idx + 1}`;

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

  // Get serialized state
  const getSerializedState = useCallback((): Record<string, unknown> => {
    return {
      tripType: memory.tripType,
      departure: memory.departure,
      arrival: memory.arrival,
      departureDate: memory.departureDate?.toISOString() ?? null,
      returnDate: memory.returnDate?.toISOString() ?? null,
      legs: memory.legs.map(leg => ({
        ...leg,
        date: leg.date?.toISOString() ?? null,
      })),
      passengers: memory.passengers,
      cabinClass: memory.cabinClass,
      directOnly: memory.directOnly,
      flexibleDates: memory.flexibleDates,
    };
  }, [memory]);

  return {
    memory,
    updateMemory,
    resetMemory,
    isReadyToSearch,
    hasCompleteInfo,
    needsAirportSelection,
    missingFields,
    getMemorySummary,
    getRoutePoints,
    getSerializedState,
    addLeg: store.addLeg,
    removeLeg: store.removeLeg,
    updateLeg: store.updateLeg,
  };
}
