import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@/styles/mapbox-overrides.css";
import eventBus from "@/lib/eventBus";
import { MAPBOX_ACCESS_TOKEN } from "@/config/mapbox";

/**
 * Initializes the Mapbox GL map instance, handles resize observation,
 * event bus bounds requests, and search-in-area status tracking.
 */
export function useMapInit(
  initialCenter: [number, number],
  initialZoom: number,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(initialZoom);
  const [isSearchingInArea, setIsSearchingInArea] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const handlePopupClose = () => {
      const prev = (window as any).__selectedDestinationPinEl as HTMLElement | undefined;
      if (prev) {
        prev.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.3))";
        prev.style.transform = "scale(1)";
      }
      (window as any).__selectedDestinationPinEl = undefined;
    };

    window.addEventListener("destination-popup-close", handlePopupClose);

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [initialCenter[0], initialCenter[1]],
      zoom: initialZoom,
      attributionControl: false,
    });

    // Compact attribution control
    map.current.addControl(
      new mapboxgl.AttributionControl({ compact: true, customAttribution: "" }),
      "bottom-right"
    );
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Track zoom level for airport marker sizing
    map.current.on("zoomend", () => {
      if (map.current) {
        setCurrentZoom(map.current.getZoom());
      }
    });

    return () => {
      window.removeEventListener("destination-popup-close", handlePopupClose);
      handlePopupClose();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Event bus handler: Send map bounds when requested
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const handleGetBounds = () => {
      if (!map.current) return;

      const bounds = map.current.getBounds();
      eventBus.emit("map:bounds", {
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
      });
    };

    eventBus.on("map:getBounds", handleGetBounds);

    return () => {
      eventBus.off("map:getBounds", handleGetBounds);
    };
  }, [mapLoaded]);

  // Listen to search in area status
  useEffect(() => {
    const handleSearchStatus = (data: { isSearching: boolean }) => {
      setIsSearchingInArea(data.isSearching);
    };

    eventBus.on("map:searchInAreaStatus", handleSearchStatus);

    return () => {
      eventBus.off("map:searchInAreaStatus", handleSearchStatus);
    };
  }, []);

  // Resize map when container size changes (panel resize)
  useEffect(() => {
    if (!mapContainer.current || !map.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to debounce resize calls
      requestAnimationFrame(() => {
        map.current?.resize();
      });
    });

    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mapLoaded]);

  return {
    mapContainer,
    map,
    mapLoaded,
    currentZoom,
    isSearchingInArea,
  };
}
