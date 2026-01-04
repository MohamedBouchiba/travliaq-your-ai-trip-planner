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
function getMinDistance(zoom: number): number {
  if (zoom < 3) return 6;    // Very zoomed out - 6 degrees apart
  if (zoom < 4) return 4;    // 4 degrees
  if (zoom < 5) return 2;    // 2 degrees
  if (zoom < 6) return 1;    // 1 degree
  if (zoom < 7) return 0.5;  // 0.5 degree
  return 0.25;               // Very zoomed in
}

// Get dynamic limit based on zoom - increased for better coverage
function getDynamicLimit(zoom: number): number {
  if (zoom < 3) return 20;   // Continental view - more major hubs
  if (zoom < 4) return 35;
  if (zoom < 5) return 60;
  if (zoom < 6) return 80;
  return 120;
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
    // - zoom < 5: only large airports
    // - zoom 5-7: large + medium airports
    // - zoom >= 8: large + medium + small airports (only at high zoom)
    let effectiveTypes: string[];
    if (zoom < 5) {
      effectiveTypes = ["large_airport"];
    } else if (zoom < 8) {
      // Only include medium if requested, but never small at this zoom
      effectiveTypes = types.filter(t => t !== "small_airport");
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

    // Transform to clean format, deduplicate by city, and filter by spacing
    const cityMap = new Map<string, AirportResult>();
    const placedAirports: { lat: number; lng: number }[] = [];

    // Check if a new airport is too close to already placed ones
    const isTooClose = (lat: number, lng: number): boolean => {
      for (const placed of placedAirports) {
        const dLat = Math.abs(lat - placed.lat);
        const dLng = Math.abs(lng - placed.lng);
        // Use combined distance check
        if (dLat < minDistance && dLng < minDistance * 1.5) {
          return true;
        }
      }
      return false;
    };

    for (const row of data || []) {
      const normalizedCity = normalizeCityName(row.city_name) || row.name;
      const cityKey = normalizedCity.toLowerCase();

      // Skip if this is the user's departure city (exclude their origin)
      if (excludeCityLower && cityKey === excludeCityLower) continue;

      // Skip if city already added
      if (cityMap.has(cityKey)) continue;
      
      // Skip if too close to another airport
      if (isTooClose(row.latitude, row.longitude)) continue;

      // Stop if we have enough airports
      if (cityMap.size >= dynamicLimit) break;

      cityMap.set(cityKey, {
        iata: row.iata,
        name: row.name,
        cityName: normalizedCity,
        countryCode: row.country_code,
        countryName: row.country_name,
        lat: row.latitude,
        lng: row.longitude,
        type: row.airport_type === "large_airport" ? "large" : "medium",
        price: generateFakePrice(row.city_name, row.iata),
      });

      placedAirports.push({ lat: row.latitude, lng: row.longitude });
    }

    const airports: AirportResult[] = Array.from(cityMap.values());

    console.log(`[airports-in-bounds] Found ${airports.length} airports (filtered from ${data?.length || 0})`);

    return new Response(
      JSON.stringify({
        airports,
        total: airports.length,
        hasMore: airports.length >= dynamicLimit,
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
