/**
 * Comparison widget handlers (Phase 3)
 */

import { eventBus } from "@/lib/eventBus";
import type { HandlerDeps } from "./types";

/**
 * Handle comparison widget item selection
 */
export function handleComparisonSelect(
  deps: HandlerDeps,
  messageId: string,
  itemId: string
) {
  const { setMessages, tracking } = deps;

  tracking.recordInteraction(
    `comparison-select-${Date.now()}`,
    "comparison_item_selected",
    { itemId },
    `Option sélectionnée dans la comparaison`
  );

  setMessages((prev) =>
    prev.map((m) =>
      m.id === messageId
        ? { ...m, widgetConfirmed: true, widgetSelectedValue: itemId }
        : m
    )
  );

  eventBus.emit("comparison:selected", { itemId, itemType: "unknown" });
}

/**
 * Handle comparison widget item removal
 */
export function handleComparisonRemove(
  deps: HandlerDeps,
  messageId: string,
  itemId: string
) {
  const { setMessages } = deps;

  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== messageId || !m.widgetData?.items) return m;

      const newItems = (m.widgetData.items as Array<{ id: string }>).filter((item) => item.id !== itemId);
      return {
        ...m,
        widgetData: { ...m.widgetData, items: newItems },
      };
    })
  );
}
