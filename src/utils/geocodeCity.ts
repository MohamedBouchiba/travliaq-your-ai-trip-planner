/**
 * Geocode a city name using the cities table in Supabase.
 */

import { supabase } from "@/integrations/supabase/client";

export interface GeocodeCityResult {
  lat: number;
  lng: number;
  country?: string;
  countryCode?: string;
}

export async function geocodeCity(cityName: string): Promise<GeocodeCityResult | null> {
  try {
    const { data, error } = await supabase
      .from("cities")
      .select("latitude, longitude, country, country_code")
      .ilike("name", cityName)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("population", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn("[geocodeCity] City not found in DB:", cityName, error?.message);
      return null;
    }

    return {
      lat: data.latitude!,
      lng: data.longitude!,
      country: data.country,
      countryCode: data.country_code,
    };
  } catch (e) {
    console.warn("[geocodeCity] Failed:", cityName, e);
    return null;
  }
}
