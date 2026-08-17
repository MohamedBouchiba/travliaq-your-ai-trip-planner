import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { TabType } from "@/pages/TravelPlanner";
import { useAccommodationMemoryStore } from "@/stores/hooks";
import { STORAGE_KEYS } from "@/config/storageKeys";
import { injectHotelMarkerAnimations } from "./constants";
import eventBus from "@/lib/eventBus";

const HOTELS_DEBUG_KEY = STORAGE_KEYS.HOTELS_DEBUG;

interface HotelResult {
  id: string;
  lat: number;
  lng: number;
  pricePerNight: number;
  name: string;
}

/**
 * Manages hotel price markers, accommodation markers,
 * hotel event bus subscriptions, and auto-fit bounds.
 */
export function useHotelMarkers(opts: {
  map: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  activeTab: TabType;
  suppressNextStaysAutoZoomRef: React.MutableRefObject<boolean>;
}) {
  const { map, mapLoaded, activeTab, suppressNextStaysAutoZoomRef } = opts;

  const hotelMarkersRef = useRef<maplibregl.Marker[]>([]);
  const accommodationMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Hotel search results state
  const [hotelResults, setHotelResults] = useState<{ hotels: HotelResult[] }>({ hotels: [] });
  const [hoveredHotelId, setHoveredHotelId] = useState<string | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  // Get accommodation entries for markers
  const { memory: accommodationMemory } = useAccommodationMemoryStore();

  // Listen for hotel events and update state
  useEffect(() => {
    const debugHotels =
      import.meta.env.DEV ||
      (typeof window !== "undefined" && window.localStorage.getItem(HOTELS_DEBUG_KEY) === "1");

    const handleHotelResults = (data: { hotels: HotelResult[] }) => {
      if (debugHotels) {
        console.groupCollapsed("[HotelsMap] hotels:results received");
        console.log({ count: data.hotels?.length, first: data.hotels?.[0] });
        console.groupEnd();
      }
      setHotelResults(data);
    };

    const handleHotelHover = (data: { hotel: { id: string } | null }) => {
      setHoveredHotelId(data.hotel?.id || null);
    };

    const handleHotelSelect = (data: { hotel: { id: string } }) => {
      setSelectedHotelId(data.hotel.id);
    };

    // When a user clicks a hotel price marker, we open the stays panel.
    // Important: do NOT trigger the stays auto-zoom (it feels like a big "dezoom").
    const handleHotelOpenPanel = () => {
      suppressNextStaysAutoZoomRef.current = true;
    };

    const handleClearHotelSelection = () => {
      setSelectedHotelId(null);
    };

    // Handler to fit map to hotel prices (triggered when panel closes)
    const handleFitToPrices = () => {
      if (!map.current || !mapLoaded) return;
      if (hotelResults.hotels.length === 0) return;

      // Calculate bounds of all hotels
      const bounds = new maplibregl.LngLatBounds();
      hotelResults.hotels.forEach((hotel) => {
        bounds.extend([hotel.lng, hotel.lat]);
      });

      // Fit bounds with minimal padding (panel is closed)
      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        maxZoom: 14,
        duration: 800,
      });

      // After the camera recenters, bounce all price markers once
      window.setTimeout(() => {
        hotelMarkersRef.current.forEach((marker) => {
          const el = marker.getElement();
          // restart animation
          el.classList.remove("bounce");
          // force reflow
          void el.offsetWidth;
          el.classList.add("bounce");
        });
      }, 820);
    };

    eventBus.on("hotels:results", handleHotelResults);
    eventBus.on("hotels:hover", handleHotelHover);
    eventBus.on("hotels:select", handleHotelSelect);
    eventBus.on("hotels:openPanel", handleHotelOpenPanel);
    eventBus.on("hotels:clearSelection", handleClearHotelSelection);
    eventBus.on("hotels:fitToPrices", handleFitToPrices);

    return () => {
      eventBus.off("hotels:results", handleHotelResults);
      eventBus.off("hotels:hover", handleHotelHover);
      eventBus.off("hotels:select", handleHotelSelect);
      eventBus.off("hotels:openPanel", handleHotelOpenPanel);
      eventBus.off("hotels:clearSelection", handleClearHotelSelection);
      eventBus.off("hotels:fitToPrices", handleFitToPrices);
    };
  }, [mapLoaded, hotelResults.hotels, map, suppressNextStaysAutoZoomRef]);

  // Auto-fit bounds when hotel results change (NOT on hover/select changes)
  const previousHotelCountRef = useRef(0);
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (activeTab !== "stays") return;

    // Only fit bounds when hotels are newly loaded (count changes from 0 or to different set)
    const currentCount = hotelResults.hotels.length;
    if (currentCount === 0 || currentCount === previousHotelCountRef.current) {
      previousHotelCountRef.current = currentCount;
      return;
    }
    previousHotelCountRef.current = currentCount;

    // Calculate bounds of all hotels
    const bounds = new maplibregl.LngLatBounds();
    hotelResults.hotels.forEach((hotel) => {
      bounds.extend([hotel.lng, hotel.lat]);
    });

    // Fit bounds with left padding to avoid panel overlap
    map.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 520, right: 80 },
      maxZoom: 14,
      duration: 800,
    });
  }, [activeTab, mapLoaded, hotelResults.hotels.length, map]);

  // Display hotel markers on map (stays tab only) - updates on hover/select WITHOUT moving map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    injectHotelMarkerAnimations();

    // Clear existing hotel markers
    hotelMarkersRef.current.forEach((marker) => marker.remove());
    hotelMarkersRef.current = [];

    // Only show on stays tab
    if (activeTab !== "stays" || hotelResults.hotels.length === 0) return;

    hotelResults.hotels.forEach((hotel, index) => {
      const isHovered = hoveredHotelId === hotel.id;
      const isSelected = selectedHotelId === hotel.id;

      // Create marker element with proper structure
      const el = document.createElement("div");
      el.className = `hotel-price-marker ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`;

      const bgColor = isSelected ? '#0ea5e9' : isHovered ? '#38bdf8' : '#ffffff';
      const textColor = isSelected || isHovered ? '#ffffff' : '#1f2937';
      const borderColor = isSelected ? '#0284c7' : isHovered ? '#0ea5e9' : '#e5e7eb';

      el.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          z-index: ${isHovered || isSelected ? 50 : 10 + index};
          transform: ${isHovered || isSelected ? 'scale(1.1)' : 'scale(1)'};
          transition: transform 0.15s ease;
        ">
          <div style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 10px;
            background: ${bgColor};
            color: ${textColor};
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
            border: 2px solid ${borderColor};
            white-space: nowrap;
          ">${hotel.pricePerNight}\u20AC</div>
          <div style="
            width: 0;
            height: 0;
            border-left: 7px solid transparent;
            border-right: 7px solid transparent;
            border-top: 7px solid ${bgColor};
            margin-top: -1px;
          "></div>
        </div>
      `;

      // Add hover effect - when the user hovers the map pins, we clear any prior selection
      // so there is NEVER a "selected" pin + a different "hovered" pin at the same time.
      el.addEventListener("mouseenter", () => {
        eventBus.emit("hotels:clearSelection");
        eventBus.emit("hotels:hover", { hotel: hotel as any, source: "map" });
      });

      el.addEventListener("mouseleave", () => {
        eventBus.emit("hotels:hover", { hotel: null, source: "map" });
      });

      // Click to open detail view and ensure panel is open
      el.addEventListener("click", () => {
        eventBus.emit("hotels:openPanel");
        eventBus.emit("hotels:openDetail", { hotel: hotel as any });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([hotel.lng, hotel.lat])
        .addTo(map.current!);

      hotelMarkersRef.current.push(marker);
    });

    return () => {
      hotelMarkersRef.current.forEach((marker) => marker.remove());
      hotelMarkersRef.current = [];
    };
  }, [activeTab, mapLoaded, hotelResults.hotels, hoveredHotelId, selectedHotelId, map]);

  // Display accommodation markers when stays tab is active
  // ONLY show when NOT in search mode (no hotel price results displayed)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing accommodation markers
    accommodationMarkersRef.current.forEach((marker) => marker.remove());
    accommodationMarkersRef.current = [];

    // Only show on stays tab AND only when NOT in search mode (no hotel results)
    if (activeTab !== "stays") return;
    if (hotelResults.hotels.length > 0) return; // Hide pins when search results are displayed

    // Get accommodations with valid coordinates
    const accommodations = accommodationMemory.accommodations.filter(
      (acc) => acc.lat && acc.lng
    );


    if (accommodations.length === 0) return;

    accommodations.forEach((acc, index) => {
      if (!acc.lat || !acc.lng) return;

      // Create marker element
      const el = document.createElement("div");
      el.className = "accommodation-marker";
      el.innerHTML = `
        <div style="
          width: 42px;
          height: 52px;
          position: relative;
          cursor: pointer;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
          animation: markerBounce 0.4s ease-out forwards;
          animation-delay: ${index * 0.1}s;
          opacity: 0;
          transform: translateY(-10px);
        ">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: linear-gradient(135deg, hsl(280, 70%, 55%) 0%, hsl(280, 70%, 40%) 100%);
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 -2px 4px rgba(0,0,0,0.15);
          ">
            <span style="
              transform: rotate(45deg);
              font-size: 18px;
              filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
            ">\uD83C\uDFE8</span>
          </div>
          <div style="
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${acc.city}</div>
        </div>
        <style>
          @keyframes markerBounce {
            0% { opacity: 0; transform: translateY(-10px); }
            60% { opacity: 1; transform: translateY(3px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        </style>
      `;

      // Add hover effects
      const pinEl = el.querySelector("div") as HTMLElement;
      pinEl?.addEventListener("mouseenter", () => {
        pinEl.style.filter = "drop-shadow(0 6px 12px rgba(0,0,0,0.35))";
        pinEl.style.transform = "translateY(-2px) scale(1.05)";
      });
      pinEl?.addEventListener("mouseleave", () => {
        pinEl.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.25))";
        pinEl.style.transform = "translateY(0) scale(1)";
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([acc.lng, acc.lat])
        .addTo(map.current!);

      accommodationMarkersRef.current.push(marker);
    });

    return () => {
      accommodationMarkersRef.current.forEach((marker) => marker.remove());
      accommodationMarkersRef.current = [];
    };
  }, [activeTab, mapLoaded, accommodationMemory.accommodations, hotelResults.hotels.length, map]);
}
