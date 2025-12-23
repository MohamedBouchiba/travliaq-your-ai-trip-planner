import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_BASE_URL = "https://travliaq-api-production.up.railway.app";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const limit = url.searchParams.get("limit") || "10";
    const types = url.searchParams.get("types") || "city,airport,country";

    if (!q || q.length < 3) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `${API_BASE_URL}/autocomplete?q=${encodeURIComponent(q)}&limit=${limit}&types=${types}`;
    
    const response = await fetch(apiUrl, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
