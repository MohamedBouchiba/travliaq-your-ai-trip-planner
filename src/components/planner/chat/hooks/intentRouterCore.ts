/**
 * Intent Router Core - Pure functions extracted from useUnifiedIntentRouter
 * 
 * These functions contain no React hooks or side effects, making them
 * easily testable in isolation.
 */

import type { WidgetType } from "@/types/flight";
import type { IntentClassification } from "./useChatStream";
import type { WidgetInteraction } from "@/contexts/WidgetHistoryContext";

// ─── Types ───

export interface FlowState {
  hasDestination: boolean;
  hasDestinationCity: boolean;
  hasDepartureCity: boolean;
  hasDepartureDate: boolean;
  hasReturnDate: boolean;
  hasTravelers: boolean;
  hasTripType: boolean;
  tripType: "roundtrip" | "oneway" | "multi";
  isReadyToSearch: boolean;
}

export interface WidgetValidation {
  valid: boolean;
  reason?: string;
  suggestedWidget?: WidgetType;
}

export interface IntentProcessResult {
  shouldShowWidget: boolean;
  widgetType: WidgetType | null;
  widgetData?: Record<string, unknown>;
  action?: "search" | "delegate" | "clarify" | "none";
  reason?: string;
}

export interface UserBehavior {
  prefersWidgets: boolean;
  completionRate: number;
  style: "guided" | "expert";
}

// ─── Constants ───

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40,
} as const;

export const CRITICAL_WIDGETS: WidgetType[] = [
  "citySelector",
  "dateRangePicker",
  "datePicker",
  "travelersSelector",
];

export const CONVERSATIONAL_INTENTS = [
  "other", "ask_question", "ask_recommendations",
  "compare_options", "greeting", "thank_you",
] as const;

export const WIDGET_TRIGGERING_INTENTS = [
  "provide_destination",
  "provide_dates",
  "provide_duration",
  "flexible_dates",
  "provide_travelers",
  "specify_composition",
  "confirm_selection",
  "express_preference",
  "express_constraint",
  "ask_inspiration",
  "gather_preferences",
] as const;

/**
 * Widget prerequisites - defines what's needed before showing each widget
 */
export const WIDGET_PREREQUISITES: Record<WidgetType, (flow: FlowState) => WidgetValidation> = {
  citySelector: () => ({ valid: true }),
  datePicker: () => ({ valid: true }),
  dateRangePicker: () => ({ valid: true }),
  returnDatePicker: (flow) => ({
    valid: flow.hasDepartureDate,
    reason: flow.hasDepartureDate ? undefined : "Departure date required first",
  }),
  travelersSelector: () => ({ valid: true }),
  tripTypeConfirm: (flow) => ({
    valid: flow.hasTravelers,
    reason: flow.hasTravelers ? undefined : "Travelers count required first",
    suggestedWidget: flow.hasTravelers ? undefined : "travelersSelector",
  }),
  travelersConfirmBeforeSearch: (flow) => ({
    valid: flow.hasDestinationCity && flow.hasDepartureDate && flow.hasTravelers,
    reason: flow.isReadyToSearch ? undefined : "Complete trip info required",
  }),
  airportConfirmation: (flow) => ({
    valid: flow.isReadyToSearch,
    reason: flow.isReadyToSearch ? undefined : "Complete trip info required",
  }),
  preferenceStyle: () => ({ valid: true }),
  preferenceInterests: () => ({ valid: true }),
  mustHaves: () => ({ valid: true }),
  dietary: () => ({ valid: true }),
  destinationSuggestions: () => ({ valid: true }),
  quickFilterChips: () => ({ valid: true }),
  starRatingSelector: () => ({ valid: true }),
  durationChips: () => ({ valid: true }),
  cabinClassSelector: () => ({ valid: true }),
  directFlightToggle: () => ({ valid: true }),
  budgetRangeSlider: () => ({ valid: true }),
  tripRecap: () => ({ valid: true }),
};

/**
 * Widget type to interaction type mapping
 */
