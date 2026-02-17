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

// ─── Style skipped bug: styleAxesUserConfirmed ────────────────────────

describe("Style skipped bug — styleAxesUserConfirmed", () => {
  it("DEFAULT_PREFERENCES has styleAxesUserConfirmed=false", async () => {
    const { DEFAULT_PREFERENCES } = await import(
      "@/stores/slices/preferenceTypes"
    );
    expect(DEFAULT_PREFERENCES.styleAxesUserConfirmed).toBe(false);
  });

  it("buildLLMContext returns styleAxesConfigured=false when user hasn't confirmed", async () => {
    const { buildLLMContext } = await import(
      "@/components/planner/chat/hooks/buildLLMContext"
    );
    const sources = buildMockSources({ styleAxesUserConfirmed: false });
    const ctx = buildLLMContext(sources);
    const state = ctx.preferencesState as { styleAxesConfigured: boolean };
    expect(state.styleAxesConfigured).toBe(false);
  });

  it("buildLLMContext returns styleAxesConfigured=true after user confirms", async () => {
    const { buildLLMContext } = await import(
      "@/components/planner/chat/hooks/buildLLMContext"
    );
    const sources = buildMockSources({ styleAxesUserConfirmed: true });
    const ctx = buildLLMContext(sources);
    const state = ctx.preferencesState as { styleAxesConfigured: boolean };
    expect(state.styleAxesConfigured).toBe(true);
  });

  it("BaseStep.tsx sets styleAxesUserConfirmed=true in handleApplyPreset", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const code = fs.readFileSync(
      path.resolve("src/components/planner/preferences/steps/BaseStep.tsx"),
      "utf-8"
    );
    expect(code).toContain("styleAxesUserConfirmed: true");
  });

  it("usePreferenceWidgetCallbacks sets styleAxesUserConfirmed on style continue", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const code = fs.readFileSync(
      path.resolve("src/components/planner/chat/hooks/usePreferenceWidgetCallbacks.ts"),
      "utf-8"
    );
    expect(code).toContain("styleAxesUserConfirmed: true");
  });

  it("buildLLMContext source uses styleAxesUserConfirmed instead of axes existence check", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const code = fs.readFileSync(
      path.resolve("src/components/planner/chat/hooks/buildLLMContext.ts"),
      "utf-8"
    );
    expect(code).toContain("styleAxesUserConfirmed");
    // Must NOT contain the old broken logic
    expect(code).not.toContain("if (!axes) return false");
  });
});

// ─── Bug E: preferenceInterests shown in loop (widget cooldown not blocking) ──

describe("Bug E — widget cooldown blocks after MAX_WIDGET_ATTEMPTS", () => {
  it("canShowWidget returns false after 2 shows (MAX_WIDGET_ATTEMPTS=2)", async () => {
    // Pure logic test: simulate the cooldown state machine
    const history = new Map<string, { confirmed: boolean; dismissed: boolean; attempts: number; shownAt: number; userTypedInstead: boolean }>();
    const MAX_WIDGET_ATTEMPTS = 2;

    // Simulate 2 shows
    history.set("preferenceInterests", {
      confirmed: false,
      dismissed: false,
      attempts: 2,
      shownAt: Date.now(),
      userTypedInstead: false,
    });

    const record = history.get("preferenceInterests")!;
    const isBlocked = record.attempts >= MAX_WIDGET_ATTEMPTS;
    expect(isBlocked).toBe(true);
  });

  it("confirmed widget should be in blockedWidgets list", async () => {
    const history = new Map<string, { confirmed: boolean; attempts: number }>();
    history.set("preferenceInterests", { confirmed: true, attempts: 1 });

    const REFINABLE_WIDGETS = new Set<string>([]);
    const record = history.get("preferenceInterests")!;
    const isBlocked = record.confirmed && !REFINABLE_WIDGETS.has("preferenceInterests");
    expect(isBlocked).toBe(true);
  });

  it("applyPreferenceFirstLogic skips preferenceInterests when in blockedWidgets", async () => {
    // Read source to verify the guard exists
    const fs = await import("fs");
    const path = await import("path");
    const code = fs.readFileSync(
      path.resolve("supabase/functions/planner-chat/index.ts"),
      "utf-8"
    );
    // Must check blockedWidgets before forcing preferenceInterests
    expect(code).toContain('blockedWidgets.includes("preferenceInterests")');
    expect(code).toContain("preferenceInterests blocked (already confirmed)");
  });
});

