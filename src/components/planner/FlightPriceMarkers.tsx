import { memo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import type { AirportMarker } from "@/hooks/useAirportsInBounds";
import type { MapPricesResult } from "@/hooks/useMapPrices";
import eventBus from "@/lib/eventBus";
import { escapeHtml } from "@/components/planner/chat/utils/security";

interface FlightPriceMarkersProps {
  map: mapboxgl.Map | null;
  airports: AirportMarker[];
  prices: MapPricesResult;
  departureIata?: string;
  departureCity?: string;
  departureAirports: string[];
  currentZoom: number;
  isFlightsTab: boolean;
  /** Whether a departure airport is set (controls loading dots display) */
  hasDeparture?: boolean;
  /** i18n label for departure marker (e.g. "Départ" / "Departure") */
  departureLabel?: string;
  /** Currency symbol for price display (e.g. "€", "$") */
  currencySymbol?: string;
}

// Stable hub ID generator
function getHubId(airport: AirportMarker): string {
  return airport.hubId ?? airport.cityName?.toLowerCase().trim() ?? airport.iata;
}

// Get minimum price across all hub IATAs
function getHubPrice(airport: AirportMarker, prices: MapPricesResult): number | null | undefined {
  const hubIatas = airport.allIatas?.length ? airport.allIatas : [airport.iata];
  let minPrice: number | null | undefined = undefined;
  
  for (const iata of hubIatas) {
    const pd = prices[iata];
    if (pd !== undefined) {
      if (pd !== null && pd.price != null) {
        if (minPrice === undefined || minPrice === null || pd.price < minPrice) {
          minPrice = pd.price;
        }
      } else if (minPrice === undefined) {
        minPrice = null;
      }
    }
  }
  
  return minPrice;
}

// Create loading dots HTML
function createLoadingDots(): string {
  return `
    <span class="loading-dots">
      <span style="animation: bounce-dot 1s infinite; animation-delay: 0ms;">•</span>
      <span style="animation: bounce-dot 1s infinite; animation-delay: 150ms;">•</span>
      <span style="animation: bounce-dot 1s infinite; animation-delay: 300ms;">•</span>
    </span>
  `;
}

// Create marker DOM element
function createMarkerElement(
  airport: AirportMarker,
  isOrigin: boolean,
  price: number | null | undefined,
  onClick: (airport: AirportMarker) => void,
  departureLabel: string,
  currencySymbol: string,
): HTMLDivElement | null {
  // Don't create marker for no-flight destinations
  if (price === null && !isOrigin) return null;
  
  const cityName = airport.cityName || airport.name;
  let priceContent: string;
  let priceColor = "#0369a1";
  
  if (isOrigin) {
    priceContent = departureLabel;
    priceColor = "#64748b";
  } else if (price === undefined) {
    // hasDeparture is passed via closure from the caller
    priceContent = createLoadingDots();
  } else {
    priceContent = `${price}${currencySymbol}`;
  }
  
  const el = document.createElement("div");
  el.className = "flight-price-marker";
  el.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    z-index: 10;
    pointer-events: ${isOrigin ? "none" : "auto"};
    cursor: ${isOrigin ? "default" : "pointer"};
    will-change: transform;
  `;
  
  el.innerHTML = `
    <div class="airport-badge" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 3px 8px rgba(0,0,0,0.35));
      transition: transform 0.15s ease-out, filter 0.15s ease-out;
    ">
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
        padding: 6px 12px 5px;
        border-radius: 10px;
        border: 1.5px solid rgba(0,0,0,0.12);
        min-width: 48px;
        box-shadow: inset 0 1px 2px rgba(255,255,255,0.8);
      ">
        <span style="
          color: #0f172a;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.01em;
          line-height: 1.1;
          max-width: 85px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        ">${escapeHtml(cityName)}</span>
        <span class="airport-price" style="
          color: ${priceColor};
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
          margin-top: 2px;
        ">${priceContent}</span>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 8px solid #ffffff;
        margin-top: -1px;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
      "></div>
    </div>
  `;
  
  // Hover effects
  const badge = el.querySelector(".airport-badge") as HTMLElement;
  if (badge && !isOrigin) {
    el.addEventListener("mouseenter", () => {
      badge.style.transform = "scale(1.08)";
      badge.style.filter = "drop-shadow(0 4px 10px rgba(0,0,0,0.3))";
    });
    el.addEventListener("mouseleave", () => {
      badge.style.transform = "scale(1)";
      badge.style.filter = "drop-shadow(0 3px 8px rgba(0,0,0,0.35))";
    });
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(airport);
    });
  }
  
  return el;
}

// Update marker price content
function updateMarkerPrice(el: HTMLElement, price: number | null | undefined, isOrigin: boolean, departureLabel: string, currencySymbol: string) {
  const priceSpan = el.querySelector(".airport-price") as HTMLElement;
  if (!priceSpan) return;
  
  let newContent: string;
  let newColor: string;
  
  if (isOrigin) {
    newContent = departureLabel;
    newColor = "#64748b";
  } else if (price === undefined) {
    newContent = createLoadingDots();
    newColor = "#0369a1";
  } else if (price !== null) {
    newContent = `${price}${currencySymbol}`;
    newColor = "#0369a1";
  } else {
    return; // null = no flight, marker should have been removed
  }
  
  // Skip DOM update if content hasn't changed (prevents flash)
  const plainText = newContent.replace(/<[^>]*>/g, '');
  if (priceSpan.textContent === plainText && !newContent.includes('loading-dots')) {
    return;
  }
  
  priceSpan.innerHTML = newContent;
  priceSpan.style.color = newColor;
}

// Main component using direct DOM manipulation for smooth updates
function FlightPriceMarkersInner({
  map,
  airports,
  prices,
  departureIata,
  departureCity,
  departureAirports,
  currentZoom,
  isFlightsTab,
  hasDeparture = false,
  departureLabel = "Departure",
  currencySymbol = "€",
}: FlightPriceMarkersProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Map<string, { el: HTMLElement; airport: AirportMarker; isOrigin: boolean }>>(new Map());
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef({ airports, prices, departureIata, departureCity, departureAirports, currentZoom });
  
  // Keep data ref updated
  dataRef.current = { airports, prices, departureIata, departureCity, departureAirports, currentZoom };
  
  // Handle marker click
  const handleClick = useCallback((airport: AirportMarker) => {
    console.log(`[FlightPriceMarkers] Hub clicked: ${getHubId(airport)} - ${airport.cityName}`);
    eventBus.emit("airports:click", { airport });
  }, []);
  
  // Update positions using transform3d for GPU acceleration - NO React state
  const updatePositions = useCallback(() => {
    if (!map || !containerRef.current) return;
    
    const canvas = map.getCanvas();
    const bounds = canvas.getBoundingClientRect();
    const margin = 50;
    const hideDeparturePin = dataRef.current.currentZoom < 7;
    
    markersRef.current.forEach(({ el, airport, isOrigin }, hubId) => {
      // Hide origin when zoomed out
      if (isOrigin && hideDeparturePin) {
        el.style.display = "none";
        return;
      }
      
      const point = map.project([airport.lng, airport.lat]);
      
      // Check viewport
      const inViewport =
        point.x >= -margin &&
        point.x <= bounds.width + margin &&
        point.y >= -margin &&
        point.y <= bounds.height + margin;
      
      if (!inViewport) {
        el.style.display = "none";
        return;
      }
      
      el.style.display = "block";
      // Use translate3d for GPU-accelerated smooth movement
      el.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -100%)`;
    });
  }, [map]);
  
  // Sync markers with airports data (creation/removal only - prices handled separately)
  useEffect(() => {
    if (!map || !isFlightsTab || !containerRef.current) {
      // Clear all markers when not on flights tab
      markersRef.current.forEach(({ el }) => el.remove());
      markersRef.current.clear();
      return;
    }
    
    const { departureIata: depIata, departureCity: depCity, departureAirports: depAirports, prices: currentPrices } = dataRef.current;
    const userDepIata = depIata?.toUpperCase();
    const userDepCity = depCity?.toLowerCase().trim();
    const depSet = new Set(depAirports.map((d) => d.toUpperCase()));
    
    const currentHubIds = new Set<string>();
    
    // Create/update markers for each airport
    for (const airport of airports) {
      const hubId = getHubId(airport);
      currentHubIds.add(hubId);
      
      const isOrigin =
        (userDepIata && airport.iata.toUpperCase() === userDepIata) ||
        (userDepCity && airport.cityName?.toLowerCase().trim() === userDepCity) ||
        depSet.has(airport.iata.toUpperCase());
      
      const price = getHubPrice(airport, currentPrices);
      
      // Skip destinations with no flights OR no departure set and no price yet
      if ((price === null && !isOrigin) || (price === undefined && !isOrigin && !hasDeparture)) {
        // Remove existing marker if any
        const existing = markersRef.current.get(hubId);
        if (existing) {
          existing.el.remove();
          markersRef.current.delete(hubId);
        }
        continue;
      }
      
      const existing = markersRef.current.get(hubId);
      
      if (existing) {
        // Update existing marker's price
        updateMarkerPrice(existing.el, price, isOrigin, departureLabel, currencySymbol);
      } else {
        // Create new marker
        const el = createMarkerElement(airport, isOrigin, price, handleClick, departureLabel, currencySymbol);
        if (el) {
          containerRef.current!.appendChild(el);
          markersRef.current.set(hubId, { el, airport, isOrigin });
        }
      }
    }
    
    // Remove markers for airports no longer in bounds
    markersRef.current.forEach(({ el }, hubId) => {
      if (!currentHubIds.has(hubId)) {
        el.remove();
        markersRef.current.delete(hubId);
      }
    });
    
    // Update positions immediately
    updatePositions();
  }, [map, airports, isFlightsTab, handleClick, updatePositions, departureLabel, currencySymbol]);
  
  // Lightweight effect: update prices on existing markers without full re-sync
  useEffect(() => {
    if (!isFlightsTab) return;
    
    markersRef.current.forEach(({ el, airport, isOrigin }) => {
      const price = getHubPrice(airport, prices);
      updateMarkerPrice(el, price, isOrigin, departureLabel, currencySymbol);
    });
  }, [prices, isFlightsTab, departureLabel, currencySymbol]);
  
  // Set up smooth position updates on map move
  useEffect(() => {
    if (!map || !isFlightsTab) return;
    
    // Create container
    if (!containerRef.current) {
      const container = document.createElement("div");
      container.id = "flight-price-markers-container";
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
        z-index: 5;
      `;
      map.getContainer().appendChild(container);
      containerRef.current = container;
    }
    
    // Smooth update using RAF - fires on every frame during map movement
    const onMove = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updatePositions);
    };
    
    // Also update during render for maximum smoothness
    const onRender = () => {
      updatePositions();
    };
    
    map.on("move", onMove);
    map.on("render", onRender);
    map.on("resize", updatePositions);
    
    // Initial position
    updatePositions();
    
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.off("move", onMove);
      map.off("render", onRender);
      map.off("resize", updatePositions);
    };
  }, [map, isFlightsTab, updatePositions]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.remove();
        containerRef.current = null;
      }
      markersRef.current.clear();
    };
  }, []);
  
  return null; // No React rendering - all DOM manipulation
}

// Inject styles once
function injectStyles() {
  if (document.getElementById("flight-price-markers-styles")) return;
  
  const style = document.createElement("style");
  style.id = "flight-price-markers-styles";
  style.textContent = `
    @keyframes bounce-dot {
      0%, 80%, 100% {
        transform: translateY(0);
        opacity: 0.5;
      }
      40% {
        transform: translateY(-3px);
        opacity: 1;
      }
    }
    
    #flight-price-markers-container .flight-price-marker {
      pointer-events: auto;
    }
    
    .loading-dots {
      display: inline-flex;
      gap: 2px;
    }
  `;
  document.head.appendChild(style);
}

// Wrapper with styles injection
const FlightPriceMarkers = memo(function FlightPriceMarkers(props: FlightPriceMarkersProps) {
  useEffect(() => {
    injectStyles();
  }, []);
  
  return <FlightPriceMarkersInner {...props} />;
});

export default FlightPriceMarkers;
