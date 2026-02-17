/**
 * Selection widget handlers (Phase 2 integration)
 * Budget, filters, star rating, cabin class, direct flights, duration, time of day
 */

import { eventBus } from "@/lib/eventBus";
import type { FlightMemory } from "@/stores/hooks";
import type { WidgetType } from "@/types/flight";
import type { HandlerDeps } from "./types";
import { generateId, updateMessageById } from "../../utils/messageHelpers";
import type { ChatMessage, QuickReply } from "../../types";

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

/** Map selection handler widget names → WidgetType used by cooldown */
const WIDGET_TYPE_MAP: Record<string, WidgetType> = {
  budget: "budgetRangeSlider" as WidgetType,
  starRating: "starRatingSelector" as WidgetType,
  cabinClass: "cabinClassSelector" as WidgetType,
  directFlight: "directFlightToggle" as WidgetType,
  duration: "durationSelector" as WidgetType,
  timeOfDay: "timeOfDaySelector" as WidgetType,
};

/**
 * Record widget confirmation in cooldown system & append a follow-up assistant message.
 */
function finalizeSelection(
  deps: HandlerDeps,
  cooldownKey: string,
  followUpText: string,
  quickReplyLabels?: string[]
) {
  // 1. Mark confirmed in cooldown
  const widgetType = WIDGET_TYPE_MAP[cooldownKey];
  if (widgetType && deps.widgetCooldown) {
    deps.widgetCooldown.recordWidgetConfirmed(widgetType);
  }

  // 2. Build quick replies
  const quickReplies: QuickReply[] | undefined = quickReplyLabels?.map((label, i) => ({
    id: generateId(`qr-${i}`),
    label,
    action: { type: "sendMessage" as const, message: label },
  }));

  // 3. Add follow-up assistant message
  const followUp: ChatMessage = {
    id: generateId("followup"),
    role: "assistant",
    text: followUpText,
    timestamp: Date.now(),
    ...(quickReplies?.length ? { quickReplies } : {}),
  };

  deps.setMessages((prev) => [...prev, followUp]);
}

// ────────────────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────────────────

/**
 * Handle budget range selection
 */
export function handleBudgetSelect(
  deps: HandlerDeps,
  messageId: string,
  range: { min: number; max: number } | null
) {
  const { setMessages, tracking, t } = deps;

  if (!range) {
    setMessages(updateMessageById(messageId, { widgetConfirmed: false, widgetSelectedValue: undefined, widgetDisplayLabel: undefined }));
    return;
  }

  const budgetLabel = range.max >= 1000
    ? `${range.min}€ - ${(range.max / 1000).toFixed(1)}k€`
    : `${range.min}€ - ${range.max}€`;

  tracking.recordInteraction(
    generateId("budget"),
    "budget_selected",
    range,
    t("planner.selection.budgetSet", { label: budgetLabel })
  );

  setMessages(updateMessageById(messageId, { widgetConfirmed: true, widgetSelectedValue: range, widgetDisplayLabel: budgetLabel }));

  eventBus.emit("budget:selected", { range, perPerson: false });

  finalizeSelection(deps, "budget",
    t("planner.followUp.budgetConfirmed", { defaultValue: "✅ Budget noté ! Quelle est la prochaine étape ?" }),
    [
      t("planner.quickReply.searchFlights", { defaultValue: "Chercher des vols" }),
      t("planner.quickReply.setDates", { defaultValue: "Définir les dates" }),
      t("planner.quickReply.chooseDestination", { defaultValue: "Choisir la destination" }),
    ]
  );
}

/**
 * Handle quick filter chip selection
 */
export function handleQuickFilterSelect(
  deps: HandlerDeps,
  messageId: string,
  chipId: string
) {
  const { setMessages, tracking, t } = deps;

  tracking.recordInteraction(
    generateId("filter"),
    "filter_selected",
    { chipId },
    t("planner.selection.filterApplied", { chipId })
  );

  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== messageId) return m;

      const currentSelected = (m.widgetSelectedValue as string[]) || [];
      const newSelected = currentSelected.includes(chipId)
        ? currentSelected.filter((id) => id !== chipId)
        : [...currentSelected, chipId];

      return {
        ...m,
        widgetSelectedValue: newSelected,
        widgetDisplayLabel: newSelected.length > 0
          ? t("planner.selection.filtersCount", { count: newSelected.length })
          : undefined,
      };
    })
  );

  eventBus.emit("filters:changed", { filterId: chipId, selected: true });
}

/**
 * Handle clear all quick filters
 */
export function handleQuickFilterClear(
  deps: HandlerDeps,
  messageId: string
) {
  const { setMessages } = deps;

  setMessages(updateMessageById(messageId, { widgetSelectedValue: [], widgetDisplayLabel: undefined, widgetConfirmed: false }));
  eventBus.emit("filters:cleared");
}

/**
 * Handle star rating selection
 */
