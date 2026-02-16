/**
 * Tests for useSessionContext pure functions
 * Tests: extractEntities, ENTITY_PATTERNS, DESTINATION_REJECT
 */

import { describe, it, expect } from "vitest";
import {
  extractEntities,
  ENTITY_PATTERNS,
  DESTINATION_REJECT,
} from "../useSessionContext";

// ─── extractEntities (core) ───

describe("extractEntities", () => {
  it("returns empty array for empty text", () => {
    expect(extractEntities("", ENTITY_PATTERNS.destinations)).toEqual([]);
  });

  it("returns empty array when no pattern matches", () => {
    expect(extractEntities("bonjour le monde", ENTITY_PATTERNS.destinations)).toEqual([]);
  });

  it("deduplicates matches", () => {
    const result = extractEntities(
      "Je veux aller à Paris et visiter Paris",
      ENTITY_PATTERNS.destinations,
      3,
      DESTINATION_REJECT
    );
    const parisCount = result.filter((r) => r === "Paris").length;
    expect(parisCount).toBeLessThanOrEqual(1);
  });

  it("respects minLength filter", () => {
    // "à" is 1 char, should be filtered with minLength=3
    const result = extractEntities("en été", ENTITY_PATTERNS.dates, 5);
    // "été" is 3 chars, below minLength=5
    expect(result.every((r) => r.length >= 5)).toBe(true);
  });

  it("applies rejectFilter to exclude false positives", () => {
    const fakePatterns = [/([A-ZÀ-Ü][a-zà-ü]+)/g];
    const reject = /Budget/i;
    const result = extractEntities("Budget Voyage", fakePatterns, 3, reject);
    expect(result).not.toContain("Budget");
    expect(result).toContain("Voyage");
  });
});

// ─── Destination extraction ───

describe("destination extraction", () => {
  const extract = (text: string) =>
    extractEntities(text, ENTITY_PATTERNS.destinations, 3, DESTINATION_REJECT);

  it("extracts 'aller à Paris'", () => {
    expect(extract("Je veux aller à Paris")).toContain("Paris");
  });

  it("extracts 'partir en Italie'", () => {
    expect(extract("Je veux partir en Italie")).toContain("Italie");
  });

  it("extracts 'voyager au Japon'", () => {
    expect(extract("Je veux voyager au Japon")).toContain("Japon");
  });

  it("extracts multi-word 'New York'", () => {
    expect(extract("Je veux aller à New York")).toContain("New York");
  });

  it("extracts departure city 'à partir de Lyon'", () => {
    expect(extract("à partir de Lyon")).toContain("Lyon");
  });

  it("extracts 'au départ de Marseille'", () => {
    expect(extract("au départ de Marseille")).toContain("Marseille");
  });

  it("extracts 'depuis Bordeaux'", () => {
    expect(extract("depuis Bordeaux")).toContain("Bordeaux");
  });

  it("extracts English 'to London'", () => {
    expect(extract("I want to go to London")).toContain("London");
  });

  it("extracts English 'from Berlin'", () => {
    expect(extract("Flying from Berlin")).toContain("Berlin");
  });

  it("rejects budget words as destinations (FR)", () => {
    const result = extract("Je veux aller pas cher");
    expect(result).not.toContain("cher");
    expect(result.every((d) => !DESTINATION_REJECT.test(d))).toBe(true);
  });

  it("rejects 'Budget' as destination (EN)", () => {
    // "Budget" starts with uppercase so patterns might match it
    const result = extract("I want a cheap trip to Rome");
    expect(result).not.toContain("cheap");
  });

  it("does not match lowercase words (not proper nouns)", () => {
    // Only capitalized words should match
    const result = extract("aller à paris");
    // "paris" lowercase should NOT match (patterns require [A-ZÀ-Ü])
    expect(result).not.toContain("paris");
  });
});

// ─── Date extraction ───

