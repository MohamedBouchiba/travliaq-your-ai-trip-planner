

## Plan: Fix 4 Issues from the Debug Trace

### Issue 1: LLM generates a list when showing preferenceStyle widget

**Problem**: When the `preferenceStyle` widget is shown, the LLM writes "indique ce qui t'attire le plus : 🏖️ Plage, 🏛️ Culture, 🌲 Aventure, 🛍️ Shopping" -- a bullet list that duplicates the widget's purpose. The system prompt already says "TEXTE COURT" and "NE LISTE PAS" but the LLM ignores it because the examples are too vague.

**Fix**: Strengthen the system prompt examples in `supabase/functions/planner-chat/index.ts` (lines 513-520):
- Replace the generic examples with more specific, context-aware ones
- Add an explicit example for `preferenceStyle`: "Pour mieux cerner tes envies, commence par ajuster ces curseurs selon tes preferences :"
- Add an explicit NEGATIVE example: "NE FAIS PAS de liste a puces quand un widget est affiche. Le widget EST la liste."

| File | Change |
|------|--------|
| `supabase/functions/planner-chat/index.ts` (lines 513-520) | Rewrite the "TEXTE COURT QUAND WIDGET AFFICHE" section with stronger instructions and better examples targeting `preferenceStyle` specifically |

---

### Issue 2: `update_preferences` validation fails on valid fields

**Problem**: The Zod schema uses `.strict()` (line 80 of `schemas.ts`), which rejects unknown fields. But the error message says "Invalid update_preferences output: occasion, needsWifi, petFriendly, accessibilityRequired, familyFriendly" -- these fields ARE in the schema. The issue is likely that the LLM sends wrong types (e.g., string `"true"` instead of boolean `true`, or invalid enum value for `occasion`).

**Fix**: Two changes:
1. Change `.strict()` to `.passthrough()` on `PreferencesDataSchema` so unknown fields are silently stripped instead of causing full rejection
2. Add Zod `.coerce` or `.preprocess` for boolean fields (`needsWifi`, `petFriendly`, `accessibilityRequired`, `familyFriendly`) to handle LLM sending `"true"/"false"` as strings

| File | Change |
|------|--------|
| `supabase/functions/planner-chat/validators/schemas.ts` (lines 66-80) | Change `.strict()` to `.passthrough()`, add boolean coercion for `needsWifi`, `petFriendly`, `accessibilityRequired`, `familyFriendly` |

---

### Issue 3: Flow stops after date confirmation (no proactive next step)

**Problem**: After dates are confirmed, `handleDateRangeSelect` checks `memory.passengers.adults < 1` to decide if the travelers widget should show. But `passengers.adults` defaults to `1` in the store, so the check is always false. The user never explicitly chose travelers, but the system assumes it's done.

**Fix**: Track whether the user has EXPLICITLY interacted with the travelers widget, not just whether `adults >= 1`. Add a `travelersExplicitlySet` boolean to the flow.

| File | Change |
|------|--------|
| `src/components/planner/chat/hooks/useChatWidgetFlow.ts` (line 360-362) | Change the condition from `memory.passengers.adults < 1` to always show travelers widget after dates unless user already explicitly confirmed travelers via the widget. Add a `travelersConfirmedRef` that is only set to `true` in `handleTravelersSelect`. |

---

### Issue 4: Stale reasoning in debug panel

**Problem**: The reasoning block in the debug output is only updated when the backend calls `plan_response` and streams a `reasoning` event. For the second message (dietary), the backend skipped `plan_response`, so the debug panel kept showing stale reasoning from the first message.

**Fix**: Reset the reasoning in the debug store at the START of each new message stream, so stale data from the previous message is cleared.

| File | Change |
|------|--------|
| `src/components/planner/chat/hooks/useChatStream.ts` | At the beginning of `streamResponse`, call `debugStore.setReasoning(null)` to clear stale reasoning before a new stream starts |

---

### Summary

| # | Issue | File(s) | Type |
|---|-------|---------|------|
| 1 | LLM lists options when widget is shown | `planner-chat/index.ts` | Prompt fix |
| 2 | `update_preferences` validation rejects valid data | `validators/schemas.ts` | Schema fix |
| 3 | No travelers widget after dates | `useChatWidgetFlow.ts` | Logic fix |
| 4 | Stale reasoning in debug | `useChatStream.ts` | State fix |

