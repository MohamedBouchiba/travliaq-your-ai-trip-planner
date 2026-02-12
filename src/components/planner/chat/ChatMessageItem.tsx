/**
 * ChatMessageItem - Memoized single chat message with all widgets
 * Extracted to prevent re-renders of the entire message list
 */

import { memo, useCallback } from "react";
import { Plane } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";
import { MessageActions } from "./MessageActions";
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
  MarkdownMessage,
  PreferenceStyleWidget,
  PreferenceInterestsWidget,
  MustHavesWidget,
  DietaryWidget,
  DestinationSuggestionsGrid,
} from "./widgets";
import { eventBus } from "@/lib/eventBus";
import type { DestinationSuggestion } from "@/types/destinations";
import type { Airport } from "@/hooks/useNearestAirports";

// Memory state type for widgets
interface MemoryState {
  departureDate: Date | null;
  returnDate: Date | null;
  tripType: "roundtrip" | "oneway" | "multi";
  passengers: { adults: number; children: number; infants: number };
}

// Widget flow handlers
interface WidgetFlowHandlers {
  handleDateSelect: (messageId: string, type: "departure" | "return", date: Date) => void;
  handleDateRangeSelect: (messageId: string, dep: Date, ret: Date) => void;
  handleTravelersSelect: (messageId: string, travelers: { adults: number; children: number; infants: number }) => void;
  handleTravelersConfirmSolo: (messageId: string) => void;
  handleTravelersEditBeforeSearch: (messageId: string, travelers: { adults: number; children: number; infants: number }) => void;
  handleTripTypeConfirm: (messageId: string, tripType: "roundtrip" | "oneway" | "multi") => void;
  handleCitySelect: (messageId: string, cityName: string, countryName: string, countryCode: string) => void;
  handleDepartureCitySelect: (messageId: string, cityName: string, countryName: string, countryCode: string) => void;
  handleAirportSelect: (messageId: string, field: "from" | "to", airport: Airport, isDual?: boolean) => void;
  handleSearchButtonClick: (messageId: string) => void;
}

// Preference callbacks
interface PreferenceCallbacks {
  onStyleContinue: () => void;
  onInterestsContinue: () => void;
  onMustHavesContinue: () => void;
  onDietaryContinue: () => void;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  memory: MemoryState;
  widgetFlow: WidgetFlowHandlers;
  preferenceCallbacks: PreferenceCallbacks;
  isLoading: boolean;
  onSendText: (text: string) => void;
  onFillInput: (text: string) => void;
  onTriggerWidget: (widget: string) => void;
  onDestinationSelect?: (destination: DestinationSuggestion) => void;
  onRegenerate?: () => void;
}

