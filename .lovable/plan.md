
# Fix 3 Issues from Debug Trace Analysis

## Issue 1 (HIGH): citySelector fallback path bypass

**Root cause**: When the backend suggests `preferenceInterests` (blocked by cooldown), the fallback at line 489 does `validation.suggestedWidget || getNextRequiredWidget()`. While our previous fix made `getNextRequiredWidget()` return `null` when no country is selected, `validation.suggestedWidget` from other widget prerequisites (e.g., `tripTypeConfirm` suggests `travelersSelector`, `dateRangePicker` suggests `citySelector` in `useIntentRouter.ts`) could still inject `citySelector`. We need to guard the fallback result itself.

**File**: `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts` (lines 488-500)

**Change**: After computing `fallbackWidget`, check if it's `citySelector` and `!flowState.hasDestination`. If so, try `destinationSuggestions` instead (if preferences are filled), or set to `null`.

```typescript
// Replace lines 488-500:
// Widget can't be shown, use suggested fallback or next required
let fallbackWidget = validation.suggestedWidget || getNextRequiredWidget();

// Guard: don't fallback to citySelector if no country is selected
if (fallbackWidget === "citySelector" && !flowState.hasDestination) {
  console.log("[UnifiedIntentRouter] Fallback citySelector blocked — no country selected");
  const hasPreferences = widgetInteractions.some(i => 
    i.interactionType === "style_configured" || i.interactionType === "interests_selected"
  );
  if (hasPreferences) {
    const destValidation = canShowWidget("destinationSuggestions");
    fallbackWidget = destValidation.valid ? "destinationSuggestions" : null;
  } else {
    fallbackWidget = null;
  }
}

if (fallbackWidget) {
  if (onWidgetTriggered) onWidgetTriggered(fallbackWidget);
  return {
    shouldShowWidget: true,
    widgetType: fallbackWidget,
    action: "none",
    reason: validation.reason || "Fallback to required widget",
  };
}
```

---

## Issue 2 (MEDIUM): Debug panel shows stale flightSummary ("1 voyageur")

**Root cause**: `debugStore.setMemoryContext()` is only called inside `useChatStream.ts` (line 723) during LLM calls. Widget-only flows (city, dates, travelers, tripType) never call the LLM, so the debug panel keeps showing old context.

**File**: `src/components/planner/PlannerChat.tsx`

**Change**: Add a `useEffect` that watches key memory values and syncs the debug store whenever they change (not just during LLM calls).

```typescript
// Add near the other useEffect hooks in PlannerChat:
useEffect(() => {
  if (process.env.NODE_ENV !== "production") {
    const { setMemoryContext } = useDebugStore.getState();
    setMemoryContext({
      flightSummary: getMemorySummary(),
      preferenceContext: preferenceContext,
      widgetHistory: widgetTracking.getContextForLLM(),
      blockedWidgets: widgetCooldown.getBlockedWidgets(),
      basketSummary: getBasketSummary(),
      conversationSummary: sessionContext.buildConversationSummary(5),
      sessionEntities: sessionContext.sessionEntities,
      missingFields: missingFields?.map(getMissingFieldLabel),
    });
  }
}, [getMemorySummary, preferenceContext, widgetTracking, widgetCooldown, getBasketSummary, sessionContext, missingFields]);
```

This ensures the debug panel always reflects the real-time state, even after widget-only interactions.

---

## Issue 3 (LOW): sessionEntities.constraints concatenates unrelated messages

**Root cause**: `useSessionContext.ts` (line 119-122) joins ALL user message text with `.join(" ")` before running regex extraction. Two separate messages ("Je veux definir mes criteres obligatoires" + "non pas specialement") get merged, and the constraint regex matches across the boundary, producing "definir mes criteres obligatoires non pas specialement".

**File**: `src/components/planner/chat/hooks/useSessionContext.ts` (lines 117-128)

**Change**: Extract entities per-message individually, then merge/deduplicate.

```typescript
// Replace lines 117-128:
const sessionEntities = useMemo<SessionEntities>(() => {
  const userMessages = messages.filter((m) => m.role === "user" && m.text);

  const destinationsSet = new Set<string>();
  const datesSet = new Set<string>();
  const budgetsSet = new Set<string>();
  const constraintsSet = new Set<string>();

  for (const msg of userMessages) {
    for (const d of extractEntities(msg.text, ENTITY_PATTERNS.destinations)) destinationsSet.add(d);
    for (const d of extractEntities(msg.text, ENTITY_PATTERNS.dates)) datesSet.add(d);
    for (const b of extractEntities(msg.text, ENTITY_PATTERNS.budgets)) budgetsSet.add(b);
    for (const c of extractEntities(msg.text, ENTITY_PATTERNS.constraints)) constraintsSet.add(c);
  }

  const destinations = Array.from(destinationsSet);
  const dates = Array.from(datesSet);
  const budgets = Array.from(budgetsSet);
  const constraints = Array.from(constraintsSet);
```

---

## Summary

| # | Issue | File | Change |
|---|-------|------|--------|
| 1 | citySelector fallback bypass | `useUnifiedIntentRouter.ts` L488-500 | Guard fallback result against citySelector when no country |
| 2 | Stale debug memoryContext | `PlannerChat.tsx` | Add useEffect to sync debug store on memory changes |
| 3 | Constraint concatenation | `useSessionContext.ts` L117-128 | Per-message entity extraction instead of joined text |
