import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definition for extracting flight intent from user message
const flightExtractionTool = {
  type: "function",
  function: {
    name: "update_flight_widget",
    description: "Extract flight search parameters from user message. CRITICAL: Never guess passenger counts - if user implies multiple travelers without explicit numbers, set needsTravelersWidget to true.",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Departure city or airport. Extract from phrases like 'depuis Paris', 'from Brussels', 'je pars de Lyon', 'départ de Nice'"
        },
        to: {
          type: "string", 
          description: "Destination city or airport. Extract from phrases like 'aller à Rome', 'vers Tokyo', 'destination Barcelone', 'pour New York'"
        },
        departureDate: {
          type: "string",
          description: "Departure date in ISO format YYYY-MM-DD. Parse dates like '15 janvier', 'next week', 'in March', 'le 20 mars 2025'. Use current year 2025 if not specified."
        },
        returnDate: {
          type: "string",
          description: "Return date in ISO format YYYY-MM-DD. Parse from phrases like 'retour le 22', 'jusqu'au 28', 'pendant une semaine' (add 7 days to departure)"
        },
        adults: {
          type: "number",
          description: "ONLY set if user gives EXPLICIT count like '2 adultes', 'nous sommes 3 adultes', 'je suis seul/solo' (=1). Never guess."
        },
        children: {
          type: "number",
          description: "ONLY set if user gives EXPLICIT count like '2 enfants', 'avec 1 enfant de 5 ans'. Never guess."
        },
        infants: {
          type: "number",
          description: "ONLY set if explicitly mentioned like '1 bébé', 'un nourrisson'. Never guess."
        },
        needsTravelersWidget: {
          type: "boolean",
          description: "Set TRUE whenever user implies traveling with others WITHOUT giving exact numbers. Triggers include: 'en famille', 'avec ma famille', 'en groupe', 'groupe d'amis', 'avec des amis', 'entre amis', 'avec des copains', 'avec des copines', 'avec mes potes', 'entre potes', 'avec des enfants', 'avec mes enfants', 'voyage familial', 'vacances en famille', 'en couple', 'avec ma femme/mon mari', 'avec mon/ma conjoint(e)', 'avec mes parents', 'en tribu', 'tous ensemble', 'on part à plusieurs', 'voyage de groupe', 'avec les enfants', 'toute la famille', 'week-end entre amis', 'escapade en groupe'. Basically ANY mention of traveling with others where you don't have explicit numbers."
        },
        tripType: {
          type: "string",
          enum: ["roundtrip", "oneway", "multi"],
          description: "Trip type: 'roundtrip' if return date mentioned or implied, 'oneway' if explicitly one-way, 'multi' for multiple destinations"
        }
      },
      required: []
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = false } = await req.json();
    console.log("Received messages:", JSON.stringify(messages, null, 2), "stream:", stream);
    console.log("Received messages:", JSON.stringify(messages, null, 2), "stream:", stream);

    const AZURE_OPENAI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
    const AZURE_OPENAI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    const AZURE_OPENAI_API_VERSION = Deno.env.get("AZURE_OPENAI_API_VERSION");
    const AZURE_OPENAI_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT");

    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_DEPLOYMENT) {
      console.error("Missing Azure OpenAI configuration");
      throw new Error("Azure OpenAI configuration is incomplete");
    }

    const apiVersion = AZURE_OPENAI_API_VERSION || "2025-01-01-preview";
    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${apiVersion}`;

    console.log("Calling Azure OpenAI:", url);

    const systemPrompt = `Tu es un assistant de voyage expert pour Travliaq. Ton rôle est d'aider les utilisateurs à planifier le voyage parfait en collectant les informations nécessaires de manière naturelle et conversationnelle.

## TON OBJECTIF PRINCIPAL
Collecter les informations de vol étape par étape. Tu dois être proactif et poser des questions pertinentes.

## RÈGLE CRITIQUE SUR LES VOYAGEURS
**NE JAMAIS DEVINER le nombre de voyageurs !**
- Si l'utilisateur dit "en famille", "avec des enfants", "en groupe", "voyage familial" → utilise needsTravelersWidget: true
- N'extrais le nombre QUE si l'utilisateur donne des chiffres EXPLICITES comme "2 adultes et 1 enfant"
- Le widget interactif s'affichera automatiquement pour que l'utilisateur sélectionne précisément

## INFORMATIONS À COLLECTER
1. **Destination** - Où veut-il aller ?
2. **Ville de départ** - D'où part-il ?
3. **Dates** - Quand veut-il partir et revenir ?
4. **Voyageurs** - Combien d'adultes, enfants, bébés ? (demande TOUJOURS si pas explicite)

## RÈGLES D'INTERACTION

### Quand l'utilisateur mentionne un voyage :
1. UTILISE l'outil update_flight_widget pour extraire les informations EXPLICITES uniquement
2. Si mention de "famille", "enfants", etc. sans chiffres → needsTravelersWidget: true
3. Pose UNE question à la fois pour les informations manquantes