export const WIDGET_TO_INTERACTION_MAP: Record<string, string[]> = {
  travelersSelector: ["travelers_selected"],
  travelersConfirmBeforeSearch: ["travelers_selected"],
  dateRangePicker: ["date_range_selected"],
  datePicker: ["date_selected"],
  returnDatePicker: ["date_selected"],
  citySelector: ["city_selected", "destination_selected"],
  destinationSuggestions: ["destination_selected"],
  tripTypeConfirm: ["trip_type_selected"],
  airportConfirmation: ["airport_selected"],
  preferenceStyle: ["style_configured"],
  preferenceInterests: ["interests_selected"],
  mustHaves: ["must_haves_configured"],
  dietary: ["dietary_configured"],
};

// ─── Pure Functions ───

/**
 * Compute flow state from flight memory
 */
export function computeFlowState(memory: {
  arrival?: { country?: string; countryCode?: string; city?: string } | null;
  departure?: { city?: string } | null;
  departureDate?: Date | null;
  returnDate?: Date | null;
  passengers?: { adults?: number } | null;
  tripType?: "roundtrip" | "oneway" | "multi" | null;
}): FlowState {
  const hasDestination = !!(memory.arrival?.country || memory.arrival?.countryCode);
  const hasDestinationCity = !!memory.arrival?.city;
  const hasDepartureCity = !!memory.departure?.city;
  const hasDepartureDate = !!memory.departureDate;
  const hasReturnDate = !!memory.returnDate;
  const hasTravelers = (memory.passengers?.adults ?? 0) >= 1;
  const tripType = memory.tripType || "roundtrip";
  const hasTripType = !!memory.tripType;

  const isReadyToSearch =
    hasDestinationCity &&
    hasDepartureDate &&
    (tripType === "oneway" || hasReturnDate) &&
    hasTravelers;

  return {
    hasDestination,
    hasDestinationCity,
    hasDepartureCity,
    hasDepartureDate,
    hasReturnDate,
    hasTravelers,
    hasTripType,
    tripType,
    isReadyToSearch,
  };
}

/**
 * Detect user behavior from widget interaction history
 */
export function computeUserBehavior(widgetInteractions: WidgetInteraction[]): UserBehavior {
  const completedTypes = [
    "date_selected",
    "date_range_selected",
    "travelers_selected",
    "trip_type_selected",
    "city_selected",
    "destination_selected",
    "style_configured",
    "interests_selected",
  ];

  if (widgetInteractions.length === 0) {
    return { prefersWidgets: true, completionRate: 1, style: "guided" };
  }

  const completed = widgetInteractions.filter((i) =>
    completedTypes.includes(i.interactionType)
  ).length;

  const completionRate = widgetInteractions.length > 0
    ? completed / widgetInteractions.length
    : 1;

  const style = completionRate >= 0.5 ? "guided" : "expert";

  return {
    prefersWidgets: completionRate >= 0.5,
    completionRate,
    style,
  };
}

/**
 * Check if user already provided data for a widget type via a previous interaction
 */
export function hasAlreadyProvided(
  widgetType: WidgetType,
  widgetInteractions: WidgetInteraction[]
): boolean {
  const interactionTypes = WIDGET_TO_INTERACTION_MAP[widgetType];
  if (!interactionTypes || interactionTypes.length === 0) return false;
  return widgetInteractions.some((interaction) =>
    interactionTypes.includes(interaction.interactionType)
  );
}

/**
 * Validate widget prerequisites
 */
export function validateWidget(
  widgetType: WidgetType,
  flowState: FlowState,
  widgetCooldown?: { canShowWidget: (w: WidgetType) => boolean; getBlockReason: (w: WidgetType) => string | null }
): WidgetValidation {
  if (widgetCooldown && !widgetCooldown.canShowWidget(widgetType)) {
    const reason = widgetCooldown.getBlockReason(widgetType);
    return { valid: false, reason: reason || "blocked_by_cooldown" };
  }

  const validator = WIDGET_PREREQUISITES[widgetType];
  if (!validator) return { valid: true };
  return validator(flowState);
}

/**
 * Get the next required widget based on flow state
 */
