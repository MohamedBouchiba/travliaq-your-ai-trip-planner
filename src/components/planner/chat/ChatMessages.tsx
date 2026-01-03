/**
 * ChatMessages - Scrollable list of chat messages
 */

import { useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
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
  onQuickReplyWidget,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const visibleMessages = messages.filter((m) => !m.isHidden);

  return (
    <div className="flex-1 overflow-y-auto">
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
            onQuickReplyWidget={onQuickReplyWidget}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
