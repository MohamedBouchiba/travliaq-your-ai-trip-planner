import { memo } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import FlightPriceMarkers from "./FlightPriceMarkers";

// Re-export types for backward compatibility (TravelPlanner.tsx imports DestinationClickEvent from here)
export type { DestinationClickEvent } from "./map/types";

// Import extracted hooks and components
import { useMapInit } from "./map/useMapInit";
import { useMapCamera } from "./map/useMapCamera";
import { useDepartureAirports } from "./map/useDepartureAirports";
import { useFlightRoutes } from "./map/useFlightRoutes";
import { useHotelMarkers } from "./map/useHotelMarkers";
import { useActivityMarkers } from "./map/useActivityMarkers";
import { useUserLocationMarker } from "./map/useUserLocationMarker";
import { SearchInAreaButton } from "./map/SearchInAreaButton";
import type { PlannerMapProps } from "./map/types";

const PlannerMap = ({
  activeTab,
  center,
  zoom,
  onPinClick,
  selectedPinId,
  flightRoutes = [],
  animateToUserLocation = false,
  onAnimationComplete,
  isPanelOpen = false,
  userLocation,
  onDestinationClick,
  userDefaultFocusNonce,
  isMobile = false,
  mobileWidgetOpen = false,
}: PlannerMapProps) => {
  const { t } = useTranslation();

  // 1. Initialize map instance, container ref, resize observer, event bus bounds
  const {
    mapContainer,
    map,
    mapLoaded,
    currentZoom,
    isSearchingInArea,
    webglSupported,
  } = useMapInit(center, zoom);

  // 2. Camera management: tab-switch zoom, user location focus, panel offsets, animation
  const { suppressNextStaysAutoZoomRef } = useMapCamera({
    map,
    mapLoaded,
    activeTab,
    center,
    zoom,
    isPanelOpen,
    isMobile,
    mobileWidgetOpen,
    animateToUserLocation,
    onAnimationComplete,
    userLocation,
    userDefaultFocusNonce,
  });

  // 3. Departure airport detection, airport fetching, map-prices API
  const {
    airports,
    prices,
    departureAirports,
    flightMem,
    getRoutePoints,
  } = useDepartureAirports({
    map,
    mapLoaded,
    activeTab,
    currentZoom,
    isPanelOpen,
    userLocation,
  });

  // 4. Flight route lines and route markers (from memory store)
  useFlightRoutes({
    map,
    mapLoaded,
    activeTab,
    getRoutePoints,
    onDestinationClick,
  });

  // 5. Hotel price markers and accommodation markers
  useHotelMarkers({
    map,
    mapLoaded,
    activeTab,
    suppressNextStaysAutoZoomRef,
  });

  // 6. Activity destination markers + attraction search-result pins
  useActivityMarkers({
    map,
    mapLoaded,
    activeTab,
    selectedPinId,
    onPinClick,
  });

  // 7. User location pulsing dot
  useUserLocationMarker({
    map,
    mapLoaded,
    userLocation,
  });

  // Fallback when WebGL is not available (after all hooks)
  if (!webglSupported) {
    return (
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-3 p-6 max-w-sm">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            {t("planner.map.webglNotSupported", "La carte interactive n'est pas disponible dans cet environnement. Votre navigateur ne supporte pas WebGL.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full relative" data-tour="map-area">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full [&_.mapboxgl-ctrl-bottom-left]:!bottom-10 [&_.mapboxgl-ctrl-bottom-right]:!bottom-10 [&_.mapboxgl-ctrl-logo]:opacity-40 [&_.mapboxgl-ctrl-logo]:hover:opacity-100 [&_.mapboxgl-ctrl-logo]:transition-opacity [&_.mapboxgl-ctrl-attrib]:opacity-30 [&_.mapboxgl-ctrl-attrib]:hover:opacity-100 [&_.mapboxgl-ctrl-attrib]:transition-opacity" style={{ minHeight: "100%" }} />

      {/* Flight Price Markers - React Portal for stable rendering */}
      <FlightPriceMarkers
        map={map.current}
        airports={airports}
        prices={prices}
        departureIata={flightMem?.departure?.iata}
        departureCity={flightMem?.departure?.city}
        departureAirports={departureAirports}
        currentZoom={currentZoom}
        isFlightsTab={activeTab === "flights"}
        hasDeparture={departureAirports.length > 0}
        departureLabel={t("planner.flights.departureMarker")}
        currencySymbol="€"
      />

      {/* Search in Area Button - Only visible on activities tab */}
      {activeTab === "activities" && (
        <SearchInAreaButton isSearchingInArea={isSearchingInArea} />
      )}
    </div>
  );
};

export default memo(PlannerMap);