export function handleStarRatingSelect(
  deps: HandlerDeps,
  messageId: string,
  minStars: number,
  maxStars: number
) {
  const { setMessages, tracking, t } = deps;

  const ratingLabel = minStars === maxStars
    ? t("planner.selection.stars", { count: minStars })
    : t("planner.selection.starsRange", { min: minStars, max: maxStars });

  tracking.recordInteraction(
    generateId("rating"),
    "rating_selected",
    { minStars, maxStars },
    t("planner.selection.hotelRating", { label: ratingLabel })
  );

  setMessages(updateMessageById(messageId, { widgetConfirmed: true, widgetSelectedValue: { minStars, maxStars }, widgetDisplayLabel: ratingLabel }));

  eventBus.emit("hotels:starRating", { min: minStars, max: maxStars });

  finalizeSelection(deps, "starRating",
    t("planner.followUp.ratingConfirmed", { defaultValue: "✅ Préférence d'hôtel notée ! On continue ?" }),
    [
      t("planner.quickReply.searchHotels", { defaultValue: "Chercher des hôtels" }),
      t("planner.quickReply.setBudget", { defaultValue: "Définir le budget" }),
    ]
  );
}

/**
 * Handle cabin class selection
 */
export function handleCabinClassSelect(
  deps: HandlerDeps,
  messageId: string,
  cabinClass: string
) {
  const { setMessages, updateMemory, tracking, t } = deps;

  const cabinKeys: Record<string, string> = {
    economy: "planner.selection.cabin.economy",
    premium_economy: "planner.selection.cabin.premiumEconomy",
    business: "planner.selection.cabin.business",
    first: "planner.selection.cabin.first",
  };
  const cabinLabel = cabinKeys[cabinClass] ? t(cabinKeys[cabinClass]) : cabinClass;

  tracking.recordInteraction(
    generateId("cabin"),
    "cabin_class_selected",
    { cabinClass },
    t("planner.selection.cabinClass", { label: cabinLabel })
  );

  setMessages(updateMessageById(messageId, { widgetConfirmed: true, widgetSelectedValue: cabinClass, widgetDisplayLabel: cabinLabel }));

  updateMemory({ cabinClass: cabinClass as FlightMemory["cabinClass"] });

  finalizeSelection(deps, "cabinClass",
    t("planner.followUp.cabinConfirmed", { defaultValue: "✅ Classe de vol notée !" }),
    [
      t("planner.quickReply.searchFlights", { defaultValue: "Chercher des vols" }),
      t("planner.quickReply.setDates", { defaultValue: "Définir les dates" }),
    ]
  );
}

/**
 * Handle direct flight toggle
 */
export function handleDirectFlightToggle(
  deps: HandlerDeps,
  messageId: string,
  directOnly: boolean
) {
  const { setMessages, tracking, t } = deps;

  const label = directOnly
    ? t("planner.selection.directFlightsOnly")
    : t("planner.selection.withStops");

  tracking.recordInteraction(
    generateId("direct"),
    "direct_flight_toggled",
    { directOnly },
    label
  );

  setMessages(updateMessageById(messageId, { widgetConfirmed: true, widgetSelectedValue: directOnly, widgetDisplayLabel: label }));

  eventBus.emit("flights:directOnly", { directOnly });

  finalizeSelection(deps, "directFlight",
    t("planner.followUp.directFlightConfirmed", { defaultValue: "✅ Préférence de vol notée !" })
  );
}

/**
 * Handle duration selection (for activities)
 */
export function handleDurationSelect(
  deps: HandlerDeps,
  messageId: string,
  durationId: string
) {
  const { setMessages, tracking, t } = deps;

  tracking.recordInteraction(
    generateId("duration"),
    "duration_selected",
    { durationId },
    t("planner.selection.duration", { id: durationId })
  );

  setMessages(updateMessageById(messageId, { widgetConfirmed: true, widgetSelectedValue: durationId, widgetDisplayLabel: durationId }));

  eventBus.emit("activities:duration", { duration: durationId });

  finalizeSelection(deps, "duration",
    t("planner.followUp.durationConfirmed", { defaultValue: "✅ Durée notée !" })
  );
}

/**
 * Handle time of day selection (for activities)
 */
export function handleTimeOfDaySelect(
  deps: HandlerDeps,
  messageId: string,
  timeSlot: string
) {
  const { setMessages, tracking, t } = deps;

  const timeKeys: Record<string, string> = {
    morning: "planner.selection.time.morning",
    afternoon: "planner.selection.time.afternoon",
    evening: "planner.selection.time.evening",
    night: "planner.selection.time.night",
  };
  const timeLabel = timeKeys[timeSlot] ? t(timeKeys[timeSlot]) : timeSlot;

  tracking.recordInteraction(
    generateId("time"),
    "time_of_day_selected",
    { timeSlot },
    t("planner.selection.timeOfDay", { label: timeLabel })
  );

  setMessages(updateMessageById(messageId, { widgetConfirmed: true, widgetSelectedValue: timeSlot, widgetDisplayLabel: timeLabel }));

  eventBus.emit("activities:timeOfDay", { timeSlot });

  finalizeSelection(deps, "timeOfDay",
    t("planner.followUp.timeConfirmed", { defaultValue: "✅ Créneau noté !" })
  );
}
