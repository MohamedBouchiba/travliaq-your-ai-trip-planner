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
import type { WidgetType } from "@/types/flight";
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
const LazyBudgetRangeSlider = lazy(() =>
  import("./selection/BudgetRangeSlider").then(m => ({ default: m.BudgetRangeSlider }))
);
const LazyQuickFilterChips = lazy(() =>
  import("./selection/QuickFilterChips").then(m => ({ default: m.QuickFilterChips }))
);
const LazyStarRatingSelector = lazy(() =>
  import("./selection/StarRatingSelector").then(m => ({ default: m.StarRatingSelector }))
);
const LazyDurationChips = lazy(() =>
  import("./selection/DurationChips").then(m => ({ default: m.DurationChips }))
);
const LazyCabinClassSelector = lazy(() =>
  import("./selection/CabinClassSelector").then(m => ({ default: m.CabinClassSelector }))
);
const LazyDirectFlightToggle = lazy(() =>
  import("./selection/DirectFlightToggle").then(m => ({ default: m.DirectFlightToggle }))
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
  handleBudgetSelect: (messageId: string, range: { min: number; max: number } | null) => void;
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
  onWidgetReopen?: (messageId: string) => void;
}

/** Widgets that can be reopened after confirmation */
const MODIFIABLE_WIDGETS = new Set<WidgetType>([
  "datePicker",
  "returnDatePicker",
  "dateRangePicker",
  "travelersSelector",
  "tripTypeConfirm",
  "citySelector",
  "travelersConfirmBeforeSearch",
  "preferenceStyle",
  "preferenceInterests",
  "mustHaves",
  "dietary",
  "budgetRangeSlider",
]);

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
  onWidgetReopen,
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
        onWidgetReopen={onWidgetReopen}
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
  onWidgetReopen,
}: WidgetRendererProps) {
  const modifyHandler = onWidgetReopen && m.widget && MODIFIABLE_WIDGETS.has(m.widget)
    ? () => onWidgetReopen(m.id)
    : undefined;

  switch (m.widget) {
    case "datePicker":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="datePicker"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.dateSelected")}
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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
          onModify={modifyHandler}
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

    case "budgetRangeSlider":
      return m.widgetConfirmed ? (
        <ConfirmedWidget
          widgetType="budgetRangeSlider"
          selectedValue={m.widgetSelectedValue}
          displayLabel={m.widgetDisplayLabel || t("planner.widget.budgetSelected")}
          onModify={modifyHandler}
        />
      ) : (
        <Suspense fallback={<GenericWidgetSkeleton rows={2} showHeader />}>
          <LazyBudgetRangeSlider
            onBudgetChange={(range) => widgetFlow.handleBudgetSelect(m.id, range)}
            label={m.widgetData?.label as string | undefined}
            currency={(m.widgetData?.currency as string) || "€"}
            showSlider={m.widgetData?.showSlider as boolean | undefined}
            perPerson={m.widgetData?.perPerson as boolean | undefined}
          />
        </Suspense>
      );

    case "tripRecap":
      if (!m.widgetData?.tripRecap) return null;
      return <TripRecapWidget data={m.widgetData.tripRecap} />;

    case "quickFilterChips":
      if (!m.widgetData?.filterGroups) return null;
      return (
        <Suspense fallback={<GenericWidgetSkeleton rows={2} />}>
          <LazyQuickFilterChips
            groups={m.widgetData.filterGroups as import("./selection/QuickFilterChips").FilterChipGroup[]}
            onFilterChange={(filters) => eventBus.emit("filters:quickChips", { filters })}
          />
        </Suspense>
      );

    case "starRatingSelector":
      return (
        <Suspense fallback={<GenericWidgetSkeleton rows={1} />}>
          <LazyStarRatingSelector
            onRatingChange={(ratings) => eventBus.emit("filters:starRating", { ratings })}
            label={m.widgetData?.label as string | undefined}
          />
        </Suspense>
      );

    case "durationChips":
      return (
        <Suspense fallback={<GenericWidgetSkeleton rows={1} />}>
          <LazyDurationChips
            onDurationChange={(durations) => eventBus.emit("activities:durationChips", { durations: durations.map(d => ({ id: d.id, minMinutes: d.minMinutes, maxMinutes: d.maxMinutes })) })}
          />
        </Suspense>
      );

    case "cabinClassSelector":
      return (
        <Suspense fallback={<GenericWidgetSkeleton rows={1} />}>
          <LazyCabinClassSelector
            onCabinChange={(cabin) => eventBus.emit("filters:cabinClass", { cabin: cabin ? { id: cabin.id, value: cabin.value } : null })}
          />
        </Suspense>
      );

    case "directFlightToggle":
      return (
        <Suspense fallback={<GenericWidgetSkeleton rows={1} />}>
          <LazyDirectFlightToggle
            onChange={(directOnly) => eventBus.emit("flights:directOnly", { directOnly })}
          />
        </Suspense>
      );

    default:
      return null;
  }
}
