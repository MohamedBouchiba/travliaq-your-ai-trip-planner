
## Redesign: Chat Input Area + Progress Bar (TripPriceBar)

The user has identified two distinct UI problems that need to be fixed:

1. **TripPriceBar**: The blinking pulse animation is jarring. The pills + progress bar design doesn't clearly communicate the user journey.
2. **ChatInputArea bottom zone**: The screenshot shows the current design — inspiration chips at top, then travel context chips (Destination, Dates, Voyageurs), then the input box, then the bug report text. It's cluttered and not well-spaced. The bug report text takes unnecessary space and confuses users.
3. **Blocked guidance message**: Currently always the same text. Should randomize across 4-5 variations.

---

### Fix 1 — `TripPriceBar.tsx`: Remove blinking, redesign the progress flow

**Current problem**: Pills with `animate-pulse` blink constantly. The thin progress bar + small pill row is hard to understand at a glance.

**New design — a clean "step tracker" bar**:

Instead of small pills, use a horizontal step tracker (like Airbnb / Booking onboarding steps). Three numbered circles connected by a line:

```
  [1 ✓ Vols]────[2 ✓ Hôtels]────[3 Activités]    1 850 €   [Planifier →]
      ●══════════════●──────────────○
```

- **Completed step**: filled circle (green) with a checkmark
- **Active step**: outlined circle with the step number, slightly larger, a subtle shadow — NO blinking
- **Future step**: muted outlined circle
- The connecting lines are solid green when the step before is done, dashed/muted otherwise
- "Passer" for Activities: shown as a small text link below the circle when flights + hotels are done
- Zero CSS animations that loop. Only a one-time `transition` when state changes.

The bar itself becomes slightly taller (py-3) to breathe. The price moves to the right, aligned baseline.

---

### Fix 2 — `ChatInputArea.tsx` + `TripStatusBar.tsx`: Redesign the bottom input area

**Current layout** (screenshot):
```
[ ✦ Inspirez-moi ]                    ← suggestion chips (1 row, scrollable)
[ ⊙ Destination ] [ ☷ Dates ] [ ♟ 2 voyageurs ]   ← TripStatusBar chips
[ Send a message...                 ↗ ]  ← input
  Having an issue? Click here to help us fix it     ← bug report text (too visible)
```

**Problems**:
- The inspiration/suggestion chips and the travel-context chips (Destination/Dates/Travelers) look identical — user can't distinguish them
- "Having an issue? Click here..." is shown even when it's just a cooldown hint, takes vertical space unnecessarily
- The whole zone needs more visual hierarchy

**New layout**:
```
[ ⊙ Paris ] [ ☷ 3 jan → 10 jan ] [ ♟ 2 voyageurs ]   ← Trip context chips (only if data)
────────────────────────────────────────────────────
[ Send a message...                               ↗ ]   ← input box (rounder, slightly taller)
[ ✦ Inspirez-moi ] [ ✦ Inspire-moi ] [ ... ]          ← suggestion chips BELOW input (inline, small)
```

Key changes:
- **TripStatusBar** moves ABOVE the input box (already is, stays)
- **SmartSuggestions** move BELOW the input box — this mirrors ChatGPT's pattern where quick suggestions are below the text field
- **Bug report text**: Make it completely invisible by default (hidden, zero height) unless `canReport === true`. When `canReport` is true, show it as an ultra-subtle `10px` muted line. The cooldown countdown message is removed entirely (no value to user).
- **Input box styling**: Increase border-radius to `rounded-2xl`, add a slightly more pronounced border, increase internal padding slightly for breathing room

---

### Fix 3 — `PlannerChat.tsx`: Randomize blocked guidance messages

Replace the single static message with a pool of 5 variations, selected randomly when `planifier:blocked` fires:

```typescript
const BLOCKED_VARIATIONS = [
  (lines) => `Presque ! 🎯\n\n${lines}\n\n_Complète ces étapes pour débloquer **Planifier**._`,
  (lines) => `Ton voyage prend forme ! ✈️\n\n${lines}\n\n_Une fois tout sélectionné, **Planifier** sera actif._`,
  (lines) => `On y est presque 🚀\n\n${lines}\n\n_Ces éléments sont nécessaires pour construire ton itinéraire._`,
  (lines) => `Encore quelques étapes !\n\n${lines}\n\n_Ton voyage sera planifiable dès que tout est OK._`,
  (lines) => `Voici ce qu'il reste à faire 📋\n\n${lines}\n\n_Complète ces étapes, puis clique sur **Planifier** !_`,
];
// Random pick on each call
const variation = BLOCKED_VARIATIONS[Math.floor(Math.random() * BLOCKED_VARIATIONS.length)];
```

---

### Files to Modify

| File | Change |
|---|---|
| `src/components/planner/TripPriceBar.tsx` | Remove `animate-pulse`, redesign to step-tracker (numbered circles + connecting lines, no animation loops) |
| `src/components/planner/chat/ChatInputArea.tsx` | Hide bug report text by default; only show when `canReport` is true (remove cooldown text entirely); polish input box styling |
| `src/components/planner/PlannerChat.tsx` | Move `MemoizedSmartSuggestions` below `ChatInputArea`; randomize blocked message variations |
| `src/components/planner/chat/TripStatusBar.tsx` | Visual polish: slightly smaller, clearer distinction between "filled" and "empty" chips |

No new files, no new dependencies.

---

### Visual Direction for TripPriceBar

The new step-tracker design:

```text
  ① ✓           ② ✓           ③ ·
  Vols       Hôtels       Activités         1 240 €   [Planifier]
  [green]     [green]      [muted, with "Passer" link if prev done]
     ●══════════●- - - - - -○
```

- Steps: large `h-6 w-6` circles (not tiny pills)
- Active step: `ring-2 ring-offset-1 ring-primary` (static — no animation)
- Done: `bg-green-500 text-white` filled circle with `<Check>`
- Future: `border-2 border-muted-foreground/30 text-muted-foreground/40`
- Connector: left half green (solid) when prev done, right half muted (dashed) when next not done
- Label: below each circle, `text-[10px] font-medium` 
- "Passer" link appears as `text-[10px] text-primary/60 underline` below "Activités" label when eligible
