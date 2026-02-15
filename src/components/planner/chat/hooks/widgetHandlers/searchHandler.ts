/**
 * Search button handler
 */

import { eventBus } from "@/lib/eventBus";
import type { ChatMessage } from "../../types";
import type { HandlerDeps } from "./types";

/**
 * Handle search button click
 */
export function handleSearchButtonClick(
  deps: HandlerDeps,
  messageId: string
) {
  const { memory, setMessages, refs } = deps;

  const totalTravelers =
    memory.passengers.adults +
    memory.passengers.children +
    memory.passengers.infants;

  // Skip solo-confirmation if travelers were explicitly confirmed via widget
  const travelersExplicitlyConfirmed = refs.travelersConfirmed.current;

  // Only ask "traveling alone?" if travelers were NOT explicitly confirmed and still at defaults
  if (
    !travelersExplicitlyConfirmed &&
    totalTravelers === 1 &&
    memory.passengers.adults === 1 &&
    memory.passengers.children === 0 &&
    memory.passengers.infants === 0
  ) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, hasSearchButton: false, widget: "travelersConfirmBeforeSearch" as ChatMessage["widget"] }
          : m
      )
    );
    refs.pendingSearchAfterTravelers.current = true;
  } else {
    eventBus.emit("flight:triggerSearch");
  }
}
