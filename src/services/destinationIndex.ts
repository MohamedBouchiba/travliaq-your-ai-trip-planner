/**
 * DestinationIndex — Singleton service that loads cities & countries from Supabase
 * into an in-memory index for O(1) lookups and O(n_words) text matching.
 *
 * Usage:
 *   import { destinationIndex } from '@/services/destinationIndex';
 *   await destinationIndex.init();           // call once at app boot
 *   destinationIndex.match("I want to go to Bali and Thailand");  // ["Bali","Thailand"]
 *   destinationIndex.getCoords("paris");     // [2.3522, 48.8566]
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a name: lowercase + strip diacritics */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Common short words that happen to be city/country names — skip during text matching
// to avoid false positives (e.g. "on" → Onsala, "as" → As, "of" → …)
const SKIP_TOKENS = new Set([
  "a", "an", "as", "at", "be", "by", "do", "go", "he", "i", "if", "in",
  "is", "it", "la", "le", "me", "my", "no", "of", "on", "or", "so",
  "to", "up", "us", "we", "am", "au", "de", "du", "en", "et", "eu",
  "il", "je", "la", "le", "ma", "ne", "ni", "nu", "ou", "sa", "se",
  "si", "ta", "tu", "un", "va", "vu",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IndexEntry {
  displayName: string;
  coords: [number, number] | null; // [lng, lat]
  type: "city" | "country";
}

// ---------------------------------------------------------------------------
// Singleton class
// ---------------------------------------------------------------------------

class DestinationIndex {
  private _ready = false;
  private _loading: Promise<void> | null = null;

  /** normalized name → entry */
  private byName = new Map<string, IndexEntry>();

  /** All normalized names for quick Set lookup */
  private nameSet = new Set<string>();

  /** Multi-word normalized names grouped by word count (2, 3) */
  private multiWordNames = new Map<number, Set<string>>();

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Load data from Supabase (idempotent, non-blocking). */
  async init(): Promise<void> {
    if (this._ready) return;
    if (this._loading) return this._loading;

    this._loading = this._load();
    await this._loading;
  }

  isReady(): boolean {
    return this._ready;
  }

  /** Get [lng, lat] for a destination name, or null. */
  getCoords(name: string): [number, number] | null {
    const entry = this.byName.get(normalize(name));
    return entry?.coords ?? null;
  }

  /** Check if a name is a known destination. */
  isKnownDestination(name: string): boolean {
    return this.nameSet.has(normalize(name));
  }

  /**
   * Extract destination names found in a text.
   * Tokenizes, then checks single words + consecutive pairs/triples against the index.
   * Returns display names (original casing from DB), max 6.
   */
  match(text: string): string[] {
    if (!this._ready || !text) return [];

    // Tokenize: split on non-alphanumeric (keep accented chars)
    const words = text
      .split(/[^a-zA-ZÀ-ÿ0-9]+/)
      .filter((w) => w.length > 0);

    const found = new Map<string, string>(); // normalized → displayName

    for (let i = 0; i < words.length; i++) {
      // Check n-grams: 3, 2, 1 (longest first to prefer "New York City" over "New")
      for (const len of [3, 2, 1]) {
        if (i + len > words.length) continue;
        const candidate = words.slice(i, i + len).join(" ");
        const norm = normalize(candidate);

        // Skip very short single tokens that are common words
        if (len === 1 && (norm.length < 3 || SKIP_TOKENS.has(norm))) continue;

        if (this.nameSet.has(norm) && !found.has(norm)) {
          const entry = this.byName.get(norm);
          if (entry) {
            found.set(norm, entry.displayName);
            // Skip consumed words
            i += len - 1;
            break;
          }
        }
      }
    }

    return [...found.values()].slice(0, 6);
  }

  // -------------------------------------------------------------------------
  // Pre-seed for unit tests (no Supabase needed)
  // -------------------------------------------------------------------------

  /**
   * Seed the index with static data — useful in test environments where
   * Supabase is not available. Calling init() after seed() is a no-op.
   */
  seed(entries: Array<{ name: string; coords?: [number, number]; type?: "city" | "country" }>): void {
    for (const e of entries) {
      this._addEntry(e.name, e.coords ?? null, e.type ?? "city");
    }
    this._ready = true;
  }

  /** Reset the index (for tests). */
  reset(): void {
    this.byName.clear();
    this.nameSet.clear();
    this.multiWordNames.clear();
    this._ready = false;
    this._loading = null;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private _addEntry(displayName: string, coords: [number, number] | null, type: "city" | "country"): void {
    const norm = normalize(displayName);
    if (!norm || norm.length < 2) return;

    // Don't overwrite city with country if both exist (cities are more specific)
    if (this.byName.has(norm) && type === "country") return;

    this.byName.set(norm, { displayName, coords, type });
    this.nameSet.add(norm);

    // Track multi-word names
    const wordCount = norm.split(/\s+/).length;
    if (wordCount > 1) {
      if (!this.multiWordNames.has(wordCount)) {
        this.multiWordNames.set(wordCount, new Set());
      }
      this.multiWordNames.get(wordCount)!.add(norm);
    }
  }

  private async _load(): Promise<void> {
    try {
      // Parallel fetch: top 5000 cities + all countries
      const [citiesRes, countriesRes] = await Promise.all([
        supabase
          .from("cities")
          .select("name, latitude, longitude, country, country_code")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("population", { ascending: false, nullsFirst: false })
          .limit(5000),
        supabase
          .from("countries")
          .select("name, iso2"),
      ]);

      // Index cities
      if (citiesRes.data) {
        for (const city of citiesRes.data) {
          if (city.name && city.longitude != null && city.latitude != null) {
            this._addEntry(city.name, [city.longitude, city.latitude], "city");
          }
        }
      } else if (citiesRes.error) {
        console.warn("[DestinationIndex] Failed to load cities:", citiesRes.error.message);
      }

      // Index countries
      if (countriesRes.data) {
        for (const country of countriesRes.data) {
          if (country.name) {
            this._addEntry(country.name, null, "country");
          }
        }
      } else if (countriesRes.error) {
        console.warn("[DestinationIndex] Failed to load countries:", countriesRes.error.message);
      }

      this._ready = true;
      console.log(
        `[DestinationIndex] Ready — ${this.byName.size} destinations indexed`
      );
    } catch (err) {
      console.error("[DestinationIndex] Init failed:", err);
      // Mark as ready anyway so the app doesn't hang; lookups will simply return empty
      this._ready = true;
    }
  }
}

// Export singleton
export const destinationIndex = new DestinationIndex();
