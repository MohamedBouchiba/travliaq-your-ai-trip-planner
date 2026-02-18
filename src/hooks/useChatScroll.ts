/**
 * useChatScroll - Intelligent scroll management for chat
 * 
 * Features:
 * - Detects when user is manually scrolling up to read history
 * - Doesn't force scroll to bottom when user is reading
 * - Shows new message indicator when messages arrive during history reading
 * - Provides smooth scroll to bottom functionality
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
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    
    setIsUserScrolling(false);
    setNewMessageCount(0);
    setShowNewMessageIndicator(false);
  }, [containerRef]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();
    
    if (atBottom) {
      setIsUserScrolling(false);
      setNewMessageCount(0);
      setShowNewMessageIndicator(false);
    } else {
      // User is scrolling up - set flag after a small delay to avoid flickering
      if (isScrollingTimeoutRef.current) {
        clearTimeout(isScrollingTimeoutRef.current);
      }
      
      isScrollingTimeoutRef.current = setTimeout(() => {
        if (!isAtBottom()) {
          setIsUserScrolling(true);
        }
      }, 150);
    }
  }, [isAtBottom]);

  // Mark all messages as read
  const markMessagesAsRead = useCallback(() => {
    setNewMessageCount(0);
    setShowNewMessageIndicator(false);
  }, []);

  // Track new messages when user is scrolling up
  useEffect(() => {
    const diff = messagesCount - lastMessageCountRef.current;
    
    if (diff > 0 && isUserScrolling) {
      setNewMessageCount((prev) => prev + diff);
      setShowNewMessageIndicator(true);
    } else if (!isUserScrolling && diff > 0) {
      // Auto-scroll when at bottom and new messages arrive
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    }
    
    lastMessageCountRef.current = messagesCount;
  }, [messagesCount, isUserScrolling, scrollToBottom]);

  // RAF-loop: continuously scroll to bottom during streaming (content grows but messagesCount stays same)
  // Uses behavior: "auto" (instant, no jank) — "smooth" causes visible jumping during streaming
  useEffect(() => {
    if (!isStreaming || isUserScrolling) return;

    let rafId: number;
    const scrollLoop = () => {
      const container = containerRef.current;
      if (container) {
        // Only scroll if not already at bottom (avoids unnecessary layout thrashing)
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight > 2) {
          container.scrollTop = scrollHeight;
        }
      }
      rafId = requestAnimationFrame(scrollLoop);
    };
    rafId = requestAnimationFrame(scrollLoop);

    return () => cancelAnimationFrame(rafId);
  }, [isStreaming, isUserScrolling, containerRef]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (isScrollingTimeoutRef.current) {
        clearTimeout(isScrollingTimeoutRef.current);
      }
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
