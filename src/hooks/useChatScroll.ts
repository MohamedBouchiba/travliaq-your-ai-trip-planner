/**
 * useChatScroll - Intelligent scroll management for chat
 *
 * Features:
 * - Detects when user is manually scrolling up to read history
 * - Doesn't force scroll to bottom when user is reading
 * - Shows new message indicator when messages arrive during history reading
 * - RAF-loop for smooth real-time scroll during streaming (like ChatGPT/Claude)
 * - Uses a ref to stop the RAF-loop IMMEDIATELY on user scroll (no React cycle delay)
 */

import { useState, useRef, useCallback, useEffect, type RefObject } from "react";

interface UseChatScrollOptions {
  messagesCount: number;
  containerRef: RefObject<HTMLDivElement | null>;
  threshold?: number; // Distance from bottom to consider "at bottom"
  isStreaming?: boolean; // When true, RAF-loop scrolls to bottom continuously
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
  const isScrollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref-based flag that the RAF loop reads synchronously (no React cycle delay)
  const isUserScrollingRef = useRef(false);

  // Check if container is scrolled to bottom
  const isAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [containerRef, threshold]);

  // Scroll to bottom with optional animation
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    isUserScrollingRef.current = false;
    setIsUserScrolling(false);
    setNewMessageCount(0);
    setShowNewMessageIndicator(false);
  }, [containerRef]);

  // Handle scroll events — updates ref immediately, state asynchronously
  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();

    if (atBottom) {
      // Back at bottom: re-enable auto-scroll immediately via ref
      isUserScrollingRef.current = false;
      setIsUserScrolling(false);
      setNewMessageCount(0);
      setShowNewMessageIndicator(false);
    } else {
      // User scrolled up: stop RAF-loop immediately via ref (no 150ms wait)
      isUserScrollingRef.current = true;

      // Update React state slightly debounced (avoids flickering on small scrolls)
      if (isScrollingTimeoutRef.current) clearTimeout(isScrollingTimeoutRef.current);
      isScrollingTimeoutRef.current = setTimeout(() => {
        if (!isAtBottom()) {
          setIsUserScrolling(true);
        }
      }, 80);
    }
  }, [isAtBottom]);

  // Mark all messages as read
  const markMessagesAsRead = useCallback(() => {
    setNewMessageCount(0);
    setShowNewMessageIndicator(false);
  }, []);

  // RAF-loop: continuously scroll to bottom during streaming
  // The loop reads isUserScrollingRef synchronously — stops the instant the user scrolls up
  useEffect(() => {
    if (!isStreaming) return;

    let rafId: number;
    const scrollLoop = () => {
      // Check ref (not state) for immediate reaction to user scroll
      if (!isUserScrollingRef.current) {
        const container = containerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          if (scrollHeight - scrollTop - clientHeight > 2) {
            container.scrollTop = scrollHeight;
          }
        }
      }
      rafId = requestAnimationFrame(scrollLoop);
    };
    rafId = requestAnimationFrame(scrollLoop);

    return () => cancelAnimationFrame(rafId);
  }, [isStreaming, containerRef]);

  // Track new messages when user is scrolling up
  useEffect(() => {
    const diff = messagesCount - lastMessageCountRef.current;

    if (diff > 0 && isUserScrolling) {
      setNewMessageCount((prev) => prev + diff);
      setShowNewMessageIndicator(true);
    } else if (!isUserScrolling && diff > 0) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }

    lastMessageCountRef.current = messagesCount;
  }, [messagesCount, isUserScrolling, scrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScrollingTimeoutRef.current) clearTimeout(isScrollingTimeoutRef.current);
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
