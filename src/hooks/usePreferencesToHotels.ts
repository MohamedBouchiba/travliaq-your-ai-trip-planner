/**
 * Hook: Propagate preferences to hotel filters
 * Listens to preferences:updated events and applies filters to accommodation
 */

import { useCallback } from "react";
import { usePlannerEvent } from "@/lib/eventBus";
import { usePreferenceMemoryStore, useAccommodationMemoryStore } from "@/stores/hooks";

export function usePreferencesToHotels() {
  const { getHotelFilters } = usePreferenceMemoryStore();
  const { memory, getActiveAccommodation, setBudgetPreset, toggleAmenity, toggleType } = useAccommodationMemoryStore();
  
  // Apply preferences to hotel filters when event is received
  const applyPreferencesToHotels = useCallback(() => {
    const filters = getHotelFilters();
    const activeAccommodation = getActiveAccommodation();
    
    // Only apply if user hasn't manually modified budget
    if (activeAccommodation?.userModifiedBudget) {
      console.log("[usePreferencesToHotels] Skipping - user has manually modified budget");
      return;
    }
    
    // Map comfort level to budget preset
    const comfort = filters.priceMax;
    if (comfort <= 80) {
      setBudgetPreset("eco");
    } else if (comfort <= 150) {
      setBudgetPreset("comfort");
    } else if (comfort <= 300) {
      setBudgetPreset("premium");
    } else {
      setBudgetPreset("luxury");
    }
    
    console.log("[usePreferencesToHotels] Applied preference filters:", filters);
  }, [getHotelFilters, getActiveAccommodation, setBudgetPreset]);

  // Listen for preference updates and auto-apply when appropriate
  usePlannerEvent("preferences:updated", (data) => {
    // Only auto-apply if it's from chat (AI detected) and includes relevant fields
    if (data.source === "chat" && data.fields?.some(f => 
      f === "comfortLevel" || f === "styleAxes" || f === "mustHaves"
    )) {
      applyPreferencesToHotels();
    }
  });
  
  return { applyPreferencesToHotels };
}

export default usePreferencesToHotels;
