import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Send, User, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-travliaq.png";
import type { LocationResult } from "@/hooks/useLocationAutocomplete";
import type { CountrySelectionEvent } from "./PlannerPanel";
import type { Airport } from "@/hooks/useNearestAirports";

export type ChatQuickAction =
  | { type: "tab"; tab: "flights" | "activities" | "stays" | "preferences" }
  | { type: "zoom"; center: [number, number]; zoom: number }
  | { type: "tabAndZoom"; tab: "flights" | "activities" | "stays" | "preferences"; center: [number, number]; zoom: number }
  | { type: "updateFlight"; flightData: FlightFormData }
  | { type: "selectAirport"; field: "from" | "to"; airport: Airport };

export interface FlightFormData {
  from?: string;
  to?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  tripType?: "roundtrip" | "oneway" | "multi";
}

// Airport selection for chat buttons
export interface AirportChoice {
  field: "from" | "to";
  cityName: string;
  airports: Airport[];
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  isTyping?: boolean;
  isHidden?: boolean;
  airportChoices?: AirportChoice; // For displaying airport selection buttons
}

interface PlannerChatProps {
  onAction: (action: ChatQuickAction) => void;
}

export interface PlannerChatRef {
  injectSystemMessage: (event: CountrySelectionEvent) => void;
  askAirportChoice: (choice: AirportChoice) => void;
}

// City coordinates for map actions
const cityCoordinates: Record<string, [number, number]> = {
  "paris": [2.3522, 48.8566],
  "new york": [-74.0060, 40.7128],
  "nyc": [-74.0060, 40.7128],
  "barcelone": [2.1734, 41.3851],
  "barcelona": [2.1734, 41.3851],
  "rome": [12.4964, 41.9028],
  "tokyo": [139.6503, 35.6762],
  "londres": [-0.1278, 51.5074],
  "london": [-0.1278, 51.5074],
  "berlin": [13.4050, 52.5200],
  "amsterdam": [4.9041, 52.3676],
  "lisbonne": [-9.1393, 38.7223],
  "lisbon": [-9.1393, 38.7223],
  "bruxelles": [4.3517, 50.8503],
  "brussels": [4.3517, 50.8503],
  "madrid": [-3.7038, 40.4168],
  "vienne": [16.3738, 48.2082],
  "vienna": [16.3738, 48.2082],
  "prague": [14.4378, 50.0755],
  "budapest": [19.0402, 47.4979],
  "dubai": [55.2708, 25.2048],
  "singapour": [103.8198, 1.3521],
  "singapore": [103.8198, 1.3521],
  "sydney": [151.2093, -33.8688],
  "bangkok": [100.5018, 13.7563],
  "marrakech": [-7.9811, 31.6295],
  "le caire": [31.2357, 30.0444],
  "cairo": [31.2357, 30.0444],
};

function getCityCoords(cityName: string): [number, number] | null {
  const normalized = cityName.toLowerCase().trim();
  return cityCoordinates[normalized] || null;
}

function parseAction(content: string): { cleanContent: string; action: ChatQuickAction | null } {
  const actionMatch = content.match(/<action>(.*?)<\/action>/s);
  let cleanContent = content.replace(/<action>.*?<\/action>/gs, "").trim();
  
  if (!actionMatch) return { cleanContent, action: null };

  try {
    const actionData = JSON.parse(actionMatch[1]);
    
    if (actionData.type === "zoom" && actionData.city) {
      const coords = getCityCoords(actionData.city);
      if (coords) {
        return { cleanContent, action: { type: "zoom", center: coords, zoom: 12 } };
      }
    }
    
    if (actionData.type === "tab" && actionData.tab) {
      return { cleanContent, action: { type: "tab", tab: actionData.tab } };
    }
    
    if (actionData.type === "tabAndZoom" && actionData.tab && actionData.city) {
      const coords = getCityCoords(actionData.city);
      if (coords) {
        return { cleanContent, action: { type: "tabAndZoom", tab: actionData.tab, center: coords, zoom: 12 } };
      }
    }
  } catch (e) {
    console.error("Failed to parse action:", e);
  }

  return { cleanContent, action: null };
}

