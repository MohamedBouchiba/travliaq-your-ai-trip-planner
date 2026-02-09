/**
 * useChatWidgetFlow - Hook for managing widget interactions in chat
 *
 * This hook handles all widget-related logic:
 * - Date selection (single and range)
 * - Travelers selection
 * - Trip type confirmation
 * - City selection
 * - Airport selection
 * - Search button flow
 * 
 * Now integrated with widget tracking for LLM context.
 */

import { useCallback, useRef } from "react";
import { format, addDays } from "date-fns";
import type { Locale } from "date-fns";
import type { TFunction } from "i18next";
import { eventBus } from "@/lib/eventBus";
import type { FlightMemory, AirportInfo, MissingField } from "@/stores/hooks";
import type { Airport } from "@/hooks/useNearestAirports";
import type { WidgetType, CitySelectionData } from "@/types/flight";
import type { ChatMessage } from "../types";
import { useWidgetTracking } from "./useWidgetTracking";

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
 * Parse trip duration string to number of days
 */
function parseDurationToDays(duration: string): number | null {
  const match = duration.match(/(\d+)\s*(semaine|jour|week|day)/i);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.includes("semaine") || unit.includes("week")) {
      return num * 7;
    }
    return num;
  }
  if (duration.toLowerCase().includes("semaine") || duration.toLowerCase().includes("week")) {
    return 7;
  }
  return null;
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

  /**
   * Reset all flow state (e.g., when switching sessions)
   */
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

  /**
   * Set pending trip duration
   */
  const setPendingTripDuration = useCallback((duration: string | null) => {
    pendingTripDurationRef.current = duration;
  }, []);

  /**
   * Set pending preferred month
   */
  const setPendingPreferredMonth = useCallback((month: string | null) => {
    pendingPreferredMonthRef.current = month;
  }, []);

  /**
   * Set pending travelers widget flag
   */
  const setPendingTravelersWidget = useCallback((pending: boolean) => {
    pendingTravelersWidgetRef.current = pending;
  }, []);

  /**
   * Mark search button as shown
   */
  const markSearchButtonShown = useCallback(() => {
    searchButtonShownRef.current = true;
  }, []);

  /**
   * Check if search button was shown
   */
  const isSearchButtonShown = useCallback(() => {
    return searchButtonShownRef.current;
  }, []);

  /**
   * Handle airport selection
   */
  const handleAirportSelect = useCallback(
    (
      messageId: string,
      field: "from" | "to",
      airport: Airport,
      isDual?: boolean
    ) => {
      if (isDual) {
        // For dual selection, update the message to remove the selected column
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId || !m.dualAirportChoices) return m;

            const updated = { ...m.dualAirportChoices };
            if (field === "from") delete updated.from;
            if (field === "to") delete updated.to;

            const stillHasChoices = updated.from || updated.to;
            return {
              ...m,
              dualAirportChoices: stillHasChoices ? updated : undefined,
            };
          })
        );
      } else {
        // For single selection, remove the airport choices
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, airportChoices: undefined } : m
          )
        );
      }

      // Update flight memory with full airport info
      const existingInfo = field === "from" ? memory.departure : memory.arrival;
      const airportInfo: AirportInfo = {
        airport: airport.name,
        iata: airport.iata,
        city: airport.city_name,
        country: existingInfo?.country,
        countryCode: airport.country_code || existingInfo?.countryCode,
        lat: airport.lat,
        lng: airport.lon,
      };

      if (field === "from") {
        updateMemory({ departure: airportInfo });
      } else {
        updateMemory({ arrival: airportInfo });
      }
      
      // Track the interaction for LLM context
      tracking.trackAirportSelect(airport.name, airport.iata, field === "from" ? "departure" : "arrival");

      // Add confirmation message
      const confirmText =
        field === "from"
          ? t("planner.widget.confirm.departure", { airport: airport.name })
          : t("planner.widget.confirm.arrival", { airport: airport.name });

      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-${Date.now()}-${field}`,
          role: "assistant",
          text: confirmText,
        },
      ]);

      // Notify parent
      eventBus.emit("flight:selectAirport", { field, airport });
    },
    [memory.departure, memory.arrival, updateMemory, setMessages, tracking]
  );

  /**
   * Handle single date selection
   */
  const handleDateSelect = useCallback(
    (messageId: string, dateType: "departure" | "return", date: Date) => {
      // Build updated memory snapshot
      let nextMem = { ...memory, passengers: { ...memory.passengers } };

      if (dateType === "departure") {
        nextMem = { ...nextMem, departureDate: date };
        updateMemory({ departureDate: date });

        // If we have a pending trip duration, calculate return date
        if (pendingTripDurationRef.current) {
          const days = parseDurationToDays(pendingTripDurationRef.current);
          if (days) {
            const computedReturn = addDays(date, days);
            nextMem = { ...nextMem, returnDate: computedReturn };
            updateMemory({ returnDate: computedReturn });
          }
          pendingTripDurationRef.current = null;
        }
      } else {
        nextMem = { ...nextMem, returnDate: date };
        updateMemory({ returnDate: date });
      }
      
      // Track the interaction for LLM context
      tracking.trackDateSelect(date, dateType);

      // Keep widget visible but mark as confirmed with selected value
      const dateLabel = format(date, "d MMMM yyyy", { locale: dateFnsLocale });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId 
            ? { 
                ...m, 
                widgetConfirmed: true, 
                widgetSelectedValue: date,
                widgetDisplayLabel: dateLabel
              } 
            : m
        )
      );
      
      // Add auto-generated user message explaining the selection
      const userChoiceMessage: ChatMessage = {
        id: `user-choice-date-${Date.now()}`,
        role: "user",
        text: dateType === "departure" 
          ? t("planner.widget.userChoice.departOn", { date: dateLabel })
          : t("planner.widget.userChoice.returnOn", { date: dateLabel }),
        isAutoGenerated: true,
      };
      
      setMessages((prev) => [...prev, userChoiceMessage]);

      // Build confirmation text
      const confirmText =
        dateType === "departure"
          ? t("planner.widget.confirm.date", { date: format(date, "d MMMM yyyy", { locale: dateFnsLocale }) })
          : t("planner.widget.confirm.returnDate", { date: format(date, "d MMMM yyyy", { locale: dateFnsLocale }) });

      // Check if we need to show travelers widget next
      if (dateType === "departure" && pendingTravelersWidgetRef.current) {
        pendingTravelersWidgetRef.current = false;

        const computedReturnInfo = nextMem.returnDate
          ? ` ${t("planner.widget.ask.dateWithReturn", { confirm: "", returnDate: format(nextMem.returnDate, "d MMMM", { locale: dateFnsLocale }) }).trim()}`
          : "";

        setMessages((prev) => [
          ...prev,
          {
            id: `confirm-date-${Date.now()}`,
            role: "assistant",
            text: `${confirmText}${computedReturnInfo}`,
            widget: "travelersSelector",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `confirm-date-${Date.now()}`,
            role: "assistant",
            text: confirmText,
          },
        ]);
      }

      return nextMem;
    },
    [memory, updateMemory, setMessages, tracking]
  );

  /**
   * Handle date range selection (both departure AND return)
   */
  const handleDateRangeSelect = useCallback(
    (messageId: string, departure: Date, returnDate: Date) => {
      updateMemory({ departureDate: departure, returnDate: returnDate });

      // Clear pending refs
      pendingTripDurationRef.current = null;
      pendingPreferredMonthRef.current = null;
      
      // Track the interaction for LLM context
      tracking.trackDateRangeSelect(departure, returnDate);

      // Keep widget visible but mark as confirmed with selected value
      const rangeLabel = `${format(departure, "d MMM", { locale: dateFnsLocale })} → ${format(returnDate, "d MMM yyyy", { locale: dateFnsLocale })}`;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId 
            ? { 
                ...m, 
                widgetConfirmed: true, 
                widgetSelectedValue: { departure, returnDate },
                widgetDisplayLabel: rangeLabel
              } 
            : m
        )
      );
      
      // Add auto-generated user message explaining the selection
      const userChoiceMessage: ChatMessage = {
        id: `user-choice-dates-${Date.now()}`,
        role: "user",
        text: t("planner.widget.userChoice.dateRange", { from: format(departure, "d MMMM", { locale: dateFnsLocale }), to: format(returnDate, "d MMMM yyyy", { locale: dateFnsLocale }) }),
        isAutoGenerated: true,
      };
      
      setMessages((prev) => [...prev, userChoiceMessage]);

      const needsTravelersWidget =
        pendingTravelersWidgetRef.current || !travelersConfirmedRef.current;
      pendingTravelersWidgetRef.current = false;

      if (needsTravelersWidget) {
        setMessages((prev) => [
          ...prev,
          {
            id: `confirm-dates-${Date.now()}`,
            role: "assistant",
            text: t("planner.widget.confirm.dateRangeWithTravelers", { from: format(departure, "d MMMM", { locale: dateFnsLocale }), to: format(returnDate, "d MMMM yyyy", { locale: dateFnsLocale }) }),
            widget: "travelersSelector",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `confirm-dates-${Date.now()}`,
            role: "assistant",
            text: t("planner.widget.confirm.datesConfirmed", { from: format(departure, "d MMMM", { locale: dateFnsLocale }), to: format(returnDate, "d MMMM yyyy", { locale: dateFnsLocale }) }),
          },
        ]);
      }
    },
    [updateMemory, setMessages, tracking]
  );

  /**
   * Handle travelers selection
   */
  const handleTravelersSelect = useCallback(
    (
      messageId: string,
      travelers: { adults: number; children: number; infants: number }
    ) => {
      updateMemory({ passengers: travelers });
      travelersConfirmedRef.current = true;

      // Update travel memory for accommodation suggestions
      updateTravelers({
        adults: travelers.adults,
        children: travelers.children,
        infants: travelers.infants,
        childrenAges: [],
      });
      
      // Track the interaction for LLM context
      tracking.trackTravelersSelect(travelers);

      // Build travelers label for display
      const travelersLabel = buildTravelersLabel(travelers);

      // Keep widget visible but mark as confirmed with selected value
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId 
            ? { 
                ...m, 
                widgetConfirmed: true, 
                widgetSelectedValue: travelers,
                widgetDisplayLabel: travelersLabel
              } 
            : m
        )
      );
      
      // Add auto-generated user message explaining the selection
      const userChoiceMessage: ChatMessage = {
        id: `user-choice-travelers-${Date.now()}`,
        role: "user",
        text: t("planner.widget.userChoice.travelers", { label: travelersLabel }),
        isAutoGenerated: true,
      };
      
      setMessages((prev) => [...prev, userChoiceMessage]);

      // Ask trip type confirmation
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-travelers-${Date.now()}`,
          role: "assistant",
          text: t("planner.widget.confirm.travelersWithTripType", { label: travelersLabel }),
          widget: "tripTypeConfirm",
        },
      ]);
    },
    [updateMemory, updateTravelers, setMessages, tracking]
  );

  /**
   * Handle trip type confirmation
   */
  const handleTripTypeConfirm = useCallback(
    (messageId: string, tripType: "roundtrip" | "oneway" | "multi") => {
      updateMemory({ tripType });
      
      // Track the interaction for LLM context
      tracking.trackTripTypeSelect(tripType);

      // Get label for display
      const tripTypeKey = { roundtrip: "roundtrip", oneway: "oneway", multi: "multi" }[tripType];
      const tripTypeLabel = t(`planner.widget.tripType.${tripTypeKey}`);

      // Keep widget visible but mark as confirmed with selected value
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId 
            ? { 
                ...m, 
                widgetConfirmed: true, 
                widgetSelectedValue: tripType,
                widgetDisplayLabel: tripTypeLabel
              } 
            : m
        )
      );
      
      // Add auto-generated user message explaining the selection
      const userChoiceMessage: ChatMessage = {
        id: `user-choice-triptype-${Date.now()}`,
        role: "user",
        text: tripType === "roundtrip" 
          ? t("planner.widget.userChoice.roundtrip")
          : tripType === "oneway" 
            ? t("planner.widget.userChoice.oneway")
            : t("planner.widget.userChoice.multi"),
        isAutoGenerated: true,
      };
      
      setMessages((prev) => [...prev, userChoiceMessage]);

      if (tripType === "multi") {
        setMessages((prev) => [
          ...prev,
          {
            id: `ask-multi-${Date.now()}`,
            role: "assistant",
            text: t("planner.widget.ask.multiSteps"),
          },
        ]);
      } else {
        searchButtonShownRef.current = true;
        setMessages((prev) => [
          ...prev,
          {
            id: `search-ready-${Date.now()}`,
            role: "assistant",
            text: t("planner.widget.confirm.tripType", { type: tripTypeLabel }),
            hasSearchButton: true,
          },
        ]);
      }
    },
    [updateMemory, setMessages, tracking]
  );

  /**
   * Handle city selection
   */
  const handleCitySelect = useCallback(
    async (
      messageId: string,
      cityName: string,
      countryName: string,
      countryCode: string
    ) => {
      citySelectionShownForCountryRef.current = null;

      // Update memory with selected city
      updateMemory({ arrival: { city: cityName, country: countryName, countryCode } });
      
      // Track the interaction for LLM context
      tracking.trackCitySelect(cityName, countryName);

      // Build display label
      const cityLabel = `${cityName}, ${countryName}`;

      // Keep widget visible but mark as confirmed with selected value
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId 
            ? { 
                ...m, 
                widgetConfirmed: true, 
                widgetSelectedValue: { cityName, countryName, countryCode },
                widgetDisplayLabel: cityLabel
              } 
            : m
        )
      );
      
      // Add auto-generated user message explaining the selection
      const userChoiceMessage: ChatMessage = {
        id: `user-choice-city-${Date.now()}`,
        role: "user",
        text: t("planner.widget.userChoice.selectCity", { city: cityName, country: countryName }),
        isAutoGenerated: true,
      };
      
      setMessages((prev) => [...prev, userChoiceMessage]);

      // Determine which date widget to show
      const hasTripDuration = !!pendingTripDurationRef.current;
      const isOneway = memory.tripType === "oneway";

      if (!memory.departureDate) {
        let widgetType: WidgetType;
        let messageText: string;

        if (hasTripDuration) {
          widgetType = "datePicker";
          messageText = t("planner.widget.ask.cityDurationChoice", { city: cityName, duration: pendingTripDurationRef.current });
        } else if (isOneway) {
          widgetType = "datePicker";
          messageText = t("planner.widget.ask.cityDepartureChoice", { city: cityName });
        } else {
          widgetType = "dateRangePicker";
          messageText = t("planner.widget.ask.cityDateChoice", { city: cityName });
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `ask-date-after-city-${Date.now()}`,
            role: "assistant",
            text: messageText,
            widget: widgetType,
            widgetData: {
              preferredMonth: pendingPreferredMonthRef.current || undefined,
              tripDuration: pendingTripDurationRef.current || undefined,
            },
          },
        ]);
      } else if (!memory.returnDate && memory.tripType !== "oneway") {
        if (hasTripDuration) {
          const days = parseDurationToDays(pendingTripDurationRef.current!);
          if (days) {
            const computedReturn = addDays(memory.departureDate!, days);
            updateMemory({ returnDate: computedReturn });
            pendingTripDurationRef.current = null;

            setMessages((prev) => [
              ...prev,
              {
                id: `ask-travelers-after-city-${Date.now()}`,
                role: "assistant",
                text: t("planner.widget.ask.cityDateRange", { city: cityName, from: format(memory.departureDate!, "d MMMM", { locale: dateFnsLocale }), to: format(computedReturn, "d MMMM", { locale: dateFnsLocale }) }),
                widget: "travelersSelector",
              },
            ]);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `ask-return-after-city-${Date.now()}`,
              role: "assistant",
              text: t("planner.widget.ask.returnDateChoice"),
              widget: "returnDatePicker",
              widgetData: {
                preferredMonth: pendingPreferredMonthRef.current || undefined,
              },
            },
          ]);
        }
      } else if (memory.passengers.adults < 1) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ask-travelers-after-city-${Date.now()}`,
            role: "assistant",
            text: t("planner.widget.ask.cityTravelers", { city: cityName }),
            widget: "travelersSelector",
          },
        ]);
      }
    },
    [memory, updateMemory, setMessages, tracking]
  );

  /**
   * Handle departure city selection
   */
  const handleDepartureCitySelect = useCallback(
    async (
      messageId: string,
      cityName: string,
      countryName: string,
      countryCode: string
    ) => {
      updateMemory({ departure: { city: cityName, country: countryName, countryCode } });
      pendingFromCountryRef.current = null;
      
      // Track the interaction for LLM context (departure city)
      tracking.trackCitySelect(cityName, `${countryName} (départ)`);

      // Build display label
      const cityLabel = `${cityName}, ${countryName}`;

      // Keep widget visible but mark as confirmed with selected value
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId 
            ? { 
                ...m, 
                widgetConfirmed: true, 
                widgetSelectedValue: { cityName, countryName, countryCode },
                widgetDisplayLabel: cityLabel
              } 
            : m
        )
      );
      
      // Add auto-generated user message explaining the selection
      const userChoiceMessage: ChatMessage = {
        id: `user-choice-departure-${Date.now()}`,
        role: "user",
        text: t("planner.widget.userChoice.departFrom", { city: cityName }),
        isAutoGenerated: true,
      };
      
      setMessages((prev) => [...prev, userChoiceMessage]);

      // Check if we need to ask for destination
      if (!memory.arrival?.city) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ask-destination-${Date.now()}`,
            role: "assistant",
            text: t("planner.widget.confirm.departureCity", { city: cityName }),
          },
        ]);
      }
    },
    [memory.arrival?.city, updateMemory, setMessages, tracking]
  );

  /**
   * Handle search button click
   */
  const handleSearchButtonClick = useCallback(
    (messageId: string) => {
      const totalTravelers =
        memory.passengers.adults +
        memory.passengers.children +
        memory.passengers.infants;

      // If only 1 adult (default), ask for confirmation
      if (
        totalTravelers === 1 &&
        memory.passengers.adults === 1 &&
        memory.passengers.children === 0 &&
        memory.passengers.infants === 0
      ) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, hasSearchButton: false, widget: "travelersConfirmBeforeSearch" }
              : m
          )
        );
        pendingSearchAfterTravelersRef.current = true;
      } else {
        eventBus.emit("flight:triggerSearch");
      }
    },
    [memory.passengers, setMessages]
  );

  /**
   * Handle solo travel confirmation
   */
  const handleTravelersConfirmSolo = useCallback(
    (messageId: string) => {
      // Track solo confirmation (1 adult)
      tracking.trackTravelersSelect({ adults: 1, children: 0, infants: 0 });
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, widget: undefined } : m
        )
      );
      pendingSearchAfterTravelersRef.current = false;
      eventBus.emit("flight:triggerSearch");
    },
    [setMessages, tracking]
  );

  /**
   * Handle travelers edit before search
   */
  const handleTravelersEditBeforeSearch = useCallback(
    (
      messageId: string,
      travelers: { adults: number; children: number; infants: number }
    ) => {
      updateMemory({ passengers: travelers });
      
      // Track the interaction for LLM context
      tracking.trackTravelersSelect(travelers);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, widget: undefined } : m
        )
      );
      pendingSearchAfterTravelersRef.current = false;

      const travelersLabel = buildTravelersLabel(travelers);

      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-updated-${Date.now()}`,
          role: "assistant",
          text: t("planner.widget.confirm.searchReadyUpdated", { label: travelersLabel }),
          hasSearchButton: true,
        },
      ]);
    },
    [updateMemory, setMessages, tracking]
  );

  /**
   * Determine which widget to show based on current state
   */
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

  /**
   * Get current widget data for display
   */
  const getWidgetData = useCallback(() => {
    return {
      preferredMonth: pendingPreferredMonthRef.current || undefined,
      tripDuration: pendingTripDurationRef.current || undefined,
    };
  }, []);

  // ============================================================
  // NEW WIDGET HANDLERS (Phase 2-4 Integration)
  // ============================================================

  /**
   * Handle budget range selection
   */
  const handleBudgetSelect = useCallback(
    (messageId: string, range: { min: number; max: number } | null) => {
      if (!range) {
        // User cleared the budget filter
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, widgetConfirmed: false, widgetSelectedValue: undefined, widgetDisplayLabel: undefined }
              : m
          )
        );
        return;
      }

      const budgetLabel = range.max >= 1000
        ? `${range.min}€ - ${(range.max / 1000).toFixed(1)}k€`
        : `${range.min}€ - ${range.max}€`;

      // Track the interaction
      tracking.recordInteraction(
        `budget-${Date.now()}`,
        "budget_selected",
        range,
        `Budget défini : ${budgetLabel}`
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: range, widgetDisplayLabel: budgetLabel }
            : m
        )
      );

      // Emit event for other panels to react
      eventBus.emit("budget:selected", { range, perPerson: false });
    },
    [setMessages, tracking]
  );

  /**
   * Handle quick filter chip selection
   */
  const handleQuickFilterSelect = useCallback(
    (messageId: string, chipId: string) => {
      tracking.recordInteraction(
        `filter-${Date.now()}`,
        "filter_selected",
        { chipId },
        `Filtre appliqué : ${chipId}`
      );

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;

          const currentSelected = (m.widgetSelectedValue as string[]) || [];
          const newSelected = currentSelected.includes(chipId)
            ? currentSelected.filter((id) => id !== chipId)
            : [...currentSelected, chipId];

          return {
            ...m,
            widgetSelectedValue: newSelected,
            widgetDisplayLabel: newSelected.length > 0 ? `${newSelected.length} filtre(s)` : undefined,
          };
        })
      );

      eventBus.emit("filters:changed", { filterId: chipId, selected: true });
    },
    [setMessages, tracking]
  );

  /**
   * Handle clear all quick filters
   */
  const handleQuickFilterClear = useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetSelectedValue: [], widgetDisplayLabel: undefined, widgetConfirmed: false }
            : m
        )
      );
      eventBus.emit("filters:cleared");
    },
    [setMessages]
  );

  /**
   * Handle star rating selection
   */
  const handleStarRatingSelect = useCallback(
    (messageId: string, minStars: number, maxStars: number) => {
      const ratingLabel = minStars === maxStars
        ? `${minStars} étoiles`
        : `${minStars}-${maxStars} étoiles`;

      tracking.recordInteraction(
        `rating-${Date.now()}`,
        "rating_selected",
        { minStars, maxStars },
        `Classement hôtel : ${ratingLabel}`
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: { minStars, maxStars }, widgetDisplayLabel: ratingLabel }
            : m
        )
      );

      eventBus.emit("hotels:starRating", { min: minStars, max: maxStars });
    },
    [setMessages, tracking]
  );

  /**
   * Handle cabin class selection
   */
  const handleCabinClassSelect = useCallback(
    (messageId: string, cabinClass: string) => {
      const cabinLabels: Record<string, string> = {
        economy: "Économique",
        premium_economy: "Premium Éco",
        business: "Affaires",
        first: "Première",
      };
      const cabinLabel = cabinLabels[cabinClass] || cabinClass;

      tracking.recordInteraction(
        `cabin-${Date.now()}`,
        "cabin_class_selected",
        { cabinClass },
        `Classe de cabine : ${cabinLabel}`
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: cabinClass, widgetDisplayLabel: cabinLabel }
            : m
        )
      );

      updateMemory({ cabinClass: cabinClass as FlightMemory["cabinClass"] });
    },
    [setMessages, updateMemory, tracking]
  );

  /**
   * Handle direct flight toggle
   */
  const handleDirectFlightToggle = useCallback(
    (messageId: string, directOnly: boolean) => {
      const label = directOnly ? "Vols directs uniquement" : "Avec escales";

      tracking.recordInteraction(
        `direct-${Date.now()}`,
        "direct_flight_toggled",
        { directOnly },
        label
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: directOnly, widgetDisplayLabel: label }
            : m
        )
      );

      eventBus.emit("flights:directOnly", { directOnly });
    },
    [setMessages, tracking]
  );

  /**
   * Handle duration selection (for activities)
   */
  const handleDurationSelect = useCallback(
    (messageId: string, durationId: string) => {
      tracking.recordInteraction(
        `duration-${Date.now()}`,
        "duration_selected",
        { durationId },
        `Durée : ${durationId}`
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: durationId, widgetDisplayLabel: durationId }
            : m
        )
      );

      eventBus.emit("activities:duration", { duration: durationId });
    },
    [setMessages, tracking]
  );

  /**
   * Handle time of day selection (for activities)
   */
  const handleTimeOfDaySelect = useCallback(
    (messageId: string, timeSlot: string) => {
      const timeLabels: Record<string, string> = {
        morning: "Matin",
        afternoon: "Après-midi",
        evening: "Soir",
        night: "Nuit",
      };
      const timeLabel = timeLabels[timeSlot] || timeSlot;

      tracking.recordInteraction(
        `time-${Date.now()}`,
        "time_of_day_selected",
        { timeSlot },
        `Moment : ${timeLabel}`
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: timeSlot, widgetDisplayLabel: timeLabel }
            : m
        )
      );

      eventBus.emit("activities:timeOfDay", { timeSlot });
    },
    [setMessages, tracking]
  );

  /**
   * Handle comparison widget item selection
   */
  const handleComparisonSelect = useCallback(
    (messageId: string, itemId: string) => {
      tracking.recordInteraction(
        `comparison-select-${Date.now()}`,
        "comparison_item_selected",
        { itemId },
        `Option sélectionnée dans la comparaison`
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: itemId }
            : m
        )
      );

      eventBus.emit("comparison:selected", { itemId, itemType: "unknown" });
    },
    [setMessages, tracking]
  );

  /**
   * Handle comparison widget item removal
   */
  const handleComparisonRemove = useCallback(
    (messageId: string, itemId: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.widgetData?.items) return m;

          const newItems = (m.widgetData.items as Array<{ id: string }>).filter((item) => item.id !== itemId);
          return {
            ...m,
            widgetData: { ...m.widgetData, items: newItems },
          };
        })
      );
    },
    [setMessages]
  );

  /**
   * Handle conflict resolution
   */
  const handleConflictResolve = useCallback(
    (messageId: string, conflictId: string) => {
      tracking.recordInteraction(
        `conflict-${Date.now()}`,
        "conflict_resolved",
        { conflictId },
        `Conflit résolu`
      );

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.widgetData?.conflicts) return m;

          const newConflicts = (m.widgetData.conflicts as Array<{ id: string; resolved?: boolean }>).map((c) =>
            c.id === conflictId ? { ...c, resolved: true } : c
          );
          return {
            ...m,
            widgetData: { ...m.widgetData, conflicts: newConflicts },
          };
        })
      );

      eventBus.emit("conflict:resolved", { conflictId });
    },
    [setMessages, tracking]
  );

  /**
   * Handle price alert action
   */
  const handlePriceAlertAction = useCallback(
    (messageId: string) => {
      tracking.recordInteraction(
        `price-alert-${Date.now()}`,
        "price_alert_action",
        {},
        `Action sur alerte prix`
      );

      eventBus.emit("priceAlert:action", { alertId: messageId });
    },
    [tracking]
  );

  /**
   * Handle price alert dismiss
   */
  const handlePriceAlertDismiss = useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, widget: undefined, widgetData: undefined }
            : m
        )
      );
    },
    [setMessages]
  );

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

    // Comparison widget handlers (Phase 3)
    handleComparisonSelect,
    handleComparisonRemove,

    // Alert widget handlers (Phase 4)
    handleConflictResolve,
    handlePriceAlertAction,
    handlePriceAlertDismiss,

    // Widget determination
    determineNextWidget,
    getWidgetData,

    // Refs for external access
    citySelectionShownRef: citySelectionShownForCountryRef,
    pendingFromCountryRef,
  };
}

export default useChatWidgetFlow;
