/**
 * useChatScroll - Intelligent scroll management for chat
 *
 * Features:
 * - Detects when user is manually scrolling up to read history
 * - During streaming: MutationObserver scrolls to bottom after each DOM update
 *   (safe: the observer checks a ref synchronously — immediate reaction to user scroll)
 * - Shows new message indicator when messages arrive during history reading
 */

import { useState, useRef, useCallback, useEffect, type RefObject } from "react";

interface UseChatScrollOptions {
  messagesCount: number;
  containerRef: RefObject<HTMLDivElement | null>;
  threshold?: number;
  isStreaming?: boolean;
}

interface UseChatScrollReturn {
  isUserScrolling: boolean;
  showNewMessageIndicator: boolean;
  newMessageCount: number;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  handleScroll: () => void;
  markMessagesAsRead: () => void;
}

export function useChatScroll({
  messagesCount,
  containerRef,
  threshold = 100,
  isStreaming = false,
}: UseChatScrollOptions): UseChatScrollReturn {
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  const lastMessageCountRef = useRef(messagesCount);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref read synchronously by the MutationObserver — no React cycle latency.
  // When the user scrolls up, this is set to true IMMEDIATELY so the observer
  // stops scrolling on the very next DOM mutation.
  const userScrollingRef = useRef(false);

  const isAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [containerRef, threshold]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    userScrollingRef.current = false;
    setIsUserScrolling(false);
    setNewMessageCount(0);
    setShowNewMessageIndicator(false);
  }, [containerRef]);

  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();

    if (atBottom) {
      // Back at bottom — immediately unlock auto-scroll
      userScrollingRef.current = false;
      setIsUserScrolling(false);
      setNewMessageCount(0);
      setShowNewMessageIndicator(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    } else {
      // User scrolled up — IMMEDIATELY block auto-scroll via ref
      // (the MutationObserver will see this before the next DOM mutation)
      userScrollingRef.current = true;

      // Debounce state update slightly to avoid flicker on tiny scrolls
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!isAtBottom()) setIsUserScrolling(true);
      }, 80);
    }
  }, [isAtBottom]);

  const markMessagesAsRead = useCallback(() => {
    setNewMessageCount(0);
    setShowNewMessageIndicator(false);
  }, []);

  // During streaming: MutationObserver watches the scroll container for DOM changes
  // (new text nodes) and scrolls to bottom if the user hasn't manually scrolled up.
  // MutationObserver fires AFTER the DOM mutation, AFTER any preceding scroll events,
  // so `userScrollingRef.current` is always up-to-date at that point.
  useEffect(() => {
    if (!isStreaming) return;
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      if (!userScrollingRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [isStreaming, containerRef]);

  // Track new messages while user is reading history
  useEffect(() => {
    const diff = messagesCount - lastMessageCountRef.current;

    if (diff > 0 && isUserScrolling) {
      setNewMessageCount((prev) => prev + diff);
      setShowNewMessageIndicator(true);
    } else if (!isUserScrolling && diff > 0) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }

    lastMessageCountRef.current = messagesCount;
  }, [messagesCount, isUserScrolling, scrollToBottom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    isUserScrolling,
    showNewMessageIndicator,
    newMessageCount,
    scrollToBottom,
    handleScroll,
    markMessagesAsRead,
  };
}
