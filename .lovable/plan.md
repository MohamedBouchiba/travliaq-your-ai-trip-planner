

## Debug Trace Analysis - 3 Issues Found

### Issue 1 (HIGH): `getNextRequiredWidget` returns `citySelector` when no country is selected

**Problem**: When the user says "non pas specialement" (no dietary restrictions), the backend returns `widgetToShow: preferenceInterests`. But `preferenceInterests` is in `blockedWidgets` (already confirmed), so `canShowWidget` rejects it. The fallback calls `getNextRequiredWidget()` which returns `citySelector` as the first priority (line 384). However, `citySelector` requires a country to populate its city list -- and no country has been selected yet. The result: a `citySelector` widget is attached to the message but it can't display meaningful content.

**What should happen**: When there's no destination AND the user was initially indecisive ("je ne sais pas trop ou aller"), the system should proactively trigger destination suggestions instead of showing an empty city selector.

**Fix**: In `getNextRequiredWidget()` (line 380-413 of `useUnifiedIntentRouter.ts`), add a check for `flowState.hasDestination` before returning `citySelector`. If no country is selected, return `null` instead (let the LLM handle asking about destinations, or trigger `destinationSuggestions` if preferences are complete).

```
// Before (line 384):
if (!flowState.hasDestinationCity && !hasAlreadyProvided("citySelector")) {
  return "citySelector";
}

// After:
if (!flowState.hasDestinationCity && !hasAlreadyProvided("citySelector")) {
  // Only show citySelector if a country is already selected
  // Otherwise, the user needs to pick a destination first
  if (flowState.hasDestination) {
    return "citySelector";
  }
  // No country selected - don't force citySelector, let LLM guide destination discovery
  return null;
}
```

| File | Change |
|------|--------|
| `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts` line 384-386 | Guard `citySelector` behind `flowState.hasDestination` check |

---

### Issue 2 (MEDIUM): No proactive destination suggestions after preferences are complete

**Problem**: After the user finishes all preference steps (style, interests, mustHaves) and declines dietary restrictions, there's no automatic trigger for destination suggestions. The user originally said "je ne sais pas trop ou aller" (indecisive), so the system should proactively offer destination suggestions once preferences are gathered. Instead, the LLM just asks "ou aimerais-tu partir ?" with no widget.

**What should happen**: When all preferences are gathered and the user was initially indecisive (no destination mentioned), the system should automatically request destination suggestions -- the same behavior as clicking the "Rien d'autre" suggestion chip which sends `__FETCH_DESTINATIONS__`.

**Fix**: In `usePreferenceWidgetCallbacks.ts`, when the flow detects that the user declined dietary ("non rien de special") AND all preferences are gathered AND no destination is set, proactively trigger destination suggestions instead of just asking the question.

Alternatively, add a check in `useChatWidgetFlow.ts` or in the intent router's `processIntent`: when intent is `gather_preferences` with no widget to show, preferences are filled, and no destination is set, return a signal to trigger destination suggestions.

The simplest approach: in the `processIntent` fallback path (around line 497-510 of `useUnifiedIntentRouter.ts`), when `getNextRequiredWidget()` returns `null` AND `!flowState.hasDestination` AND preferences are partially filled (interests exist), auto-return `destinationSuggestions` as the widget.

| File | Change |
|------|--------|
| `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts` ~line 497-510 | After `getNextRequiredWidget()` returns null, check if `!flowState.hasDestination` and preferences are filled -- if so, trigger `destinationSuggestions` widget |

---

### Issue 3 (LOW): Intent classification returns `preferenceInterests` for "non pas specialement"

**Problem**: The user says "non pas specialement" in response to "Avez-vous des restrictions alimentaires ?". The backend classifies this as `gather_preferences` with `widgetToShow: preferenceInterests`. This is wrong -- interests are already configured (`blockedWidgets: ["preferenceInterests"]`). The backend should classify this as a simple negative answer or `other` intent, not suggest a widget that's already been completed.

**Root cause**: The backend system prompt doesn't have visibility into `blockedWidgets`. It sees the conversation and thinks interests haven't been explicitly discussed, so it suggests them.

**Fix**: Include `blockedWidgets` in the memory context sent to the backend, so the intent classifier knows not to suggest already-confirmed widgets. Add a line in the system prompt context like: `[WIDGETS DEJA CONFIRMES] preferenceInterests, preferenceStyle, mustHaves`.

| File | Change |
|------|--------|
| `supabase/functions/planner-chat/index.ts` (system prompt construction) | Add blocked/confirmed widgets to the context sent to the LLM so it doesn't suggest already-completed widgets |

---

### Summary

| # | Issue | File(s) | Type | Priority |
|---|-------|---------|------|----------|
| 1 | citySelector shown without country | `useUnifiedIntentRouter.ts` | Logic guard | High |
| 2 | No proactive destination suggestions | `useUnifiedIntentRouter.ts` | Flow gap | Medium |
| 3 | Backend suggests blocked widget | `planner-chat/index.ts` | Context gap | Low |

