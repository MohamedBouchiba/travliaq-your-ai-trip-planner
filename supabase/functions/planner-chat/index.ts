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
    description: "Extract ONLY explicit flight info. Never guess or infer values. If info is vague, set the corresponding 'needs*Widget' flag to show an interactive widget instead.",
    parameters: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Departure city. ONLY extract if explicitly mentioned: 'depuis Paris', 'de Lyon', 'je pars de Nice'. For COUNTRIES, use fromCountryCode instead."
        },
        fromCountryCode: {
          type: "string",
          description: "ISO2 country code if user mentions a COUNTRY for departure (e.g., 'depuis la France' = 'FR', 'je pars du Canada' = 'CA'). This triggers city selection for departure."
        },
        fromCountryName: {
          type: "string",
          description: "Country name in French if user mentions a country instead of a city for departure."
        },
        to: {
          type: "string", 
          description: "Destination city. Extract from: 'aller à Rome', 'vers Tokyo', 'direction Barcelone'. For COUNTRIES, use toCountryCode instead."
        },
        toCountryCode: {
          type: "string",
          description: "ISO2 country code if user mentions a COUNTRY instead of a city (e.g., 'Qatar' = 'QA', 'France' = 'FR', 'Japon' = 'JP'). This triggers city selection."
        },
        toCountryName: {
          type: "string",
          description: "Country name in French if user mentions a country instead of a city."
        },
        departureDate: {
          type: "string",
          description: "ONLY extract if user gives EXACT date like 'le 15 janvier', 'le 20 mars'. NEVER extract from vague terms like 'en février', 'au printemps', 'cet été', 'dans 2 semaines'. For vague dates, use needsDateWidget instead."
        },
        returnDate: {
          type: "string",
          description: "ONLY extract if user gives EXACT return date like 'retour le 22'. For duration like '3 semaines', set tripDuration instead."
        },
        tripDuration: {
          type: "string",
          description: "Duration mentioned: '3 semaines', '10 jours', '1 semaine'. Used to calculate return date AFTER user picks departure date."
        },
        preferredMonth: {
          type: "string",
          description: "If user mentions a month without specific date: 'en février', 'au mois de mars', 'cet été'. We'll ask for exact date."
        },
        adults: {
          type: "number",
          description: "ONLY if EXPLICIT: '2 adultes', 'nous sommes 3', 'solo/seul' (=1). Never guess."
        },
        children: {
          type: "number",
          description: "ONLY if EXPLICIT: '2 enfants', '1 enfant de 8 ans'. Never guess."
        },
        infants: {
          type: "number",
          description: "ONLY if EXPLICIT: '1 bébé'. Never guess."
        },
        needsDateWidget: {
          type: "boolean",
          description: "Set TRUE when user mentions VAGUE timing: 'en février', 'au printemps', 'cet été', 'le mois prochain', 'bientôt', 'dans quelques semaines'. This triggers a date picker widget."
        },
        needsTravelersWidget: {
          type: "boolean",
          description: "Set TRUE when user implies multiple travelers WITHOUT exact numbers: 'en famille', 'entre potes', 'entre amis', 'avec des copains', 'en groupe', 'en couple', 'avec mes enfants', etc."
        },
        needsCitySelection: {
          type: "boolean",
          description: "Set TRUE when user mentions a COUNTRY (not a city) as destination: 'aller au Qatar', 'visiter le Japon', 'partir en France'. The user must then choose a specific city."
        },
        tripType: {
          type: "string",
          enum: ["roundtrip", "oneway", "multi"],
          description: "Trip type based on context. Default to 'roundtrip' if duration or return mentioned."
        },
        budgetHint: {
          type: "string",
          description: "Budget preference mentioned: 'pas cher', 'économique', 'luxe', 'budget serré'."
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
    // Authentication is optional - we log user if available but don't require it
    const authHeader = req.headers.get("authorization");
    let userId = "anonymous";
    
    if (authHeader && authHeader !== "Bearer undefined" && authHeader !== "Bearer null") {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (!authError && user) {
          userId = user.id;
          console.log("Authenticated user:", userId);
        }
      } catch (e) {
        // Silently continue without auth
        console.log("Auth check skipped (anonymous user)");
      }
    } else {
      console.log("Anonymous user request");
    }

    const { messages, stream = false, currentStep } = await req.json();
    console.log("User:", userId, "Messages:", messages.length, "Stream:", stream);

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

    const currentDate = new Date().toISOString().split('T')[0];
    const systemPrompt = `Tu es un assistant de voyage bienveillant pour Travliaq. Tu guides l'utilisateur pas à pas, UNE QUESTION À LA FOIS, pour l'aider à trouver son vol idéal.

## RÈGLE D'OR : UNE ÉTAPE À LA FOIS + WIDGETS IMMÉDIATS
Tu ne poses qu'UNE SEULE question par message. Tu ne montres qu'UN SEUL widget à la fois.
MAIS dès qu'une étape est complète, tu déclenches IMMÉDIATEMENT le widget pour l'étape suivante.

## COMPORTEMENT CLÉ : DÉTECTION PAYS vs VILLE
IMPORTANT : Si l'utilisateur mentionne un PAYS (pas une ville), tu DOIS :
1. Utiliser needsCitySelection: true
2. Mettre toCountryCode avec le code ISO2 du pays (ex: "QA" pour Qatar, "FR" pour France, "JP" pour Japon)
3. Mettre toCountryName avec le nom du pays en français
4. NE PAS mettre de valeur dans "to" (on ne connaît pas encore la ville)

Exemples de PAYS (utiliser needsCitySelection) :
- "aller au Qatar" → toCountryCode: "QA", toCountryName: "Qatar", needsCitySelection: true
- "visiter le Japon" → toCountryCode: "JP", toCountryName: "Japon", needsCitySelection: true
- "partir en France" → toCountryCode: "FR", toCountryName: "France", needsCitySelection: true
- "voyager aux États-Unis" → toCountryCode: "US", toCountryName: "États-Unis", needsCitySelection: true

Exemples de VILLES (mettre dans "to") :
- "aller à Paris" → to: "Paris"
- "aller à Doha" → to: "Doha"
- "visiter Tokyo" → to: "Tokyo"

## COMPORTEMENT CLÉ : CALENDRIER AUTOMATIQUE
Dès que la destination (ville) est connue ET que tu n'as pas de dates exactes :
→ Tu DOIS utiliser needsDateWidget: true pour afficher le calendrier IMMÉDIATEMENT
→ Tu poses la question "Quand souhaites-tu partir ?" et le calendrier apparaît EN MÊME TEMPS

## CE QUE TU NE FAIS JAMAIS
- Ne jamais deviner les dates ("en février" = ne PAS mettre "1er au 22 février")
- Ne jamais deviner le nombre de voyageurs ("entre potes" = ne PAS mettre 4)
- Ne jamais poser plusieurs questions à la fois
- Ne jamais montrer plusieurs widgets en même temps
- Ne jamais proposer de chercher les aéroports avant d'avoir les infos essentielles
- Ne jamais mettre une ville dans "to" si l'utilisateur a mentionné un pays

## ORDRE STRICT DES ÉTAPES (une seule à la fois)

### Étape 1 : DESTINATION
Si pas de destination, demande "Où souhaites-tu aller ?"
- Si PAYS → needsCitySelection: true + toCountryCode + toCountryName
- Si VILLE → to: "NomVille" puis PASSE À L'ÉTAPE 2

### Étape 1b : SÉLECTION DE VILLE (si pays détecté)
Le widget de sélection de ville s'affiche automatiquement.
Ton message doit être du style : "[Pays] est une destination fascinante ! Voici les principales villes :"
Le widget montrera les options.

### Étape 2 : DATE DE DÉPART (avec widget calendrier automatique)
Dès que ville OK mais dates absentes/vagues :
- TOUJOURS utiliser needsDateWidget: true
- Si mois mentionné ("en février"), ajouter preferredMonth: "février"
- Message court : "Super, [ville] est une excellente destination ! Quand souhaites-tu partir ?"
Le widget calendrier s'affiche AVEC le message.

### Étape 3 : DURÉE / DATE RETOUR
Si date départ OK mais pas de retour :
- Si durée mentionnée ("3 semaines"), enregistre tripDuration, calcule le retour
- Sinon, le widget range aura déjà demandé les deux dates

### Étape 4 : VOYAGEURS
Si dates OK mais voyageurs pas clairs :
- TOUJOURS utiliser needsTravelersWidget: true quand les dates sont confirmées mais pas les voyageurs
- Si voyageurs déjà mentionnés ("avec ma femme" = 2 adults), extraire adults: 2
- Message : "Parfait ! Combien êtes-vous ?"

### Étape 5 : VILLE DE DÉPART
Seulement quand destination + dates + voyageurs sont OK :
- Demande "D'où pars-tu ?"

### Étape 6 : CONFIRMATION
Quand tout est complet, résume et propose de chercher les vols.

## EXEMPLES DE COMPORTEMENT CORRECT

Utilisateur: "je veux aller au Qatar avec ma femme"
Extraction: {toCountryCode: "QA", toCountryName: "Qatar", needsCitySelection: true, adults: 2, tripType: "roundtrip"}
Réponse: "Le Qatar est une destination fascinante ! 😊 Voici les principales villes :"
→ Le widget de sélection de ville s'affiche

Utilisateur: "je veux aller à Doha avec ma femme"
Extraction: {to: "Doha", adults: 2, needsDateWidget: true, tripType: "roundtrip"}
Réponse: "Super, Doha est une destination fascinante ! 😊 Quand souhaites-tu partir ?"
→ Le calendrier s'affiche immédiatement

Utilisateur: "je veux aller au Japon entre pote en février pour 3 semaines pas cher"
Extraction: {toCountryCode: "JP", toCountryName: "Japon", preferredMonth: "février", tripDuration: "3 semaines", needsTravelersWidget: true, needsCitySelection: true, budgetHint: "pas cher", tripType: "roundtrip"}
Réponse: "Le Japon est une excellente destination ! 🗾 Voici les principales villes :"
→ Le widget de sélection de ville s'affiche d'abord

Utilisateur: "solo à tokyo"
Extraction: {to: "Tokyo", adults: 1, needsDateWidget: true, tripType: "roundtrip"}
Réponse: "Tokyo en solo, super aventure ! 🗼 Quand veux-tu partir ?"
→ Le calendrier s'affiche

## INDICES POUR DÉTECTER LES VOYAGEURS
- "avec ma femme/mari/copine/copain" = 2 adultes
- "solo/seul" = 1 adulte
- "en couple" = 2 adultes
- "en famille" = needsTravelersWidget (on ne sait pas combien)
- "entre potes/amis" = needsTravelersWidget
- "nous sommes X" = X adultes

## STYLE
- Chaleureux et bienveillant
- Emojis avec modération (1-2 max)
- Phrases courtes (1-2 max)
- Toujours encourageant

## INFOS TECHNIQUES
- Date actuelle : ${currentDate}
- Année par défaut : 2025
- Réponds en français`;

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
