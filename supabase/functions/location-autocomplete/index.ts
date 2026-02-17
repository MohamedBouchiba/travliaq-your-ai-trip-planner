import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { checkRateLimit, getClientIp, cleanupRateLimits, rateLimitResponse } from "../_shared/rateLimit.ts";

const API_BASE_URL = "https://travliaq-api-production.up.railway.app";
const MAX_REQUESTS_PER_HOUR = 60; // Autocomplete - high for UX, typing triggers many calls

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const allowed = await checkRateLimit(clientIp, MAX_REQUESTS_PER_HOUR, "location-autocomplete");
    if (!allowed) {
      console.warn(`[location-autocomplete] Rate limit exceeded for IP: ${clientIp}`);
      return rateLimitResponse(corsHeaders);
    }
    
    // Periodic cleanup (1% of requests)
    if (Math.random() < 0.01) {
      await cleanupRateLimits();
    }
    let q = "";
    let limit = "10";
    let types: string | string[] = "city,airport,country";

    if (req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as {
        q?: string;
        limit?: number | string;
        types?: string[] | string;
      };
      q = body.q ?? "";
      limit = String(body.limit ?? "10");
      types = body.types ?? "city,airport,country";
    } else {
      const url = new URL(req.url);
      q = url.searchParams.get("q") || "";
      limit = url.searchParams.get("limit") || "10";
      types = url.searchParams.get("types") || "city,airport,country";
    }

    const typesParam = Array.isArray(types) ? types.join(",") : types;

    if (!q || q.length < 3) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `${API_BASE_URL}/autocomplete?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}&types=${encodeURIComponent(typesParam)}`;
    
    console.log("Fetching autocomplete:", apiUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        headers: {
          accept: "application/json",
          "user-agent": "travliaq-edge-proxy/1.0",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("Autocomplete upstream error", { status: response.status, q });
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("Autocomplete raw response:", JSON.stringify(data).slice(0, 500));
    
    // API returns { q, results: [...] } - extract results array
    const results = data.results ?? data ?? [];
    
    // Transform to our expected format
    const transformed = results.map((item: {
      type: string;
      id: string;
      label: string;
      country_code: string;
      slug?: string;
      lat: number;
      lon: number;
    }) => {
      // Extract country name from label (e.g., "Paris, FR" -> "FR")
      const labelParts = item.label?.split(", ") || [];
      const countryFromLabel = labelParts.length > 1 ? labelParts[labelParts.length - 1] : item.country_code;
      
      // Extract IATA code from airport label (e.g., "Paris Charles de Gaulle (CDG)" -> "CDG")
      let iata: string | undefined;
      if (item.type === "airport") {
        const match = item.label?.match(/\(([A-Z]{3})\)$/);
        iata = match ? match[1] : item.id;
      }
      
      // Extract city/location name from label
      const name = item.type === "airport" 
        ? item.label?.replace(/\s*\([A-Z]{3}\)$/, "") || item.label
        : labelParts[0] || item.label;

      return {
        id: item.id,
        name: name,
        type: item.type,
        country_code: item.country_code,
        country_name: countryFromLabel,
        iata: iata,
        latitude: item.lat,
        longitude: item.lon,
        label: item.label,
      };
    });

    console.log("Returning", transformed.length, "results");

    return new Response(JSON.stringify(transformed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
