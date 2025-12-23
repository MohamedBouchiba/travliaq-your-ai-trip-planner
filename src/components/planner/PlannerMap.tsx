import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@/styles/mapbox-overrides.css";
import type { TabType, MapPin } from "@/pages/TravelPlanner";
import type { FlightRoutePoint } from "./PlannerPanel";
import { useFlightMemory } from "@/contexts/FlightMemoryContext";

// Destination click event for popup
export interface DestinationClickEvent {
  cityName: string;
  countryName?: string;
  lat: number;
  lng: number;
  screenPosition: { x: number; y: number };
}

// Mock data for pins
const mockFlightPins: MapPin[] = [
  { id: "cdg", type: "flights", lat: 49.0097, lng: 2.5479, title: "Paris CDG", subtitle: "Aéroport", price: 0 },
  { id: "jfk", type: "flights", lat: 40.6413, lng: -73.7781, title: "New York JFK", subtitle: "Aéroport", price: 450 },
  { id: "lhr", type: "flights", lat: 51.47, lng: -0.4543, title: "Londres Heathrow", subtitle: "Aéroport", price: 120 },
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
  { id: "hotel4", type: "stays", lat: 48.8738, lng: 2.295, title: "Renaissance Arc", subtitle: "4 étoiles", price: 280, rating: 4.5 },
];


