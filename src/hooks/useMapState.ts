import { useState, useCallback } from "react";
import { usePlannerEvent } from "@/lib/eventBus";

/**
 * Hook to manage map state (center, zoom, animation)
 * Includes event bus subscriptions for map updates
 */
export function useMapState() {
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 20]); // Globe view
  const [mapZoom, setMapZoom] = useState(1.5); // Zoom out to see globe
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);

  // Event listener: map zoom from event bus
  usePlannerEvent("map:zoom", useCallback((data) => {
    setMapCenter(data.center);
    setMapZoom(data.zoom);
  }, []));

  const handleAnimationComplete = useCallback(() => {
    setInitialAnimationDone(true);
  }, []);

  return {
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    initialAnimationDone,
    setInitialAnimationDone,
    handleAnimationComplete,
  };
}
