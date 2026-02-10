/**
 * Flight Memory Test Suite
 * Tests flightDataToMemory conversion logic
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { flightDataToMemory } from "@/components/planner/chat/utils/flightDataToMemory";

export function registerFlightMemoryTests() {
  setCategory("flightMemory");

  describe("flightDataToMemory", () => {
    it("converts basic from/to", () => {
      const result = flightDataToMemory({ from: "Paris", to: "Tokyo" });
      expect(result.departure?.city).toBe("Paris");
      expect(result.arrival?.city).toBe("Tokyo");
    });

    it("converts departure and return dates", () => {
      const result = flightDataToMemory({
        departureDate: "2025-08-01",
        returnDate: "2025-08-15",
      });
      expect(result.departureDate).toBeInstanceOf(Date);
      expect(result.returnDate).toBeInstanceOf(Date);
    });

    it("converts passengers from new format (adults/children/infants)", () => {
      const result = flightDataToMemory({ adults: 2, children: 1, infants: 0 });
      expect(result.passengers?.adults).toBe(2);
      expect(result.passengers?.children).toBe(1);
      expect(result.passengers?.infants).toBe(0);
    });

    it("converts passengers from legacy format", () => {
      const result = flightDataToMemory({ passengers: 3 });
      expect(result.passengers?.adults).toBe(3);
      expect(result.passengers?.children).toBe(0);
    });

    it("converts tripType", () => {
      const result = flightDataToMemory({ tripType: "oneway" });
      expect(result.tripType).toBe("oneway");
    });

    it("preserves existing airport info when cities match", () => {
      const currentMemory = {
        departure: { city: "Paris", iata: "CDG", name: "Charles de Gaulle" },
        arrival: null,
        departureDate: null,
        returnDate: null,
        passengers: { adults: 1, children: 0, infants: 0 },
        tripType: "roundtrip" as const,
        legs: [],
        cabinClass: "economy" as const,
        directOnly: false,
        flexibleDates: false,
      };
      const result = flightDataToMemory({ from: "Paris" }, currentMemory);
      expect(result.departure?.iata).toBe("CDG");
    });

    it("overwrites airport info when cities differ", () => {
      const currentMemory = {
        departure: { city: "Paris", iata: "CDG", name: "Charles de Gaulle" },
        arrival: null,
        departureDate: null,
        returnDate: null,
        passengers: { adults: 1, children: 0, infants: 0 },
        tripType: "roundtrip" as const,
        legs: [],
        cabinClass: "economy" as const,
        directOnly: false,
        flexibleDates: false,
      };
      const result = flightDataToMemory({ from: "London" }, currentMemory);
      expect(result.departure?.city).toBe("London");
      expect(result.departure?.iata).toBeUndefined();
    });

    it("handles multi-destination legs", () => {
      const result = flightDataToMemory({
        tripType: "multi",
        legs: [
          { from: "Brussels", to: "Istanbul" },
          { from: "Istanbul", to: "Doha" },
          { from: "Doha", to: "Muscat" },
        ],
      });
      expect(result.legs).toHaveLength(3);
      expect(result.legs![0].departure?.city).toBe("Brussels");
      expect(result.legs![2].arrival?.city).toBe("Muscat");
    });

    it("returns empty object when no data provided", () => {
      const result = flightDataToMemory({});
      expect(result.departure).toBeUndefined();
      expect(result.arrival).toBeUndefined();
      expect(result.departureDate).toBeUndefined();
      expect(result.passengers).toBeUndefined();
    });
  });
}
