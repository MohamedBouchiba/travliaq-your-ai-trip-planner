/**
 * WidgetRenderer - Renders the appropriate widget for a chat message
 *
 * Extracted from PlannerChat.tsx to reduce its JSX complexity.
 * Handles both active and confirmed widget states.
 */

import { memo, lazy, Suspense } from "react";
import type { TFunction } from "i18next";
import type { FlightMemory } from "@/stores/hooks";
import type { DestinationSuggestion } from "@/types/destinations";
import type { ChatMessage } from "../types";
import { ErrorBoundary } from "./common/ErrorBoundary";
import { GenericWidgetSkeleton } from "./common/WidgetSkeletons";
import { ConfirmedWidget } from "./ConfirmedWidget";
import { DatePickerWidget } from "./DatePickerWidget";
import { DateRangePickerWidget } from "./DateRangePickerWidget";
import { TravelersWidget, TravelersConfirmBeforeSearchWidget } from "./TravelersWidget";
import { TripTypeConfirmWidget } from "./TripTypeWidget";
import { CitySelectionWidget } from "./CitySelectionWidget";
import { eventBus } from "@/lib/eventBus";
import { TripRecapWidget } from "./TripRecapWidget";

// Lazy-loaded widgets — not needed on initial render
const LazyAirportConfirmationWidget = lazy(() =>
  import("./AirportWidgets").then(m => ({ default: m.AirportConfirmationWidget }))
);
const LazyPreferenceStyleWidget = lazy(() =>
  import("./PreferenceStyleWidget").then(m => ({ default: m.PreferenceStyleWidget }))
);
const LazyPreferenceInterestsWidget = lazy(() =>
  import("./PreferenceInterestsWidget").then(m => ({ default: m.PreferenceInterestsWidget }))
);
const LazyMustHavesWidget = lazy(() =>
  import("./MustHavesWidget").then(m => ({ default: m.MustHavesWidget }))
);
const LazyDietaryWidget = lazy(() =>
  import("./DietaryWidget").then(m => ({ default: m.DietaryWidget }))
);
const LazyDestinationSuggestionsGrid = lazy(() =>
  import("./DestinationSuggestionsGrid").then(m => ({ default: m.DestinationSuggestionsGrid }))
);

interface WidgetFlowHandlers {
  handleDateSelect: (messageId: string, dateType: "departure" | "return", date: Date) => void;
  handleDateRangeSelect: (messageId: string, departure: Date, returnDate: Date) => void;
  handleTravelersSelect: (messageId: string, travelers: { adults: number; children: number; infants: number; childrenAges?: number[] }) => void;
  handleTravelersConfirmSolo: (messageId: string) => void;
  handleTravelersEditBeforeSearch: (messageId: string, travelers: { adults: number; children: number; infants: number }) => void;
  handleTripTypeConfirm: (messageId: string, tripType: "roundtrip" | "oneway" | "multi") => void;
  handleCitySelect: (messageId: string, cityName: string, countryName: string, countryCode: string) => void;
  handleDepartureCitySelect: (messageId: string, cityName: string, countryName: string, countryCode: string) => void;
}

interface PreferenceCallbacks {
  onStyleContinue: () => void;
  onInterestsContinue: () => void;
  onMustHavesContinue: () => void;
  onDietaryContinue: () => void;
}

export interface WidgetRendererProps {
  message: ChatMessage;
  widgetFlow: WidgetFlowHandlers;
  preferenceCallbacks: PreferenceCallbacks;
  handleDestinationSelect: (messageId: string, destination: DestinationSuggestion) => void;
  isLoadingDestinations: boolean;
  memory: FlightMemory;
  t: TFunction;
}

/**
 * Renders the appropriate widget based on message.widget type
 */
export const WidgetRenderer = memo(function WidgetRenderer({
  message: m,
  widgetFlow,
  preferenceCallbacks,
  handleDestinationSelect,
  isLoadingDestinations,
  memory,
  t,
}: WidgetRendererProps) {
  if (!m.widget) return null;

  return (
    <ErrorBoundary widgetName={m.widget} showRetry>
      <WidgetSwitch
        message={m}
        widgetFlow={widgetFlow}
        preferenceCallbacks={preferenceCallbacks}
        handleDestinationSelect={handleDestinationSelect}
        isLoadingDestinations={isLoadingDestinations}
        memory={memory}
        t={t}
      />
    </ErrorBoundary>
  );
});