// Airport button component
const AirportButton = ({ 
  airport, 
  onClick,
  disabled 
}: { 
  airport: Airport; 
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-left",
      "bg-card hover:bg-primary/10 hover:border-primary/50",
      "border-border/50 shadow-sm",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Plane className="h-4 w-4 text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-foreground flex items-center gap-2">
        <span className="truncate">{airport.name}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold shrink-0">
          {airport.iata}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {airport.distance_km.toFixed(0)} km de la ville
      </div>
    </div>
  </button>
);

const PlannerChatComponent = forwardRef<PlannerChatRef, PlannerChatProps>(({ onAction }, ref) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Bonjour ! Je suis votre assistant de voyage. Dites-moi où vous souhaitez aller et je vous aiderai à planifier votre voyage.",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle airport selection from buttons
  const handleAirportSelect = (messageId: string, field: "from" | "to", airport: Airport) => {
    // Remove the airport choice buttons from the message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, airportChoices: undefined } : m
      )
    );

    // Add confirmation message
    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-${Date.now()}`,
        role: "assistant",
        text: `Parfait ! J'ai sélectionné l'aéroport **${airport.name} (${airport.iata})** comme ${field === "from" ? "point de départ" : "destination"}.`,
      },
    ]);

    // Notify parent to update the flight form
    onAction({ type: "selectAirport", field, airport });
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    injectSystemMessage: async (event: CountrySelectionEvent) => {
      const fieldName = event.field === "from" ? "départ" : "destination";
      const countryName = event.country.name;
      
      const systemText = `[SYSTÈME] L'utilisateur a sélectionné le pays "${countryName}" comme ${fieldName}. Pour les vols, nous avons besoin d'un aéroport ou d'une ville précise, pas d'un pays. Demande-lui quelle ville dans ${countryName} il souhaite utiliser comme ${fieldName}.`;
      
      setMessages((prev) => [
        ...prev,
        { id: `system-${Date.now()}`, role: "system" as const, text: systemText, isHidden: true },
      ]);

      setIsLoading(true);
      const typingId = `typing-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: typingId, role: "assistant", text: "", isTyping: true },
      ]);

      try {
        const apiMessages = messages
          .filter((m) => !m.isTyping && m.id !== "welcome")
          .map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.text }));
        apiMessages.push({ role: "user", content: systemText });

        const { data, error } = await supabase.functions.invoke("planner-chat", {
          body: { messages: apiMessages },
        });

        if (error) {
          console.error("Chat API error:", error);
          throw new Error(error.message);
        }

        const rawContent = data?.content || `Dans quelle ville de ${countryName} souhaitez-vous partir/arriver ?`;
        const { cleanContent } = parseAction(rawContent);

        setMessages((prev) =>
          prev
            .filter((m) => m.id !== typingId)
            .concat({
              id: `bot-${Date.now()}`,
              role: "assistant",
              text: cleanContent,
            })
        );
      } catch (err) {
        console.error("Failed to get chat response:", err);
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== typingId)
            .concat({
              id: `bot-${Date.now()}`,
              role: "assistant",
              text: `Je vois que vous avez sélectionné ${countryName}. Dans quelle ville de ce pays souhaitez-vous ${event.field === "from" ? "partir" : "arriver"} ?`,
            })
        );
      } finally {
        setIsLoading(false);
      }
    },

    askAirportChoice: (choice: AirportChoice) => {
      const fieldLabel = choice.field === "from" ? "départ" : "destination";
      const messageId = `airport-choice-${Date.now()}`;
      
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: `🛫 La ville de **${choice.cityName}** a plusieurs aéroports. Lequel souhaitez-vous utiliser comme ${fieldLabel} ?`,
          airportChoices: choice,
        },
      ]);
    },
  }));

  const send = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, role: "assistant", text: "", isTyping: true },
    ]);

    try {
      const apiMessages = messages
        .filter((m) => !m.isTyping && m.id !== "welcome")
        .map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.text }));
      apiMessages.push({ role: "user", content: userText });

      const { data, error } = await supabase.functions.invoke("planner-chat", {
        body: { messages: apiMessages },
      });

      if (error) {
        console.error("Chat API error:", error);
        throw new Error(error.message);
      }

      const rawContent = data?.content || "Désolé, je n'ai pas pu répondre.";
      const { cleanContent, action } = parseAction(rawContent);

      if (data?.flightData) {
        const destCity = data.flightData.to;
        if (destCity) {
          const coords = getCityCoords(destCity.toLowerCase().split(",")[0].trim());
          if (coords) {
            onAction({ type: "tabAndZoom", tab: "flights", center: coords, zoom: 8 });
          } else {
            onAction({ type: "tab", tab: "flights" });
          }
        } else {
          onAction({ type: "tab", tab: "flights" });
        }
        
        onAction({ type: "updateFlight", flightData: data.flightData });
      } else if (action) {
        onAction(action);
      }

      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: `bot-${Date.now()}`,
            role: "assistant",
            text: cleanContent,
          })
      );
    } catch (err) {
      console.error("Failed to get chat response:", err);
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: `error-${Date.now()}`,
            role: "assistant",
            text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
          })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="h-full w-full bg-background flex flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
          {messages.filter((m) => !m.isHidden).map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-4",
                m.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white"
                )}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <img src={logo} alt="Travliaq" className="h-6 w-6 object-contain" />
                )}
              </div>

              {/* Message content */}
              <div
                className={cn(
                  "flex-1 min-w-0",
                  m.role === "user" ? "text-right" : ""
                )}
              >
                <div
                  className={cn(
                    "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground text-left"
                      : "bg-muted text-foreground text-left"
                  )}
                >
                  {m.isTyping ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    m.text
                  )}
                </div>

                {/* Airport choice buttons */}
                {m.airportChoices && (
                  <div className="mt-3 space-y-2 max-w-[85%]">
                    {m.airportChoices.airports.map((airport) => (
                      <AirportButton
                        key={airport.iata}
                        airport={airport}
                        onClick={() => handleAirportSelect(m.id, m.airportChoices!.field, airport)}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              placeholder="Envoyer un message..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              style={{ minHeight: "40px", maxHeight: "120px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || isLoading}
              className={cn(
                "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Tapez une destination ou demandez des vols, activités, hébergements
          </p>
        </div>
      </div>
    </aside>
  );
});

PlannerChatComponent.displayName = "PlannerChat";

export default PlannerChatComponent;
