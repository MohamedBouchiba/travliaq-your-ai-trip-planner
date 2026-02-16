/**
 * MemoizedSmartSuggestions - Performance-optimized wrapper for SmartSuggestions
 * Memoizes the context object to prevent re-renders on every parent update
 */

import { memo, useMemo } from "react";
import { SmartSuggestions, type DynamicSuggestion } from "./SmartSuggestions";
import type { DestinationSuggestion } from "@/types/destinations";

// Type for inspire flow step
export type InspireFlowStep = 'idle' | 'style' | 'interests' | 'extra' | 'must_haves' | 'dietary' | 'loading' | 'results';

// Memory shape (subset of FlightMemory needed for context)
interface MemoryForContext {
  arrival?: { city?: string };
  departure?: { city?: string };
  departureDate: Date | null;
  passengers: { adults: number; children: number; infants: number };
}

// Map context shape (subset needed for suggestions)
interface MapContextForSuggestions {
  visiblePrices: Array<{ type: string }>;
  visibleHotels: unknown[];
  visibleActivities: unknown[];
  activeTab: 'flights' | 'stays' | 'activities' | 'preferences';
  getCheapestFlightPrice: () => number | undefined;
  getCheapestHotelPrice: () => number | undefined;
}

interface MemoizedSmartSuggestionsProps {
  memory: MemoryForContext;
  mapContext: MapContextForSuggestions;
  inspireFlowStep: InspireFlowStep;
  destinationSuggestions: DestinationSuggestion[];
  /** Last assistant message text (primitive, avoids array-ref invalidation) */
  lastAssistantMessage: string | undefined;
  /** Last user message text (primitive) */
  lastUserMessage: string | undefined;
  /** Number of user messages (primitive) */
  conversationTurn: number;
  dynamicSuggestions: DynamicSuggestion[];
  onSuggestionClick: (message: string) => void;
  isLoading: boolean;
}

export const MemoizedSmartSuggestions = memo(function MemoizedSmartSuggestions({
  memory,
  mapContext,
  inspireFlowStep,
  destinationSuggestions,
  lastAssistantMessage,
  lastUserMessage,
  conversationTurn,
  dynamicSuggestions,
  onSuggestionClick,
  isLoading,
}: MemoizedSmartSuggestionsProps) {
  // Memoize the context object with primitive dependencies to avoid re-creation
  const context = useMemo(() => {
    const step: 'inspiration' | 'destination' | 'dates' | 'travelers' | 'search' | 'compare' | 'book' =
      !memory.arrival?.city ? "inspiration"
        : !memory.departureDate ? "destination"
        : memory.passengers.adults === 0 ? "dates"
        : "compare";

    return {
      workflowStep: step,
      hasDestination: !!memory.arrival?.city,
      hasDates: !!memory.departureDate,
      hasTravelers: memory.passengers.adults > 0,
      hasFlights: mapContext.visiblePrices.filter((p) => p.type === "flight").length > 0,
      hasHotels: mapContext.visibleHotels.length > 0,
      destinationName: memory.arrival?.city,
      departureCity: memory.departure?.city,
      currentTab: mapContext.activeTab,
      visibleFlightsCount: mapContext.visiblePrices.filter((p) => p.type === "flight").length,
      visibleHotelsCount: mapContext.visibleHotels.length,
      visibleActivitiesCount: mapContext.visibleActivities.length,
      cheapestFlightPrice: mapContext.getCheapestFlightPrice(),
      cheapestHotelPrice: mapContext.getCheapestHotelPrice(),
      // Inspire flow context
      inspireFlowStep,
      hasProposedDestinations: destinationSuggestions.length > 0,
      proposedDestinationNames: destinationSuggestions.map(d => d.countryName),
      // P4: Conversation context — primitives only (no array ref dependency)
      lastAssistantMessage,
      lastUserMessage,
      conversationTurn,
    };
  }, [
    memory.arrival?.city,
    memory.departureDate,
    memory.passengers.adults,
    memory.departure?.city,
    mapContext.visiblePrices,
    mapContext.visibleHotels,
    mapContext.visibleActivities,
    mapContext.activeTab,
    mapContext.getCheapestFlightPrice,
    mapContext.getCheapestHotelPrice,
    inspireFlowStep,
    destinationSuggestions,
    lastAssistantMessage,
    lastUserMessage,
    conversationTurn,
  ]);

  return (
    <SmartSuggestions
      context={context}
      dynamicSuggestions={dynamicSuggestions}
      onSuggestionClick={onSuggestionClick}
      isLoading={isLoading}
    />
  );
});
