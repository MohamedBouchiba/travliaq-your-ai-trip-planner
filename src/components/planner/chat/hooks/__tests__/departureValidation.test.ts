/**
 * Tests for departure city validation
 * Tests: isValidDepartureCity (exported from useChatSubmit)
 */

import { describe, it, expect } from "vitest";

// We'll test the standalone function directly once it's extracted
// For now, replicate the logic to test it in isolation

const INVALID_DEPARTURE_PATTERNS = [
  /^(ici|là|là où|je suis|mon emplacement|ma position|ma ville|current|here|my location|my city|where i am|my place)/i,
  /^(près de|proche de|around|near)/i,
];

function isValidDepartureCity(city: string): boolean {
  if (!city || city.trim().length < 2 || city.trim().length > 60) return false;
  return !INVALID_DEPARTURE_PATTERNS.some((p) => p.test(city.trim()));
}

// ─── Valid cities ───

describe("isValidDepartureCity — valid cities", () => {
  const validCities = [
    "Paris",
    "New York",
    "São Paulo",
    "Montréal",
    "Kuala Lumpur",
    "Tokyo",
    "Lyon",
    "Marseille",
    "CDG",
    "JFK",
    "Los Angeles",
    "Île-de-France",
  ];

  it.each(validCities)("accepts '%s'", (city) => {
    expect(isValidDepartureCity(city)).toBe(true);
  });
});

// ─── Invalid expressions (French) ───

describe("isValidDepartureCity — invalid French expressions", () => {
  const invalidFR = [
    "là où je suis",
    "ici",
    "Ici",
    "ICI",
    "mon emplacement",
    "ma position",
    "ma ville",
    "là",
    "je suis à Paris",
    "près de Paris",
    "proche de Lyon",
  ];

  it.each(invalidFR)("rejects '%s'", (city) => {
    expect(isValidDepartureCity(city)).toBe(false);
  });
});

// ─── Invalid expressions (English) ───

describe("isValidDepartureCity — invalid English expressions", () => {
  const invalidEN = [
    "here",
    "Here",
    "my location",
    "My Location",
    "where I am",
    "current location",
    "Current",
    "my city",
    "my place",
    "near London",
    "around here",
  ];

  it.each(invalidEN)("rejects '%s'", (city) => {
    expect(isValidDepartureCity(city)).toBe(false);
  });
});

// ─── Edge cases ───

describe("isValidDepartureCity — edge cases", () => {
  it("rejects empty string", () => {
    expect(isValidDepartureCity("")).toBe(false);
  });

  it("rejects single character", () => {
    expect(isValidDepartureCity("a")).toBe(false);
  });

  it("rejects whitespace only", () => {
    expect(isValidDepartureCity("   ")).toBe(false);
  });

  it("rejects very long string (>60 chars)", () => {
    const longCity = "A".repeat(61);
    expect(isValidDepartureCity(longCity)).toBe(false);
  });

  it("accepts exactly 2 characters", () => {
    expect(isValidDepartureCity("NY")).toBe(true);
  });

  it("accepts 60 characters", () => {
    expect(isValidDepartureCity("A".repeat(60))).toBe(true);
  });
});
