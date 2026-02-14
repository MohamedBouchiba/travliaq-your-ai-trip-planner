/**
 * ChatMessage - Single message with avatar, content, widgets, and quick replies
 *
 * C3: Handler props replaced by useChatHandlers() context.
 * Only message-specific data (message, memory, isLoading) remains as props.
 */

import { Plane, RefreshCw, AlertTriangle, WifiOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

// t() is used inside the component via useTranslation hook
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "./types";
import { QuickReplies } from "./QuickReplies";
import { useChatHandlers } from "./contexts/ChatHandlersContext";
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
  TripRecapWidget,
} from "./widgets";
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
}

/**
 * Translated search flight button text
 */
function SearchFlightButtonText() {
  const { t } = useTranslation();
  return <>{t("planner.search.searchFlightsNow")}</>;
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
}: ChatMessageProps) {
  const { t } = useTranslation();
  // C3: Get handlers from context instead of props
  const handlers = useChatHandlers();

  return (
    <div
      className={cn(
        "flex gap-2",
        m.role === "user" ? "flex-row-reverse" : ""
      )}
    >
      {/* Message content - no avatars */}
      <div
        className={cn(
          "flex-1 min-w-0",
          m.role === "user" ? "text-right" : ""
        )}
      >
        <div
          className={cn(
            "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
            m.errorType
              ? "bg-destructive/10 text-destructive border border-destructive/20 text-left"
              : m.role === "user"
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
          ) : m.errorType ? (
            <div className="flex items-start gap-2">
              {m.errorType === "network" ? (
                <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">{m.text}</p>
                {handlers.onRetry && (
                  <button
                    onClick={handlers.onRetry}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t("planner.chat.retry")}
                  </button>
                )}
              </div>
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
                onClick={() => handlers.onAirportSelect(m.id, m.airportChoices!.field, airport, false)}
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        {/* Dual airport selection (from + to side by side) */}
        {m.dualAirportChoices && (
          <DualAirportSelection
            choices={m.dualAirportChoices}
            onSelect={(field, airport) => handlers.onAirportSelect(m.id, field, airport, true)}
            disabled={isLoading}
          />
        )}

        {/* Date Picker Widget */}
        {m.widget === "datePicker" && (
          <DatePickerWidget
            label={undefined}
            value={memory.departureDate}
            onChange={(date) => handlers.onDateSelect(m.id, "departure", date)}
            preferredMonth={m.widgetData?.preferredMonth}
          />
        )}
        {m.widget === "returnDatePicker" && (
          <DatePickerWidget
            label={undefined}
            value={memory.returnDate}
            onChange={(date) => handlers.onDateSelect(m.id, "return", date)}
            minDate={memory.departureDate || undefined}
            preferredMonth={m.widgetData?.preferredMonth}
          />
        )}

        {/* Date Range Picker Widget (departure + return) */}
        {m.widget === "dateRangePicker" && (
          <DateRangePickerWidget
            tripDuration={m.widgetData?.tripDuration}
            preferredMonth={m.widgetData?.preferredMonth}
            onConfirm={(dep, ret) => handlers.onDateRangeSelect(m.id, dep, ret)}
          />
        )}

        {/* Travelers Selector Widget */}
        {m.widget === "travelersSelector" && (
          <TravelersWidget
            initialValues={memory.passengers}
            onConfirm={(travelers) => handlers.onTravelersSelect(m.id, travelers)}
          />
        )}

        {/* Trip Type Confirmation Widget */}
        {m.widget === "tripTypeConfirm" && (
          <TripTypeConfirmWidget
            currentType={memory.tripType}
            onConfirm={(tripType) => handlers.onTripTypeConfirm(m.id, tripType)}
          />
        )}

        {/* City Selection Widget */}
        {m.widget === "citySelector" && m.widgetData?.citySelection && (
          <CitySelectionWidget
            citySelection={m.widgetData.citySelection}
            onSelect={(cityName) => {
              const { countryCode, countryName } = m.widgetData!.citySelection!;
              if (m.widgetData?.isDeparture) {
                handlers.onDepartureCitySelect(m.id, cityName, countryName, countryCode);
              } else {
                handlers.onCitySelect(m.id, cityName, countryName, countryCode);
              }
            }}
          />
        )}

        {/* Travelers Confirmation Before Search Widget */}
        {m.widget === "travelersConfirmBeforeSearch" && (
          <TravelersConfirmBeforeSearchWidget
            currentTravelers={memory.passengers}
            onConfirm={() => handlers.onTravelersConfirmSolo(m.id)}
            onEditConfirm={(travelers) => handlers.onTravelersEditBeforeSearch(m.id, travelers)}
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

        {/* Trip Recap Widget */}
        {m.widget === "tripRecap" && m.widgetData?.tripRecap && (
          <TripRecapWidget data={m.widgetData.tripRecap} />
        )}

        {/* Flight search button - uses translated text from i18n */}
        {m.hasSearchButton && (
          <div className="mt-3">
            <button
              onClick={() => handlers.onSearchButtonClick(m.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
            >
              <Plane className="h-4 w-4" />
              <SearchFlightButtonText />
            </button>
          </div>
        )}

        {/* Quick Replies */}
        {m.quickReplies && m.quickReplies.length > 0 && (
          <QuickReplies
            replies={m.quickReplies}
            onSendMessage={handlers.onQuickReplyMessage}
            onFillInput={handlers.onQuickReplyFillInput}
            onTriggerWidget={handlers.onQuickReplyWidget}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
}
