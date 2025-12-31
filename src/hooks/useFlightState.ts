import { useState, useRef, useCallback } from "react";
import { usePlannerEvent } from "@/lib/eventBus";
import type { FlightFormData, ConfirmedAirports } from "@/types/flight";
import type { Airport } from "@/hooks/useNearestAirports";

// Selected airport info to pass to FlightsPanel
export interface SelectedAirport {
  field: "from" | "to";
  airport: Airport;
}

/**
 * Hook to manage flight-related state
 * Includes event bus subscriptions for flight updates
 */
export function useFlightState(
  setActiveTab: (tab: "flights") => void,
  setIsPanelVisible: (visible: boolean) => void
) {
  const [flightFormData, setFlightFormData] = useState<FlightFormData | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<SelectedAirport | null>(null);
  const [triggerFlightSearch, setTriggerFlightSearch] = useState(false);
  const [confirmedMultiAirports, setConfirmedMultiAirports] = useState<ConfirmedAirports | null>(null);
  const searchMessageSentRef = useRef(false);

  // Event listener: flight form data update
  usePlannerEvent("flight:updateFormData", useCallback((data) => {
    setFlightFormData(data);
    setIsPanelVisible(true);
    searchMessageSentRef.current = false;
  }, [setIsPanelVisible]));

  // Event listener: airport selection
  usePlannerEvent("flight:selectAirport", useCallback((data) => {
    setSelectedAirport({ field: data.field, airport: data.airport });
  }, []));

  // Event listener: trigger flight search
  usePlannerEvent("flight:triggerSearch", useCallback(() => {
    setActiveTab("flights");
    setIsPanelVisible(true);
    setTriggerFlightSearch(true);
  }, [setActiveTab, setIsPanelVisible]));

  // Event listener: confirmed airports for multi-destination
  usePlannerEvent("flight:confirmedAirports", useCallback((data) => {
    setActiveTab("flights");
    setIsPanelVisible(true);
    setConfirmedMultiAirports(data);
  }, [setActiveTab, setIsPanelVisible]));

  return {
    flightFormData,
    setFlightFormData,
    selectedAirport,
    setSelectedAirport,
    triggerFlightSearch,
    setTriggerFlightSearch,
    confirmedMultiAirports,
    setConfirmedMultiAirports,
    searchMessageSentRef,
  };
}
