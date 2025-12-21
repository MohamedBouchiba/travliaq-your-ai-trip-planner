import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ChatQuickAction =
  | { type: "tab"; tab: "flights" | "activities" | "stays" | "preferences" }
  | { type: "zoom"; center: [number, number]; zoom: number }
  | { type: "tabAndZoom"; tab: "flights" | "activities" | "stays" | "preferences"; center: [number, number]; zoom: number };

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  links?: { title: string; url: string; snippet: string }[];
}

interface PlannerChatProps {
  onAction: (action: ChatQuickAction) => void;
}

export default function PlannerChat({ onAction }: PlannerChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      role: "assistant",
      text: "Bonjour ! Dis-moi où tu veux aller et je mets la carte à jour.",
    },
    {
      id: "m2",
      role: "assistant",
      text: "Voici quelques suggestions pour Paris :",
      links: [
        {
          title: "Musées et sorties à Paris",
          url: "https://en.parisinfo.com/",
          snippet: "Une sélection de suggestions culturelles et activités.",
        },
        {
          title: "Quartiers pour dormir",
          url: "https://en.parisinfo.com/where-to-sleep-in-paris",
          snippet: "Repères pour choisir une zone d'hébergement.",
        },
      ],
    },
  ]);

  const send = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const text = input.trim().toLowerCase();

    // Interpret intent
    if (text.includes("vol") || text.includes("flight")) {
      onAction({ type: "tab", tab: "flights" });
    } else if (text.includes("activité") || text.includes("activit")) {
      onAction({ type: "tab", tab: "activities" });
    } else if (text.includes("hôtel") || text.includes("hotel") || text.includes("hébergement")) {
      onAction({ type: "tab", tab: "stays" });
    } else if (text.includes("préférence") || text.includes("profil")) {
      onAction({ type: "tab", tab: "preferences" });
    }

    if (text.includes("paris")) {
      onAction({ type: "zoom", center: [2.3522, 48.8566], zoom: 12 });
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, role: "assistant", text: "J'ai centré la carte sur Paris. Tu veux voir les vols, les activités ou les hôtels ?" },
        ]);
      }, 300);
    } else if (text.includes("new york") || text.includes("nyc")) {
      onAction({ type: "zoom", center: [-73.9855, 40.758], zoom: 12 });
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, role: "assistant", text: "New York est affiché sur la carte !" },
        ]);
      }, 300);
    } else if (text.includes("barcelone") || text.includes("barcelona")) {
      onAction({ type: "zoom", center: [2.1734, 41.3851], zoom: 12 });
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, role: "assistant", text: "Barcelone est maintenant visible. Veux-tu voir les activités ?" },
        ]);
      }, 300);
    } else if (text.includes("rome") || text.includes("roma")) {
      onAction({ type: "zoom", center: [12.4964, 41.9028], zoom: 12 });
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, role: "assistant", text: "Rome est affichée. Explore les monuments !" },
        ]);
      }, 300);
    }

    setInput("");
  };

  return (
    <aside className="h-full w-full border-r border-border bg-card flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto themed-scroll p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={cn("max-w-[90%]", m.role === "user" ? "ml-auto" : "mr-auto")}>
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {m.text}
            </div>

            {m.links && (
              <div className="mt-2 space-y-2">
                {m.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl bg-background border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-foreground">{link.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.snippet}</div>
                    <div className="text-xs text-primary mt-1 truncate">{link.url}</div>
                  </a>
                ))}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction({ type: "tab", tab: "activities" })}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Activités
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction({ type: "tab", tab: "flights" })}
                  >
                    Vols
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <footer className="p-3 border-t border-border bg-card/80">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Je veux aller à New York..."
            rows={1}
            className="min-h-[44px] max-h-24 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="h-11 w-11 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </aside>
  );
}
