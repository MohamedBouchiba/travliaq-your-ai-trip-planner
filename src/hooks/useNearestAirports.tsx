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
  limit: number = 3
): Promise<NearestAirportsResponse | null> {
  try {
    const { data, error } = await supabase.functions.invoke("nearest-airports", {
      body: { city, limit },
    });

    if (error) {
      console.error("[useNearestAirports] Error:", error);
      return null;
    }

    return data as NearestAirportsResponse;
  } catch (err) {
    console.error("[useNearestAirports] Exception:", err);
    return null;
  }
}
