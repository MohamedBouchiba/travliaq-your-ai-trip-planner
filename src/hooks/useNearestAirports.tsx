import { supabase } from "@/integrations/supabase/client";

export interface Airport {
  iata: string;
  name: string;
  city_name: string;
  country_code: string;
  lat: number;
  lon: number;
  distance_km: number;
}

export interface NearestAirportsResponse {
  city_query: string;
  matched_city: string;
  matched_city_id: string;
  match_score: number;
  city_location: {
    lat: number;
    lon: number;
  };
  airports: Airport[];
}

export async function findNearestAirports(
  city: string,
  limit: number = 3,
  countryCode?: string
): Promise<NearestAirportsResponse | null> {
  try {
    const body: { city: string; limit: number; country_code?: string } = { city, limit };
    
    if (countryCode) {
      body.country_code = countryCode;
    }

    const { data, error } = await supabase.functions.invoke("nearest-airports", {
      body,
    });

    if (error) {
      console.error("[useNearestAirports] Error:", error);
      return null;
    }

    // Log if fuzzy match was applied
    if (data?.match_score && data.match_score < 100) {
      console.log(`[useNearestAirports] City corrected: "${data.city_query}" → "${data.matched_city}" (score: ${data.match_score})`);
    }

    return data as NearestAirportsResponse;
  } catch (err) {
    console.error("[useNearestAirports] Exception:", err);
    return null;
  }
}
