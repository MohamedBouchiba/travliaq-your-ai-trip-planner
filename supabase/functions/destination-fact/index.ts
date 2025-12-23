import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country } = await req.json();
    
    if (!city) {
      return new Response(
        JSON.stringify({ error: "City is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    console.log(`Fetching fact for city: ${city}`);

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

    console.log(`Destination fact for ${city}: ${fact}`);

    return new Response(
      JSON.stringify({ city, fact }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("destination-fact error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", fact: null }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});