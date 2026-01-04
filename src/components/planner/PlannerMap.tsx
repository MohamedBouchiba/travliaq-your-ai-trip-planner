import { useEffect, useRef, useState, useCallback, memo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@/styles/mapbox-overrides.css";
import type { TabType, MapPin } from "@/pages/TravelPlanner";
import type { FlightRoutePoint } from "./PlannerPanel";
import { useFlightMemory, type MemoryRoutePoint } from "@/contexts/FlightMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";
import { useActivityMemory } from "@/contexts/ActivityMemoryContext";
import { useAirportsInBounds, type AirportMarker } from "@/hooks/useAirportsInBounds";
import eventBus from "@/lib/eventBus";

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

// Generate a great circle arc between two points for curved flight paths
function generateGreatCircleArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];
  
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  
  const lat1 = toRad(start[1]);
  const lon1 = toRad(start[0]);
  const lat2 = toRad(end[1]);
  const lon2 = toRad(end[0]);
  
  // Calculate the angular distance between points
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
    )
  );
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    
    points.push([toDeg(lon), toDeg(lat)]);
  }
  
  return points;
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
  const [isSearchingInArea, setIsSearchingInArea] = useState(false);
  // Removed - using displayedAirportsRef for optimized rendering
  const [currentZoom, setCurrentZoom] = useState(zoom);

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
  const { getRoutePoints, memory: flightMem } = useFlightMemory();

  // Get accommodation entries for markers
  const { memory: accommodationMemory } = useAccommodationMemory();

  // Get activity entries for markers
  const { state: activityState, allDestinations: activityAllDestinations } = useActivityMemory();

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
          subtitle: activity.categories?.[0] || "Activité",
          rating: activity.rating?.average,
          duration: activity.duration?.formatted,
          price: activity.pricing?.from_price,
          image: activity.images?.[0]?.variants?.small || activity.images?.[0]?.url,
        };

        return mapPin;
      }).filter((pin): pin is MapPin => pin !== null);
    }

    // By default, show no pins for other tabs
    return [];
  }, [activityState.activities]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const handlePopupClose = () => {
      const prev = (window as any).__selectedDestinationPinEl as HTMLElement | undefined;
      if (prev) {
        prev.style.filter = "drop-shadow(0 4px 8px rgba(0,0,0,0.3))";
        prev.style.transform = "scale(1)";
      }
      (window as any).__selectedDestinationPinEl = undefined;
    };

    window.addEventListener("destination-popup-close", handlePopupClose);

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

  // Fetch airports when map moves (only on flights tab)
  useEffect(() => {
    if (!map.current || !mapLoaded || activeTab !== "flights") return;

    const handleMoveEnd = () => {
      if (!map.current) return;
      
      const bounds = map.current.getBounds();
      const zoom = map.current.getZoom();
      
      fetchAirports({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
      
      // Emit event for other components
      eventBus.emit("airports:fetch", {
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        },
        zoom,
      });
    };

    // Fetch immediately on tab switch
    handleMoveEnd();

    map.current.on("moveend", handleMoveEnd);

    return () => {
      map.current?.off("moveend", handleMoveEnd);
    };
  }, [mapLoaded, activeTab, fetchAirports]);

  // Emit loading state for airports
  useEffect(() => {
    eventBus.emit("airports:loading", { isLoading: isLoadingAirports });
  }, [isLoadingAirports]);

  // Track which airports are currently displayed (by hub id)
  const displayedAirportsRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Display airport markers when on flights tab - OPTIMIZED to avoid flickering
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Hide all markers when not on flights tab
    if (activeTab !== "flights") {
      displayedAirportsRef.current.forEach((marker) => {
        const el = marker.getElement();
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
      });
      return;
    }

    // Get user's departure airport info to exclude from display
    const userDepartureIata = flightMem?.departure?.iata?.toUpperCase();
    const userDepartureCity = flightMem?.departure?.city?.toLowerCase().trim();

    // Filter airports: exclude user's departure airport/city and keep stable hub markers
    const filteredAirports = airports
      .filter((a) => {
        if (userDepartureIata && a.iata.toUpperCase() === userDepartureIata) return false;
        if (userDepartureCity && a.cityName?.toLowerCase().trim() === userDepartureCity) return false;
        return true;
      })
      .sort((a, b) => {
        // Large hubs first
        if (a.type === "large" && b.type !== "large") return -1;
        if (a.type !== "large" && b.type === "large") return 1;
        return 0;
      });

    const hubIdOf = (a: AirportMarker) => a.hubId ?? a.cityName?.toLowerCase().trim() ?? a.iata;

    // Current hubs in response
    const currentHubIds = new Set(filteredAirports.map(hubIdOf));

    // Remove markers that are no longer in the viewport - IMMEDIATE removal to prevent glitches
    const toRemove: string[] = [];
    displayedAirportsRef.current.forEach((marker, hubId) => {
      if (!currentHubIds.has(hubId)) {
        marker.remove();
        toRemove.push(hubId);
      }
    });
    toRemove.forEach((hubId) => displayedAirportsRef.current.delete(hubId));

    // Add or update markers for current hubs
    filteredAirports.forEach((airport, idx) => {
      const hubId = hubIdOf(airport);
      const existingMarker = displayedAirportsRef.current.get(hubId);

      if (existingMarker) {
        // Keep the marker, only update position if it really changed (prevents micro-jitter)
        const prev = existingMarker.getLngLat();
        if (Math.abs(prev.lng - airport.lng) > 0.0001 || Math.abs(prev.lat - airport.lat) > 0.0001) {
          existingMarker.setLngLat([airport.lng, airport.lat]);
        }

        const el = existingMarker.getElement();
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
        return;
      }

      // Create new marker
      const el = document.createElement("div");
      el.className = "airport-marker";

      const cityName = airport.cityName || airport.name;
      const priceText = `${airport.price}€`;

      // NOTE: Do NOT set `transform` on the marker element itself.
      el.style.cssText = `
        opacity: 0;
        transition: opacity 0.2s ease-out;
      `;

      el.innerHTML = `
        <div class="airport-badge" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s ease-out;
          transform: scale(0.9);
          transform-origin: bottom center;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            background: rgba(32, 33, 36, 0.95);
            padding: 4px 8px;
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">
            <span style="
              color: white;
              font-size: 10px;
              font-weight: 600;
            ">${cityName}</span>
            <span style="
              color: #8ab4f8;
              font-size: 10px;
              font-weight: 500;
            ">${priceText}</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid rgba(32, 33, 36, 0.95);
            margin-top: -1px;
          "></div>
        </div>
      `;

      // Animate in with staggered delay (capped)
      const delay = Math.min(idx * 15, 300);
      const badge = el.querySelector(".airport-badge") as HTMLElement | null;

      requestAnimationFrame(() => {
        setTimeout(() => {
          el.style.opacity = "1";
          if (badge) badge.style.transform = "scale(1)";
        }, delay);
      });

      // Hover effects
      badge?.addEventListener("mouseenter", () => {
        badge.style.transform = "scale(1.15)";
      });
      badge?.addEventListener("mouseleave", () => {
        badge.style.transform = "scale(1)";
      });

      // Click handler - emit event for flight form
      badge?.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log(`[PlannerMap] Hub clicked: ${hubId} (cheapest=${airport.iata}) - ${airport.cityName}`);
        eventBus.emit("airports:click", { airport });
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([airport.lng, airport.lat])
        .addTo(map.current!);

      displayedAirportsRef.current.set(hubId, marker);
    });

    return () => {
      // Don't clear on every change - only on unmount
    };
  }, [activeTab, mapLoaded, airports, flightMem]);

  // Cleanup all airport markers on unmount
  useEffect(() => {
    return () => {
      displayedAirportsRef.current.forEach((marker) => marker.remove());
      displayedAirportsRef.current.clear();
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

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
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

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
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

  // Ref to track if routes have been drawn (persists across tab changes)
  const routesDrawnRef = useRef(false);
  const lastRouteSignatureRef = useRef<string>("");

  // Draw route markers from FlightMemory (most up-to-date source)
  // Only show on flights tab - hide on other tabs
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const memoryPoints = getRoutePoints();
    
    // Create a signature to detect real changes vs. just re-renders
    const routeSignature = JSON.stringify({
      points: memoryPoints.map(p => ({
        lat: p.lat.toFixed(4),
        lng: p.lng.toFixed(4),
        type: p.type,
      })),
      activeTab, // Include activeTab in signature to trigger update on tab change
    });
    
    // Skip if routes haven't changed (prevents redraw on tab switch)
    if (routeSignature === lastRouteSignatureRef.current && routesDrawnRef.current) {
      return;
    }
    lastRouteSignatureRef.current = routeSignature;

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
        if (isDeparture) return '✈️';
        if (isWaypoint) return `${index}`; // Show step number for waypoints
        return '📍';
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
            "text-field": "›",
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

      // Fit map to show all points
      map.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 450, right: 50 },
        maxZoom: 6,
      });
      
      // Mark routes as drawn
      routesDrawnRef.current = true;
    } else if (memoryPoints.length === 1) {
      // Fly to single point
      map.current.flyTo({
        center: [memoryPoints[0].lng, memoryPoints[0].lat],
        zoom: 5,
      });
      routesDrawnRef.current = true;
    }
  }, [getRoutePoints, mapLoaded, onDestinationClick, activeTab]);

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

  // Display accommodation markers when stays tab is active
  const accommodationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    
    // Clear existing accommodation markers
    accommodationMarkersRef.current.forEach((marker) => marker.remove());
    accommodationMarkersRef.current = [];
    
    // Only show on stays tab
    if (activeTab !== "stays") return;
    
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
            ">🏨</span>
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
      
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([acc.lng, acc.lat])
        .addTo(map.current!);
      
      accommodationMarkersRef.current.push(marker);
    });
    
    return () => {
      accommodationMarkersRef.current.forEach((marker) => marker.remove());
      accommodationMarkersRef.current = [];
    };
  }, [activeTab, mapLoaded, accommodationMemory.accommodations]);

  // Display activity destination markers when activities tab is active
  const activityDestinationMarkersRef = useRef<mapboxgl.Marker[]>([]);
  
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
            ">🧭</span>
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
          ">${dest.city}</div>
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
      
      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([dest.lng, dest.lat])
        .addTo(map.current!);
      
      activityDestinationMarkersRef.current.push(marker);
    });
    
    return () => {
      activityDestinationMarkersRef.current.forEach((marker) => marker.remove());
      activityDestinationMarkersRef.current = [];
    };
  }, [activeTab, mapLoaded, activityAllDestinations]);

  // Display attraction pins from search results (V2: separate from activities list)
  const attractionPinsRef = useRef<mapboxgl.Marker[]>([]);

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
      const coords = attraction.coordinates || attraction.location?.coordinates;
      if (!coords) return;
      const lat = coords.lat;
      const lng = 'lng' in coords ? coords.lng : ('lon' in coords ? (coords as any).lon : null);
      if (!lat || !lng) return;

      // Create attraction pin - orange with landmark icon 🏛️
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
            ">🏛️</span>
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
      const tooltip = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: [0, -50],
        className: "attraction-tooltip",
      });

      const imageUrl = attraction.images?.[0]?.variants?.medium || attraction.images?.[0]?.url;
      const rating = attraction.rating?.average || 0;

      // Hover effects + tooltip
      const pinEl = el.querySelector("div") as HTMLElement;
      pinEl?.addEventListener("mouseenter", () => {
        pinEl.style.filter = "drop-shadow(0 6px 12px rgba(255,87,34,0.45))";
        pinEl.style.transform = "scale(1.08)";

        // Show tooltip
        tooltip.setHTML(`
          <div class="bg-card border rounded-lg shadow-xl w-64 overflow-hidden">
            ${imageUrl ? `<img src="${imageUrl}" class="w-full h-32 object-cover" alt="${attraction.title}" />` : ''}
            <div class="p-3">
              <h4 class="font-semibold text-sm line-clamp-2 mb-2">${attraction.title}</h4>
              <div class="flex items-center gap-1">
                <span class="text-amber-400">★</span>
                <span class="text-xs font-medium">${rating.toFixed(1)}</span>
                <span class="text-xs text-muted-foreground ml-1">(${attraction.rating?.count || 0} avis)</span>
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
        eventBus.emit("attraction:click", { attraction });
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      attractionPinsRef.current.push(marker);
    });

    return () => {
      attractionPinsRef.current.forEach((marker) => marker.remove());
      attractionPinsRef.current = [];
    };
  }, [activeTab, mapLoaded, activityState.search.attractions]);

  // Update map center/zoom with fast animation
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: [center[0], center[1]],
      zoom,
      duration: 800, // Fast animation (was default ~2500ms)
      essential: true,
    });
  }, [center, zoom]);

  return (
    <div className="absolute inset-0 w-full h-full relative">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: "100%" }} />

      {/* Search in Area Button - Only visible on activities tab */}
      {activeTab === "activities" && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={() => !isSearchingInArea && eventBus.emit("map:searchInArea")}
            disabled={isSearchingInArea}
            className={`
              px-3 py-2 bg-white dark:bg-gray-900
              text-gray-900 dark:text-gray-100
              rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
              font-medium text-xs transition-all flex items-center gap-1.5
              ${isSearchingInArea
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-xl cursor-pointer'
              }
            `}
            title={isSearchingInArea ? "Recherche en cours..." : "Rechercher des activités dans la zone visible"}
          >
            <svg
              className={`h-3.5 w-3.5 ${isSearchingInArea ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isSearchingInArea
                  ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                }
              />
            </svg>
            {isSearchingInArea ? "Recherche..." : "Rechercher dans cette zone"}
          </button>
        </div>
      )}
    </div>
  );
};

export default memo(PlannerMap);