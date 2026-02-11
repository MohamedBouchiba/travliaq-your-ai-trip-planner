/**
 * sessionEntities.suite.ts - Non-regression tests for entity extraction & debug store cleanup
 */

import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { useDebugStore } from "@/stores/debugStore";

// ─── Helpers ───

const ENTITY_PATTERNS = {
  destinations: [
    /(?:aller|partir|voyager|visiter)\s+(?:à|en|au|aux)?\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/gi,
    /([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)\s+(?:comme destination|m'intéresse)/gi,
    /à\s+partir\s+de\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/gi,
    /depuis\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/gi,
    /(?:to|from|in)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/gi,
  ],
  dates: [
    /(?:en|au mois de|pour)\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/gi,
    /(?:du|le)?\s*(\d{1,2})\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/gi,
    /(printemps|été|automne|hiver)/gi,
    /(\d+)\s*jours?/gi,
    /(\d+)\s*semaines?/gi,
    /(\d+)\s*nuits?/gi,
    /(\d+)\s*days?/gi,
    /(\d+)\s*weeks?/gi,
  ],
  budgets: [
    /(\d+(?:\s*[–-]\s*\d+)?)\s*(?:€|euros?|EUR)/gi,
    /budget\s+(?:de\s+)?(\d+(?:\s*[–-]\s*\d+)?)/gi,
    /(petit budget|budget moyen|budget élevé|luxe|économique)/gi,
    /(?:le |la )?(moins cher(?:s|e)?|pas cher|budget serré|bon marché)/gi,
    /(?:the )?(cheapest|budget-friendly|low[- ]?cost|affordable)/gi,
    /[$£]\s*(\d[\d\s]*\d)/gi,
    /(\d[\d\s]*\d?)\s*(?:\$|dollars?|£|pounds?)/gi,
  ],
  constraints: [
    /(?:je veux|il me faut|j'ai besoin de|obligatoire|impératif)\s*:?\s*([^.!?]+)/gi,
    /(?:accessibilité|PMR|animaux|enfants|wifi)/gi,
  ],
};

function extractEntities(text: string, patterns: RegExp[], minLength = 3): string[] {
  const matches = new Set<string>();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = match[1] || match[0];
      if (value && value.trim().length >= minLength) {
        matches.add(value.trim());
      }
    }
  }
  return Array.from(matches);
}

// ─── Registration ───

export function registerSessionEntitiesTests() {
  setCategory("sessionEntities");

  describe("Destination extraction", () => {
    it("FR 'à partir de Bruxelles' captures Bruxelles", () => {
      const r = extractEntities("à partir de Bruxelles", ENTITY_PATTERNS.destinations);
      expect(r.some((v) => v.toLowerCase() === "bruxelles")).toBe(true);
    });

    it("FR 'depuis Paris' captures Paris", () => {
      const r = extractEntities("depuis Paris", ENTITY_PATTERNS.destinations);
      expect(r.some((v) => v.toLowerCase() === "paris")).toBe(true);
    });

    it("EN 'from London' captures London", () => {
      const r = extractEntities("from London", ENTITY_PATTERNS.destinations);
      expect(r.some((v) => v.toLowerCase() === "london")).toBe(true);
    });

    it("FR 'aller à Rome' captures Rome", () => {
      const r = extractEntities("je voudrais aller à Rome", ENTITY_PATTERNS.destinations);
      expect(r.some((v) => v.toLowerCase() === "rome")).toBe(true);
    });

    it("EN 'to Barcelona' captures Barcelona", () => {
      const r = extractEntities("to Barcelona", ENTITY_PATTERNS.destinations);
      expect(r.some((v) => v.toLowerCase() === "barcelona")).toBe(true);
    });
  });

  describe("Date / duration extraction", () => {
    it("FR '2 jours' captures duration", () => {
      const r = extractEntities("pour 2 jours", ENTITY_PATTERNS.dates, 1);
      expect(r.length).toBeGreaterThan(0);
    });

    it("FR '3 semaines' captures duration", () => {
      const r = extractEntities("pendant 3 semaines", ENTITY_PATTERNS.dates, 1);
      expect(r.length).toBeGreaterThan(0);
    });

    it("EN '5 days' captures duration", () => {
      const r = extractEntities("for 5 days", ENTITY_PATTERNS.dates, 1);
      expect(r.length).toBeGreaterThan(0);
    });

    it("FR 'en juillet' captures month", () => {
      const r = extractEntities("en juillet", ENTITY_PATTERNS.dates, 1);
      expect(r.some((v) => v.toLowerCase() === "juillet")).toBe(true);
    });

    it("FR '4 nuits' captures duration", () => {
      const r = extractEntities("4 nuits", ENTITY_PATTERNS.dates, 1);
      expect(r.length).toBeGreaterThan(0);
    });
  });

  describe("Budget extraction", () => {
    it("FR 'la moins chers possible' matches budget constraint", () => {
      const r = extractEntities("la moins chers possible", ENTITY_PATTERNS.budgets);
      expect(r.length).toBeGreaterThan(0);
    });

    it("'$2000' captures dollar amount", () => {
      const r = extractEntities("budget $2000", ENTITY_PATTERNS.budgets);
      expect(r.some((v) => v.includes("2000"))).toBe(true);
    });

    it("'500€' captures euro amount", () => {
      const r = extractEntities("environ 500€", ENTITY_PATTERNS.budgets);
      expect(r.some((v) => v.includes("500"))).toBe(true);
    });

    it("EN 'cheapest' captures budget constraint", () => {
      const r = extractEntities("the cheapest option", ENTITY_PATTERNS.budgets);
      expect(r.length).toBeGreaterThan(0);
    });

    it("FR 'pas cher' captures budget constraint", () => {
      const r = extractEntities("quelque chose de pas cher", ENTITY_PATTERNS.budgets);
      expect(r.length).toBeGreaterThan(0);
    });

    it("FR 'économique' captures budget preset", () => {
      const r = extractEntities("voyage économique", ENTITY_PATTERNS.budgets);
      expect(r.some((v) => v.toLowerCase().includes("économique"))).toBe(true);
    });
  });

  describe("Debug store clearAll", () => {
    it("clearAll() empties rawResponses, toolExecutions, and intent", () => {
      const store = useDebugStore.getState();
      store.addRawResponse({ requestId: "test-1", timestamp: Date.now(), data: {} });
      store.addToolExecution({ tool: "test", status: "finished", timestamp: Date.now() });
      store.setLastIntent({ primaryIntent: "test", confidence: 90, entities: {} });

      store.clearAll();

      const after = useDebugStore.getState();
      expect(after.rawResponses.length).toBe(0);
      expect(after.toolExecutions.length).toBe(0);
      expect(after.lastIntent).toBe(null);
      expect(after.reasoning).toBe(null);
    });
  });

  describe("Combined real-world message", () => {
    it("'escapade la moins chers possible pour 2 jours à partir de bruxelles' extracts all", () => {
      const text = "je voudrais fait une escapde la moins chers possible pour 2 jours à partir de Bruxelles";
      const destinations = extractEntities(text, ENTITY_PATTERNS.destinations);
      const dates = extractEntities(text, ENTITY_PATTERNS.dates, 1);
      const budgets = extractEntities(text, ENTITY_PATTERNS.budgets);

      expect(destinations.some((d) => d.toLowerCase() === "bruxelles")).toBe(true);
      expect(dates.length).toBeGreaterThan(0);
      expect(budgets.length).toBeGreaterThan(0);
    });
  });
}