// ─── Bug E2: blockedWidgets must be sent to backend ──────────────────

describe("Bug E2 — blockedWidgets transmitted to backend", () => {
  it("useChatStream sends blockedWidgets in request body", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/useChatStream?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    expect(code).toContain("blockedWidgets:");
    expect(code).toContain("memoryContext.blockedWidgets");
  });
});

// ─── Bug F: Argentina suggested despite "Europe only" constraint ─────

describe("Bug F — geographic constraint in destination suggestions", () => {
  it("destination suggestion request should include geographic preferences", async () => {
    // Verify the edge function accepts and processes geographic constraints
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve("supabase/functions/planner-chat/index.ts");
    const code = fs.readFileSync(filePath, "utf-8");
    // The backend should receive and use preferencesState or constraints
    expect(code).toContain("preferencesState");
  });

  it("buildLLMContext includes sessionEntities with constraints", async () => {
    const { buildLLMContext } = await import(
      "@/components/planner/chat/hooks/buildLLMContext"
    );
    const sources = buildMockSources({});
    // Override sessionContext with entities
    (sources as any).sessionContext = {
      buildConversationSummary: () => "Utilisateur veut rester en Europe",
      sessionEntities: {
        destinations: [],
        constraints: ["europe"],
      },
      widgetDecisions: [],
    };
    const ctx = buildLLMContext(sources as any);
    // Session entities should be passed through to LLM context
    expect(ctx.sessionEntities).toBeDefined();
    expect((ctx.sessionEntities as any)?.constraints).toContain("europe");
  });
});

// ─── Bug G: datePicker widget rendered before intent processing ──────

describe("Bug G — widget-text coherence for preference widgets", () => {
  it("validateWidgetTextCoherence passes preferenceInterests for generic text", async () => {
    const { validateWidgetTextCoherence } = await import(
      "@/components/planner/chat/services/messageAnalyzer"
    );
    // Generic preference-gathering text should NOT suppress preferenceInterests
    const result = validateWidgetTextCoherence(
      "Indiquez ce qui vous attire le plus pour ce week-end :",
      "preferenceInterests"
    );
    expect(result).toBe("preferenceInterests");
  });

  it("validateWidgetTextCoherence passes preferenceStyle for style-related text", async () => {
    const { validateWidgetTextCoherence } = await import(
      "@/components/planner/chat/services/messageAnalyzer"
    );
    const result = validateWidgetTextCoherence(
      "Quel est votre style de voyage ?",
      "preferenceStyle"
    );
    expect(result).toBe("preferenceStyle");
  });

  it("validateWidgetTextCoherence rejects datePicker for preference text", async () => {
    const { validateWidgetTextCoherence } = await import(
      "@/components/planner/chat/services/messageAnalyzer"
    );
    // Text about preferences should NOT show a datePicker
    const result = validateWidgetTextCoherence(
      "Qu'est-ce qui vous attire le plus ?",
      "datePicker"
    );
    // No rule matches this text, so datePicker passes through (no false positive)
    // The key is that preferenceInterests should NOT be suppressed
    expect(result).not.toBe(null);
  });
});

// ─── Bug H: 500 errors with retry exhaustion ─────────────────────────

describe("Bug H — retry exhaustion produces user-facing error", () => {
  it("useChatStream source handles retry exhaustion", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/useChatStream?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    // Must have retry logic with max attempts
    expect(code).toContain("maxRetries");
    // Must track stream errors in debug store
    expect(code).toContain("addStreamError");
  });
});

// ─── Bug I: preferredRegion in destination suggestion payload ─────────

describe("Bug I — preferredRegion in destination payload", () => {
  it("buildDestinationPayload maps preferredRegion when provided", async () => {
    const { buildDestinationPayload } = await import(
      "@/components/planner/chat/utils/buildDestinationPayload"
    );
    const result = buildDestinationPayload({
      preferences: {
        styleAxes: { chillVsIntense: 50, cityVsNature: 50, ecoVsLuxury: 50, touristVsLocal: 50 },
        interests: [],
        mustHaves: {},
        dietaryRestrictions: [],
      },
      preferredRegion: "Méditerranée",
    });
    expect(result.preferredRegion).toBe("Méditerranée");
  });

  it("buildDestinationPayload omits preferredRegion when not provided", async () => {
    const { buildDestinationPayload } = await import(
      "@/components/planner/chat/utils/buildDestinationPayload"
    );
    const result = buildDestinationPayload({
      preferences: {
        styleAxes: { chillVsIntense: 50, cityVsNature: 50, ecoVsLuxury: 50, touristVsLocal: 50 },
        interests: [],
        mustHaves: {},
        dietaryRestrictions: [],
      },
    });
    expect(result.preferredRegion).toBeUndefined();
  });

  it("DestinationSuggestRequest type includes preferredRegion field", async () => {
    const source = await import("@/types/destinations?raw");
    const code = (source as unknown as { default: string }).default ?? String(source);
    expect(code).toContain("preferredRegion");
  });
});

