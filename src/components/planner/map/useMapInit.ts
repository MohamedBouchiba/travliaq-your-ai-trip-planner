import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/mapbox-overrides.css";
import eventBus from "@/lib/eventBus";
import { MAPBOX_ACCESS_TOKEN } from "@/config/mapbox";

/**
 * Initializes the Mapbox GL map instance, handles resize observation,
 * event bus bounds requests, and search-in-area status tracking.
 */
/** Check if browser supports WebGL */
function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl") || canvas.getContext("webgl2") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function useMapInit(
  initialCenter: [number, number],
  initialZoom: number,
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(initialZoom);
  const [isSearchingInArea, setIsSearchingInArea] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!isWebGLSupported()) {
      console.warn("[useMapInit] WebGL not supported — skipping map init");
      setWebglSupported(false);
      return;
    }

    const handlePopupClose = () => {
      const prev = (window as any).__selectedDestinationPinEl as HTMLElement | undefined;
      if (prev) {
        prev.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.3))";
        prev.style.transform = "scale(1)";
      }
      (window as any).__selectedDestinationPinEl = undefined;
    };

    window.addEventListener("destination-popup-close", handlePopupClose);

    maplibregl.accessToken = MAPBOX_ACCESS_TOKEN;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [initialCenter[0], initialCenter[1]],
      zoom: initialZoom,
      attributionControl: false,
    });

    // Compact attribution control
    map.current.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: "" }),
      "bottom-right"
    );
    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

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
    webglSupported,
  };
}
