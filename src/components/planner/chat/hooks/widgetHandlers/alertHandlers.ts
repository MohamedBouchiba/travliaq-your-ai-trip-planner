/**
 * Alert widget handlers (Phase 4)
 * Conflict resolution, price alerts
 */

import { eventBus } from "@/lib/eventBus";
import type { HandlerDeps } from "./types";

/**
 * Handle conflict resolution
 */
export function handleConflictResolve(
  deps: HandlerDeps,
  messageId: string,
  conflictId: string
) {
  const { setMessages, tracking } = deps;

  tracking.recordInteraction(
    `conflict-${Date.now()}`,
    "conflict_resolved",
    { conflictId },
    `Conflit résolu`
  );

  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== messageId || !m.widgetData?.conflicts) return m;

      const newConflicts = (m.widgetData.conflicts as Array<{ id: string; resolved?: boolean }>).map((c) =>
        c.id === conflictId ? { ...c, resolved: true } : c
      );
      return {
        ...m,
        widgetData: { ...m.widgetData, conflicts: newConflicts },
      };
    })
  );

  eventBus.emit("conflict:resolved", { conflictId });
}

/**
 * Handle price alert action
 */
export function handlePriceAlertAction(
  deps: HandlerDeps,
  messageId: string
) {
  const { tracking } = deps;

  tracking.recordInteraction(
    `price-alert-${Date.now()}`,
    "price_alert_action",
    {},
    `Action sur alerte prix`
  );

  eventBus.emit("priceAlert:action", { alertId: messageId });
}

/**
 * Handle price alert dismiss
 */
export function handlePriceAlertDismiss(
  deps: HandlerDeps,
  messageId: string
) {
  const { setMessages } = deps;

  setMessages((prev) =>
    prev.map((m) =>
      m.id === messageId
        ? { ...m, widget: undefined, widgetData: undefined }
        : m
    )
  );
}
