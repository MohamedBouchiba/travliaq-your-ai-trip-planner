import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LocationType = "city" | "airport" | "country";

export interface LocationResult {
  id: string;
  name: string;
  type: LocationType;
  country_code: string;
  country_name: string;
  iata?: string; // For airports
  lat: number;
  lng: number;
  display_name: string; // Formatted display name
}

interface ApiAutocompleteResult {
  id: string;
  name: string;
  type: LocationType;
  country_code: string;
  country_name: string;
  iata?: string;
  latitude: number;
  longitude: number;
}

/**
 * Hook for location autocomplete using the Travliaq API
 * Supports cities, airports, and countries
 */
export const useLocationAutocomplete = (
  searchTerm: string,
  enabled: boolean = true,
  types: LocationType[] = ["city", "airport", "country"]
) => {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const query = useQuery({
    queryKey: ["location-autocomplete", debouncedSearch, types.join(",")],
    queryFn: async (): Promise<LocationResult[]> => {
      // Require 3 characters minimum
      if (!debouncedSearch || debouncedSearch.length < 3) {
        return [];
      }

      const { data, error } = await supabase.functions.invoke<ApiAutocompleteResult[]>(
        "location-autocomplete",
        {
          body: {
            q: debouncedSearch,
            limit: 10,
            types,
          },
        }
      );

      if (error) {
        // If upstream is temporarily unavailable, avoid crashing the UI
        return [];
      }

      const apiData: ApiAutocompleteResult[] = data ?? [];

      // Transform API response to our format
      const results = apiData.map((item) => {
        let displayName = item.name;
        
        if (item.type === "airport" && item.iata) {
          displayName = `${item.name} (${item.iata})`;
        } else if (item.type === "city") {
          displayName = `${item.name}, ${item.country_name}`;
        } else if (item.type === "country") {
          displayName = item.name;
        }

        return {
          id: item.id,
          name: item.name,
          type: item.type,
          country_code: item.country_code,
          country_name: item.country_name,
          iata: item.iata,
          lat: item.latitude,
          lng: item.longitude,
          display_name: displayName,
        };
      });

      // Smart sorting: keep original order but ensure mix of types
      // Take up to 4 results, prioritizing cities but including at least 1 airport if available
      const cities = results.filter((r) => r.type === "city");
      const airports = results.filter((r) => r.type === "airport");
      const countries = results.filter((r) => r.type === "country");

      const sorted: LocationResult[] = [];
      
      // Add up to 3 cities first (maintaining original order)
      sorted.push(...cities.slice(0, 3));
      
      // Add at least 1 airport if available and we have room
      if (airports.length > 0 && sorted.length < 4) {
        sorted.push(airports[0]);
      }
      
      // Fill remaining slots with cities or airports (maintaining original order)
      const remaining = results.filter((r) => !sorted.includes(r));
      while (sorted.length < 4 && remaining.length > 0) {
        sorted.push(remaining.shift()!);
      }

      // If no airports were added but we have some, replace the last city with an airport
      if (airports.length > 0 && !sorted.some((r) => r.type === "airport") && sorted.length > 0) {
        sorted[sorted.length - 1] = airports[0];
      }

      // Add countries at the end if there's room
      if (countries.length > 0 && sorted.length < 4 && !sorted.some((r) => r.type === "country")) {
        sorted.push(countries[0]);
      }

      return sorted.slice(0, 4);
    },
    enabled: enabled && debouncedSearch.length >= 3, // 3 chars minimum
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  return query;
};

export default useLocationAutocomplete;
