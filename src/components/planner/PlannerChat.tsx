import { useState, useRef, useEffect } from "react";
import { Send, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatQuickAction =
  | { type: "tab"; tab: "flights" | "activities" | "stays" | "preferences" }
  | { type: "zoom"; center: [number, number]; zoom: number }
  | { type: "tabAndZoom"; tab: "flights" | "activities" | "stays" | "preferences"; center: [number, number]; zoom: number };

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  isTyping?: boolean;
}

interface PlannerChatProps {
  onAction: (action: ChatQuickAction) => void;
}

export default function PlannerChat({ onAction }: PlannerChatProps) {
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

  const generateResponse = (userText: string): string => {
    const text = userText.toLowerCase();

    // City responses
    if (text.includes("paris")) {
      onAction({ type: "zoom", center: [2.3522, 48.8566], zoom: 12 });
      return "Paris est une excellente destination ! J'ai centré la carte sur la ville. Vous pouvez explorer les vols, les activités comme la Tour Eiffel ou le Louvre, et les hébergements. Que souhaitez-vous voir en premier ?";
    }
    if (text.includes("new york") || text.includes("nyc")) {
      onAction({ type: "zoom", center: [-73.9855, 40.758], zoom: 12 });
      return "New York, la ville qui ne dort jamais ! La carte est maintenant centrée sur Manhattan. Voulez-vous que je vous montre les vols disponibles ou les activités incontournables ?";
    }
    if (text.includes("barcelone") || text.includes("barcelona")) {
      onAction({ type: "zoom", center: [2.1734, 41.3851], zoom: 12 });
      return "Barcelone est magnifique ! Entre la Sagrada Familia, les plages et la gastronomie, vous allez adorer. Je vous montre les options ?";
    }
    if (text.includes("rome") || text.includes("roma")) {
      onAction({ type: "zoom", center: [12.4964, 41.9028], zoom: 12 });
      return "Rome, la ville éternelle ! Le Colisée, le Vatican, la cuisine italienne... Que voulez-vous explorer en premier ?";
    }
    if (text.includes("tokyo") || text.includes("japon")) {
      onAction({ type: "zoom", center: [139.6917, 35.6895], zoom: 11 });
      return "Tokyo est une destination fascinante ! Entre tradition et modernité, vous allez vivre une expérience unique. Voulez-vous voir les vols ou les activités ?";
    }
    if (text.includes("londres") || text.includes("london")) {
      onAction({ type: "zoom", center: [-0.1276, 51.5074], zoom: 12 });
      return "Londres vous attend ! Big Ben, Buckingham Palace, les musées gratuits... Par quoi voulez-vous commencer ?";
    }

    // Tab triggers
    if (text.includes("vol") || text.includes("avion") || text.includes("flight")) {
      onAction({ type: "tab", tab: "flights" });
      return "Je vous affiche les options de vols. Vous pouvez filtrer par date, classe et nombre de passagers dans le panneau à gauche.";
    }
    if (text.includes("activité") || text.includes("visite") || text.includes("faire") || text.includes("voir")) {
      onAction({ type: "tab", tab: "activities" });
      return "Voici les activités disponibles. Vous pouvez filtrer par type (culture, plein air, gastronomie...) et par budget.";
    }
    if (text.includes("hôtel") || text.includes("hotel") || text.includes("dormir") || text.includes("hébergement") || text.includes("logement")) {
      onAction({ type: "tab", tab: "stays" });
      return "Je vous montre les hébergements. Filtrez par prix, note et équipements selon vos préférences.";
    }
    if (text.includes("préférence") || text.includes("profil") || text.includes("style")) {
      onAction({ type: "tab", tab: "preferences" });
      return "Configurons vos préférences de voyage. Cela m'aidera à vous proposer des recommandations personnalisées.";
    }

    // Budget questions
    if (text.includes("budget") || text.includes("prix") || text.includes("coût") || text.includes("cher")) {
      return "Le budget dépend de votre destination et de vos choix. Dites-moi où vous voulez aller et je vous donnerai une estimation. Vous pouvez aussi ajuster les filtres de prix dans chaque onglet.";
    }

    // Duration questions
    if (text.includes("combien de temps") || text.includes("durée") || text.includes("jours")) {
      return "La durée idéale dépend de la destination. Pour une capitale européenne, 3-4 jours suffisent. Pour un voyage plus lointain comme le Japon, comptez au moins une semaine. Quelle destination avez-vous en tête ?";
    }

    // Weather questions
    if (text.includes("météo") || text.includes("climat") || text.includes("quand partir") || text.includes("saison")) {
      return "Je peux vous conseiller sur la meilleure période. Quelle destination vous intéresse ?";
    }

    // Default response
    return "Je comprends ! Pour vous aider au mieux, dites-moi quelle ville ou quel pays vous intéresse. Je peux aussi vous montrer les vols, activités ou hébergements si vous le souhaitez.";
  };

  const send = () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input.trim(),
    };

    const userText = input.trim();
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: typingId, role: "assistant", text: "", isTyping: true },
    ]);

    // Simulate AI response delay
    setTimeout(() => {
      const response = generateResponse(userText);
      setMessages((prev) =>
        prev
          .filter((m) => m.id !== typingId)
          .concat({
            id: `bot-${Date.now()}`,
            role: "assistant",
            text: response,
          })
      );
      setIsLoading(false);
    }, 800);
  };

  return (
    <aside className="h-full w-full bg-background flex flex-col">
      {/* Messages area - ChatGPT style */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
          {messages.map((m) => (
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
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
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
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - ChatGPT style */}
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
}
