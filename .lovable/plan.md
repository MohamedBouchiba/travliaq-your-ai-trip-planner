
## Guided Trip Planning Journey — Full Memory Integration + In-Chat Guidance

### Context & User's Priorities

The user has two closely related requests:
1. **Selection → Memory**: Every user action (flight, hotel, activity, preferences) must be captured in a structured, unified memory object — not just displayed. This object is the foundation for the "Planifier" orchestration job.
2. **In-chat blocked-step guidance instead of a pop-up**: When the user clicks "Planifier" before completing required steps, the guidance should appear as a chat message (which is already the user's primary interaction surface), not a modal dialog. The user asked for a recommendation here — and the pattern is excellent UX because it's contextual, dismissable, and matches the existing chat-first design.

---

### Current State Audit

| Component | Current behavior | What's missing |
|---|---|---|
| `PlannerPanel.tsx` `handleFlightSelect` | Simple trip: `console.log`. Multi: saves to local state. | Never writes to `tripBasketStore` |
| `AccommodationPanel.tsx` | Hotel detail view has an `onBook` button that just opens external URL | No `tripBasketStore.addBasketItem` call |
| `ActivitiesPanel.tsx` `handleAddActivity` | Writes to `activityMemoryStore` (correct) | Does NOT write to `tripBasketStore` |
| `TripPriceBar.tsx` | Reads `basketItems` — correct source | Planifier button fires `onPlanTrip` unconditionally; no step validation |
| Chat (`PlannerChat.tsx`) | Already knows `getBasketSummary()` from `tripBasketStore` | Not listening for a "planifier:blocked" event to inject guidance |
| `eventBus.ts` | Has `tab:change` event for tab navigation | No `basket:itemSelected` or `planifier:blocked` event |

---

### Architecture

The fix follows the existing pub/sub pattern via `eventBus`:

```text
User clicks "Sélectionner" on a flight
   └─► addBasketItem(type:'flight') in tripBasketStore  [memory write]
   └─► eventBus.emit("basket:itemSelected", {type:'flight'})

TripPriceBar reads basketStore → pill turns green ✅

User clicks "Planifier" while flights missing
   └─► TripPriceBar: isComplete === false
   └─► eventBus.emit("planifier:blocked", {missingSteps, completedSteps})

PlannerChat listens to "planifier:blocked"
   └─► injects assistant message with step status directly in the chat
   └─► message includes clickable tab links via eventBus.emit("tab:change")
```

---

### Changes by File

#### 1. `src/lib/eventBus.ts` — Add 2 new typed events

```typescript
"basket:itemSelected": {
  type: 'flight' | 'hotel' | 'activity';
  name: string;
  price: number;
  city?: string;
};
"planifier:blocked": {
  completedSteps: string[];
  missingSteps: string[];
};
```

These are the only two missing channels. Both follow the exact same mitt pattern already used throughout.

---

#### 2. `src/stores/tripBasketStore.ts` — Add `replaceItemsByType` helper

Currently, if the user re-selects a flight, a duplicate is added. We need:

```typescript
replaceItemsByType: (type: BasketItemType, item: Omit<BasketItem, 'id' | 'addedAt'>) => string;
```

This removes all existing items of the given type for the same `destinationCity` (or all flights for simplicity), then calls `addBasketItem`. This ensures the basket is always the **single source of truth** with no duplicates.

---

#### 3. `src/components/planner/PlannerPanel.tsx` — Wire flights → basket

In `handleFlightSelect`:
- For **simple trips** (roundtrip / oneway): call `replaceItemsByType('flight', {...})` with the full `FlightDetails` object populated from the `FlightOffer` fields.
- For **multi-destination**: call `replaceItemsByType('flight', {...legIndex})` per leg after the current leg-tracking logic. A visual recap (already rendered at line 1503) confirms all legs are collected.
- Emit `eventBus.emit("basket:itemSelected", {type:'flight', name, price})`.

The `FlightDetails` type already has all fields needed (`airline`, `departure.airport`, `arrival.airport`, `duration`, `stops`, etc.) — no schema changes required.

---

#### 4. `src/components/planner/HotelDetailView.tsx` — Add "Choisir cet hôtel" button

The detail view already has a sticky footer with an `onBook` prop. We add a second primary action **"Choisir cet hôtel"** next to the external "Réserver" button.

The `onBook` prop in `AccommodationPanel.tsx` (line 907) will be split:
- `onBook`: external URL → unchanged
- New `onSelect`: calls `replaceItemsByType('hotel', {...})` with `HotelDetails` populated from the hotel object + accommodation memory dates.

The `AccommodationPanel` passes `onSelect` to `HotelDetailView` and handles the basket write there. This is the correct layer — `AccommodationPanel` already has access to `memory.checkIn`, `memory.checkOut`, `activeAccommodation.city`, etc.

After selection: emit `eventBus.emit("basket:itemSelected", {type:'hotel', name, price, city})`.

---

#### 5. `src/components/planner/ActivitiesPanel.tsx` — Wire activities → basket

In `handleAddActivity`, after `addActivityFromSearch(...)` (which writes to `activityMemoryStore`), also call:

```typescript
addBasketItem({
  type: 'activity',
  status: 'selected',
  name: viatorActivity.title,
  price: viatorActivity.pricing.from_price,
  currency: 'EUR',
  description: viatorActivity.duration?.formatted,
  destinationCity: activeCity.city,
  details: { activityName: viatorActivity.title, city: activeCity.city, ... }
});
```

And emit `eventBus.emit("basket:itemSelected", {...})`.

Note: Activity removals (`handleRemoveActivity`) should also call `removeBasketItem` for the matching item — we find it by matching `type:'activity'` + `destinationCity` + `name`.

---

#### 6. `src/components/planner/TripPriceBar.tsx` — Gating logic + visual step guidance

**a) Activities step: "optional with explicit skip"**

