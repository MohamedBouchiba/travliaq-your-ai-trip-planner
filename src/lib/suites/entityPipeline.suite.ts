/**
 * Entity Pipeline Test Suite
 * Tests persistExtractedEntities logic
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { persistExtractedEntities } from "@/components/planner/chat/hooks/persistExtractedEntities";

export function registerEntityPipelineTests() {
  setCategory("entityPipeline");

  describe("persistExtractedEntities", () => {
    it("extracts tripDuration from intent entities", () => {
      let captured = "";
      const widgetFlow = {
        setPendingTripDuration: (d: string) => { captured = d; },
        setPendingPreferredMonth: () => {},
      };
      persistExtractedEntities({ tripDuration: "2 semaines" }, null, widgetFlow);
      expect(captured).toBe("2 semaines");
    });

    it("extracts preferredMonth from intent entities", () => {
      let captured = "";
      const widgetFlow = {
        setPendingTripDuration: () => {},
        setPendingPreferredMonth: (m: string) => { captured = m; },
      };
      persistExtractedEntities({ preferredMonth: "août" }, null, widgetFlow);
      expect(captured).toBe("août");
    });

    it("flightData takes priority over intent entities for tripDuration", () => {
      let captured = "";
      const widgetFlow = {
        setPendingTripDuration: (d: string) => { captured = d; },
        setPendingPreferredMonth: () => {},
      };
      persistExtractedEntities(
        { tripDuration: "1 week" },
        { tripDuration: "10 days" },
        widgetFlow
      );
      expect(captured).toBe("10 days");
    });

    it("persists multi-destination legs via updateMemory", () => {
      let memUpdate: Record<string, unknown> = {};
      const widgetFlow = {
        setPendingTripDuration: () => {},
        setPendingPreferredMonth: () => {},
      };
      persistExtractedEntities(
        undefined,
        { legs: [{ from: "A", to: "B" }, { from: "B", to: "C" }] },
        widgetFlow,
        (partial) => { memUpdate = partial; }
      );
      expect(memUpdate.tripType).toBe("multi");
      expect((memUpdate.legs as unknown[]).length).toBe(2);
    });

    it("does nothing with empty inputs", () => {
      let tripDurationCalled = false;
      let monthCalled = false;
      const widgetFlow = {
        setPendingTripDuration: () => { tripDurationCalled = true; },
        setPendingPreferredMonth: () => { monthCalled = true; },
      };
      persistExtractedEntities(undefined, null, widgetFlow);
      expect(tripDurationCalled).toBe(false);
      expect(monthCalled).toBe(false);
    });

    it("ignores non-string tripDuration", () => {
      let tripDurationCalled = false;
      const widgetFlow = {
        setPendingTripDuration: () => { tripDurationCalled = true; },
        setPendingPreferredMonth: () => {},
      };
      persistExtractedEntities({ tripDuration: 42 }, null, widgetFlow);
      expect(tripDurationCalled).toBe(false);
    });
  });
}
