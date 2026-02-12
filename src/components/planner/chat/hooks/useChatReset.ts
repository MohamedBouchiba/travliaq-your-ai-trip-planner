/**
 * useChatReset - Extracted from PlannerChat.tsx
 *
 * Encapsulates the hard reset logic shared between
 * "new session" and "delete all sessions" handlers.
 */

import { useCallback } from "react";
import { eventBus } from "@/lib/eventBus";

interface UseChatResetDeps {
  setIsLoading: (v: boolean) => void;
  setDynamicSuggestions: React.Dispatch<React.SetStateAction<Array<{ id: string; label: string; emoji: string; message: string }>>>;
  setInput: (v: string) => void;
  lastIntentRef: React.MutableRefObject<string | null>;
  completedMessageIdsRef: React.MutableRefObject<Set<string>>;
  userMessageCountRef: React.MutableRefObject<number>;
  airportFetchKeyRef: React.MutableRefObject<string | null>;
  isHardResetRef: React.MutableRefObject<boolean>;
  isSwitchingSessionRef: React.MutableRefObject<boolean>;
  widgetFlow: { resetFlowState: () => void };
  widgetCooldown: { resetCooldowns: () => void };
  resetFlightMemory: () => void;
  resetTravelMemory: () => void;
  resetAccommodationMemory: () => void;
  resetActivityMemory: () => void;
  resetPreferenceMemory: () => void;
}

/**
 * Returns a `performHardReset` function that clears all transient UI state,
 * refs, and persisted memories. Callers follow up with their own session action
 * (createNewSession or deleteAllSessions).
 */
export function useChatReset(deps: UseChatResetDeps) {
  const performHardReset = useCallback(() => {
    // Hard guard: stop persistence/auto-effects while we reset everything
    deps.isHardResetRef.current = true;
    deps.isSwitchingSessionRef.current = true;

    // Full reset: clear all transient state
    deps.setIsLoading(false);
    deps.setDynamicSuggestions([]);
    deps.setInput("");
    deps.lastIntentRef.current = null;
    deps.completedMessageIdsRef.current.clear();
    deps.userMessageCountRef.current = 0;
    deps.airportFetchKeyRef.current = null;
    deps.widgetFlow.resetFlowState();
    deps.widgetCooldown.resetCooldowns();

    // Close the widget panel
    eventBus.emit("panel:toggle", { visible: false });

    // Reset all persisted memories (localStorage-backed)
    deps.resetFlightMemory();
    deps.resetTravelMemory();
    deps.resetAccommodationMemory();
    deps.resetActivityMemory();
    deps.resetPreferenceMemory();
  }, [deps]);

  const finishReset = useCallback((delayMs = 400) => {
    setTimeout(() => {
      deps.isSwitchingSessionRef.current = false;
      deps.isHardResetRef.current = false;
    }, delayMs);
  }, [deps]);

  return { performHardReset, finishReset };
}
