

# Scalable Fix Plan: Multi-Destination Pipeline + State Guards

## Problems identified from the debug trace

1. **Multi-destination routes are lost**: User says "istanbul doha oman et bankok puis retour a brussell" but the flight extractor only captures `from: "Bruxelles"` and `to: "Istanbul"`. The other 4 legs vanish.
2. **Dates confirmed but re-asked**: After the user confirms dates (12 feb - 26 feb), `evaluatePhaseTransition` still triggers `datePicker` because `flowState` doesn't distinguish "dates set by user" from "dates pre-filled".
3. **Flight search + datePicker conflict**: The system triggers `flightSearchTrigger: true` AND a `datePicker` widget in the same response. These are mutually exclusive.
4. **`flightSummary` truncated**: Only shows "Etape 1: BRU -> Istanbul" when 5 legs exist.
5. **COMPREHENSIVE_KEYWORD_TRIGGERS (lines 606-757)**: 150+ hardcoded keywords in the intent router -- the exact anti-pattern you want to eliminate. This duplicates the LLM classifier's job and breaks the "contextual classification" principle.

## Architectural fixes (4 changes, all scalable)

### Fix 1: Multi-destination leg extraction (Backend + Frontend)

**Problem**: `FlightFormData` and `flightExtractionTool` only have `from`/`to` (single pair). Multi-leg routes are structurally impossible to express.

**Solution**: Add a `legs` array to both the tool schema and the type.

**Files**:
- `supabase/functions/planner-chat/tools/flightExtractor.ts` -- add `legs` parameter to the tool
- `src/types/flight.ts` -- add `legs` field to `FlightFormData`
- `src/components/planner/chat/utils/flightDataToMemory.ts` -- handle `legs` in `flightDataToMemory()`
- `src/components/planner/PlannerChat.tsx` -- extend `persistExtractedEntities()` to persist legs

**Schema addition to `flightExtractionTool`**:
```text
legs: {
  type: "array",
  items: {
    type: "object",
    properties: {
      from: { type: "string", description: "Departure city for this leg" },
      to: { type: "string", description: "Arrival city for this leg" },
      date: { type: "string", description: "Date for this leg (YYYY-MM-DD) if known" },
    },
    required: ["from", "to"],
  },
  description: "For multi-destination trips: ordered list of legs. E.g., 'Brussels->Istanbul->Doha->Oman->Bangkok->Brussels' = 5 legs. Use this INSTEAD of from/to when tripType is 'multi'."
}
```

**`FlightFormData` addition**:
```text
legs?: Array<{ from: string; to: string; date?: string }>;
```

**`flightDataToMemory` update**: When `flightData.legs` exists AND `tripType === "multi"`, convert each leg to a `FlightLegMemory` and return them as a `legs` field in the update. The store's `setTripType("multi")` already creates legs structure -- we just need to populate them.

**`persistExtractedEntities` update**: Add legs merge logic. This follows Principle 2 -- single pipeline for all entities.

---

### Fix 2: Remove hardcoded keyword triggers (Frontend)

**Problem**: `COMPREHENSIVE_KEYWORD_TRIGGERS` (lines 606-757 in `useUnifiedIntentRouter.ts`) is 150 lines of hardcoded keywords that duplicate the LLM classifier. It contradicts Principle 3 (contextual classification) and will grow forever as languages are added.

**Solution**: Delete the entire `COMPREHENSIVE_KEYWORD_TRIGGERS` block and its matching loop. Instead, rely on what already exists:
1. **Backend intent classifier** (Pass 1) -- already classifies intent AND sets `widgetToShow`
2. **Entity-based fallback** (lines 786-804) -- already checks `intent.entities` for dietary, accessibility, interests, budget
3. **`evaluatePhaseTransition()`** (Principle 1) -- already handles "what's next?" as a universal fallback

The entity-based fallback (lines 786-804) stays because it's semantic (reads structured entities from the LLM), not keyword-based.

**File**: `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts`
- Delete lines 603-783 (the entire COMPREHENSIVE_KEYWORD_TRIGGERS block + matching loop)
- Keep the entity-based fallback (lines 786-804)
- Keep `widgetTriggeringIntents` check + `getNextRequiredWidget()` (lines 808-832)
- Keep `evaluatePhaseTransition()` (lines 834-845)

---

### Fix 3: State-aware phase guards (Frontend)

**Problem**: `evaluatePhaseTransition()` doesn't know if dates/travelers have been CONFIRMED via widgets. It only checks `flowState.hasDepartureDate`, which can be true from a pre-fill. This causes re-asking.

**Solution**: Extend guards to check `widgetInteractions` for confirmation signals, not just `flowState` fields.

**File**: `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts`

Update `evaluatePhaseTransition()`:
```text
// Guard 2: Destination + no dates → date picker
// BUT skip if dates already confirmed via widget OR if flight search was triggered
if (flowState.hasDestinationCity && !flowState.hasDepartureDate) {
  const hasDateConfirmation = hasInteraction("date_selected") || hasInteraction("date_range_selected");
  if (!hasDateConfirmation) {
    // ... show datePicker
  }
}
```

Same logic for Guard 3 (travelers).

Also add a **new guard** (Guard 0): If `flightSearchTrigger` is active (detected from intent), skip ALL transitions. This prevents the search + datePicker conflict.

**How Guard 0 works**: Add `flightSearchTriggered?: boolean` parameter to `evaluatePhaseTransition()`. When true, return `null` immediately (no transition needed -- we're searching).

---

### Fix 4: Multi-leg flight summary (Frontend)

**Problem**: `getMemorySummary()` only shows the first leg.

**File**: `src/stores/hooks/useFlightMemoryStore.ts`

Update `getMemorySummary()` to iterate over `legs` when `tripType === "multi"`:
```text
// Current: "Type: Multi-destinations | Etape 1: BRU -> Istanbul (12/02/2026) | 2 voyageurs"
// After:   "Type: Multi-destinations | BRU -> Istanbul -> Doha -> Muscat -> Bangkok -> BRU | 2 voyageurs"
```

---

## Summary

| # | Fix | Type | Files | Principle |
|---|-----|------|-------|-----------|
| 1 | Multi-dest leg extraction | Backend + Frontend | flightExtractor.ts, flight.ts, flightDataToMemory.ts, PlannerChat.tsx | P2 (Entity Pipeline) |
| 2 | Remove keyword triggers | Frontend | useUnifiedIntentRouter.ts | P3 (Contextual Classification) |
| 3 | State-aware phase guards | Frontend | useUnifiedIntentRouter.ts | P1 (State-Driven Transitions) |
| 4 | Multi-leg flight summary | Frontend | useFlightMemoryStore.ts | P2 (Entity Pipeline) |

## What this prevents long-term

- **Fix 1**: Any future route type (stopovers, open-jaw) uses the same `legs[]` pipeline. No new fields needed.
- **Fix 2**: No more keyword maintenance. New languages work automatically via the LLM. New widget types only need an entity mapping (3 lines), not a keyword list (30 lines).
- **Fix 3**: Any future phase (Accommodation, Activities) can add its own guard to `evaluatePhaseTransition()` with the same pattern: check `flowState` field + check `widgetInteraction` confirmation. No new widget type needs to be hardcoded.
- **Fix 4**: Summary is derived from the store's `legs[]` array. Any change to legs is automatically reflected.

