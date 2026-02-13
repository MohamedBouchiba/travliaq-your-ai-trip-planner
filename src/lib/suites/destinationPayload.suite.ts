/**
 * Destination Payload Test Suite
 * Tests buildDestinationPayload pure function
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { buildDestinationPayload } from "@/components/planner/chat/utils/buildDestinationPayload";

export function registerDestinationPayloadTests() {
  setCategory("destinationPayload");

  const defaultPrefs = {
    styleAxes: { chillVsIntense: 50, cityVsNature: 50, ecoVsLuxury: 50, touristVsLocal: 50 },
    interests: [],
    mustHaves: {},
    dietaryRestrictions: [],
  };

  describe("buildDestinationPayload", () => {
    it("returns correct structure with defaults", () => {
      const result = buildDestinationPayload({ preferences: defaultPrefs });
      expect(result.styleAxes.chillVsIntense).toBe(50);
      expect(result.styleAxes.cityVsNature).toBe(50);
      expect(result.budgetLevel).toBe("premium");
    });

    it("includes userLocation when departure provided", () => {
      const result = buildDestinationPayload({
        preferences: defaultPrefs,
        departure: { city: "Paris", country: "France" },
      });
      expect(result.userLocation?.city).toBe("Paris");
      expect(result.userLocation?.country).toBe("France");
    });

    it("excludes userLocation when no departure", () => {
      const result = buildDestinationPayload({ preferences: defaultPrefs });
      expect(result.userLocation).toBeUndefined();
    });

    it("maps ecoVsLuxury < 25 to budget", () => {
      const prefs = { ...defaultPrefs, styleAxes: { ...defaultPrefs.styleAxes, ecoVsLuxury: 10 } };
      const result = buildDestinationPayload({ preferences: prefs });
      expect(result.budgetLevel).toBe("budget");
    });

    it("maps ecoVsLuxury >= 75 to luxury", () => {
      const prefs = { ...defaultPrefs, styleAxes: { ...defaultPrefs.styleAxes, ecoVsLuxury: 80 } };
      const result = buildDestinationPayload({ preferences: prefs });
      expect(result.budgetLevel).toBe("luxury");
    });

    it("slices interests to max 5", () => {
      const prefs = {
        ...defaultPrefs,
        interests: ["a", "b", "c", "d", "e", "f", "g"],
      };
      const result = buildDestinationPayload({ preferences: prefs });
      expect(result.interests).toHaveLength(5);
    });

    it("includes dietary restrictions when present", () => {
      const prefs = { ...defaultPrefs, dietaryRestrictions: ["vegan", "gluten-free"] };
      const result = buildDestinationPayload({ preferences: prefs });
      expect(result.dietaryRestrictions).toHaveLength(2);
    });

    it("excludes dietary restrictions when empty", () => {
      const result = buildDestinationPayload({ preferences: defaultPrefs });
      expect(result.dietaryRestrictions).toBeUndefined();
    });

    it("computes travelMonth from departureDateMs", () => {
      // Use a date constructor that's timezone-safe
      const august = new Date(2025, 7, 1).getTime(); // month 7 = August (0-indexed)
      const result = buildDestinationPayload({
        preferences: defaultPrefs,
        departureDateMs: august,
      });
      expect(result.travelMonth).toBe(8);
    });

    it("includes mustHaves flags", () => {
      const prefs = {
        ...defaultPrefs,
        mustHaves: { petFriendly: true, familyFriendly: true },
      };
      const result = buildDestinationPayload({ preferences: prefs });
      expect(result.mustHaves.petFriendly).toBe(true);
      expect(result.mustHaves.familyFriendly).toBe(true);
      expect(result.mustHaves.accessibilityRequired).toBe(false);
    });

    it("includes styleAxesOrder when provided", () => {
      const prefs = {
        ...defaultPrefs,
        styleAxesOrder: ["ecoVsLuxury" as const, "chillVsIntense" as const, "cityVsNature" as const, "touristVsLocal" as const],
      };
      const result = buildDestinationPayload({ preferences: prefs });
      expect(result.styleAxesOrder).toEqual(["ecoVsLuxury", "chillVsIntense", "cityVsNature", "touristVsLocal"]);
    });

    it("excludes styleAxesOrder when not provided", () => {
      const result = buildDestinationPayload({ preferences: defaultPrefs });
      expect(result.styleAxesOrder).toBeUndefined();
    });
  });
}
