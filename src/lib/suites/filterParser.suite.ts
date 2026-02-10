/**
 * Filter Parser Test Suite
 * Tests parseFilters from natural language
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { parseFilters } from "@/components/planner/chat/services/filterParser";

export function registerFilterParserTests() {
  setCategory("filterParser");

  describe("parseFilters - target detection", () => {
    it("detects flights target", () => {
      const result = parseFilters("Je veux un vol direct");
      expect(result.target).toBe("flights");
    });

    it("detects hotels target", () => {
      const result = parseFilters("Un hôtel 4 étoiles");
      expect(result.target).toBe("hotels");
    });

    it("detects activities target", () => {
      const result = parseFilters("Activités culturelles le matin");
      expect(result.target).toBe("activities");
    });

    it("defaults to 'all' when no target", () => {
      const result = parseFilters("Moins de 100€");
      expect(result.target).toBe("all");
    });
  });

  describe("parseFilters - price parsing", () => {
    it("parses 'moins de 200€' as max price", () => {
      const result = parseFilters("Vol moins de 200€");
      expect(result.flights?.price?.type).toBe("max");
      expect(result.flights?.price?.value).toBe(200);
    });

    it("parses 'entre 100 et 300€' as range", () => {
      const result = parseFilters("Hôtel entre 100 et 300€");
      expect(result.hotels?.price?.type).toBe("range");
      expect(result.hotels?.price?.min).toBe(100);
      expect(result.hotels?.price?.max).toBe(300);
    });

    it("parses '500€' as exact", () => {
      const result = parseFilters("Activité environ 500€");
      expect(result.activities?.price?.type).toBe("exact");
    });

    it("detects per-person pricing", () => {
      const result = parseFilters("Moins de 200€ par personne pour le vol");
      expect(result.flights?.price?.perPerson).toBe(true);
    });
  });

  describe("parseFilters - flight filters", () => {
    it("parses direct flight request", () => {
      const result = parseFilters("Vol direct sans escale");
      expect(result.flights?.stops?.type).toBe("direct");
    });

    it("parses business class", () => {
      const result = parseFilters("Vol en business class");
      expect(result.flights?.cabinClass).toBe("business");
    });

    it("parses first class", () => {
      const result = parseFilters("Vol en première classe");
      expect(result.flights?.cabinClass).toBe("first");
    });

    it("parses morning departure", () => {
      const result = parseFilters("Vol départ le matin");
      expect(result.flights?.departureTime?.type).toBe("morning");
    });

    it("parses max duration", () => {
      const result = parseFilters("Vol moins de 4h");
      expect(result.flights?.duration?.type).toBe("max");
      expect(result.flights?.duration?.value).toBe(4);
    });

    it("parses refundable preference", () => {
      const result = parseFilters("Vol remboursable");
      expect(result.flights?.flexibility?.refundable).toBe(true);
    });
  });

  describe("parseFilters - hotel filters", () => {
    it("parses star rating", () => {
      const result = parseFilters("Hôtel 4 étoiles");
      expect(result.hotels?.stars?.value).toBe(4);
    });

    it("parses centre-ville location", () => {
      const result = parseFilters("Hôtel en centre-ville");
      expect(result.hotels?.location?.type).toBe("in");
      expect(result.hotels?.location?.value).toBe("centre-ville");
    });

    it("parses breakfast inclusion", () => {
      const result = parseFilters("Hôtel avec petit-déjeuner");
      expect(result.hotels?.breakfast).toBe(true);
    });

    it("parses free cancellation", () => {
      const result = parseFilters("Hôtel avec annulation gratuite");
      expect(result.hotels?.freeCancellation).toBe(true);
    });

    it("parses amenity (piscine)", () => {
      const result = parseFilters("Hôtel avec piscine");
      expect(result.hotels?.amenities?.include).toContain("pool");
    });

    it("parses amenity exclusion (pas de wifi)", () => {
      const result = parseFilters("Hôtel sans wifi");
      expect(result.hotels?.amenities?.exclude).toContain("wifi");
    });
  });

  describe("parseFilters - activity filters", () => {
    it("parses morning time", () => {
      const result = parseFilters("Activité le matin");
      expect(result.activities?.time?.type).toBe("morning");
    });

    it("parses afternoon time", () => {
      const result = parseFilters("Activité l'après-midi");
      expect(result.activities?.time?.type).toBe("afternoon");
    });

    it("parses culture category", () => {
      const result = parseFilters("Visite culturelle au musée");
      expect(result.activities?.categories).toContain("culture");
    });

    it("parses nature category", () => {
      const result = parseFilters("Excursion randonnée en montagne");
      expect(result.activities?.categories).toContain("nature");
    });
  });

  describe("parseFilters - confidence", () => {
    it("returns confidence > 0 for valid filters", () => {
      const result = parseFilters("Vol direct moins de 300€");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("returns low confidence for vague input", () => {
      const result = parseFilters("quelque chose de bien");
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });
  });
}
