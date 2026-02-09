

## Plan: Fix Style-First Priority + Widget Rendering for Dietary/MustHaves

### Root Cause 1: Style widget never shows first

**Problem**: The backend override at `planner-chat/index.ts` line 414 checks `!preferencesState.style`, but `preferencesState.style` maps to `travelStyle` (e.g., "couple"), which **defaults to "couple"** in `DEFAULT_PREFERENCES`. So it's ALWAYS truthy. The override never fires.

**Fix**: Instead of checking `travelStyle`, send a new `styleAxesConfigured` boolean from the frontend. This flag should be `false` when all styleAxes are still at their defaults (50, 50, 50, 50) and `true` after the user interacts with the sliders.

**Files**:
- `src/components/planner/PlannerChat.tsx` (~line 982-984): Change `style` to track whether styleAxes were manually configured, not just `travelStyle`.
- `supabase/functions/planner-chat/index.ts` (~line 414): Check `!preferencesState.styleAxesConfigured` instead of `!preferencesState.style`.
- `supabase/functions/planner-chat/index.ts` (~line 553-556): Parse the new field from request body.
- `src/components/planner/chat/hooks/useChatStream.ts` (~line 204): Update the type to include `styleAxesConfigured`.

### Root Cause 2: Dietary/MustHaves widgets not rendering

**Problem**: The intent router correctly returns `shouldShowWidget: true, widgetType: "dietary"` and `setMessages` at line 1022 adds the widget. BUT then at line 1304-1311, a SECOND `setMessages` runs:

```typescript
const finalWidget = widget || m.widget;
return { ...m, text: cleanContent, widget: finalWidget, widgetData: finalWidgetData };
```

`widget` comes from `widgetFlow.determineNextWidget()` which returns `undefined` when there's no flight data. Then `finalWidget = undefined || m.widget`. This SHOULD work because React processes functional updates in order... but the defensive approach is to NOT overwrite `widget` when there's no flight-flow widget to set.

**Fix**: Change line 1309 to be more explicit:

```typescript
// Only override widget if flight-flow determined one; otherwise keep whatever was set by intent router
const finalWidget = widget ? widget : m.widget;
const finalWidgetData = widget ? widgetData : (m.widgetData || undefined);
```

This is functionally the same as `||` for non-empty strings but is clearer and avoids potential issues with falsy values. More importantly, when `widget` is `undefined` AND `m.widget` is also `undefined` (due to React batching timing), we need an additional safeguard.

**Additional safeguard**: Store the intent-router widget result in a `ref` and use it as a final fallback:

```typescript
// Before intent processing
const intentWidgetRef = useRef<WidgetType | null>(null);

// In intent processing (line 1019)
intentWidgetRef.current = widgetType;

// In final message update (line 1309)
const finalWidget = widget || m.widget || intentWidgetRef.current;
```

**File**: `src/components/planner/PlannerChat.tsx`

### Summary of changes

| File | Change |
|------|--------|
| `src/components/planner/PlannerChat.tsx` | 1. Send `styleAxesConfigured` boolean in preferencesState. 2. Add `intentWidgetRef` to ensure widget is never lost between setMessages calls. 3. Use ref as fallback in final message update. |
| `src/components/planner/chat/hooks/useChatStream.ts` | Add `styleAxesConfigured` to the `preferencesState` type. |
| `supabase/functions/planner-chat/index.ts` | 1. Parse `styleAxesConfigured` from request. 2. Use it instead of `style` in the preference-first override check. |
| `supabase/functions/planner-chat/tools/intentClassifier.ts` | Update prompt description to mention styleAxes vs travelStyle distinction. |
| `supabase/functions/planner-chat/tools/reasoningEngine.ts` | Update CoT instructions to mention styleAxes check. |

