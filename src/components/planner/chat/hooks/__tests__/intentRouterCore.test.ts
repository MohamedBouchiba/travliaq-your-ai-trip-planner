/**
 * Unit tests for intentRouterCore pure functions
 */
import { describe, it, expect } from "vitest";
import {
  computeFlowState,
  computeUserBehavior,
  hasAlreadyProvided,
  validateWidget,
  getNextRequiredWidget,
  evaluatePhaseTransition,
  isConversationalIntent,
  isWidgetTriggeringIntent,
  isCriticalWidget,
  type FlowState,
} from "../intentRouterCore";
import type { WidgetInteraction } from "@/contexts/WidgetHistoryContext";

// ─── Helpers ───

function makeInteraction(type: string): WidgetInteraction {
  return {
    id: `interaction-${Date.now()}-${Math.random()}`,
    widgetType: "test",
    interactionType: type as any,
    timestamp: Date.now(),
    data: {},
    summary: `Test interaction: ${type}`,
  };
}

const alwaysValid = () => ({ valid: true });

// ─── computeFlowState ───

describe("computeFlowState", () => {
  it("returns empty state for empty memory", () => {
    const state = computeFlowState({});
    expect(state.hasDestination).toBe(false);
    expect(state.hasDestinationCity).toBe(false);
    expect(state.hasDepartureDate).toBe(false);
    expect(state.isReadyToSearch).toBe(false);
    expect(state.tripType).toBe("roundtrip"); // default
  });

  it("detects destination from country", () => {
    const state = computeFlowState({
      arrival: { country: "France" },
    });
    expect(state.hasDestination).toBe(true);
    expect(state.hasDestinationCity).toBe(false);
  });

  it("detects destination from countryCode", () => {
    const state = computeFlowState({
      arrival: { countryCode: "FR" },
    });
    expect(state.hasDestination).toBe(true);
  });

  it("detects destination city", () => {
    const state = computeFlowState({
      arrival: { city: "Paris", country: "France" },
    });
    expect(state.hasDestinationCity).toBe(true);
    expect(state.hasDestination).toBe(true);
  });

  it("detects travelers with adults >= 1", () => {
    expect(computeFlowState({ passengers: { adults: 1 } }).hasTravelers).toBe(true);
    expect(computeFlowState({ passengers: { adults: 0 } }).hasTravelers).toBe(false);
    expect(computeFlowState({}).hasTravelers).toBe(false);
  });

  it("isReadyToSearch requires all fields for roundtrip", () => {
    const state = computeFlowState({
      arrival: { city: "Paris", country: "France" },
      departureDate: new Date(),
      returnDate: new Date(),
      passengers: { adults: 2 },
      tripType: "roundtrip",
    });
    expect(state.isReadyToSearch).toBe(true);
  });

  it("isReadyToSearch for oneway does not require returnDate", () => {
    const state = computeFlowState({
      arrival: { city: "Paris", country: "France" },
      departureDate: new Date(),
      passengers: { adults: 1 },
      tripType: "oneway",
    });
    expect(state.isReadyToSearch).toBe(true);
  });

  it("isReadyToSearch false when missing city", () => {
    const state = computeFlowState({
      arrival: { country: "France" }, // no city
      departureDate: new Date(),
      returnDate: new Date(),
      passengers: { adults: 1 },
    });
    expect(state.isReadyToSearch).toBe(false);
  });
});

// ─── computeUserBehavior ───

describe("computeUserBehavior", () => {
  it("returns guided for empty interactions", () => {
    const behavior = computeUserBehavior([]);
    expect(behavior.style).toBe("guided");
    expect(behavior.prefersWidgets).toBe(true);
    expect(behavior.completionRate).toBe(1);
  });

  it("detects guided user with high completion", () => {
    const interactions = [
      makeInteraction("date_selected"),
      makeInteraction("travelers_selected"),
      makeInteraction("city_selected"),
    ];
    const behavior = computeUserBehavior(interactions);
    expect(behavior.style).toBe("guided");
    expect(behavior.completionRate).toBe(1);
  });

  it("detects expert user with low completion", () => {
    // All non-completion interactions
    const interactions = [
      makeInteraction("widget_shown"),
      makeInteraction("widget_shown"),
      makeInteraction("widget_shown"),
      makeInteraction("widget_shown"),
    ];
    const behavior = computeUserBehavior(interactions);
    expect(behavior.style).toBe("expert");
    expect(behavior.prefersWidgets).toBe(false);
  });
});

