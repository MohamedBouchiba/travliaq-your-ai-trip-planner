/**
 * VirtualizedChatMessages - Optimized scrollable list for chat messages
 * Uses simple windowing for long conversations, standard rendering for short ones
 *
 * C3: Uses ChatHandlersProvider context (same as ChatMessages) so ChatMessage
 * receives handlers via context, not props.
 */

import { useRef, useEffect, memo, useState, useCallback, useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatHandlersProvider, type ChatHandlers } from "./contexts/ChatHandlersContext";
import type { ChatMessage as ChatMessageType } from "./types";
import type { Airport } from "@/hooks/useNearestAirports";

// Threshold for enabling windowing (only window long conversations)
const WINDOWING_THRESHOLD = 30;
// Number of messages to render outside viewport
const OVERSCAN = 5;

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
  memory: {
    departureDate: Date | null;
    returnDate: Date | null;
    passengers: { adults: number; children: number; infants: number };
    tripType: "roundtrip" | "oneway" | "multi";
  };
  onDateSelect: (messageId: string, type: "departure" | "return", date: Date) => void;
  onDateRangeSelect: (messageId: string, departure: Date, returnDate: Date) => void;
  onTravelersSelect: (messageId: string, travelers: { adults: number; children: number; infants: number }) => void;
  onTravelersConfirmSolo: (messageId: string) => void;
  onTravelersEditBeforeSearch: (messageId: string, travelers: { adults: number; children: number; infants: number }) => void;
  onTripTypeConfirm: (messageId: string, tripType: "roundtrip" | "oneway" | "multi") => void;
  onCitySelect: (messageId: string, cityName: string, countryName: string, countryCode: string) => void;
  onDepartureCitySelect: (messageId: string, cityName: string, countryName: string, countryCode: string) => void;
  onAirportSelect: (messageId: string, field: "from" | "to", airport: Airport, isDual?: boolean) => void;
  onSearchButtonClick: (messageId: string) => void;
  onQuickReplyMessage: (message: string) => void;
  onQuickReplyFillInput?: (message: string) => void;
  onQuickReplyWidget?: (widget: string) => void;
  onRetry?: () => void;
}

// Memoized row component for better performance
const MemoizedChatMessage = memo(ChatMessage);

export function VirtualizedChatMessages({
  messages,
  isLoading = false,
  memory,
  onDateSelect,
  onDateRangeSelect,
  onTravelersSelect,
  onTravelersConfirmSolo,
  onTravelersEditBeforeSearch,
  onTripTypeConfirm,
  onCitySelect,
  onDepartureCitySelect,
  onAirportSelect,
  onSearchButtonClick,
  onQuickReplyMessage,
  onQuickReplyFillInput,
  onQuickReplyWidget,
  onRetry,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  const visibleMessages = messages.filter((m) => !m.isHidden);
  const shouldWindow = visibleMessages.length >= WINDOWING_THRESHOLD;

  // C3: Memoize handlers for context
  const handlers = useMemo<ChatHandlers>(() => ({
    onDateSelect,
    onDateRangeSelect,
    onTravelersSelect,
    onTravelersConfirmSolo,
    onTravelersEditBeforeSearch,
    onTripTypeConfirm,
    onCitySelect,
    onDepartureCitySelect,
    onAirportSelect,
    onSearchButtonClick,
    onQuickReplyMessage,
    onQuickReplyFillInput,
    onQuickReplyWidget,
    onRetry,
  }), [
    onDateSelect, onDateRangeSelect, onTravelersSelect,
    onTravelersConfirmSolo, onTravelersEditBeforeSearch, onTripTypeConfirm,
    onCitySelect, onDepartureCitySelect, onAirportSelect,
    onSearchButtonClick, onQuickReplyMessage, onQuickReplyFillInput, onQuickReplyWidget,
    onRetry,
  ]);

  // Calculate visible range based on scroll position
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !shouldWindow) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const scrollHeight = container.scrollHeight;

    const estimatedMessageHeight = scrollHeight / visibleMessages.length;
    const startIndex = Math.max(0, Math.floor(scrollTop / estimatedMessageHeight) - OVERSCAN);
    const visibleCount = Math.ceil(containerHeight / estimatedMessageHeight) + OVERSCAN * 2;
    const endIndex = Math.min(visibleMessages.length, startIndex + visibleCount);

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [shouldWindow, visibleMessages.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldWindow) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll, shouldWindow]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // For short conversations, use simple rendering
  if (!shouldWindow) {
    return (
      <ChatHandlersProvider handlers={handlers}>
        <div ref={containerRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
            {visibleMessages.map((message) => (
              <MemoizedChatMessage
                key={message.id}
                message={message}
                isLoading={isLoading}
                memory={memory}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </ChatHandlersProvider>
    );
  }

  // Windowed rendering for long conversations
  const windowedMessages = visibleMessages.slice(visibleRange.start, visibleRange.end);
  const topSpacerHeight = visibleRange.start * 120;
  const bottomSpacerHeight = (visibleMessages.length - visibleRange.end) * 120;

  return (
    <ChatHandlersProvider handlers={handlers}>
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4">
          {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight }} aria-hidden />}
          
          <div className="space-y-6">
            {windowedMessages.map((message) => (
              <MemoizedChatMessage
                key={message.id}
                message={message}
                isLoading={isLoading}
                memory={memory}
              />
            ))}
          </div>

          {bottomSpacerHeight > 0 && <div style={{ height: bottomSpacerHeight }} aria-hidden />}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
    </ChatHandlersProvider>
  );
}

// Export with same name for drop-in replacement
export { VirtualizedChatMessages as ChatMessagesVirtualized };
