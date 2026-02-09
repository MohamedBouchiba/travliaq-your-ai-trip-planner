/**
 * Flight Data to Memory Converter
 * Converts FlightFormData from chat responses to FlightMemory updates
 * Preserves existing GPS-detected airport info when merging
 */

import type { AirportInfo, MissingField, FlightMemory } from "@/stores/hooks";
import type { FlightFormData } from "@/types/flight";
import i18n from "@/i18n/config";

/**
 * Memory update structure for flight data
 */
export interface FlightMemoryUpdate {
  departure?: AirportInfo | null;
  arrival?: AirportInfo | null;
  departureDate?: Date | null;
  returnDate?: Date | null;
  passengers?: { adults: number; children: number; infants: number };
  tripType?: "roundtrip" | "oneway" | "multi";
  legs?: Array<{ departure: AirportInfo | null; arrival: AirportInfo | null; date: Date | null; id: string }>;
}

/**
 * Merge new airport info with existing, preserving GPS-detected data
 * If existing has IATA and new only has city, keep existing if cities match
 */
function mergeAirportInfo(
  existing: AirportInfo | null | undefined,
  newCity: string
): AirportInfo {
  // If we have existing airport info with IATA (e.g., from GPS detection)
  if (existing?.iata && existing?.city) {
    // If the new city matches the existing city, preserve all GPS data
    const existingCityNorm = existing.city.toLowerCase().trim();
    const newCityNorm = newCity.toLowerCase().trim();
    
    if (existingCityNorm === newCityNorm || 
        existingCityNorm.includes(newCityNorm) || 
        newCityNorm.includes(existingCityNorm)) {
      // City matches, keep existing with all GPS data
      return existing;
    }
  }
  
  // New city or different city, create fresh entry
  return { city: newCity };
}

/**
 * Convert FlightFormData (from AI response) to FlightMemory updates
 * Accepts optional currentMemory to preserve GPS-detected airport info
 */
export function flightDataToMemory(
  flightData: FlightFormData,
  currentMemory?: FlightMemory
): FlightMemoryUpdate {
  const updates: FlightMemoryUpdate = {};

  if (flightData.from) {
    updates.departure = mergeAirportInfo(currentMemory?.departure, flightData.from);
  }
  if (flightData.to) {
    updates.arrival = mergeAirportInfo(currentMemory?.arrival, flightData.to);
  }
  if (flightData.departureDate) {
    updates.departureDate = new Date(flightData.departureDate);
  }
  if (flightData.returnDate) {
    updates.returnDate = new Date(flightData.returnDate);
  }

  // Handle new adults/children/infants format
  if (
    flightData.adults !== undefined ||
    flightData.children !== undefined ||
    flightData.infants !== undefined
  ) {
    updates.passengers = {
      adults: flightData.adults || 1,
      children: flightData.children || 0,
      infants: flightData.infants || 0,
    };
  } else if (flightData.passengers) {
    // Legacy format: single passengers count
    updates.passengers = { adults: flightData.passengers, children: 0, infants: 0 };
  }

  if (flightData.tripType) {
    updates.tripType = flightData.tripType;
  }

  // Handle multi-destination legs
  if (flightData.legs && flightData.legs.length > 0 && flightData.tripType === "multi") {
    updates.legs = flightData.legs.map((leg, i) => ({
      departure: leg.from ? { city: leg.from } : null,
      arrival: leg.to ? { city: leg.to } : null,
      date: leg.date ? new Date(leg.date) : null,
      id: `leg-${i}-${Date.now()}`,
    }));
    // For multi-dest, set departure/arrival from first/last leg for backwards compat
    if (flightData.legs.length > 0) {
      const firstLeg = flightData.legs[0];
      const lastLeg = flightData.legs[flightData.legs.length - 1];
      if (firstLeg.from && !updates.departure) {
        updates.departure = { city: firstLeg.from };
      }
      if (lastLeg.to && !updates.arrival) {
        updates.arrival = { city: lastLeg.to };
      }
    }
  }

  return updates;
}

/**
 * Get field label for missing fields
 */
export function getMissingFieldLabel(field: MissingField): string {
  const t = i18n.t.bind(i18n);
  
  switch (field) {
    case "departure":
      return t("planner.missing.departure");
    case "arrival":
      return t("planner.missing.arrival");
    case "departureDate":
      return t("planner.missing.departureDate");
    case "returnDate":
      return t("planner.missing.returnDate");
    case "passengers":
      return t("planner.missing.passengers");
    case "legs":
      return t("planner.missing.legs");
    default:
      return field;
  }
}

/**
 * Build missing fields list from memory context string
 */
export function formatMissingFieldsMessage(missingFields: MissingField[]): string {
  const t = i18n.t.bind(i18n);
  
  if (missingFields.length === 0) {
    return t("planner.missing.readyToSearch");
  }
  return missingFields.map(getMissingFieldLabel).join(", ");
}
