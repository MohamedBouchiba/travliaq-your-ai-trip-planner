import { useEffect, useRef, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import { useTranslation } from "react-i18next";
import type { TabType, MapPin } from "@/pages/TravelPlanner";
import { useActivityMemoryStore } from "@/stores/hooks";
import { cityCoordinates } from "./constants";
import eventBus from "@/lib/eventBus";
import { escapeHtml, escapeHtmlAttribute } from "@/components/planner/chat/utils/security";

/**
 * Manages activity-related map markers: destination markers,
 * attraction search-result pins, and activity pin overlays.
 */
export function useActivityMarkers(opts: {
  map: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  activeTab: TabType;
  selectedPinId?: string;
  onPinClick: (pin: MapPin) => void;
}) {
  const { map, mapLoaded, activeTab, selectedPinId, onPinClick } = opts;
  const { t } = useTranslation();

  // Get activity entries for markers
  const { state: activityState, allDestinations: activityAllDestinations } = useActivityMemoryStore();

  const markersRef = useRef<maplibregl.Marker[]>([]);
  const activityDestinationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const attractionPinsRef = useRef<maplibregl.Marker[]>([]);

  // Get pins based on active tab
  const getPinsForTab = useCallback((tab: TabType): MapPin[] => {
    if (tab === "activities") {
      // Convert planned activities to MapPin format
      return activityState.activities.map((activity) => {
        // Try to get coordinates from activity or fall back to city coordinates
        let lat = 0;
        let lng = 0;

        if (activity.coordinates) {
          lat = activity.coordinates.lat;
          lng = activity.coordinates.lng;
        } else if (activity.city) {
          // Look up city coordinates
          const cityKey = activity.city.toLowerCase();
          const coords = cityCoordinates[cityKey];
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        // Skip if we don't have valid coordinates
        if (lat === 0 && lng === 0) return null;

        const mapPin: MapPin = {
          id: activity.id,
          type: "activities",
          lat,
          lng,
          title: activity.title,
          subtitle: activity.categories?.[0] || "Activit\u00E9",
          rating: typeof activity.rating === 'object' ? activity.rating?.average : activity.rating,
          duration: typeof activity.duration === 'object' ? activity.duration?.formatted : undefined,
          price: activity.pricing?.from_price,
          image: activity.images?.[0]?.variants?.small || activity.images?.[0]?.url,
        };

        return mapPin;
      }).filter((pin): pin is MapPin => pin !== null);
    }

    // By default, show no pins for other tabs
    return [];
  }, [activityState.activities]);

  // Update markers when tab changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const pins = getPinsForTab(activeTab);

    pins.forEach((pin) => {
      // Create custom marker element
      const el = document.createElement("div");
      el.className = "planner-marker";
      el.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 9999px;
        background: ${pin.id === selectedPinId ? "hsl(var(--primary))" : "hsl(var(--card))"};
        border: 3px solid ${pin.id === selectedPinId ? "hsl(var(--primary) / 0.9)" : "hsl(var(--primary))"};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 10px 25px -10px hsl(var(--foreground) / 0.25);
        font-size: 12px;
        font-weight: 700;
        color: ${pin.id === selectedPinId ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"};
        user-select: none;
      `;

      // Add price or icon based on type (using textContent for XSS prevention)
      if (pin.price !== undefined && pin.price > 0) {
        el.textContent = `${pin.price}\u20AC`;
      } else if (activeTab === "flights") {
        el.textContent = "\u2708\uFE0F";
      } else if (activeTab === "activities") {
        el.textContent = "\uD83D\uDCCD";
      } else {
        el.textContent = "\uD83C\uDFE8";
      }

      el.addEventListener("click", () => {
        onPinClick(pin);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [activeTab, mapLoaded, selectedPinId, onPinClick, getPinsForTab, map]);

  // Display activity destination markers when activities tab is active
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing activity destination markers
    activityDestinationMarkersRef.current.forEach((marker) => marker.remove());
    activityDestinationMarkersRef.current = [];

    // Only show on activities tab
    if (activeTab !== "activities") return;

    // Get activity destinations with valid coordinates from allDestinations
    const destinations = activityAllDestinations.filter(
      (dest) => dest.lat && dest.lng
    );


    if (destinations.length === 0) return;

    destinations.forEach((dest, index) => {
      if (!dest.lat || !dest.lng) return;

      // Create marker element - compass/activity theme
      const el = document.createElement("div");
      el.className = "activity-destination-marker";
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
            background: linear-gradient(135deg, hsl(160, 84%, 39%) 0%, hsl(160, 84%, 28%) 100%);
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
            ">\uD83E\uDDED</span>
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
          ">${escapeHtml(dest.city)}</div>
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
        .setLngLat([dest.lng, dest.lat])
        .addTo(map.current!);

      activityDestinationMarkersRef.current.push(marker);
    });

    return () => {
      activityDestinationMarkersRef.current.forEach((marker) => marker.remove());
      activityDestinationMarkersRef.current = [];
    };
  }, [activeTab, mapLoaded, activityAllDestinations, map]);

  // Display attraction pins from search results (V2: separate from activities list)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing attraction pins
    attractionPinsRef.current.forEach((marker) => marker.remove());
    attractionPinsRef.current = [];

    // Only show on activities tab
    if (activeTab !== "activities") return;

    // Get ALL attractions from search results (V2 - REFONTE UX)
    // Backend now returns ALL attractions (not limited to 15) for full map coverage
    const attractions = activityState.search.attractions || [];

    if (attractions.length === 0) return;

    attractions.forEach((attraction, idx) => {
      // Use coordinates from the activity (can be in coordinates or location.coordinates)
      const coords = attraction.coordinates || (attraction.location as any)?.coordinates;
      if (!coords) return;
      const lat = coords.lat;
      const lng = 'lng' in coords ? coords.lng : ('lon' in coords ? (coords as any).lon : null);
      if (!lat || !lng) return;

      // Create attraction pin - orange with landmark icon
      const el = document.createElement("div");
      el.className = "attraction-pin";
      el.innerHTML = `
        <div style="
          width: 44px;
          height: 54px;
          position: relative;
          cursor: pointer;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
          animation: pinDrop 0.4s ease-out ${idx * 0.08}s forwards;
          opacity: 0;
        ">
          <div style="
            width: 42px;
            height: 42px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            background: linear-gradient(135deg, hsl(25,95%,53%), hsl(25,95%,43%));
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 -2px 4px rgba(0,0,0,0.15);
          ">
            <span style="
              transform: rotate(45deg);
              font-size: 20px;
              filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
            ">\uD83C\uDFDB\uFE0F</span>
          </div>
        </div>
        <style>
          @keyframes pinDrop {
            0% { opacity: 0; transform: translateY(-20px); }
            60% { opacity: 1; transform: translateY(5px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        </style>
      `;

      // Create hover tooltip (compact preview)
      const tooltip = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -50],
        className: "attraction-tooltip",
      });

      const imageUrl = (attraction.images as any)?.[0]?.variants?.medium || (attraction.images as any)?.[0]?.url;
      const rating = typeof attraction.rating === 'object' ? attraction.rating?.average || 0 : attraction.rating || 0;

      // Hover effects + tooltip
      const pinEl = el.querySelector("div") as HTMLElement;
      pinEl?.addEventListener("mouseenter", () => {
        pinEl.style.filter = "drop-shadow(0 6px 12px rgba(255,87,34,0.45))";
        pinEl.style.transform = "scale(1.08)";

        // Show tooltip
        const reviewsLabel = t("planner.common.reviews");
        tooltip.setHTML(`
          <div class="bg-card border rounded-lg shadow-xl w-64 overflow-hidden">
            ${imageUrl ? `<img src="${escapeHtmlAttribute(imageUrl)}" class="w-full h-32 object-cover" alt="${escapeHtmlAttribute(attraction.title)}" />` : ''}
            <div class="p-3">
              <h4 class="font-semibold text-sm line-clamp-2 mb-2">${escapeHtml(attraction.title)}</h4>
              <div class="flex items-center gap-1">
                <span class="text-amber-400">\u2605</span>
                <span class="text-xs font-medium">${typeof rating === 'number' ? rating.toFixed(1) : rating}</span>
                <span class="text-xs text-muted-foreground ml-1">(${typeof attraction.rating === 'object' ? attraction.rating?.count || 0 : attraction.reviewCount || 0} ${reviewsLabel})</span>
              </div>
            </div>
          </div>
        `).setLngLat([lng, lat]).addTo(map.current!);
      });

      pinEl?.addEventListener("mouseleave", () => {
        pinEl.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.25))";
        pinEl.style.transform = "scale(1)";

        // Hide tooltip
        tooltip.remove();
      });

      // Click handler - emit event for detailed popup
      pinEl?.addEventListener("click", (e) => {
        e.stopPropagation();
        tooltip.remove(); // Remove hover tooltip
        eventBus.emit("attraction:click", { attraction: attraction as any });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      attractionPinsRef.current.push(marker);
    });

    return () => {
      attractionPinsRef.current.forEach((marker) => marker.remove());
      attractionPinsRef.current = [];
    };
  }, [activeTab, mapLoaded, activityState.search.attractions, map, t]);
}