// ─── hasAlreadyProvided ───

describe("hasAlreadyProvided", () => {
  it("returns false for empty interactions", () => {
    expect(hasAlreadyProvided("travelersSelector", [])).toBe(false);
  });

  it("returns true when matching interaction exists", () => {
    const interactions = [makeInteraction("travelers_selected")];
    expect(hasAlreadyProvided("travelersSelector", interactions)).toBe(true);
  });

  it("returns false for non-matching interaction", () => {
    const interactions = [makeInteraction("date_selected")];
    expect(hasAlreadyProvided("travelersSelector", interactions)).toBe(false);
  });

  it("handles citySelector with multiple interaction types", () => {
    expect(hasAlreadyProvided("citySelector", [makeInteraction("city_selected")])).toBe(true);
    expect(hasAlreadyProvided("citySelector", [makeInteraction("destination_selected")])).toBe(true);
    expect(hasAlreadyProvided("citySelector", [makeInteraction("travelers_selected")])).toBe(false);
  });

  it("returns false for unknown widget type", () => {
    expect(hasAlreadyProvided("unknownWidget" as any, [makeInteraction("some_interaction")])).toBe(false);
  });
});

// ─── validateWidget ───

describe("validateWidget", () => {
  const baseFlow: FlowState = {
    hasDestination: false,
    hasDestinationCity: false,
    hasDepartureCity: false,
    hasDepartureDate: false,
    hasReturnDate: false,
    hasTravelers: false,
    hasTripType: false,
    tripType: "roundtrip",
    isReadyToSearch: false,
  };

  it("citySelector is always valid", () => {
    expect(validateWidget("citySelector", baseFlow).valid).toBe(true);
  });

  it("returnDatePicker requires departure date", () => {
    expect(validateWidget("returnDatePicker", baseFlow).valid).toBe(false);
    expect(validateWidget("returnDatePicker", { ...baseFlow, hasDepartureDate: true }).valid).toBe(true);
  });

  it("tripTypeConfirm requires travelers", () => {
    const result = validateWidget("tripTypeConfirm", baseFlow);
    expect(result.valid).toBe(false);
    expect(result.suggestedWidget).toBe("travelersSelector");
  });

  it("respects cooldown system", () => {
    const cooldown = {
      canShowWidget: () => false,
      getBlockReason: () => "max attempts reached",
    };
    const result = validateWidget("citySelector", baseFlow, cooldown);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("max attempts reached");
  });

  it("allows widget when cooldown passes", () => {
    const cooldown = {
      canShowWidget: () => true,
      getBlockReason: () => null,
    };
    expect(validateWidget("citySelector", baseFlow, cooldown).valid).toBe(true);
  });
});

// ─── getNextRequiredWidget ───

