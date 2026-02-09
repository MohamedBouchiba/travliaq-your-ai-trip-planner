

# 3 Improvements from Debug Trace

## Issue 1 (HIGH): After preferences complete, system should suggest destinations, not ask for dates

**What happens**: User says "non rien d'autre" after preferences. Intent is classified as `"other"`. The system responds with "passons aux dates" but destination is still missing. Per the phased workflow, Discovery (destinations) must come before Logistics (dates).

**Root cause**: The proactive destination suggestion logic (line 739-761 in `useUnifiedIntentRouter.ts`) only runs for intents in `widgetTriggeringIntents`, but `"other"` is not in that list. So the entire fallback block is skipped.

**Fix**: Add `"other"`, `"thank_you"`, and `"greeting"` to `widgetTriggeringIntents` -- OR better, move the "no destination + preferences filled = suggest destinations" guard **outside** the `widgetTriggeringIntents` check so it always runs as a last resort before returning `{ shouldShowWidget: false }`.

**File**: `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts` (lines 739-792)

Move the proactive destination check (lines 742-761) to run **before** the final return at line 792, regardless of intent type.

---

## Issue 2 (MEDIUM): `tripDuration: "3 jours"` detected but never persisted

**What happens**: The first intent classification correctly extracts `entities.tripDuration: "3 jours"`, but `flightData` is `null` in that response. The `setPendingTripDuration` call only happens inside the `if (flightData)` block. So the duration is lost.

**Root cause**: The intent classifier extracts the entity, but `tripDuration` is only consumed from `flightData` (the flight extractor tool), which doesn't run during the preference-gathering phase.

**Fix**: After the intent router processes the response, check `intentClassification.entities.tripDuration` and call `setPendingTripDuration()` if present, even when `flightData` is null.

**File**: `src/components/planner/PlannerChat.tsx` (around line 1268)

Add a new block before/after the `flightData` check:

```text
// Persist tripDuration from intent entities even without flightData
if (!flightData && intentClassification?.entities?.tripDuration) {
  widgetFlow.setPendingTripDuration(intentClassification.entities.tripDuration);
}
```

---

## Issue 3 (LOW): Intent "other" with high confidence for "non rien d'autre"

**What happens**: The user confirms they have no more criteria ("non rien d'autre de precis"). The LLM classifies this as `primaryIntent: "other"` with confidence 95 and no widget. This is technically correct (it's not a preference or destination intent), but it means the system loses awareness that the user just **completed** the preferences phase.

**Fix**: In the backend intent classifier prompt (`supabase/functions/planner-chat/tools/intentClassifier.ts`), add a rule: when the user confirms completion of a phase (e.g., "non rien d'autre", "c'est tout", "pas de restriction"), classify as `confirm_selection` or add a new intent `"confirm_completion"` rather than `"other"`. This would ensure the `widgetTriggeringIntents` list catches it and triggers the next flow step.

Alternatively (simpler, frontend-only): In Issue 1's fix, since we're moving the proactive destination check outside the intent filter, this becomes less critical -- the system will suggest destinations regardless of the intent type.

**File**: `supabase/functions/planner-chat/tools/intentClassifier.ts` -- update the system prompt to instruct classification of "nothing else" / "no more" as `confirm_selection`.

---

## Summary

| # | Severity | Problem | Fix location |
|---|----------|---------|-------------|
| 1 | HIGH | Destinations skipped after preferences | `useUnifiedIntentRouter.ts` -- move proactive destination check outside intent filter |
| 2 | MEDIUM | "3 jours" duration lost | `PlannerChat.tsx` -- persist `tripDuration` from intent entities |
| 3 | LOW | "non rien d'autre" classified as "other" | `intentClassifier.ts` prompt + Issue 1 fix makes it less critical |

## Technical details

**Issue 1 code change** (`useUnifiedIntentRouter.ts`):

```text
// BEFORE (line 739):
if (widgetTriggeringIntents.includes(intent.primaryIntent)) {
  // ... proactive destination check inside here ...
}
return { shouldShowWidget: false, widgetType: null, action: "none" };

// AFTER:
if (widgetTriggeringIntents.includes(intent.primaryIntent)) {
  // ... nextRequired widget logic only ...
}

// Proactive destination guard -- runs for ALL intents as last resort
if (!flowState.hasDestination) {
  const hasPreferences = widgetInteractions.some(i =>
    i.interactionType === "style_configured" || i.interactionType === "interests_selected"
  );
  if (hasPreferences) {
    const destValidation = canShowWidget("destinationSuggestions");
    if (destValidation.valid) {
      if (onWidgetTriggered) onWidgetTriggered("destinationSuggestions");
      return {
        shouldShowWidget: true,
        widgetType: "destinationSuggestions",
        action: "none",
        reason: "Preferences filled, no destination -- proactive suggestions",
      };
    }
  }
}

return { shouldShowWidget: false, widgetType: null, action: "none" };
```

**Issue 2 code change** (`PlannerChat.tsx`, after line ~1267):

```text
// Persist tripDuration/preferredMonth from intent entities even without flightData
if (intentClassification?.entities) {
  const ent = intentClassification.entities;
  if (ent.tripDuration && !widgetFlow.pendingTripDuration) {
    widgetFlow.setPendingTripDuration(ent.tripDuration);
  }
  if (ent.preferredMonth && !widgetFlow.pendingPreferredMonth) {
    widgetFlow.setPendingPreferredMonth(ent.preferredMonth);
  }
}
```

**Issue 3 code change** (`intentClassifier.ts`): Add to the system prompt classification rules:

```text
- "non", "rien d'autre", "c'est tout", "pas de restriction", "non merci" 
  → primaryIntent: "confirm_selection" (not "other")
```