/** Inner switch extracted so ErrorBoundary can catch render errors */
function WidgetSwitch({
  message: m,
  widgetFlow,
  preferenceCallbacks,
  handleDestinationSelect,
  isLoadingDestinations,
  memory,
  t,
}: WidgetRendererProps) {
  switch (m.widget) {
    case "datePicker":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="datePicker"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.dateSelected")}
        />
      ) : (
        <DatePickerWidget
          label={t("planner.widget.selectDepartureDate")}
          value={memory.departureDate}
          onChange={(date) => widgetFlow.handleDateSelect(m.id, "departure", date)}
          preferredMonth={m.widgetData?.preferredMonth}
        />
      );

    case "returnDatePicker":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="returnDatePicker"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.dateSelected")}
        />
      ) : (
        <DatePickerWidget
          label={t("planner.widget.selectReturnDate")}
          value={memory.returnDate}
          onChange={(date) => widgetFlow.handleDateSelect(m.id, "return", date)}
          minDate={memory.departureDate || undefined}
          preferredMonth={m.widgetData?.preferredMonth}
        />
      );

    case "dateRangePicker":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="dateRangePicker"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.datesSelected")}
        />
      ) : (
        <DateRangePickerWidget
          tripDuration={m.widgetData?.tripDuration}
          preferredMonth={m.widgetData?.preferredMonth}
          onConfirm={(dep, ret) => widgetFlow.handleDateRangeSelect(m.id, dep, ret)}
        />
      );

    case "travelersSelector":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="travelersSelector"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.travelersSelected")}
        />
      ) : (
        <TravelersWidget
          initialValues={memory.passengers}
          onConfirm={(travelers) => widgetFlow.handleTravelersSelect(m.id, { ...travelers, childrenAges: [] })}
        />
      );

    case "tripTypeConfirm":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="tripTypeConfirm"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.tripTypeSelected")}
        />
      ) : (
        <TripTypeConfirmWidget
          currentType={memory.tripType}
          onConfirm={(tripType) => widgetFlow.handleTripTypeConfirm(m.id, tripType)}
        />
      );

    case "citySelector":
      if (!m.widgetData?.citySelection) return null;
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="citySelector"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.citySelected")}
        />
      ) : (
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
      );

    case "travelersConfirmBeforeSearch":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="travelersConfirmBeforeSearch"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.travelersConfirmed")}
        />
      ) : (
        <TravelersConfirmBeforeSearchWidget
          currentTravelers={memory.passengers}
          onConfirm={() => widgetFlow.handleTravelersConfirmSolo(m.id)}
          onEditConfirm={(travelers) => widgetFlow.handleTravelersEditBeforeSearch(m.id, travelers)}
        />
      );

    case "airportConfirmation":
      if (!m.widgetData?.airportConfirmation) return null;
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="airportConfirmation"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.airportsConfirmed")}
        />
      ) : (
        <Suspense fallback={<GenericWidgetSkeleton rows={4} showHeader />}>
          <LazyAirportConfirmationWidget
            data={m.widgetData.airportConfirmation}
            onConfirm={(confirmed) => eventBus.emit("flight:confirmedAirports", confirmed)}
          />
        </Suspense>
      );

    case "preferenceStyle":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="preferenceStyle"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.styleConfigured")}
        />
      ) : (
        <Suspense fallback={<GenericWidgetSkeleton rows={3} showHeader />}>
          <LazyPreferenceStyleWidget onContinue={preferenceCallbacks.onStyleContinue} />
        </Suspense>
      );

    case "preferenceInterests":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="preferenceInterests"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.interestsSelected")}
        />
      ) : (
        <Suspense fallback={<GenericWidgetSkeleton rows={3} showHeader />}>
          <LazyPreferenceInterestsWidget onContinue={preferenceCallbacks.onInterestsContinue} />
        </Suspense>
      );

    case "mustHaves":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="mustHaves"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.mustHavesConfigured")}
        />
      ) : (
        <Suspense fallback={<GenericWidgetSkeleton rows={2} showHeader />}>
          <LazyMustHavesWidget onContinue={preferenceCallbacks.onMustHavesContinue} />
        </Suspense>
      );

    case "dietary":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="dietary"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.dietaryConfigured")}
        />
      ) : (
        <Suspense fallback={<GenericWidgetSkeleton rows={2} showHeader />}>
          <LazyDietaryWidget onContinue={preferenceCallbacks.onDietaryContinue} />
        </Suspense>
      );

    case "destinationSuggestions":
      if (!m.widgetData?.suggestions) return null;
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="destinationSuggestions"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.destinationSelected")}
        />
      ) : (
        <Suspense fallback={<GenericWidgetSkeleton rows={4} showHeader />}>
          <LazyDestinationSuggestionsGrid
            suggestions={m.widgetData.suggestions as DestinationSuggestion[]}
            basedOnProfile={m.widgetData.basedOnProfile as { completionScore: number; keyFactors: string[] } | undefined}
            onSelect={(destination) => handleDestinationSelect(m.id, destination)}
            isLoading={isLoadingDestinations}
          />
        </Suspense>
      );

    case "tripRecap":
      if (!m.widgetData?.tripRecap) return null;
      return <TripRecapWidget data={m.widgetData.tripRecap} />;

    default:
      return null;
  }
}
