/**
 * fetchTopCities - Shared utility for fetching top cities by country
 *
 * Used by both useChatImperativeHandlers and useChatDestinationFlow.
 */

import { supabaseFetch } from "@/utils/supabaseFetch";
import type { CityChoice } from "@/types/flight";

interface RawCity {
  name: string;
  description?: string;
  population?: number;
}

/**
 * Fetch top cities for a country code.
 * @param countryCode ISO country code (e.g. "FR", "JP")
 * @param fallbackDescription Fallback description when the API returns none
 * @param limit Max number of cities to fetch (default 5)
 */
export async function fetchTopCities(
  countryCode: string,
  fallbackDescription: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<CityChoice[] | null> {
  try {
    const response = await supabaseFetch("top-cities-by-country", {
      method: "GET",
      authOptional: true,
      params: { country_code: countryCode, limit: String(limit) },
      signal,
    });

    const data = await response.json();

    if (data.cities && data.cities.length > 0) {
      return data.cities.map((c: RawCity) => ({
        name: c.name,
        description: c.description || fallbackDescription,
        population: c.population,
      }));
    }

    return null;
  } catch (error) {
    console.error("Error fetching cities:", error);
    return null;
  }
}
