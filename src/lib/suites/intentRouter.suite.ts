/**
 * Intent Router Core Test Suite (browser version)
 * Tests pure functions from intentRouterCore.ts
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
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
  CONFIDENCE_THRESHOLDS,
  CONVERSATIONAL_INTENTS,
  WIDGET_TRIGGERING_INTENTS,
} from "@/components/planner/chat/hooks/intentRouterCore";

export function registerIntentRouterTests() {
  setCategory("intentRouter");

  // ─── computeFlowState ───

  describe("computeFlowState", () => {
    it("empty memory → nothing set", () => {
      const flow = computeFlowState({});
      expect(flow.hasDestination).toBe(false);
      expect(flow.hasDestinationCity).toBe(false);
      expect(flow.hasDepartureCity).toBe(false);
      expect(flow.hasDepartureDate).toBe(false);
      expect(flow.hasReturnDate).toBe(false);
      expect(flow.hasTravelers).toBe(false);
      expect(flow.isReadyToSearch).toBe(false);
      expect(flow.tripType).toBe("roundtrip");
    });

    it("full roundtrip memory → ready to search", () => {
      const flow = computeFlowState({
        arrival: { country: "France", countryCode: "FR", city: "Paris" },
        departure: { city: "Brussels" },
        departureDate: new Date("2025-08-01"),
        returnDate: new Date("2025-08-15"),
        passengers: { adults: 2 },
        tripType: "roundtrip",
      });
      expect(flow.hasDestination).toBe(true);
      expect(flow.hasDestinationCity).toBe(true);
      expect(flow.hasDepartureCity).toBe(true);
      expect(flow.hasDepartureDate).toBe(true);
      expect(flow.hasReturnDate).toBe(true);
      expect(flow.hasTravelers).toBe(true);
      expect(flow.isReadyToSearch).toBe(true);
    });

    it("oneway trip → ready without return date", () => {
      const flow = computeFlowState({
        arrival: { country: "Japan", countryCode: "JP", city: "Tokyo" },
        departureDate: new Date("2025-09-01"),
        passengers: { adults: 1 },
        tripType: "oneway",
      });
      expect(flow.isReadyToSearch).toBe(true);
    });

    it("roundtrip without return date → not ready", () => {
      const flow = computeFlowState({
        arrival: { country: "Japan", countryCode: "JP", city: "Tokyo" },
        departureDate: new Date("2025-09-01"),
        passengers: { adults: 1 },
        tripType: "roundtrip",
      });
      expect(flow.isReadyToSearch).toBe(false);
    });

    it("country only (no city) → hasDestination but not hasDestinationCity", () => {
      const flow = computeFlowState({
        arrival: { country: "Thailand", countryCode: "TH" },
      });
      expect(flow.hasDestination).toBe(true);
      expect(flow.hasDestinationCity).toBe(false);
    });
  });

  // ─── computeUserBehavior ───

  describe("computeUserBehavior", () => {
    it("no interactions → guided by default", () => {
      const behavior = computeUserBehavior([]);
      expect(behavior.prefersWidgets).toBe(true);
      expect(behavior.style).toBe("guided");
      expect(behavior.completionRate).toBe(1);
    });

    it("high completion rate → guided", () => {
      const behavior = computeUserBehavior([
        { id: "w1", widgetType: "datePicker", interactionType: "date_selected", timestamp: Date.now(), data: {}, summary: "" },
        { id: "w2", widgetType: "travelersSelector", interactionType: "travelers_selected", timestamp: Date.now(), data: {}, summary: "" },
      ]);
      expect(behavior.style).toBe("guided");
      expect(behavior.completionRate).toBe(1);
    });

    it("low completion rate → expert", () => {
      // Use non-completion interaction types to simulate low completion
      const behavior = computeUserBehavior([
        { id: "w1", widgetType: "datePicker", interactionType: "quick_filter_applied", timestamp: Date.now(), data: {}, summary: "" },
        { id: "w2", widgetType: "travelersSelector", interactionType: "quick_filter_applied", timestamp: Date.now(), data: {}, summary: "" },
        { id: "w3", widgetType: "citySelector", interactionType: "quick_filter_applied", timestamp: Date.now(), data: {}, summary: "" },
      ]);
      expect(behavior.style).toBe("expert");
      expect(behavior.prefersWidgets).toBe(false);
    });
  });

  // ─── hasAlreadyProvided ───

  describe("hasAlreadyProvided", () => {
    it("returns false for empty interactions", () => {
      expect(hasAlreadyProvided("datePicker", [])).toBe(false);
    });

    it("returns true when matching interaction exists", () => {
      expect(
        hasAlreadyProvided("datePicker", [
          { id: "w1", widgetType: "datePicker", interactionType: "date_selected", timestamp: Date.now(), data: {}, summary: "" },
        ])
      ).toBe(true);
    });

    it("returns false for non-matching interactions", () => {
      expect(
        hasAlreadyProvided("travelersSelector", [
          { id: "w1", widgetType: "datePicker", interactionType: "date_selected", timestamp: Date.now(), data: {}, summary: "" },
        ])
      ).toBe(false);
    });
  });

  // ─── isConversationalIntent / isWidgetTriggeringIntent ───

  describe("Intent classification helpers", () => {
    it("greeting is conversational", () => {
      expect(isConversationalIntent("greeting")).toBe(true);
    });
    it("thank_you is conversational", () => {
      expect(isConversationalIntent("thank_you")).toBe(true);
    });
    it("provide_destination is widget-triggering", () => {
      expect(isWidgetTriggeringIntent("provide_destination")).toBe(true);
    });
    it("provide_dates is widget-triggering", () => {
      expect(isWidgetTriggeringIntent("provide_dates")).toBe(true);
    });
    it("greeting is NOT widget-triggering", () => {
      expect(isWidgetTriggeringIntent("greeting")).toBe(false);
    });
    it("provide_destination is NOT conversational", () => {
      expect(isConversationalIntent("provide_destination")).toBe(false);
    });
  });

  // ─── isCriticalWidget ───

  describe("isCriticalWidget", () => {
    it("citySelector is critical", () => {
      expect(isCriticalWidget("citySelector")).toBe(true);
    });
    it("dateRangePicker is critical", () => {
      expect(isCriticalWidget("dateRangePicker")).toBe(true);
    });
    it("preferenceStyle is NOT critical", () => {
      expect(isCriticalWidget("preferenceStyle")).toBe(false);
    });
    it("destinationSuggestions is NOT critical", () => {
      expect(isCriticalWidget("destinationSuggestions")).toBe(false);
    });
  });

  // ─── CONFIDENCE_THRESHOLDS ───

  describe("CONFIDENCE_THRESHOLDS", () => {
    it("HIGH > MEDIUM > LOW", () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(CONFIDENCE_THRESHOLDS.MEDIUM);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeGreaterThan(CONFIDENCE_THRESHOLDS.LOW);
    });
  });

  // ─── getNextRequiredWidget ───

  describe("getNextRequiredWidget", () => {
    it("returns null when flow state has no destination", () => {
      const flow = computeFlowState({});
      const result = getNextRequiredWidget(flow, []);
      expect(result).toBeNull();
    });

    it("returns citySelector when country but no city", () => {
      const flow = computeFlowState({ arrival: { country: "France", countryCode: "FR" } });
      const result = getNextRequiredWidget(flow, []);
      expect(result).toBe("citySelector");
    });

    it("returns dateRangePicker after city for roundtrip", () => {
      const flow = computeFlowState({
        arrival: { country: "France", countryCode: "FR", city: "Paris" },
        tripType: "roundtrip",
      });
      const result = getNextRequiredWidget(flow, []);
      expect(result).toBe("dateRangePicker");
    });

    it("returns travelersSelector after dates", () => {
      const flow = computeFlowState({
        arrival: { country: "France", countryCode: "FR", city: "Paris" },
        departureDate: new Date("2025-08-01"),
        returnDate: new Date("2025-08-15"),
        tripType: "roundtrip",
      });
      const result = getNextRequiredWidget(flow, []);
      expect(result).toBe("travelersSelector");
    });
  });

  // ─── validateWidget ───

  describe("validateWidget", () => {
    it("citySelector is always valid", () => {
      const flow = computeFlowState({});
      expect(validateWidget("citySelector", flow).valid).toBe(true);
    });

    it("returnDatePicker requires departure date", () => {
      const flow = computeFlowState({});
      const result = validateWidget("returnDatePicker", flow);
      expect(result.valid).toBe(false);
    });

    it("returnDatePicker valid when departure date set", () => {
      const flow = computeFlowState({ departureDate: new Date("2025-08-01") });
      const result = validateWidget("returnDatePicker", flow);
      expect(result.valid).toBe(true);
    });

    it("respects widget cooldown", () => {
      const flow = computeFlowState({});
      const cooldown = {
        canShowWidget: () => false,
        getBlockReason: () => "cooldown_active",
      };
      const result = validateWidget("citySelector", flow, cooldown);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cooldown");
    });
  });
}
