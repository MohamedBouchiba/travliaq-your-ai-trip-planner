/**
 * ip-geolocation
 *
 * Server-side IP geolocation proxy.
 * The browser cannot call the upstream provider directly (CORS + per-client
 * rate limiting), so this function resolves the caller's IP and caches the
 * result in memory to limit upstream usage.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_URL = Deno.env.get("IP_GEO_PROVIDER_URL") ?? "https://ipapi.co";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

interface GeoResult {
  ip?: string;
  city?: string;
  region?: string;
  country_code?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  currency?: string;
}

const cache = new Map<string, { data: GeoResult; ts: number }>();

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getClientIp(req);
    const cacheKey = ip ?? "unknown";

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = ip ? `${PROVIDER_URL}/${ip}/json/` : `${PROVIDER_URL}/json/`;
    const upstream = await fetch(url, {
      headers: { "User-Agent": "travliaq-ip-geolocation" },
      signal: AbortSignal.timeout(6000),
    });

    if (!upstream.ok) {
      const body = await upstream.text();
      console.error(`[ip-geolocation] upstream ${upstream.status}: ${body}`);
      return new Response(
        JSON.stringify({
          error: "Geolocation provider request failed",
          status: upstream.status,
        }),
        {
          status: upstream.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = (await upstream.json()) as GeoResult & { error?: boolean; reason?: string };

    if ((data as { error?: boolean }).error) {
      console.error(`[ip-geolocation] provider error: ${data.reason}`);
      return new Response(
        JSON.stringify({ error: "Geolocation unavailable", reason: data.reason }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const result: GeoResult = {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country_code: data.country_code,
      country_name: data.country_name,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      currency: data.currency,
    };

    cache.set(cacheKey, { data: result, ts: Date.now() });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ip-geolocation] unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error resolving location" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
