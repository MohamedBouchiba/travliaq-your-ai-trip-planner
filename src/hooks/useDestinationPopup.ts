import { useState, useCallback } from "react";
import type { DestinationClickEvent } from "@/components/planner/PlannerMap";

/**
 * Hook to manage destination popup and YouTube shorts panel
 */
export function useDestinationPopup(setIsPanelVisible: (visible: boolean) => void) {
  const [destinationPopup, setDestinationPopup] = useState<{
    cityName: string;
    countryName?: string;
    position: { x: number; y: number };
  } | null>(null);

  const [youtubePanel, setYoutubePanel] = useState<{
    city: string;
    countryName?: string;
  } | null>(null);

  // Handle destination marker click
  const handleDestinationClick = useCallback((event: DestinationClickEvent) => {
    setDestinationPopup({
      cityName: event.cityName,
      countryName: event.countryName,
      position: event.screenPosition,
    });
  }, []);

  // Open YouTube panel from popup
  const handleOpenYouTube = useCallback(() => {
    if (destinationPopup) {
      setYoutubePanel({
        city: destinationPopup.cityName,
        countryName: destinationPopup.countryName,
      });
      window.dispatchEvent(new Event("destination-popup-close"));
      setDestinationPopup(null);
      setIsPanelVisible(true);
    }
  }, [destinationPopup, setIsPanelVisible]);

  const handleClosePopup = useCallback(() => {
    window.dispatchEvent(new Event("destination-popup-close"));
    setDestinationPopup(null);
  }, []);

  const handleCloseYouTube = useCallback(() => {
    setYoutubePanel(null);
  }, []);

  return {
    destinationPopup,
    setDestinationPopup,
    youtubePanel,
    setYoutubePanel,
    handleDestinationClick,
    handleOpenYouTube,
    handleClosePopup,
    handleCloseYouTube,
  };
}
