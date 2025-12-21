import { useMemo, useState } from "react";
import { Send, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

export type ChatQuickAction =
  | { type: "tab"; tab: "flights" | "activities" | "stays" | "preferences" }
  | { type: "zoom"; center: [number, number]; zoom: number }
  | { type: "tabAndZoom"; tab: "flights" | "activities" | "stays" | "preferences"; center: [number, number]; zoom: number };

type ChatMessage =
  | { id: string; role: "assistant" | "user"; kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "links"; title: string; items: { title: string; url: string; snippet: string }[] }
  | { id: string; role: "assistant"; kind: "calendar"; title: string };

interface PlannerChatProps {
  onAction: (action: ChatQuickAction) => void;
}

export default function PlannerChat({ onAction }: PlannerChatProps) {
  const [input, setInput] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const messages = useMemo<ChatMessage[]>(
    () => [
      {
        id: "m1",
        role: "assistant",
        kind: "text",
        text: "Je peux t’aider à construire ton voyage. Dis-moi où tu veux aller et je mets la carte à jour.",
      },
      {
        id: "m2",
        role: "assistant",
        kind: "links",
        title: "Voici quelques idées utiles (exemple)",
        items: [
          {
            title: "Musées et sorties à Paris",
            url: "https://en.parisinfo.com/",
            snippet: "Une sélection de suggestions culturelles et activités.",
          },
          {
            title: "Quartiers pour dormir",
            url: "https://en.parisinfo.com/where-to-sleep-in-paris",
            snippet: "Repères pour choisir une zone d’hébergement.",
          },
        ],
      },
      ...(showCalendar
        ? ([{ id: "m3", role: "assistant", kind: "calendar", title: "Choisis tes dates" }] as ChatMessage[])
        : []),
    ],
    [showCalendar]
  );

  const send = () => {
    if (!input.trim()) return;

    const text = input.trim().toLowerCase();

    // Mini “intent” mock: focus sur la démo UX (pas un vrai chatbot)
    if (text.includes("vol") || text.includes("flight")) {
      onAction({ type: "tab", tab: "flights" });
    } else if (text.includes("activité") || text.includes("activit")) {
      onAction({ type: "tab", tab: "activities" });
    } else if (text.includes("hôtel") || text.includes("hotel") || text.includes("hébergement")) {
      onAction({ type: "tab", tab: "stays" });
    } else if (text.includes("préférence") || text.includes("profil")) {
      onAction({ type: "tab", tab: "preferences" });
    }

    if (text.includes("paris")) onAction({ type: "zoom", center: [2.3522, 48.8566], zoom: 11 });
    if (text.includes("new york") || text.includes("nyc")) onAction({ type: "zoom", center: [-73.9855, 40.758], zoom: 11 });

    setInput("");
  };

  return (
    <aside className="h-[100svh] w-full border-r border-border bg-background flex flex-col">
      <header className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">Workspace</div>
          <h1 className="text-base font-montserrat font-bold text-foreground truncate">Travel Co-Pilot</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCalendar((v) => !v)}
          className={cn(
            "h-10 px-3 rounded-lg border border-border bg-background text-sm font-medium text-foreground flex items-center gap-2 hover:bg-muted transition-colors",
            showCalendar && "ring-2 ring-ring"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          Dates
        </button>
      </header>

      <div className="flex-1 overflow-y-auto themed-scroll p-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={cn("max-w-[92%]", m.role === "user" ? "ml-auto" : "mr-auto")}>
            {m.kind === "text" && (
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                )}
              >
                {m.text}
              </div>
            )}

            {m.kind === "links" && (
              <div className="rounded-2xl bg-muted p-3">
                <div className="text-sm font-semibold text-foreground mb-2">{m.title}</div>
                <div className="space-y-2">
                  {m.items.map((it) => (
                    <a
                      key={it.url}
                      href={it.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl bg-background border border-border p-3 hover:bg-muted transition-colors"
                    >
                      <div className="text-sm font-medium text-foreground">{it.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{it.snippet}</div>
                      <div className="text-xs text-primary mt-2 truncate">{it.url}</div>
                    </a>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction({ type: "tab", tab: "activities" })}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Recos activités
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onAction({ type: "tab", tab: "flights" })}>
                    Vols
                  </Button>
                </div>
              </div>
            )}

            {m.kind === "calendar" && (
              <div className="rounded-2xl bg-muted p-3">
                <div className="text-sm font-semibold text-foreground mb-2">{m.title}</div>
                <div className="rounded-xl border border-border bg-background p-2">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      // Démo: validation des dates → onglet Vols
                      onAction({ type: "tab", tab: "flights" });
                      setShowCalendar(false);
                    }}
                    disabled={!selectedDate}
                  >
                    Valider
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCalendar(false)}>
                    Plus tard
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="p-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ex: "Je veux aller à New York"'
            className="min-h-[44px] max-h-28 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
            className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Astuce: écris “vols”, “activités”, “hôtel”, “New York”, “Paris”…
        </div>
      </footer>
    </aside>
  );
}
