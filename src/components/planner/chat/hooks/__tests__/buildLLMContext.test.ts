/**
 * Tests for buildLLMContext pure function
 * Tests: phase detection, context assembly, preferences state, truncation
 */

import { describe, it, expect } from "vitest";
import { buildLLMContext, truncateField } from "../buildLLMContext";
import type { ChatMessage } from "../../types";

// ─── Helpers ───

function makeMinimalSources(overrides: Record<string, unknown> = {}) {
  return {
    messages: [] as ChatMessage[],
    getActivityMemory: () => null,
    getPreferenceMemory: () => null,
    mapContext: { buildContextString: () => "" },
    widgetTracking: {
      getActiveWidgetsContext: () => "",
      getContextForLLM: () => "",
    },
    widgetActionExecutor: {
      getPendingWidgets: () => [],
    },
    getMemorySummary: () => "",
    missingFields: undefined,
    sessionContext: {
      buildConversationSummary: () => "",
      sessionEntities: {},
      widgetDecisions: [],
    },
    getBasketSummary: () => "",
    widgetCooldown: { getBlockedWidgets: () => [] },
    ...overrides,
  };
}

// ─── Phase detection ───

describe("buildLLMContext — phase detection", () => {
  it("returns inspiration phase when no destination and asking for inspiration", () => {
    const sources = makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "je ne sais pas où aller" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: false,
        hasDates: false,
        hasTravelers: false,
        hasFlightResults: false,
        hasHotelResults: false,
      },
    });
    const result = buildLLMContext(sources as any);
    expect(result.currentPhase).toBe("inspiration");
  });

  it("returns research phase when destination exists but dates missing", () => {
    const sources = makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "je veux aller à Tokyo" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: true,
        hasDates: false,
        hasTravelers: false,
        hasFlightResults: false,
        hasHotelResults: false,
      },
    });
    const result = buildLLMContext(sources as any);
    expect(result.currentPhase).toBe("research");
  });

  it("returns planning phase when all basic info collected", () => {
    const sources = makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "on part le 5 mai" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        hasFlightResults: false,
        hasHotelResults: false,
      },
    });
    const result = buildLLMContext(sources as any);
    expect(result.currentPhase).toBe("planning");
  });

  it("returns comparison phase when flight results exist", () => {
    const sources = makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "montre moi les vols" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        hasFlightResults: true,
        hasHotelResults: false,
      },
    });
    const result = buildLLMContext(sources as any);
    expect(result.currentPhase).toBe("comparison");
  });

  it("returns undefined phase when no phaseSignals provided", () => {
    const sources = makeMinimalSources();
    const result = buildLLMContext(sources as any);
    expect(result.currentPhase).toBeUndefined();
  });
});

// ─── Context assembly ───

describe("buildLLMContext — context assembly", () => {
  it("includes activity context when activities exist", () => {
    const sources = makeMinimalSources({
      getActivityMemory: () => ({ totalActivities: 3 }),
    });
    const result = buildLLMContext(sources as any);
    expect(result.activityContext).toContain("3 activité(s) planifiée(s)");
  });

  it("does not include activity context when 0 activities", () => {
    const sources = makeMinimalSources({
      getActivityMemory: () => ({ totalActivities: 0 }),
    });
    const result = buildLLMContext(sources as any);
    expect(result.activityContext).not.toContain("ACTIVITÉS");
  });

  it("includes preference context when preferences exist", () => {
    const sources = makeMinimalSources({
      getPreferenceMemory: () => ({
        pace: "moderate",
        travelStyle: "couple",
        comfortLabel: "standard",
        interests: ["beach", "culture"],
      }),
    });
    const result = buildLLMContext(sources as any);
    expect(result.preferenceContext).toContain("moderate");
    expect(result.preferenceContext).toContain("couple");
    expect(result.preferenceContext).toContain("beach, culture");
  });

  it("returns empty preference context when no preferences", () => {
    const sources = makeMinimalSources();
    const result = buildLLMContext(sources as any);
    expect(result.preferenceContext).toBe("");
  });

  it("includes flight summary from memory", () => {
    const sources = makeMinimalSources({
      getMemorySummary: () => "Paris → Tokyo | 2 voyageurs",
    });
    const result = buildLLMContext(sources as any);
    expect(result.flightSummary).toBe("Paris → Tokyo | 2 voyageurs");
  });

  it("includes basket summary", () => {
    const sources = makeMinimalSources({
      getBasketSummary: () => "[PANIER] Vol 450€",
    });
    const result = buildLLMContext(sources as any);
    expect(result.basketSummary).toBe("[PANIER] Vol 450€");
  });
});

// ─── Preferences state ───

describe("buildLLMContext — preferencesState", () => {
  it("returns empty preferences state when no preferences", () => {
    const sources = makeMinimalSources();
    const result = buildLLMContext(sources as any);
    expect(result.preferencesState).toEqual({
      interests: [],
      style: null,
      pace: null,
      styleAxesConfigured: false,
    });
  });

  it("includes interests from preference memory", () => {
    const sources = makeMinimalSources({
      getPreferenceMemory: () => ({
        interests: ["beach", "culture"],
        travelStyle: "solo",
        pace: "fast",
      }),
    });
    const result = buildLLMContext(sources as any);
    expect((result.preferencesState as any).interests).toEqual(["beach", "culture"]);
    expect((result.preferencesState as any).style).toBe("solo");
    expect((result.preferencesState as any).pace).toBe("fast");
  });

  it("detects configured style axes", () => {
    const sources = makeMinimalSources({
      getPreferenceMemory: () => ({
        interests: [],
        styleAxes: {
          chillVsIntense: 30,
          cityVsNature: 50,
          ecoVsLuxury: 50,
          touristVsLocal: 50,
        },
      }),
    });
    const result = buildLLMContext(sources as any);
    // chillVsIntense != 50 → configured
    expect((result.preferencesState as any).styleAxesConfigured).toBe(true);
  });

  it("detects default style axes as configured (balanced is a valid choice)", () => {
    const sources = makeMinimalSources({
      getPreferenceMemory: () => ({
        interests: [],
        styleAxes: {
          chillVsIntense: 50,
          cityVsNature: 50,
          ecoVsLuxury: 50,
          touristVsLocal: 50,
        },
      }),
    });
    const result = buildLLMContext(sources as any);
    // All at 50 is still a valid confirmed configuration
    expect((result.preferencesState as any).styleAxesConfigured).toBe(true);
  });
});

// ─── R3: truncateField ───

describe("truncateField", () => {
  it("returns short strings unchanged", () => {
    expect(truncateField("hello", 100)).toBe("hello");
  });

  it("returns empty string unchanged", () => {
    expect(truncateField("", 100)).toBe("");
  });

  it("truncates strings exceeding maxChars", () => {
    const long = "a".repeat(500);
    const result = truncateField(long, 100);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).toContain("… [tronqué]");
  });

  it("returns string at exact boundary unchanged", () => {
    const exact = "a".repeat(100);
    expect(truncateField(exact, 100)).toBe(exact);
  });

  it("truncates context fields in buildLLMContext", () => {
    const longHistory = "x".repeat(2000);
    const sources = makeMinimalSources({
      widgetTracking: {
        getActiveWidgetsContext: () => "",
        getContextForLLM: () => longHistory,
      },
    });
    const result = buildLLMContext(sources as any);
    expect((result.widgetHistory as string).length).toBeLessThanOrEqual(800);
    expect(result.widgetHistory).toContain("… [tronqué]");
  });
});
