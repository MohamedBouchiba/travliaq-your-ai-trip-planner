/**
 * useChatWidgetFlow - Hook for managing widget interactions in chat
 *
 * Thin wrapper that creates shared deps and delegates to modular handler functions.
 * Handler logic lives in ./widgetHandlers/ for maintainability and testability.
 */

import { useCallback, useRef } from "react";
import type { Locale } from "date-fns";
import type { TFunction } from "i18next";
import type { FlightMemory } from "@/stores/hooks";
import type { Airport } from "@/hooks/useNearestAirports";
import type { WidgetType } from "@/types/flight";
import type { ChatMessage } from "../types";
import { useWidgetTracking } from "./useWidgetTracking";
import type { HandlerDeps } from "./widgetHandlers/types";
import {
  handleDateSelect as _handleDateSelect,
  handleDateRangeSelect as _handleDateRangeSelect,
  handleTravelersSelect as _handleTravelersSelect,
  handleTravelersConfirmSolo as _handleTravelersConfirmSolo,
  handleTravelersEditBeforeSearch as _handleTravelersEditBeforeSearch,
  handleAirportSelect as _handleAirportSelect,
  handleCitySelect as _handleCitySelect,
  handleDepartureCitySelect as _handleDepartureCitySelect,
  handleTripTypeConfirm as _handleTripTypeConfirm,
  handleSearchButtonClick as _handleSearchButtonClick,
  handleBudgetSelect as _handleBudgetSelect,
  handleQuickFilterSelect as _handleQuickFilterSelect,
  handleQuickFilterClear as _handleQuickFilterClear,
  handleStarRatingSelect as _handleStarRatingSelect,
  handleCabinClassSelect as _handleCabinClassSelect,
  handleDirectFlightToggle as _handleDirectFlightToggle,
  handleDurationSelect as _handleDurationSelect,
  handleTimeOfDaySelect as _handleTimeOfDaySelect,
} from "./widgetHandlers";

/**
 * Widget flow state - tracks pending operations
 */
export interface WidgetFlowState {
  pendingTravelersWidget: boolean;
  pendingTripDuration: string | null;
  pendingPreferredMonth: string | null;
  citySelectionShownForCountry: string | null;
  searchButtonShown: boolean;
  pendingFromCountry: { code: string; name: string } | null;
  pendingSearchAfterTravelers: boolean;
}

/**
 * Handler result with optional message to add
 */
export interface HandlerResult {
  removeWidget?: boolean;
  newMessages?: Partial<ChatMessage>[];
  memoryUpdates?: Partial<FlightMemory>;
}

/**
 * Options for the widget flow hook
 */
export interface UseChatWidgetFlowOptions {
  memory: FlightMemory;
  updateMemory: (updates: Partial<FlightMemory>) => void;
  updateTravelers: (travelers: {
    adults: number;
    children: number;
    infants: number;
    childrenAges: number[];
  }) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** i18n translation function */
  t: TFunction;
  /** date-fns locale for date formatting */
  dateFnsLocale: Locale;
}

/**
 * Hook for managing widget flow in chat
 */
