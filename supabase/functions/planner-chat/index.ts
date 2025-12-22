import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definition for extracting flight intent from user message
const flightExtractionTool = {
  type: "function",
  function: {
    name: "update_flight_widget",
    description: "Extract and update flight search parameters when user mentions ANY travel-related information. Call this tool whenever the user provides: departure city, destination, travel dates, number of passengers, or trip type. Extract whatever information is available, even if partial.",
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
        passengers: {
          type: "number",
          description: "Number of passengers. Extract from 'pour 2 personnes', 'we are 4', 'solo', 'en couple' (2), 'en famille' (4)"
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
    const { messages } = await req.json();
    console.log("Received messages:", JSON.stringify(messages, null, 2));

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
Collecter les informations de vol étape par étape pour aider l'utilisateur à trouver les meilleurs vols au meilleur prix. Tu dois être proactif et poser des questions pertinentes.

## INFORMATIONS À COLLECTER POUR LES VOLS
1. **Destination** - Où veut-il aller ?
2. **Ville de départ** - D'où part-il ?
3. **Dates** - Quand veut-il partir et revenir ?
4. **Nombre de voyageurs** - Combien de personnes ?
5. **Type de voyage** - Aller-retour, aller simple, multi-destinations ?

## RÈGLES D'INTERACTION

### Quand l'utilisateur mentionne un voyage :
1. UTILISE TOUJOURS l'outil \`update_flight_widget\` pour extraire TOUTES les informations mentionnées, même partielles
2. Pose UNE question à la fois pour les informations manquantes
3. Sois naturel et enthousiaste, pas robotique

### Ordre de priorité des questions :
1. Si pas de destination → Demande où il veut aller (suggère des destinations populaires si besoin)
2. Si destination mais pas de départ → Demande d'où il part
3. Si départ et destination mais pas de dates → Demande quand il veut partir
4. Si dates mais pas de retour (et pas aller simple) → Demande la durée ou date de retour
5. Si tout est rempli → Confirme les détails et invite à cliquer sur "Rechercher"

### Style de communication :
- Utilise des emojis avec modération (✈️ 🌍 🗓️)
- Sois concis mais chaleureux
- Donne des conseils pertinents (meilleure période, astuces)
- Si l'utilisateur hésite sur une destination, propose 2-3 suggestions basées sur ses préférences

## EXEMPLES DE RÉPONSES

Utilisateur: "Je veux partir en vacances"
→ Appelle update_flight_widget (vide car pas d'info)
→ "Super ! ✈️ Où rêves-tu d'aller ? Je peux te suggérer des destinations tendance comme Barcelone, Lisbonne ou Marrakech si tu cherches du soleil !"

Utilisateur: "Je veux aller à Tokyo"
→ Appelle update_flight_widget avec {to: "Tokyo"}
→ "Tokyo, excellent choix ! 🗼 C'est une destination incroyable. D'où pars-tu ?"

Utilisateur: "Je pars de Paris pour Tokyo du 15 au 22 mars"
→ Appelle update_flight_widget avec {from: "Paris", to: "Tokyo", departureDate: "2025-03-15", returnDate: "2025-03-22", tripType: "roundtrip"}
→ "Parfait ! J'ai configuré ta recherche Paris → Tokyo du 15 au 22 mars. 🎌 Combien de voyageurs serez-vous ?"

Utilisateur: "On sera 2"
→ Appelle update_flight_widget avec {passengers: 2}
→ "Super, 2 voyageurs ! J'ai mis à jour le formulaire. Tu peux maintenant cliquer sur 'Rechercher' pour voir les meilleurs vols disponibles ! 🔍"

## IMPORTANT
- Date actuelle : ${new Date().toISOString().split('T')[0]}
- Année par défaut pour les dates : 2025
- Si l'utilisateur dit "la semaine prochaine", calcule les dates exactes
- Réponds TOUJOURS en français
- Garde tes réponses courtes (2-3 phrases max)`;

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
      console.log("Making follow-up call for conversational response");
      const followUpResponse = await fetch(url, {
        method: "POST",
        headers: {
          "api-key": AZURE_OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
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
          ],
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
