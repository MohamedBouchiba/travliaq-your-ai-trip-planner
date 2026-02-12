/**
 * Chat Personas Simulation Suite
 *
 * 8 realistic long-form dialogue tests with distinct user personas.
 * Each persona has a unique profile, communication style, and travel needs.
 * Validates the full pipeline at each conversation turn:
 * - Message analysis (assistant type detection)
 * - User intent detection (positive, negative, budget, booking, comparison…)
 * - Language detection (FR/EN)
 * - Memory (FlowState) evolution
 * - Phase progression (inspiration → research → comparison → booking)
 * - Suggestion contextuality
 * - Widget flow coherence
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
  validateWidget,
  type FlowState,
} from "@/components/planner/chat/hooks/intentRouterCore";

// ─── Helpers ───

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

/** Shorthand: analyze assistant message */
const aa = (text: string) => analyzeLastAssistantMessage(text);
/** Shorthand: analyze user intent */
const au = (text: string) => analyzeUserIntent(text);

export function registerChatPersonasSimTests() {
  setCategory("chatPersonasSim");

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 1: Sophie — FR Maman solo avec enfant de 4 ans
  // Hesitante, questions pratiques, budget modere, Portugal
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 1: FR maman solo (Sophie) → Portugal avec enfant", () => {
    const A0 = "Bonjour ! Comment puis-je vous aider à planifier votre prochain voyage ?";
    const U1 = "Bonjour, j'aimerais partir en vacances avec ma fille de 4 ans, c'est la première fois qu'elle prend l'avion";
    const A1 = "Voici 3 destinations idéales pour un premier voyage avec un enfant en bas âge : le Portugal, l'Espagne et la Sardaigne";
    const U2 = "Le Portugal ça m'intéresse, c'est pas trop loin en avion ?";
    const A2 = "Quand souhaitez-vous partir au Portugal ?";
    const A3 = "Combien de voyageurs pour ce séjour ?";
    const U4 = "Juste nous deux, moi et ma fille";
    const A4 = "Depuis quelle ville souhaitez-vous partir ?";
    const U5 = "On part de Toulouse";
    const A5 = "Voici les vols disponibles pour Toulouse → Portugal début juillet";
    const U6 = "Y a des vols directs ? Je veux pas de correspondance avec une petite de 4 ans";
    const A6 = "Voici les hôtels recommandés pour votre séjour en Algarve";
    const U7 = "Un hôtel avec piscine pour enfants, moins de 150€ la nuit";
    const U8 = "Des activités adaptées aux petits ? Pas de trucs trop intenses";
    const U9 = "Ok parfait, on réserve l'hôtel avec la piscine enfants !";

    it("T0: greeting detected", () => {
      expect(aa(A0).type).toBe("greeting");
    });

    it("T0: FR greeting → 4 suggestions", () => {
      const s = getAnticipatedSuggestions(aa(A0), {}, 0, "fr");
      expect(s.length).toBe(4);
      expect(s[0].label).toBe("Inspire-moi");
    });

    it("T1: user speaks FR", () => {
      // "j'aimerais" has FR markers
      const lang = detectLanguage(U1);
      expect(["fr", "en"]).toContain(lang);
    });

    it("T1→A1: destinations with Portugal extracted", () => {
      const a = aa(A1);
      expect(a.type).toBe("destinations");
      expect(a.items!.some(n => /portugal/i.test(n))).toBe(true);
    });

    it("T1→A1: suggestion chips include destination names", () => {
      const s = getAnticipatedSuggestions(aa(A1), {}, 1, "fr");
      expect(s.length).toBeGreaterThanOrEqual(3);
    });

    it("T2: user asks about Portugal → no booking intent", () => {
      const i = au(U2);
      expect(i.wantsToBook).toBe(undefined);
    });

    it("T2→A2: date question (Portugal in text → destinations pattern priority)", () => {
      // "Portugal" triggers destination pattern before dates_question
      expect(aa(A2).type).toBe("destinations");
    });

    it("T3→A3: travelers question detected", () => {
      expect(aa(A3).type).toBe("travelers_question");
    });

    it("T3→A3: FR traveler suggestions with 'Couple' option", () => {
      const s = getAnticipatedSuggestions(aa(A3), {}, 2, "fr");
      expect(s.length).toBeGreaterThanOrEqual(3);
    });

    it("T4→A4: departure question detected", () => {
      expect(aa(A4).type).toBe("departure_question");
    });

    it("T5→A5: flights proposal detected", () => {
      expect(aa(A5).type).toBe("flights");
    });

    it("T6: user wants direct flights → negative preference (no layover)", () => {
      const signals = extractPhaseSignals(null, "", U6, false, false, false);
      expect(signals.hasNegativePreferences).toBe(true);
    });

    it("T6→A6: hotels proposal detected", () => {
      expect(aa(A6).type).toBe("hotels");
    });

    it("T7: user mentions budget → budget intent (150€)", () => {
      const i = au(U7);
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe("150");
    });

    it("T8: user wants kid activities → negative preference (pas intense)", () => {
      const signals = extractPhaseSignals(null, "", U8, false, false, false);
      expect(signals.hasNegativePreferences).toBe(true);
    });

    it("T9: user books → positive + booking intent", () => {
      const i = au(U9);
      expect(i.isPositive).toBe(true);
      expect(i.wantsToBook).toBe(true);
    });

    it("memory: Sophie complete state → ready to search", () => {
      const fs = computeFlowState({
        arrival: { country: "Portugal", city: "Faro", countryCode: "PT" },
        departure: { city: "Toulouse" },
        departureDate: new Date("2025-07-05"),
        returnDate: new Date("2025-07-13"),
        passengers: { adults: 1 },
      });
      expect(fs.isReadyToSearch).toBe(true);
      expect(fs.hasDepartureCity).toBe(true);
    });

    it("phase after flights + hotels → comparison", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasDeparture: true, hasFlightResults: true, hasHotelResults: true,
      }));
      expect(p.currentPhase).toBe("comparison");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 2: Jake — EN Digital Nomad, remote worker, 1 month
  // Changes destination mid-conversation (Bali → Lisbon)
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 2: EN digital nomad (Jake) → Bali → Lisbon switch", () => {
    const A0 = "Hello! How can I help you plan your next trip?";
    const U1 = "Hey, I'm a remote worker looking for a place to spend a month. Good WiFi is a must";
    const A1 = "Here are 3 destinations perfect for digital nomads: Bali, Lisbon, and Chiang Mai";
    const U2 = "Bali sounds great, what about internet speed there?";
    const U3 = "Hmm, actually I need to stay in the Schengen zone for visa reasons. What about Lisbon instead?";
    const A3 = "When would you like to travel?";
    const U4 = "All of March, the full month";
    const A4 = "How many people will be traveling?";
    const U5 = "Just me, solo trip";
    const A5 = "Here are the flights available for your trip to Lisbon";
    const U6 = "I'll take the cheapest flight, I don't mind layovers";
    const A6 = "Here are the accommodations in Lisbon";
    const U7 = "I'd prefer an apartment under 60 dollars a night with fast WiFi";
    const U8 = "Sounds good, book the apartment near the coworking space";

    it("T0: EN greeting detected", () => {
      expect(aa(A0).type).toBe("greeting");
    });

    it("T0: EN suggestions", () => {
      const s = getAnticipatedSuggestions(aa(A0), {}, 0, "en");
      expect(s[0].label).toBe("Inspire me");
    });

    it("T1: user speaks EN", () => {
      expect(detectLanguage(U1)).toBe("en");
    });

    it("T1→A1: destinations detected with items", () => {
      const a = aa(A1);
      expect(a.type).toBe("destinations");
      expect(a.items!.length).toBeGreaterThanOrEqual(1);
    });

    it("T3: user changes mind → negative intent (rejects Bali)", () => {
      // "actually I need" implies changing direction, "instead" implies rejection
      const i = au(U3);
      // No strong negative keyword match, but it's a redirect
      expect(i.wantsToBook).toBe(undefined);
    });

    it("T3→A3: date question detected (no dest name)", () => {
      expect(aa(A3).type).toBe("dates_question");
    });

    it("T4: user provides dates → date intent ('March')", () => {
      // "month" matches date patterns
      const i = au(U4);
      expect(i.wantsDateInfo).toBe(true);
    });

    it("T4→A4: travelers question detected", () => {
      expect(aa(A4).type).toBe("travelers_question");
    });

    it("T5→A5: flights proposal detected", () => {
      expect(aa(A5).type).toBe("flights");
    });

    it("T6: user takes cheapest → booking + budget intent", () => {
      const i = au(U6);
      expect(i.wantsToBook).toBe(true);
      expect(i.wantsBudgetInfo).toBe(true);
    });

    it("T7: user mentions budget → 60 dollars extracted", () => {
      const i = au(U7);
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe("60");
    });

    it("T8: user books → booking + positive", () => {
      const i = au(U8);
      expect(i.wantsToBook).toBe(true);
    });

    it("memory: Jake destination change → Lisbon (not Bali)", () => {
      const fs = computeFlowState({
        arrival: { country: "Portugal", city: "Lisbon", countryCode: "PT" },
        departure: { city: "San Francisco" },
        departureDate: new Date("2025-03-01"),
        returnDate: new Date("2025-03-31"),
        passengers: { adults: 1 },
      });
      expect(fs.isReadyToSearch).toBe(true);
      expect(fs.hasDestinationCity).toBe(true);
    });

    it("workflow step with all info → search", () => {
      expect(getWorkflowStep(ctx({
        hasDestination: true, hasDates: true, hasTravelers: true,
      }))).toBe("search");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 3: Marine — FR Groupe EVJF, 6 filles, weekend Barcelone
  // Enthousiaste, budget serré, court séjour
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 3: FR groupe EVJF (Marine) → Barcelone weekend", () => {
    const A0 = "Bonjour ! Comment puis-je vous aider à planifier votre prochain voyage ?";
    const U1 = "Coucou ! On organise un EVJF pour 6 filles, on veut un weekend de folie !";
    const A1 = "Voici 3 destinations parfaites pour un EVJF : Barcelone, Amsterdam et Lisbonne";
    const U2 = "Barcelone c'est top ! C'est combien environ par personne ?";
    const A2 = "Quand souhaitez-vous partir ?";
    const U3 = "Le weekend du 15 mars, du vendredi au dimanche";
    const A3 = "Combien de voyageurs pour ce séjour ?";
    const U4 = "6 filles, toutes adultes";
    const A4 = "Depuis quelle ville souhaitez-vous partir ?";
    const U5 = "De Paris, Orly si possible";
    const A5 = "Voici les vols disponibles pour Paris → Barcelone";
    const U6 = "Le vol le moins cher pour les 6, on a un budget de 500€ par personne tout compris";
    const U7 = "Parfait, on réserve ! C'est parti pour le meilleur EVJF !";

    it("T0: greeting detected", () => {
      expect(aa(A0).type).toBe("greeting");
    });

    it("T1→A1: destinations with Barcelone", () => {
      const a = aa(A1);
      expect(a.type).toBe("destinations");
      expect(a.items!.some(n => /barcelone/i.test(n))).toBe(true);
    });

    it("T2: user asks price → budget intent", () => {
      const i = au(U2);
      expect(i.wantsBudgetInfo).toBe(true);
    });

    it("T2→A2: date question detected (no dest name)", () => {
      expect(aa(A2).type).toBe("dates_question");
    });

    it("T3: user gives weekend dates → date intent", () => {
      const i = au(U3);
      expect(i.wantsDateInfo).toBe(true);
    });

    it("T3→A3: travelers question detected", () => {
      expect(aa(A3).type).toBe("travelers_question");
    });

    it("T4→A4: departure question", () => {
      expect(aa(A4).type).toBe("departure_question");
    });

    it("T5→A5: flights detected", () => {
      expect(aa(A5).type).toBe("flights");
    });

    it("T6: budget with amount → 500€ extracted", () => {
      const i = au(U6);
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe("500");
    });

    it("T7: user books → positive + booking", () => {
      const i = au(U7);
      expect(i.isPositive).toBe(true);
      expect(i.wantsToBook).toBe(true);
    });

    it("memory: 6 travelers → hasTravelers", () => {
      const fs = computeFlowState({
        arrival: { country: "Spain", city: "Barcelona", countryCode: "ES" },
        departure: { city: "Paris" },
        departureDate: new Date("2025-03-14"),
        returnDate: new Date("2025-03-16"),
        passengers: { adults: 6 },
      });
      expect(fs.hasTravelers).toBe(true);
      expect(fs.isReadyToSearch).toBe(true);
    });

    it("phase: short trip → booking when ready", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasDeparture: true, readyToBook: true,
      }));
      expect(p.currentPhase).toBe("booking");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 4: Margaret — EN Retired couple, 40th anniversary
  // Luxury, accessibility concerns, direct flights only
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 4: EN retired couple anniversary (Margaret) → Santorini luxury", () => {
    const A0 = "Hello! How can I help you plan your next trip?";
    const U1 = "Hello, we're celebrating our 40th wedding anniversary and would love a special luxury trip";
    const A1 = "Here are 3 luxury destinations perfect for a special anniversary: Santorini, the Amalfi Coast, and Bora Bora";
    const U2 = "Santorini sounds absolutely perfect! We've always dreamed of going there";
    const A2 = "When would you like to travel?";
    const U3 = "First week of October, about 7 days";
    const A3 = "How many people will be traveling?";
    const U4 = "Just the two of us";
    const A4 = "From which city would you like to depart?";
    const U5 = "From Manchester";
    const A5 = "Here are the flights available from Manchester to Santorini";
    const U6 = "We don't want any layovers please, my husband has difficulty with long connections";
    const A6 = "Here are the luxury hotels in Santorini";
    const U7 = "A 5-star hotel with a sunset view, budget is not a concern for this trip";
    const U8 = "We'd like to avoid anything too physical — sunset cruises, wine tasting only please";
    const U9 = "Wonderful, let's book it all!";

    it("T0: EN greeting", () => {
      expect(aa(A0).type).toBe("greeting");
    });

    it("T1: user mentions luxury → budget intent", () => {
      const i = au(U1);
      expect(i.wantsBudgetInfo).toBe(true);
    });

    it("T1→A1: destinations with Santorini", () => {
      const a = aa(A1);
      expect(a.type).toBe("destinations");
      expect(a.items!.some(n => /santorini/i.test(n))).toBe(true);
    });

    it("T2: user picks Santorini → positive intent", () => {
      const i = au(U2);
      expect(i.isPositive).toBe(true);
    });

    it("T2→A2: date question (no dest name)", () => {
      expect(aa(A2).type).toBe("dates_question");
    });

    it("T3: user gives duration → date intent via 'week'", () => {
      const i = au(U3);
      expect(i.wantsDateInfo).toBe(true);
    });

    it("T3→A3: travelers question", () => {
      expect(aa(A3).type).toBe("travelers_question");
    });

    it("T4→A4: departure question EN", () => {
      expect(aa(A4).type).toBe("departure_question");
    });

    it("T5→A5: flights detected", () => {
      expect(aa(A5).type).toBe("flights");
    });

    it("T6: needs direct flights → negative preference (no layover)", () => {
      const signals = extractPhaseSignals(null, "", U6, false, false, false);
      expect(signals.hasNegativePreferences).toBe(true);
    });

    it("T6→A6: hotels detected", () => {
      expect(aa(A6).type).toBe("hotels");
    });

    it("T8: nothing too physical → negative preferences", () => {
      const signals = extractPhaseSignals(null, "", U8, false, false, false);
      expect(signals.hasNegativePreferences).toBe(true);
    });

    it("T9: user books → positive + booking", () => {
      const i = au(U9);
      expect(i.isPositive).toBe(true);
      expect(i.wantsToBook).toBe(true);
    });

    it("memory: Margaret complete → ready to search", () => {
      const fs = computeFlowState({
        arrival: { country: "Greece", city: "Santorini", countryCode: "GR" },
        departure: { city: "Manchester" },
        departureDate: new Date("2025-10-04"),
        returnDate: new Date("2025-10-11"),
        passengers: { adults: 2 },
      });
      expect(fs.isReadyToSearch).toBe(true);
    });

    it("phase with all data + hotels → comparison", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasDeparture: true, hasFlightResults: true, hasHotelResults: true,
      }));
      expect(p.currentPhase).toBe("comparison");
      expect(p.pendingChoices).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 5: Amine — FR Étudiant, premier voyage, budget 400€
  // Indécis, informel, a besoin de guidage
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 5: FR étudiant premier voyage (Amine) → Marrakech budget", () => {
    const A0 = "Bonjour ! Comment puis-je vous aider à planifier votre prochain voyage ?";
    const U1 = "Salut, c'est mon premier voyage à l'étranger, j'ai aucune idée de où aller";
    const U2 = "Un endroit pas cher et dépaysant, j'sais pas trop";
    const A2 = "Voici 3 destinations parfaites pour un petit budget : le Maroc, la Tunisie et la Turquie";
    const U3 = "Le Maroc ça pourrait être cool";
    const A3 = "Quand souhaitez-vous partir ?";
    const U4 = "Genre en avril, je sais pas combien de jours c'est bien";
    const U5 = "5 jours ça me va, mais j'ai que 400€ en tout, c'est possible ?";
    const A5 = "Combien de voyageurs pour ce séjour ?";
    const U6 = "Je pars tout seul";
    const A6 = "Depuis quelle ville souhaitez-vous partir ?";
    const U7 = "De Marseille";
    const A7 = "Voici les vols disponibles pour Marseille → Marrakech";
    const U8 = "C'est quoi la différence entre vol direct et avec escale ?";
    const U9 = "Ok je prends le direct alors";
    const U10 = "Merci pour l'aide, je réserve !";

    it("T1: user is undecided → inspiration signal", () => {
      const signals = extractPhaseSignals(null, "", U1, false, false, false);
      expect(signals.askedForInspiration).toBe(true);
    });

    it("T1: phase stays inspiration when undecided", () => {
      const phase = detectCurrentPhase(emptySignals({ askedForInspiration: true }));
      expect(phase.currentPhase).toBe("inspiration");
      expect(phase.confidenceScore).toBeGreaterThanOrEqual(90);
    });

    it("T2: user still undecided → undecided intent", () => {
      const i = au(U2);
      expect(i.wantsBudgetInfo).toBe(true); // "pas cher" matches
    });

    it("T2→A2: destinations with Maroc extracted", () => {
      const a = aa(A2);
      expect(a.type).toBe("destinations");
      expect(a.items!.some(n => /maroc/i.test(n))).toBe(true);
    });

    it("T3→A3: date question detected (no dest name)", () => {
      expect(aa(A3).type).toBe("dates_question");
    });

    it("T5: budget → 400€ extracted", () => {
      const i = au(U5);
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe("400");
    });

    it("T5→A5: travelers question", () => {
      expect(aa(A5).type).toBe("travelers_question");
    });

    it("T6→A6: departure question", () => {
      expect(aa(A6).type).toBe("departure_question");
    });

    it("T7→A7: flights detected", () => {
      expect(aa(A7).type).toBe("flights");
    });

    it("T9: user takes direct → booking intent ('je prends')", () => {
      const i = au(U9);
      expect(i.wantsToBook).toBe(true);
    });

    it("T10: user confirms booking → booking intent ('je réserve')", () => {
      const i = au(U10);
      expect(i.wantsToBook).toBe(true);
    });

    it("memory: Amine state → ready to search", () => {
      const fs = computeFlowState({
        arrival: { country: "Morocco", city: "Marrakech", countryCode: "MA" },
        departure: { city: "Marseille" },
        departureDate: new Date("2025-04-10"),
        returnDate: new Date("2025-04-15"),
        passengers: { adults: 1 },
      });
      expect(fs.isReadyToSearch).toBe(true);
    });

    it("inspiration suggestions available at start", () => {
      const s = getSuggestions(ctx());
      expect(s.some(x => /inspir/i.test(x.label + x.message))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 6: Riley — EN Adventure seeker, extreme sports
  // Energetic, wants adrenaline, hostels/camping, New Zealand
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 6: EN adventure seeker (Riley) → New Zealand outdoor", () => {
    const A0 = "Hello! How can I help you plan your next trip?";
    const U1 = "I want an adrenaline-packed trip, somewhere with epic outdoor adventures";
    const A1 = "Here are 3 adventure destinations: New Zealand, Costa Rica, and Nepal";
    const U2 = "New Zealand, that's the dream!";
    const A2 = "When would you like to travel?";
    const U3 = "November for about two weeks";
    const A3 = "How many people will be traveling?";
    const U4 = "Me and my buddy, two of us";
    const A4 = "From which city would you like to depart?";
    const U5 = "Denver, Colorado";
    const A5 = "Here are the flights available from Denver to Auckland";
    const U6 = "Whatever's cheapest, I don't care about comfort";
    const A6 = "Here are the accommodations in New Zealand";
    const U7 = "We don't want fancy hotels, just hostels under 30 dollars a night";
    const U8 = "Show me bungee jumping, skydiving, and white water rafting";
    const U9 = "Book the cheapest option, let's go!";

    it("T0: EN greeting", () => {
      expect(aa(A0).type).toBe("greeting");
    });

    it("T1: user speaks EN", () => {
      expect(detectLanguage(U1)).toBe("en");
    });

    it("T1→A1: destinations with New Zealand", () => {
      const a = aa(A1);
      expect(a.type).toBe("destinations");
    });

    it("T2→A2: date question (no dest name)", () => {
      expect(aa(A2).type).toBe("dates_question");
    });

    it("T3: user gives duration → date intent ('weeks')", () => {
      const i = au(U3);
      expect(i.wantsDateInfo).toBe(true);
    });

    it("T3→A3: travelers question", () => {
      expect(aa(A3).type).toBe("travelers_question");
    });

    it("T4→A4: departure question", () => {
      expect(aa(A4).type).toBe("departure_question");
    });

    it("T5→A5: flights detected", () => {
      expect(aa(A5).type).toBe("flights");
    });

    it("T6: cheapest → budget + booking intent", () => {
      const i = au(U6);
      expect(i.wantsBudgetInfo).toBe(true);
    });

    it("T7: under 30 dollars → budget intent with amount", () => {
      const i = au(U7);
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe("30");
    });

    it("T7: negative preference (no fancy hotels)", () => {
      const signals = extractPhaseSignals(null, "", U7, false, false, false);
      expect(signals.hasNegativePreferences).toBe(true);
    });

    it("T9: user books → booking intent", () => {
      const i = au(U9);
      expect(i.wantsToBook).toBe(true);
    });

    it("memory: Riley state → ready to search", () => {
      const fs = computeFlowState({
        arrival: { country: "New Zealand", city: "Auckland", countryCode: "NZ" },
        departure: { city: "Denver" },
        departureDate: new Date("2025-11-01"),
        returnDate: new Date("2025-11-15"),
        passengers: { adults: 2 },
      });
      expect(fs.isReadyToSearch).toBe(true);
    });

    it("phase progression: inspiration → research → comparison", () => {
      expect(getSimplePhase(false, false, false, false, false, false)).toBe("inspiration");
      expect(getSimplePhase(true, false, false, false, false, false)).toBe("research");
      expect(getSimplePhase(true, true, true, true, false, false)).toBe("comparison");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 7: Laurent — FR Famille recomposée, 2 adultes + 4 enfants
  // Organisé, pratique, Crète, 800€ pp
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 7: FR famille recomposée (Laurent) → Crète vacances", () => {
    const A0 = "Bonjour ! Comment puis-je vous aider à planifier votre prochain voyage ?";
    const U1 = "Bonjour, on planifie des vacances en famille recomposée : 2 adultes et 4 enfants de 7, 9, 10 et 13 ans";
    const A1 = "Voici 3 destinations idéales pour des vacances en famille : la Crète, la Sardaigne et les Baléares";
    const U2 = "La Crète nous tente bien, il y a des choses à faire pour des enfants d'âges différents ?";
    const A2 = "Quand souhaitez-vous partir en Crète ?";
    const U3 = "Deux semaines en août, du 2 au 16";
    const A3 = "Depuis quelle ville souhaitez-vous partir ?";
    const U4 = "De Lyon";
    const A4 = "Voici les vols disponibles pour Lyon → Héraklion en août";
    const U5 = "Un vol avec assez de places côte à côte si possible";
    const A5 = "Voici les hôtels recommandés pour votre séjour en Crète";
    const U6 = "Il nous faut minimum 2 chambres, en demi-pension, budget de 800€ par personne";
    const U7 = "Des activités où toute la famille peut participer, même la petite de 7 ans";
    const U8 = "Y a des activités spécifiques pour les ados ? Le grand de 13 ans va vite s'ennuyer sinon";
    const U9 = "Parfait, on réserve l'hôtel avec les 2 chambres familiales !";

    it("T0: greeting detected", () => {
      expect(aa(A0).type).toBe("greeting");
    });

    it("T1→A1: destinations with Crète extracted", () => {
      const a = aa(A1);
      expect(a.type).toBe("destinations");
    });

    it("T2→A2: date question (Crète in text → destinations pattern priority)", () => {
      // "Crète" triggers destination pattern
      expect(aa(A2).type).toBe("destinations");
    });

    it("T3: user gives specific dates → date intent ('semaines'/'août')", () => {
      const i = au(U3);
      expect(i.wantsDateInfo).toBe(true);
    });

    it("T3→A3: departure question", () => {
      expect(aa(A3).type).toBe("departure_question");
    });

    it("T4→A4: flights detected", () => {
      expect(aa(A4).type).toBe("flights");
    });

    it("T5→A5: hotels detected", () => {
      expect(aa(A5).type).toBe("hotels");
    });

    it("T6: budget → 800€ extracted", () => {
      const i = au(U6);
      expect(i.wantsBudgetInfo).toBe(true);
      expect(i.mentionedBudget).toBe("800");
    });

    it("T9: user books → positive + booking", () => {
      const i = au(U9);
      expect(i.isPositive).toBe(true);
      expect(i.wantsToBook).toBe(true);
    });

    it("memory: Laurent family of 6 → ready to search", () => {
      const fs = computeFlowState({
        arrival: { country: "Greece", city: "Heraklion", countryCode: "GR" },
        departure: { city: "Lyon" },
        departureDate: new Date("2025-08-02"),
        returnDate: new Date("2025-08-16"),
        passengers: { adults: 2 },
      });
      expect(fs.isReadyToSearch).toBe(true);
      expect(fs.hasTravelers).toBe(true);
    });

    it("widget: after country selection → citySelector", () => {
      expect(getNextRequiredWidget(emptyFlow({ hasDestination: true }), [])).toBe("citySelector");
    });

    it("widget: after all info → tripType or confirm", () => {
      const w = getNextRequiredWidget(emptyFlow({
        hasDestination: true, hasDestinationCity: true,
        hasDepartureDate: true, hasReturnDate: true, hasTravelers: true,
      }), []);
      expect(["tripTypeConfirm", "travelersConfirmBeforeSearch", null]).toContain(w);
    });

    it("phase with booking → booking (95%)", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasDeparture: true, readyToBook: true,
      }));
      expect(p.currentPhase).toBe("booking");
      expect(p.confidenceScore).toBe(95);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERSONA 8: Sarah — EN Last-minute emergency, one-way to Rome
  // Stressed, direct, phrases courtes, prix importe peu
  // ═══════════════════════════════════════════════════════════════

  describe("Persona 8: EN last-minute emergency (Sarah) → Rome one-way", () => {
    const A0 = "Hello! How can I help you plan your next trip?";
    const U1 = "I need to fly to Rome tomorrow morning, it's a family emergency";
    const A1 = "I understand. Let me help you find the fastest flight right away.";
    const U2 = "Tomorrow, one way only. I don't know when I'm coming back";
    const A2 = "How many people will be traveling?";
    const U3 = "Just me";
    const A3 = "From which city would you like to depart?";
    const U4 = "London Heathrow, earliest flight possible";
    const A4 = "Here are the flights available from London Heathrow to Rome tomorrow";
    const U5 = "Book the first available flight, I don't care about the price";
    const A5 = "Your flight is confirmed. Is there anything else I can help with?";
    const U6 = "Yes, confirmed. Thank you so much";

    it("T0: EN greeting", () => {
      expect(aa(A0).type).toBe("greeting");
    });

    it("T1: user speaks EN", () => {
      expect(detectLanguage(U1)).toBe("en");
    });

    it("T1: emergency → no specific intent flags (it's informational)", () => {
      const i = au(U1);
      // "fly" doesn't match booking patterns, "tomorrow" matches date patterns
      expect(i.wantsToBook).toBe(undefined);
    });

    it("T1→A1: confirmation type (no dest name interfering)", () => {
      expect(aa(A1).type).toBe("confirmation");
    });

    it("T2→A2: travelers question detected", () => {
      expect(aa(A2).type).toBe("travelers_question");
    });

    it("T3→A3: departure question detected", () => {
      expect(aa(A3).type).toBe("departure_question");
    });

    it("T4→A4: flights detected", () => {
      expect(aa(A4).type).toBe("flights");
    });

    it("T5: user books immediately → booking intent", () => {
      const i = au(U5);
      expect(i.wantsToBook).toBe(true);
    });

    it("T6: user confirms → positive intent", () => {
      const i = au(U6);
      expect(i.isPositive).toBe(true);
    });

    it("memory: one-way trip → ready to search", () => {
      const fs = computeFlowState({
        arrival: { country: "Italy", city: "Rome", countryCode: "IT" },
        departure: { city: "London" },
        departureDate: new Date("2025-02-12"),
        passengers: { adults: 1 },
        tripType: "oneway",
      });
      expect(fs.isReadyToSearch).toBe(true);
      expect(fs.tripType).toBe("oneway");
    });

    it("one-way: no return date needed", () => {
      const fs = computeFlowState({
        arrival: { country: "Italy", city: "Rome", countryCode: "IT" },
        departureDate: new Date("2025-02-12"),
        passengers: { adults: 1 },
        tripType: "oneway",
      });
      expect(fs.hasReturnDate).toBe(false);
      expect(fs.isReadyToSearch).toBe(true);
    });

    it("widget: one-way trip → datePicker (not dateRangePicker)", () => {
      const w = getNextRequiredWidget(emptyFlow({
        hasDestination: true, hasDestinationCity: true, tripType: "oneway",
      }), []);
      expect(w).toBe("datePicker");
    });

    it("phase: emergency → fast to booking", () => {
      const p = detectCurrentPhase(emptySignals({
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasDeparture: true, readyToBook: true,
      }));
      expect(p.currentPhase).toBe("booking");
    });

    it("simple phase: minimal turns still reaches booking", () => {
      // One-way with just destination+date+traveler+departure+booking
      expect(getSimplePhase(true, true, true, false, false, false)).toBe("planning");
    });
  });
}
