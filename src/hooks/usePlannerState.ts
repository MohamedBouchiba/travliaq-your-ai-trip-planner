import { useState, useEffect, useCallback } from "react";
import { usePlannerEvent } from "@/lib/eventBus";
import type { TabType, MapPin } from "@/pages/TravelPlanner";

const ACTIVE_TAB_KEY = "travliaq_planner_active_tab";

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

  // Event listener: tab change from event bus
  usePlannerEvent("tab:change", useCallback((data) => {
    setActiveTab(data.tab);
    setIsPanelVisible(true);
    setSelectedPin(null);
  }, []));

  // Persist active tab changes
  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  // Handler for tab change via UI
  const handleTabChange = useCallback((tab: TabType) => {
    // Toggle: if clicking on the same tab and panel is visible, close it
    if (tab === activeTab && isPanelVisible) {
      setIsPanelVisible(false);
    } else {
      setActiveTab(tab);
      setSelectedPin(null);
      setIsPanelVisible(true);
    }
  }, [activeTab, isPanelVisible]);

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
