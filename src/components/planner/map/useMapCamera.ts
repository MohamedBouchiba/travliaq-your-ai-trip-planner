import { useEffect, useRef, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import type { TabType } from "@/pages/TravelPlanner";
import type { UserLocation } from "./types";
import { useAccommodationMemoryStore, useActivityMemoryStore } from "@/stores/hooks";
import { STAYS_ZOOM, ACTIVITIES_ZOOM, FLIGHTS_ZOOM, getStaysPanelOffset } from "@/constants/mapSettings";
import eventBus from "@/lib/eventBus";

/**
 * Manages map camera: tab-switch zoom, user-location focus, panel offsets,
 * mobile padding, initial animation, and center/zoom sync.
 */
export function useMapCamera(opts: {
  map: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  activeTab: TabType;
  center: [number, number];
  zoom: number;
  isPanelOpen: boolean;
  isMobile: boolean;
  mobileWidgetOpen: boolean;
  animateToUserLocation: boolean;
  onAnimationComplete?: () => void;
  userLocation?: UserLocation | null;
  userDefaultFocusNonce?: number;
}) {
  const {
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
  } = opts;

  const hasAnimatedRef = useRef(false);
  const prevActiveTabRef = useRef<TabType>(activeTab);
  const staysFocusRef = useRef<{ lng: number; lat: number; zoom: number; city?: string } | null>(null);
  const suppressNextStaysAutoZoomRef = useRef(false);
  const initialFocusCompletedRef = useRef(false);

  // Get accommodation entries for markers
  const { memory: accommodationMemory, getActiveAccommodation } = useAccommodationMemoryStore();

  // Get activity entries for markers (needed for auto-zoom on tab switch)
  const { allDestinations: activityAllDestinations } = useActivityMemoryStore();

  // Use centralized offset function from mapSettings
  const getStaysOffsetX = useCallback(() => {
    return getStaysPanelOffset(isPanelOpen);
  }, [isPanelOpen]);

  const focusStaysTarget = useCallback(
    (target: { lng: number; lat: number; zoom?: number; city?: string }, focusOpts?: { immediate?: boolean }) => {
      if (!map.current || !mapLoaded) return;

      const offsetX = getStaysOffsetX();
      const duration = focusOpts?.immediate ? 0 : 800;

      map.current.flyTo({
        center: [target.lng, target.lat],
        zoom: target.zoom ?? STAYS_ZOOM,
        duration,
        essential: true,
        offset: [offsetX, 0],
      });
    },
    [getStaysOffsetX, mapLoaded, map]
  );

  // Mobile: adjust map padding when widget is open/closed to keep pins visible
  useEffect(() => {
    if (!map.current || !mapLoaded || !isMobile) return;

    // Calculate padding based on widget state
    // Widget takes 35vh when open, plus we need space for bottom bar
    const topPadding = mobileWidgetOpen ? Math.round(window.innerHeight * 0.35) + 10 : 60;
    const bottomPadding = 100; // Bottom bar + some margin

    map.current.setPadding({
      top: topPadding,
      bottom: bottomPadding,
      left: 20,
      right: 20,
    });
  }, [isMobile, mobileWidgetOpen, mapLoaded, map]);

  // Auto-zoom to accommodation city when switching to stays tab
  // AND auto-zoom to activity destination when switching to activities tab
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const previousTab = prevActiveTabRef.current;
    prevActiveTabRef.current = activeTab;

    // ============ STAYS TAB ============
    if (activeTab === "stays" && previousTab !== "stays") {
      // If we came from a hotel marker click, keep current zoom/center (no auto-zoom)
      if (suppressNextStaysAutoZoomRef.current) {
        suppressNextStaysAutoZoomRef.current = false;
        return;
      }

      // Get the active accommodation or fallback to first one with coordinates
      const activeAccom = getActiveAccommodation();
      const accommodations = accommodationMemory.accommodations;

      let targetAccom = activeAccom && activeAccom.lat && activeAccom.lng ? activeAccom : null;
      if (!targetAccom) {
        targetAccom = accommodations.find((acc) => acc.lat && acc.lng) || null;
      }

      if (targetAccom?.lat && targetAccom?.lng) {
        // Use shared STAYS_ZOOM constant
        staysFocusRef.current = { lng: targetAccom.lng, lat: targetAccom.lat, zoom: STAYS_ZOOM, city: targetAccom.city };

        // Small delay to ensure the panel is rendered before we measure its width for the offset
        setTimeout(() => {
          focusStaysTarget(staysFocusRef.current!);
        }, 50);
      }
      return;
    }

    // ============ ACTIVITIES TAB ============
    if (activeTab === "activities" && previousTab !== "activities") {
      // Get the first activity destination with coordinates
      const targetDest = activityAllDestinations.find((dest) => dest.lat && dest.lng);

      if (targetDest?.lat && targetDest?.lng) {
        const offsetX = getStaysOffsetX(); // Reuse same offset logic

        setTimeout(() => {
          map.current?.flyTo({
            center: [targetDest.lng!, targetDest.lat!],
            zoom: ACTIVITIES_ZOOM,
            duration: 800,
            essential: true,
            offset: [offsetX, 0],
          });
        }, 50);
      }
    }
  }, [activeTab, mapLoaded, accommodationMemory.accommodations, getActiveAccommodation, focusStaysTarget, activityAllDestinations, getStaysOffsetX, map]);

  // When the stays panel opens/closes, ONLY adjust the horizontal offset - NO ZOOM CHANGE
  // This keeps the map at the same zoom level and just shifts it left/right
  useEffect(() => {
    if (activeTab !== "stays") return;
    if (!map.current || !mapLoaded) return;

    // Get current center and zoom - we want to keep these exactly the same
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();

    // Only apply horizontal offset adjustment - no zoom change
    const offsetX = getStaysOffsetX();

    map.current.easeTo({
      center: [currentCenter.lng, currentCenter.lat],
      zoom: currentZoom, // Keep current zoom
      duration: isPanelOpen ? 300 : 0,
      offset: [offsetX, 0],
    });
  }, [activeTab, isPanelOpen, mapLoaded, getStaysOffsetX, map]);

  // Animate to user location on initial load - single smooth animation
  // Flow: World view -> Zoom to user position -> Open flights widget
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (!animateToUserLocation) return;
    if (hasAnimatedRef.current) return;

    hasAnimatedRef.current = true;

    const leftPadding = isPanelOpen ? 450 : 350;
    map.current.setPadding({ left: leftPadding, top: 0, right: 0, bottom: 0 });

    // Animate to user location
    const focus = (lng: number, lat: number) => {
      // Keep React-controlled state in sync with internal map animations.
      // Otherwise, the "center/zoom sync" effect will pull the camera back to the previous props (world view).
      eventBus.emit("map:zoom", { center: [lng, lat], zoom: FLIGHTS_ZOOM });

      map.current?.flyTo({
        center: [lng, lat],
        zoom: FLIGHTS_ZOOM, // Good zoom level to see region
        duration: 1500, // Slightly longer for smoother feel from world view
        essential: true,
        curve: 1.4,
      });
      setTimeout(() => onAnimationComplete?.(), 1500);
    };

    // Use already-detected userLocation if available
    if (userLocation?.lat && userLocation?.lng) {
      focus(userLocation.lng, userLocation.lat);
      return;
    }

    // Otherwise request geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          focus(position.coords.longitude, position.coords.latitude);
        },
        () => {
          // Geolocation failed - just complete without animation
          onAnimationComplete?.();
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    } else {
      onAnimationComplete?.();
    }
  }, [animateToUserLocation, isPanelOpen, mapLoaded, onAnimationComplete, userLocation?.lat, userLocation?.lng, map]);

  // Adjust map padding based on panel visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const leftPadding = isPanelOpen ? 450 : 350;
    map.current.easeTo({
      padding: { left: leftPadding, top: 0, right: 0, bottom: 0 },
      duration: isPanelOpen ? 250 : 0,
    });
  }, [isPanelOpen, mapLoaded, map]);

  // Absolute default: when we don't have an explicit map target for the current widget,
  // re-focus the map on the user's position.
  // Also applies when the panel is closed (no explicit widget target).
  //
  // IMPORTANT: This effect should NOT run during the initial animation sequence.
  // It only triggers on userDefaultFocusNonce changes AFTER the initial animation is complete.
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (!userLocation?.lat || !userLocation?.lng) return;

    // Skip if initial animation hasn't completed yet - let the initial flyTo handle positioning
    // This prevents the "fly to Europe then back" artifact
    if (!hasAnimatedRef.current) return;

    // Only trigger on nonce changes after the first focus is done
    // This prevents double-animation on initial load
    if (!initialFocusCompletedRef.current) {
      initialFocusCompletedRef.current = true;
      return; // Skip first trigger - initial animation already positioned the map
    }

    // For stays: if we have accommodations with coordinates, zoom on the city NOT user position
    if (activeTab === "stays") {
      const hasAccomCoords = accommodationMemory.accommodations.some((a) => !!a.lat && !!a.lng);
      if (hasAccomCoords) return; // Let the tab switch effect handle city zoom
    }

    // For activities: if we have destinations with coordinates, zoom on the city NOT user position
    if (activeTab === "activities") {
      const hasActivityCoords = activityAllDestinations.some((d) => !!d.lat && !!d.lng);
      if (hasActivityCoords) return; // Let the tab switch effect handle city zoom
    }

    // Only refocus on user location for flights tab OR when no city is selected
    // This prevents overriding the city zoom for stays/activities
    if (activeTab !== "flights" && isPanelOpen) return;

    const leftPadding = isPanelOpen ? 450 : 350;
    map.current.setPadding({ left: leftPadding, top: 0, right: 0, bottom: 0 });

    // Use tab-appropriate zoom level instead of USER_LOCATION_ZOOM
    // This ensures returning to "flights" tab uses FLIGHTS_ZOOM, not a generic user zoom
    const tabZoom = FLIGHTS_ZOOM; // Only flights tab reaches this point now

    // Sync external state so we don't "snap back" to the previous controlled camera
    eventBus.emit("map:zoom", { center: [userLocation.lng, userLocation.lat], zoom: tabZoom });

    map.current.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: tabZoom,
      duration: 700,
      essential: true,
    });
  }, [
    userDefaultFocusNonce,
    activeTab,
    isPanelOpen,
    mapLoaded,
    userLocation?.lat,
    userLocation?.lng,
    accommodationMemory.accommodations,
    activityAllDestinations,
    map,
  ]);

  // Update map center/zoom with fast animation
  // Note: on stays tab, we apply the same horizontal offset used for accommodation focus,
  // so clicking a city (which updates `center/zoom`) and switching to the tab feel identical.
  useEffect(() => {
    if (!map.current) return;

    const offsetX = activeTab === "stays" ? getStaysOffsetX() : 0;

    map.current.flyTo({
      center: [center[0], center[1]],
      zoom,
      duration: 800, // Fast animation (was default ~2500ms)
      essential: true,
      offset: [offsetX, 0],
    });
  }, [center, zoom, activeTab, getStaysOffsetX, map]);

  return {
    suppressNextStaysAutoZoomRef,
    getStaysOffsetX,
  };
}
