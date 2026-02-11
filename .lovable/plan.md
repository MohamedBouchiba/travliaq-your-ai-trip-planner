
# Fix 25 test failures — scalable scoring and multilingual destination index

## Root cause analysis

Three distinct issues cause all 25 failures:

### Issue A: Scoring model inverted (14 tests)
The current scoring gives pattern matches 10pts and destination NAME detection only 5pts. But the tests require the opposite priority: when a destination name is present in a message, the type should generally be "destinations" UNLESS a structural content pattern (hotels/flights) matches.

Additionally, the "question bonus" (+5 to any `_question` category when message ends with `?`) is applied even when NO pattern matched, causing generic questions like "Preferes-tu la montagne ou la plage ?" to incorrectly classify as `dates_question` (5pts from bonus alone) instead of `open_question`.

**Tests**: 1, 5, 6, 9, 10, 11, 12, 14, 15, 16, 17, 18, 25

### Issue B: Missing patterns (4 tests)
- `TRAVELERS_QUESTION_PATTERNS` missing "combien de voyageurs" (only has "combien de personnes")
- `NEGATIVE_INTENT_PATTERNS` "finalement, pas" fails because regex requires `\s+` between words but text has comma+space

**Tests**: 19, 20, 23

### Issue C: French destination names not in DB (7 tests)
The DB stores English country names only (Japan, Thailand, Cambodia, Greece). French names (Japon, Thailande, Cambodge, Grece) are not found by the index, causing `extractDestinationNames` to return too few results.

**Tests**: 2, 3, 4, 7, 8, 13, 21, 22, 24

## Solution

### 1. New scoring model in `messageAnalyzer.ts`

Replace the flat scoring with a tiered priority system:

```text
Priority tiers:
  1. Greeting patterns (early return, unchanged)
  2. Structural content: hotels, flights (score = 15)
  3. Destination name detection (score = 12)
  4. Standard patterns: dates_q, travelers_q, budget_q, departure_q,
     activities, destination_info, next_steps, confirmation (score = 10)
  5. Question bonus: +5 ONLY if base pattern score > 0
  6. Fallback: ends with ? -> open_question, else -> unknown
```

This produces correct results for all test cases:
- "Quand souhaitez-vous partir pour Bali ?" -> dates_question=10, destinations=12 -> destinations wins
- "Here are the top luxury hotels in Santorini" -> hotels=15, destinations=12 -> hotels wins
- "Voici les activites a faire a Bali" -> activities=10, destinations=12 -> destinations wins
- "Excellent choix ! Bali..." -> confirmation=10, destinations=12 -> destinations wins
- "Quand souhaitez-vous partir ?" -> dates_question=10+5=15, no dest -> dates_question wins
- "Preferes-tu la montagne ou la plage ?" -> no pattern, no dest, ends with ? -> open_question
- "Est-ce que ca te convient ?" -> no pattern, no dest, ends with ? -> open_question

Changes in `analyzeLastAssistantMessage` (lines 298-391):
- `NAME_SCORE` = 12 (was 5)
- `STRUCTURAL_BONUS` = 5 (new, applied to hotels and flights)
- Question bonus guard: only apply when `scores[category] > 0`

### 2. Missing patterns in `messageAnalyzer.ts`

**TRAVELERS_QUESTION_PATTERNS** (line 91-103):
- Add: `/combien\s+de\s+voyageurs?/i`

**NEGATIVE_INTENT_PATTERNS** (line 440-444):
- Change: `/finalement\s+(pas|non)/i` to `/finalement[,\s]+(pas|non)/i` to handle commas

### 3. Create `destination_aliases` table (SQL migration)

Create a table to store multilingual destination name aliases:

```sql
CREATE TABLE destination_aliases (
  alias TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'fr',
  PRIMARY KEY (alias, lang)
);
ALTER TABLE destination_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON destination_aliases FOR SELECT USING (true);
```

Populate with French translations for common countries:

