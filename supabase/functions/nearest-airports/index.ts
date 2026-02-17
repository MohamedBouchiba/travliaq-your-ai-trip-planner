import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, getClientIp, cleanupRateLimits, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_REQUESTS_PER_HOUR = 30; // Nearest airports - allows exploration

interface NearestAirportsRequest {
  city?: string;
  lat?: number;
  lon?: number;
  limit?: number;
  country_code?: string;
  preferred_region?: string; // "europe", "north-america", "asia", etc. — disambiguate homonyms
}

type CityRow = {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
};

type AirportRow = {
  iata: string;
  name: string;
  city_name: string | null;
  country_code: string | null;
  latitude: number;
  longitude: number;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeText(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0 = new Array(b.length + 1).fill(0);
  const v1 = new Array(b.length + 1).fill(0);

  for (let i = 0; i <= b.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j];
  }

  return v1[b.length];
}

function toMatchScore(queryNorm: string, candidateNorm: string): number {
  if (!queryNorm || !candidateNorm) return 0;
  if (queryNorm === candidateNorm) return 100;

  const dist = levenshtein(queryNorm, candidateNorm);
  const maxLen = Math.max(queryNorm.length, candidateNorm.length);
  const score = Math.round((1 - dist / maxLen) * 100);
  return Math.max(0, Math.min(99, score));
}

