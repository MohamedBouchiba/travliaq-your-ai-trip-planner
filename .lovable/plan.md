

## Plan: 3 Improvements to the Preference/Destination Flow

### 1. Shorter AI text when a widget is displayed

**Problem**: When the `preferenceInterests` widget appears, the AI generates a long text listing the same options the widget shows (beach, culture, adventure, etc.), creating redundancy.

**Solution**: Add an instruction in the system prompt (`planner-chat/index.ts`) telling the LLM to keep its text very short (1-2 sentences max) when a widget is about to be displayed. The widget itself is the main UI -- the text should just be a brief intro like "Pour mieux te conseiller, dis-moi ce qui te fait envie :"

**Files to modify**:
- `supabase/functions/planner-chat/index.ts` -- Add rule in classify_intent system prompt and main system prompt: "When widgetToShow is set, keep your text response to 1-2 short sentences maximum. The widget handles the interaction -- do NOT list the options in text."

---

### 2. Profile completion CTA button up to 80% (not just < 50%)

**Problem**: The "Complete my profile" button only shows below 50%. At 55%, the user sees a blue info banner with no CTA button, making it impossible to improve their profile from the destination suggestions screen.

**Solution**: Change the threshold tiers in `ProfileCompletionBanner.tsx`:
- Less than 80%: Show the CTA button ("Completer mon profil") alongside the progress bar
- 80% and above: Green success badge (no CTA needed)

Specifically:
- Raise the green success threshold from 70% to 80%
- Add the CTA button to the blue/mid-tier banner (50-79%)
- Keep the orange warning with CTA for below 50%

**File to modify**:
- `src/components/planner/chat/widgets/ProfileCompletionBanner.tsx`

---

### 3. Ask departure city before destination suggestions

**Problem**: When fetching destinations after completing preferences, the system doesn't ask for the departure city first, even though it's a missing field. Knowing the departure city helps provide better destination suggestions (proximity, flight availability).

**Solution**: In `usePreferenceWidgetCallbacks.ts`, before triggering `handleFetchDestinations`, check if `memory.departure?.city` is set. If not, inject a message asking the user for their departure city and show a departure city input/widget. Only after the departure city is confirmed should destinations be fetched.

Concretely, in the `onDietaryContinue` callback (and the `__FETCH_DESTINATIONS__` path), add a check:
- If departure city is missing, show a message "D'ou partez-vous ?" and trigger an airport/city search widget (reusing the existing departure flow)
- If departure city is set, proceed directly to fetching destinations

**Files to modify**:
- `src/components/planner/chat/hooks/usePreferenceWidgetCallbacks.ts` -- Add departure check before fetching
- `src/components/planner/PlannerChat.tsx` -- Handle the `__FETCH_DESTINATIONS__` path with same departure check

---

### Technical Details

```text
Current thresholds:              New thresholds:
< 50%  -> Orange + CTA           < 50%  -> Orange + CTA
50-69% -> Blue (no CTA)          50-79% -> Blue + CTA  
>= 70% -> Green badge            >= 80% -> Green badge
```

Departure city check flow:
```text
User completes preferences
  -> Is departure city set?
     -> YES: Fetch destinations immediately
     -> NO:  Show "D'ou partez-vous?" + airport search widget
             -> User selects city -> THEN fetch destinations
```

