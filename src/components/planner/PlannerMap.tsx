import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { TabType, MapPin } from "@/pages/TravelPlanner";

// Mock data for pins
const mockFlightPins: MapPin[] = [
  { id: "cdg", type: "flights", lat: 49.0097, lng: 2.5479, title: "Paris CDG", subtitle: "Aéroport", price: 0 },
  { id: "jfk", type: "flights", lat: 40.6413, lng: -73.7781, title: "New York JFK", subtitle: "Aéroport", price: 450 },
  { id: "lhr", type: "flights", lat: 51.4700, lng: -0.4543, title: "Londres Heathrow", subtitle: "Aéroport", price: 120 },
  { id: "bcn", type: "flights", lat: 41.2974, lng: 2.0833, title: "Barcelone", subtitle: "Aéroport", price: 85 },
  { id: "fco", type: "flights", lat: 41.8003, lng: 12.2389, title: "Rome Fiumicino", subtitle: "Aéroport", price: 95 },
];

const mockActivityPins: MapPin[] = [
  { id: "eiffel", type: "activities", lat: 48.8584, lng: 2.2945, title: "Tour Eiffel", subtitle: "Monument", rating: 4.7, image: "https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=400", duration: "2h" },
  { id: "louvre", type: "activities", lat: 48.8606, lng: 2.3376, title: "Musée du Louvre", subtitle: "Musée", rating: 4.8, image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400", duration: "4h" },
  { id: "sacre", type: "activities", lat: 48.8867, lng: 2.3431, title: "Sacré-Cœur", subtitle: "Monument", rating: 4.6, image: "https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400", duration: "1h30" },
  { id: "versailles", type: "activities", lat: 48.8049, lng: 2.1204, title: "Château de Versailles", subtitle: "Château", rating: 4.7, image: "https://images.unsplash.com/photo-1551410224-699683e15636?w=400", duration: "5h" },
];

const mockStayPins: MapPin[] = [
  { id: "hotel1", type: "stays", lat: 48.8698, lng: 2.3075, title: "Le Meurice", subtitle: "5 étoiles", price: 850, rating: 4.9 },
  { id: "hotel2", type: "stays", lat: 48.8652, lng: 2.3218, title: "Hôtel Costes", subtitle: "5 étoiles", price: 520, rating: 4.7 },
  { id: "hotel3", type: "stays", lat: 48.8566, lng: 2.3522, title: "Hôtel de Ville B&B", subtitle: "3 étoiles", price: 120, rating: 4.3 },
  { id: "hotel4", type: "stays", lat: 48.8738, lng: 2.2950, title: "Renaissance Arc", subtitle: "4 étoiles", price: 280, rating: 4.5 },
];

interface PlannerMapProps {
  activeTab: TabType;
  center: [number, number];
  zoom: number;
  onPinClick: (pin: MapPin) => void;
  selectedPinId?: string;
}

const PlannerMap = ({ activeTab, center, zoom, onPinClick, selectedPinId }: PlannerMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Get pins based on active tab
  const getPinsForTab = useCallback((tab: TabType): MapPin[] => {
    switch (tab) {
      case "flights":
        return mockFlightPins;
      case "activities":
        return mockActivityPins;
      case "stays":
        return mockStayPins;
      default:
        return [];
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = "pk.eyJ1IjoidHJhdmxpYXEiLCJhIjoiY200YzE5bGl4MHZ4ZjJrcTFwdXZmY3FxZCJ9.2v4VJXr3_g0cxEsNDFCOGA";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [center[0], center[1]],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-left");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

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
        border-radius: 50%;
        background: ${pin.id === selectedPinId ? "hsl(193, 100%, 42%)" : "white"};
        border: 3px solid ${pin.id === selectedPinId ? "hsl(193, 100%, 32%)" : "hsl(193, 100%, 42%)"};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.2s ease;
        font-size: 12px;
        font-weight: 600;
        color: ${pin.id === selectedPinId ? "white" : "hsl(214, 51%, 11%)"};
      `;

      // Add price or icon based on type
      if (pin.price !== undefined && pin.price > 0) {
        el.innerHTML = `${pin.price}€`;
      } else if (activeTab === "flights") {
        el.innerHTML = "✈️";
      } else if (activeTab === "activities") {
        el.innerHTML = "📍";
      } else {
        el.innerHTML = "🏨";
      }

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.1)";
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      el.addEventListener("click", () => {
        onPinClick(pin);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Draw flight routes if on flights tab
    if (activeTab === "flights" && map.current.getSource("route")) {
      map.current.removeLayer("route");
      map.current.removeSource("route");
    }

    if (activeTab === "flights") {
      const parisPin = mockFlightPins.find((p) => p.id === "cdg");
      if (parisPin) {
        mockFlightPins
          .filter((p) => p.id !== "cdg")
          .forEach((destPin) => {
            const sourceId = `route-${destPin.id}`;
            
            if (map.current?.getSource(sourceId)) {
              map.current.removeLayer(sourceId);
              map.current.removeSource(sourceId);
            }

            map.current?.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [parisPin.lng, parisPin.lat],
                    [destPin.lng, destPin.lat],
                  ],
                },
              },
            });

            map.current?.addLayer({
              id: sourceId,
              type: "line",
              source: sourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "hsl(193, 100%, 42%)",
                "line-width": 2,
                "line-dasharray": [2, 4],
                "line-opacity": 0.6,
              },
            });
          });
      }
    }
  }, [activeTab, mapLoaded, selectedPinId, onPinClick, getPinsForTab]);

  // Update map center/zoom
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({ center: [center[0], center[1]], zoom });
  }, [center, zoom]);

  return (
    <div ref={mapContainer} className="absolute inset-0" />
  );
};

export default PlannerMap;
