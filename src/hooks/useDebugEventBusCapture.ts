/**
 * useDebugEventBusCapture - Captures key eventBus events in the debug store
 * Only active in development mode.
 */
import { useEffect } from "react";
import { eventBus, type PlannerEvents } from "@/lib/eventBus";
import { useDebugStore } from "@/stores/debugStore";

/** Events worth capturing (skip high-frequency ones like map:zoom, hotels:hover) */
const CAPTURED_EVENTS: (keyof PlannerEvents)[] = [
  "tab:change",
  "flight:selectAirport",
  "flight:triggerSearch",
  "flight:confirmedAirports",
  "location:citySelected",
  "destination:flightFinalized",
  "destination:accommodationUpdated",
  "sync:cityPropagated",
  "sync:blocked",
  "hotels:select",
  "hotels:results",
  "activities:search",
  "activities:resultsReady",
  "preferences:updated",
  "chat:userMessage",
  "map:searchInArea",
  "budget:selected",
  "filters:changed",
];

export function useDebugEventBusCapture() {
  useEffect(() => {
    // Bug 9 fix: Remove DEV-only guard so debug reports capture events in preview/prod too

    const handlers = new Map<string, (data: unknown) => void>();

    for (const eventName of CAPTURED_EVENTS) {
      const handler = (data: unknown) => {
        let payload: unknown;
        try {
          payload = data
            ? JSON.parse(
                JSON.stringify(data, (_k, v) => {
                  if (typeof v === "string" && v.length > 200) return v.slice(0, 200) + "...";
                  if (Array.isArray(v) && v.length > 10) return [...v.slice(0, 10), `...+${v.length - 10}`];
                  return v;
                })
              )
            : undefined;
        } catch {
          payload = "[unserializable]";
        }

        useDebugStore.getState().addEventBusEntry({
          timestamp: Date.now(),
          event: eventName,
          payload,
        });
      };
      handlers.set(eventName, handler);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventBus.on(eventName as any, handler as any);
    }

    return () => {
      for (const [eventName, handler] of handlers) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventBus.off(eventName as any, handler as any);
      }
    };
  }, []);
}
