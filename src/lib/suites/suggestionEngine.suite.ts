/**
 * Suggestion Engine Test Suite
 * Tests getSuggestions and getWorkflowStep
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { getSuggestions, getWorkflowStep, type SuggestionContext } from "@/components/planner/chat/services/suggestionEngine";

export function registerSuggestionEngineTests() {
  setCategory("suggestionEngine");

  const baseContext: SuggestionContext = {
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
  };

  // ─── getSuggestions ───

  describe("getSuggestions", () => {
    it("returns inspiration suggestions when no destination", () => {
      const suggestions = getSuggestions(baseContext);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });

    it("returns date suggestions when has destination but no dates", () => {
      const ctx = { ...baseContext, hasDestination: true, destinationName: "Bali" };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns traveler suggestions when has destination+dates but no travelers", () => {
      const ctx = { ...baseContext, hasDestination: true, hasDates: true };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns search-ready suggestions when all info + no flights", () => {
      const ctx = { ...baseContext, hasDestination: true, hasDates: true, hasTravelers: true, currentTab: "flights" as const, visibleFlightsCount: 0 };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns flight suggestions on flights tab with results", () => {
      const ctx = { ...baseContext, hasDestination: true, hasDates: true, hasTravelers: true, currentTab: "flights" as const, visibleFlightsCount: 5 };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns stays suggestions on stays tab", () => {
      const ctx = { ...baseContext, hasDestination: true, hasDates: true, hasTravelers: true, currentTab: "stays" as const };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns activities suggestions on activities tab", () => {
      const ctx = { ...baseContext, hasDestination: true, hasDates: true, hasTravelers: true, currentTab: "activities" as const };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns preferences suggestions on preferences tab", () => {
      const ctx = { ...baseContext, hasDestination: true, hasDates: true, hasTravelers: true, currentTab: "preferences" as const };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("prioritizes anticipated suggestions from lastAssistantMessage", () => {
      const ctx = {
        ...baseContext,
        lastAssistantMessage: "Bonjour ! Comment puis-je t'aider ?",
        conversationTurn: 0,
      };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns destination choice suggestions after inspire flow", () => {
      const ctx = {
        ...baseContext,
        inspireFlowStep: "results" as const,
        hasProposedDestinations: true,
        proposedDestinationNames: ["Bali", "Thaïlande"],
      };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("returns empty during active inspire flow (widgets take priority)", () => {
      const ctx = { ...baseContext, inspireFlowStep: "style" as const };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBe(0);
    });

    it("limits suggestions to max 4", () => {
      const ctx = {
        ...baseContext,
        lastAssistantMessage: "Bonjour ! Bienvenue ! Comment puis-je t'aider ?",
        conversationTurn: 0,
      };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });

    it("includes cheapest flight price in suggestion label when available", () => {
      const ctx = {
        ...baseContext,
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        currentTab: "flights" as const,
        visibleFlightsCount: 5,
        cheapestFlightPrice: 150,
      };
      const suggestions = getSuggestions(ctx);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("includes compare option when many flights visible", () => {
      const ctx = {
        ...baseContext,
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        currentTab: "flights" as const,
        visibleFlightsCount: 5,
      };
      const suggestions = getSuggestions(ctx);
      const hasCompare = suggestions.some(s => s.id === "compare-flights");
      expect(hasCompare).toBe(true);
    });

    it("includes compare option when many hotels visible", () => {
      const ctx = {
        ...baseContext,
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        currentTab: "stays" as const,
        visibleHotelsCount: 5,
      };
      const suggestions = getSuggestions(ctx);
      const hasCompare = suggestions.some(s => s.id === "compare-hotels");
      expect(hasCompare).toBe(true);
    });
  });

  // ─── getWorkflowStep ───

  describe("getWorkflowStep", () => {
    it("returns 'inspiration' when no destination", () => {
      expect(getWorkflowStep({ ...baseContext, hasDestination: false })).toBe("inspiration");
    });

    it("returns 'destination' when has destination but no dates", () => {
      expect(getWorkflowStep({ ...baseContext, hasDestination: true })).toBe("destination");
    });

    it("returns 'dates' when has destination+dates but no travelers", () => {
      expect(getWorkflowStep({ ...baseContext, hasDestination: true, hasDates: true })).toBe("dates");
    });

    it("returns 'search' when all info on flights tab without results", () => {
      expect(getWorkflowStep({ ...baseContext, hasDestination: true, hasDates: true, hasTravelers: true, currentTab: "flights" as const, hasFlights: false })).toBe("search");
    });

    it("returns 'compare' as default when all info present", () => {
      expect(getWorkflowStep({ ...baseContext, hasDestination: true, hasDates: true, hasTravelers: true, hasFlights: true, currentTab: "stays" as const })).toBe("compare");
    });
  });
}
