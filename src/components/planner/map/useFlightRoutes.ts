import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { TabType } from "@/pages/TravelPlanner";
import type { MemoryRoutePoint } from "@/stores/hooks";
import type { DestinationClickEvent } from "./types";
import { generateGreatCircleArc, cssHsl } from "./constants";

/**
 * Draws flight route markers and curved flight path lines on the map
 * from the flight memory store. Also handles legacy route cleanup.
 */
export function useFlightRoutes(opts: {
  map: React.MutableRefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
  activeTab: TabType;
  getRoutePoints: () => MemoryRoutePoint[];
  onDestinationClick?: (event: DestinationClickEvent) => void;
}) {
  const { map, mapLoaded, activeTab, getRoutePoints, onDestinationClick } = opts;

  const memoryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Ref to track if routes have been drawn (persists across tab changes)
  const routesDrawnRef = useRef(false);
  const lastRouteSignatureRef = useRef<string>("");

  // Track the previous activeTab to detect tab switches
  const prevActiveTabForFlightsRef = useRef<TabType>(activeTab);
  // Track if we should animate the map (fitBounds) or just redraw markers
  const shouldAnimateMapRef = useRef(true);

  // Draw route markers from FlightMemory (most up-to-date source)
  // Only show on flights tab - hide on other tabs
  // CRITICAL: NO map animation when just switching tabs - only when routes actually change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const memoryPointsRaw = getRoutePoints();

    // Guard: some points may not have coordinates yet (e.g., city chosen before geocoding)
    const memoryPoints = memoryPointsRaw.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
    );

    // Create a signature for the route POINTS only (not including activeTab)
    // This way we detect when the route itself changes
    const pointsSignature = JSON.stringify(
      memoryPoints.map((p) => ({
        lat: p.lat.toFixed(4),
        lng: p.lng.toFixed(4),
        type: p.type,
      }))
    );

    // Detect if this is just a tab switch (routes unchanged) vs. actual route change
    const wasOnDifferentTab = prevActiveTabForFlightsRef.current !== activeTab;
    const routeActuallyChanged = pointsSignature !== lastRouteSignatureRef.current;
    prevActiveTabForFlightsRef.current = activeTab;

    // Determine if we should animate the map
    // Animate ONLY when routes actually change, NOT when just switching tabs
    shouldAnimateMapRef.current = routeActuallyChanged || !routesDrawnRef.current;

    // If routes haven't changed AND routes are already drawn AND we're just switching back to flights
    // Then skip completely - the routes are already visible on the map
    if (!routeActuallyChanged && routesDrawnRef.current && wasOnDifferentTab && activeTab === "flights") {
      // Routes already drawn, just switching back to flights tab - do nothing at all
      return;
    }

    lastRouteSignatureRef.current = pointsSignature;

    // Clear previous memory markers
    memoryMarkersRef.current.forEach((marker) => marker.remove());
    memoryMarkersRef.current = [];

    // Remove previous memory route lines
    const memorySourceId = "memory-route";
    const memoryArrowId = "memory-route-arrow";
    const memoryGlowId = `${memorySourceId}-glow`;

    // Remove layers in order
    [memoryArrowId, memorySourceId, memoryGlowId].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });

    // Remove source
    if (map.current?.getSource(memorySourceId)) {
      map.current.removeSource(memorySourceId);
    }

    // Mark routes as not drawn if no points
    if (memoryPoints.length === 0) {
      routesDrawnRef.current = false;
      return;
    }

    // DON'T show flight routes on stays or activities tabs - only show location markers
    if (activeTab === "stays" || activeTab === "activities") {
      routesDrawnRef.current = false;
      return;
    }

    if (memoryPoints.length === 0) return;

    // Helper to extract city name from various formats
    const extractCityName = (label: string, cityFromMemory?: string): string => {
      // Prefer the city from memory if available
      if (cityFromMemory) return cityFromMemory;

      // Common airport name patterns to strip:
      // "Charles de Gaulle (CDG)" -> look for city in memory
      // "Paris Charles de Gaulle" -> "Paris"
      // "Brussels Airport (BRU)" -> "Brussels"
      // "Copenhagen Airport (CPH)" -> "Copenhagen"

      // Remove IATA code in parentheses
      let cityName = label.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();

      // Remove common airport suffixes
      const airportSuffixes = [
        " Airport", " International", " Intl", " Aéroport",
        " Charles de Gaulle", " Orly", " Schiphol", " Heathrow",
        " Gatwick", " Stansted", " Luton", " Beauvais",
        " Kastrup", " Zaventem", " El Prat", " Barajas",
        " Fiumicino", " Marco Polo", " Malpensa", " Linate",
        " Ben Gurion", " Sky Harbor", " O'Hare", " JFK",
        " LaGuardia", " Newark", " Pearson", " Trudeau"
      ];

      for (const suffix of airportSuffixes) {
        if (cityName.toLowerCase().endsWith(suffix.toLowerCase())) {
          cityName = cityName.slice(0, -suffix.length).trim();
          break;
        }
      }

      // If still looks like airport name, try to get first word (often city)
      if (cityName.includes(" ") && cityName.length > 20) {
        // Long name, take first word as city guess
        cityName = cityName.split(" ")[0];
      }

      return cityName || label;
    };

    // Helper to get the best city name for a point
    const getBestCityName = (point: MemoryRoutePoint): string => {
      // Priority: 1. city from memory, 2. extracted from label
      return point.city || extractCityName(point.label, point.city);
    };


    // Create markers for each point with travel-themed design
    memoryPoints.forEach((point, index) => {
      // Outer container for stable positioning
      const container = document.createElement("div");
      container.className = "memory-route-marker-container";

      const isDeparture = point.type === "departure";
      const isArrival = point.type === "arrival";
      const isWaypoint = point.type === "waypoint";
      const isClickable = !isDeparture; // All points except departure are clickable for videos

      // Color based on point type
      const getColors = () => {
        if (isDeparture) return { main: 'hsl(221.2, 83.2%, 53.3%)', dark: 'hsl(221.2, 83.2%, 43.3%)' };
        if (isArrival) return { main: 'hsl(142, 76%, 36%)', dark: 'hsl(142, 76%, 26%)' };
        // Waypoints get a different color (amber/orange)
        return { main: 'hsl(38, 92%, 50%)', dark: 'hsl(38, 92%, 40%)' };
      };
      const colors = getColors();

      // Icon based on type
      const getIcon = () => {
        if (isDeparture) return '\u2708\uFE0F';
        if (isWaypoint) return `${index}`; // Show step number for waypoints
        return '\uD83D\uDCCD';
      };

      // Create a stylized pin with travel theme
      container.innerHTML = `
        <div class="travel-pin ${isDeparture ? 'departure' : isWaypoint ? 'waypoint' : 'arrival'}" style="
          position: relative;
          width: 48px;
          height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: ${isClickable ? 'pointer' : 'default'};
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          animation: pinDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: ${index * 0.15}s;
          opacity: 0;
          transform: translateY(-20px);
        ">
          <!-- Pin body -->
          <div style="
            width: 44px;
            height: 44px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: linear-gradient(135deg, ${colors.main} 0%, ${colors.dark} 100%);
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 -3px 6px rgba(0,0,0,0.15);
          ">
            <span style="
              transform: rotate(45deg);
              font-size: ${isWaypoint ? '16px' : '20px'};
              font-weight: ${isWaypoint ? '700' : 'normal'};
              color: ${isWaypoint ? 'white' : 'inherit'};
              filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
            ">${getIcon()}</span>
          </div>
          <!-- Pulse ring for clickable destinations -->
          ${isClickable ? `
            <div style="
              position: absolute;
              top: 7px;
              left: 2px;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              border: 2px solid ${colors.main};
              animation: pulseRing 2s ease-out infinite;
              animation-delay: ${index * 0.3}s;
              opacity: 0;
            "></div>
          ` : ''}
          <!-- Label -->
          <div style="
            position: absolute;
            top: -28px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            white-space: nowrap;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            backdrop-filter: blur(4px);
          ">${getBestCityName(point)}</div>
        </div>
        <style>
          @keyframes pinDrop {
            0% { opacity: 0; transform: translateY(-20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulseRing {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        </style>
      `;

      const pinEl = container.querySelector('.travel-pin') as HTMLElement;

      // Add hover effect for clickable pins
      if (isClickable) {
        pinEl?.addEventListener("mouseenter", () => {
          pinEl.style.filter = "drop-shadow(0 6px 12px rgba(0,0,0,0.4))";
          pinEl.style.transform = "scale(1.1)";
        });
        pinEl?.addEventListener("mouseleave", () => {
          pinEl.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.3))";
          pinEl.style.transform = "scale(1)";
        });
      }

      // Add click handler for all destination points (not departure)
      if (isClickable && onDestinationClick) {
        pinEl?.addEventListener("click", (e) => {
          e.stopPropagation();

          // Visually emphasize the selected destination pin while the popup is open
          const deselect = () => {
            const prev = (window as any).__selectedDestinationPinEl as HTMLElement | undefined;
            if (prev) {
              prev.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.3))";
              prev.style.transform = "scale(1)";
            }
          };

          deselect();
          (window as any).__selectedDestinationPinEl = pinEl;
          if (pinEl) {
            pinEl.style.filter = "drop-shadow(0 10px 18px rgba(0,0,0,0.45))";
            pinEl.style.transform = "scale(1.18)";
          }

          // Get screen position aligned with the visible pin tip
          const markerRect = container.getBoundingClientRect();
          const screenPosition = {
            x: markerRect.left + markerRect.width / 2,
            y: markerRect.bottom,
          };

          // Use best city name for YouTube search
          const cityName = getBestCityName(point);

          onDestinationClick({
            cityName,
            countryName: point.country,
            lat: point.lat,
            lng: point.lng,
            screenPosition,
          });
        });
      }

      // Use bottom-center anchor so the pin tip touches the exact coordinate
      const marker = new mapboxgl.Marker({ element: container, anchor: "bottom" })
        .setLngLat([point.lng, point.lat])
        .addTo(map.current!);

      memoryMarkersRef.current.push(marker);
    });

    // Draw lines between route points (supports multi-destination)
    if (memoryPoints.length >= 2) {
      const routeColor = cssHsl("--primary", "221.2 83.2% 53.3%");
      const bounds = new mapboxgl.LngLatBounds();

      // Build segments between consecutive points
      const segments: { start: [number, number]; end: [number, number]; index: number }[] = [];

      for (let i = 0; i < memoryPoints.length - 1; i++) {
        const start = memoryPoints[i];
        const end = memoryPoints[i + 1];
        segments.push({
          start: [start.lng, start.lat],
          end: [end.lng, end.lat],
          index: i,
        });
        bounds.extend([start.lng, start.lat]);
      }
      // Add last point to bounds
      const lastPoint = memoryPoints[memoryPoints.length - 1];
      bounds.extend([lastPoint.lng, lastPoint.lat]);

      // Create all arc points for all segments combined
      const allSegmentArcs: [number, number][][] = segments.map(seg => {
        const arc = generateGreatCircleArc(seg.start, seg.end, 40);
        // Ensure precise start/end
        if (arc.length > 0) {
          arc[0] = seg.start;
          arc[arc.length - 1] = seg.end;
        }
        return arc;
      });

      // Create a single source with all segments as a MultiLineString
      map.current.addSource(memorySourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiLineString",
            coordinates: allSegmentArcs.map(arc => [arc[0]]), // Start with first point of each segment
          },
        },
      });

      // Main line layer
      map.current.addLayer({
        id: memorySourceId,
        type: "line",
        source: memorySourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": routeColor,
          "line-width": 3.5,
          "line-opacity": 0.9,
        },
      });

      // Glow effect
      map.current.addLayer({
        id: `${memorySourceId}-glow`,
        type: "line",
        source: memorySourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": routeColor,
          "line-width": 8,
          "line-opacity": 0.15,
          "line-blur": 4,
        },
      }, memorySourceId);

      // Progressive drawing animation for all segments
      const drawDuration = 1200 + (segments.length - 1) * 400; // Longer for more segments
      const startTime = performance.now();

      const animateDraw = (currentTime: number) => {
        if (!map.current?.getSource(memorySourceId)) return;

        const elapsed = currentTime - startTime;
        const totalProgress = Math.min(1, elapsed / drawDuration);

        // Draw segments progressively, one after another with overlap
        const segmentProgress = segments.map((_, i) => {
          const segmentStart = i / segments.length;
          const segmentEnd = (i + 1) / segments.length;
          const overlap = 0.2 / segments.length; // Small overlap for smoother transition

          const progress = Math.max(0, Math.min(1,
            (totalProgress - segmentStart + overlap) / (segmentEnd - segmentStart + overlap)
          ));
          return 1 - Math.pow(1 - progress, 3); // ease-out cubic
        });

        // Build visible coordinates for each segment
        const visibleCoords = allSegmentArcs.map((arc, i) => {
          const pointCount = Math.max(2, Math.floor(segmentProgress[i] * arc.length));
          return arc.slice(0, pointCount);
        });

        // Update the source
        (map.current.getSource(memorySourceId) as mapboxgl.GeoJSONSource).setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiLineString",
            coordinates: visibleCoords,
          },
        });

        if (totalProgress < 1) {
          requestAnimationFrame(animateDraw);
        }
      };

      requestAnimationFrame(animateDraw);

      // Direction arrows (after animation)
      setTimeout(() => {
        if (!map.current?.getSource(memorySourceId)) return;
        // Check if layer already exists to prevent "Layer already exists" error
        if (map.current.getLayer(memoryArrowId)) return;

        map.current.addLayer({
          id: memoryArrowId,
          type: "symbol",
          source: memorySourceId,
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 100,
            "text-field": "\u203A",
            "text-size": 18,
            "text-keep-upright": false,
            "text-rotation-alignment": "map",
          },
          paint: {
            "text-color": routeColor,
            "text-halo-color": "rgba(255,255,255,0.9)",
            "text-halo-width": 1.5,
            "text-opacity": 0.7,
          },
        });
      }, drawDuration + 100);

      // Fit map to show all points ONLY if routes actually changed
      // Don't animate when just switching back to flights tab
      if (shouldAnimateMapRef.current) {
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 450, right: 50 },
          maxZoom: 6,
        });
      }

      // Mark routes as drawn
      routesDrawnRef.current = true;
    } else if (memoryPoints.length === 1) {
      // Fly to single point ONLY if routes actually changed
      if (shouldAnimateMapRef.current) {
        map.current.flyTo({
          center: [memoryPoints[0].lng, memoryPoints[0].lat],
          zoom: 5,
        });
      }
      routesDrawnRef.current = true;
    }
  }, [getRoutePoints, mapLoaded, onDestinationClick, activeTab, map]);

  // Clean up legacy route markers on mount (no longer used - memory is the single source of truth)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear any legacy route markers
    routeMarkersRef.current.forEach((marker) => marker.remove());
    routeMarkersRef.current = [];

    // Remove legacy dynamic routes
    for (let i = 0; i < 20; i++) {
      const sourceId = `dynamic-route-${i}`;
      const arrowId = `dynamic-route-arrow-${i}`;

      if (map.current.getLayer(arrowId)) {
        map.current.removeLayer(arrowId);
      }

      if (map.current.getSource(sourceId)) {
        if (map.current.getLayer(sourceId)) {
          map.current.removeLayer(sourceId);
        }
        map.current.removeSource(sourceId);
      }
    }
  }, [mapLoaded, map]);
}
