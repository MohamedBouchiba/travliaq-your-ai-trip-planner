/**
 * ChatHandlersContext — Provides widget handlers to deeply nested chat components.
 *
 * C3: Eliminates prop drilling of 13+ handler functions through
 * ChatMessages → ChatMessage → WidgetRenderer.
 */

import { createContext, useContext } from "react";
import type { Airport } from "@/hooks/useNearestAirports";

export interface ChatHandlers {
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
  // C2: Retry after error
  onRetry?: () => void;
}

const ChatHandlersContext = createContext<ChatHandlers | null>(null);

export function ChatHandlersProvider({
  children,
  handlers,
}: {
  children: React.ReactNode;
  handlers: ChatHandlers;
}) {
  return (
    <ChatHandlersContext.Provider value={handlers}>
      {children}
    </ChatHandlersContext.Provider>
  );
}

export function useChatHandlers(): ChatHandlers {
  const ctx = useContext(ChatHandlersContext);
  if (!ctx) {
    throw new Error("useChatHandlers must be used within ChatHandlersProvider");
  }
  return ctx;
}
