
## Root Cause Analysis + Full Redesign Plan

### Bug 1: Links in the "Planifier blocked" message navigate to a new page

**Root cause** is in `PlannerChat.tsx` lines 306-311. The message is built using Markdown link syntax:
```
`⬜ ✈️ **Vol** → [Voir](tab:flights)`
```
`MarkdownMessage` renders this through `ReactMarkdown` + `rehypeSanitize`. The `href="tab:flights"` is a custom protocol. The `sanitizeHref()` function in `MarkdownMessage.tsx` only blocks `javascript:`, `data:`, and `vbscript:` — it does NOT intercept `tab:`. So the browser receives a real `<a href="tab:flights">` link and tries to navigate, opening a broken page.

**Fix:** The `planifier:blocked` message must NOT use Markdown links at all. Instead of injecting raw markdown text with `[Voir](tab:...)` links, the message should use the existing `quickReplies` mechanism (which renders proper React buttons via `QuickReplies.tsx`) OR inject the message as a special structured message type with navigation buttons rendered outside of `ReactMarkdown`.

The cleanest approach: the `planifier:blocked` message is injected with a `quickReplies` array containing the navigation buttons. These render as styled buttons (not anchors) and call `eventBus.emit('tab:change', ...)` when clicked — exactly the pattern already used elsewhere in the codebase.

### Bug 2: SmartSuggestions placement below input is wrong

The user is correct — suggestions below the input is confusing. The fundamental issue is that SmartSuggestions are used for two different purposes:
1. **Contextual inspiration** ("Inspirez-moi", "Destination soleil") — these are conversational starters, they belong inline in the chat as a welcome state.
2. **Quick autocomplete chips** — appearing while the user is thinking of what to type.

**New approach:** SmartSuggestions are **hidden entirely from the input zone**. Instead, when the chat has no messages yet (or only the initial greeting), show them as suggestion cards directly in the message area (like ChatGPT's empty state). This eliminates the clutter below the input and makes the purpose of suggestions obvious.

### UI Redesign: Input Zone (ChatGPT-inspired)

**Current problems:**
- TripStatusBar chips (Destination, Dates) and SmartSuggestion chips look the same → confusing
- Bug report text clutters the space even at zero messages
- Suggestions below input look like a toolbar attached to the input

**New layout:**
```
┌──────────────────────────────────────────────────┐
│  Messages area (with empty-state cards if no      │
│  messages)                                        │
│                                                   │
│  [ ✈️ Inspirez-moi ] [ 🏖️ Week-end ] [ ... ]     │  ← Only when no messages / first message
│                                                   │
├──────────────────────────────────────────────────┤
│  [ 📍 Paris ] [ 📅 3 jan→10 jan ] [ 👤 2 voy. ]  │  ← TripStatusBar: only when data exists
│  ┌────────────────────────────────────────────┐  │
│  │ Pose une question à ton assistant...    ↗  │  │  ← Input box
│  └────────────────────────────────────────────┘  │
│  Vous avez eu un problème? [Cliquez ici]          │  ← Only if canReport===true, always pinned bottom
└──────────────────────────────────────────────────┘
```

SmartSuggestions are rendered **inside the messages container**, positioned as floating chips just above the input zone, visible only when there are zero non-hidden user messages (empty/starter state). They disappear when the user starts chatting.

### Changes

#### 1. `src/components/planner/PlannerChat.tsx` — Fix blocked message + move suggestions

**Fix `handlePlanifierBlocked`:**
- Remove all `[Voir](tab:...)` Markdown link syntax entirely
- Build a clean, readable text (no links in markdown body)
- Add a `quickReplies` array to the injected message, containing navigation buttons for each missing step
- Example:
  ```typescript
  const guidanceMessage = {
    id: `planifier-blocked-${Date.now()}`,
    role: 'assistant' as const,
    text: variation(statusLines), // clean text, no markdown links
    quickReplies: missingSteps.map(step => ({
      id: `goto-${step}`,
      label: step === 'flights' ? '✈️ Voir les vols' : step === 'hotels' ? '🏨 Voir les hôtels' : '🧭 Voir les activités',
      action: { type: 'navigate' as const, tab: (step === 'flights' ? 'flights' : step === 'hotels' ? 'stays' : 'activities') as any },
      variant: 'primary' as const,
    })),
  };
  ```
- The quickReplies render as styled buttons via the existing `QuickReplies` component — no browser navigation, pure eventBus.

**Move SmartSuggestions:**
- Remove `<MemoizedSmartSuggestions>` from the input zone div
- Add it inside the messages container, rendered after the last message only when `userMessageCount === 0` (or `visibleMessages.filter(m => m.role === 'user').length === 0`)
- This makes suggestions appear as "starter chips" inside the chat area, disappearing on first send — identical to ChatGPT's empty state pattern

#### 2. `src/components/planner/chat/ChatInputArea.tsx` — Clean up & polish

- Remove the `messagesUntilReport` prop entirely (unused, causes clutter)
- Keep the bug report line but only render it when `canReport === true` (already done) — style it as `absolute bottom-0` pinned to the bottom of the input container so it never affects layout
- Polish: input gets `rounded-2xl`, border gets slightly stronger `border-border/60`, focus ring is more visible `focus-within:ring-2 focus-within:ring-primary/30`
- Reduce bottom padding from `p-4` to `px-4 pb-2 pt-2` to make the zone more compact

#### 3. `src/components/planner/TripPriceBar.tsx` — Fix the step tracker design

The step tracker circles are fine in concept but the layout needs cleanup:
- Remove the **"Passer" text link below the circle** (too small, hard to tap, visually buried). Replace with a small `×` or "Ignorer" chip that appears in the **Activités label line** only when the step is eligible.
- Keep the `ring` for the active step but reduce its size — no pulse, just a clean static ring
- Make the connector lines slightly wider (`h-[2px]`) and more visible
- The whole bar should be more compact: reduce height to `py-2` (not `py-3`)

#### 4. `src/components/planner/chat/MarkdownMessage.tsx` — Sanitize `tab:` protocol

Add `tab:` to the blocked URI list in `sanitizeHref` as a safety net for any future cases where `tab:` links might appear in markdown:
```typescript
if (/^(javascript|data|vbscript|tab):/i.test(href)) return "#";
```
This prevents any future regression where a `tab:` link accidentally ends up in rendered markdown.

---

### Files to Modify

| File | Change |
|---|---|
| `src/components/planner/PlannerChat.tsx` | Fix `handlePlanifierBlocked` — remove Markdown links, use `quickReplies` array instead; move SmartSuggestions inside the messages area (visible only on empty state) |
| `src/components/planner/chat/ChatInputArea.tsx` | Remove `messagesUntilReport` prop; compact padding; polish input styling; keep bug report pinned at bottom, only if `canReport` |
| `src/components/planner/TripPriceBar.tsx` | Replace "Passer" text link below circle with an inline "Ignorer" chip in the label; compact bar height; cleaner connector lines |
| `src/components/planner/chat/MarkdownMessage.tsx` | Add `tab:` to blocked href protocols in `sanitizeHref` |

No new files. No new dependencies.