describe("getNextRequiredWidget", () => {
  it("returns null when no destination country", () => {
    const flow: FlowState = {
      hasDestination: false,
      hasDestinationCity: false,
      hasDepartureCity: false,
      hasDepartureDate: false,
      hasReturnDate: false,
      hasTravelers: false,
      hasTripType: false,
      tripType: "roundtrip",
      isReadyToSearch: false,
    };
    expect(getNextRequiredWidget(flow, [])).toBe(null);
  });

  it("returns citySelector when country selected but no city", () => {
    const flow: FlowState = {
      hasDestination: true,
      hasDestinationCity: false,
      hasDepartureCity: false,
      hasDepartureDate: false,
      hasReturnDate: false,
      hasTravelers: false,
      hasTripType: false,
      tripType: "roundtrip",
      isReadyToSearch: false,
    };
    expect(getNextRequiredWidget(flow, [])).toBe("citySelector");
  });

  it("returns dateRangePicker for roundtrip after city", () => {
    const flow: FlowState = {
      hasDestination: true,
      hasDestinationCity: true,
      hasDepartureCity: true,
      hasDepartureDate: false,
      hasReturnDate: false,
      hasTravelers: false,
      hasTripType: false,
      tripType: "roundtrip",
      isReadyToSearch: false,
    };
    expect(getNextRequiredWidget(flow, [])).toBe("dateRangePicker");
  });

  it("returns datePicker for oneway", () => {
    const flow: FlowState = {
      hasDestination: true,
      hasDestinationCity: true,
      hasDepartureCity: true,
      hasDepartureDate: false,
      hasReturnDate: false,
      hasTravelers: false,
      hasTripType: false,
      tripType: "oneway",
      isReadyToSearch: false,
    };
    expect(getNextRequiredWidget(flow, [])).toBe("datePicker");
  });

  it("returns travelersSelector after dates", () => {
    const flow: FlowState = {
      hasDestination: true,
      hasDestinationCity: true,
      hasDepartureCity: true,
      hasDepartureDate: true,
      hasReturnDate: true,
      hasTravelers: false,
      hasTripType: false,
      tripType: "roundtrip",
      isReadyToSearch: false,
    };
    expect(getNextRequiredWidget(flow, [])).toBe("travelersSelector");
  });

  it("skips already-provided widgets", () => {
    const flow: FlowState = {
      hasDestination: true,
      hasDestinationCity: true,
      hasDepartureCity: true,
      hasDepartureDate: false,
      hasReturnDate: false,
      hasTravelers: false,
      hasTripType: false,
      tripType: "roundtrip",
      isReadyToSearch: false,
    };
    const interactions = [makeInteraction("date_range_selected")];
    // dateRangePicker already provided, should skip to travelers
    expect(getNextRequiredWidget(flow, interactions)).toBe("travelersSelector");
  });

  it("returns travelersConfirmBeforeSearch when ready", () => {
    const flow: FlowState = {
      hasDestination: true,
      hasDestinationCity: true,
      hasDepartureCity: true,
      hasDepartureDate: true,
      hasReturnDate: true,
      hasTravelers: true,
      hasTripType: true,
      tripType: "roundtrip",
      isReadyToSearch: true,
    };
    expect(getNextRequiredWidget(flow, [])).toBe("travelersConfirmBeforeSearch");
  });
});

// ─── evaluatePhaseTransition ───

