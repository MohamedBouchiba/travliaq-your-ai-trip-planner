import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { UserLocation } from "./types";

/**
 * Renders the pulsing blue dot for the user's current location on the map.
 */
export function useUserLocationMarker(opts: {
  map: React.MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  userLocation?: UserLocation | null;
}) {
  const { map, mapLoaded, userLocation } = opts;
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Show user location marker after animation completes
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return;

    // Remove previous user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }

    // Create user location marker with pulsing effect
    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.innerHTML = `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
      ">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: hsl(var(--primary) / 0.3);
          animation: pulse 2s ease-out infinite;
        "></div>
        <div style="
          position: absolute;
          inset: 4px;
          border-radius: 9999px;
          background: hsl(var(--primary));
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      </div>
    `;

    // Add pulse animation style if not already present
    if (!document.getElementById("user-marker-style")) {
      const style = document.createElement("style");
      style.id = "user-marker-style";
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);

    userMarkerRef.current = marker;

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [mapLoaded, userLocation, map]);
}
