/**
 * Tests for persistExtractedEntities — Declarative Entity Persistence Pipeline
 *
 * Covers: B1 (skipWhenFlightDataHas), onlyWithoutFlightData guard,
 * entity routing (memory, form events, widget refs), traveler derivation,
 * date parsing, multi-destination legs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { persistExtractedEntities } from "../persistExtractedEntities";
import type { FlightFormData } from "@/types/flight";

// Mock eventBus to capture form event emissions
vi.mock("@/lib/eventBus", () => ({
  eventBus: { emit: vi.fn() },
}));

import { eventBus } from "@/lib/eventBus";

function makeWidgetFlow() {
  return {
    setPendingTripDuration: vi.fn(),
    setPendingPreferredMonth: vi.fn(),
    getPendingTripDuration: vi.fn().mockReturnValue(null),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── B1: skipWhenFlightDataHas guard ───

describe("B1: departureCity persists even when unrelated flightData exists", () => {
  it("persists departureCity when flightData has needsDateWidget but no 'from'", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { needsDateWidget: true };

    persistExtractedEntities(
      { departureCity: "Paris" },
      flightData,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({ departure: expect.objectContaining({ city: "Paris" }) }),
    );
  });

  it("persists departureCountryCode when flightData has needsCitySelection but no 'from'", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { needsCitySelection: true, toCountryCode: "JP" };

    persistExtractedEntities(
      { departureCountryCode: "FR" },
      flightData,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({ departure: expect.objectContaining({ countryCode: "FR" }) }),
    );
  });

  it("skips departureCity when flightData.from is already set", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { from: "Lyon", needsDateWidget: true };

    persistExtractedEntities(
      { departureCity: "Paris" },
      flightData,
      widgetFlow,
      updateMemory,
      {},
    );

    // Should NOT be called (departureCity skipped, no other memory-producing entities)
    expect(updateMemory).not.toHaveBeenCalled();
  });

  it("skips departureCountryCode when flightData.from is already set", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { from: "Lyon" };

    persistExtractedEntities(
      { departureCountryCode: "FR" },
      flightData,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).not.toHaveBeenCalled();
  });

  it("emits form event for departureCity when flightData has no 'from'", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { needsDateWidget: true };

    persistExtractedEntities(
      { departureCity: "Marseille" },
      flightData,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(eventBus.emit).toHaveBeenCalledWith(
      "flight:updateFormData",
      expect.objectContaining({ from: "Marseille" }),
    );
  });

  it("does NOT emit form event for departureCity when flightData.from is set", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { from: "Lyon" };

    persistExtractedEntities(
      { departureCity: "Marseille" },
      flightData,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});

// ─── onlyWithoutFlightData guard ───

describe("onlyWithoutFlightData guard", () => {
  it("skips adults when any flightData exists", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { needsDateWidget: true };

    persistExtractedEntities(
      { adults: 3 },
      flightData,
      widgetFlow,
      updateMemory,
      {},
    );

    // adults has onlyWithoutFlightData: true, so it should be skipped
    expect(updateMemory).not.toHaveBeenCalled();
  });

  it("persists adults when flightData is null", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { adults: 3 },
      null,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({ passengers: expect.objectContaining({ adults: 3 }) }),
    );
  });

  it("skips destinationCountry when flightData exists", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { destinationCountry: "Japan" },
      { to: "Tokyo" } as FlightFormData,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).not.toHaveBeenCalled();
  });

  it("persists destinationCountry when flightData is null", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { destinationCountry: "Japan" },
      null,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({ arrival: expect.objectContaining({ country: "Japan" }) }),
    );
  });
});

// ─── Widget refs (tripDuration, preferredMonth) ───

describe("widget ref routing", () => {
  it("routes tripDuration to widgetFlow.setPendingTripDuration", () => {
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { tripDuration: "4 jours" },
      null,
      widgetFlow,
    );

    expect(widgetFlow.setPendingTripDuration).toHaveBeenCalledWith("4 jours");
  });

  it("routes preferredMonth to widgetFlow.setPendingPreferredMonth", () => {
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { preferredMonth: "juillet" },
      null,
      widgetFlow,
    );

    expect(widgetFlow.setPendingPreferredMonth).toHaveBeenCalledWith("juillet");
  });

  it("reads tripDuration from flightData (higher priority)", () => {
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = { tripDuration: "5 jours" };

    persistExtractedEntities(
      { tripDuration: "4 jours" },
      flightData,
      widgetFlow,
    );

    // Both calls happen — intent entity first, then flightData overrides
    expect(widgetFlow.setPendingTripDuration).toHaveBeenCalledWith("5 jours");
  });
});

// ─── Traveler derivation from travelStyle ───

describe("travelStyle → passenger derivation", () => {
  it("derives 2 adults from 'couple' when current adults ≤ 1", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { travelStyle: "couple" },
      null,
      widgetFlow,
      updateMemory,
      { passengers: { adults: 1, children: 0, infants: 0 } },
    );

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({ passengers: expect.objectContaining({ adults: 2 }) }),
    );
  });

  it("does NOT override when current adults > 1", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { travelStyle: "couple" },
      null,
      widgetFlow,
      updateMemory,
      { passengers: { adults: 3, children: 0, infants: 0 } },
    );

    // No passengers update expected (style ignored when adults already set)
    expect(updateMemory).not.toHaveBeenCalled();
  });
});

// ─── Date parsing ───

describe("exact date parsing", () => {
  it("persists valid exactDepartureDate", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { exactDepartureDate: "2026-07-15" },
      null,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({ departureDate: expect.any(Date) }),
    );
  });

  it("ignores invalid date string", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { exactDepartureDate: "not-a-date" },
      null,
      widgetFlow,
      updateMemory,
      {},
    );

    // toMemory returns {} for invalid date → no memory update
    expect(updateMemory).not.toHaveBeenCalled();
  });
});

// ─── Edge cases ───

describe("edge cases", () => {
  it("returns early when intentEntities is undefined and no legs", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(undefined, null, widgetFlow, updateMemory);

    expect(updateMemory).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("skips null/undefined entity values", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { departureCity: null, adults: undefined },
      null,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).not.toHaveBeenCalled();
  });

  it("skips unknown entity keys", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { unknownEntity: "value" },
      null,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).not.toHaveBeenCalled();
  });

  it("batches multiple entities into a single updateMemory call", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();

    persistExtractedEntities(
      { departureCity: "Paris", adults: 2, children: 1 },
      null,
      widgetFlow,
      updateMemory,
      {},
    );

    expect(updateMemory).toHaveBeenCalledTimes(1);
    const batch = updateMemory.mock.calls[0][0];
    expect(batch.departure).toEqual(expect.objectContaining({ city: "Paris" }));
    expect(batch.passengers).toEqual(expect.objectContaining({ adults: 2, children: 1 }));
  });

  it("handles multi-destination legs from flightData", () => {
    const updateMemory = vi.fn();
    const widgetFlow = makeWidgetFlow();
    const flightData: FlightFormData = {
      legs: [
        { from: "Paris", to: "Tokyo", date: "2026-07-15" },
        { from: "Tokyo", to: "Seoul", date: "2026-07-20" },
      ],
    };

    persistExtractedEntities(undefined, flightData, widgetFlow, updateMemory, {});

    expect(updateMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        tripType: "multi",
        legs: expect.arrayContaining([
          expect.objectContaining({ departure: { city: "Paris" }, arrival: { city: "Tokyo" } }),
        ]),
      }),
    );
  });
});