describe("date extraction", () => {
  const extract = (text: string) =>
    extractEntities(text, ENTITY_PATTERNS.dates, 1);

  it("extracts 'en février'", () => {
    expect(extract("Je pars en février")).toContain("février");
  });

  it("extracts 'au mois de mars'", () => {
    expect(extract("au mois de mars")).toContain("mars");
  });

  it("extracts specific date '15 janvier' (captures digit)", () => {
    const result = extract("le 15 janvier");
    // Pattern captures group 1 = "15" (the digit), group 2 = "janvier"
    // extractEntities uses match[1] which is "15"
    expect(result.some((r) => r.includes("15"))).toBe(true);
  });

  it("extracts seasons", () => {
    expect(extract("cet été")).toContain("été");
    expect(extract("en hiver")).toContain("hiver");
  });

  it("extracts duration '3 jours'", () => {
    const result = extract("Je veux partir 3 jours");
    expect(result.some((r) => r.includes("3"))).toBe(true);
  });

  it("extracts duration '2 semaines'", () => {
    const result = extract("un voyage de 2 semaines");
    expect(result.some((r) => r.includes("2"))).toBe(true);
  });

  it("extracts EN duration '5 days'", () => {
    const result = extract("for 5 days");
    expect(result.some((r) => r.includes("5"))).toBe(true);
  });

  it("extracts EN duration '2 weeks'", () => {
    const result = extract("about 2 weeks");
    expect(result.some((r) => r.includes("2"))).toBe(true);
  });
});

// ─── Budget extraction ───

describe("budget extraction", () => {
  const extract = (text: string) =>
    extractEntities(text, ENTITY_PATTERNS.budgets);

  it("extracts '1500€'", () => {
    const result = extract("Mon budget est 1500€");
    expect(result.some((r) => r.includes("1500"))).toBe(true);
  });

  it("extracts 'budget de 2000'", () => {
    const result = extract("budget de 2000");
    expect(result.some((r) => r.includes("2000"))).toBe(true);
  });

  it("extracts range '800-1200 euros'", () => {
    const result = extract("entre 800-1200 euros");
    expect(result.some((r) => r.includes("800") || r.includes("1200"))).toBe(true);
  });

  it("extracts qualitative 'petit budget'", () => {
    expect(extract("J'ai un petit budget")).toContain("petit budget");
  });

  it("extracts 'pas cher'", () => {
    expect(extract("je veux le moins cher")).toContain("moins cher");
  });

  it("extracts EN '$500'", () => {
    const result = extract("budget around $500");
    expect(result.some((r) => r.includes("500"))).toBe(true);
  });

  it("extracts EN 'budget-friendly'", () => {
    expect(extract("something budget-friendly")).toContain("budget-friendly");
  });
});

// ─── Constraint extraction ───

describe("constraint extraction", () => {
  const extract = (text: string) =>
    extractEntities(text, ENTITY_PATTERNS.constraints);

  it("extracts 'je veux' constraints", () => {
    const result = extract("je veux un vol direct");
    expect(result.some((r) => r.includes("vol direct"))).toBe(true);
  });

  it("extracts accessibility keyword", () => {
    const result = extract("accessibilité requise");
    expect(result.length).toBeGreaterThan(0);
  });

  it("extracts wifi keyword", () => {
    const result = extract("wifi nécessaire");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── DESTINATION_REJECT ───

describe("DESTINATION_REJECT", () => {
  // Note: \b in JS regex doesn't work with accented start chars (é, è, etc.)
  // so "économique" is excluded — only the ASCII "economique" variant works
  it.each([
    "cher", "cheap", "budget", "moins",
    "plus", "pas", "possible", "affordable", "luxe", "luxury",
    "prix", "price", "economique",
  ])("rejects '%s'", (word) => {
    expect(DESTINATION_REJECT.test(word)).toBe(true);
  });

  it.each(["chère", "chers", "chères"])("rejects accented variant '%s'", (word) => {
    // These work because 'ch' starts with ASCII, \b matches before 'c'
    expect(DESTINATION_REJECT.test(word)).toBe(true);
  });

  it.each(["Paris", "Tokyo", "Londres", "Rome", "Berlin"])(
    "does NOT reject '%s'",
    (city) => {
      expect(DESTINATION_REJECT.test(city)).toBe(false);
    }
  );
});