// Haversine distance in km
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeSearchBox(lat: number, lon: number) {
  // Rough, stable bounds: ~220km latitude and ~330km longitude around the city.
  // (Works well in Europe/US; close enough near equator too.)
  const latDelta = 2.0;
  const lonDelta = 3.0;

  return {
    south: lat - latDelta,
    north: lat + latDelta,
    west: lon - lonDelta,
    east: lon + lonDelta,
  };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    if (!(await checkRateLimit(clientIp, MAX_REQUESTS_PER_HOUR, "nearest-airports"))) {
      console.warn(`[nearest-airports] Rate limit exceeded for IP: ${clientIp}`);
      return rateLimitResponse(corsHeaders);
    }
    
    // Periodic cleanup (1% of requests)
    if (Math.random() < 0.01) {
      cleanupRateLimits();
    }
    const payload = (await req.json().catch(() => null)) as NearestAirportsRequest | null;

    const rawCity = payload?.city;
    const rawLat = payload?.lat;
    const rawLon = payload?.lon;
    const rawLimit = payload?.limit;
    const rawCountryCode = payload?.country_code;
    const preferredRegion = typeof payload?.preferred_region === "string" ? payload.preferred_region.toLowerCase() : undefined;

    // Either city or coordinates required
    const hasCity = rawCity && typeof rawCity === "string";
    const hasCoords = typeof rawLat === "number" && typeof rawLon === "number";

    if (!hasCity && !hasCoords) {
      return json(400, { error: "City name or coordinates (lat, lon) required" });
    }

    const cityQuery = hasCity ? rawCity.trim() : "";
    if (hasCity && (cityQuery.length < 2 || cityQuery.length > 80)) {
      return json(400, { error: "City name must be between 2 and 80 characters" });
    }

    const limit = clamp(typeof rawLimit === "number" ? rawLimit : 3, 1, 10);

    const countryCode =
      typeof rawCountryCode === "string" && /^[A-Za-z]{2}$/.test(rawCountryCode)
        ? rawCountryCode.toUpperCase()
        : undefined;

    const qNorm = hasCity ? normalizeText(cityQuery) : "";

    console.log(
      `[nearest-airports] query="${cityQuery || 'coords'}", lat=${rawLat}, lon=${rawLon}, country=${countryCode ?? "any"}, region=${preferredRegion ?? "any"}, limit=${limit}`
    );

    // Supabase (service role for reliable reads)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If coordinates provided directly, use them as center
    let centerLat: number | null = hasCoords ? rawLat! : null;
    let centerLon: number | null = hasCoords ? rawLon! : null;
    let matchedCity = cityQuery || "Coordinates";
    let matchedCityId = "";
    let matchScore = hasCoords ? 100 : 0;

    // Only do city lookup if we don't have direct coordinates
    if (!hasCoords && hasCity) {
      // 1) Find best-matching city in `cities` (robust + multilingual)
      const cityOrParts = cityQuery.split(",")[0]?.trim() || cityQuery;
      const cityOrPartsNorm = normalizeText(cityOrParts);

      let citiesQuery = supabase
        .from("cities")
        .select("id,name,slug,country_code,latitude,longitude")
        .or(`name.ilike.%${cityOrParts}%,slug.ilike.%${cityOrPartsNorm.replace(/\s/g, "-")}%`)
        .limit(200);

      if (countryCode) citiesQuery = citiesQuery.eq("country_code", countryCode);

      const { data: citiesData, error: citiesError } = await citiesQuery;

      if (citiesError) {
        console.warn("[nearest-airports] cities lookup failed:", citiesError.message);
      }

      const candidates = (citiesData ?? []) as CityRow[];

      // Region → country code sets for disambiguation (e.g., "Paris" → FR not CA)
      const REGION_COUNTRIES: Record<string, Set<string>> = {
        europe: new Set(["FR","DE","IT","ES","GB","NL","BE","AT","CH","PT","GR","CZ","HU","PL","SE","NO","DK","FI","IE","HR","RO","BG","SK","SI","LT","LV","EE","LU","MT","CY","IS","ME","AL","RS","BA","MK"]),
        "north-america": new Set(["US","CA","MX"]),
        asia: new Set(["JP","CN","KR","IN","TH","VN","ID","MY","PH","SG","KH","LA","MM","NP","LK","BD","PK","TW","HK","MO","MN"]),
        "middle-east": new Set(["AE","SA","QA","BH","KW","OM","JO","LB","IL","IR","IQ"]),
        africa: new Set(["MA","TN","DZ","EG","ZA","KE","NG","GH","SN","CI","CM","ET","TZ","UG","MG","MU","SC"]),
        "south-america": new Set(["BR","AR","CL","CO","PE","EC","UY","PY","BO","VE"]),
        oceania: new Set(["AU","NZ","FJ","PF"]),
      };
      const regionCountries = preferredRegion ? REGION_COUNTRIES[preferredRegion] : undefined;

      const ranked = candidates
        .map((c) => {
          const nameNorm = normalizeText(c.name);
          const slugNorm = normalizeText((c.slug ?? "").replace(/-/g, " "));

          const scoreName = toMatchScore(cityOrPartsNorm, nameNorm);
          const scoreSlug = toMatchScore(cityOrPartsNorm, slugNorm);

          // Prefer rows with coordinates.
          const hasCityCoords = c.latitude != null && c.longitude != null;
          const coordsBoost = hasCityCoords ? 3 : 0;

          // Prefer same country if provided.
          const countryBoost = countryCode && c.country_code === countryCode ? 5 : 0;

          // Prefer region match for disambiguation (Paris FR > Paris CA when region=europe)
          const regionBoost = regionCountries && c.country_code && regionCountries.has(c.country_code) ? 10 : 0;

          // Best score across name/slug.
          const score = Math.max(scoreName, scoreSlug) + coordsBoost + countryBoost + regionBoost;

          return {
            city: c,
            score,
            scoreRaw: Math.max(scoreName, scoreSlug),
          };
        })
        .sort((a, b) => b.score - a.score);

      const bestCity = ranked[0]?.city;

      // 2) Determine city center (prefer `cities` coords; else infer from airports table)
      centerLat = bestCity?.latitude ?? null;
      centerLon = bestCity?.longitude ?? null;
      matchedCity = bestCity?.name ?? cityOrParts;
      matchedCityId = bestCity?.id ?? "";
      matchScore = ranked[0]?.scoreRaw ?? 0;

      if (centerLat == null || centerLon == null) {
        // Infer center from airports matching city name (handles rows like Bruxelles without coords)
        let airportsForCityQ = supabase
          .from("airports")
          .select("iata,name,city_name,country_code,latitude,longitude")
          .eq("scheduled_service", "yes")
          .ilike("city_name", `%${cityOrParts}%`)
          .limit(250);

        if (countryCode) airportsForCityQ = airportsForCityQ.eq("country_code", countryCode);

        const { data: airportsForCity, error: airportsForCityErr } = await airportsForCityQ;
        if (airportsForCityErr) {
          console.warn("[nearest-airports] airports city lookup failed:", airportsForCityErr.message);
        }

        const cityAirports = (airportsForCity ?? []) as AirportRow[];
        if (cityAirports.length > 0) {
          const avgLat = cityAirports.reduce((s, a) => s + a.latitude, 0) / cityAirports.length;
          const avgLon = cityAirports.reduce((s, a) => s + a.longitude, 0) / cityAirports.length;
          centerLat = avgLat;
          centerLon = avgLon;

          if (!bestCity) {
            matchedCity = cityAirports[0]?.city_name ?? cityOrParts;
            matchScore = 100;
          }
        }
      }
    }

    if (centerLat == null || centerLon == null) {
      return json(404, {
        error: "City not found",
        detail: {
          message: `No city match found for '${cityQuery}'. Please check spelling or try a different city name.`,
        },
      });
    }

    // 3) Fetch airports in a bounding box around the center, then compute precise distance
    const box = computeSearchBox(centerLat, centerLon);

    let airportsQ = supabase
      .from("airports")
      .select("iata,name,city_name,country_code,latitude,longitude")
      .eq("scheduled_service", "yes")
      .gte("latitude", box.south)
      .lte("latitude", box.north);

    // Handle date line crossing
    if (box.east >= box.west) {
      airportsQ = airportsQ.gte("longitude", box.west).lte("longitude", box.east);
    }

    // When a country is provided, restrict to that country to avoid weird cross-continent matches.
    if (countryCode) airportsQ = airportsQ.eq("country_code", countryCode);

    // Get enough candidates, sort in code.
    const { data: airportsData, error: airportsError } = await airportsQ.limit(700);

    if (airportsError) {
      console.error("[nearest-airports] airports query failed:", airportsError.message);
      return json(500, { error: "Internal error while searching airports" });
    }

    const airports = (airportsData ?? []) as AirportRow[];

    const enriched = airports
      .map((a) => {
        const d = distanceKm(centerLat!, centerLon!, a.latitude, a.longitude);
        return {
          iata: a.iata,
          name: a.name,
          city_name: a.city_name ?? "",
          country_code: a.country_code ?? "",
          lat: a.latitude,
          lon: a.longitude,
          distance_km: Math.round(d * 10) / 10,
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit);

    return json(200, {
      city_query: cityQuery,
      matched_city: matchedCity,
      matched_city_id: matchedCityId,
      match_score: matchScore,
      city_location: { lat: centerLat, lon: centerLon },
      airports: enriched,
    });
  } catch (error) {
    console.error("[nearest-airports] Error:", error);
    return json(500, { error: "Internal server error" });
  }
});