export function useChatWidgetFlow(options: UseChatWidgetFlowOptions) {
  const { memory, updateMemory, updateTravelers, setMessages, t, dateFnsLocale } = options;

  /** Build i18n-aware travelers label */
  const buildTravelersLabel = useCallback((travelers: { adults: number; children: number; infants: number }): string => {
    const parts = [
      t("planner.widget.label.adult", { count: travelers.adults }),
    ];
    if (travelers.children > 0) {
      parts.push(t("planner.widget.label.child", { count: travelers.children }));
    }
    if (travelers.infants > 0) {
      parts.push(t("planner.widget.label.infant", { count: travelers.infants }));
    }
    return parts.join(", ");
  }, [t]);

  // Widget tracking for LLM context
  const tracking = useWidgetTracking();

  // Refs for tracking flow state
  const pendingTravelersWidgetRef = useRef(false);
  const travelersConfirmedRef = useRef(false);
  const pendingTripDurationRef = useRef<string | null>(null);
  const pendingPreferredMonthRef = useRef<string | null>(null);
  const citySelectionShownForCountryRef = useRef<string | null>(null);
  const searchButtonShownRef = useRef(false);
  const pendingFromCountryRef = useRef<{ code: string; name: string } | null>(null);
  const pendingSearchAfterTravelersRef = useRef(false);

  // ============================================================
  // Shared deps object for all handler functions
  // ============================================================

  const depsRef = useRef<HandlerDeps>(null!);
  depsRef.current = {
    memory,
    updateMemory,
    updateTravelers,
    setMessages,
    tracking,
    t,
    dateFnsLocale,
    buildTravelersLabel,
    refs: {
      pendingTravelersWidget: pendingTravelersWidgetRef,
      travelersConfirmed: travelersConfirmedRef,
      pendingTripDuration: pendingTripDurationRef,
      pendingPreferredMonth: pendingPreferredMonthRef,
      citySelectionShownForCountry: citySelectionShownForCountryRef,
      searchButtonShown: searchButtonShownRef,
      pendingFromCountry: pendingFromCountryRef,
      pendingSearchAfterTravelers: pendingSearchAfterTravelersRef,
    },
  };

  // ============================================================
  // Flow state management
  // ============================================================

  const resetFlowState = useCallback(() => {
    pendingTravelersWidgetRef.current = false;
    travelersConfirmedRef.current = false;
    pendingTripDurationRef.current = null;
    pendingPreferredMonthRef.current = null;
    citySelectionShownForCountryRef.current = null;
    searchButtonShownRef.current = false;
    pendingFromCountryRef.current = null;
    pendingSearchAfterTravelersRef.current = false;
  }, []);

  const setPendingTripDuration = useCallback((duration: string | null) => {
    pendingTripDurationRef.current = duration;
  }, []);

  const setPendingPreferredMonth = useCallback((month: string | null) => {
    pendingPreferredMonthRef.current = month;
  }, []);

  const setPendingTravelersWidget = useCallback((pending: boolean) => {
    pendingTravelersWidgetRef.current = pending;
  }, []);

  const markSearchButtonShown = useCallback(() => {
    searchButtonShownRef.current = true;
  }, []);

  const isSearchButtonShown = useCallback(() => {
    return searchButtonShownRef.current;
  }, []);

  // ============================================================
  // Core Handlers (delegated to modular handler functions)
  // ============================================================

  const handleAirportSelect = useCallback(
    (messageId: string, field: "from" | "to", airport: Airport, isDual?: boolean) => {
      _handleAirportSelect(depsRef.current, messageId, field, airport, isDual);
    },
    []
  );

  const handleDateSelect = useCallback(
    (messageId: string, dateType: "departure" | "return", date: Date) => {
      _handleDateSelect(depsRef.current, messageId, dateType, date);
    },
    []
  );

  const handleDateRangeSelect = useCallback(
    (messageId: string, departure: Date, returnDate: Date) => {
      _handleDateRangeSelect(depsRef.current, messageId, departure, returnDate);
    },
    []
  );

  const handleTravelersSelect = useCallback(
    (
      messageId: string,
      travelers: {
        adults: number;
        children: number;
        infants: number;
        childrenAges: number[];
      }
    ) => {
      _handleTravelersSelect(depsRef.current, messageId, travelers);
    },
    []
  );

  const handleTripTypeConfirm = useCallback(
    (messageId: string, tripType: "roundtrip" | "oneway" | "multi") => {
      _handleTripTypeConfirm(depsRef.current, messageId, tripType);
    },
    []
  );

  const handleCitySelect = useCallback(
    (messageId: string, cityName: string, countryName: string, countryCode: string) => {
      _handleCitySelect(depsRef.current, messageId, cityName, countryName, countryCode);
    },
    []
  );

  const handleDepartureCitySelect = useCallback(
    (messageId: string, cityName: string, countryName: string, countryCode: string) => {
      _handleDepartureCitySelect(depsRef.current, messageId, cityName, countryName, countryCode);
    },
    []
  );

  const handleSearchButtonClick = useCallback(
    (messageId: string) => {
      _handleSearchButtonClick(depsRef.current, messageId);
    },
    []
  );

  const handleTravelersConfirmSolo = useCallback(
    (messageId: string) => {
      _handleTravelersConfirmSolo(depsRef.current, messageId);
    },
    []
  );

  const handleTravelersEditBeforeSearch = useCallback(
    (messageId: string, travelers: { adults: number; children: number; infants: number }) => {
      _handleTravelersEditBeforeSearch(depsRef.current, messageId, travelers);
    },
    []
  );

  // ============================================================
  // Selection Handlers (Phase 2)
  // ============================================================

  const handleBudgetSelect = useCallback(
    (messageId: string, range: { min: number; max: number } | null) => {
      _handleBudgetSelect(depsRef.current, messageId, range);
    },
    []
  );

  const handleQuickFilterSelect = useCallback(
    (messageId: string, chipId: string) => {
      _handleQuickFilterSelect(depsRef.current, messageId, chipId);
    },
    []
  );

  const handleQuickFilterClear = useCallback(
    (messageId: string) => {
      _handleQuickFilterClear(depsRef.current, messageId);
    },
    []
  );

  const handleStarRatingSelect = useCallback(
    (messageId: string, minStars: number, maxStars: number) => {
      _handleStarRatingSelect(depsRef.current, messageId, minStars, maxStars);
    },
    []
  );

  const handleCabinClassSelect = useCallback(
    (messageId: string, cabinClass: string) => {
      _handleCabinClassSelect(depsRef.current, messageId, cabinClass);
    },
    []
  );

  const handleDirectFlightToggle = useCallback(
    (messageId: string, directOnly: boolean) => {
      _handleDirectFlightToggle(depsRef.current, messageId, directOnly);
    },
    []
  );

  const handleDurationSelect = useCallback(
    (messageId: string, durationId: string) => {
      _handleDurationSelect(depsRef.current, messageId, durationId);
    },
    []
  );

  const handleTimeOfDaySelect = useCallback(
    (messageId: string, timeSlot: string) => {
      _handleTimeOfDaySelect(depsRef.current, messageId, timeSlot);
    },
    []
  );

  // ============================================================
  // Widget determination (stays in hook - uses refs directly)
  // ============================================================

  const determineNextWidget = useCallback(
    (
      showDateWidget: boolean,
      showTravelersWidget: boolean,
      nextMem: FlightMemory
    ): WidgetType | undefined => {
      if (showDateWidget) {
        const effectiveTripType = nextMem.tripType || "roundtrip";

        if (!nextMem.departureDate) {
          if (pendingTripDurationRef.current) {
            return "datePicker";
          } else if (effectiveTripType === "oneway") {
            return "datePicker";
          } else {
            return "dateRangePicker";
          }
        } else if (effectiveTripType === "roundtrip" && !nextMem.returnDate) {
          return "returnDatePicker";
        }
      }

      if (showTravelersWidget) {
        return "travelersSelector";
      }

      return undefined;
    },
    []
  );

  const getWidgetData = useCallback(() => {
    return {
      preferredMonth: pendingPreferredMonthRef.current || undefined,
      tripDuration: pendingTripDurationRef.current || undefined,
    };
  }, []);

  return {
    // Flow state management
    resetFlowState,
    setPendingTripDuration,
    setPendingPreferredMonth,
    setPendingTravelersWidget,
    markSearchButtonShown,
    isSearchButtonShown,

    // Core Handlers
    handleAirportSelect,
    handleDateSelect,
    handleDateRangeSelect,
    handleTravelersSelect,
    handleTripTypeConfirm,
    handleCitySelect,
    handleDepartureCitySelect,
    handleSearchButtonClick,
    handleTravelersConfirmSolo,
    handleTravelersEditBeforeSearch,

    // Selection widget handlers (Phase 2)
    handleBudgetSelect,
    handleQuickFilterSelect,
    handleQuickFilterClear,
    handleStarRatingSelect,
    handleCabinClassSelect,
    handleDirectFlightToggle,
    handleDurationSelect,
    handleTimeOfDaySelect,

    // Widget determination
    determineNextWidget,
    getWidgetData,

    // Refs for external access
    citySelectionShownRef: citySelectionShownForCountryRef,
    pendingFromCountryRef,
  };
}

export default useChatWidgetFlow;
