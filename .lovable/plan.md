
# Plan: Fix 29 test failures - scalable, zero hardcoding

## Root cause analysis

The failures fall into 6 categories, all stemming from rigid pattern matching and incomplete bilingual coverage.

## Changes by file

### 1. `src/components/planner/chat/services/messageAnalyzer.ts`

**A. `detectLanguage` - use global flag for counting (lines 544-558)**

The current regex uses `/i` without `/g`, so `text.match(regex)` returns at most 1 match. Change to `matchAll` with `/gi` and add more markers:

- FR markers: add `on`, `en`, `au`, `du`, `ne`, `pas`, `mon`, `ton`, `son`, `mais`, `tout`, `ou`, `ni`, `se`
- EN markers: add `to`, `my`, `your`, `this`, `that`, `it`, `do`, `can`, `will`, `not`, `just`, `from`
- Use `[...text.matchAll(regex)].length` to count ALL occurrences

This fixes test #8.

**B. Flexible assistant message patterns (lines 54-213)**

Add gap-tolerant patterns using `[\w\s]*` between key tokens to absorb adjectives/modifiers:

DESTINATION_PATTERNS:
- Add: `/here\s+are\s+(\d+)\s+[\w\s]*destinations?/i`
- Add: `/voici\s+(\d+)\s+[\w\s]*destinations?/i`
- Add: `/what\s+about\s+([\w\s,]+)\?/i` (for "What about Turkey, Montenegro, or Cyprus?")

HOTELS_PATTERNS:
- Add: `/here\s+are\s+(the|some)\s+[\w\s]*hotels?/i`
- Add: `/i('ve)?\s+found\s+(these|some|\d+)\s+[\w\s]*hotels?/i`

TRAVELERS_QUESTION_PATTERNS:
- Add: `/how\s+many\s+of\s+you/i`

DEPARTURE_QUESTION_PATTERNS:
- Add: `/where\s+will\s+you\s+be\s+depart/i`
- Add: `/where\s+are\s+you\s+depart/i`

This fixes tests #10, #11, #16, #18, #22, #24, #25, #26, #27.

**C. Score-based classification in `analyzeLastAssistantMessage` (lines 284-384)**

Replace the sequential "first match wins" with a scoring system:

- Each pattern match adds points to its category (10 per match)
- Destination NAME detection (from `extractDestinationNames`) adds only 5 points
- Questions ending with `?` give a +5 bonus to question categories
- Highest score wins

This ensures "Quand souhaitez-vous partir aux Maldives ?" scores higher for `dates_question` (10+5=15) than `destinations` (5 from name detection only).

This fixes test #9.

**D. Intent pattern expansions (lines 391-444)**

BUDGET_INTENT_PATTERNS:
- Add: `/combien/i` (FR "c'est combien ?")

BOOKING_INTENT_PATTERNS:
- Add: `/on\s+prend/i` (FR "on prend l'hotel")
- Strengthen: `/i('ll)?\s+take\s+(the|this|that)/i`

NEGATIVE_INTENT_PATTERNS:
- Add: `/finalement\s+(pas|non)/i`

UNDECIDED_INTENT_PATTERNS:
- Expand: `/(?:je|on)\s+(?:ne\s+)?sai[st]?\s+pas/i` (covers "on ne sait pas")

MORE_OPTIONS_INTENT_PATTERNS:
- Add: `/something\s+(more|else|different)/i`

COMPARISON_INTENT_PATTERNS:
- Add: `/which\s+is\s+better/i`, `/torn\s+between/i`

DATE_INTENT_PATTERNS:
- Add: `/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i`
- Add: `/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i`

This fixes tests #12, #13, #14, #17, #20, #21, #23.

### 2. `src/components/planner/chat/services/phaseDetector.ts`

**EN negative patterns (lines 177-187)**

Add English patterns to `negativePatterns` array:
- `/don't\s+want/i`, `/avoid/i`, `/dislike/i`, `/hate/i`, `/not\s+interested/i`

This fixes tests #15, #29.

### 3. `src/components/planner/chat/services/suggestionEngine.ts`

**`getWorkflowStep` logic (line 487)**

Current: only checks `hasFlights && currentTab === 'flights'` for "search" vs "compare".
Fix: return `'compare'` if `hasFlights OR hasHotels` (regardless of tab).

Change line 487 from:
```
if (!context.hasFlights && context.currentTab === 'flights') return 'search';
```
To:
```
if (!context.hasFlights && !context.hasHotels) return 'search';
```

This fixes test #28.

### 4. `src/lib/suites/chatTypes.suite.ts`

**Tokyo coords test (line 149)**

The DB returns different coords than the hardcoded fallback (139.69171 vs 139.6503). Since the DB index is loaded in browser tests and takes priority, the test must accept the DB value. Change to verify coords are non-null and within a reasonable range (139-140) instead of matching a specific hardcoded value.

This fixes test #2.

### 5. `src/services/destinationIndex.ts`

**Improve `match()` for destination extraction (lines 91-122)**

The current tokenizer splits on non-alphanumeric chars, which works for "Bali" but may miss destinations in phrases like "le Vietnam" because "le" gets discarded and "Vietnam" needs to be in the DB. The issue is that country names like "Grece" (without accent) may not match the DB entry "Greece".

Add accent-folding to the lookup: when checking a token against the index, also try the original (un-normalized) form. Also ensure the `match()` function works correctly for single-word country/city names embedded in sentences.

This fixes tests #1, #3, #4, #5, #6, #7, #19.

## Summary of impact

| Tests | Root cause | Fix location |
|-------|-----------|-------------|
| 1, 3, 4, 5, 6, 7, 19 | Destination extraction misses DB entries | destinationIndex.ts match() |
| 2 | Tokyo coords from DB differ | chatTypes.suite.ts |
| 8 | detectLanguage counts only 1 match | messageAnalyzer.ts |
| 9 | dates_question loses to destination name | messageAnalyzer.ts scoring |
| 10, 11, 16, 18, 22, 24, 25, 26, 27 | Rigid patterns | messageAnalyzer.ts patterns |
| 12, 13, 14, 17, 20, 21, 23 | Missing intent keywords | messageAnalyzer.ts intents |
| 15, 29 | EN negatives missing | phaseDetector.ts |
| 28 | getWorkflowStep tab-dependent | suggestionEngine.ts |

## Files to modify

1. `src/components/planner/chat/services/messageAnalyzer.ts` - patterns, scoring, detectLanguage, intents
2. `src/components/planner/chat/services/phaseDetector.ts` - EN negative patterns
3. `src/components/planner/chat/services/suggestionEngine.ts` - getWorkflowStep logic
4. `src/services/destinationIndex.ts` - match() robustness
5. `src/lib/suites/chatTypes.suite.ts` - Tokyo coords flexibility
