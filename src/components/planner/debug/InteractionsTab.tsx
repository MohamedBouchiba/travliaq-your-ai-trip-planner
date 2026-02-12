/**
 * InteractionsTab - Chronological timeline of user interactions, eventBus events, and phase transitions
 */

import { memo, useMemo, useState } from "react";
import { MousePointer, Radio, ArrowRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDebugStore } from "@/stores/debugStore";

type EntryKind = "interaction" | "event" | "phase";

interface MergedEntry {
  timestamp: number;
  kind: EntryKind;
  summary: string;
  detail?: string;
  badge: string;
  badgeClass: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  widget: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  quickReply: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  suggestion: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  search: "bg-green-500/10 text-green-600 border-green-500/30",
};

const EVENT_COLORS: Record<string, string> = {
  "tab:": "bg-slate-500/10 text-slate-600 border-slate-500/30",
  "flight:": "bg-sky-500/10 text-sky-600 border-sky-500/30",
  "destination:": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "sync:": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "hotels:": "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  "activities:": "bg-pink-500/10 text-pink-600 border-pink-500/30",
  "preferences:": "bg-violet-500/10 text-violet-600 border-violet-500/30",
  "chat:": "bg-teal-500/10 text-teal-600 border-teal-500/30",
  "map:": "bg-lime-500/10 text-lime-600 border-lime-500/30",
  "budget:": "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  "filters:": "bg-gray-500/10 text-gray-600 border-gray-500/30",
  "location:": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
};

function getEventColor(event: string): string {
  for (const [prefix, color] of Object.entries(EVENT_COLORS)) {
    if (event.startsWith(prefix)) return color;
  }
  return "bg-muted text-muted-foreground";
}

function InteractionsTabComponent() {
  const { userInteractions, eventBusLog, phaseHistory } = useDebugStore();
  const [showInteractions, setShowInteractions] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showPhases, setShowPhases] = useState(true);

  const allEntries = useMemo<MergedEntry[]>(() => {
    const merged: MergedEntry[] = [];

    if (showInteractions) {
      for (const i of userInteractions) {
        merged.push({
          timestamp: i.timestamp,
          kind: "interaction",
          summary: i.detail || `${i.category}:${i.action}`,
          badge: i.category,
          badgeClass: CATEGORY_COLORS[i.category] || "bg-muted text-muted-foreground",
        });
      }
    }

    if (showEvents) {
      for (const e of eventBusLog) {
        const payloadStr = e.payload ? JSON.stringify(e.payload) : "";
        merged.push({
          timestamp: e.timestamp,
          kind: "event",
          summary: e.event,
          detail: payloadStr.length > 2 ? payloadStr.slice(0, 120) : undefined,
          badge: e.event.split(":")[0],
          badgeClass: getEventColor(e.event),
        });
      }
    }

    if (showPhases) {
      for (const p of phaseHistory) {
        merged.push({
          timestamp: p.timestamp,
          kind: "phase",
          summary: `${p.fromPhase || "start"} → ${p.toPhase}`,
          detail: `confidence: ${p.confidence}%`,
          badge: "phase",
          badgeClass: "bg-green-500/10 text-green-600 border-green-500/30",
        });
      }
    }

    return merged.sort((a, b) => a.timestamp - b.timestamp);
  }, [userInteractions, eventBusLog, phaseHistory, showInteractions, showEvents, showPhases]);

  const totalCount = userInteractions.length + eventBusLog.length + phaseHistory.length;

  if (totalCount === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No events recorded</p>
        <p className="text-xs mt-1">Interactions and events will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter toggles */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-border">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <button
          onClick={() => setShowInteractions(!showInteractions)}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
            showInteractions
              ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
              : "bg-muted/50 text-muted-foreground border-border"
          )}
        >
          Widgets ({userInteractions.length})
        </button>
        <button
          onClick={() => setShowEvents(!showEvents)}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
            showEvents
              ? "bg-sky-500/10 text-sky-600 border-sky-500/30"
              : "bg-muted/50 text-muted-foreground border-border"
          )}
        >
          EventBus ({eventBusLog.length})
        </button>
        <button
          onClick={() => setShowPhases(!showPhases)}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
            showPhases
              ? "bg-green-500/10 text-green-600 border-green-500/30"
              : "bg-muted/50 text-muted-foreground border-border"
          )}
        >
          Phases ({phaseHistory.length})
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-1.5">
        {allEntries.map((entry, index) => {
          const time = new Date(entry.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const Icon = entry.kind === "interaction" ? MousePointer : entry.kind === "phase" ? ArrowRight : Radio;

          return (
            <div
              key={`${entry.kind}-${entry.timestamp}-${index}`}
              className="flex items-start gap-2 py-1.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0",
                entry.kind === "interaction" ? "text-purple-500" :
                entry.kind === "phase" ? "text-green-500" :
                "text-sky-500"
              )} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4", entry.badgeClass)}>
                    {entry.badge}
                  </Badge>
                </div>
                <p className="text-xs mt-0.5 break-words">{entry.summary}</p>
                {entry.detail && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono break-all">{entry.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
        Showing {allEntries.length} of {totalCount} events
      </div>
    </div>
  );
}

export const InteractionsTab = memo(InteractionsTabComponent);
export default InteractionsTab;