```sql
INSERT INTO destination_aliases (alias, canonical_name, lang) VALUES
  ('Japon', 'Japan', 'fr'),
  ('Thailande', 'Thailand', 'fr'),
  ('Thaïlande', 'Thailand', 'fr'),
  ('Cambodge', 'Cambodia', 'fr'),
  ('Grece', 'Greece', 'fr'),
  ('Grèce', 'Greece', 'fr'),
  ('Espagne', 'Spain', 'fr'),
  ('Italie', 'Italy', 'fr'),
  ('Turquie', 'Turkey', 'fr'),
  ('Maroc', 'Morocco', 'fr'),
  ('Mexique', 'Mexico', 'fr'),
  ('Croatie', 'Croatia', 'fr'),
  ('Egypte', 'Egypt', 'fr'),
  ('Égypte', 'Egypt', 'fr'),
  ('Tunisie', 'Tunisia', 'fr'),
  ('Norvege', 'Norway', 'fr'),
  ('Norvège', 'Norway', 'fr'),
  ('Suede', 'Sweden', 'fr'),
  ('Suède', 'Sweden', 'fr'),
  ('Islande', 'Iceland', 'fr'),
  ('Colombie', 'Colombia', 'fr'),
  ('Perou', 'Peru', 'fr'),
  ('Pérou', 'Peru', 'fr'),
  ('Argentine', 'Argentina', 'fr'),
  ('Bresil', 'Brazil', 'fr'),
  ('Brésil', 'Brazil', 'fr'),
  ('Singapour', 'Singapore', 'fr'),
  ('Dubai', 'Dubai', 'fr'),
  ('Dubaï', 'Dubai', 'fr'),
  ('Maurice', 'Mauritius', 'fr'),
  ('Londres', 'London', 'fr'),
  ('Barcelone', 'Barcelona', 'fr'),
  ('Lisbonne', 'Lisbon', 'fr'),
  ('Vienne', 'Vienna', 'fr'),
  ('Madere', 'Madeira', 'fr'),
  ('Madère', 'Madeira', 'fr'),
  ('Chypre', 'Cyprus', 'fr'),
  ('Etats-Unis', 'United States', 'fr'),
  ('Allemagne', 'Germany', 'fr'),
  ('Autriche', 'Austria', 'fr'),
  ('Belgique', 'Belgium', 'fr'),
  ('Pays-Bas', 'Netherlands', 'fr'),
  ('Royaume-Uni', 'United Kingdom', 'fr'),
  ('Inde', 'India', 'fr'),
  ('Chine', 'China', 'fr'),
  ('Coree du Sud', 'South Korea', 'fr'),
  ('Corée du Sud', 'South Korea', 'fr'),
  ('Nouvelle-Zelande', 'New Zealand', 'fr'),
  ('Nouvelle-Zélande', 'New Zealand', 'fr'),
  ('Afrique du Sud', 'South Africa', 'fr'),
  ('Tanzanie', 'Tanzania', 'fr'),
  ('Mongolie', 'Mongolia', 'fr'),
  ('Philippines', 'Philippines', 'fr'),
  ('Malaisie', 'Malaysia', 'fr'),
  ('Jordanie', 'Jordan', 'fr'),
  ('Senegal', 'Senegal', 'fr'),
  ('Sénégal', 'Senegal', 'fr'),
  ('Montenegro', 'Montenegro', 'fr'),
  ('Monténégro', 'Montenegro', 'fr');
```

This is data, not hardcoding — new aliases can be added via SQL without code changes.

### 4. Load aliases in `destinationIndex.ts`

In `_load()` (lines 189-236), add a third parallel fetch:

```typescript
const [citiesRes, countriesRes, aliasesRes] = await Promise.all([
  // ... existing cities and countries queries ...
  supabase.from("destination_aliases").select("alias, canonical_name"),
]);
```

When indexing aliases, look up the canonical entry's coords and use them:

```typescript
if (aliasesRes.data) {
  for (const row of aliasesRes.data) {
    const canonicalNorm = normalize(row.canonical_name);
    const existingEntry = this.byName.get(canonicalNorm);
    const coords = existingEntry?.coords ?? null;
    const type = existingEntry?.type ?? "country";
    this._addEntry(row.alias, coords, type);
  }
}
```

This way "Japon" maps to the same coords as "Japan", and `match("le Japon")` returns "Japon".

### 5. Fix normalize for hyphens in `destinationIndex.ts`

The `normalize` function preserves hyphens, but the tokenizer splits on them. So DB entry "Bora-Bora" normalizes to "bora-bora" but user text "Bora Bora" becomes 2-gram "bora bora". Fix: strip hyphens in normalize and also store a hyphen-stripped variant:

```typescript
function normalize(s: string): string {
  return s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")   // treat hyphens as spaces
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();
}
```

## Files to modify

| File | Change |
|------|--------|
| `src/components/planner/chat/services/messageAnalyzer.ts` | Scoring model (NAME_SCORE=12, STRUCTURAL_BONUS=5, question bonus guard), add travelers pattern, fix negative pattern |
| `src/services/destinationIndex.ts` | Load from `destination_aliases`, fix normalize for hyphens |
| SQL migration | Create and populate `destination_aliases` table |

## Test impact mapping

| Tests | Fix |
|-------|-----|
| 1, 16, 17, 25 | Question bonus only when pattern matched |
| 5, 6, 9, 10, 11, 12, 14, 15, 18 | NAME_SCORE=12 > pattern score=10 |
| 2, 3, 4, 7, 8, 13, 21, 24 | FR aliases from DB (Japon, Grece, Cambodge, etc.) |
| 19, 20 | "combien de voyageurs" pattern |
| 22 | Ibiza/Mykonos/Barcelona found via index (already in cities table) |
| 23 | "finalement, pas" negative pattern with comma |
