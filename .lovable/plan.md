

## Analysis of Debug Trace - 5 Issues Found

### Issue 1: LLM text still lists options when preferenceStyle widget is shown (Prompt fix insufficient)

**Problem**: The assistant says *"peux-t me dire ce qui te fait rêver ? Plage, culture, aventure ?"* -- this is still a mini-list that duplicates the widget's purpose. The prompt fix from the previous plan wasn't strong enough, the LLM still finds ways to enumerate options inline.

**Root cause**: The system prompt at line 505 still contains `Poser UNE question sur les envies : "Qu'est-ce qui te fait rêver ? Plage, culture, aventure ?"` which the LLM uses as an example to follow. This directly contradicts the "no listing" rule added at line 517-529.

**Fix**: Remove the contradictory example at line 505 and replace it with a reference to the widget. Also strengthen the example in the "correct examples" section to be more process-oriented (as you requested: explain we're entering a process to understand preferences).

| File | Change |
|------|--------|
| `supabase/functions/planner-chat/index.ts` ~line 505 | Remove `"Poser UNE question sur les envies : Qu'est-ce qui te fait rêver ? Plage, culture, aventure ?"` and replace with `"Afficher le widget preferenceStyle pour collecter les envies"` |
| `supabase/functions/planner-chat/index.ts` ~line 520 | Change preferenceStyle example to: `"On va d'abord cerner ton style de voyage pour te faire les meilleures recommandations :"` |

---

### Issue 2: Text says "choisissons tes dates" but widget shows citySelector

**Problem**: When the user says "ok" to confirm Mexique, the LLM generates text mentioning dates ("Maintenant, choisissons tes dates de voyage :"), but the frontend detects that a city must be selected first and injects a `citySelector` widget. Result: the text promises dates but the UI shows city selection.

**Root cause**: The LLM doesn't know the frontend will override with a citySelector. In `PlannerChat.tsx` (lines 1726-1780), when a destination suggestion is selected, the code creates a loading message then replaces it with the citySelector widget using `t("planner.chat.whichCityToVisit")`. But when the LLM responds to "ok", there's a separate path where the LLM's text is kept and the citySelector gets attached by the imperative handler flow.

Looking at the trace: the `update_flight_widget` tool sets `toCountryCode: "MX"` which triggers the country selection event, which calls `useChatImperativeHandlers.injectSystemMessage()`. But the LLM already generated its own message with dates text. There are now TWO messages competing.

**Fix**: When the imperative handler detects that a `citySelector` needs to be injected for a country, it should check if the last assistant message already mentions "dates" and either:
- Replace the LLM's text with the proper city selection text, OR
- Skip injecting a duplicate if the LLM message already has the correct context

The cleanest fix: in `useChatImperativeHandlers.ts`, when injecting a city selector system message, check if the most recent assistant message (within last 2 seconds) was an LLM response about the same country and replace its text with the city selection prompt instead of adding a new message.

| File | Change |
|------|--------|
| `src/components/planner/chat/hooks/useChatImperativeHandlers.ts` ~line 98-170 | In `injectSystemMessage`, check if the latest assistant message (added within last 3 seconds) already references the same country. If so, update that message's text and widget instead of creating a new one. |

---

### Issue 3: `sessionEntities.destinations` is empty after Mexique is confirmed

**Problem**: The `sessionEntities` extraction in `useSessionContext.ts` uses regex patterns on user messages and widget interaction events (`destination_selected`, `city_selected`). But when the user says "choisi moi la moins chers" and then "ok", neither triggers those interaction types. The LLM picks Mexique in text, not via a widget click.

**Root cause**: In `useSessionContext.ts` (line 131-143), destinations are extracted from widget interactions of type `destination_selected` or `city_selected`. When the LLM chooses a destination on behalf of the user (delegate_choice), there's no widget interaction tracked. The regex-based extraction from user text also won't catch "Mexique" because it's only in the assistant's text, not the user's.

**Fix**: Also scan assistant messages for confirmed destination names when `flightData.toCountryName` is set. Or better: when `updateMemory` is called with `arrival.country`, also inject a synthetic widget interaction of type `destination_selected`.

| File | Change |
|------|--------|
| `src/components/planner/chat/hooks/useSessionContext.ts` ~line 117-160 | In the `sessionEntities` useMemo, also check assistant messages for destination confirmations. Specifically, look at messages where `widgetData?.citySelection?.countryName` is set, or where the message confirms a destination. |
| Alternative: `src/components/planner/PlannerChat.tsx` ~line 1710-1720 | After `updateMemory` with arrival country, call `widgetTracking.trackInteraction('destination_selected', { destinationName: destination.countryName })` to register a synthetic interaction. |

The second approach (tracking a synthetic interaction) is cleaner because it uses the existing pipeline.

---

### Issue 4: Quick reply "Suggere-moi des destinations" appears after destination is already chosen

**Problem**: The quick reply chip "Suggere-moi des destinations" shows at the bottom even though the user already chose Mexique and is now in the city selection phase.

**Root cause**: In `QuickReplies.tsx` (lines 389-402), the condition is:
```
if ((recentTypes.has("style_configured") || recentTypes.has("interests_selected")) && 
    flowState && !flowState.hasDestinationCity)
```
Since `hasDestinationCity` checks `memory.arrival?.city` (not country), it's still `false` at this stage. The code doesn't check `flowState.hasDestination` (which checks country).

**Fix**: Add `!flowState.hasDestination` to the condition. If a country is already selected (even without a city), don't suggest "find destinations":

| File | Change |
|------|--------|
| `src/components/planner/chat/QuickReplies.tsx` ~line 390 | Change condition to: `&& !flowState.hasDestinationCity && !flowState.hasDestination` |
| `src/components/planner/chat/QuickReplies.tsx` ~line 421 | Same fix for the fallback "Inspirez-moi" chip: also check `!flowState.hasDestination` |

The `flowState` already has `hasDestination` (set at line 235 of useUnifiedIntentRouter.ts: `!!(memory.arrival?.country || memory.arrival?.countryCode)`), we just need to pass it to the quick replies and use it.

---

### Issue 5: `reasoning` is null for ALL responses (Chain of Thought completely bypassed)

**Problem**: Every single `rawResponse` has `"reasoning": null`. The `plan_response` tool is never called. The debug trace shows no `plan_response` tool execution for any of the 4 interactions. This means the Chain of Thought (CoT) system is entirely non-functional.

**Root cause**: The `plan_response` tool is included in the tools array, but the LLM is never forced to call it (unlike `classify_intent` which uses `tool_choice: "required"`). The system prompt says "tu DOIS appeler cet outil" but the LLM ignores it. This is a known issue with optional tool enforcement.

**Fix**: This is not a regression from our previous fixes (the debug reset was correct). The issue is that `plan_response` has always been optional. Two options:
1. **Quick fix**: Accept that reasoning is optional and remove the "OBLIGATOIRE" language to avoid confusion in the debug panel
2. **Proper fix**: Add a dedicated lightweight reasoning pass (like the classify_intent pass) that forces `tool_choice` for `plan_response` before the main ReAct loop

Given the added latency of another LLM call, option 1 is recommended for now. The reasoning tool adds value when it fires, but forcing it adds ~2s latency per message.

| File | Change |
|------|--------|
| `supabase/functions/planner-chat/tools/reasoningEngine.ts` ~line 12 | Change description from "OBLIGATOIRE" to "RECOMMANDE" to reflect reality |

---

### Summary

| # | Issue | File(s) | Type | Priority |
|---|-------|---------|------|----------|
| 1 | LLM lists options with preferenceStyle widget | `planner-chat/index.ts` | Prompt contradiction | High |
| 2 | Text says "dates" but widget shows citySelector | `useChatImperativeHandlers.ts` | Message collision | High |
| 3 | sessionEntities.destinations empty after choice | `PlannerChat.tsx` | Missing tracking | Medium |
| 4 | Stale "Suggere-moi" quick reply after destination chosen | `QuickReplies.tsx` | Wrong condition | Medium |
| 5 | Chain of Thought never fires | `reasoningEngine.ts` | Optional tool | Low |

