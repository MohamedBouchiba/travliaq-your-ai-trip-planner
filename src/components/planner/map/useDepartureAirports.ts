import { useEffect, useRef, useState, useMemo } from "react";
import type { TabType } from "@/pages/TravelPlanner";
import { useFlightMemoryStore } from "@/stores/hooks";
import { useAirportsInBounds, type AirportMarker } from "@/hooks/useAirportsInBounds";
import { useMapPrices } from "@/hooks/useMapPrices";
import { findNearestAirports } from "@/hooks/useNearestAirports";
import type { UserLocation } from "./types";
import maplibregl from "maplibre-gl";
import eventBus from "@/lib/eventBus";

/**
 * Manages departure airport detection, multi-hub resolution,
 * airport fetching for the flights tab, and map-prices API integration.
 */
export function useDepartureAirports(opts: {
  map: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  activeTab: TabType;
  currentZoom: number;
  isPanelOpen: boolean;
  userLocation?: UserLocation | null;
}) {
  const { map, mapLoaded, activeTab, currentZoom, isPanelOpen, userLocation } = opts;

  // Airports layer hook - enabled only on flights tab
  const { airports, isLoading: isLoadingAirports, fetchAirports } = useAirportsInBounds({
    enabled: activeTab === "flights",
    debounceMs: 500, // Increased debounce for smoother experience
    // Include medium airports when zoomed in (zoom >= 6)
    includeMediumAirports: currentZoom >= 6,
    limit: 150, // Increased to show more airports
    zoom: currentZoom,
  });

  // Get route points from flight memory
  const { getRoutePoints, memory: flightMem, updateMemory } = useFlightMemoryStore();

  // Get user's departure airports for map-prices API (supports multi-airport cities like Paris = CDG + ORY)
  const departureIata = flightMem?.departure?.iata;
  const departureCity = flightMem?.departure?.city;

  // Cache departure airports PERSISTENTLY - only update when user explicitly changes departure
  // NOTE: we keep it in state so the UI re-renders when it becomes available.
  const cachedDepartureAirportsRef = useRef<string[]>([]);
  const cachedDepartureIataRef = useRef<string | undefined>(undefined);
  const [departureAirports, setDepartureAirports] = useState<string[]>([]);

  // Update departure airports ONLY when the user's departure changes (not viewport)
  useEffect(() => {
    // If departure changed, update cache
    if (departureIata !== cachedDepartureIataRef.current) {
      cachedDepartureIataRef.current = departureIata;

      if (!departureIata) {
        // User cleared departure
        cachedDepartureAirportsRef.current = [];
        setDepartureAirports([]);
        return;
      }

      // IMMEDIATELY set single IATA to enable prices - don't wait for airports
      if (cachedDepartureAirportsRef.current.length === 0) {
        cachedDepartureAirportsRef.current = [departureIata];
        setDepartureAirports([departureIata]);
        console.log(`[PlannerMap] Immediately set departure airport:`, departureIata);
      }

      // Try to find multi-airport hub from current visible airports (upgrade if available)
      const cityNormalized = (departureCity ?? "").toLowerCase().trim();
      const matchingHub = airports.find(
        (a) => a.cityName?.toLowerCase().trim() === cityNormalized || a.iata === departureIata
      );

      if (matchingHub?.allIatas && matchingHub.allIatas.length > 0) {
        // Only upgrade if we have more airports than before
        if (matchingHub.allIatas.length > cachedDepartureAirportsRef.current.length) {
          cachedDepartureAirportsRef.current = matchingHub.allIatas;
          setDepartureAirports(matchingHub.allIatas);
          console.log(`[PlannerMap] Upgraded departure airports for ${departureCity || departureIata}:`, matchingHub.allIatas);
        }
      }
    }
  }, [departureIata, departureCity, airports]);

  // Auto-set a departure airport from user location (first visit / empty memory)
  // Important: never permanently lock the map in a "no departure" state if the lookup fails.
  const autoSetDepartureAttemptRef = useRef<{ city?: string; attemptedAt?: number; success?: boolean }>({});
  useEffect(() => {
    // If user already has a departure, stop.
    if (flightMem?.departure?.iata) {
      autoSetDepartureAttemptRef.current.success = true;
      return;
    }

    if (!userLocation?.city) return;

    const cityOnly = userLocation.city.split(",")[0].trim();
    const attempt = autoSetDepartureAttemptRef.current;

    // Avoid spamming: retry at most once per minute for the same city
    if (
      attempt.success ||
      (attempt.city === cityOnly && attempt.attemptedAt && Date.now() - attempt.attemptedAt < 60_000)
    ) {
      return;
    }

    attempt.city = cityOnly;
    attempt.attemptedAt = Date.now();

    (async () => {
      const resp = await findNearestAirports(cityOnly, 1);
      const best = resp?.airports?.[0];

      if (!best?.iata) {
        console.warn("[PlannerMap] Could not infer departure airport from city:", cityOnly);
        return;
      }

      updateMemory({
        departure: {
          iata: best.iata,
          airport: best.name,
          city: resp?.matched_city || cityOnly,
          countryCode: best.country_code,
          lat: best.lat,
          lng: best.lon,
        },
      });

      autoSetDepartureAttemptRef.current.success = true;
      console.log("[PlannerMap] Auto-set departure airport:", best.iata, "for city:", cityOnly);
    })();
  }, [flightMem?.departure?.iata, updateMemory, userLocation?.city]);

  // Get all visible airport IATAs for map-prices API (excluding departure airports)
  // Flatten all allIatas from hubs to ensure prices are stable when zooming
  const destinationIatas = useMemo(() => {
    const departureSet = new Set(departureAirports.map(i => i.toUpperCase()));
    const allIatas = new Set<string>();

    for (const airport of airports) {
      // Add all IATAs from the hub (supports multi-airport cities like Paris = CDG + ORY)
      const hubIatas = airport.allIatas && airport.allIatas.length > 0 ? airport.allIatas : [airport.iata];
      for (const iata of hubIatas) {
        if (!departureSet.has(iata.toUpperCase())) {
          allIatas.add(iata);
        }
      }
    }

    return Array.from(allIatas);
  }, [airports, departureAirports]);

  // Fetch real prices from map-prices API
  const { prices, isLoading: isLoadingPrices, fetchPrices, priceVersion } = useMapPrices({
    enabled: activeTab === "flights" && departureAirports.length > 0,
  });

  // Trigger price fetch for ALL visible destinations.
  // The hook itself handles cache hydration + only fetching uncached items,
  // which is more stable than pre-computing "missing" here.
  useEffect(() => {
    if (activeTab !== "flights") return;
    if (departureAirports.length === 0 || destinationIatas.length === 0) return;

    fetchPrices(departureAirports, destinationIatas);
  }, [activeTab, departureAirports, destinationIatas, fetchPrices]);

  // Force fetch when departure transitions from empty -> non-empty
  // Short delay to let destinationIatas stabilize
  const hadDepartureRef = useRef(departureAirports.length > 0);
  useEffect(() => {
    const hasDeparture = departureAirports.length > 0;
    const justGotDeparture = hasDeparture && !hadDepartureRef.current;
    hadDepartureRef.current = hasDeparture;

    if (!justGotDeparture || destinationIatas.length === 0) return;

    const timer = setTimeout(() => {
      console.log(`[useDepartureAirports] Departure just set, forcing price fetch for ${destinationIatas.length} destinations`);
      fetchPrices(departureAirports, destinationIatas);
    }, 300);

    return () => clearTimeout(timer);
  }, [departureAirports, destinationIatas, fetchPrices]);

  // Fetch airports when map moves (only on flights tab)
  // IMPORTANT: Add buffer to bounds for stability during small pan/zoom movements
  useEffect(() => {
    if (!map.current || !mapLoaded || activeTab !== "flights") return;

    const handleMoveEnd = () => {
      if (!map.current) return;

      const bounds = map.current.getBounds();
      const zoom = map.current.getZoom();

      // Get the current padding (accounts for panel offset)
      const container = map.current.getContainer();
      const containerWidth = container.clientWidth;

      // Calculate bounds span
      const lngSpan = bounds.getEast() - bounds.getWest();
      const latSpan = bounds.getNorth() - bounds.getSouth();

      // Panel compensation (left side)
      const panelWidthPx = isPanelOpen ? 450 : 350;
      const extraLngRatio = panelWidthPx / containerWidth;
      const panelExtraLng = lngSpan * extraLngRatio * 1.2;

      // Add 15% buffer on all sides to stabilize the list during small movements
      // This way, small pans don't trigger different hub selections
      const BOUNDS_BUFFER = 0.15;
      const bufferLng = lngSpan * BOUNDS_BUFFER;
      const bufferLat = latSpan * BOUNDS_BUFFER;

      const paddedBounds = {
        north: bounds.getNorth() + bufferLat,
        south: bounds.getSouth() - bufferLat,
        east: bounds.getEast() + bufferLng,
        west: bounds.getWest() - panelExtraLng - bufferLng,
      };

      fetchAirports(paddedBounds);

      // Emit event for other components
      eventBus.emit("airports:fetch", {
        bounds: paddedBounds,
        zoom,
      });
    };

    // Fetch immediately on tab switch
    handleMoveEnd();

    map.current.on("moveend", handleMoveEnd);

    return () => {
      map.current?.off("moveend", handleMoveEnd);
    };
  }, [mapLoaded, activeTab, fetchAirports, isPanelOpen, map]);

  // Emit loading state for airports
  useEffect(() => {
    eventBus.emit("airports:loading", { isLoading: isLoadingAirports });
  }, [isLoadingAirports]);

  // Track which airports are currently displayed (by hub id) - LEGACY markers (now handled by FlightPriceMarkers)
  // Keep refs for cleanup but rendering is done by React Portal component
  const displayedAirportsRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const airportRemovalTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup old DOM markers when switching to new Portal system
  useEffect(() => {
    if (activeTab === "flights") {
      // Clear any legacy DOM markers - React Portal now handles rendering
      airportRemovalTimeoutsRef.current.forEach((t) => clearTimeout(t));
      airportRemovalTimeoutsRef.current.clear();
      displayedAirportsRef.current.forEach((marker) => marker.remove());
      displayedAirportsRef.current.clear();
    }
  }, [activeTab]);

  // Cleanup all airport markers on unmount
  useEffect(() => {
    return () => {
      airportRemovalTimeoutsRef.current.forEach((t) => clearTimeout(t));
      airportRemovalTimeoutsRef.current.clear();
      displayedAirportsRef.current.forEach((marker) => marker.remove());
      displayedAirportsRef.current.clear();
    };
  }, []);

  return {
    airports,
    isLoadingAirports,
    prices,
    isLoadingPrices,
    priceVersion,
    departureAirports,
    flightMem,
    getRoutePoints,
  };
}
