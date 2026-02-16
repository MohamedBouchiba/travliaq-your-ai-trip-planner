/**
 * Tests for processStreamResult pure functions
 * Tests: processFlightData, processAction, buildCombinedSuggestions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { processFlightData, processAction, buildCombinedSuggestions } from "../processStreamResult";
import type { FlightFormData } from "@/types/flight";

// ─── Helpers ───

function makeMemory(overrides = {}) {
  return {
    departure: { city: "Paris", iata: "CDG" },
    arrival: null as unknown,
    departureDate: null as unknown,
    returnDate: null as unknown,
    passengers: { adults: 1, children: 0, infants: 0 },
    tripType: "roundtrip" as const,
    cabinClass: "economy",
    ...overrides,
  } as never;
}

function makeDeps(overrides = {}) {
  return {
    widgetFlow: {
      setPendingTravelersWidget: vi.fn(),
    },
    updateMemory: vi.fn(),
    memory: makeMemory(),
    widgetTracking: {
      trackDestinationSelect: vi.fn(),
    },
    ...overrides,
  };
}

// ─── processFlightData ───

describe("processFlightData", () => {
  it("returns default state for empty flightData", () => {
    const deps = makeDeps();
    const result = processFlightData({} as FlightFormData, true, deps);
    expect(result.showDateWidget).toBe(false);
    expect(result.showTravelersWidget).toBe(false);
  });

  it("strips hallucinated toCountryCode when no 'to' city", () => {
    const deps = makeDeps();
    // flightData has toCountryCode but no 'to' city → should be removed
    const fd: FlightFormData = { toCountryCode: "JP" };
    processFlightData(fd, true, deps);
    // updateMemory should NOT contain toCountryCode
    if (deps.updateMemory.mock.calls.length > 0) {
      const memUpdate = deps.updateMemory.mock.calls[0][0];
      // The hallucinated toCountryCode should be stripped before flightDataToMemory
      expect(memUpdate).not.toHaveProperty("toCountryCode");
    }
  });

  it("sets showDateWidget when needsDateWidget=true and no blocking conditions", () => {
    const deps = makeDeps();
    const fd: FlightFormData = { to: "Tokyo", needsDateWidget: true };
    const result = processFlightData(fd, true, deps);
    expect(result.showDateWidget).toBe(true);
  });

  it("skips date widget when needsCitySelection + toCountryCode + destination city", () => {
    const deps = makeDeps();
    // When a 'to' city exists, toCountryCode is NOT stripped → needsDestinationCity blocks date widget
    const fd: FlightFormData = { to: "Tokyo", toCountryCode: "JP", needsCitySelection: true, needsDateWidget: true };
    const result = processFlightData(fd, true, deps);
    expect(result.showDateWidget).toBe(false);
  });

  it("does NOT skip date widget when toCountryCode hallucinated (no 'to' city)", () => {
    const deps = makeDeps();
    // toCountryCode without 'to' city → hallucination guard strips it → skipDateWidget=false
    const fd: FlightFormData = { toCountryCode: "JP", needsCitySelection: true, needsDateWidget: true };
    const result = processFlightData(fd, true, deps);
    expect(result.showDateWidget).toBe(true);
  });

  it("skips date widget when fromCountryCode and no 'from' city", () => {
    const deps = makeDeps();
    const fd: FlightFormData = { fromCountryCode: "FR", needsDateWidget: true };
    const result = processFlightData(fd, true, deps);
    expect(result.showDateWidget).toBe(false);
  });

  it("sets showTravelersWidget when needsTravelersWidget=true", () => {
    const deps = makeDeps();
    const fd: FlightFormData = { to: "Tokyo", needsTravelersWidget: true };
    const result = processFlightData(fd, true, deps);
    expect(result.showTravelersWidget).toBe(true);
  });

  it("queues pending travelers when both date and travelers needed", () => {
    const deps = makeDeps();
    const fd: FlightFormData = { to: "Tokyo", needsDateWidget: true, needsTravelersWidget: true };
    processFlightData(fd, true, deps);
    expect(deps.widgetFlow.setPendingTravelersWidget).toHaveBeenCalledWith(true);
  });

  it("calls updateMemory with flightDataToMemory result", () => {
    const deps = makeDeps();
    const fd: FlightFormData = { to: "Tokyo" };
    processFlightData(fd, true, deps);
    expect(deps.updateMemory).toHaveBeenCalled();
  });

  it("tracks destination_selected when toCountryCode + toCountryName present", () => {
    const deps = makeDeps();
    const fd: FlightFormData = { toCountryCode: "JP", toCountryName: "Japan", to: "Tokyo" };
    processFlightData(fd, true, deps);
    expect(deps.widgetTracking.trackDestinationSelect).toHaveBeenCalledWith("Japan", "JP");
  });

  it("does NOT track destination when toCountryCode missing", () => {
    const deps = makeDeps();
    const fd: FlightFormData = { to: "Tokyo" };
    processFlightData(fd, true, deps);
    expect(deps.widgetTracking.trackDestinationSelect).not.toHaveBeenCalled();
  });
});

// ─── processAction ───

describe("processAction", () => {
  it("does NOT execute chooseWidget when intent is not delegate_choice", () => {
    const executor = { executeChooseWidgetAction: vi.fn() };
    processAction(
      { type: "chooseWidget", widgetType: "datePicker", option: "mars" },
      { widgetActionExecutor: executor, intentClassification: { primaryIntent: "provide_dates" } as never },
    );
    expect(executor.executeChooseWidgetAction).not.toHaveBeenCalled();
  });

  it("executes chooseWidget when intent is delegate_choice", () => {
    const executor = { executeChooseWidgetAction: vi.fn().mockReturnValue(true) };
    processAction(
      { type: "chooseWidget", widgetType: "datePicker", option: "mars" },
      { widgetActionExecutor: executor, intentClassification: { primaryIntent: "delegate_choice" } as never },
    );
    expect(executor.executeChooseWidgetAction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "chooseWidget", widgetType: "datePicker" }),
    );
  });

  it("does NOT execute chooseWidget when intentClassification is null", () => {
    const executor = { executeChooseWidgetAction: vi.fn() };
    processAction(
      { type: "chooseWidget", widgetType: "datePicker", option: "x" },
      { widgetActionExecutor: executor, intentClassification: null },
    );
    expect(executor.executeChooseWidgetAction).not.toHaveBeenCalled();
  });
});

// ─── buildCombinedSuggestions ───

describe("buildCombinedSuggestions", () => {
  it("returns empty array when no replies", () => {
    expect(buildCombinedSuggestions(null, [])).toEqual([]);
  });

  it("returns empty array for empty quick replies", () => {
    expect(buildCombinedSuggestions({ replies: [] }, [])).toEqual([]);
  });

  it("maps AI quick replies correctly", () => {
    const result = buildCombinedSuggestions(
      { replies: [{ label: "Fly", emoji: "✈️", message: "book flight" }] },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Fly");
    expect(result[0].emoji).toBe("✈️");
    expect(result[0].message).toBe("book flight");
  });

  it("uses default emoji when not provided", () => {
    const result = buildCombinedSuggestions(
      { replies: [{ label: "Go", message: "go" }] },
      [],
    );
    expect(result[0].emoji).toBe("✈️");
  });

  it("includes contextual fillInput suggestions", () => {
    const result = buildCombinedSuggestions(null, [
      { id: "ctx-1", label: "Budget", action: { type: "fillInput", message: "petit budget" } },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Budget");
    expect(result[0].message).toBe("petit budget");
  });

  it("filters out non-fillInput contextual replies", () => {
    const result = buildCombinedSuggestions(null, [
      { id: "ctx-1", label: "Tab", action: { type: "tab" } },
    ]);
    expect(result).toHaveLength(0);
  });

  it("merges AI + contextual and caps at 4", () => {
    const result = buildCombinedSuggestions(
      {
        replies: [
          { label: "A1", message: "a1" },
          { label: "A2", message: "a2" },
          { label: "A3", message: "a3" },
        ],
      },
      [
        { id: "c1", label: "C1", action: { type: "fillInput", message: "c1" } },
        { id: "c2", label: "C2", action: { type: "fillInput", message: "c2" } },
      ],
    );
    expect(result).toHaveLength(4);
    // AI replies come first
    expect(result[0].label).toBe("A1");
    expect(result[3].label).toBe("C1");
  });

  it("uses contextual icon as emoji fallback", () => {
    const result = buildCombinedSuggestions(null, [
      { id: "c", label: "X", icon: "🏖️", action: { type: "fillInput", message: "x" } },
    ]);
    expect(result[0].emoji).toBe("🏖️");
  });

  it("uses default ✨ when no contextual icon", () => {
    const result = buildCombinedSuggestions(null, [
      { id: "c", label: "X", action: { type: "fillInput", message: "x" } },
    ]);
    expect(result[0].emoji).toBe("✨");
  });
});
