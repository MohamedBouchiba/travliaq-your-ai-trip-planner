import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: string;
  content: string;
}

interface TitleRequest {
  messages: ChatMessage[];
}

interface TitleResponse {
  title: string;
  emoji: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json() as TitleRequest;

    if (!messages || messages.length < 3) {
      return new Response(
        JSON.stringify({ error: "Not enough messages for title generation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Take last 6 messages max for context
    const contextMessages = messages.slice(-6);
    
    // Build conversation summary for the LLM
    const conversationSummary = contextMessages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 150)}`)
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback to simple title generation
      const firstUserMessage = messages.find(m => m.role === "user");
      const text = firstUserMessage?.content?.slice(0, 35) || "Nouvelle conversation";
      return new Response(
        JSON.stringify({ title: text, emoji: "✈️" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu es un expert en création de titres concis pour des conversations de planification de voyage.

Ta tâche : Génère UN titre court et accrocheur qui résume l'intention principale de cette conversation.

RÈGLES STRICTES :
1. Maximum 35 caractères (sans l'emoji)
2. Commence par un emoji pertinent
3. Le titre doit capturer : la destination OU le type de voyage OU l'occasion
4. Si pas de destination claire, utilise le thème principal
5. Utilise le français
6. Sois créatif mais précis

EXEMPLES DE BONS TITRES :
- "🏝️ Escapade tropicale février"
- "👨‍👩‍👧 Vacances famille Japon"
- "💑 Lune de miel surprise"
- "🎿 Weekend ski Alpes"
- "🌴 Road trip Thaïlande"
- "🏖️ Séjour plage budget"
- "🗼 City break Paris"
- "🌍 Tour Europe été"

RÉPONDS UNIQUEMENT en JSON avec ce format exact :
{"title": "le titre sans emoji", "emoji": "l'emoji"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Voici la conversation à résumer :\n\n${conversationSummary}\n\nGénère le titre JSON :` }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error("Lovable AI error:", response.status);
      // Fallback
      const firstUserMessage = messages.find(m => m.role === "user");
      const text = firstUserMessage?.content?.slice(0, 35) || "Nouvelle conversation";
      return new Response(
        JSON.stringify({ title: text, emoji: "✈️" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    let titleData: TitleResponse = { title: "Nouvelle conversation", emoji: "✈️" };
    try {
      // Extract JSON from content (might have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        titleData = {
          title: parsed.title?.slice(0, 35) || "Nouvelle conversation",
          emoji: parsed.emoji || "✈️",
        };
      }
    } catch (parseError) {
      console.error("Failed to parse title JSON:", parseError);
      // Use first user message as fallback
      const firstUserMessage = messages.find(m => m.role === "user");
      titleData.title = firstUserMessage?.content?.slice(0, 35) || "Nouvelle conversation";
    }

    return new Response(
      JSON.stringify(titleData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating title:", error);
    return new Response(
      JSON.stringify({ title: "Nouvelle conversation", emoji: "✈️" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
