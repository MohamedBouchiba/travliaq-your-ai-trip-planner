
# Architecture: Flow Progression & Entity Management

## Principle 1 — State-Driven Phase Transitions

**Location**: `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts` → `evaluatePhaseTransition()`

**Rule**: Phase transitions are determined by **flow state**, not by intent type. The `evaluatePhaseTransition()` function runs as a universal fallback after all intent-specific logic, regardless of what the classifier returned.

**Guards** (evaluated in order):
1. Preferences filled + no destination → `destinationSuggestions`
2. Destination city set + no dates → `dateRangePicker` / `datePicker`
3. Dates set + travelers not confirmed → `travelersSelector`

**Extensibility**: To add a new phase, add a guard to `evaluatePhaseTransition()`. No intent list needs updating.

---

## Principle 2 — Unified Entity Pipeline

**Location**: `src/components/planner/PlannerChat.tsx` → `persistExtractedEntities()`

**Rule**: All extracted entities (from intent classifier, flight extractor, or any future tool) are persisted through a single function. Sources are merged with priority: flightData > intent entities.

**Extensibility**: To persist a new entity type, add it to `persistExtractedEntities()`. No scattered `if` blocks needed.

---

## Principle 3 — Contextual Intent Classification

**Location**: `supabase/functions/planner-chat/tools/intentClassifier.ts`

**Rule**: The classifier uses **semantic rules** (not keyword lists) for phase-completion detection. The prompt instructs: "when the user indicates they have nothing more to add, classify as `confirm_selection`" — works in any language, any phrasing.

**Extensibility**: The LLM generalizes from the semantic description. No need to add keywords per language.

---

## Summary

| Principle | Function | Location | Purpose |
|-----------|----------|----------|---------|
| State-driven transitions | `evaluatePhaseTransition()` | useUnifiedIntentRouter.ts | Universal fallback for phase progression |
| Entity pipeline | `persistExtractedEntities()` | PlannerChat.tsx | Single entry point for entity persistence |
| Contextual classification | Semantic prompt rule | intentClassifier.ts | Language-agnostic phase completion detection |
