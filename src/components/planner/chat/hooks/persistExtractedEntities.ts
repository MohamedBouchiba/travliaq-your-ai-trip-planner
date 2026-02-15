/**
 * persistExtractedEntities - Unified Entity Pipeline
 *
 * Single point of entry for persisting extracted entities from ANY source.
 * Merges entities from intent classification and flight data with priority:
 * flightData > intent entities (flightData is more precise when available).
 */

import type { FlightFormData } from "@/types/flight";
import type { FlightMemory } from "@/stores/hooks/useFlightMemoryStore";

export function persistExtractedEntities(
  intentEntities: Record<string, unknown> | undefined,
  flightData: FlightFormData | null,
  widgetFlow: {
    setPendingTripDuration: (d: string) => void;
    setPendingPreferredMonth: (m: string) => void;
  },
  updateMemory?: (partial: Partial<FlightMemory>) => void,
) {
  const tripDuration =
    flightData?.tripDuration ||
    (intentEntities?.tripDuration as string | undefined);
  const preferredMonth =
    flightData?.preferredMonth ||
    (intentEntities?.preferredMonth as string | undefined);

  if (tripDuration && typeof tripDuration === "string") {
    widgetFlow.setPendingTripDuration(tripDuration);
  }
  if (preferredMonth && typeof preferredMonth === "string") {
    widgetFlow.setPendingPreferredMonth(preferredMonth);
  }

  // Persist multi-destination legs if present in flightData
  if (flightData?.legs && flightData.legs.length > 0 && updateMemory) {
    const legMemories = flightData.legs.map((leg, i) => ({
      departure: leg.from ? { city: leg.from } : null,
      arrival: leg.to ? { city: leg.to } : null,
      date: leg.date ? new Date(leg.date) : null,
      id: `leg-${i}-${Date.now()}`,
    }));
    updateMemory({ legs: legMemories, tripType: "multi" });
  }
}