function ChatMessageItemComponent({
  message: m,
  memory,
  widgetFlow,
  preferenceCallbacks,
  isLoading,
  onSendText,
  onFillInput,
  onTriggerWidget,
  onDestinationSelect,
  onRegenerate,
}: ChatMessageItemProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "")}>
      {/* Content */}
      <div className={cn("flex-1 min-w-0", m.role === "user" ? "text-right" : "")}>
        <div className={cn(
          "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
          m.role === "user" ? "bg-primary text-primary-foreground text-left" : "bg-muted text-foreground text-left"
        )}>
          {m.isTyping ? (
            <div className="flex gap-1 py-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <>
              <MarkdownMessage content={m.text} />
              {m.isStreaming && <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />}
            </>
          )}
        </div>

        {/* Copy / Like / Dislike actions */}
        {m.role === "assistant" && !m.isTyping && !m.isStreaming && m.text && (
          <MessageActions messageId={m.id} text={m.text} onRegenerate={onRegenerate} />
        )}

        {/* Airport choices */}
        {m.airportChoices && (
          <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
            {m.airportChoices.airports.map((airport) => (
              <AirportButton
                key={airport.iata}
                airport={airport}
                onClick={() => widgetFlow.handleAirportSelect(m.id, m.airportChoices!.field, airport, false)}
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        {/* Dual airport selection */}
        {m.dualAirportChoices && (
          <DualAirportSelection
            choices={m.dualAirportChoices}
            onSelect={(field, airport) => widgetFlow.handleAirportSelect(m.id, field, airport, true)}
            disabled={isLoading}
          />
        )}

        {/* Widgets */}
        {m.widget === "datePicker" && (
          <DatePickerWidget
            label={t("planner.datePicker.chooseDepartureDate")}
            value={memory.departureDate}
            onChange={(date) => widgetFlow.handleDateSelect(m.id, "departure", date)}
            preferredMonth={m.widgetData?.preferredMonth}
          />
        )}
        {m.widget === "returnDatePicker" && (
          <DatePickerWidget
            label={t("planner.datePicker.chooseReturnDate")}
            value={memory.returnDate}
            onChange={(date) => widgetFlow.handleDateSelect(m.id, "return", date)}
            minDate={memory.departureDate || undefined}
            preferredMonth={m.widgetData?.preferredMonth}
          />
        )}
        {m.widget === "dateRangePicker" && (
          <DateRangePickerWidget
            tripDuration={m.widgetData?.tripDuration}
            preferredMonth={m.widgetData?.preferredMonth}
            onConfirm={(dep, ret) => widgetFlow.handleDateRangeSelect(m.id, dep, ret)}
          />
        )}
        {m.widget === "travelersSelector" && (
          <TravelersWidget
            initialValues={memory.passengers}
            onConfirm={(travelers) => widgetFlow.handleTravelersSelect(m.id, travelers)}
          />
        )}
        {m.widget === "tripTypeConfirm" && (
          <TripTypeConfirmWidget
            currentType={memory.tripType}
            onConfirm={(tripType) => widgetFlow.handleTripTypeConfirm(m.id, tripType)}
          />
        )}
        {m.widget === "citySelector" && m.widgetData?.citySelection && (
          <CitySelectionWidget
            citySelection={m.widgetData.citySelection}
            onSelect={(cityName) => {
              const { countryCode, countryName } = m.widgetData!.citySelection!;
              if (m.widgetData?.isDeparture) {
                widgetFlow.handleDepartureCitySelect(m.id, cityName, countryName, countryCode);
              } else {
                widgetFlow.handleCitySelect(m.id, cityName, countryName, countryCode);
              }
            }}
          />
        )}
        {m.widget === "travelersConfirmBeforeSearch" && (
          <TravelersConfirmBeforeSearchWidget
            currentTravelers={memory.passengers}
            onConfirm={() => widgetFlow.handleTravelersConfirmSolo(m.id)}
            onEditConfirm={(travelers) => widgetFlow.handleTravelersEditBeforeSearch(m.id, travelers)}
          />
        )}
        {m.widget === "airportConfirmation" && m.widgetData?.airportConfirmation && (
          <AirportConfirmationWidget
            data={m.widgetData.airportConfirmation}
            onConfirm={(confirmed) => eventBus.emit("flight:confirmedAirports", confirmed)}
          />
        )}
        
        {/* Preference Widgets */}
        {m.widget === "preferenceStyle" && (
          <PreferenceStyleWidget onContinue={preferenceCallbacks.onStyleContinue} />
        )}
        {m.widget === "preferenceInterests" && (
          <PreferenceInterestsWidget onContinue={preferenceCallbacks.onInterestsContinue} />
        )}
        {m.widget === "mustHaves" && (
          <MustHavesWidget onContinue={preferenceCallbacks.onMustHavesContinue} />
        )}
        {m.widget === "dietary" && (
          <DietaryWidget onContinue={preferenceCallbacks.onDietaryContinue} />
        )}
        
        {/* Destination Suggestions Grid */}
        {m.widget === "destinationSuggestions" && m.widgetData?.suggestions && onDestinationSelect && (
          <DestinationSuggestionsGrid
            suggestions={m.widgetData.suggestions as DestinationSuggestion[]}
            basedOnProfile={m.widgetData.basedOnProfile as { completionScore: number; keyFactors: string[] } | undefined}
            onSelect={onDestinationSelect}
          />
        )}

        {/* Search flight button */}
        {m.hasSearchButton && (
          <div className="mt-3 text-left">
            <button
              onClick={() => widgetFlow.handleSearchButtonClick(m.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
            >
              <Plane className="h-4 w-4" />
              {t("planner.search.searchFlightsNow")}
            </button>
          </div>
        )}

        {/* Quick Replies */}
        {m.quickReplies && m.quickReplies.length > 0 && (
          <QuickReplies
            replies={m.quickReplies}
            onSendMessage={onSendText}
            onFillInput={onFillInput}
            onTriggerWidget={onTriggerWidget}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
}

// Memoize with custom comparison for performance
export const ChatMessageItem = memo(ChatMessageItemComponent, (prev, next) => {
  // Only re-render if essential props change
  return (
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.isTyping === next.message.isTyping &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.message.widget === next.message.widget &&
    prev.isLoading === next.isLoading &&
    prev.memory.departureDate === next.memory.departureDate &&
    prev.memory.returnDate === next.memory.returnDate &&
    prev.memory.tripType === next.memory.tripType &&
    prev.memory.passengers.adults === next.memory.passengers.adults
  );
});