### Ordre de priorité :
1. Si pas de destination → Demande où il veut aller
2. Si destination mais pas de départ → Demande d'où il part
3. Si départ et destination mais pas de dates → Demande quand il veut partir
4. Si dates OK mais voyageurs pas clairs → Le widget s'affiche pour sélection
5. Si tout est rempli → Confirme et invite à cliquer sur "Rechercher"

## EXEMPLES

Utilisateur: "Je veux aller à Bagdad le 30 janvier pour 14 jours en famille"
→ update_flight_widget avec {to: "Bagdad", departureDate: "2025-01-30", returnDate: "2025-02-13", tripType: "roundtrip", needsTravelersWidget: true}
→ "Super choix Bagdad ! 🏛️ J'ai configuré les dates du 30 janvier au 13 février. Sélectionne le nombre de voyageurs ci-dessous pour continuer."

Utilisateur: "On sera 2 adultes et 3 enfants"
→ update_flight_widget avec {adults: 2, children: 3}
→ "Parfait, 2 adultes et 3 enfants ! Tu peux maintenant cliquer sur 'Rechercher' 🔍"

Utilisateur: "Voyage solo à Tokyo"
→ update_flight_widget avec {to: "Tokyo", adults: 1}
→ "Tokyo en solo, excellent ! 🗼 D'où pars-tu ?"

## IMPORTANT
- Date actuelle : ${new Date().toISOString().split('T')[0]}
- Année par défaut : 2025
- Réponds TOUJOURS en français
- Réponses courtes (2-3 phrases max)
- NE JAMAIS inventer de nombre de voyageurs`;

    // Non-streaming request (for tool calls)
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": AZURE_OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
        tools: [flightExtractionTool],
        tool_choice: "auto",
        stream: false, // First call is never streamed to handle tools
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Azure OpenAI error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur API Azure OpenAI", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("Azure OpenAI response:", JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    let content = choice?.message?.content || "";
    let flightData = null;

    // Check if the model called the flight extraction tool
    if (choice?.message?.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.function?.name === "update_flight_widget") {
          try {
            flightData = JSON.parse(toolCall.function.arguments);
            console.log("Flight data extracted:", flightData);
            
            // Filter out empty values
            flightData = Object.fromEntries(
              Object.entries(flightData).filter(([_, v]) => v !== null && v !== undefined && v !== "")
            );
            
            // Only return flightData if it has actual content
            if (Object.keys(flightData).length === 0) {
              flightData = null;
            }
          } catch (e) {
            console.error("Failed to parse flight data:", e);
          }
        }
      }
    }

    // If we got a tool call but no content, we need a follow-up call
    if (!content && choice?.message?.tool_calls) {
      console.log("Making follow-up call for conversational response, stream:", stream);
      
      const followUpMessages = [
        { role: "system", content: systemPrompt },
        ...messages,
        choice.message,
        {
          role: "tool",
          tool_call_id: choice.message.tool_calls[0].id,
          content: JSON.stringify({ 
            success: true, 
            message: "Widget mis à jour",
            extracted: flightData 
          })
        }
      ];

      if (stream) {
        // Streaming response
        const followUpResponse = await fetch(url, {
          method: "POST",
          headers: {
            "api-key": AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 300,
            stream: true,
          }),
        });

        if (!followUpResponse.ok) {
          const errText = await followUpResponse.text();
          console.error("Streaming follow-up call failed:", errText);
          return new Response(JSON.stringify({ content: "J'ai mis à jour la recherche de vol pour toi.", flightData }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Return streaming response with flightData in a special first chunk
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            // Send flightData first as a special event
            if (flightData) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "flightData", flightData })}\n\n`));
            }

            const reader = followUpResponse.body!.getReader();
            const decoder = new TextDecoder();

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter(line => line.trim() !== "");

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const jsonStr = line.slice(6);
                    if (jsonStr === "[DONE]") {
                      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                      continue;
                    }
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const delta = parsed.choices?.[0]?.delta?.content;
                      if (delta) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: delta })}\n\n`));
                      }
                    } catch (e) {
                      // Ignore parse errors for incomplete chunks
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
              controller.close();
            }
          }
        });

        return new Response(readableStream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } else {
        // Non-streaming follow-up
        const followUpResponse = await fetch(url, {
          method: "POST",
          headers: {
            "api-key": AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: followUpMessages,
            temperature: 0.7,
            max_tokens: 300,
          }),
        });

        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json();
          content = followUpData.choices?.[0]?.message?.content || "J'ai mis à jour la recherche de vol pour toi.";
          console.log("Follow-up response:", content);
        } else {
          const errText = await followUpResponse.text();
          console.error("Follow-up call failed:", errText);
          content = "J'ai mis à jour la recherche de vol pour toi.";
        }
      }
    } else if (stream && content) {
      // If we already have content but streaming was requested, simulate streaming
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          if (flightData) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "flightData", flightData })}\n\n`));
          }
          
          // Send content character by character with small delay
          for (const char of content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: char })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      });

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    if (!content) {
      content = "Désolé, je n'ai pas pu générer de réponse.";
    }

    console.log("Final response - content:", content, "flightData:", flightData);

    return new Response(JSON.stringify({ content, flightData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("planner-chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
