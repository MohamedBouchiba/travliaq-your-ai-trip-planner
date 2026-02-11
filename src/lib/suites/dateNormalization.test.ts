/**
 * Date Normalization Test Suite
 * 
 * Tests that extracted dates never use past years.
 * Validates the normalizeExtractedYear() safety net logic.
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// We test the pure date-fixing logic extracted from normalizeExtractedYears.
// The function is in supabase/functions (Deno), so we replicate the core algo
// here for unit-testability on the Vite/Vitest side.
// ============================================================================

/**
 * Replicated fixDate logic from index.ts normalizeExtractedYears.
 * Given a date string and a reference "today" string, returns the corrected date.
 */
function fixDate(dateStr: string | undefined, currentDate: string): string | undefined {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const today = new Date(currentDate + "T00:00:00Z");
  const currentYear = today.getFullYear();
  const parsed = new Date(dateStr + "T00:00:00Z");
  if (isNaN(parsed.getTime())) return dateStr;

  if (parsed.getFullYear() < currentYear) {
    const candidateThisYear = new Date(Date.UTC(currentYear, parsed.getMonth(), parsed.getDate()));
    if (candidateThisYear >= today) {
      return `${currentYear}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
    }
    return `${currentYear + 1}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return dateStr;
}

describe("dateNormalization", () => {
  // Simulate: current date is 2026-02-11

  it("Test 1: 'le 4 mai' sans année → 2026-05-04 (année courante)", () => {
    // LLM might output 2024-05-04 or 2025-05-04, should be fixed to 2026
    expect(fixDate("2024-05-04", "2026-02-11")).toBe("2026-05-04");
    expect(fixDate("2025-05-04", "2026-02-11")).toBe("2026-05-04");
  });

  it("Test 2: 'le 15 janvier' (mois passé en février 2026) → 2027-01-15", () => {
    // January 15 is already past if today is Feb 11 2026
    expect(fixDate("2024-01-15", "2026-02-11")).toBe("2027-01-15");
    expect(fixDate("2025-01-15", "2026-02-11")).toBe("2027-01-15");
  });

  it("Test 3: 'pour le 4/5 mai' → departureDate: 2026-05-04", () => {
    expect(fixDate("2024-05-04", "2026-02-11")).toBe("2026-05-04");
    // Return date 3 days later
    expect(fixDate("2024-05-07", "2026-02-11")).toBe("2026-05-07");
  });

  it("Test 4: Date explicite avec année future 2027 → garde 2027", () => {
    expect(fixDate("2027-05-04", "2026-02-11")).toBe("2027-05-04");
  });

  it("Test 5: Date dans l'année courante, pas encore passée → garde l'année courante", () => {
    expect(fixDate("2026-05-04", "2026-02-11")).toBe("2026-05-04");
    expect(fixDate("2026-12-25", "2026-02-11")).toBe("2026-12-25");
  });

  it("Test 6: Date dans l'année courante mais déjà passée → garde (year >= currentYear)", () => {
    // Feb 1 is past but year is current → we don't bump current-year dates
    // (only past-year dates get bumped)
    expect(fixDate("2026-02-01", "2026-02-11")).toBe("2026-02-01");
  });

  it("Test 7: Valeur undefined ou invalide → retournée telle quelle", () => {
    expect(fixDate(undefined, "2026-02-11")).toBeUndefined();
    expect(fixDate("not-a-date", "2026-02-11")).toBe("not-a-date");
    expect(fixDate("", "2026-02-11")).toBe("");
  });

  it("Test 8: Année très ancienne (2020) → corrigée vers année courante ou suivante", () => {
    expect(fixDate("2020-06-15", "2026-02-11")).toBe("2026-06-15");
    expect(fixDate("2020-01-05", "2026-02-11")).toBe("2027-01-05");
  });
});
