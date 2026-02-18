
## Diagnosis: Why Streaming Shows as Blocks

After reading the full pipeline (`useChatSubmit.ts` → `useChatStream.ts` → `ChatMessageBubble.tsx`), the root cause is now clear.

### The Actual Problem

The streaming text is stored inside the `messages` array (`useState<ChatMessage[]>`). On every token, `setMessages(updateMessageById(...))` is called, which:

1. Creates a **new array copy** of all messages
2. Finds and replaces the target message object
3. Triggers a React re-render of the entire list

Even with `flushSync`, React 18 detects that `setMessages` is being called inside a context that started with other state updates (`setIsLoading(true)` ran just before `streamResponse` was awaited), and **batches the synchronous flushSync calls** — resulting in all tokens being grouped into one paint at the end.

The `ChatMessageBubble` is wrapped in `React.memo` with a custom comparator, which correctly detects changes to `pm.text`, but the problem is upstream: **React never paints the intermediate states**.

### The Correct Fix: Separate Streaming State

The industry-standard solution (used by ChatGPT, Claude, Mistral) is to **decouple the streaming text from the messages array**:

- Keep a **separate `useState<string>`** (`streamingText`) that holds only the in-flight content for the current message
- Keep a **separate `useState<string>`** (`streamingMessageId`) to know which bubble to render it in
- During streaming, update `streamingText` directly — this is a single, lightweight state update with no array copy
- On stream completion, merge the final text back into `messages`

This way, `setMessages` is called only **twice** per exchange (once to add the typing bubble, once to finalize), while `setStreamingText` is called on every token — fast, isolated, batching-free.

### Secondary Fix: Remove Dots During Streaming

Currently `isTyping: true` shows the three dots until the first `onContentUpdate` call. The fix is:
- Set `isTyping: false` and start showing `streamingText` as soon as the first content chunk arrives (even a single letter)
- The `ChatMessageBubble` will render the live `streamingText` prop instead of dots

---

## Implementation Plan

### 1. `src/components/planner/PlannerChat.tsx`

Add two new state variables:
```
const [streamingText, setStreamingText] = useState("")
const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
```

Pass them down to `ChatMessageBubble` via `visibleMessages` — or better, inject them directly into the rendered bubble by checking `m.id === streamingMessageId` and substituting `streamingText` as the text prop.

### 2. `src/components/planner/chat/hooks/useChatSubmit.ts`

Modify the `onContentUpdate` callback:

```typescript
(id, text2, isComplete) => {
  if (isComplete) {
    // Finalize: merge into messages array (one update)
    opts.setStreamingMessageId(null);
    opts.setStreamingText("");
    opts.setMessages(updateMessageById(id, { 
      text: text2, 
      isStreaming: false, 
      isTyping: false 
    }));
  } else {
    // Streaming: update ONLY the lightweight string state
    opts.setStreamingMessageId(id);
    opts.setStreamingText(text2);
  }
}
```

No `flushSync` needed. No RAF needed. React will paint each `setStreamingText` update immediately because it's a simple primitive state update on its own.

### 3. `src/components/planner/chat/ChatMessageBubble.tsx`

Add `streamingText?: string` prop. When the bubble's `m.id` matches the streaming message, render `streamingText` instead of `m.text`:

```tsx
const displayText = streamingText !== undefined ? streamingText : m.text;
```

This makes the dots disappear on the very first letter and text appears word-by-word.

### 4. `src/components/planner/chat/MarkdownMessage.tsx`

No changes needed — it already handles `isStreaming` correctly (renders raw text during stream).

---

## Flow After Fix

```text
User sends message
  └─► setMessages([...prev, typingBubble])          ← isTyping: true → dots show
  └─► streamResponse() begins

First SSE token arrives
  └─► setStreamingMessageId(messageId)
  └─► setStreamingText("Bon")                        ← dots vanish, "Bon" appears
  
Second token arrives
  └─► setStreamingText("Bonjour")                    ← "jour" appears immediately

...every token: ONE lightweight setState, ONE React paint

Stream ends
  └─► setStreamingText("")
  └─► setStreamingMessageId(null)
  └─► setMessages(updateMessageById(...))            ← final text persisted
```

### Why This Works

- `setStreamingText` updates a single `string` primitive — React schedules an immediate paint without batching interference
- `setMessages` is only called at start and end — no expensive array copies during streaming
- No `flushSync`, no `requestAnimationFrame`, no `MutationObserver` needed for streaming
- The scroll hook (`useChatScroll`) continues to work via `MutationObserver` — it watches DOM mutations which will now happen on every token

---

## Files to Modify

1. `src/components/planner/PlannerChat.tsx` — add `streamingText` / `streamingMessageId` state, inject into render
2. `src/components/planner/chat/hooks/useChatSubmit.ts` — split `onContentUpdate` into streaming vs final path, remove `flushSync`
3. `src/components/planner/chat/ChatMessageBubble.tsx` — accept and render `streamingText` prop
4. `src/components/planner/chat/hooks/useChatStream.ts` — remove `flushSync` import (no longer needed there)
