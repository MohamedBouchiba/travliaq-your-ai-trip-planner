/**
 * Widget Anti-Loop Test Suite
 *
 * Non-regression tests for the infinite loop bug where the backend
 * kept reproposing preferenceStyle even after user confirmation.
 *
 * Root causes fixed:
 * 1. applyPreferenceFirstLogic ignored blockedWidgets
 * 2. buildLLMContext treated styleAxes all-at-50 as "not configured"
 */

import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { buildLLMContext, truncateField } from "@/components/planner/chat/hooks/buildLLMContext";

// ─── Helpers ───

/** Minimal ContextSources stub for buildLLMContext */
function makeContextSources(overrides: {
  preferenceMemory?: Record<string, unknown> | null;
  blockedWidgets?: string[];
  messages?: Array<{ widget?: string; widgetConfirmed?: boolean; widgetData?: Record<string, unknown> }>;
} = {}) {
  const {
    preferenceMemory = null,
    blockedWidgets = [],
    messages = [],
  } = overrides;

  return {
    messages: messages as any,
    getActivityMemory: () => null,
    getPreferenceMemory: () => preferenceMemory,
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
    widgetCooldown: { getBlockedWidgets: () => blockedWidgets },
  };
}

/**
 * Replica of the critical applyPreferenceFirstLogic rules.
 * The real function lives in the edge function (not importable client-side),
 * so we replicate the exact guards here for testing.
 */
function applyPreferenceFirstLogic(params: {
  intent: string;
  widgetToShow: string | null;
  blockedWidgets: string[];
  styleAxesConfigured: boolean;
  interestsExist: boolean;
}): string | null {
  const { intent, widgetToShow, blockedWidgets, styleAxesConfigured, interestsExist } = params;

  // Guard 1: conversational intents are never overridden
  const conversationalIntents = [
    "greeting", "thank_you", "goodbye", "off_topic",
    "provide_budget", "provide_dates", "provide_travelers",
    "provide_destination", "confirm_choice",
  ];
  if (conversationalIntents.includes(intent)) return widgetToShow;

  // Guard 2: if LLM already assigned a specific non-preference widget, keep it
  const preferenceWidgets = ["preferenceStyle", "preferenceInterests"];
  if (widgetToShow && !preferenceWidgets.includes(widgetToShow)) return widgetToShow;

  // Guard 3: check if style needs to be shown
  if (!styleAxesConfigured && !blockedWidgets.includes("preferenceStyle")) {
    return "preferenceStyle";
  }

  // Guard 4: check if interests need to be shown
  if (!interestsExist && !blockedWidgets.includes("preferenceInterests")) {
    return "preferenceInterests";
  }

  // All preferences gathered — don't force any widget
  return widgetToShow;
}

// ─── Test Registration ───

