
## Root Cause Analysis

### Bug 1: Block Streaming (No Word-by-Word Effect)

The problem is **entirely on the backend**, in `supabase/functions/planner-chat/index.ts`, inside `createSimulatedStreamingResponse` (used when the LLM response has already been pre-generated via tool calls).

```typescript
// Current broken code — tight synchronous loop, no await
const words = content.match(/\S+\s*/g) || [content];
for (const word of words) {
  controller.enqueue(encoder.encode(...));  // All enqueued in ONE microtask
}
controller.close();
```

Because there is **no `await` between enqueue calls**, the Deno runtime buffers all words and flushes them in a single TCP packet. The client's `reader.read()` returns all of them at once — the frontend never has a chance to render intermediate states.

The **real streaming path** (direct OpenAI stream, lines 1327-1356) works correctly because the `await reader.read()` naturally yields between chunks as the network delivers them. But when the backend has pre-collected the response (tool use path), it falls back to `createSimulatedStreamingResponse`, which is broken.

**Fix:** Add `await new Promise(resolve => setTimeout(resolve, 0))` (or a small delay like 15ms) between each word enqueue to yield the event loop and let Deno flush each word as a separate TCP frame.

### Bug 2: Repeating Style Widget Loop

From the screenshots: when the user says "Je ne sais pas où partir, inspirez-moi" a second time (after already configuring their style), the bot shows the style selector again instead of recalling the previously chosen style.

This happens because:
1. The `widgetCooldown` system tracks shown widgets, but the prompt sent to the LLM may not clearly state "style already configured" 
2. OR the `styleAxesUserConfirmed` flag is not being sent in the `blockedWidgets` or `preferencesState` context, so the LLM re-triggers the style widget

**Fix:** When `styleAxesUserConfirmed` is true in the preference memory, explicitly add `"preferenceStyle"` to `blockedWidgets` before sending to the backend, so the LLM cannot trigger it again.

---

## Technical Changes

### 1. `supabase/functions/planner-chat/index.ts` — Fix Simulated Streaming

Replace the tight synchronous loop with one that yields every N words to allow the TCP stack to flush:

```typescript
// NEW: yield every word to let Deno flush the stream buffer
const words = content.match(/\S+\s*/g) || [content];
for (const word of words) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: word })}\n\n`));
  // Yield the Deno event loop so each word is flushed as a separate chunk
  await new Promise(resolve => setTimeout(resolve, 0));
}
```

The `setTimeout(resolve, 0)` yields to Deno's event loop, which allows the HTTP response buffer to flush the previously enqueued bytes before continuing. This is the standard technique for simulated streaming in server environments.

### 2. `src/components/planner/chat/hooks/buildLLMContext.ts` — Block Style Widget When Already Confirmed

When the user has already confirmed their travel style (`styleAxesUserConfirmed === true`), add `"preferenceStyle"` to `blockedWidgets` in the context sent to the backend. This prevents the LLM from re-triggering the widget.

The `preferencesState` object already exists in the context — we need to ensure that when style is configured, it explicitly adds `preferenceStyle` to the blocked list.

### 3. `src/components/planner/chat/hooks/useChatStream.ts` — Remove Stale Comment

The comment about "direct calls let React's scheduler handle batching naturally" is misleading now that we understand the real fix is on the backend. Update to reflect the actual architecture.

---

## Files to Modify

1. **`supabase/functions/planner-chat/index.ts`** — Add `await` yield in `createSimulatedStreamingResponse` word loop (the critical fix)
2. **`src/components/planner/chat/hooks/buildLLMContext.ts`** — Add `preferenceStyle` to blocked widgets when `styleAxesUserConfirmed` is true
