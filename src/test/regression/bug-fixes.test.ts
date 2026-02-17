/**
 * Regression tests for critical bug fixes (Plan v2)
 *
 * Bug A:  ask-departure loop — store read instead of stale ref
 * Bug 11: ask-departure deduplication
 * Bug 6:  same-day date range guard
 * Bug D:  preferred_region default = "europe"
 * Bug 9:  debug tracking active in production
 * Bug B:  detectedLanguage required in intent schema
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { enUS } from "date-fns/locale";

// ─── Bug A & 11: useChatDestinationFlow guards ────────────────────────

describe("Bug A — ask-departure reads Zustand store directly", () => {
  it("should import usePlannerStoreV2 for direct getState() access", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/useChatDestinationFlow?raw"
    );
    // The source must reference usePlannerStoreV2.getState() to read departure
    // synchronously instead of relying on the React ref
    const code = (source as unknown as { default: string }).default ?? String(source);
    expect(code).toContain("usePlannerStoreV2.getState()");
    expect(code).toContain("departure?.city");
  });
});

describe("Bug 11 — ask-departure deduplication", () => {
  it("source code must check recent messages before adding ask-departure", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/useChatDestinationFlow?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    // Must contain the dedup slice check
    expect(code).toContain("slice(-3)");
    expect(code).toContain("ask-departure");
  });
});

// ─── Bug 6: same-day date range guard ─────────────────────────────────

describe("Bug 6 — same-day date range guard", () => {
  it("handleDateRangeSelect should reject same-day ranges", async () => {
    // Dynamic import to get the actual function
    const { handleDateRangeSelect } = await import(
      "@/components/planner/chat/hooks/widgetHandlers/dateHandlers"
    );

    const setMessages = vi.fn();
    const updateMemory = vi.fn();
    const tracking = {
      trackDateRangeSelect: vi.fn(),
      trackAirportSelect: vi.fn(),
      trackDateSelect: vi.fn(),
      trackTravelersSelect: vi.fn(),
      trackTripTypeSelect: vi.fn(),
      trackCitySelect: vi.fn(),
      recordInteraction: vi.fn(),
    };

    const deps = {
      memory: {
        tripType: "roundtrip" as const,
        departure: null,
        arrival: null,
        departureDate: null,
        returnDate: null,
        legs: [],
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: "economy" as const,
        directOnly: false,
        flexibleDates: false,
      },
      updateMemory,
      updateTravelers: vi.fn(),
      setMessages,
      tracking,
      t: ((key: string) => key) as any,
      dateFnsLocale: {} as any,
      buildTravelersLabel: vi.fn(),
      refs: {
        pendingTravelersWidget: { current: false },
        travelersConfirmed: { current: false },
        pendingTripDuration: { current: null },
        pendingPreferredMonth: { current: null },
        citySelectionShownForCountry: { current: null },
        searchButtonShown: { current: false },
        pendingFromCountry: { current: null },
        pendingSearchAfterTravelers: { current: false },
      },
    };

    const sameDay = new Date(2026, 2, 10); // March 10

    handleDateRangeSelect(deps, "msg-1", sameDay, sameDay);

    // updateMemory should NOT have been called (same-day guard)
    expect(updateMemory).not.toHaveBeenCalled();
    expect(setMessages).not.toHaveBeenCalled();
  });

  it("handleDateRangeSelect should accept different days", async () => {
    const { handleDateRangeSelect } = await import(
      "@/components/planner/chat/hooks/widgetHandlers/dateHandlers"
    );

    const setMessages = vi.fn();
    const updateMemory = vi.fn();
    const tracking = {
      trackDateRangeSelect: vi.fn(),
      trackAirportSelect: vi.fn(),
      trackDateSelect: vi.fn(),
      trackTravelersSelect: vi.fn(),
      trackTripTypeSelect: vi.fn(),
      trackCitySelect: vi.fn(),
      recordInteraction: vi.fn(),
    };

    const deps = {
      memory: {
        tripType: "roundtrip" as const,
        departure: null,
        arrival: null,
        departureDate: null,
        returnDate: null,
        legs: [],
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: "economy" as const,
        directOnly: false,
        flexibleDates: false,
      },
      updateMemory,
      updateTravelers: vi.fn(),
      setMessages,
      tracking,
      t: ((key: string) => key) as any,
      dateFnsLocale: enUS,
      buildTravelersLabel: vi.fn(),
      refs: {
        pendingTravelersWidget: { current: false },
        travelersConfirmed: { current: false },
        pendingTripDuration: { current: null },
        pendingPreferredMonth: { current: null },
        citySelectionShownForCountry: { current: null },
        searchButtonShown: { current: false },
        pendingFromCountry: { current: null },
        pendingSearchAfterTravelers: { current: false },
      },
    };

    const departure = new Date(2026, 2, 10);
    const returnDate = new Date(2026, 2, 17);

    handleDateRangeSelect(deps, "msg-1", departure, returnDate);

    // updateMemory SHOULD have been called (valid range)
    expect(updateMemory).toHaveBeenCalledWith({
      departureDate: departure,
      returnDate: returnDate,
    });
  });
});

// ─── Bug D: preferred_region defaults to "europe" ─────────────────────

describe("Bug D — preferred_region default", () => {
  it("findNearestAirports should default preferredRegion to 'europe'", async () => {
    const source = await import("@/hooks/useNearestAirports?raw");
    const code = (source as unknown as { default: string }).default ?? String(source);
    // The function signature should have a default value for preferredRegion
    expect(code).toMatch(/preferredRegion.*=.*"europe"/);
  });
});

// ─── Bug 9: debug tracking not gated by DEV ───────────────────────────

describe("Bug 9 — debug event capture works in production", () => {
  it("useDebugEventBusCapture should NOT check import.meta.env.DEV", async () => {
    const source = await import("@/hooks/useDebugEventBusCapture?raw");
    const code = (source as unknown as { default: string }).default ?? String(source);
    // Must NOT contain the DEV guard that would skip capture in prod
    expect(code).not.toContain("if (!import.meta.env.DEV) return;");
  });

  it("dateHandlers should call addUserInteraction on range select", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/widgetHandlers/dateHandlers?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    expect(code).toContain("addUserInteraction");
  });

  it("locationHandlers should call addUserInteraction on city select", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/widgetHandlers/locationHandlers?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    expect(code).toContain("addUserInteraction");
  });
});

// ─── Bug B: detectedLanguage required in intent schema ────────────────

describe("Bug B — detectedLanguage is required in intent schema", () => {
  it("intentClassifierTool should include detectedLanguage in required array", async () => {
    // We can't import the edge function directly, so we check the source
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      "supabase/functions/planner-chat/tools/intentClassifier.ts"
    );
    const code = fs.readFileSync(filePath, "utf-8");
    
    // Parse the required array from source
    const requiredMatch = code.match(/required:\s*\[([^\]]+)\]/);
    expect(requiredMatch).toBeTruthy();
    const requiredStr = requiredMatch![1];
    expect(requiredStr).toContain('"detectedLanguage"');
  });
});

// ─── Bug C: welcome message re-translation on language change ─────────

describe("Bug C — welcome re-translation on i18n.language change", () => {
  it("PlannerChat source should watch i18n.language and update welcome", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(
      "src/components/planner/PlannerChat.tsx"
    );
    const code = fs.readFileSync(filePath, "utf-8");
    
    // Must contain a useEffect that watches i18n.language
    expect(code).toContain("i18n.language");
    expect(code).toContain('m.id === "welcome"');
    // Must have the prevLangRef pattern for change detection
    expect(code).toContain("prevLangRef");
  });
});
