import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getClientIp, cleanupRateLimits, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache TTL: 7 days in seconds
const CACHE_TTL = 60 * 60 * 24 * 7;

const MAX_REQUESTS_PER_HOUR = 20;

// Redis cache helpers using Upstash REST API
async function getFromCache(key: string): Promise<string | null> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  
  if (!redisUrl || !redisToken) {
    console.log("[destination-fact] Redis not configured, skipping cache");
    return null;
  }

  try {
    const response = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    
    if (!response.ok) {
      console.log(`[destination-fact] Cache miss or error for key: ${key}`);
      return null;
    }
    
    const data = await response.json();
    if (data.result) {
      console.log(`[destination-fact] Cache HIT for key: ${key}`);
      return data.result;
    }
    
    console.log(`[destination-fact] Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    console.error("[destination-fact] Redis GET error:", error);
    return null;
  }
}

async function setInCache(key: string, value: string): Promise<void> {
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  
  if (!redisUrl || !redisToken) {
    return;
  }

  try {
    const response = await fetch(
      `${redisUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${CACHE_TTL}`,
      { headers: { Authorization: `Bearer ${redisToken}` } }
    );
    
    if (response.ok) {
      console.log(`[destination-fact] Cached fact for key: ${key} (TTL: ${CACHE_TTL}s)`);
    }
  } catch (error) {
    console.error("[destination-fact] Redis SET error:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    
    if (!(await checkRateLimit(clientIp, MAX_REQUESTS_PER_HOUR, "destination-fact"))) {
      console.log(`[destination-fact] Rate limit exceeded for IP: ${clientIp}`);
      return rateLimitResponse(corsHeaders);
    }
    
    if (Math.random() < 0.01) {
      cleanupRateLimits();
    }

    const { city, country } = await req.json();
    
    if (!city) {
      return new Response(
        JSON.stringify({ error: "City is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize city name for cache key
    const normalizedCity = city.toLowerCase().trim().replace(/\s+/g, "_");
    const normalizedCountry = country ? country.toLowerCase().trim().replace(/\s+/g, "_") : "";
    const cacheKey = `dest_fact:${normalizedCity}${normalizedCountry ? `:${normalizedCountry}` : ""}`;

    // Check cache first
    const cachedFact = await getFromCache(cacheKey);
    if (cachedFact) {
      console.log(`[destination-fact] Returning cached fact for ${city}`);
      return new Response(
        JSON.stringify({ city, fact: cachedFact, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AZURE_OPENAI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
    const AZURE_OPENAI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const AZURE_OPENAI_API_VERSION = Deno.env.get("AZURE_OPENAI_API_VERSION") || "2025-01-01-preview";
    const AZURE_OPENAI_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT");

    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      console.error("Missing Azure OpenAI configuration");
      throw new Error("Azure OpenAI configuration is incomplete");
    }

    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    const prompt = `Tu es un expert en voyages. Donne un fait unique, intéressant et méconnu sur la ville de ${city}${country ? ` (${country})` : ""}. 

Règles:
- UNE seule phrase, courte et percutante (max 20 mots)
- Quelque chose d'étonnant ou d'atypique que la plupart des gens ne savent pas
- Pas de généralités touristiques ("belle ville", "riche histoire")
- Soit spécifique : une anecdote, un record, une tradition insolite, un fait géographique surprenant
- Pas d'emoji, pas de guillemets
- Si tu ne connais pas cette ville, invente un fait plausible et intéressant basé sur sa région

Exemples de bons faits:
- "Tokyo compte plus d'étoiles Michelin que Paris et New York réunies"
- "Reykjavik n'a aucune chaîne de fast-food McDonald's depuis 2009"
- "Venise est construite sur 118 petites îles reliées par 400 ponts"

Réponds UNIQUEMENT avec le fait, rien d'autre.`;

    console.log(`[destination-fact] Fetching fact from Azure OpenAI for city: ${city}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure OpenAI error:", response.status, errorText);
      throw new Error("Azure OpenAI error");
    }

    const data = await response.json();
    const fact = data.choices?.[0]?.message?.content?.trim() || null;

    console.log(`[destination-fact] New fact for ${city}: ${fact}`);

    // Cache the result for future requests
    if (fact) {
      await setInCache(cacheKey, fact);
    }

    return new Response(
      JSON.stringify({ city, fact, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[destination-fact] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", fact: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