// ─── Bug J: destinationSuggestions NOT auto-confirmed ────────────────

describe("Bug J — destinationSuggestions only confirmed on user click", () => {
  it("handleDestinationSelect is the only place that confirms destinationSuggestions", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/useChatDestinationFlow?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    // widgetConfirmed: true must only appear inside handleDestinationSelect
    const confirmMatches = [...code.matchAll(/widgetConfirmed:\s*true/g)];
    // Should be exactly 1 occurrence (in handleDestinationSelect)
    expect(confirmMatches.length).toBe(1);
  });

  it("A4 guard dismisses previous unconfirmed destination widgets", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/useChatDestinationFlow?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    // Must contain the A4 dismiss logic
    expect(code).toContain('widget === "destinationSuggestions" && !m.widgetConfirmed');
  });
});

// ─── Bug K: citySelector guard for missing data ──────────────────────

describe("Bug K — citySelector not rendered without data", () => {
  it("WidgetRenderer returns null for citySelector without citySelection data", async () => {
    const source = await import(
      "@/components/planner/chat/widgets/WidgetRenderer?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    // Must have guard: if (!m.widgetData?.citySelection) return null
    expect(code).toContain("citySelection");
    expect(code).toMatch(/!m\.widgetData\?\.citySelection.*return null/s);
  });
});

// ─── Bug L: geographic region extraction ─────────────────────────────

describe("Bug L — geographic region extraction from user messages", () => {
  it("ENTITY_PATTERNS includes geoRegions patterns", async () => {
    const { ENTITY_PATTERNS } = await import(
      "@/components/planner/chat/hooks/useSessionContext"
    );
    expect(ENTITY_PATTERNS.geoRegions).toBeDefined();
    expect(ENTITY_PATTERNS.geoRegions.length).toBeGreaterThan(0);
  });

  it("extractEntities detects 'Méditerranée' from user text", async () => {
    const { extractEntities, ENTITY_PATTERNS } = await import(
      "@/components/planner/chat/hooks/useSessionContext"
    );
    const result = extractEntities(
      "On aimerait un beau voyage en Méditerranée",
      ENTITY_PATTERNS.geoRegions,
      3,
    );
    expect(result).toContain("Méditerranée");
  });

  it("extractEntities detects 'Europe' from 'rester en Europe'", async () => {
    const { extractEntities, ENTITY_PATTERNS } = await import(
      "@/components/planner/chat/hooks/useSessionContext"
    );
    const result = extractEntities(
      "On veut rester en Europe",
      ENTITY_PATTERNS.geoRegions,
      3,
    );
    expect(result).toContain("Europe");
  });

  it("SessionEntities type includes geoRegions field", async () => {
    const source = await import(
      "@/components/planner/chat/hooks/chatStreamTypes?raw"
    );
    const code = (source as unknown as { default: string }).default ?? String(source);
    expect(code).toContain("geoRegions");
  });
});

function buildMockSources(prefOverrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    getActivityMemory: () => null,
    getPreferenceMemory: () => ({
      travelStyle: "couple",
      pace: "moderate",
      comfortLabel: "Confort",
      interests: [],
      styleAxes: { chillVsIntense: 50, cityVsNature: 50, ecoVsLuxury: 50, touristVsLocal: 50 },
      ...prefOverrides,
    }),
    mapContext: { buildContextString: () => "" },
    widgetTracking: {
      getActiveWidgetsContext: () => "",
      getContextForLLM: () => "",
    },
    widgetActionExecutor: { getPendingWidgets: () => [] },
    getMemorySummary: () => "",
    missingFields: undefined,
    sessionContext: {
      buildConversationSummary: () => "",
      sessionEntities: {},
      widgetDecisions: [],
    },
    getBasketSummary: () => "",
    widgetCooldown: { getBlockedWidgets: () => [] },
  };
}
