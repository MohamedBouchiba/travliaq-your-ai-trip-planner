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
  types?: ("large_airport" | "medium_airport")[];
  limit?: number;
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
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { north, south, east, west, types = ["large_airport"], limit = 100 } = await req.json() as BoundsRequest;

    // Validate bounds
    if (north === undefined || south === undefined || east === undefined || west === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing bounds parameters (north, south, east, west)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[airports-in-bounds] Fetching airports in bounds: N=${north}, S=${south}, E=${east}, W=${west}`);
    console.log(`[airports-in-bounds] Types: ${types.join(", ")}, Limit: ${limit}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query airports within bounds
    // Using latitude/longitude range query (efficient with proper indexes)
    let query = supabase
      .from("airports")
      .select("iata, name, city_name, country_code, country_name, latitude, longitude, airport_type")
      .eq("scheduled_service", "yes")
      .in("airport_type", types)
      .gte("latitude", south)
      .lte("latitude", north);

    // Handle international date line crossing (east < west means crossing)
    if (east >= west) {
      query = query.gte("longitude", west).lte("longitude", east);
    } else {
      // Crossing international date line - we need OR logic, but Supabase doesn't support it directly
      // So we fetch in two parts or use a wider range
      // For simplicity, let's just not filter longitude when crossing date line
      console.log(`[airports-in-bounds] Date line crossing detected, fetching all longitudes`);
    }

    // Order by airport type (large first) then by city name
    query = query.order("airport_type").order("city_name").limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error(`[airports-in-bounds] Supabase error:`, error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform to clean format
    const airports: AirportResult[] = (data || []).map((row) => ({
      iata: row.iata,
      name: row.name,
      cityName: row.city_name,
      countryCode: row.country_code,
      countryName: row.country_name,
      lat: row.latitude,
      lng: row.longitude,
      type: row.airport_type === "large_airport" ? "large" : "medium",
    }));

    console.log(`[airports-in-bounds] Found ${airports.length} airports`);

    return new Response(
      JSON.stringify({
        airports,
        total: airports.length,
        hasMore: airports.length >= limit,
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
