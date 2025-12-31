import { useState, useRef, useCallback } from "react";
import { usePlannerEvent } from "@/lib/eventBus";
import type { FlightFormData, SelectedAirport, ConfirmedAirports } from "@/pages/TravelPlanner";

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
