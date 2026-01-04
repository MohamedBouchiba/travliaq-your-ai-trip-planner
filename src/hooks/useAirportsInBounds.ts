import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AirportMarker {
  iata: string;
  name: string;
  cityName: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number;
  lng: number;
  type: "large" | "medium";
  price: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface UseAirportsInBoundsOptions {
  enabled?: boolean;
  debounceMs?: number;
  includeMediumAirports?: boolean;
  limit?: number;
  zoom?: number;
}

interface UseAirportsInBoundsResult {
  airports: AirportMarker[];
  isLoading: boolean;
  error: string | null;
  fetchAirports: (bounds: MapBounds) => void;
}

// Cache to avoid re-fetching for similar bounds
const boundsCache = new Map<string, { airports: AirportMarker[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getBoundsCacheKey(bounds: MapBounds, includeMedium: boolean, zoom: number): string {
  // Round to 1 decimal place to allow for small movements without refetching
  const rounded = {
    north: Math.round(bounds.north * 10) / 10,
    south: Math.round(bounds.south * 10) / 10,
    east: Math.round(bounds.east * 10) / 10,
    west: Math.round(bounds.west * 10) / 10,
  };
  return `${rounded.north},${rounded.south},${rounded.east},${rounded.west},${includeMedium},z${Math.floor(zoom)}`;
}

export function useAirportsInBounds(options: UseAirportsInBoundsOptions = {}): UseAirportsInBoundsResult {
  const {
    enabled = true,
    debounceMs = 400,
    includeMediumAirports = false,
    limit = 100,
    zoom = 5,
  } = options;

  const [airports, setAirports] = useState<AirportMarker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastBoundsKeyRef = useRef<string>("");
  const zoomRef = useRef(zoom);
  const includeMediumRef = useRef(includeMediumAirports);

  // Update refs when options change
  useEffect(() => {
    zoomRef.current = zoom;
    includeMediumRef.current = includeMediumAirports;
  }, [zoom, includeMediumAirports]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const fetchAirports = useCallback((bounds: MapBounds) => {
    if (!enabled) return;

    // Calculate bounds cache key with zoom
    const cacheKey = getBoundsCacheKey(bounds, includeMediumRef.current, zoomRef.current);
    
    // Skip if bounds haven't changed significantly
    if (cacheKey === lastBoundsKeyRef.current) {
      return;
    }

    // Check cache
    const cached = boundsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[useAirportsInBounds] Cache hit`);
      setAirports(cached.airports);
      lastBoundsKeyRef.current = cacheKey;
      return;
    }

    // Debounce the fetch
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const types: ("large_airport" | "medium_airport")[] = includeMediumRef.current
          ? ["large_airport", "medium_airport"]
          : ["large_airport"];

        const { data, error: fetchError } = await supabase.functions.invoke("airports-in-bounds", {
          body: {
            north: bounds.north,
            south: bounds.south,
            east: bounds.east,
            west: bounds.west,
            types,
            limit,
            zoom: zoomRef.current,
          },
        });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (data?.airports) {
          setAirports(data.airports);
          
          // Update cache
          boundsCache.set(cacheKey, {
            airports: data.airports,
            timestamp: Date.now(),
          });
          lastBoundsKeyRef.current = cacheKey;
          
          console.log(`[useAirportsInBounds] Loaded ${data.airports.length} airports at zoom ${zoomRef.current}`);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error(`[useAirportsInBounds] Error:`, err);
        setError(err instanceof Error ? err.message : "Failed to fetch airports");
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [enabled, debounceMs, limit]);

  return {
    airports,
    isLoading,
    error,
    fetchAirports,
  };
}
