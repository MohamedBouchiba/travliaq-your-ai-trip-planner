/**
 * Selection widget handlers (Phase 2 integration)
 * Budget, filters, star rating, cabin class, direct flights, duration, time of day
 */

import { eventBus } from "@/lib/eventBus";
import type { FlightMemory } from "@/stores/hooks";
import type { HandlerDeps } from "./types";
import { generateId, updateMessageById } from "../../utils/messageHelpers";

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
}
