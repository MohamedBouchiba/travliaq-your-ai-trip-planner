

## Plan: Style-First Flow + Suggestion Buttons Fix

### Problem 1: Wrong widget order
Currently when a user is indecisive ("je sais pas trop"), the backend override logic (lines 414-422 in `planner-chat/index.ts`) checks interests FIRST and shows `preferenceInterests` if empty. The user wants **style first** (the slider widget), then optionally interests.

### Problem 2: Suggestion buttons trigger widgets directly
Some suggestion buttons use `__WIDGET__` prefix which bypasses the message pipeline and triggers the widget directly. The user expects: click button -> message appears in chat -> message is processed -> widget triggered as a result.

---

### Change 1: Reverse the preference-first priority (Backend)

**File**: `supabase/functions/planner-chat/index.ts` (lines 414-435)

Swap the two checks so **style is checked FIRST**, interests second:

```
Current order:                    New order:
1. interests empty? -> interests  1. style missing? -> preferenceStyle
2. style missing? -> style        2. interests empty? -> preferenceInterests
```

Also update `buildClassificationSystemPrompt` (lines 456-459) to match:
- "Si le style est NON DEFINI -> preferenceStyle"
- "Si les interets sont VIDES -> preferenceInterests"

**File**: `supabase/functions/planner-chat/tools/intentClassifier.ts` (lines 77-78)

Update the priority description to match (style first, then interests).

**File**: `supabase/functions/planner-chat/tools/reasoningEngine.ts` (lines 150-151)

Same: swap order of style vs interests check.

---

### Change 2: Frontend inspire flow also starts with style (already correct)

The frontend `PlannerChat.tsx` line 855 already shows `preferenceStyle` for the inspire intent. And `onStyleContinue` already transitions to interests. So the frontend flow is already correct: Style -> Interests -> Extra. No change needed here.

---

### Change 3: Remove `__WIDGET__` direct triggers from suggestion buttons

**File**: `src/components/planner/chat/hooks/usePreferenceWidgetCallbacks.ts`

In `onInterestsContinue` (around line 175-195) and `onMustHavesContinue` (around line 245-265):
- Change `message: "__WIDGET__mustHaves"` to a natural language message like the translated text for "Je veux configurer mes criteres obligatoires"
- Change `message: "__WIDGET__dietary"` to "Je veux configurer mes restrictions alimentaires"

These natural messages will be sent to the chat, processed by the backend, which will detect the intent and trigger the appropriate widget via the normal pipeline.

**File**: `src/i18n/locales/fr/planner.json` and `en/planner.json`

Add translation keys:
- `planner.suggestion.configureMustHaves`: "Je veux definir mes criteres obligatoires"
- `planner.suggestion.configureDietary`: "Je veux definir mes restrictions alimentaires"

**File**: `src/components/planner/PlannerChat.tsx` (lines 1887-1921)

The `__WIDGET__` case in the suggestion click handler can remain as a fallback but should no longer be the primary path. Since we're changing the messages to natural language, these suggestions will now fall through to the DEFAULT case (line 1964) which fills the input and lets the user send it.

However, to make it seamless (one click = message sent), we should auto-submit when a suggestion is clicked with a natural language message. Currently the DEFAULT case just fills the input. We need to check: does the existing flow auto-submit?

Looking at line 1964-1973, the DEFAULT case only fills the input -- it does NOT auto-submit. We should change this so that non-special-token messages are auto-submitted (call `handleSubmit` or the send function directly).

---

### Change 4: Auto-submit natural language suggestions

**File**: `src/components/planner/PlannerChat.tsx` (DEFAULT case, ~line 1964)

Instead of just filling the input, trigger the send flow directly. This means calling the `handleSendMessage` function with the suggestion text. The message will appear as a user message, get processed by the backend, and trigger the appropriate widget.

---

### Summary of files to modify

1. `supabase/functions/planner-chat/index.ts` -- Swap style/interests priority order
2. `supabase/functions/planner-chat/tools/intentClassifier.ts` -- Update priority docs
3. `supabase/functions/planner-chat/tools/reasoningEngine.ts` -- Update priority docs
4. `src/components/planner/chat/hooks/usePreferenceWidgetCallbacks.ts` -- Replace `__WIDGET__` messages with natural language
5. `src/components/planner/PlannerChat.tsx` -- Auto-submit natural language suggestions
6. `src/i18n/locales/fr/planner.json` -- Add suggestion message translations
7. `src/i18n/locales/en/planner.json` -- Add suggestion message translations

