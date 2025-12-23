import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAILWAY_API_URL = "https://travliaq-production.up.railway.app";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, limit = 3 } = await req.json();

    if (!city || typeof city !== "string" || city.length < 2) {
      return new Response(
        JSON.stringify({ error: "City name required (min 2 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[nearest-airports] Searching airports near: "${city}", limit: ${limit}`);

    const response = await fetch(`${RAILWAY_API_URL}/nearest-airports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, limit: Math.min(limit, 10) }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error(`[nearest-airports] Upstream error: ${status} - ${errorText}`);

      if (status === 404) {
        return new Response(
          JSON.stringify({ error: "City not found", detail: errorText }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Upstream API error", status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`[nearest-airports] Found ${data.airports?.length || 0} airports for "${city}"`);

    // Return the data as-is from the API
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[nearest-airports] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
