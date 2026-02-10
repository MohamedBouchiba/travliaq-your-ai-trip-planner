/**
 * persistExtractedEntities - Unified Entity Pipeline
 * 
 * Single point of entry for persisting extracted entities from ANY source.
 * Merges entities from intent classification and flight data with priority:
 * flightData > intent entities (flightData is more precise when available).
 */

export function persistExtractedEntities(
  intentEntities: Record<string, unknown> | undefined,
  flightData: Record<string, unknown> | null,
  widgetFlow: {
    setPendingTripDuration: (d: string) => void;
    setPendingPreferredMonth: (m: string) => void;
  },
  updateMemory?: (partial: Record<string, unknown>) => void,
) {
  const tripDuration =
    (flightData?.tripDuration as string | undefined) ||
    (intentEntities?.tripDuration as string | undefined);
  const preferredMonth =
    (flightData?.preferredMonth as string | undefined) ||
    (intentEntities?.preferredMonth as string | undefined);

  if (tripDuration && typeof tripDuration === "string") {
    widgetFlow.setPendingTripDuration(tripDuration);
  }
  if (preferredMonth && typeof preferredMonth === "string") {
    widgetFlow.setPendingPreferredMonth(preferredMonth);
  }

  // Persist multi-destination legs if present in flightData
  if (flightData?.legs && Array.isArray(flightData.legs) && (flightData.legs as unknown[]).length > 0 && updateMemory) {
    const legs = flightData.legs as Array<{ from: string; to: string; date?: string }>;
    const legMemories = legs.map((leg, i) => ({
      departure: leg.from ? { city: leg.from } : null,
      arrival: leg.to ? { city: leg.to } : null,
      date: leg.date ? new Date(leg.date) : null,
      id: `leg-${i}-${Date.now()}`,
    }));
    updateMemory({ legs: legMemories, tripType: "multi" as const });
  }
}
