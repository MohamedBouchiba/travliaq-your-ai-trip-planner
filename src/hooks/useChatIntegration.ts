import { useState, useRef, useCallback } from "react";
import { usePlannerEvent } from "@/lib/eventBus";
import type { PlannerChatRef } from "@/components/planner/PlannerChat";
import type { CountrySelectionEvent } from "@/types/flight";
import type { UserLocation } from "@/pages/TravelPlanner";

/**
 * Hook to manage chat integration with planner
 * Includes user location state and event subscriptions
 */
export function useChatIntegration() {
  const chatRef = useRef<PlannerChatRef>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const searchMessageSentRef = useRef(false);

  // Event listener: country selected
  usePlannerEvent("location:countrySelected", useCallback((event: CountrySelectionEvent) => {
    chatRef.current?.injectSystemMessage(event);
  }, []));

  // Event listener: user location detected
  usePlannerEvent("user:locationDetected", useCallback((data) => {
    setUserLocation(data);
  }, []));

  // Event listener: offer flight search
  usePlannerEvent("chat:offerFlightSearch", useCallback((data) => {
    if (!searchMessageSentRef.current) {
      searchMessageSentRef.current = true;
      chatRef.current?.offerFlightSearch(data.from, data.to);
    }
  }, []));

  return {
    chatRef,
    userLocation,
    setUserLocation,
    searchMessageSentRef,
  };
}