Read `explicitRequirements.wantsActivities` from the store:
- `null` → step is pending (amber / animated pulse on the Activités pill)
- `false` → user skipped → step is green (SkipForward icon instead of Check)
- `true` or items exist → step is green (Check icon)

**b) `isComplete` logic updated:**

```typescript
const flightsDone = completedSteps.includes('flights');
const hotelsDone = completedSteps.includes('hotels');
const activitiesDone = completedSteps.includes('activities') || explicitRequirements.wantsActivities === false;
const isComplete = flightsDone && hotelsDone && activitiesDone;
```

**c) "Passer" pill for Activities:**

When `flightsDone && hotelsDone && !activitiesDone`, show a small "Passer →" text inside the Activités pill. Clicking it calls `setExplicitRequirement('wantsActivities', false)`.

**d) Planifier button state:**

```tsx
<Button
  variant={isComplete ? 'hero' : 'secondary'}
  onClick={isComplete ? onPlanTrip : handleBlockedClick}
  className={cn("...", !isComplete && "opacity-60 cursor-not-allowed")}
>
```

`handleBlockedClick` emits `eventBus.emit("planifier:blocked", {completedSteps, missingSteps})`.

**e) Active step indicator:**

The first incomplete step gets a subtle `ring-2 ring-primary/40 animate-pulse` around its pill so the user always knows where to act next.

---

#### 7. `src/components/planner/PlannerChat.tsx` — Listen for blocked guidance + inject as chat message

Add a `usePlannerEvent("planifier:blocked", ...)` listener (using the existing `usePlannerEvent` hook from `eventBus.ts`).

When fired, inject a structured assistant message into the chat (using the same `setMessages` pattern already used in `useChatImperativeHandlers`):

```
✈️ Vol         — ✅ Paris → Tokyo sélectionné
🏨 Hôtel       — ✅ Hôtel Okura Tokyo sélectionné
🧭 Activités   — ⬜ Pas encore ajouté
                  → [Voir les activités]  (clickable, emits tab:change)

Ajoute une ou plusieurs activités, ou clique "Passer" dans la barre du bas si tu n'en veux pas. Ensuite, "Planifier" sera disponible ! 🚀
```

The message is rendered as a regular assistant bubble (`role:'assistant'`, `isTyping:false`) so it streams in with the existing `streamingText` mechanism (or appears instantly since no streaming is needed here — it's a local injection). A `[Voir les activités]` link-style button in the bubble body emits `eventBus.emit("tab:change", { tab: "activities" })` — the same mechanism already used everywhere.

**Why chat instead of a pop-up?** The user's instinct is correct and aligned with the product's chat-first philosophy:
- The chat is always visible; a pop-up creates modal overhead
- The message stays in history, so the user can scroll back and click the tab link
- It's consistent with how the AI already guides the user throughout the flow
- No new UI component needed — reuses the exact same bubble infrastructure

---

### Memory Completeness Guarantee

After these changes, the `tripBasketStore` will contain a structured record of **every selection** the user makes:

```typescript
// Example basket state when ready to "Planifier":
basketItems: [
  { type: 'flight', name: 'CDG → NRT', price: 850, details: { FlightDetails } },
  { type: 'hotel', name: 'Hôtel Okura', price: 1200, details: { HotelDetails } },
  { type: 'activity', name: 'Tour Skytree', price: 35, details: { ActivityDetails } },
]
// Plus:
// flightMemoryStore   → departure, arrival, dates, passengers, cabin class
// accommodationMemoryStore → city, nights, rooms, budget filters
// activityMemoryStore → full activity entries by destination
// preferenceMemoryStore → style axes, pace, interests, comfort level
```

When "Planifier" is clicked with `isComplete === true`:
- `onPlanTrip()` fires → `setViewMode('itinerary')` in `TravelPlanner.tsx`
- The itinerary view can read all four stores + the basket to orchestrate the planning job
- `getBasketSummary()` and `getBasketForLLM()` are already implemented in the store and sent to the LLM via `buildLLMContext.ts`

---

### Files to Modify

| File | Change |
|---|---|
| `src/lib/eventBus.ts` | Add `basket:itemSelected` and `planifier:blocked` events |
| `src/stores/tripBasketStore.ts` | Add `replaceItemsByType` helper method |
| `src/components/planner/PlannerPanel.tsx` | Wire `handleFlightSelect` → `replaceItemsByType` + emit event |
| `src/components/planner/HotelDetailView.tsx` | Add `onSelect` prop and "Choisir cet hôtel" button in sticky footer |
| `src/components/planner/AccommodationPanel.tsx` | Pass `onSelect` to `HotelDetailView`, implement basket write |
| `src/components/planner/ActivitiesPanel.tsx` | In `handleAddActivity` / `handleRemoveActivity`, sync with `tripBasketStore` |
| `src/components/planner/TripPriceBar.tsx` | Full step logic: `wantsActivities`, active pulse, "Passer" pill, gated Planifier, emit `planifier:blocked` |
| `src/components/planner/PlannerChat.tsx` | Listen to `planifier:blocked`, inject structured in-chat guidance message |

No new files. No new dependencies.
