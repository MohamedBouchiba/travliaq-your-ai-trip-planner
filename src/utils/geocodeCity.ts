/**
 * Geocode a city name to coordinates using the Mapbox Geocoding API.
 * Returns lat, lng, country, and countryCode if found.
 */

const MAPBOX_TOKEN = "pk.eyJ1IjoibW9oYW1lZGJvdWNoaWJhIiwiYSI6ImNtZ2t3dHZ0MzAyaDAya3NldXJ1dTkxdTAifQ.vYCeVngdG4_B0Zpms0dQNA";

export interface GeocodeCityResult {
  lat: number;
  lng: number;
  country?: string;
  countryCode?: string;
}

export async function geocodeCity(cityName: string): Promise<GeocodeCityResult | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}&types=place&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const [lng, lat] = feature.center;
    
    // Extract country info from context
    const countryContext = feature.context?.find((c: { id: string }) => c.id?.startsWith("country."));
    
    return {
      lat,
      lng,
      country: countryContext?.text,
      countryCode: countryContext?.short_code?.toUpperCase(),
    };
  } catch (e) {
    console.warn("[geocodeCity] Failed to geocode:", cityName, e);
    return null;
  }
}
