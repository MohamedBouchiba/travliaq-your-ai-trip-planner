/**
 * Message Analyzer Test Suite
 * Tests analyzeLastAssistantMessage, analyzeUserIntent, detectLanguage, getAnticipatedSuggestions
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import {
  analyzeLastAssistantMessage,
  analyzeUserIntent,
  detectLanguage,
  getAnticipatedSuggestions,
} from "@/components/planner/chat/services/messageAnalyzer";

export function registerMessageAnalyzerTests() {
  setCategory("messageAnalyzer");

  // ─── analyzeLastAssistantMessage ───

  describe("analyzeLastAssistantMessage", () => {
    it("returns unknown for empty input", () => {
      expect(analyzeLastAssistantMessage(undefined).type).toBe("unknown");
      expect(analyzeLastAssistantMessage("").type).toBe("unknown");
    });

    it("detects greeting (FR)", () => {
      expect(analyzeLastAssistantMessage("Bonjour ! Comment puis-je t'aider ?").type).toBe("greeting");
    });

    it("detects greeting (EN)", () => {
      expect(analyzeLastAssistantMessage("Hello! How can I help you?").type).toBe("greeting");
    });

    it("detects destination proposals (FR)", () => {
      const result = analyzeLastAssistantMessage("Voici 3 destinations parfaites pour toi : Thaïlande, Bali, Vietnam");
      expect(result.type).toBe("destinations");
      expect(result.items!.length).toBeGreaterThan(0);
    });

    it("detects destination proposals (EN)", () => {
      const result = analyzeLastAssistantMessage("Here are 3 destinations perfect for you: Thailand, Bali, Vietnam");
      expect(result.type).toBe("destinations");
    });

    it("detects dates question (FR)", () => {
      expect(analyzeLastAssistantMessage("Quand souhaitez-vous partir ?").type).toBe("dates_question");
    });

    it("detects dates question (EN)", () => {
      expect(analyzeLastAssistantMessage("When would you like to travel?").type).toBe("dates_question");
    });

    it("detects travelers question (FR)", () => {
      expect(analyzeLastAssistantMessage("Combien serez-vous ?").type).toBe("travelers_question");
    });

    it("detects travelers question (EN)", () => {
      expect(analyzeLastAssistantMessage("How many people will be traveling?").type).toBe("travelers_question");
    });

    it("detects budget question (FR)", () => {
      expect(analyzeLastAssistantMessage("Quel est ton budget ?").type).toBe("budget_question");
    });

    it("detects budget question (EN)", () => {
      expect(analyzeLastAssistantMessage("What's your budget?").type).toBe("budget_question");
    });

    it("detects flights proposals (FR)", () => {
      expect(analyzeLastAssistantMessage("Voici les vols disponibles pour Bangkok").type).toBe("flights");
    });

    it("detects flights proposals (EN)", () => {
      expect(analyzeLastAssistantMessage("Here are the flights available for Bangkok").type).toBe("flights");
    });

    it("detects hotels proposals (FR)", () => {
      expect(analyzeLastAssistantMessage("Voici les hôtels recommandés").type).toBe("hotels");
    });

    it("detects hotels proposals (EN)", () => {
      expect(analyzeLastAssistantMessage("Here are the hotels available").type).toBe("hotels");
    });

    it("detects activities proposals (FR)", () => {
      expect(analyzeLastAssistantMessage("Voici les activités à ne pas manquer").type).toBe("activities");
    });

    it("detects activities proposals (EN)", () => {
      expect(analyzeLastAssistantMessage("Here are the activities not to miss").type).toBe("activities");
    });

    it("detects confirmation (FR)", () => {
      expect(analyzeLastAssistantMessage("C'est noté ! Excellent choix.").type).toBe("confirmation");
    });

    it("detects confirmation (EN)", () => {
      expect(analyzeLastAssistantMessage("Got it! Excellent choice.").type).toBe("confirmation");
    });

    it("detects departure question (FR)", () => {
      expect(analyzeLastAssistantMessage("Depuis quelle ville souhaitez-vous partir ?").type).toBe("departure_question");
    });

    it("detects departure question (EN)", () => {
      expect(analyzeLastAssistantMessage("From which city would you like to depart?").type).toBe("departure_question");
    });

    it("detects destination info (FR)", () => {
      expect(analyzeLastAssistantMessage("Le climat est parfait en novembre pour cette région").type).toBe("destination_info");
    });

    it("detects next steps (FR)", () => {
      expect(analyzeLastAssistantMessage("Voici ce qu'il reste à préciser").type).toBe("next_steps");
    });

    it("detects open question via trailing ?", () => {
      expect(analyzeLastAssistantMessage("Préfères-tu la montagne ou la plage ?").type).toBe("open_question");
    });

    it("extracts destination names from text", () => {
      const result = analyzeLastAssistantMessage("Je te propose Bali, le Japon et le Portugal");
      expect(result.items).toBeDefined();
      expect(result.items!.length).toBeGreaterThanOrEqual(2);
    });

    it("sets isAskingForChoice when multiple destinations", () => {
      const result = analyzeLastAssistantMessage("Voici 3 destinations : Bali, Vietnam, Thailand. Que penses-tu ?");
      expect(result.isAskingForChoice).toBe(true);
    });
  });

  // ─── analyzeUserIntent ───

  describe("analyzeUserIntent", () => {
    it("returns empty for undefined", () => {
      const intent = analyzeUserIntent(undefined);
      expect(Object.keys(intent).length).toBe(0);
    });

    it("detects budget intent (FR)", () => {
      expect(analyzeUserIntent("Mon budget est de 500€").wantsBudgetInfo).toBe(true);
    });

    it("detects budget intent (EN)", () => {
      expect(analyzeUserIntent("My budget is $1000").wantsBudgetInfo).toBe(true);
    });

    it("extracts budget amount", () => {
      expect(analyzeUserIntent("Je veux dépenser 800 euros").mentionedBudget).toBe("800");
    });

    it("detects date intent (FR)", () => {
      expect(analyzeUserIntent("Je veux partir ce weekend").wantsDateInfo).toBe(true);
    });

    it("detects date intent (EN)", () => {
      expect(analyzeUserIntent("I want to go next week").wantsDateInfo).toBe(true);
    });

    it("detects comparison intent (FR)", () => {
      expect(analyzeUserIntent("Compare ces deux options").wantsComparison).toBe(true);
    });

    it("detects comparison intent (EN)", () => {
      expect(analyzeUserIntent("Compare these two options").wantsComparison).toBe(true);
    });

    it("detects more options intent (FR)", () => {
      expect(analyzeUserIntent("Montre-moi d'autres alternatives").wantsMoreOptions).toBe(true);
    });

    it("detects more options intent (EN)", () => {
      expect(analyzeUserIntent("Show me other options").wantsMoreOptions).toBe(true);
    });

    it("detects booking intent (FR)", () => {
      expect(analyzeUserIntent("Je réserve ce vol").wantsToBook).toBe(true);
    });

    it("detects booking intent (EN)", () => {
      expect(analyzeUserIntent("I'll book this flight").wantsToBook).toBe(true);
    });

    it("detects positive sentiment (FR)", () => {
      expect(analyzeUserIntent("Super, c'est parfait !").isPositive).toBe(true);
    });

    it("detects positive sentiment (EN)", () => {
      expect(analyzeUserIntent("Great, sounds good!").isPositive).toBe(true);
    });

    it("detects negative sentiment (FR)", () => {
      expect(analyzeUserIntent("Non, pas vraiment intéressé").isNegative).toBe(true);
    });

    it("detects negative sentiment (EN)", () => {
      expect(analyzeUserIntent("No, not really interested").isNegative).toBe(true);
    });

    it("detects undecided sentiment (FR)", () => {
      expect(analyzeUserIntent("Je ne suis pas sûr, j'hésite").isUndecided).toBe(true);
    });

    it("detects undecided sentiment (EN)", () => {
      expect(analyzeUserIntent("I'm not sure, maybe later").isUndecided).toBe(true);
    });
  });

  // ─── detectLanguage ───

  describe("detectLanguage", () => {
    it("detects French text", () => {
      expect(detectLanguage("Je veux partir en vacances")).toBe("fr");
    });

    it("detects English text", () => {
      expect(detectLanguage("I want to go on vacation")).toBe("en");
    });

    it("handles empty string gracefully", () => {
      const result = detectLanguage("");
      expect(["fr", "en"]).toContain(result);
    });

    it("handles undefined gracefully", () => {
      const result = detectLanguage(undefined);
      expect(["fr", "en"]).toContain(result);
    });

    it("detects FR with accented words", () => {
      expect(detectLanguage("Je préfère les hôtels avec vue sur la mer")).toBe("fr");
    });

    it("detects EN with clear markers", () => {
      expect(detectLanguage("I would like to travel with my family")).toBe("en");
    });
  });

  // ─── getAnticipatedSuggestions ───

  describe("getAnticipatedSuggestions", () => {
    it("returns greeting suggestions for greeting content", () => {
      const content = { type: "greeting" as const };
      const suggestions = getAnticipatedSuggestions(content, {}, 0, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].emoji).toBeDefined();
    });

    it("returns date suggestions for dates_question", () => {
      const content = { type: "dates_question" as const, questionTopic: "dates" };
      const suggestions = getAnticipatedSuggestions(content, {}, 1, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns traveler suggestions for travelers_question", () => {
      const content = { type: "travelers_question" as const, questionTopic: "travelers" };
      const suggestions = getAnticipatedSuggestions(content, {}, 2, "fr");
      expect(suggestions.length).toBeGreaterThanOrEqual(3);
    });

    it("returns budget suggestions for budget_question", () => {
      const content = { type: "budget_question" as const, questionTopic: "budget" };
      const suggestions = getAnticipatedSuggestions(content, {}, 3, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns flight suggestions for flights content", () => {
      const content = { type: "flights" as const, isAskingForChoice: true };
      const suggestions = getAnticipatedSuggestions(content, {}, 5, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns hotel suggestions for hotels content", () => {
      const content = { type: "hotels" as const, isAskingForChoice: true };
      const suggestions = getAnticipatedSuggestions(content, {}, 5, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns EN suggestions when lang is en", () => {
      const content = { type: "greeting" as const };
      const suggestions = getAnticipatedSuggestions(content, {}, 0, "en");
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].label).toMatch(/inspire|sunny|city|adventure/i);
    });

    it("returns destination choices when destinations proposed", () => {
      const content = { type: "destinations" as const, items: ["Bali", "Thailand"] };
      const suggestions = getAnticipatedSuggestions(content, {}, 3, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns confirmation suggestions for confirmation content", () => {
      const content = { type: "confirmation" as const };
      const suggestions = getAnticipatedSuggestions(content, {}, 4, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns open question suggestions for open_question", () => {
      const content = { type: "open_question" as const };
      const suggestions = getAnticipatedSuggestions(content, {}, 2, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns empty for unknown at turn > 0", () => {
      const content = { type: "unknown" as const };
      const suggestions = getAnticipatedSuggestions(content, {}, 3, "fr");
      expect(suggestions.length).toBe(0);
    });

    it("returns default_start for unknown at turn 0", () => {
      const content = { type: "unknown" as const };
      const suggestions = getAnticipatedSuggestions(content, {}, 0, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns departure suggestions for departure_question", () => {
      const content = { type: "departure_question" as const, questionTopic: "departure_city" };
      const suggestions = getAnticipatedSuggestions(content, {}, 3, "fr");
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
}