export function getNextRequiredWidget(
  flowState: FlowState,
  widgetInteractions: WidgetInteraction[]
): WidgetType | null {
  if (!flowState.hasDestinationCity && !hasAlreadyProvided("citySelector", widgetInteractions)) {
    if (flowState.hasDestination) return "citySelector";
    return null;
  }

  if (!flowState.hasDepartureDate) {
    const dateWidget = flowState.tripType === "roundtrip" ? "dateRangePicker" : "datePicker";
    if (!hasAlreadyProvided(dateWidget, widgetInteractions)) return dateWidget;
  }

  if (flowState.tripType === "roundtrip" && !flowState.hasReturnDate) {
    if (!hasAlreadyProvided("dateRangePicker", widgetInteractions)) return "dateRangePicker";
  }

  if (!flowState.hasTravelers && !hasAlreadyProvided("travelersSelector", widgetInteractions)) {
    return "travelersSelector";
  }

  if (!flowState.hasTripType && !hasAlreadyProvided("tripTypeConfirm", widgetInteractions)) {
    return "tripTypeConfirm";
  }

  if (flowState.isReadyToSearch && !hasAlreadyProvided("travelersConfirmBeforeSearch", widgetInteractions)) {
    return "travelersConfirmBeforeSearch";
  }

  return null;
}

/**
 * Evaluate phase transitions based on flow state
 * 
 * Phase order (from phased workflow):
 * 1. Discovery: preferences → destination suggestions
 * 2. Logistics: dates → travelers
 * 3. Accommodation, Activities, Recap (future)
 */
export function evaluatePhaseTransition(
  flowState: FlowState,
  widgetInteractions: WidgetInteraction[],
  canShowWidget: (widgetType: WidgetType) => WidgetValidation,
  flightSearchTriggered?: boolean
): IntentProcessResult | null {
  if (flightSearchTriggered) return null;

  const hasInteraction = (type: string) =>
    widgetInteractions.some((i) => i.interactionType === type);

  // Guard 1: REMOVED — destination suggestions are now driven by backend (LLM) only.
  // The LLM will ask the user if they want suggestions after preferences are collected.

  // Guard 2: Destination set + no dates → date picker
  if (flowState.hasDestinationCity && !flowState.hasDepartureDate) {
    const hasDateConfirmation =
      hasInteraction("date_selected") || hasInteraction("date_range_selected");
    if (!hasDateConfirmation) {
      const hasDestinationInteraction =
        hasInteraction("destination_selected") || hasInteraction("city_selected");
      const dateWidget = flowState.tripType === "roundtrip" ? "dateRangePicker" : "datePicker";
      if (hasDestinationInteraction && canShowWidget(dateWidget).valid) {
        return {
          shouldShowWidget: true,
          widgetType: dateWidget as WidgetType,
          action: "none",
          reason: "Phase transition: destination complete → dates",
        };
      }
    }
  }

  // Guard 3: Dates set + travelers not confirmed → travelers selector
  // Also check flowState.hasTravelers to avoid redundancy when travelers are set via entity extraction
  if (flowState.hasDepartureDate && !hasInteraction("travelers_selected") && !flowState.hasTravelers) {
    const hasDateInteraction =
      hasInteraction("date_selected") || hasInteraction("date_range_selected");
    if (hasDateInteraction && canShowWidget("travelersSelector").valid) {
      return {
        shouldShowWidget: true,
        widgetType: "travelersSelector" as WidgetType,
        action: "none",
        reason: "Phase transition: dates complete → travelers",
      };
    }
  }

  return null;
}

/**
 * Check if an intent is conversational (should never auto-trigger widgets)
 */
export function isConversationalIntent(intent: string): boolean {
  return (CONVERSATIONAL_INTENTS as readonly string[]).includes(intent);
}

/**
 * Check if an intent typically triggers widgets
 */
export function isWidgetTriggeringIntent(intent: string): boolean {
  return (WIDGET_TRIGGERING_INTENTS as readonly string[]).includes(intent);
}

/**
 * Determine if a widget is critical (always shown regardless of user behavior)
 */
export function isCriticalWidget(widgetType: WidgetType): boolean {
  return CRITICAL_WIDGETS.includes(widgetType);
}
