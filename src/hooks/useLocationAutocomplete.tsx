import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

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

const API_BASE_URL = "https://travliaq-api-production.up.railway.app";

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
      if (!debouncedSearch || debouncedSearch.length < 2) {
        return [];
      }

      const typesParam = types.join(",");
      const url = `${API_BASE_URL}/autocomplete?q=${encodeURIComponent(debouncedSearch)}&limit=10&types=${typesParam}`;

      const response = await fetch(url, {
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch autocomplete results");
      }

      const data: ApiAutocompleteResult[] = await response.json();

      // Transform API response to our format
      return data.map((item) => {
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
    },
    enabled: enabled && debouncedSearch.length >= 2,
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  return query;
};

export default useLocationAutocomplete;