describe("evaluatePhaseTransition", () => {
  const baseFlow: FlowState = {
    hasDestination: false,
    hasDestinationCity: false,
    hasDepartureCity: false,
    hasDepartureDate: false,
    hasReturnDate: false,
    hasTravelers: false,
    hasTripType: false,
    tripType: "roundtrip",
    isReadyToSearch: false,
  };

  it("returns null when flight search is triggered", () => {
    const result = evaluatePhaseTransition(baseFlow, [], alwaysValid, true);
    expect(result).toBe(null);
  });

  it("returns null with no interactions", () => {
    const result = evaluatePhaseTransition(baseFlow, [], alwaysValid);
    expect(result).toBe(null);
  });

  it("suggests destinations after style configured + no destination", () => {
    const interactions = [makeInteraction("style_configured")];
    const result = evaluatePhaseTransition(baseFlow, interactions, alwaysValid);
    expect(result).not.toBe(null);
    expect(result!.widgetType).toBe("destinationSuggestions");
    expect(result!.reason).toContain("preferences complete");
  });

  it("suggests destinations after interests selected", () => {
    const interactions = [makeInteraction("interests_selected")];
    const result = evaluatePhaseTransition(baseFlow, interactions, alwaysValid);
    expect(result!.widgetType).toBe("destinationSuggestions");
  });

  it("does NOT suggest destinations if destination already set", () => {
    const flow = { ...baseFlow, hasDestination: true };
    const interactions = [makeInteraction("style_configured")];
    const result = evaluatePhaseTransition(flow, interactions, alwaysValid);
    // Should not trigger destination suggestions when destination exists
    expect(result?.widgetType).not.toBe("destinationSuggestions");
  });

  it("suggests dateRangePicker after destination selected (roundtrip)", () => {
    const flow = { ...baseFlow, hasDestinationCity: true, tripType: "roundtrip" as const };
    const interactions = [makeInteraction("destination_selected")];
    const result = evaluatePhaseTransition(flow, interactions, alwaysValid);
    expect(result!.widgetType).toBe("dateRangePicker");
  });

  it("suggests datePicker after destination selected (oneway)", () => {
    const flow = { ...baseFlow, hasDestinationCity: true, tripType: "oneway" as const };
    const interactions = [makeInteraction("city_selected")];
    const result = evaluatePhaseTransition(flow, interactions, alwaysValid);
    expect(result!.widgetType).toBe("datePicker");
  });

  it("does NOT suggest dates if already confirmed", () => {
    const flow = { ...baseFlow, hasDestinationCity: true };
    const interactions = [
      makeInteraction("destination_selected"),
      makeInteraction("date_range_selected"),
    ];
    const result = evaluatePhaseTransition(flow, interactions, alwaysValid);
    expect(result?.widgetType).not.toBe("dateRangePicker");
  });

  it("suggests travelers after dates set", () => {
    const flow = { ...baseFlow, hasDestinationCity: true, hasDepartureDate: true };
    const interactions = [makeInteraction("date_selected")];
    const result = evaluatePhaseTransition(flow, interactions, alwaysValid);
    expect(result!.widgetType).toBe("travelersSelector");
  });

  it("does NOT suggest travelers if already selected", () => {
    const flow = { ...baseFlow, hasDepartureDate: true };
    const interactions = [
      makeInteraction("date_selected"),
      makeInteraction("travelers_selected"),
    ];
    const result = evaluatePhaseTransition(flow, interactions, alwaysValid);
    expect(result).toBe(null);
  });

  it("respects canShowWidget validation", () => {
    const interactions = [makeInteraction("style_configured")];
    const blocked = () => ({ valid: false, reason: "blocked" });
    const result = evaluatePhaseTransition(baseFlow, interactions, blocked);
    expect(result).toBe(null);
  });
});

// ─── Intent classification helpers ───

describe("isConversationalIntent", () => {
  it("identifies conversational intents", () => {
    expect(isConversationalIntent("other")).toBe(true);
    expect(isConversationalIntent("greeting")).toBe(true);
    expect(isConversationalIntent("thank_you")).toBe(true);
    expect(isConversationalIntent("ask_question")).toBe(true);
  });

  it("rejects non-conversational intents", () => {
    expect(isConversationalIntent("provide_destination")).toBe(false);
    expect(isConversationalIntent("trigger_search")).toBe(false);
  });
});

describe("isWidgetTriggeringIntent", () => {
  it("identifies widget-triggering intents", () => {
    expect(isWidgetTriggeringIntent("provide_destination")).toBe(true);
    expect(isWidgetTriggeringIntent("provide_dates")).toBe(true);
    expect(isWidgetTriggeringIntent("gather_preferences")).toBe(true);
  });

  it("rejects non-widget intents", () => {
    expect(isWidgetTriggeringIntent("greeting")).toBe(false);
    expect(isWidgetTriggeringIntent("other")).toBe(false);
  });
});

describe("isCriticalWidget", () => {
  it("identifies critical widgets", () => {
    expect(isCriticalWidget("citySelector")).toBe(true);
    expect(isCriticalWidget("datePicker")).toBe(true);
    expect(isCriticalWidget("travelersSelector")).toBe(true);
  });

  it("rejects non-critical widgets", () => {
    expect(isCriticalWidget("preferenceStyle")).toBe(false);
    expect(isCriticalWidget("dietary")).toBe(false);
  });
});
