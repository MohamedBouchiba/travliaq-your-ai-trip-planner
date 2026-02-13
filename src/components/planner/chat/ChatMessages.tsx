/**
 * ChatMessages - Scrollable list of chat messages
 */

import { useRef } from "react";
import { ArrowDown } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { useChatScroll } from "@/hooks/useChatScroll";
import type { ChatMessage as ChatMessageType } from "./types";
import type { Airport } from "@/hooks/useNearestAirports";

interface ChatMessagesProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
  // Memory state for widgets
  memory: {
    departureDate: Date | null;
    returnDate: Date | null;
    passengers: { adults: number; children: number; infants: number };
    tripType: "roundtrip" | "oneway" | "multi";
  };
  // Handlers
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
}

export function ChatMessages({
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
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.filter((m) => !m.isHidden);

  // B9: Use intelligent scroll management instead of naive scrollIntoView
  const { isUserScrolling, showNewMessageIndicator, newMessageCount, scrollToBottom, handleScroll } =
    useChatScroll({
      messagesCount: visibleMessages.length,
      containerRef,
    });

  return (
    <div className="relative flex-1 overflow-y-auto" ref={containerRef} onScroll={handleScroll}>
      <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
        {visibleMessages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            isLoading={isLoading}
            memory={memory}
            onDateSelect={onDateSelect}
            onDateRangeSelect={onDateRangeSelect}
            onTravelersSelect={onTravelersSelect}
            onTravelersConfirmSolo={onTravelersConfirmSolo}
            onTravelersEditBeforeSearch={onTravelersEditBeforeSearch}
            onTripTypeConfirm={onTripTypeConfirm}
            onCitySelect={onCitySelect}
            onDepartureCitySelect={onDepartureCitySelect}
            onAirportSelect={onAirportSelect}
            onSearchButtonClick={onSearchButtonClick}
            onQuickReplyMessage={onQuickReplyMessage}
            onQuickReplyFillInput={onQuickReplyFillInput}
            onQuickReplyWidget={onQuickReplyWidget}
          />
        ))}
      </div>

      {/* Scroll-to-bottom button when user has scrolled up during streaming */}
      {isUserScrolling && showNewMessageIndicator && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors text-xs font-medium"
          aria-label={`${newMessageCount} new message${newMessageCount > 1 ? "s" : ""}, scroll to bottom`}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          {newMessageCount > 0 && <span>{newMessageCount}</span>}
        </button>
      )}
    </div>
  );
}