// City coordinates mapping (common cities with French & English variants)
const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  // France
  "paris": { lat: 48.8566, lng: 2.3522 },
  "nice": { lat: 43.7102, lng: 7.2620 },
  "marseille": { lat: 43.2965, lng: 5.3698 },
  "lyon": { lat: 45.7640, lng: 4.8357 },
  "bordeaux": { lat: 44.8378, lng: -0.5792 },
  "toulouse": { lat: 43.6047, lng: 1.4442 },
  "nantes": { lat: 47.2184, lng: -1.5536 },
  "lille": { lat: 50.6292, lng: 3.0573 },
  "strasbourg": { lat: 48.5734, lng: 7.7521 },
  "montpellier": { lat: 43.6108, lng: 3.8767 },
  "rennes": { lat: 48.1173, lng: -1.6778 },

  // Belgium
  "brussels": { lat: 50.8503, lng: 4.3517 },
  "bruxelles": { lat: 50.8503, lng: 4.3517 },
  "antwerp": { lat: 51.2194, lng: 4.4025 },
  "anvers": { lat: 51.2194, lng: 4.4025 },

  // Spain
  "barcelona": { lat: 41.3851, lng: 2.1734 },
  "barcelone": { lat: 41.3851, lng: 2.1734 },
  "madrid": { lat: 40.4168, lng: -3.7038 },
  "seville": { lat: 37.3891, lng: -5.9845 },
  "séville": { lat: 37.3891, lng: -5.9845 },
  "valencia": { lat: 39.4699, lng: -0.3763 },
  "valence": { lat: 39.4699, lng: -0.3763 },
  "malaga": { lat: 36.7213, lng: -4.4214 },
  "bilbao": { lat: 43.2630, lng: -2.9350 },

  // UK
  "london": { lat: 51.5074, lng: -0.1278 },
  "londres": { lat: 51.5074, lng: -0.1278 },
  "manchester": { lat: 53.4808, lng: -2.2426 },
  "edinburgh": { lat: 55.9533, lng: -3.1883 },
  "édimbourg": { lat: 55.9533, lng: -3.1883 },
  "glasgow": { lat: 55.8642, lng: -4.2518 },
  "birmingham": { lat: 52.4862, lng: -1.8904 },
  "liverpool": { lat: 53.4084, lng: -2.9916 },

  // Germany
  "berlin": { lat: 52.5200, lng: 13.4050 },
  "munich": { lat: 48.1351, lng: 11.5820 },
  "frankfurt": { lat: 50.1109, lng: 8.6821 },
  "francfort": { lat: 50.1109, lng: 8.6821 },
  "hamburg": { lat: 53.5511, lng: 9.9937 },
  "hambourg": { lat: 53.5511, lng: 9.9937 },
  "cologne": { lat: 50.9375, lng: 6.9603 },
  "düsseldorf": { lat: 51.2277, lng: 6.7735 },

  // Italy
  "rome": { lat: 41.9028, lng: 12.4964 },
  "milan": { lat: 45.4642, lng: 9.1900 },
  "venice": { lat: 45.4408, lng: 12.3155 },
  "venise": { lat: 45.4408, lng: 12.3155 },
  "florence": { lat: 43.7696, lng: 11.2558 },
  "naples": { lat: 40.8518, lng: 14.2681 },
  "turin": { lat: 45.0703, lng: 7.6869 },

  // Portugal
  "lisbon": { lat: 38.7223, lng: -9.1393 },
  "lisbonne": { lat: 38.7223, lng: -9.1393 },
  "porto": { lat: 41.1579, lng: -8.6291 },

  // Netherlands
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "rotterdam": { lat: 51.9244, lng: 4.4777 },
  "the hague": { lat: 52.0705, lng: 4.3007 },
  "la haye": { lat: 52.0705, lng: 4.3007 },

  // Switzerland
  "zurich": { lat: 47.3769, lng: 8.5417 },
  "geneva": { lat: 46.2044, lng: 6.1432 },
  "genève": { lat: 46.2044, lng: 6.1432 },
  "bern": { lat: 46.9480, lng: 7.4474 },
  "berne": { lat: 46.9480, lng: 7.4474 },

  // Austria
  "vienna": { lat: 48.2082, lng: 16.3738 },
  "vienne": { lat: 48.2082, lng: 16.3738 },
  "salzburg": { lat: 47.8095, lng: 13.0550 },
  "salzbourg": { lat: 47.8095, lng: 13.0550 },

  // Scandinavia
  "stockholm": { lat: 59.3293, lng: 18.0686 },
  "oslo": { lat: 59.9139, lng: 10.7522 },
  "copenhagen": { lat: 55.6761, lng: 12.5683 },
  "copenhague": { lat: 55.6761, lng: 12.5683 },
  "helsinki": { lat: 60.1699, lng: 24.9384 },

  // Eastern Europe
  "prague": { lat: 50.0755, lng: 14.4378 },
  "budapest": { lat: 47.4979, lng: 19.0402 },
  "warsaw": { lat: 52.2297, lng: 21.0122 },
  "varsovie": { lat: 52.2297, lng: 21.0122 },
  "krakow": { lat: 50.0647, lng: 19.9450 },
  "cracovie": { lat: 50.0647, lng: 19.9450 },
  "bucharest": { lat: 44.4268, lng: 26.1025 },
  "bucarest": { lat: 44.4268, lng: 26.1025 },

  // Greece & Turkey
  "athens": { lat: 37.9838, lng: 23.7275 },
  "athènes": { lat: 37.9838, lng: 23.7275 },
  "istanbul": { lat: 41.0082, lng: 28.9784 },
  "thessaloniki": { lat: 40.6401, lng: 22.9444 },

  // Ireland
  "dublin": { lat: 53.3498, lng: -6.2603 },
  "cork": { lat: 51.8985, lng: -8.4756 },

  // Russia
  "moscow": { lat: 55.7558, lng: 37.6173 },
  "moscou": { lat: 55.7558, lng: 37.6173 },
  "saint petersburg": { lat: 59.9311, lng: 30.3609 },
  "saint-pétersbourg": { lat: 59.9311, lng: 30.3609 },

  // North Africa & Middle East
  "marrakech": { lat: 31.6295, lng: -7.9811 },
  "casablanca": { lat: 33.5731, lng: -7.5898 },
  "cairo": { lat: 30.0444, lng: 31.2357 },
  "le caire": { lat: 30.0444, lng: 31.2357 },
  "dubai": { lat: 25.2048, lng: 55.2708 },
  "dubaï": { lat: 25.2048, lng: 55.2708 },
  "tel aviv": { lat: 32.0853, lng: 34.7818 },

  // Americas
  "new york": { lat: 40.7128, lng: -74.0060 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "miami": { lat: 25.7617, lng: -80.1918 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "montreal": { lat: 45.5017, lng: -73.5673 },
  "montréal": { lat: 45.5017, lng: -73.5673 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "vancouver": { lat: 49.2827, lng: -123.1207 },
  "mexico city": { lat: 19.4326, lng: -99.1332 },
  "mexico": { lat: 19.4326, lng: -99.1332 },
  "buenos aires": { lat: -34.6037, lng: -58.3816 },
  "sao paulo": { lat: -23.5505, lng: -46.6333 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
  "rio": { lat: -22.9068, lng: -43.1729 },

  // Africa
  "cape town": { lat: -33.9249, lng: 18.4241 },
  "le cap": { lat: -33.9249, lng: 18.4241 },
  "johannesburg": { lat: -26.2041, lng: 28.0473 },

  // Asia
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "bangkok": { lat: 13.7563, lng: 100.5018 },
  "singapore": { lat: 1.3521, lng: 103.8198 },
  "singapour": { lat: 1.3521, lng: 103.8198 },
  "hong kong": { lat: 22.3193, lng: 114.1694 },
  "seoul": { lat: 37.5665, lng: 126.9780 },
  "séoul": { lat: 37.5665, lng: 126.9780 },
  "beijing": { lat: 39.9042, lng: 116.4074 },
  "pékin": { lat: 39.9042, lng: 116.4074 },
  "shanghai": { lat: 31.2304, lng: 121.4737 },
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "bali": { lat: -8.3405, lng: 115.0920 },
  "phuket": { lat: 7.8804, lng: 98.3923 },
};

function getCityCoords(cityName: string): { lat: number; lng: number } | null {
  const normalizedCity = cityName.toLowerCase().split(",")[0].trim();
  return cityCoordinates[normalizedCity] || null;
}

function cssHsl(varName: string, fallbackHsl = "222.2 47.4% 11.2%") {
  // shadcn tokens are stored as: "H S% L%" (no hsl())
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const hsl = (raw || fallbackHsl).trim();

  // Mapbox's color parser is stricter than browsers: it doesn't accept the space-separated hsl() form.
  // Convert "193 100% 42%" -> "hsl(193, 100%, 42%)"
  const parts = hsl.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    const [h, s, l] = parts;
    return `hsl(${h}, ${s}, ${l})`;
  }

  return `hsl(${hsl})`;
}

interface UserLocation {
  lat: number;
  lng: number;
  city: string;
}

interface PlannerMapProps {
  activeTab: TabType;
  center: [number, number];
  zoom: number;
  onPinClick: (pin: MapPin) => void;
  selectedPinId?: string;
  flightRoutes?: FlightRoutePoint[];
  animateToUserLocation?: boolean;
  onAnimationComplete?: () => void;
  isPanelOpen?: boolean;
  userLocation?: UserLocation | null;
  onDestinationClick?: (event: DestinationClickEvent) => void;
}

const PlannerMap = ({ activeTab, center, zoom, onPinClick, selectedPinId, flightRoutes = [], animateToUserLocation = false, onAnimationComplete, isPanelOpen = false, userLocation, onDestinationClick }: PlannerMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const memoryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const hasAnimatedRef = useRef(false);

  // Get route points from flight memory
  const { getRoutePoints } = useFlightMemory();

  // Get pins based on active tab - returns empty by default (no pins shown initially)
  const getPinsForTab = useCallback((tab: TabType): MapPin[] => {
    // By default, show no pins at all - only show when explicitly triggered by user action
    return [];
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = "pk.eyJ1IjoibW9oYW1lZGJvdWNoaWJhIiwiYSI6ImNtZ2t3dHZ0MzAyaDAya3NldXJ1dTkxdTAifQ.vYCeVngdG4_B0Zpms0dQNA";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [center[0], center[1]],
      zoom: zoom,
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

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Animate to user location on initial load
  useEffect(() => {
    if (!map.current || !mapLoaded || hasAnimatedRef.current || !animateToUserLocation) return;

    hasAnimatedRef.current = true;

    // Add left padding to visually shift the globe to the right (leave space for widget)
    map.current.setPadding({ left: 350, top: 0, right: 0, bottom: 0 });

    // Start animation immediately - no delay
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.current?.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 5.5, // Closer zoom for better view
            duration: 1800, // Faster animation
            essential: true,
          });
          setTimeout(() => onAnimationComplete?.(), 1800);
        },
        () => {
          // Fallback to Europe
          map.current?.flyTo({
            center: [10, 48],
            zoom: 5.5,
            duration: 1800,
            essential: true,
          });
          setTimeout(() => onAnimationComplete?.(), 1800);
        },
        { timeout: 3000 }
      );
    } else {
      // Fallback to Europe
      map.current?.flyTo({
        center: [10, 48],
        zoom: 5.5,
        duration: 1800,
        essential: true,
      });
      setTimeout(() => onAnimationComplete?.(), 1800);
    }
  }, [mapLoaded, animateToUserLocation, onAnimationComplete]);

  // Adjust map padding based on panel visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Animate padding change when panel opens/closes
    const leftPadding = isPanelOpen ? 450 : 350;
    map.current.easeTo({
      padding: { left: leftPadding, top: 0, right: 0, bottom: 0 },
      duration: 300,
    });
  }, [isPanelOpen, mapLoaded]);

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

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map.current);

    userMarkerRef.current = marker;

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  }, [mapLoaded, userLocation]);

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
        el.textContent = `${pin.price}€`;
      } else if (activeTab === "flights") {
        el.textContent = "✈️";
      } else if (activeTab === "activities") {
        el.textContent = "📍";
      } else {
        el.textContent = "🏨";
      }

      el.addEventListener("click", () => {
        onPinClick(pin);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Clean up old mock flight routes
    mockFlightPins.forEach((destPin) => {
      const sourceId = `route-${destPin.id}`;
      if (map.current?.getSource(sourceId)) {
        if (map.current.getLayer(sourceId)) {
          map.current.removeLayer(sourceId);
        }
        map.current.removeSource(sourceId);
      }
    });
  }, [activeTab, mapLoaded, selectedPinId, onPinClick, getPinsForTab]);

  // Draw route markers from FlightMemory (most up-to-date source)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear previous memory markers
    memoryMarkersRef.current.forEach((marker) => marker.remove());
    memoryMarkersRef.current = [];

    // Remove previous memory route lines
    const memorySourceId = "memory-route";
    const memoryArrowId = "memory-route-arrow";
    
    if (map.current.getLayer(memoryArrowId)) {
      map.current.removeLayer(memoryArrowId);
    }
    if (map.current.getLayer(memorySourceId)) {
      map.current.removeLayer(memorySourceId);
    }
    if (map.current.getSource(memorySourceId)) {
      map.current.removeSource(memorySourceId);
    }

    const memoryPoints = getRoutePoints();
    
    if (memoryPoints.length === 0) return;

    // Helper to extract city name from various formats
    const extractCityName = (label: string): string => {
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
        " Fiumicino", " Marco Polo", " Malpensa", " Linate"
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


    // Create markers for each point
    memoryPoints.forEach((point, index) => {
      // Outer container for stable positioning
      const container = document.createElement("div");
      container.className = "memory-route-marker-container";
      container.style.cssText = `
        width: 36px;
        height: 36px;
        position: relative;
      `;

      const el = document.createElement("div");
      el.className = "memory-route-marker";
      
      const isDeparture = point.type === "departure";
      const isArrival = point.type === "arrival";
      
      el.style.cssText = `
        width: 36px;
        height: 36px;
        border-radius: 9999px;
        background: ${isDeparture ? "hsl(var(--primary))" : "hsl(142 76% 36%)"};
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        font-weight: 700;
        color: white;
        user-select: none;
        z-index: 20;
        transition: box-shadow 0.2s ease, border-color 0.2s ease;
      `;
      el.textContent = isDeparture ? "✈" : "🛬";

      // Add tooltip with label
      el.title = point.label;

      // Add hover effect (shadow only, no transform to avoid position issues)
      el.addEventListener("mouseenter", () => {
        el.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)";
        el.style.borderColor = "hsl(var(--primary))";
      });
      el.addEventListener("mouseleave", () => {
        el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        el.style.borderColor = "white";
      });

      container.appendChild(el);

      // Add click handler for arrival destinations (open popup)
      if (isArrival && onDestinationClick) {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          
          // Get screen position of the marker element
          const rect = el.getBoundingClientRect();
          const screenPosition = {
            x: rect.left + rect.width / 2,
            y: rect.top,
          };

          // Use city from memory if available, otherwise extract from label
          const cityName = point.city || extractCityName(point.label);

          onDestinationClick({
            cityName,
            countryName: point.country,
            lat: point.lat,
            lng: point.lng,
            screenPosition,
          });
        });
      }

      const marker = new mapboxgl.Marker({ element: container })
        .setLngLat([point.lng, point.lat])
        .addTo(map.current!);

      memoryMarkersRef.current.push(marker);
    });

    // Draw line between departure and arrival if we have both
    if (memoryPoints.length >= 2) {
      const departure = memoryPoints.find(p => p.type === "departure");
      const arrival = memoryPoints.find(p => p.type === "arrival");
      
      if (departure && arrival) {
        map.current.addSource(memorySourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [departure.lng, departure.lat],
                [arrival.lng, arrival.lat],
              ],
            },
          },
        });

        const routeColor = cssHsl("--primary", "221.2 83.2% 53.3%");

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
            "line-width": 3,
            "line-dasharray": [2, 2],
            "line-opacity": 0.85,
          },
        });

        // Direction arrows along the line
        map.current.addLayer({
          id: memoryArrowId,
          type: "symbol",
          source: memorySourceId,
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 90,
            "text-field": "➜",
            "text-size": 16,
            "text-keep-upright": false,
            "text-rotation-alignment": "map",
          },
          paint: {
            "text-color": routeColor,
            "text-halo-color": "rgba(0,0,0,0.35)",
            "text-halo-width": 1,
          },
        });

        // Fit map to show both points
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([departure.lng, departure.lat]);
        bounds.extend([arrival.lng, arrival.lat]);
        map.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 450, right: 50 },
          maxZoom: 6,
        });
      }
    } else if (memoryPoints.length === 1) {
      // Fly to single point
      map.current.flyTo({
        center: [memoryPoints[0].lng, memoryPoints[0].lat],
        zoom: 5,
      });
    }
  }, [getRoutePoints, mapLoaded, onDestinationClick]);

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
  }, [mapLoaded]);

  // Update map center/zoom
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({ center: [center[0], center[1]], zoom });
  }, [center, zoom]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: "100%" }} />
  );
};

export default PlannerMap;