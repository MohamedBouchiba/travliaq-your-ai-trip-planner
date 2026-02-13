/**
 * Conversation flow integration tests
 *
 * Tests the critical decision logic extracted from the chat audit (14 bugs).
 * Validates backend phase mapping, widget-phase guards, budget/style guard,
 * number disambiguation, dietary dedup, and accumulator/parser fixes.
 *
 * Note: Backend Edge Function code uses Deno imports (npm:zod) and cannot be
 * imported directly. These tests re-create the pure decision logic inline
 * to validate the fix patterns. The actual implementation lives in:
 *   - supabase/functions/planner-chat/prompts/phasePrompts.ts
 *   - supabase/functions/planner-chat/index.ts
 *   - supabase/functions/planner-chat/validators/schemas.ts
 */

import { describe, it, expect } from "vitest";

// ─── Re-create phase mapping logic (mirrors phasePrompts.ts) ───────────────

type TravelPhase = "discovery" | "logistics" | "accommodation" | "activities" | "recap";

const LEGACY_PHASE_MAP: Record<string, TravelPhase> = {
  inspiration: "discovery",
  research: "logistics",
  comparison: "logistics",  // B4: was "accommodation", now fixed
  planning: "activities",
  booking: "recap",
};

function normalizeTravelPhase(phase: string | undefined): TravelPhase {
  if (!phase) return "discovery";
  if (phase in LEGACY_PHASE_MAP) return LEGACY_PHASE_MAP[phase];
  if (["discovery", "logistics", "accommodation", "activities", "recap"].includes(phase)) {
    return phase as TravelPhase;
  }
  return "discovery";
}

// ─── Re-create widget-phase validation (mirrors phasePrompts.ts B13) ───────

const VALID_WIDGETS_BY_PHASE: Record<TravelPhase, Set<string>> = {
  discovery: new Set([
    "preferenceInterests", "preferenceStyle", "destinationSuggestions",
    "citySelector", "budgetRangeSlider",
  ]),
  logistics: new Set([
    "datePicker", "dateRangePicker", "travelersSelector", "citySelector",
    "tripTypeConfirm", "budgetRangeSlider",
  ]),
  accommodation: new Set([
    "preferenceStyle", "budgetRangeSlider",
  ]),
  activities: new Set([
    "preferenceInterests",
  ]),
  recap: new Set([]),
};

function isWidgetValidInPhase(widgetType: string | undefined, phase: TravelPhase): boolean {
  if (!widgetType) return true;
  const allowed = VALID_WIDGETS_BY_PHASE[phase];
  if (!allowed || allowed.size === 0) return false;
  return allowed.has(widgetType);
}

// ─── Re-create budget/style guard (mirrors index.ts B5) ────────────────────

interface IntentClassificationResult {
  primaryIntent: string;
  confidence: number;
  entities: Record<string, unknown>;
  widgetToShow?: { type: string; reason: string };
}

function applyBudgetStyleGuard(intent: IntentClassificationResult): IntentClassificationResult {
  if (intent.widgetToShow?.type !== "preferenceStyle") return intent;

  const entities = intent.entities || {};
  const hasBudgetSignal =
    entities.budgetLevel != null ||
    entities.budgetMin != null ||
    entities.budgetMax != null ||
    entities.priceRange != null;

  if (hasBudgetSignal) {
    return {
      ...intent,
      widgetToShow: {
        type: "budgetRangeSlider",
        reason: "Budget-related entities detected",
      },
    };
  }

  return intent;
}

// ─── Re-create number disambiguation detection (mirrors index.ts B6) ───────

function detectNumberAfterList(
  lastAssistantMessage: string,
  lastUserMessage: string,
): { isNumberSelection: boolean } {
  const isNumberOnly = /^\d{1,2}$/.test(lastUserMessage.trim());
  const hasNumberedList = /\d+\.\s+.+/m.test(lastAssistantMessage);
  return { isNumberSelection: isNumberOnly && hasNumberedList };
}

// ─── Re-create dietary dedup logic (mirrors index.ts B14) ──────────────────

