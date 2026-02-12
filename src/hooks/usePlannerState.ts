import { useState, useEffect, useCallback } from "react";
import { usePlannerEvent, eventBus } from "@/lib/eventBus";
import { FLIGHTS_ZOOM, STAYS_ZOOM, ACTIVITIES_ZOOM } from "@/constants/mapSettings";
import type { TabType, MapPin } from "@/pages/TravelPlanner";

import { STORAGE_KEYS } from "@/config/storageKeys";
const ACTIVE_TAB_KEY = STORAGE_KEYS.PLANNER_ACTIVE_TAB;

/**
 * Hook to manage planner state (active tab, panel visibility, selected pin)
 * Includes event bus subscriptions for tab changes
 */
export function usePlannerState() {
  // Restore last active tab from localStorage or default to flights
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === "undefined") return "flights";
    const saved = localStorage.getItem(ACTIVE_TAB_KEY);
    if (saved && ["flights", "activities", "stays", "preferences"].includes(saved)) {
      return saved as TabType;
    }
    return "flights";
  });

  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);

  // Get zoom level for a tab
  const getZoomForTab = useCallback((tab: TabType): number => {
    switch (tab) {
      case "flights":
        return FLIGHTS_ZOOM;
      case "stays":
        return STAYS_ZOOM;
      case "activities":
        return ACTIVITIES_ZOOM;
      default:
        return FLIGHTS_ZOOM;
    }
  }, []);

  // Event listener: tab change from event bus
  usePlannerEvent("tab:change", useCallback((data) => {
    setActiveTab(data.tab);
    setIsPanelVisible(true);
    setSelectedPin(null);
  }, []));

  // Event listener: open hotel panel (from map pin click when panel is closed)
  usePlannerEvent("hotels:openPanel", useCallback(() => {
    setActiveTab("stays");
    setIsPanelVisible(true);
  }, []));

  // Event listener: panel toggle (for chat session reset/delete)
  usePlannerEvent("panel:toggle", useCallback((data) => {
    setIsPanelVisible(data.visible);
  }, []));

  // Persist active tab changes
  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  // Handler for tab change via UI - with automatic zoom adjustment
  const handleTabChange = useCallback((tab: TabType) => {
    // Toggle: if clicking on the same tab and panel is visible, close it
    if (tab === activeTab && isPanelVisible) {
      setIsPanelVisible(false);
    } else {
      setActiveTab(tab);
      setSelectedPin(null);
      setIsPanelVisible(true);
      
      // Emit zoom change for the new tab (without changing center)
      // The map will adjust zoom level to match the tab's default
      if (tab !== "preferences") {
        const newZoom = getZoomForTab(tab);
        eventBus.emit("map:zoomOnly", { zoom: newZoom });
      }
    }
  }, [activeTab, isPanelVisible, getZoomForTab]);

  const handlePinClick = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedPin(null);
  }, []);

  const handleAddToTrip = useCallback((pin: MapPin) => {
    console.log("Added to trip:", pin);
    setSelectedPin(null);
  }, []);

  return {
    activeTab,
    setActiveTab,
    isPanelVisible,
    setIsPanelVisible,
    selectedPin,
    setSelectedPin,
    handleTabChange,
    handlePinClick,
    handleCloseCard,
    handleAddToTrip,
  };
}
