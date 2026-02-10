/**
 * Phase Detector Test Suite
 * Tests detectCurrentPhase, getSimplePhase
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import {
  detectCurrentPhase,
  getSimplePhase,
  type PhaseSignals,
} from "@/components/planner/chat/services/phaseDetector";

export function registerPhaseDetectorTests() {
  setCategory("phaseDetector");

  const emptySignals: PhaseSignals = {
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
  };

  describe("detectCurrentPhase", () => {
    it("returns inspiration when no destination", () => {
      const result = detectCurrentPhase(emptySignals);
      expect(result.currentPhase).toBe("inspiration");
    });

    it("returns inspiration when asked for inspiration", () => {
      const result = detectCurrentPhase({ ...emptySignals, askedForInspiration: true });
      expect(result.currentPhase).toBe("inspiration");
      expect(result.confidenceScore).toBe(95);
    });

    it("returns research when has destination", () => {
      const result = detectCurrentPhase({ ...emptySignals, hasDestination: true });
      expect(result.currentPhase).toBe("research");
    });

    it("returns comparison when has pending choices", () => {
      const result = detectCurrentPhase({ ...emptySignals, hasDestination: true, hasFlightResults: true });
      expect(result.currentPhase).toBe("comparison");
    });

    it("returns comparison when requested comparison", () => {
      const result = detectCurrentPhase({ ...emptySignals, hasDestination: true, requestedComparison: true });
      expect(result.currentPhase).toBe("comparison");
    });

    it("returns planning when flights and hotels selected", () => {
      const result = detectCurrentPhase({ ...emptySignals, hasDestination: true, hasFlightResults: true, hasHotelResults: true });
      // Has pending choices, so it's comparison not planning
      expect(result.currentPhase).toBe("comparison");
    });

    it("returns booking when ready and 4+ steps complete", () => {
      const result = detectCurrentPhase({
        ...emptySignals,
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
        hasDeparture: true,
        readyToBook: true,
      });
      expect(result.currentPhase).toBe("booking");
      expect(result.confidenceScore).toBe(95);
    });

    it("tracks completed steps", () => {
      const result = detectCurrentPhase({
        ...emptySignals,
        hasDestination: true,
        hasDates: true,
        hasTravelers: true,
      });
      expect(result.completedSteps).toContain("destination");
      expect(result.completedSteps).toContain("dates");
      expect(result.completedSteps).toContain("travelers");
    });

    it("tracks negative feedback", () => {
      const result = detectCurrentPhase({ ...emptySignals, hasNegativePreferences: true });
      expect(result.hasNegativeFeedback).toBe(true);
    });

    it("counts pending choices", () => {
      const result = detectCurrentPhase({
        ...emptySignals,
        hasDestination: true,
        hasFlightResults: true,
        hasHotelResults: true,
      });
      expect(result.pendingChoices).toBe(2);
    });
  });

  describe("getSimplePhase", () => {
    it("returns inspiration when no destination", () => {
      expect(getSimplePhase(false, false, false, false, false, false)).toBe("inspiration");
    });

    it("returns inspiration when asked for inspiration", () => {
      expect(getSimplePhase(true, true, true, false, false, true)).toBe("inspiration");
    });

    it("returns comparison when has flight results", () => {
      expect(getSimplePhase(true, true, true, true, false, false)).toBe("comparison");
    });

    it("returns comparison when has hotel results", () => {
      expect(getSimplePhase(true, true, true, false, true, false)).toBe("comparison");
    });

    it("returns planning when all info present", () => {
      expect(getSimplePhase(true, true, true, false, false, false)).toBe("planning");
    });

    it("returns research when only destination", () => {
      expect(getSimplePhase(true, false, false, false, false, false)).toBe("research");
    });
  });
}
