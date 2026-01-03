/**
 * ChatMessage - Single message with avatar, content, widgets, and quick replies
 */

import { User, Plane } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-travliaq.png";
import type { ChatMessage as ChatMessageType } from "./types";
import { QuickReplies } from "./QuickReplies";
import {
  DatePickerWidget,
  DateRangePickerWidget,
  TravelersWidget,
  TravelersConfirmBeforeSearchWidget,
  TripTypeConfirmWidget,
  CitySelectionWidget,
  AirportButton,
  DualAirportSelection,
  AirportConfirmationWidget,
} from "./widgets";
import type { Airport } from "@/hooks/useNearestAirports";
import { eventBus } from "@/lib/eventBus";

interface ChatMessageProps {
  message: ChatMessageType;
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

/**
 * Markdown renderer for message content
 */
function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        code: ({ children }) => (
          <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs">{children}</code>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatMessage({
  message: m,
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
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-4",
        m.role === "user" ? "flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
          m.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-white"
        )}
      >
        {m.role === "user" ? (
          <User className="h-4 w-4" />
        ) : (
          <img src={logo} alt="Travliaq" className="h-6 w-6 object-contain" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex-1 min-w-0",
          m.role === "user" ? "text-right" : ""
        )}
      >
        <div
          className={cn(
            "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
            m.role === "user"
              ? "bg-primary text-primary-foreground text-left"
              : "bg-muted text-foreground text-left"
          )}
        >
          {m.isTyping ? (
            <div className="flex gap-1 py-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <>
              <MarkdownMessage content={m.text} />
              {m.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
              )}
            </>
          )}
        </div>

        {/* Airport choice buttons - single */}
        {m.airportChoices && (
          <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
            {m.airportChoices.airports.map((airport) => (
              <AirportButton
                key={airport.iata}
                airport={airport}
                onClick={() => onAirportSelect(m.id, m.airportChoices!.field, airport, false)}
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        {/* Dual airport selection (from + to side by side) */}
        {m.dualAirportChoices && (
          <DualAirportSelection
            choices={m.dualAirportChoices}
            onSelect={(field, airport) => onAirportSelect(m.id, field, airport, true)}
            disabled={isLoading}
          />
        )}

        {/* Date Picker Widget */}
        {m.widget === "datePicker" && (
          <DatePickerWidget
            label="Choisir la date de départ"
            value={memory.departureDate}
            onChange={(date) => onDateSelect(m.id, "departure", date)}
            preferredMonth={m.widgetData?.preferredMonth}
          />
        )}
        {m.widget === "returnDatePicker" && (
          <DatePickerWidget
            label="Choisir la date de retour"
            value={memory.returnDate}
            onChange={(date) => onDateSelect(m.id, "return", date)}
            minDate={memory.departureDate || undefined}
            preferredMonth={m.widgetData?.preferredMonth}
          />
        )}

        {/* Date Range Picker Widget (departure + return) */}
        {m.widget === "dateRangePicker" && (
          <DateRangePickerWidget
            tripDuration={m.widgetData?.tripDuration}
            preferredMonth={m.widgetData?.preferredMonth}
            onConfirm={(dep, ret) => onDateRangeSelect(m.id, dep, ret)}
          />
        )}

        {/* Travelers Selector Widget */}
        {m.widget === "travelersSelector" && (
          <TravelersWidget
            initialValues={memory.passengers}
            onConfirm={(travelers) => onTravelersSelect(m.id, travelers)}
          />
        )}

        {/* Trip Type Confirmation Widget */}
        {m.widget === "tripTypeConfirm" && (
          <TripTypeConfirmWidget
            currentType={memory.tripType}
            onConfirm={(tripType) => onTripTypeConfirm(m.id, tripType)}
          />
        )}

        {/* City Selection Widget */}
        {m.widget === "citySelector" && m.widgetData?.citySelection && (
          <CitySelectionWidget
            citySelection={m.widgetData.citySelection}
            onSelect={(cityName) => {
              const { countryCode, countryName } = m.widgetData!.citySelection!;
              if (m.widgetData?.isDeparture) {
                onDepartureCitySelect(m.id, cityName, countryName, countryCode);
              } else {
                onCitySelect(m.id, cityName, countryName, countryCode);
              }
            }}
          />
        )}

        {/* Travelers Confirmation Before Search Widget */}
        {m.widget === "travelersConfirmBeforeSearch" && (
          <TravelersConfirmBeforeSearchWidget
            currentTravelers={memory.passengers}
            onConfirm={() => onTravelersConfirmSolo(m.id)}
            onEditConfirm={(travelers) => onTravelersEditBeforeSearch(m.id, travelers)}
          />
        )}

        {/* Airport Confirmation Widget for multi-destination */}
        {m.widget === "airportConfirmation" && m.widgetData?.airportConfirmation && (
          <AirportConfirmationWidget
            data={m.widgetData.airportConfirmation}
            onConfirm={(confirmed) => {
              eventBus.emit("flight:confirmedAirports", confirmed);
            }}
          />
        )}

        {/* Flight search button */}
        {m.hasSearchButton && (
          <div className="mt-3">
            <button
              onClick={() => onSearchButtonClick(m.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
            >
              <Plane className="h-4 w-4" />
              Rechercher les vols maintenant
            </button>
          </div>
        )}

        {/* Quick Replies */}
        {m.quickReplies && m.quickReplies.length > 0 && (
          <QuickReplies
            replies={m.quickReplies}
            onSendMessage={onQuickReplyMessage}
            onTriggerWidget={onQuickReplyWidget}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
}
