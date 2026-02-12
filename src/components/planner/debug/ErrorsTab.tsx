/**
 * ErrorsTab - Chronological timeline of all errors (stream, retry, widget, SSE)
 */

import { memo, useMemo } from "react";
import { AlertTriangle, RefreshCw, Puzzle, FileWarning, Wifi, Lock, Server, Clock, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDebugStore } from "@/stores/debugStore";

type ErrorKind = "stream" | "retry" | "widget" | "sse";

interface MergedError {
  timestamp: number;
  kind: ErrorKind;
  summary: string;
  detail?: string;
  badge: string;
  badgeClass: string;
}

const ERROR_TYPE_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  network: { icon: Wifi, color: "text-red-500" },
  auth: { icon: Lock, color: "text-orange-500" },
  server: { icon: Server, color: "text-red-500" },
  rate_limit: { icon: Ban, color: "text-yellow-500" },
  timeout: { icon: Clock, color: "text-yellow-500" },
  cancelled: { icon: Ban, color: "text-muted-foreground" },
  unknown: { icon: AlertTriangle, color: "text-red-500" },
};

function ErrorsTabComponent() {
  const { streamErrors, retryAttempts, widgetErrors, sseParseErrors } = useDebugStore();

  const allErrors = useMemo<MergedError[]>(() => {
    const merged: MergedError[] = [];

    for (const e of streamErrors) {
      merged.push({
        timestamp: e.timestamp,
        kind: "stream",
        summary: `${e.type}: ${e.message}`,
        detail: e.statusCode ? `HTTP ${e.statusCode}${e.retryable ? " (retryable)" : ""}` : e.retryable ? "(retryable)" : undefined,
        badge: e.type,
        badgeClass: e.type === "cancelled" ? "bg-muted text-muted-foreground" :
          e.type === "rate_limit" || e.type === "timeout" ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" :
          "bg-red-500/10 text-red-600 border-red-500/30",
      });
    }

    for (const r of retryAttempts) {
      merged.push({
        timestamp: r.timestamp,
        kind: "retry",
        summary: `Retry ${r.attempt}/${r.maxRetries}`,
        detail: `delay: ${r.delayMs}ms`,
        badge: "retry",
        badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      });
    }

    for (const w of widgetErrors) {
      merged.push({
        timestamp: w.timestamp,
        kind: "widget",
        summary: `Widget "${w.widgetName}": ${w.errorMessage}`,
        detail: w.componentStack?.slice(0, 150),
        badge: "widget",
        badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/30",
      });
    }

    for (const s of sseParseErrors) {
      merged.push({
        timestamp: s.timestamp,
        kind: "sse",
        summary: `SSE parse error`,
        detail: s.rawData.slice(0, 100),
        badge: "SSE",
        badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/30",
      });
    }

    return merged.sort((a, b) => a.timestamp - b.timestamp);
  }, [streamErrors, retryAttempts, widgetErrors, sseParseErrors]);

  if (allErrors.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No errors recorded</p>
        <p className="text-xs mt-1">Errors will appear here when they occur</p>
      </div>
    );
  }

  const streamCount = streamErrors.length;
  const retryCount = retryAttempts.length;
  const widgetCount = widgetErrors.length;
  const sseCount = sseParseErrors.length;

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
        {streamCount > 0 && (
          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30">
            {streamCount} stream
          </Badge>
        )}
        {retryCount > 0 && (
          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
            {retryCount} retry
          </Badge>
        )}
        {widgetCount > 0 && (
          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">
            {widgetCount} widget
          </Badge>
        )}
        {sseCount > 0 && (
          <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
            {sseCount} SSE
          </Badge>
        )}
      </div>

      {/* Error timeline */}
      <div className="space-y-1.5">
        {allErrors.map((error, index) => {
          const time = new Date(error.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          const config = ERROR_TYPE_CONFIG[error.badge] || ERROR_TYPE_CONFIG.unknown;
          const Icon = error.kind === "retry" ? RefreshCw : error.kind === "widget" ? Puzzle : error.kind === "sse" ? FileWarning : config.icon;

          return (
            <div
              key={`${error.kind}-${error.timestamp}-${index}`}
              className="flex items-start gap-2 py-1.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", error.kind === "retry" ? "text-blue-500" : config.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4", error.badgeClass)}>
                    {error.badge}
                  </Badge>
                </div>
                <p className="text-xs mt-0.5 break-words">{error.summary}</p>
                {error.detail && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono break-all">{error.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ErrorsTab = memo(ErrorsTabComponent);
export default ErrorsTab;
