/**
 * Chat Advanced Simulation Suite
 *
 * ~55 targeted tests covering:
 * - Widget triggering logic & prerequisites
 * - Memory (FlowState) evolution at each interaction
 * - Filter parsing from natural language
 * - Intent confidence boosting (frontend ↔ backend alignment)
 * - Phase transitions through complete journeys
 * - Conflict detection (dates, budget, capacity)
 * - Suggestion engine per-context correctness
 * - UX fluidity: one-step-at-a-time enforcement
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import {
  analyzeLastAssistantMessage,
  analyzeUserIntent,
  detectLanguage,
  getAnticipatedSuggestions,
} from "@/components/planner/chat/services/messageAnalyzer";
import {
  getSuggestions,
  getWorkflowStep,
  type SuggestionContext,
} from "@/components/planner/chat/services/suggestionEngine";
import {
  detectCurrentPhase,
  getSimplePhase,
  extractPhaseSignals,
  type PhaseSignals,
} from "@/components/planner/chat/services/phaseDetector";
import {
  getNextRequiredWidget,
  computeFlowState,
  evaluatePhaseTransition,
  validateWidget,
  hasAlreadyProvided,
  computeUserBehavior,
  isConversationalIntent,
  isWidgetTriggeringIntent,
  isCriticalWidget,
  type FlowState,
} from "@/components/planner/chat/hooks/intentRouterCore";
import {
  parseFilters,
  type ParsedFilters,
} from "@/components/planner/chat/services/filterParser";
import {
  boostIntentConfidence,
  suggestIntentFromFrontend,
} from "@/components/planner/chat/services/intentConfidenceBooster";
import {
  persistExtractedEntities,
} from "@/components/planner/chat/hooks/persistExtractedEntities";
import type { WidgetInteraction } from "@/contexts/WidgetHistoryContext";
import type { IntentClassification } from "@/components/planner/chat/hooks/useChatStream";

// ─── Helpers ───

function wi(widgetType: string, interactionType: any, data: Record<string, unknown> = {}): WidgetInteraction {
  return { id: `test-${Date.now()}-${Math.random()}`, widgetType, interactionType, data, timestamp: Date.now(), summary: `${interactionType} on ${widgetType}` };
}

function intent(primaryIntent: string, confidence: number, entities: Record<string, unknown> = {}): IntentClassification {
  return { primaryIntent, confidence, entities };
}

function emptyFlow(overrides: Partial<FlowState> = {}): FlowState {
  return {
    hasDestination: false,
    hasDestinationCity: false,
    hasDepartureCity: false,
    hasDepartureDate: false,
    hasReturnDate: false,
    hasTravelers: false,
    hasTripType: false,
    tripType: "roundtrip",
    isReadyToSearch: false,
    ...overrides,
  };
}

function emptySignals(overrides: Partial<PhaseSignals> = {}): PhaseSignals {
  return {
    hasDestination: false,
    hasDates: false,
    hasTravelers: false,
    hasDeparture: false,
    hasFlightResults: false,
    hasHotelResults: false,
    hasActivities: false,
    destinationConfirmed: false,
    datesConfirmed: false,
    travelersConfirmed: false,
    askedForInspiration: false,
    hasNegativePreferences: false,
    requestedComparison: false,
    readyToBook: false,
    ...overrides,
  };
}

function ctx(overrides: Partial<SuggestionContext> = {}): SuggestionContext {
  return {
    workflowStep: "inspiration",
    hasDestination: false,
    hasDates: false,
    hasTravelers: false,
    hasFlights: false,
    hasHotels: false,
    currentTab: "flights",
    visibleFlightsCount: 0,
    visibleHotelsCount: 0,
    visibleActivitiesCount: 0,
    ...overrides,
  };
}

export function registerChatAdvancedSimTests() {
  setCategory("chatAdvancedSim");

  // ═══════════════════════════════════════════════════════════════
  // GROUP 1: MEMORY EVOLUTION — FlowState at each interaction step
  // ═══════════════════════════════════════════════════════════════

  describe("Memory: FlowState evolution step by step", () => {
    it("step 0: empty memory → nothing filled", () => {
      const fs = computeFlowState({});
      expect(fs.hasDestination).toBe(false);
      expect(fs.hasDestinationCity).toBe(false);
      expect(fs.hasDepartureCity).toBe(false);
      expect(fs.hasDepartureDate).toBe(false);
      expect(fs.hasReturnDate).toBe(false);
      expect(fs.hasTravelers).toBe(false);
      expect(fs.isReadyToSearch).toBe(false);
    });

    it("step 1: user says 'Japan' → country set, no city", () => {
      const fs = computeFlowState({ arrival: { country: "Japan", countryCode: "JP" } });
      expect(fs.hasDestination).toBe(true);
      expect(fs.hasDestinationCity).toBe(false);
      expect(fs.isReadyToSearch).toBe(false);
    });

    it("step 2: user picks Tokyo → city set", () => {
      const fs = computeFlowState({ arrival: { country: "Japan", city: "Tokyo", countryCode: "JP" } });
      expect(fs.hasDestinationCity).toBe(true);
    });

    it("step 3: user sets departure → departure city filled", () => {
      const fs = computeFlowState({
        arrival: { country: "Japan", city: "Tokyo", countryCode: "JP" },
        departure: { city: "Paris" },
      });
      expect(fs.hasDepartureCity).toBe(true);
      expect(fs.isReadyToSearch).toBe(false); // still missing dates & travelers
    });

    it("step 4: departure date added", () => {
      const fs = computeFlowState({
        arrival: { country: "Japan", city: "Tokyo", countryCode: "JP" },
        departure: { city: "Paris" },
        departureDate: new Date("2025-04-10"),
      });
      expect(fs.hasDepartureDate).toBe(true);
      expect(fs.isReadyToSearch).toBe(false); // missing return date & travelers
    });

    it("step 5: return date added", () => {
      const fs = computeFlowState({
        arrival: { country: "Japan", city: "Tokyo", countryCode: "JP" },
        departure: { city: "Paris" },
        departureDate: new Date("2025-04-10"),
        returnDate: new Date("2025-04-24"),
      });
      expect(fs.hasReturnDate).toBe(true);
      expect(fs.isReadyToSearch).toBe(false); // missing travelers
    });

    it("step 6: travelers set → ready to search", () => {
      const fs = computeFlowState({
        arrival: { country: "Japan", city: "Tokyo", countryCode: "JP" },
        departure: { city: "Paris" },
        departureDate: new Date("2025-04-10"),
        returnDate: new Date("2025-04-24"),
        passengers: { adults: 1 },
      });
      expect(fs.hasTravelers).toBe(true);
      expect(fs.isReadyToSearch).toBe(true);
    });

    it("one-way trip: no return date needed", () => {
      const fs = computeFlowState({
        arrival: { country: "Japan", city: "Tokyo", countryCode: "JP" },
        departureDate: new Date("2025-04-10"),
        passengers: { adults: 1 },
        tripType: "oneway",
      });
      expect(fs.isReadyToSearch).toBe(true);
      expect(fs.tripType).toBe("oneway");
    });

    it("roundtrip without return → not ready", () => {
      const fs = computeFlowState({
        arrival: { country: "Japan", city: "Tokyo", countryCode: "JP" },
        departureDate: new Date("2025-04-10"),
        passengers: { adults: 1 },
        tripType: "roundtrip",
      });
      expect(fs.isReadyToSearch).toBe(false);
    });

    it("null arrival → no destination", () => {
      const fs = computeFlowState({ arrival: null });
      expect(fs.hasDestination).toBe(false);
    });

    it("arrival with only countryCode → has destination", () => {
      const fs = computeFlowState({ arrival: { countryCode: "TH" } });
      expect(fs.hasDestination).toBe(true);
      expect(fs.hasDestinationCity).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 2: WIDGET TRIGGERING — Next required widget logic
  // ═══════════════════════════════════════════════════════════════

  describe("Widget: next required widget at each stage", () => {
    it("no destination → null (can't suggest widget)", () => {
      expect(getNextRequiredWidget(emptyFlow(), [])).toBe(null);
    });

    it("country only → citySelector", () => {
      expect(getNextRequiredWidget(emptyFlow({ hasDestination: true }), [])).toBe("citySelector");
    });

    it("city selected → dateRangePicker (roundtrip)", () => {
      const w = getNextRequiredWidget(emptyFlow({ hasDestination: true, hasDestinationCity: true }), []);
      expect(w).toBe("dateRangePicker");
    });

    it("city selected + oneway → datePicker", () => {
      const w = getNextRequiredWidget(emptyFlow({ hasDestination: true, hasDestinationCity: true, tripType: "oneway" }), []);
      expect(w).toBe("datePicker");
    });

    it("dates filled → travelersSelector", () => {
      const w = getNextRequiredWidget(emptyFlow({
        hasDestination: true, hasDestinationCity: true,
        hasDepartureDate: true, hasReturnDate: true,
      }), []);
      expect(w).toBe("travelersSelector");
    });

    it("travelers already provided → skip travelersSelector", () => {
      const w = getNextRequiredWidget(
        emptyFlow({ hasDestination: true, hasDestinationCity: true, hasDepartureDate: true, hasReturnDate: true }),
        [wi("travelersSelector", "travelers_selected")]
      );
      expect(w).not.toBe("travelersSelector");
    });

    it("all filled → tripTypeConfirm or travelersConfirmBeforeSearch", () => {
      const w = getNextRequiredWidget(emptyFlow({
        hasDestination: true, hasDestinationCity: true,
        hasDepartureDate: true, hasReturnDate: true, hasTravelers: true,
      }), []);
      expect(["tripTypeConfirm", "travelersConfirmBeforeSearch"]).toContain(w);
    });

    it("hasAlreadyProvided: city_selected blocks citySelector", () => {
      expect(hasAlreadyProvided("citySelector", [
        wi("citySelector", "city_selected")
      ])).toBe(true);
    });

    it("hasAlreadyProvided: empty history → false", () => {
      expect(hasAlreadyProvided("citySelector", [])).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 3: WIDGET VALIDATION — Prerequisites
  // ═══════════════════════════════════════════════════════════════

  describe("Widget: validation prerequisites", () => {
    it("returnDatePicker blocked without departure date", () => {
      const v = validateWidget("returnDatePicker", emptyFlow());
      expect(v.valid).toBe(false);
      expect(v.reason).toBeDefined();
    });

    it("returnDatePicker valid with departure date", () => {
      expect(validateWidget("returnDatePicker", emptyFlow({ hasDepartureDate: true })).valid).toBe(true);
    });

    it("tripTypeConfirm blocked without travelers", () => {
      const v = validateWidget("tripTypeConfirm", emptyFlow());
      expect(v.valid).toBe(false);
      expect(v.suggestedWidget).toBe("travelersSelector");
    });

    it("tripTypeConfirm valid with travelers", () => {
      expect(validateWidget("tripTypeConfirm", emptyFlow({ hasTravelers: true })).valid).toBe(true);
    });

    it("travelersConfirmBeforeSearch needs full info", () => {
      const v = validateWidget("travelersConfirmBeforeSearch", emptyFlow());
      expect(v.valid).toBe(false);
    });

    it("travelersConfirmBeforeSearch valid when ready", () => {
      const v = validateWidget("travelersConfirmBeforeSearch", emptyFlow({
        hasDestinationCity: true, hasDepartureDate: true, hasTravelers: true,
        hasReturnDate: true, isReadyToSearch: true,
      }));
      expect(v.valid).toBe(true);
    });

    it("citySelector always valid", () => {
      expect(validateWidget("citySelector", emptyFlow()).valid).toBe(true);
    });

    it("budgetRangeSlider always valid", () => {
      expect(validateWidget("budgetRangeSlider", emptyFlow()).valid).toBe(true);
    });

    it("cooldown blocks widget", () => {
      const cooldown = {
        canShowWidget: (w: string) => w !== "citySelector",
        getBlockReason: (w: string) => w === "citySelector" ? "cooldown" : null,
      };
      const v = validateWidget("citySelector", emptyFlow(), cooldown);
      expect(v.valid).toBe(false);
      expect(v.reason).toBe("cooldown");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 4: USER BEHAVIOR — Widget interaction tracking
  // ═══════════════════════════════════════════════════════════════

  describe("Widget: user behavior detection", () => {
    it("no interactions → guided style", () => {
      const b = computeUserBehavior([]);
      expect(b.style).toBe("guided");
      expect(b.completionRate).toBe(1);
    });

    it("all completions → guided, high rate", () => {
      const b = computeUserBehavior([
        wi("citySelector", "city_selected"),
        wi("dateRangePicker", "date_range_selected"),
        wi("travelersSelector", "travelers_selected"),
      ]);
      expect(b.completionRate).toBe(1);
      expect(b.prefersWidgets).toBe(true);
      expect(b.style).toBe("guided");
    });

    it("low completion rate → expert style", () => {
      // Use a non-completion interaction type to simulate non-completed widgets
      const b = computeUserBehavior([
        wi("citySelector", "quick_filter_applied"),
        wi("dateRangePicker", "quick_filter_applied"),
        wi("travelersSelector", "quick_filter_applied"),
      ]);
      expect(b.completionRate).toBe(0);
      expect(b.style).toBe("expert");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 5: INTENT CLASSIFICATION — Conversational vs widget-triggering
  // ═══════════════════════════════════════════════════════════════

  describe("Intent: conversational vs widget-triggering", () => {
    it("'other' is conversational", () => expect(isConversationalIntent("other")).toBe(true));
    it("'greeting' is conversational", () => expect(isConversationalIntent("greeting")).toBe(true));
    it("'ask_question' is conversational", () => expect(isConversationalIntent("ask_question")).toBe(true));
    it("'thank_you' is conversational", () => expect(isConversationalIntent("thank_you")).toBe(true));
    it("'compare_options' is conversational", () => expect(isConversationalIntent("compare_options")).toBe(true));
    it("'provide_destination' is NOT conversational", () => expect(isConversationalIntent("provide_destination")).toBe(false));

    it("'provide_destination' triggers widgets", () => expect(isWidgetTriggeringIntent("provide_destination")).toBe(true));
    it("'provide_dates' triggers widgets", () => expect(isWidgetTriggeringIntent("provide_dates")).toBe(true));
    it("'provide_travelers' triggers widgets", () => expect(isWidgetTriggeringIntent("provide_travelers")).toBe(true));
    it("'ask_inspiration' triggers widgets", () => expect(isWidgetTriggeringIntent("ask_inspiration")).toBe(true));
    it("'greeting' does NOT trigger widgets", () => expect(isWidgetTriggeringIntent("greeting")).toBe(false));

    it("citySelector is critical", () => expect(isCriticalWidget("citySelector")).toBe(true));
    it("dateRangePicker is critical", () => expect(isCriticalWidget("dateRangePicker")).toBe(true));
    it("travelersSelector is critical", () => expect(isCriticalWidget("travelersSelector")).toBe(true));
    it("budgetRangeSlider is NOT critical", () => expect(isCriticalWidget("budgetRangeSlider")).toBe(false));
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 6: FILTER PARSING — Natural language filters
  // ═══════════════════════════════════════════════════════════════

  describe("Filter: natural language → structured filters", () => {
    it("'vol direct moins de 200€' → flights, direct, max 200", () => {
      const f = parseFilters("Vol direct moins de 200€");
      expect(f.target).toBe("flights");
      expect(f.flights?.stops?.type).toBe("direct");
      expect(f.flights?.price?.type).toBe("max");
      expect(f.flights?.price?.value).toBe(200);
    });

    it("'hôtel 4 étoiles avec piscine' → hotels, 4 stars, pool", () => {
      const f = parseFilters("Hôtel 4 étoiles avec piscine");
      expect(f.target).toBe("hotels");
      expect(f.hotels?.stars?.value).toBe(4);
      expect(f.hotels?.amenities?.include).toContain("pool");
    });

    it("'entre 100 et 300€ par nuit' → price range, per night", () => {
      const f = parseFilters("Hôtel entre 100 et 300€ par nuit");
      expect(f.hotels?.price?.type).toBe("range");
      expect(f.hotels?.price?.min).toBe(100);
      expect(f.hotels?.price?.max).toBe(300);
      expect(f.hotels?.price?.perNight).toBe(true);
    });

    it("'activités gratuites en famille' → activities, free, family", () => {
      const f = parseFilters("Activités gratuites en famille");
      expect(f.target).toBe("activities");
      expect(f.activities?.price?.value).toBe(0);
      expect(f.activities?.familyFriendly).toBe(true);
    });

    it("'vol business remboursable' → business class, refundable", () => {
      const f = parseFilters("Vol business remboursable");
      expect(f.flights?.cabinClass).toBe("business");
      expect(f.flights?.flexibility?.refundable).toBe(true);
    });

    it("'départ le matin' → morning departure time", () => {
      const f = parseFilters("Vol avec départ le matin");
      expect(f.flights?.departureTime?.type).toBe("morning");
    });

    it("'demi-journée culture' → 4h, culture category", () => {
      const f = parseFilters("Activité demi-journée culture");
      expect(f.activities?.duration?.value).toBe(4);
      expect(f.activities?.categories).toContain("culture");
    });

    it("'hôtel sans piscine, centre-ville' → exclude pool, downtown", () => {
      const f = parseFilters("Hôtel sans piscine, centre-ville");
      expect(f.hotels?.amenities?.exclude).toContain("pool");
      expect(f.hotels?.location?.type).toBe("in");
    });

    it("'moins de 2h de vol' → max 2h duration", () => {
      const f = parseFilters("Vol moins de 2h");
      expect(f.flights?.duration?.type).toBe("max");
      expect(f.flights?.duration?.value).toBe(2);
    });

    it("'annulation gratuite petit-déjeuner inclus' → hotel amenities", () => {
      const f = parseFilters("Hôtel annulation gratuite petit-déjeuner inclus");
      expect(f.hotels?.freeCancellation).toBe(true);
      expect(f.hotels?.breakfast).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 7: INTENT CONFIDENCE BOOSTING
  // ═══════════════════════════════════════════════════════════════

  describe("Intent: confidence boosting frontend ↔ backend", () => {
    it("no backend intent → shouldClarify", () => {
      const r = boostIntentConfidence(null, "Random text");
      expect(r.shouldClarify).toBe(true);
      expect(r.boostedConfidence).toBe(0);
    });

    it("backend budget + frontend budget → boost +15", () => {
      const r = boostIntentConfidence(
        intent("provide_budget", 70),
        "Mon budget est de 1000€"
      );
      expect(r.boostedConfidence).toBeGreaterThan(70);
      expect(r.frontendSignals.wantsBudgetInfo).toBe(true);
    });

    it("backend confirm + frontend negative → conflict penalty", () => {
      const r = boostIntentConfidence(
        intent("confirm_selection", 60),
        "Non, pas vraiment"
      );
      expect(r.boostedConfidence).toBeLessThan(60);
    });

    it("backend reject + frontend negative → boost", () => {
      const r = boostIntentConfidence(
        intent("reject_suggestion", 50),
        "Non, ça ne me plaît pas"
      );
      expect(r.boostedConfidence).toBeGreaterThan(50);
    });

    it("undecided user → suggestedIntent delegate_choice", () => {
      const r = boostIntentConfidence(
        intent("other", 30),
        "Je ne sais pas, peut-être"
      );
      expect(r.suggestedIntent).toBe("delegate_choice");
      expect(r.shouldClarify).toBe(false);
    });

    it("context alignment: assistant asked dates + user provides date → boost", () => {
      const r = boostIntentConfidence(
        intent("provide_dates", 65),
        "La semaine prochaine",
        "Quand souhaitez-vous partir ?"
      );
      expect(r.boostedConfidence).toBeGreaterThan(75);
    });

    it("suggestIntentFromFrontend: 'je réserve' → confirm_selection", () => {
      expect(suggestIntentFromFrontend("Je réserve ce vol")).toBe("confirm_selection");
    });

    it("suggestIntentFromFrontend: 'compare' → compare_options", () => {
      expect(suggestIntentFromFrontend("Compare ces deux hôtels")).toBe("compare_options");
    });

    it("suggestIntentFromFrontend: neutral text → null", () => {
      expect(suggestIntentFromFrontend("Bonjour comment ça va")).toBe(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 8: PHASE TRANSITIONS — Full journey coherence
  // ═══════════════════════════════════════════════════════════════

  describe("Phase: full journey coherence", () => {
    it("empty → inspiration (high confidence)", () => {
      const p = detectCurrentPhase(emptySignals());
      expect(p.currentPhase).toBe("inspiration");
    });

    it("C5: inspiration asked (no dest) → inspiration (75% confidence)", () => {
      const p = detectCurrentPhase(emptySignals({ askedForInspiration: true }));
      expect(p.currentPhase).toBe("inspiration");
      expect(p.confidenceScore).toBe(75);
    });

    it("destination only → research", () => {
      const p = detectCurrentPhase(emptySignals({ hasDestination: true }));
      expect(p.currentPhase).toBe("research");
      expect(p.completedSteps).toContain("destination");
    });

    it("destination + dates + travelers → research (no results)", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
      }));
      expect(p.currentPhase).toBe("research");
      expect(p.completedSteps.length).toBe(3);
    });

    it("+ departure → 4 completed steps", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true, hasDeparture: true,
      }));
      expect(p.completedSteps.length).toBe(4);
    });

    it("flight results → comparison (1 pending)", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasFlightResults: true,
      }));
      expect(p.currentPhase).toBe("comparison");
      expect(p.pendingChoices).toBe(1);
    });

    it("flight + hotel results → comparison (2 pending)", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasFlightResults: true, hasHotelResults: true,
      }));
      expect(p.pendingChoices).toBe(2);
    });

    it("explicit comparison request → comparison", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, requestedComparison: true,
      }));
      expect(p.currentPhase).toBe("comparison");
    });

    it("readyToBook + 4 steps → booking (95%)", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasDeparture: true, readyToBook: true,
      }));
      expect(p.currentPhase).toBe("booking");
      expect(p.confidenceScore).toBe(95);
    });

    it("negative feedback tracked", () => {
      const p = detectCurrentPhase(emptySignals({ hasNegativePreferences: true }));
      expect(p.hasNegativeFeedback).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 9: PHASE TRANSITION GUARDS (evaluatePhaseTransition)
  // ═══════════════════════════════════════════════════════════════

  describe("Phase: transition guards", () => {
    const canShowAll = () => ({ valid: true });
    const noInteractions: any[] = [];

    it("preferences filled + no destination → no auto-suggestion (user controls)", () => {
      const result = evaluatePhaseTransition(
        emptyFlow(),
        [wi("preferenceStyle", "style_configured")],
        canShowAll
      );
      expect(result).toBe(null);
    });

    it("destination + date interaction → date picker", () => {
      const result = evaluatePhaseTransition(
        emptyFlow({ hasDestinationCity: true }),
        [wi("citySelector", "destination_selected")],
        canShowAll
      );
      expect(result?.widgetType).toBe("dateRangePicker");
    });

    it("dates + date interaction → travelers", () => {
      const result = evaluatePhaseTransition(
        emptyFlow({ hasDestinationCity: true, hasDepartureDate: true }),
        [wi("dateRangePicker", "date_range_selected")],
        canShowAll
      );
      expect(result?.widgetType).toBe("travelersSelector");
    });

    it("flight search triggered → no transition", () => {
      const result = evaluatePhaseTransition(emptyFlow(), noInteractions, canShowAll, true);
      expect(result).toBe(null);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 10: SUGGESTION ENGINE — Context-aware suggestions
  // ═══════════════════════════════════════════════════════════════

  describe("Suggestions: context-aware generation", () => {
    it("no destination → inspiration suggestions", () => {
      const s = getSuggestions(ctx());
      expect(s.length).toBeGreaterThan(0);
      expect(s.some(x => /inspir/i.test(x.label + x.message))).toBe(true);
    });

    it("destination but no dates → dates suggestions", () => {
      const s = getSuggestions(ctx({ hasDestination: true, destinationName: "Bali" }));
      expect(s.length).toBeGreaterThan(0);
    });

    it("destination + dates but no travelers → travelers suggestions", () => {
      const s = getSuggestions(ctx({ hasDestination: true, hasDates: true }));
      expect(s.length).toBeGreaterThan(0);
    });

    it("all info, flights tab, no flights → search suggestions", () => {
      const s = getSuggestions(ctx({
        hasDestination: true, hasDates: true, hasTravelers: true,
        currentTab: "flights", visibleFlightsCount: 0,
      }));
      expect(s.some(x => /search|launch|cherch/i.test(x.label + x.message))).toBe(true);
    });

    it("flights tab with flights → flight suggestions", () => {
      const s = getSuggestions(ctx({
        hasDestination: true, hasDates: true, hasTravelers: true,
        currentTab: "flights", visibleFlightsCount: 5, hasFlights: true,
      }));
      expect(s.length).toBeGreaterThan(0);
    });

    it("stays tab → stays suggestions", () => {
      const s = getSuggestions(ctx({
        hasDestination: true, hasDates: true, hasTravelers: true,
        currentTab: "stays", visibleHotelsCount: 3,
      }));
      expect(s.length).toBeGreaterThan(0);
    });

    it("activities tab → activities suggestions", () => {
      const s = getSuggestions(ctx({
        hasDestination: true, hasDates: true, hasTravelers: true,
        currentTab: "activities",
      }));
      expect(s.length).toBeGreaterThan(0);
    });

    it("preferences tab → preference suggestions", () => {
      const s = getSuggestions(ctx({
        hasDestination: true, hasDates: true, hasTravelers: true,
        currentTab: "preferences",
      }));
      expect(s.length).toBeGreaterThan(0);
    });

    it("inspire flow active → empty (widgets take over)", () => {
      const s = getSuggestions(ctx({ inspireFlowStep: "style" }));
      expect(s.length).toBe(0);
    });

    it("proposed destinations → destination choice suggestions", () => {
      const s = getSuggestions(ctx({ hasProposedDestinations: true, proposedDestinationNames: ["Bali", "Thailand"] }));
      expect(s.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 11: WORKFLOW STEP EVOLUTION
  // ═══════════════════════════════════════════════════════════════

  describe("Workflow: step evolution", () => {
    it("nothing → inspiration", () => expect(getWorkflowStep(ctx())).toBe("inspiration"));
    it("destination → destination", () => expect(getWorkflowStep(ctx({ hasDestination: true }))).toBe("destination"));
    it("destination + dates → dates", () => expect(getWorkflowStep(ctx({ hasDestination: true, hasDates: true }))).toBe("dates"));
    it("all info no flights → search", () => expect(getWorkflowStep(ctx({ hasDestination: true, hasDates: true, hasTravelers: true }))).toBe("search"));
    it("all + flights → compare", () => expect(getWorkflowStep(ctx({ hasDestination: true, hasDates: true, hasTravelers: true, hasFlights: true }))).toBe("compare"));
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 12: ENTITY PERSISTENCE PIPELINE
  // ═══════════════════════════════════════════════════════════════

  describe("Entity: persistExtractedEntities", () => {
    it("tripDuration from intent → setPendingTripDuration called", () => {
      let captured = "";
      persistExtractedEntities(
        { tripDuration: "7 jours" },
        null,
        { setPendingTripDuration: (d) => { captured = d; }, setPendingPreferredMonth: () => {} }
      );
      expect(captured).toBe("7 jours");
    });

    it("preferredMonth from flightData (priority) → setPendingPreferredMonth called", () => {
      let captured = "";
      persistExtractedEntities(
        { preferredMonth: "mars" },
        { preferredMonth: "avril" },
        { setPendingTripDuration: () => {}, setPendingPreferredMonth: (m) => { captured = m; } }
      );
      expect(captured).toBe("avril"); // flightData takes priority
    });

    it("no entities → nothing called", () => {
      let durationCalled = false;
      let monthCalled = false;
      persistExtractedEntities(
        {},
        null,
        { setPendingTripDuration: () => { durationCalled = true; }, setPendingPreferredMonth: () => { monthCalled = true; } }
      );
      expect(durationCalled).toBe(false);
      expect(monthCalled).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 13: EXTRACTPHASESIGNALS — Various user messages
  // ═══════════════════════════════════════════════════════════════

  describe("PhaseSignals: user message extraction", () => {
    it("'inspire-moi' → inspiration", () => {
      const s = extractPhaseSignals(null, "", "Inspire-moi !", false, false, false);
      expect(s.askedForInspiration).toBe(true);
    });

    it("'je ne sais pas où aller' → inspiration", () => {
      const s = extractPhaseSignals(null, "", "Je ne sais pas où aller", false, false, false);
      expect(s.askedForInspiration).toBe(true);
    });

    it("'propose-moi quelque chose' → inspiration", () => {
      const s = extractPhaseSignals(null, "", "Propose-moi quelque chose", false, false, false);
      expect(s.askedForInspiration).toBe(true);
    });

    it("'compare ces deux vols' → comparison", () => {
      const s = extractPhaseSignals(null, "", "Compare ces deux vols", false, false, false);
      expect(s.requestedComparison).toBe(true);
    });

    it("'lequel est meilleur' → comparison", () => {
      const s = extractPhaseSignals(null, "", "Lequel est meilleur ?", false, false, false);
      expect(s.requestedComparison).toBe(true);
    });

    it("'je réserve' → readyToBook", () => {
      const s = extractPhaseSignals(null, "", "Je réserve celui-ci", false, false, false);
      expect(s.readyToBook).toBe(true);
    });

    it("'c'est bon, je confirme' → readyToBook", () => {
      const s = extractPhaseSignals(null, "", "C'est bon, je confirme", false, false, false);
      expect(s.readyToBook).toBe(true);
    });

    it("'je n'aime pas les hôtels chers' → negativePreferences", () => {
      const s = extractPhaseSignals(null, "", "Je n'aime pas les hôtels chers", false, false, false);
      expect(s.hasNegativePreferences).toBe(true);
    });

    it("'évite les restaurants touristiques' → negativePreferences", () => {
      const s = extractPhaseSignals(null, "", "Évite les restaurants touristiques", false, false, false);
      expect(s.hasNegativePreferences).toBe(true);
    });

    it("memory with destination → hasDestination", () => {
      const s = extractPhaseSignals(
        { destination: "Bali", travelers: { adults: 2 } },
        "", "", false, false, false
      );
      expect(s.hasDestination).toBe(true);
      expect(s.hasTravelers).toBe(true);
    });

    it("memory with departure date → hasDates", () => {
      const s = extractPhaseSignals(
        { departureDate: new Date("2025-06-01") },
        "", "", false, false, false
      );
      expect(s.hasDates).toBe(true);
    });

    it("memory with departure city → hasDeparture", () => {
      const s = extractPhaseSignals(
        { departure: "Paris" },
        "", "", false, false, false
      );
      expect(s.hasDeparture).toBe(true);
    });

    it("flight + hotel results → both flags", () => {
      const s = extractPhaseSignals(null, "", "", true, true, false);
      expect(s.hasFlightResults).toBe(true);
      expect(s.hasHotelResults).toBe(true);
    });

    it("widget history 'travelers_selected' → travelersConfirmed", () => {
      const s = extractPhaseSignals(null, "travelers_selected", "", false, false, false);
      expect(s.travelersConfirmed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 14: ASSISTANT MESSAGE ANALYSIS — Edge cases
  // ═══════════════════════════════════════════════════════════════

  describe("Assistant analysis: additional edge cases", () => {
    it("EN greeting 'Hi there!' → greeting", () => {
      expect(analyzeLastAssistantMessage("Hi there! How can I help you plan your next trip?").type).toBe("greeting");
    });

    it("FR 'Bienvenue' → greeting", () => {
      expect(analyzeLastAssistantMessage("Bienvenue sur Travliaq !").type).toBe("greeting");
    });

    it("'Quand souhaitez-vous partir ?' → dates_question", () => {
      expect(analyzeLastAssistantMessage("Quand souhaitez-vous partir ?").type).toBe("dates_question");
    });

    it("'When would you like to travel?' → dates_question", () => {
      expect(analyzeLastAssistantMessage("When would you like to travel?").type).toBe("dates_question");
    });

    it("'How many travelers?' → travelers_question", () => {
      expect(analyzeLastAssistantMessage("How many people will be traveling?").type).toBe("travelers_question");
    });

    it("'Combien serez-vous ?' → travelers_question", () => {
      expect(analyzeLastAssistantMessage("Combien serez-vous pour ce voyage ?").type).toBe("travelers_question");
    });

    it("'What is your budget?' → budget_question", () => {
      expect(analyzeLastAssistantMessage("What's your budget for this trip?").type).toBe("budget_question");
    });

    it("'Here are the flights' → flights", () => {
      expect(analyzeLastAssistantMessage("Here are the flights available").type).toBe("flights");
    });

    it("'Voici les hôtels' → hotels", () => {
      expect(analyzeLastAssistantMessage("Voici les hôtels disponibles").type).toBe("hotels");
    });

    it("'Here are the activities to do' → activities (no dest name)", () => {
      expect(analyzeLastAssistantMessage("Here are the activities to do on site").type).toBe("activities");
    });

    it("departure question FR → departure_question", () => {
      expect(analyzeLastAssistantMessage("Depuis quelle ville souhaitez-vous partir ?").type).toBe("departure_question");
    });

    it("departure question EN → departure_question", () => {
      expect(analyzeLastAssistantMessage("From which city would you like to depart?").type).toBe("departure_question");
    });

    it("'C'est noté' without dest → confirmation", () => {
      expect(analyzeLastAssistantMessage("C'est noté, je m'en occupe !").type).toBe("confirmation");
    });

    it("'Noted!' without dest → confirmation", () => {
      expect(analyzeLastAssistantMessage("Noted! I'll prepare everything.").type).toBe("confirmation");
    });

    it("question ending with ? (no pattern) → open_question", () => {
      expect(analyzeLastAssistantMessage("Est-ce que ça te convient ?").type).toBe("open_question");
    });

    it("plain info text → unknown", () => {
      expect(analyzeLastAssistantMessage("Voici quelques informations générales.").type).toBe("unknown");
    });

    it("undefined → unknown", () => {
      expect(analyzeLastAssistantMessage(undefined).type).toBe("unknown");
    });

    it("empty → unknown", () => {
      expect(analyzeLastAssistantMessage("").type).toBe("unknown");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 15: USER INTENT — Comprehensive patterns
  // ═══════════════════════════════════════════════════════════════

  describe("User intent: comprehensive pattern matching", () => {
    // Budget patterns
    it("'budget 500€' → budget with amount", () => {
      const i = analyzeUserIntent("Mon budget est de 500€");
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe("500");
    });

    it("'cheap trip' → budget no amount", () => {
      const i = analyzeUserIntent("I want a cheap trip");
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe(undefined);
    });

    it("'luxe' → budget", () => {
      expect(analyzeUserIntent("Je veux un voyage de luxe").wantsBudgetInfo).toBe(true);
    });

    // Date patterns
    it("'quand partir' → dates", () => {
      expect(analyzeUserIntent("Quand partir en vacances ?").wantsDateInfo).toBe(true);
    });

    it("'next weekend' → dates", () => {
      expect(analyzeUserIntent("I want to go next weekend").wantsDateInfo).toBe(true);
    });

    // Comparison
    it("'versus' → comparison", () => {
      expect(analyzeUserIntent("Bali versus Thailand").wantsComparison).toBe(true);
    });

    it("'lequel choisir' → comparison", () => {
      expect(analyzeUserIntent("Lequel choisir ?").wantsComparison).toBe(true);
    });

    // More options
    it("'autres options' → more options", () => {
      expect(analyzeUserIntent("Montre-moi d'autres options").wantsMoreOptions).toBe(true);
    });

    it("'something different' → more options", () => {
      expect(analyzeUserIntent("Show me something different").wantsMoreOptions).toBe(true);
    });

    // Booking
    it("'je prends' → booking", () => {
      expect(analyzeUserIntent("Je prends celui-ci").wantsToBook).toBe(true);
    });

    it("'I'll take it' → booking", () => {
      expect(analyzeUserIntent("I'll take it").wantsToBook).toBe(true);
    });

    it("'sounds good' → booking + positive", () => {
      const i = analyzeUserIntent("Sounds good, I'll take it");
      expect(i.wantsToBook).toBe(true);
      expect(i.isPositive).toBe(true);
    });

    // Positive
    it("'parfait' → positive", () => {
      expect(analyzeUserIntent("Parfait !").isPositive).toBe(true);
    });

    it("'excellent' → positive", () => {
      expect(analyzeUserIntent("Excellent !").isPositive).toBe(true);
    });

    // Negative
    it("'bof' → negative", () => {
      expect(analyzeUserIntent("Bof, pas terrible").isNegative).toBe(true);
    });

    it("'nah' → negative", () => {
      expect(analyzeUserIntent("Nah, not for me").isNegative).toBe(true);
    });

    // Undecided
    it("'peut-être' → undecided", () => {
      expect(analyzeUserIntent("Peut-être, je ne sais pas").isUndecided).toBe(true);
    });

    it("'not sure' → undecided", () => {
      expect(analyzeUserIntent("I'm not sure yet").isUndecided).toBe(true);
    });

    // Neutral (no flags)
    it("'bonjour' → no intent flags", () => {
      const i = analyzeUserIntent("Bonjour");
      expect(i.wantsBudgetInfo).toBe(undefined);
      expect(i.wantsDateInfo).toBe(undefined);
      expect(i.wantsComparison).toBe(undefined);
      expect(i.wantsToBook).toBe(undefined);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GROUP 16: getSimplePhase — Quick phase detection
  // ═══════════════════════════════════════════════════════════════

  describe("SimplePhase: quick detection", () => {
    it("nothing → inspiration", () => {
      expect(getSimplePhase(false, false, false, false, false, false)).toBe("inspiration");
    });

    it("C5: inspiration asked no longer overrides destination → research", () => {
      expect(getSimplePhase(true, false, false, false, false, true)).toBe("research");
    });

    it("destination only → research", () => {
      expect(getSimplePhase(true, false, false, false, false, false)).toBe("research");
    });

    it("destination + dates + travelers → planning", () => {
      expect(getSimplePhase(true, true, true, false, false, false)).toBe("planning");
    });

    it("flight results → comparison", () => {
      expect(getSimplePhase(true, true, true, true, false, false)).toBe("comparison");
    });

    it("hotel results → comparison", () => {
      expect(getSimplePhase(true, true, true, false, true, false)).toBe("comparison");
    });

    it("both results → comparison", () => {
      expect(getSimplePhase(true, true, true, true, true, false)).toBe("comparison");
    });
  });
}