export function registerWidgetAntiLoopTests() {
  setCategory("widgetAntiLoop");

  // ═══════════════════════════════════════════
  // Section 1: buildLLMContext — preferencesState
  // ═══════════════════════════════════════════

  describe("buildLLMContext — styleAxesConfigured", () => {
    it("returns true when axes exist with all values at 50 (balanced)", () => {
      const sources = makeContextSources({
        preferenceMemory: {
          styleAxes: { chillVsIntense: 50, cityVsNature: 50, ecoVsLuxury: 50, touristVsLocal: 50 },
          travelStyle: "balanced",
          pace: "moderate",
          interests: ["culture"],
        },
      });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.preferencesState.styleAxesConfigured).toBe(true);
    });

    it("returns true when axes have mixed values", () => {
      const sources = makeContextSources({
        preferenceMemory: {
          styleAxes: { chillVsIntense: 20, cityVsNature: 80, ecoVsLuxury: 50, touristVsLocal: 30 },
        },
      });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.preferencesState.styleAxesConfigured).toBe(true);
    });

    it("returns false when no axes exist", () => {
      const sources = makeContextSources({ preferenceMemory: { travelStyle: "adventure" } });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.preferencesState.styleAxesConfigured).toBe(false);
    });

    it("returns false when preferenceMemory is null", () => {
      const sources = makeContextSources({ preferenceMemory: null });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.preferencesState.styleAxesConfigured).toBe(false);
    });
  });

  describe("buildLLMContext — blockedWidgets & preferencesState", () => {
    it("includes blockedWidgets array in context", () => {
      const sources = makeContextSources({ blockedWidgets: ["preferenceStyle", "preferenceInterests"] });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.blockedWidgets).toContain("preferenceStyle");
      expect(ctx.blockedWidgets).toContain("preferenceInterests");
    });

    it("returns empty blockedWidgets when none blocked", () => {
      const sources = makeContextSources({ blockedWidgets: [] });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.blockedWidgets.length).toBe(0);
    });

    it("remonte interests correctly in preferencesState", () => {
      const sources = makeContextSources({
        preferenceMemory: { interests: ["culture", "gastronomie", "nature"] },
      });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.preferencesState.interests).toContain("culture");
      expect(ctx.preferencesState.interests).toContain("gastronomie");
      expect(ctx.preferencesState.interests.length).toBe(3);
    });

    it("remonte style correctly in preferencesState", () => {
      const sources = makeContextSources({
        preferenceMemory: { travelStyle: "adventure", pace: "intense" },
      });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.preferencesState.style).toBe("adventure");
      expect(ctx.preferencesState.pace).toBe("intense");
    });
  });

  // ═══════════════════════════════════════════
  // Section 2: Anti-loop — applyPreferenceFirstLogic guards
  // ═══════════════════════════════════════════

  describe("Anti-loop — blocked widget prevents override", () => {
    it("blocked preferenceStyle prevents override to preferenceStyle", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle"],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).not.toBe("preferenceStyle");
    });

    it("blocked preferenceInterests prevents override to preferenceInterests", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: ["preferenceInterests"],
        styleAxesConfigured: true,
        interestsExist: false,
      });
      expect(result).not.toBe("preferenceInterests");
    });

    it("both widgets blocked = no preference widget forced", () => {
      const result = applyPreferenceFirstLogic({
        intent: "gather_preferences",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle", "preferenceInterests"],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).not.toBe("preferenceStyle");
      expect(result).not.toBe("preferenceInterests");
    });
  });

  describe("Anti-loop — conversational intents never overridden", () => {
    it("greeting intent keeps null widget", () => {
      const result = applyPreferenceFirstLogic({
        intent: "greeting",
        widgetToShow: null,
        blockedWidgets: [],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).toBe(null);
    });

    it("thank_you intent keeps null widget", () => {
      const result = applyPreferenceFirstLogic({
        intent: "thank_you",
        widgetToShow: null,
        blockedWidgets: [],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).toBe(null);
    });

    it("provide_budget keeps budgetRangeSlider widget", () => {
      const result = applyPreferenceFirstLogic({
        intent: "provide_budget",
        widgetToShow: "budgetRangeSlider",
        blockedWidgets: [],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).toBe("budgetRangeSlider");
    });
  });

  describe("Anti-loop — LLM-assigned non-preference widgets preserved", () => {
    it("budget widget is not overridden by preferenceStyle", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: "budgetRangeSlider",
        blockedWidgets: [],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).toBe("budgetRangeSlider");
    });

    it("dietary widget is not overridden", () => {
      const result = applyPreferenceFirstLogic({
        intent: "gather_preferences",
        widgetToShow: "dietary",
        blockedWidgets: [],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).toBe("dietary");
    });
  });

  // ═══════════════════════════════════════════
  // Section 3: Multi-turn scenarios
  // ═══════════════════════════════════════════

  describe("Anti-loop — multi-turn scenarios", () => {
    it("style confirmed + interests confirmed = no preference widget forced", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle", "preferenceInterests"],
        styleAxesConfigured: true,
        interestsExist: true,
      });
      expect(result).toBe(null);
    });

    it("gather_preferences + preferenceStyle blocked = no style override", () => {
      const result = applyPreferenceFirstLogic({
        intent: "gather_preferences",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle"],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).not.toBe("preferenceStyle");
    });

    it("ask_inspiration + preferenceStyle blocked = falls through to interests if needed", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle"],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(result).not.toBe("preferenceStyle");
      expect(result).toBe("preferenceInterests");
    });

    it("style configured + interests missing + interests not blocked = suggests interests", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: [],
        styleAxesConfigured: true,
        interestsExist: false,
      });
      expect(result).toBe("preferenceInterests");
    });
  });

  // ═══════════════════════════════════════════
  // Section 4: Regression — exact user bug scenario
  // ═══════════════════════════════════════════

  describe("Regression — user loop scenario", () => {
    it("full scenario: style confirmed → re-ask inspiration → NO style loop", () => {
      // Step 1: User says "je ne sais pas où aller" → system proposes preferenceStyle
      const step1 = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: [],
        styleAxesConfigured: false,
        interestsExist: false,
      });
      expect(step1).toBe("preferenceStyle");

      // Step 2: User confirms style (axes at 50 = valid) → widget goes to blockedWidgets
      const sources = makeContextSources({
        preferenceMemory: {
          styleAxes: { chillVsIntense: 50, cityVsNature: 50, ecoVsLuxury: 50, touristVsLocal: 50 },
          travelStyle: "balanced",
          interests: [],
        },
        blockedWidgets: ["preferenceStyle"],
      });
      const ctx = buildLLMContext(sources) as any;
      expect(ctx.preferencesState.styleAxesConfigured).toBe(true);
      expect(ctx.blockedWidgets).toContain("preferenceStyle");

      // Step 3: User re-asks inspiration → system MUST NOT re-propose preferenceStyle
      const step3 = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle"],
        styleAxesConfigured: true,
        interestsExist: false,
      });
      expect(step3).not.toBe("preferenceStyle");
    });

    it("full scenario: both preferences confirmed → free to suggest destinations", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle", "preferenceInterests"],
        styleAxesConfigured: true,
        interestsExist: true,
      });
      expect(result).toBe(null);
    });

    it("style blocked but interests still needed → suggests interests, not style", () => {
      const result = applyPreferenceFirstLogic({
        intent: "ask_inspiration",
        widgetToShow: null,
        blockedWidgets: ["preferenceStyle"],
        styleAxesConfigured: true,
        interestsExist: false,
      });
      expect(result).toBe("preferenceInterests");
      expect(result).not.toBe("preferenceStyle");
    });
  });

  // ═══════════════════════════════════════════
  // Section 5: truncateField utility
  // ═══════════════════════════════════════════

  describe("truncateField utility", () => {
    it("returns value unchanged if under budget", () => {
      expect(truncateField("short", 100)).toBe("short");
    });

    it("truncates long values with marker", () => {
      const long = "a".repeat(500);
      const result = truncateField(long, 100);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain("tronqué");
    });

    it("handles empty string", () => {
      expect(truncateField("", 100)).toBe("");
    });
  });
}