function mergeDietaryRestrictions(
  existing: string[] | undefined,
  incoming: string[] | undefined,
): string[] {
  if (!incoming) return existing || [];
  if (!existing) return incoming;
  return [...new Set([...existing, ...incoming])];
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("B4: Phase mapping — comparison → logistics (not accommodation)", () => {
  it('maps "comparison" to "logistics"', () => {
    expect(normalizeTravelPhase("comparison")).toBe("logistics");
  });

  it('maps "research" to "logistics"', () => {
    expect(normalizeTravelPhase("research")).toBe("logistics");
  });

  it('maps "inspiration" to "discovery"', () => {
    expect(normalizeTravelPhase("inspiration")).toBe("discovery");
  });

  it("passes through native phases unchanged", () => {
    expect(normalizeTravelPhase("discovery")).toBe("discovery");
    expect(normalizeTravelPhase("logistics")).toBe("logistics");
    expect(normalizeTravelPhase("accommodation")).toBe("accommodation");
    expect(normalizeTravelPhase("activities")).toBe("activities");
    expect(normalizeTravelPhase("recap")).toBe("recap");
  });

  it("defaults to discovery for unknown phases", () => {
    expect(normalizeTravelPhase("unknown")).toBe("discovery");
    expect(normalizeTravelPhase(undefined)).toBe("discovery");
    expect(normalizeTravelPhase("")).toBe("discovery");
  });
});

describe("B13: Widget-phase validation", () => {
  it("allows preferenceInterests in discovery", () => {
    expect(isWidgetValidInPhase("preferenceInterests", "discovery")).toBe(true);
  });

  it("blocks preferenceInterests in logistics", () => {
    expect(isWidgetValidInPhase("preferenceInterests", "logistics")).toBe(false);
  });

  it("blocks destinationSuggestions in logistics", () => {
    expect(isWidgetValidInPhase("destinationSuggestions", "logistics")).toBe(false);
  });

  it("allows datePicker in logistics", () => {
    expect(isWidgetValidInPhase("datePicker", "logistics")).toBe(true);
  });

  it("allows travelersSelector in logistics", () => {
    expect(isWidgetValidInPhase("travelersSelector", "logistics")).toBe(true);
  });

  it("blocks travelersSelector in discovery", () => {
    expect(isWidgetValidInPhase("travelersSelector", "discovery")).toBe(false);
  });

  it("blocks all widgets in recap phase", () => {
    expect(isWidgetValidInPhase("preferenceInterests", "recap")).toBe(false);
    expect(isWidgetValidInPhase("datePicker", "recap")).toBe(false);
  });

  it("allows budgetRangeSlider in discovery and logistics", () => {
    expect(isWidgetValidInPhase("budgetRangeSlider", "discovery")).toBe(true);
    expect(isWidgetValidInPhase("budgetRangeSlider", "logistics")).toBe(true);
  });

  it("returns true for undefined widgetType", () => {
    expect(isWidgetValidInPhase(undefined, "discovery")).toBe(true);
  });
});

describe("B5: Budget vs style guard", () => {
  it("corrects preferenceStyle to budgetRangeSlider when budgetLevel present", () => {
    const intent: IntentClassificationResult = {
      primaryIntent: "gather_preferences",
      confidence: 85,
      entities: { budgetLevel: "cheap" },
      widgetToShow: { type: "preferenceStyle", reason: "LLM chose style" },
    };
    const fixed = applyBudgetStyleGuard(intent);
    expect(fixed.widgetToShow?.type).toBe("budgetRangeSlider");
  });

  it("corrects preferenceStyle to budgetRangeSlider when priceRange present", () => {
    const intent: IntentClassificationResult = {
      primaryIntent: "gather_preferences",
      confidence: 80,
      entities: { priceRange: "500-1000" },
      widgetToShow: { type: "preferenceStyle", reason: "LLM chose style" },
    };
    const fixed = applyBudgetStyleGuard(intent);
    expect(fixed.widgetToShow?.type).toBe("budgetRangeSlider");
  });

  it("keeps preferenceStyle when no budget entities", () => {
    const intent: IntentClassificationResult = {
      primaryIntent: "gather_preferences",
      confidence: 90,
      entities: { travelStyle: "couple" },
      widgetToShow: { type: "preferenceStyle", reason: "style needed" },
    };
    const fixed = applyBudgetStyleGuard(intent);
    expect(fixed.widgetToShow?.type).toBe("preferenceStyle");
  });

  it("does not modify non-preferenceStyle widgets", () => {
    const intent: IntentClassificationResult = {
      primaryIntent: "provide_destination",
      confidence: 95,
      entities: { budgetLevel: "cheap" },
      widgetToShow: { type: "citySelector", reason: "LLM chose city" },
    };
    const fixed = applyBudgetStyleGuard(intent);
    expect(fixed.widgetToShow?.type).toBe("citySelector");
  });
});

describe("B6: Number disambiguation", () => {
  it("detects number selection after numbered list", () => {
    const assistant = "Voici mes suggestions:\n1. Paris - Ville lumière\n2. Tokyo - Culture\n3. Rome - Histoire";
    const user = "2";
    expect(detectNumberAfterList(assistant, user).isNumberSelection).toBe(true);
  });

  it("does not flag number when no numbered list", () => {
    const assistant = "Combien de voyageurs êtes-vous ?";
    const user = "2";
    expect(detectNumberAfterList(assistant, user).isNumberSelection).toBe(false);
  });

  it("does not flag text replies even after numbered list", () => {
    const assistant = "1. Paris\n2. Tokyo\n3. Rome";
    const user = "Paris s'il te plaît";
    expect(detectNumberAfterList(assistant, user).isNumberSelection).toBe(false);
  });

  it("handles multi-digit numbers (12)", () => {
    const assistant = "Options:\n1. Vol A\n2. Vol B\n...";
    const user = "12";
    expect(detectNumberAfterList(assistant, user).isNumberSelection).toBe(true);
  });

  it("does not flag 3-digit numbers (not a list selection)", () => {
    const assistant = "1. Option A\n2. Option B";
    const user = "300";
    expect(detectNumberAfterList(assistant, user).isNumberSelection).toBe(false);
  });
});

describe("B14: Dietary restrictions dedup", () => {
  it("merges two arrays without duplicates", () => {
    const existing = ["vegan", "sans gluten"];
    const incoming = ["sans gluten", "sans lactose"];
    const merged = mergeDietaryRestrictions(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(merged).toContain("vegan");
    expect(merged).toContain("sans gluten");
    expect(merged).toContain("sans lactose");
  });

  it("returns incoming when no existing", () => {
    const merged = mergeDietaryRestrictions(undefined, ["vegan"]);
    expect(merged).toEqual(["vegan"]);
  });

  it("returns existing when no incoming", () => {
    const merged = mergeDietaryRestrictions(["vegan"], undefined);
    expect(merged).toEqual(["vegan"]);
  });

  it("returns empty array when both undefined", () => {
    const merged = mergeDietaryRestrictions(undefined, undefined);
    expect(merged).toEqual([]);
  });

  it("handles identical arrays", () => {
    const merged = mergeDietaryRestrictions(["vegan"], ["vegan"]);
    expect(merged).toEqual(["vegan"]);
  });
});

// ─── Scenario-based integration tests ──────────────────────────────────────

describe("Scenario 1: Indecisive user — preference-first flow", () => {
  it("maps inspiration phase to discovery", () => {
    const phase = normalizeTravelPhase("inspiration");
    expect(phase).toBe("discovery");
  });

  it("allows preferenceStyle widget in discovery", () => {
    expect(isWidgetValidInPhase("preferenceStyle", "discovery")).toBe(true);
  });

  it("allows preferenceInterests widget in discovery", () => {
    expect(isWidgetValidInPhase("preferenceInterests", "discovery")).toBe(true);
  });

  it("blocks destinationSuggestions when phase is logistics (after transition)", () => {
    expect(isWidgetValidInPhase("destinationSuggestions", "logistics")).toBe(false);
  });
});

describe("Scenario 2: Decided user with budget — budgetRangeSlider", () => {
  it('corrects "Tokyo pas cher" → budgetRangeSlider (not preferenceStyle)', () => {
    const intent: IntentClassificationResult = {
      primaryIntent: "provide_destination",
      confidence: 90,
      entities: { destinationCity: "Tokyo", budgetLevel: "budget" },
      widgetToShow: { type: "preferenceStyle", reason: "LLM confused budget/style" },
    };
    const fixed = applyBudgetStyleGuard(intent);
    expect(fixed.widgetToShow?.type).toBe("budgetRangeSlider");
  });
});

describe('Scenario 3: Ambiguous number — "2" after numbered list', () => {
  it("detects list selection context", () => {
    const assistant = "Je vous propose 3 destinations:\n1. Paris\n2. Tokyo\n3. Rome\nLaquelle vous intéresse ?";
    const user = "2";
    const { isNumberSelection } = detectNumberAfterList(assistant, user);
    expect(isNumberSelection).toBe(true);
    // This would map to primaryIntent: "confirm_selection", NOT "provide_travelers"
  });
});

describe("Scenario 4: Phase transition discovery → logistics → logistics", () => {
  it("inspiration → discovery", () => {
    expect(normalizeTravelPhase("inspiration")).toBe("discovery");
  });

  it("research → logistics", () => {
    expect(normalizeTravelPhase("research")).toBe("logistics");
  });

  it("comparison → logistics (NOT accommodation)", () => {
    expect(normalizeTravelPhase("comparison")).toBe("logistics");
  });
});

describe("Scenario 5: Dietary dedup across tools", () => {
  it("classify_intent + update_preferences dietary merge", () => {
    const classifyDietary = ["vegan", "sans gluten"];
    const updateDietary = ["sans gluten", "halal"];
    const merged = mergeDietaryRestrictions(classifyDietary, updateDietary);
    expect(merged).toHaveLength(3);
    expect(merged).toEqual(expect.arrayContaining(["vegan", "sans gluten", "halal"]));
  });
});

describe("Scenario 6: Race condition — prefs empty + Inspire-moi", () => {
  it("destinationSuggestions blocked in logistics phase", () => {
    expect(isWidgetValidInPhase("destinationSuggestions", "logistics")).toBe(false);
  });

  it("preferenceStyle allowed in discovery when preferences empty", () => {
    expect(isWidgetValidInPhase("preferenceStyle", "discovery")).toBe(true);
  });
});
