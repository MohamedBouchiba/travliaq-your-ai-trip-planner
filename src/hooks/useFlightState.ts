import { useState, useRef, useCallback } from "react";
import { usePlannerEvent, eventBus } from "@/lib/eventBus";
import type { FlightFormData, ConfirmedAirports } from "@/types/flight";
import type { Airport } from "@/hooks/useNearestAirports";
import { usePlannerStoreV2 } from "@/stores/plannerStoreV2";

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
    // Flash the flights tab to indicate an update
    eventBus.emit("tab:flash", { tab: "flights" });
  }, [setIsPanelVisible]));

  // Event listener: airport selection
  usePlannerEvent("flight:selectAirport", useCallback((data) => {
    setSelectedAirport({ field: data.field, airport: { ...data.airport, distance_km: 0 } });
  }, []));

  // Event listener: trigger flight search
  usePlannerEvent("flight:triggerSearch", useCallback(() => {
    setActiveTab("flights");
    setIsPanelVisible(true);
    
    // Sync multi-destination legs from memory store to flight form
    const storeState = usePlannerStoreV2.getState();
    if (storeState.tripType === "multi" && storeState.legs.length > 0) {
      setFlightFormData({
        tripType: "multi",
        legs: storeState.legs.map(leg => ({
          from: leg.departure?.city || leg.departure?.iata || "",
          to: leg.arrival?.city || leg.arrival?.iata || "",
          date: leg.date ? leg.date.toISOString().split("T")[0] : undefined,
        })),
      });
    }
    
    setTriggerFlightSearch(true);
  }, [setActiveTab, setIsPanelVisible, setFlightFormData]));

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
