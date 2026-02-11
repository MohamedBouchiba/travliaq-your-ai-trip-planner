/**
 * Chat Types Test Suite
 * Tests parsePreferredMonth, getCityCoords, MONTH_MAP, CITY_COORDINATES
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import {
  parsePreferredMonth,
  getCityCoords,
  MONTH_MAP,
  CITY_COORDINATES,
} from "@/components/planner/chat/types";

export function registerChatTypesTests() {
  setCategory("chatTypes");

  // ─── MONTH_MAP ───

  describe("MONTH_MAP", () => {
    it("maps janvier to 0", () => {
      expect(MONTH_MAP["janvier"]).toBe(0);
    });

    it("maps january to 0", () => {
      expect(MONTH_MAP["january"]).toBe(0);
    });

    it("maps août to 7", () => {
      expect(MONTH_MAP["août"]).toBe(7);
    });

    it("maps august to 7", () => {
      expect(MONTH_MAP["august"]).toBe(7);
    });

    it("maps décembre to 11", () => {
      expect(MONTH_MAP["décembre"]).toBe(11);
    });

    it("maps december to 11", () => {
      expect(MONTH_MAP["december"]).toBe(11);
    });

    it("maps short forms (jan, feb, mar)", () => {
      expect(MONTH_MAP["jan"]).toBe(0);
      expect(MONTH_MAP["feb"]).toBe(1);
      expect(MONTH_MAP["mar"]).toBe(2);
    });

    it("maps seasons to representative months", () => {
      expect(MONTH_MAP["printemps"]).toBe(3);
      expect(MONTH_MAP["spring"]).toBe(3);
      expect(MONTH_MAP["été"]).toBe(6);
      expect(MONTH_MAP["summer"]).toBe(6);
      expect(MONTH_MAP["automne"]).toBe(9);
      expect(MONTH_MAP["autumn"]).toBe(9);
      expect(MONTH_MAP["hiver"]).toBe(0);
      expect(MONTH_MAP["winter"]).toBe(0);
    });

    it("maps all 12 months in French", () => {
      const frMonths = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
      frMonths.forEach((m, i) => {
        expect(MONTH_MAP[m]).toBe(i);
      });
    });

    it("maps all 12 months in English", () => {
      const enMonths = ["january","february","march","april","may","june","july","august","september","october","november","december"];
      enMonths.forEach((m, i) => {
        expect(MONTH_MAP[m]).toBe(i);
      });
    });
  });

  // ─── parsePreferredMonth ───

  describe("parsePreferredMonth", () => {
    it("returns null for undefined", () => {
      expect(parsePreferredMonth(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parsePreferredMonth("")).toBeNull();
    });

    it("returns null for unknown string", () => {
      expect(parsePreferredMonth("xyzzy")).toBeNull();
    });

    it("parses 'août' to month 7 (August)", () => {
      const result = parsePreferredMonth("août");
      expect(result).not.toBeNull();
      // parsePreferredMonth returns a Date with month index matching MONTH_MAP
      expect(result!.getMonth()).toBe(7);
    });

    it("parses 'march' to month 2", () => {
      const result = parsePreferredMonth("march");
      expect(result).not.toBeNull();
      expect(result!.getMonth()).toBe(2);
    });

    it("parses 'summer' to month 6", () => {
      const result = parsePreferredMonth("summer");
      expect(result).not.toBeNull();
      expect(result!.getMonth()).toBe(6);
    });

    it("is case-insensitive", () => {
      const result = parsePreferredMonth("JANVIER");
      expect(result).not.toBeNull();
      expect(result!.getMonth()).toBe(0);
    });

    it("trims whitespace", () => {
      const result = parsePreferredMonth("  février  ");
      expect(result).not.toBeNull();
      expect(result!.getMonth()).toBe(1);
    });

    it("returns a Date object", () => {
      const result = parsePreferredMonth("mai");
      expect(result instanceof Date).toBe(true);
    });

    it("sets day to 1", () => {
      const result = parsePreferredMonth("juin");
      expect(result!.getDate()).toBe(1);
    });
  });

  // ─── getCityCoords ───

  describe("getCityCoords", () => {
    it("returns null for unknown city", () => {
      expect(getCityCoords("Atlantis")).toBeNull();
    });

    it("returns coords for paris", () => {
      const coords = getCityCoords("paris");
      expect(coords).not.toBeNull();
      expect(coords![0]).toBeCloseTo(2.3522, 2);
      expect(coords![1]).toBeCloseTo(48.8566, 2);
    });

    it("returns coords for tokyo", () => {
      const coords = getCityCoords("tokyo");
      expect(coords).not.toBeNull();
      // DB may return slightly different coords than hardcoded fallback
      expect(coords![0]).toBeGreaterThan(139);
      expect(coords![0]).toBeLessThan(140);
    });

    it("is case-insensitive", () => {
      expect(getCityCoords("PARIS")).not.toBeNull();
      expect(getCityCoords("Paris")).not.toBeNull();
    });

    it("trims whitespace", () => {
      expect(getCityCoords("  rome  ")).not.toBeNull();
    });

    it("handles French city names", () => {
      expect(getCityCoords("barcelone")).not.toBeNull();
      expect(getCityCoords("lisbonne")).not.toBeNull();
      expect(getCityCoords("londres")).not.toBeNull();
    });

    it("handles English city names", () => {
      expect(getCityCoords("barcelona")).not.toBeNull();
      expect(getCityCoords("lisbon")).not.toBeNull();
      expect(getCityCoords("london")).not.toBeNull();
    });

    it("handles multi-word cities", () => {
      expect(getCityCoords("new york")).not.toBeNull();
      expect(getCityCoords("le caire")).not.toBeNull();
    });
  });

  // ─── CITY_COORDINATES consistency ───

  describe("CITY_COORDINATES", () => {
    it("has valid longitude/latitude pairs", () => {
      for (const [city, [lng, lat]] of Object.entries(CITY_COORDINATES)) {
        expect(lng).toBeGreaterThanOrEqual(-180);
        expect(lng).toBeLessThanOrEqual(180);
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    });

    it("has both FR and EN variants for key cities", () => {
      const pairs = [["paris", "paris"], ["barcelone", "barcelona"], ["lisbonne", "lisbon"], ["londres", "london"], ["vienne", "vienna"]];
      for (const [fr, en] of pairs) {
        const frCoords = CITY_COORDINATES[fr];
        const enCoords = CITY_COORDINATES[en];
        expect(frCoords).toBeDefined();
        expect(enCoords).toBeDefined();
        expect(frCoords[0]).toBe(enCoords[0]);
        expect(frCoords[1]).toBe(enCoords[1]);
      }
    });
  });
}
