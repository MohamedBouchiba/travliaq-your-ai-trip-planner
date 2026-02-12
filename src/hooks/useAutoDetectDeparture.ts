import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFlightMemoryStore, type AirportInfo } from '@/stores/hooks';
import { findNearestAirports } from '@/hooks/useNearestAirports';

import { STORAGE_KEYS } from "@/config/storageKeys";
const STORAGE_KEY = STORAGE_KEYS.AUTO_DEPARTURE;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedDeparture {
  airport: AirportInfo;
  timestamp: number;
}

/**
 * Automatically detects user's location and sets the nearest airport as departure.
 * Only runs once per session if departure is empty.
 * Caches result in localStorage for 24h to avoid repeated API calls.
 */
export function useAutoDetectDeparture() {
  const { memory, updateMemory } = useFlightMemoryStore();
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Only run once per component lifecycle
    if (hasRunRef.current) return;
    
    // Don't override if user already has a departure set
    if (memory.departure?.iata || memory.departure?.city) {
      console.log('[useAutoDetectDeparture] Departure already set, skipping auto-detection');
      return;
    }

    // Check cache first
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: CachedDeparture = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          console.log('[useAutoDetectDeparture] Using cached departure:', parsed.airport.city);
          updateMemory({ departure: parsed.airport });
          hasRunRef.current = true;
          return;
        }
      }
    } catch {
      // Ignore cache errors
    }

    // Mark as running to prevent duplicate calls
    hasRunRef.current = true;

    // Request geolocation
    if (!navigator.geolocation) {
      console.log('[useAutoDetectDeparture] Geolocation not supported');
      return;
    }

    console.log('[useAutoDetectDeparture] Requesting user location...');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[useAutoDetectDeparture] Got position:', latitude, longitude);

        try {
          // Step 1: Reverse geocode to get city name
          const { data: geoData, error: geoError } = await supabase.functions.invoke('reverse-geocode', {
            body: { lat: latitude, lon: longitude }
          });

          if (geoError || !geoData?.city) {
            console.warn('[useAutoDetectDeparture] Reverse geocode failed:', geoError);
            return;
          }

          console.log('[useAutoDetectDeparture] User city:', geoData.city, geoData.countryCode);

          // Step 2: Find nearest airports (use coords for reliability, city as fallback for display)
          const airportsResult = await findNearestAirports(
            geoData.city, 
            1, 
            geoData.countryCode,
            { lat: latitude, lon: longitude }
          );
          
          if (!airportsResult?.airports?.length) {
            console.warn('[useAutoDetectDeparture] No airports found near', geoData.city);
            return;
          }

          const nearestAirport = airportsResult.airports[0];
          console.log('[useAutoDetectDeparture] Nearest airport:', nearestAirport.iata, nearestAirport.name);

          // Build AirportInfo
          const airportInfo: AirportInfo = {
            airport: nearestAirport.name,
            iata: nearestAirport.iata,
            city: nearestAirport.city_name || geoData.city,
            country: geoData.country,
            countryCode: nearestAirport.country_code || geoData.countryCode,
            lat: nearestAirport.lat,
            lng: nearestAirport.lon,
          };

          // Update flight memory
          updateMemory({ departure: airportInfo });

          // Cache for 24h
          const cacheEntry: CachedDeparture = {
            airport: airportInfo,
            timestamp: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheEntry));

          console.log('[useAutoDetectDeparture] Auto-set departure to:', airportInfo.city, `(${airportInfo.iata})`);
        } catch (err) {
          console.error('[useAutoDetectDeparture] Error during auto-detection:', err);
        }
      },
      (error) => {
        console.log('[useAutoDetectDeparture] Geolocation denied or failed:', error.message);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // Accept cached position up to 5 minutes old
      }
    );
  }, [memory.departure, updateMemory]);
}
