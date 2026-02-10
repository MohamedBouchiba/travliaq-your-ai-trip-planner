/**
 * Chat Coherence Test Suite
 *
 * Tests logical consistency across the chat system:
 * 1. Language mirroring (FR↔EN)
 * 2. Multi-step flow coherence (sequential state progression)
 * 3. Suggestion relevance per phase
 * 4. Cross-phase consistency
 * 5. Intent + suggestion alignment
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import {
  analyzeLastAssistantMessage,
  analyzeUserIntent,
  detectLanguage,
  getAnticipatedSuggestions,
  type LastProposedContent,
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
  type FlowState,
} from "@/components/planner/chat/hooks/intentRouterCore";

// ─── Helpers ───

function baseSuggestionContext(overrides: Partial<SuggestionContext> = {}): SuggestionContext {
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

function emptyFlowState(overrides: Partial<FlowState> = {}): FlowState {
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

export function registerChatCoherenceTests() {
  setCategory("chatCoherence");

  // ═══════════════════════════════════════════════════════════════
  // 1. LANGUAGE MIRRORING COHERENCE
  // ═══════════════════════════════════════════════════════════════

  describe("Language mirroring — FR input → FR output", () => {
    it("detects FR for a simple greeting", () => {
      expect(detectLanguage("Bonjour, je cherche un voyage")).toBe("fr");
    });

    it("detects FR for complex sentence with accents", () => {
      expect(detectLanguage("Je préfère un hôtel près de la plage à côté du centre-ville")).toBe("fr");
    });

    it("suggestions are FR when user speaks FR", () => {
      const content: LastProposedContent = { type: "greeting" };
      const suggestions = getAnticipatedSuggestions(content, {}, 0, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
      // FR suggestions should NOT contain purely English labels
      const anyPurelyEnglish = suggestions.some(
        (s) => /^(inspire me|sunny|city break|adventure)/i.test(s.label)
      );
      expect(anyPurelyEnglish).toBe(false);
    });

    it("date suggestions respect FR language", () => {
      const content: LastProposedContent = { type: "dates_question", questionTopic: "dates" };
      const suggestions = getAnticipatedSuggestions(content, {}, 1, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
      // Should contain French time references
      const hasFrench = suggestions.some(
        (s) => /semaine|weekend|flexible|mois|prochain/i.test(s.label + " " + s.message)
      );
      expect(hasFrench).toBe(true);
    });

    it("traveler suggestions respect FR language", () => {
      const content: LastProposedContent = { type: "travelers_question" };
      const suggestions = getAnticipatedSuggestions(content, {}, 2, "fr");
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      const hasFrench = suggestions.some(
        (s) => /seul|couple|famille|ami/i.test(s.label + " " + s.message)
      );
      expect(hasFrench).toBe(true);
    });
  });

  describe("Language mirroring — EN input → EN output", () => {
    it("detects EN for a simple greeting", () => {
      expect(detectLanguage("Hello, I'm looking for a trip")).toBe("en");
    });

    it("detects EN for complex sentence", () => {
      expect(detectLanguage("I would like to visit several countries in Southeast Asia")).toBe("en");
    });

    it("suggestions are EN when user speaks EN", () => {
      const content: LastProposedContent = { type: "greeting" };
      const suggestions = getAnticipatedSuggestions(content, {}, 0, "en");
      expect(suggestions.length).toBeGreaterThan(0);
      const anyPurelyFrench = suggestions.some(
        (s) => /^(inspire-moi|soleil|escapade|aventure)/i.test(s.label)
      );
      expect(anyPurelyFrench).toBe(false);
    });

    it("date suggestions respect EN language", () => {
      const content: LastProposedContent = { type: "dates_question", questionTopic: "dates" };
      const suggestions = getAnticipatedSuggestions(content, {}, 1, "en");
      const hasEnglish = suggestions.some(
        (s) => /week|weekend|flexible|month|next/i.test(s.label + " " + s.message)
      );
      expect(hasEnglish).toBe(true);
    });

    it("traveler suggestions respect EN language", () => {
      const content: LastProposedContent = { type: "travelers_question" };
      const suggestions = getAnticipatedSuggestions(content, {}, 2, "en");
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      const hasEnglish = suggestions.some(
        (s) => /solo|couple|family|friend/i.test(s.label + " " + s.message)
      );
      expect(hasEnglish).toBe(true);
    });
  });

  describe("Language detection edge cases", () => {
    it("mixed FR/EN defaults correctly", () => {
      const lang = detectLanguage("I want to go à Paris, c'est romantique");
      expect(["fr", "en"]).toContain(lang);
    });

    it("single word FR detected", () => {
      expect(detectLanguage("Bonjour")).toBe("fr");
    });

    it("single word EN detected", () => {
      expect(detectLanguage("Hello")).toBe("en");
    });

    it("numbers only returns default", () => {
      const lang = detectLanguage("12345");
      expect(["fr", "en"]).toContain(lang);
    });

    it("emoji-only returns default", () => {
      const lang = detectLanguage("🌴🏖️✈️");
      expect(["fr", "en"]).toContain(lang);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. MULTI-STEP FLOW COHERENCE
  // ═══════════════════════════════════════════════════════════════

  describe("Multi-step flow: inspiration → destination → dates → travelers", () => {
    it("Step 0: no data → inspiration phase", () => {
      const phase = getSimplePhase(false, false, false, false, false, false);
      expect(phase).toBe("inspiration");
    });

    it("Step 0: asking for inspiration → inspiration phase", () => {
      const phase = getSimplePhase(false, false, false, false, false, true);
      expect(phase).toBe("inspiration");
    });

    it("Step 1: destination set → research phase", () => {
      const phase = getSimplePhase(true, false, false, false, false, false);
      expect(phase).toBe("research");
    });

    it("Step 2: destination + dates → still research", () => {
      const phase = getSimplePhase(true, true, false, false, false, false);
      expect(phase).toBe("research");
    });

    it("Step 3: all info → planning phase", () => {
      const phase = getSimplePhase(true, true, true, false, false, false);
      expect(phase).toBe("planning");
    });

    it("Step 4: flight results → comparison phase", () => {
      const phase = getSimplePhase(true, true, true, true, false, false);
      expect(phase).toBe("comparison");
    });

    it("Step 5: hotel results → comparison phase", () => {
      const phase = getSimplePhase(true, true, true, true, true, false);
      expect(phase).toBe("comparison");
    });
  });

  describe("Flow state → next widget logic", () => {
    it("no destination → no widget (need country first)", () => {
      const flow = emptyFlowState();
      const widget = getNextRequiredWidget(flow, []);
      expect(widget).toBe(null);
    });

    it("has country, no city → citySelector", () => {
      const flow = emptyFlowState({ hasDestination: true });
      const widget = getNextRequiredWidget(flow, []);
      expect(widget).toBe("citySelector");
    });

    it("has city, no dates → date widget", () => {
      const flow = emptyFlowState({
        hasDestination: true,
        hasDestinationCity: true,
      });
      const widget = getNextRequiredWidget(flow, []);
      expect(["datePicker", "dateRangePicker"]).toContain(widget);
    });

    it("has city + dates, no travelers → travelersSelector", () => {
      const flow = emptyFlowState({
        hasDestination: true,
        hasDestinationCity: true,
        hasDepartureDate: true,
        hasReturnDate: true,
      });
      const widget = getNextRequiredWidget(flow, []);
      expect(widget).toBe("travelersSelector");
    });

    it("everything set → tripTypeConfirm or search confirm", () => {
      const flow = emptyFlowState({
        hasDestination: true,
        hasDestinationCity: true,
        hasDepartureDate: true,
        hasReturnDate: true,
        hasTravelers: true,
      });
      const widget = getNextRequiredWidget(flow, []);
      expect(["tripTypeConfirm", "travelersConfirmBeforeSearch", null]).toContain(widget);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. SUGGESTION RELEVANCE PER PHASE
  // ═══════════════════════════════════════════════════════════════

  describe("Suggestions match current phase", () => {
    it("inspiration phase → inspiration suggestions", () => {
      const ctx = baseSuggestionContext();
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
      // Should contain inspiration-type suggestions
      const hasInspire = suggestions.some(
        (s) => /inspir|soleil|city|sun|break|aventure|adventure/i.test(s.label + " " + s.message)
      );
      expect(hasInspire).toBe(true);
    });

    it("destination set, no dates → date-related suggestions", () => {
      const ctx = baseSuggestionContext({
        hasDestination: true,
        destinationName: "Bali",
        workflowStep: "destination",
      });
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("dates set, no travelers → traveler suggestions", () => {
      const ctx = baseSuggestionContext({
        hasDestination: true,
        hasDates: true,
        workflowStep: "dates",
      });
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("all info + flights tab → flight suggestions", () => {
      const ctx = baseSuggestionContext({
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        currentTab: "flights",
        visibleFlightsCount: 5,
        workflowStep: "compare",
      });
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("all info + stays tab → hotel suggestions", () => {
      const ctx = baseSuggestionContext({
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        currentTab: "stays",
        visibleHotelsCount: 3,
        workflowStep: "compare",
      });
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("all info + activities tab → activity suggestions", () => {
      const ctx = baseSuggestionContext({
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        currentTab: "activities",
        visibleActivitiesCount: 4,
        workflowStep: "compare",
      });
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. INTENT ↔ SUGGESTION ALIGNMENT
  // ═══════════════════════════════════════════════════════════════

  describe("User intent → suggestion alignment", () => {
    it("positive intent after destinations → choice suggestions", () => {
      const content: LastProposedContent = { type: "destinations", items: ["Bali", "Vietnam"] };
      const intent = analyzeUserIntent("Super, j'adore Bali !");
      expect(intent.isPositive).toBe(true);
      const suggestions = getAnticipatedSuggestions(content, intent, 3, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("negative intent after destinations → more options", () => {
      const intent = analyzeUserIntent("Non, ça ne m'intéresse pas");
      expect(intent.isNegative).toBe(true);
    });

    it("budget intent detected → budget flag set", () => {
      const intent = analyzeUserIntent("Mon budget est de 2000€ pour 2 personnes");
      expect(intent.wantsBudgetInfo).toBe(true);
      expect(intent.mentionedBudget).toBe("2000");
    });

    it("booking intent detected → booking flag set", () => {
      const intentFR = analyzeUserIntent("Je réserve ce vol pour Bangkok");
      expect(intentFR.wantsToBook).toBe(true);

      const intentEN = analyzeUserIntent("I'll book this flight to Tokyo");
      expect(intentEN.wantsToBook).toBe(true);
    });

    it("comparison intent → comparison flag set", () => {
      const intentFR = analyzeUserIntent("Compare ces deux hôtels pour moi");
      expect(intentFR.wantsComparison).toBe(true);

      const intentEN = analyzeUserIntent("Compare these two options");
      expect(intentEN.wantsComparison).toBe(true);
    });

    it("undecided intent → undecided flag set", () => {
      const intentFR = analyzeUserIntent("Je ne suis pas sûr, j'hésite entre les deux");
      expect(intentFR.isUndecided).toBe(true);

      const intentEN = analyzeUserIntent("I'm not sure, maybe I need to think about it");
      expect(intentEN.isUndecided).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. ASSISTANT MESSAGE ANALYSIS COHERENCE
  // ═══════════════════════════════════════════════════════════════

  describe("Assistant message → correct type + coherent suggestions", () => {
    it("greeting → greeting suggestions", () => {
      const result = analyzeLastAssistantMessage("Bonjour ! Comment puis-je t'aider à planifier ton voyage ?");
      expect(result.type).toBe("greeting");
      const suggestions = getAnticipatedSuggestions(result, {}, 0, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("destination proposals → destination suggestions with items", () => {
      const result = analyzeLastAssistantMessage("Voici 3 destinations parfaites pour toi : Bali, le Vietnam et la Thaïlande");
      expect(result.type).toBe("destinations");
      expect(result.items!.length).toBeGreaterThanOrEqual(2);
      const suggestions = getAnticipatedSuggestions(result, {}, 3, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
      // Should include destination names in suggestions
      const hasDestName = suggestions.some((s) =>
        /bali|vietnam|thaïlande|thailand/i.test(s.label + " " + s.message)
      );
      expect(hasDestName).toBe(true);
    });

    it("date question → date-related suggestions", () => {
      const result = analyzeLastAssistantMessage("Quand souhaitez-vous partir ?");
      expect(result.type).toBe("dates_question");
      const suggestions = getAnticipatedSuggestions(result, {}, 2, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("budget question → budget-related suggestions", () => {
      const result = analyzeLastAssistantMessage("Quel est ton budget pour ce voyage ?");
      expect(result.type).toBe("budget_question");
      const suggestions = getAnticipatedSuggestions(result, {}, 3, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("flights proposals → flight choice suggestions", () => {
      const result = analyzeLastAssistantMessage("Here are the flights available for your trip to Tokyo");
      expect(result.type).toBe("flights");
      const suggestions = getAnticipatedSuggestions(result, {}, 5, "en");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("hotels proposals → hotel choice suggestions", () => {
      const result = analyzeLastAssistantMessage("Voici les hôtels recommandés pour ton séjour");
      expect(result.type).toBe("hotels");
      const suggestions = getAnticipatedSuggestions(result, {}, 5, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("confirmation → next step suggestions", () => {
      const result = analyzeLastAssistantMessage("C'est noté ! Excellent choix.");
      expect(result.type).toBe("confirmation");
      const suggestions = getAnticipatedSuggestions(result, {}, 4, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. CROSS-PHASE CONSISTENCY
  // ═══════════════════════════════════════════════════════════════

  describe("Cross-phase: phase detector agrees with workflow step", () => {
    it("no data → both say inspiration", () => {
      const phase = getSimplePhase(false, false, false, false, false, false);
      const step = getWorkflowStep(baseSuggestionContext());
      expect(phase).toBe("inspiration");
      expect(step).toBe("inspiration");
    });

    it("destination only → research / destination", () => {
      const phase = getSimplePhase(true, false, false, false, false, false);
      const step = getWorkflowStep(baseSuggestionContext({ hasDestination: true }));
      expect(phase).toBe("research");
      expect(step).toBe("destination");
    });

    it("destination + dates → research / dates", () => {
      const phase = getSimplePhase(true, true, false, false, false, false);
      const step = getWorkflowStep(baseSuggestionContext({ hasDestination: true, hasDates: true }));
      expect(phase).toBe("research");
      expect(step).toBe("dates");
    });

    it("all set + flights → comparison / search-or-compare", () => {
      const phase = getSimplePhase(true, true, true, true, false, false);
      const step = getWorkflowStep(
        baseSuggestionContext({
          hasDestination: true,
          hasDates: true,
          hasTravelers: true,
          hasFlights: false,
          currentTab: "flights",
        })
      );
      expect(phase).toBe("comparison");
      expect(["search", "compare"]).toContain(step);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. FULL CONVERSATION SIMULATION
  // ═══════════════════════════════════════════════════════════════

  describe("Full conversation simulation (FR)", () => {
    it("turn 0: greeting → greeting detected → 3+ suggestions in FR", () => {
      const assistantMsg = "Bonjour ! Je suis ton assistant voyage. Que recherches-tu ?";
      const analysis = analyzeLastAssistantMessage(assistantMsg);
      expect(analysis.type).toBe("greeting");
      const suggestions = getAnticipatedSuggestions(analysis, {}, 0, "fr");
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it("turn 1: user says destination → intent has destination mention", () => {
      const userMsg = "Je veux aller en Thaïlande";
      const lang = detectLanguage(userMsg);
      expect(lang).toBe("fr");
      // Phase should still be inspiration until confirmed
    });

    it("turn 2: assistant proposes destinations → items extracted", () => {
      const assistantMsg = "Je te propose Bali, le Vietnam et la Thaïlande. Que penses-tu ?";
      const analysis = analyzeLastAssistantMessage(assistantMsg);
      expect(analysis.type).toBe("destinations");
      expect(analysis.items!.length).toBeGreaterThanOrEqual(2);
      expect(analysis.isAskingForChoice).toBe(true);
    });

    it("turn 3: user picks destination → positive intent", () => {
      const userMsg = "Super, je choisis Bali !";
      const intent = analyzeUserIntent(userMsg);
      expect(intent.isPositive).toBe(true);
      const lang = detectLanguage(userMsg);
      expect(lang).toBe("fr");
    });

    it("turn 4: assistant asks dates → dates_question detected", () => {
      const assistantMsg = "Quand souhaitez-vous partir pour Bali ?";
      const analysis = analyzeLastAssistantMessage(assistantMsg);
      expect(analysis.type).toBe("dates_question");
    });

    it("turn 5: user provides dates → date intent detected", () => {
      const userMsg = "Du 15 au 25 mars 2025";
      const intent = analyzeUserIntent(userMsg);
      expect(intent.wantsDateInfo).toBe(true);
    });

    it("turn 6: assistant asks travelers → travelers_question detected", () => {
      const assistantMsg = "Combien serez-vous pour ce voyage ?";
      const analysis = analyzeLastAssistantMessage(assistantMsg);
      expect(analysis.type).toBe("travelers_question");
    });

    it("turn 7: user provides budget → budget intent detected", () => {
      const userMsg = "Mon budget est de 1500€ par personne";
      const intent = analyzeUserIntent(userMsg);
      expect(intent.wantsBudgetInfo).toBe(true);
      expect(intent.mentionedBudget).toBe("1500");
    });
  });

  describe("Full conversation simulation (EN)", () => {
    it("turn 0: EN greeting → greeting detected → EN suggestions", () => {
      const assistantMsg = "Hello! I'm your travel assistant. What are you looking for?";
      const analysis = analyzeLastAssistantMessage(assistantMsg);
      expect(analysis.type).toBe("greeting");
      const suggestions = getAnticipatedSuggestions(analysis, {}, 0, "en");
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
      const hasEnglish = suggestions.some(
        (s) => /inspire|sunny|city|adventure/i.test(s.label)
      );
      expect(hasEnglish).toBe(true);
    });

    it("turn 1: EN user picks → positive intent + EN detected", () => {
      const userMsg = "I'd love to visit Japan!";
      const lang = detectLanguage(userMsg);
      expect(lang).toBe("en");
      const intent = analyzeUserIntent(userMsg);
      expect(intent.isPositive).toBe(true);
    });

    it("turn 2: EN date question → dates_question", () => {
      const assistantMsg = "When would you like to travel to Japan?";
      const analysis = analyzeLastAssistantMessage(assistantMsg);
      expect(analysis.type).toBe("dates_question");
    });

    it("turn 3: EN dates provided → date intent", () => {
      const userMsg = "I want to go next week for 10 days";
      const intent = analyzeUserIntent(userMsg);
      expect(intent.wantsDateInfo).toBe(true);
    });

    it("turn 4: EN budget → budget intent + amount extracted", () => {
      const userMsg = "My budget is $3000 per person";
      const intent = analyzeUserIntent(userMsg);
      expect(intent.wantsBudgetInfo).toBe(true);
      expect(intent.mentionedBudget).toBe("3000");
    });

    it("turn 5: EN comparison request → comparison intent", () => {
      const userMsg = "Compare these two flight options for me";
      const intent = analyzeUserIntent(userMsg);
      expect(intent.wantsComparison).toBe(true);
    });

    it("turn 6: EN booking → booking intent", () => {
      const userMsg = "I'll book the first option";
      const intent = analyzeUserIntent(userMsg);
      expect(intent.wantsToBook).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. PHASE DETECTOR COHERENCE
  // ═══════════════════════════════════════════════════════════════

  describe("Phase detector coherence with signals", () => {
    it("no signals → inspiration", () => {
      const ctx = detectCurrentPhase(emptySignals());
      expect(ctx.currentPhase).toBe("inspiration");
      expect(ctx.completedSteps.length).toBe(0);
    });

    it("asked for inspiration → inspiration with high confidence", () => {
      const ctx = detectCurrentPhase(emptySignals({ askedForInspiration: true }));
      expect(ctx.currentPhase).toBe("inspiration");
      expect(ctx.confidenceScore).toBeGreaterThanOrEqual(90);
    });

    it("destination set → research", () => {
      const ctx = detectCurrentPhase(emptySignals({ hasDestination: true }));
      expect(ctx.currentPhase).toBe("research");
      expect(ctx.completedSteps).toContain("destination");
    });

    it("destination + dates + travelers → research (not planning yet)", () => {
      const ctx = detectCurrentPhase(
        emptySignals({ hasDestination: true, hasDates: true, hasTravelers: true })
      );
      // Without flight/hotel results, still research
      expect(ctx.currentPhase).toBe("research");
      expect(ctx.completedSteps.length).toBe(3);
    });

    it("flight + hotel results → planning", () => {
      const ctx = detectCurrentPhase(
        emptySignals({
          hasDestination: true,
          hasDates: true,
          hasTravelers: true,
          hasFlightResults: true,
          hasHotelResults: true,
        })
      );
      expect(ctx.currentPhase).toBe("planning");
    });

    it("comparison request → comparison phase", () => {
      const ctx = detectCurrentPhase(
        emptySignals({
          hasDestination: true,
          requestedComparison: true,
        })
      );
      expect(ctx.currentPhase).toBe("comparison");
    });

    it("ready to book + enough steps → booking phase", () => {
      const ctx = detectCurrentPhase(
        emptySignals({
          hasDestination: true,
          hasDates: true,
          hasTravelers: true,
          hasDeparture: true,
          readyToBook: true,
        })
      );
      expect(ctx.currentPhase).toBe("booking");
      expect(ctx.confidenceScore).toBeGreaterThanOrEqual(90);
    });

    it("negative feedback tracked", () => {
      const ctx = detectCurrentPhase(emptySignals({ hasNegativePreferences: true }));
      expect(ctx.hasNegativeFeedback).toBe(true);
    });
  });

  describe("extractPhaseSignals from user messages", () => {
    it("inspiration message → askedForInspiration", () => {
      const signals = extractPhaseSignals(null, "", "Je ne sais pas où aller, inspire-moi", false, false, false);
      expect(signals.askedForInspiration).toBe(true);
    });

    it("comparison message → requestedComparison", () => {
      const signals = extractPhaseSignals(null, "", "Compare ces deux options", false, false, false);
      expect(signals.requestedComparison).toBe(true);
    });

    it("booking message → readyToBook", () => {
      const signals = extractPhaseSignals(null, "", "Je réserve ce vol", false, false, false);
      expect(signals.readyToBook).toBe(true);
    });

    it("negative message → hasNegativePreferences", () => {
      const signals = extractPhaseSignals(null, "", "Je n'aime pas les hôtels trop chers", false, false, false);
      expect(signals.hasNegativePreferences).toBe(true);
    });

    it("widget history: destination confirmed", () => {
      const signals = extractPhaseSignals(null, "destination_selected", "ok", false, false, false);
      expect(signals.destinationConfirmed).toBe(true);
    });

    it("widget history: dates confirmed", () => {
      const signals = extractPhaseSignals(null, "date_range_selected", "ok", false, false, false);
      expect(signals.datesConfirmed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. SUGGESTIONS NEVER EMPTY AT TURN 0
  // ═══════════════════════════════════════════════════════════════

  describe("Suggestions never empty at conversation start", () => {
    it("FR greeting at turn 0 → suggestions present", () => {
      const suggestions = getAnticipatedSuggestions({ type: "greeting" }, {}, 0, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("EN greeting at turn 0 → suggestions present", () => {
      const suggestions = getAnticipatedSuggestions({ type: "greeting" }, {}, 0, "en");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("unknown type at turn 0 → default suggestions present", () => {
      const suggestions = getAnticipatedSuggestions({ type: "unknown" }, {}, 0, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("unknown type at turn > 0 → empty (no generic noise)", () => {
      const suggestions = getAnticipatedSuggestions({ type: "unknown" }, {}, 5, "fr");
      expect(suggestions.length).toBe(0);
    });

    it("inspiration context at start → suggestions present", () => {
      const suggestions = getSuggestions(baseSuggestionContext());
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. WORKFLOW STEP DETECTION
  // ═══════════════════════════════════════════════════════════════

  describe("getWorkflowStep coherence", () => {
    it("no destination → inspiration", () => {
      expect(getWorkflowStep(baseSuggestionContext())).toBe("inspiration");
    });

    it("destination, no dates → destination", () => {
      expect(getWorkflowStep(baseSuggestionContext({ hasDestination: true }))).toBe("destination");
    });

    it("destination + dates, no travelers → dates", () => {
      expect(
        getWorkflowStep(baseSuggestionContext({ hasDestination: true, hasDates: true }))
      ).toBe("dates");
    });

    it("all info, flights tab empty → search", () => {
      expect(
        getWorkflowStep(
          baseSuggestionContext({
            hasDestination: true,
            hasDates: true,
            hasTravelers: true,
            currentTab: "flights",
            visibleFlightsCount: 0,
            hasFlights: false,
          })
        )
      ).toBe("search");
    });

    it("all info, has flights → compare", () => {
      expect(
        getWorkflowStep(
          baseSuggestionContext({
            hasDestination: true,
            hasDates: true,
            hasTravelers: true,
            currentTab: "flights",
            visibleFlightsCount: 5,
          })
        )
      ).toBe("compare");
    });
  });
}
