import { useState, useRef } from "react";
import type { PlannerChatRef } from "@/components/planner/PlannerChat";
import type { UserLocation } from "@/pages/TravelPlanner";

/**
 * Hook to manage chat integration with planner.
 * Provides chatRef, user location state, and search dedup ref.
 */
export function useChatIntegration() {
  const chatRef = useRef<PlannerChatRef>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const searchMessageSentRef = useRef(false);

  return {
    chatRef,
    userLocation,
    setUserLocation,
    searchMessageSentRef,
  };
}
