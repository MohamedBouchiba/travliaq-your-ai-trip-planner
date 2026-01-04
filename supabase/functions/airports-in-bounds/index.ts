import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BoundsRequest {
  north: number;
  south: number;
  east: number;
  west: number;
  types?: ("large_airport" | "medium_airport" | "small_airport")[];
  limit?: number;
  zoom?: number;
  excludeCity?: string; // City name to exclude (user's departure city)
}

interface AirportResult {
  hubId: string;          // Stable identifier for the city hub (used as marker key)
  iata: string;           // Primary airport IATA (cheapest one)
  name: string;           // Primary airport name
  cityName: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number;            // City center (stable when possible)
  lng: number;
  type: "large" | "medium";
  price: number;          // Cheapest price among all airports in city
  airportCount: number;   // Number of airports in this city
  allIatas: string[];     // All airport IATA codes in this city (for API calls)
}

// Normalize city name: First letter uppercase, rest lowercase
function normalizeCityName(name: string | null): string | null {
  if (!name) return null;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// Generate a fake price based on city name (deterministic)
function generateFakePrice(cityName: string | null, iata: string): number {
  const str = cityName || iata;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  // Price between 29€ and 399€
  return 29 + Math.abs(hash % 370);
}

// Calculate minimum distance between airports based on zoom level
// Reduced distances to allow more airports in dense regions (UK, Europe)
function getMinDistance(zoom: number): number {
  if (zoom < 3) return 5;    // Very zoomed out - 5 degrees apart
  if (zoom < 4) return 3;    // 3 degrees
  if (zoom < 5) return 1.5;  // 1.5 degrees - allows Newcastle + Manchester
  if (zoom < 6) return 0.8;  // 0.8 degree
  if (zoom < 7) return 0.4;  // 0.4 degree
  return 0.2;                // Very zoomed in
}

// Get dynamic limit based on zoom - increased for better coverage
function getDynamicLimit(zoom: number): number {
  if (zoom < 3) return 25;   // Continental view - more major hubs
  if (zoom < 4) return 45;
  if (zoom < 5) return 80;
  if (zoom < 6) return 100;
  return 150;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { north, south, east, west, types = ["large_airport"], limit = 100, zoom = 5, excludeCity } = await req.json() as BoundsRequest;

    // Validate bounds
    if (north === undefined || south === undefined || east === undefined || west === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing bounds parameters (north, south, east, west)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate dynamic limits based on zoom
    const dynamicLimit = getDynamicLimit(zoom);
    const minDistance = getMinDistance(zoom);

    // Determine which airport types to show based on zoom level:
    // - zoom < 6: only large airports (world/continent view)
    // - zoom 6-7: large + medium airports (regional view)
    // - zoom >= 8: large + medium + small airports (city view)
    let effectiveTypes: string[];
    if (zoom < 6) {
      effectiveTypes = ["large_airport"];
    } else if (zoom < 8) {
      // Regional view: include medium airports
      effectiveTypes = types.filter((t) => t !== "small_airport");
      if (!effectiveTypes.includes("medium_airport")) effectiveTypes.push("medium_airport");
    } else {
      // High zoom - can show small airports if requested
      effectiveTypes = types;
    }

    // Normalize the excluded city name for comparison
    const excludeCityLower = excludeCity?.toLowerCase().trim();

    console.log(`[airports-in-bounds] zoom=${zoom}, limit=${dynamicLimit}, minDist=${minDistance}, types=${effectiveTypes.join(",")}, excludeCity=${excludeCityLower || "none"}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query airports within bounds - fetch more than we need, then filter
    let query = supabase
      .from("airports")
      .select("iata, name, city_name, country_code, country_name, latitude, longitude, airport_type")
      .eq("scheduled_service", "yes")
      .in("airport_type", effectiveTypes)
      .gte("latitude", south)
      .lte("latitude", north);

    // Handle international date line crossing (east < west means crossing)
    if (east >= west) {
      query = query.gte("longitude", west).lte("longitude", east);
    } else {
      console.log(`[airports-in-bounds] Date line crossing detected`);
    }

    // Order by airport type (large first) then by city name
    query = query.order("airport_type").order("city_name").limit(dynamicLimit * 3);

    const { data, error } = await query;

    if (error) {
      console.error(`[airports-in-bounds] Supabase error:`, error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group airports by city - collect all airports for each city
    interface CityData {
      airports: Array<{
        iata: string;
        name: string;
        lat: number;
        lng: number;
        type: string;
        price: number;
        countryCode: string | null;
        countryName: string | null;
      }>;
      cityName: string;
    }
    
    const cityGroups = new Map<string, CityData>();

    for (const row of data || []) {
      const normalizedCity = normalizeCityName(row.city_name) || row.name;
      const cityKey = normalizedCity.toLowerCase();

      // Skip if this is the user's departure city (exclude their origin)
      if (excludeCityLower && cityKey === excludeCityLower) continue;

      const price = generateFakePrice(row.city_name, row.iata);
      
      if (!cityGroups.has(cityKey)) {
        cityGroups.set(cityKey, {
          airports: [],
          cityName: normalizedCity,
        });
      }
      
      cityGroups.get(cityKey)!.airports.push({
        iata: row.iata,
        name: row.name,
        lat: row.latitude,
        lng: row.longitude,
        type: row.airport_type,
        price,
        countryCode: row.country_code,
        countryName: row.country_name,
      });
    }

    // Now create one result per city with:
    // - Center coordinates (average of all airports)
    // - Cheapest price
    // Now create one result per city with:
    // - Center coordinates (prefer stable city coordinates from `cities` table)
    // - Cheapest price
    // - All IATA codes for future API calls

    // Best-effort lookup of stable city coordinates (prevents pins from shifting when bounds change)
    const uniqueCityNames = Array.from(
      new Set(
        Array.from(cityGroups.values())
          .map((c) => c.airports[0]?.countryCode ? `${c.cityName}|||${c.airports[0].countryCode}` : null)
          .filter((v): v is string => Boolean(v))
      )
    );

    const cityCenterMap = new Map<string, { lat: number; lng: number }>();
    if (uniqueCityNames.length > 0) {
      const names = uniqueCityNames.map((v) => v.split("|||")[0]);
      const countryCodes = uniqueCityNames.map((v) => v.split("|||")[1]);

      const { data: citiesData, error: citiesError } = await supabase
        .from("cities")
        .select("name, country_code, latitude, longitude")
        .in("name", names)
        .in("country_code", countryCodes)
        .limit(1000);

      if (citiesError) {
        console.warn(`[airports-in-bounds] cities lookup failed: ${citiesError.message}`);
      } else {
        for (const c of citiesData || []) {
          if (c.latitude == null || c.longitude == null) continue;
          const key = `${c.name.toLowerCase()}|||${(c.country_code || "").toLowerCase()}`;
          cityCenterMap.set(key, { lat: c.latitude, lng: c.longitude });
        }
      }
    }

    const cityResults: AirportResult[] = [];
    const placedCities: { lat: number; lng: number }[] = [];

    const isTooClose = (lat: number, lng: number): boolean => {
      for (const placed of placedCities) {
        const dLat = Math.abs(lat - placed.lat);
        const dLng = Math.abs(lng - placed.lng);
        if (dLat < minDistance && dLng < minDistance * 1.5) {
          return true;
        }
      }
      return false;
    };

    // Sort cities by having large airports first, then by number of airports
    const sortedCities = Array.from(cityGroups.entries()).sort((a, b) => {
      const aHasLarge = a[1].airports.some(ap => ap.type === "large_airport");
      const bHasLarge = b[1].airports.some(ap => ap.type === "large_airport");
      if (aHasLarge && !bHasLarge) return -1;
      if (!aHasLarge && bHasLarge) return 1;
      return b[1].airports.length - a[1].airports.length;
    });

    // Helper: haversine distance in km
    const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(bLat - aLat);
      const dLng = toRad(bLng - aLng);
      const lat1 = toRad(aLat);
      const lat2 = toRad(bLat);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };

    for (const [, cityData] of sortedCities) {
      if (cityResults.length >= dynamicLimit) break;

      let { airports: cityAirports, cityName } = cityData;

      // Filter out airports that are too far from the main cluster (>80km from median).
      // This prevents Paris-Vatry (150km east) from pulling the Paris hub marker off-center.
      if (cityAirports.length > 1) {
        // Use median as reference point (more robust than mean for outliers)
        const sortedByLat = [...cityAirports].sort((a, b) => a.lat - b.lat);
        const sortedByLng = [...cityAirports].sort((a, b) => a.lng - b.lng);
        const midIdx = Math.floor(cityAirports.length / 2);
        const medianLat = sortedByLat[midIdx].lat;
        const medianLng = sortedByLng[midIdx].lng;

        const MAX_DISTANCE_KM = 80;
        const closeAirports = cityAirports.filter(
          (a) => distanceKm(a.lat, a.lng, medianLat, medianLng) <= MAX_DISTANCE_KM
        );

        // Only filter if we still have at least one airport left
        if (closeAirports.length > 0) {
          cityAirports = closeAirports;
        }
      }

      // Stable hub id (prevents marker key from changing when cheapest airport changes)
      const hubId = `${(cityAirports[0]?.countryCode || "xx").toLowerCase()}:${cityName.toLowerCase()}`;

      // Choose a stable city center if possible
      const stableKey = `${cityName.toLowerCase()}|||${(cityAirports[0]?.countryCode || "").toLowerCase()}`;
      const stableCenter = cityCenterMap.get(stableKey);

      const avgLat = cityAirports.reduce((sum, a) => sum + a.lat, 0) / cityAirports.length;
      const avgLng = cityAirports.reduce((sum, a) => sum + a.lng, 0) / cityAirports.length;

      // Some city names are ambiguous (e.g., "Newcastle" GB can be NI vs upon Tyne).
      // Only trust the `cities` table center if it's close to the airports' average.
      const shouldUseStable =
        stableCenter && distanceKm(avgLat, avgLng, stableCenter.lat, stableCenter.lng) <= 120;

      const centerLat = shouldUseStable ? stableCenter!.lat : avgLat;
      const centerLng = shouldUseStable ? stableCenter!.lng : avgLng;

      // Skip if too close to another city
      if (isTooClose(centerLat, centerLng)) continue;

      // Find cheapest airport
      const cheapest = cityAirports.reduce((min, a) => (a.price < min.price ? a : min), cityAirports[0]);

      // Check if any airport is large
      const hasLargeAirport = cityAirports.some((a) => a.type === "large_airport");

      cityResults.push({
        hubId,
        iata: cheapest.iata, // Primary IATA is the cheapest one
        name: cheapest.name,
        cityName,
        countryCode: cheapest.countryCode,
        countryName: cheapest.countryName,
        lat: centerLat,
        lng: centerLng,
        type: hasLargeAirport ? "large" : "medium",
        price: cheapest.price,
        airportCount: cityAirports.length,
        allIatas: cityAirports.map((a) => a.iata),
      });

      placedCities.push({ lat: centerLat, lng: centerLng });
    }

    console.log(`[airports-in-bounds] Found ${cityResults.length} cities (from ${data?.length || 0} airports)`);

    return new Response(
      JSON.stringify({
        airports: cityResults,
        total: cityResults.length,
        hasMore: cityResults.length >= dynamicLimit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`[airports-in-bounds] Error:`, err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
