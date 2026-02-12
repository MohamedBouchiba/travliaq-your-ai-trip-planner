/**
 * DebugPanel - Main debug panel for developer insights
 *
 * Shows:
 * - Intent classification with confidence + history
 * - Tool execution timeline
 * - Flow state
 * - Memory context
 * - Raw response viewer
 * - Error tracking (stream, retry, widget, SSE)
 * - User interactions & eventBus events
 * - Structured report copy
 */

import { useState, memo, lazy, Suspense } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bug, Brain, Wrench, Database, FileJson, Clock, Copy, Check, AlertTriangle, Radio, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebugStore } from "@/stores/debugStore";
import { Button } from "@/components/ui/button";
import { toastSuccess } from "@/lib/toast";
import { ToolTimeline } from "./ToolTimeline";
import { MemoryInspector } from "./MemoryInspector";
import { RawResponseViewer } from "./RawResponseViewer";

const MessageTimeline = lazy(() => import("./MessageTimeline"));
const ErrorsTab = lazy(() => import("./ErrorsTab"));
const InteractionsTab = lazy(() => import("./InteractionsTab"));

const TAB_CLASS = "rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-2 text-xs";

function DebugPanelComponent() {
  const {
    lastIntent,
    toolExecutions,
    flowState,
    memoryContext,
    rawResponses,
    reasoning,
    messageTimeline,
    blockedActions,
    streamErrors,
    widgetErrors,
    sseParseErrors,
    retryAttempts,
    intentHistory,
    phaseHistory,
    userInteractions,
    eventBusLog,
  } = useDebugStore();

  const [activeTab, setActiveTab] = useState("intent");
  const [copied, setCopied] = useState(false);
  const [showIntentHistory, setShowIntentHistory] = useState(false);

  const errorCount = streamErrors.length + widgetErrors.length + sseParseErrors.length;
  const eventsCount = userInteractions.length + eventBusLog.length + phaseHistory.length;

  const handleCopyDebugInfo = () => {
    const state = useDebugStore.getState();

    // Build unified chronological timeline
    type TimelineEntry = { timestamp: number; category: string; summary: string; detail?: string };
    const timeline: TimelineEntry[] = [];

    // Messages (full text)
    for (const m of state.messageTimeline) {
      timeline.push({
        timestamp: m.timestamp,
        category: "MESSAGE",
        summary: `[${m.role.toUpperCase()}] ${m.fullText || m.textPreview}`,
        detail: m.widget ? JSON.stringify({ widget: m.widget, confirmed: m.widgetConfirmed, widgetData: m.widgetData }) : undefined,
      });
      if (m.suggestionsShown?.length) {
        timeline.push({
          timestamp: m.timestamp + 1,
          category: "SUGGESTIONS",
          summary: `Suggestions: ${m.suggestionsShown.join(", ")}`,
        });
      }
    }

    // Intent history
    for (const e of state.intentHistory) {
      timeline.push({
        timestamp: e.timestamp,
        category: "INTENT",
        summary: `${e.intent.primaryIntent} (${e.intent.confidence}%, source: ${e.source})`,
        detail: e.intent.widgetToShow ? JSON.stringify(e.intent.widgetToShow) : undefined,
      });
    }

    // Phase transitions
    for (const p of state.phaseHistory) {
      timeline.push({
        timestamp: p.timestamp,
        category: "PHASE",
        summary: `${p.fromPhase || "none"} -> ${p.toPhase} (confidence: ${p.confidence}%)`,
      });
    }

    // Tool executions
    for (const t of state.toolExecutions) {
      timeline.push({
        timestamp: t.timestamp,
        category: "TOOL",
        summary: `${t.tool} [${t.status}]${t.latency_ms ? ` ${t.latency_ms}ms` : ""}${t.summary ? ` - ${t.summary}` : ""}`,
      });
    }

    // Stream errors
    for (const e of state.streamErrors) {
      timeline.push({
        timestamp: e.timestamp,
        category: "ERROR",
        summary: `${e.type}: ${e.message}${e.statusCode ? ` (HTTP ${e.statusCode})` : ""}${e.retryable ? " [retryable]" : ""}`,
      });
    }

    // Retries
    for (const r of state.retryAttempts) {
      timeline.push({
        timestamp: r.timestamp,
        category: "RETRY",
        summary: `Attempt ${r.attempt}/${r.maxRetries}, delay ${r.delayMs}ms`,
      });
    }

    // Widget errors
    for (const w of state.widgetErrors) {
      timeline.push({
        timestamp: w.timestamp,
        category: "WIDGET_ERROR",
        summary: `${w.widgetName}: ${w.errorMessage}`,
      });
    }

    // SSE parse errors
    for (const e of state.sseParseErrors) {
      timeline.push({
        timestamp: e.timestamp,
        category: "SSE_ERROR",
        summary: `Parse error: ${e.rawData.slice(0, 80)}`,
      });
    }

    // User interactions
    for (const i of state.userInteractions) {
      timeline.push({
        timestamp: i.timestamp,
        category: "INTERACTION",
        summary: i.detail || `${i.category}:${i.action}${i.widgetType ? ` (${i.widgetType})` : ""}`,
      });
    }

    // Blocked actions
    for (const a of state.blockedActions) {
      timeline.push({
        timestamp: a.timestamp,
        category: "BLOCKED",
        summary: `${a.type} -> ${a.widgetType}:"${a.option}" - ${a.reason}`,
      });
    }

    // EventBus events
    for (const e of state.eventBusLog) {
      const payloadStr = e.payload ? JSON.stringify(e.payload) : "";
      timeline.push({
        timestamp: e.timestamp,
        category: "EVENT",
        summary: `${e.event}${payloadStr.length > 2 ? ": " + payloadStr.slice(0, 120) : ""}`,
      });
    }

    // Sort chronologically
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    // Format the report
    const header = [
      "=== Travliaq Debug Report ===",
      `Generated: ${new Date().toISOString()}`,
      `Session messages: ${state.messageTimeline.length}`,
      `Errors: ${state.streamErrors.length} stream, ${state.widgetErrors.length} widget, ${state.sseParseErrors.length} SSE`,
      `Retries: ${state.retryAttempts.length}`,
      `Tool executions: ${state.toolExecutions.length}`,
      `Intents classified: ${state.intentHistory.length}`,
      `Phase transitions: ${state.phaseHistory.length}`,
      `User interactions: ${state.userInteractions.length}`,
      `EventBus events: ${state.eventBusLog.length}`,
      `Blocked actions: ${state.blockedActions.length}`,
      "",
      "--- Current State ---",
      `Phase: ${state.memoryContext?.currentPhase || "unknown"}`,
      `Flow: ${state.flowState ? JSON.stringify(state.flowState) : "null"}`,
      `Last Intent: ${state.lastIntent?.primaryIntent || "none"} (${state.lastIntent?.confidence || 0}%)`,
      `Blocked Widgets: ${state.memoryContext?.blockedWidgets?.join(", ") || "none"}`,
      `Missing Fields: ${state.memoryContext?.missingFields?.join(", ") || "none"}`,
      "",
      "--- Chronological Timeline ---",
      "",
    ].join("\n");

    const body = timeline.map(e => {
      const time = new Date(e.timestamp).toISOString().slice(11, 23); // HH:mm:ss.SSS
      const line = `[${time}] [${e.category}] ${e.summary}`;
      if (e.detail) {
        return line + "\n         " + e.detail.slice(0, 300);
      }
      return line;
    }).join("\n");

    const footer = [
      "",
      "",
      "--- Raw Data (JSON) ---",
      JSON.stringify({
        memoryContext: state.memoryContext,
        lastReasoning: state.reasoning,
        rawResponses: state.rawResponses.map(r => ({ requestId: r.requestId, data: r.data })),
      }, null, 2),
    ].join("\n");

    const report = header + body + footer;

    navigator.clipboard.writeText(report);
    setCopied(true);
    toastSuccess("Debug report copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Bug className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Debug Panel</span>
        <Badge variant="outline" className="ml-auto text-xs">DEV</Badge>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopyDebugInfo}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border h-auto p-0 bg-transparent overflow-x-auto">
          <TabsTrigger value="intent" className={TAB_CLASS}>
            <Brain className="h-3 w-3 mr-1" />
            Intent
          </TabsTrigger>
          <TabsTrigger value="tools" className={TAB_CLASS}>
            <Wrench className="h-3 w-3 mr-1" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="errors" className={TAB_CLASS}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Errors
            {errorCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0 h-4">{errorCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className={TAB_CLASS}>
            <Radio className="h-3 w-3 mr-1" />
            Events
            {eventsCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4">{eventsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="memory" className={TAB_CLASS}>
            <Database className="h-3 w-3 mr-1" />
            Memory
          </TabsTrigger>
          <TabsTrigger value="raw" className={TAB_CLASS}>
            <FileJson className="h-3 w-3 mr-1" />
            Raw
          </TabsTrigger>
          <TabsTrigger value="timeline" className={TAB_CLASS}>
            <Clock className="h-3 w-3 mr-1" />
            Timeline
            {messageTimeline.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-4">{messageTimeline.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Intent Tab */}
          <TabsContent value="intent" className="m-0 p-4 space-y-4">
            {lastIntent ? (
              <>
                {/* Primary Intent */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary Intent</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {lastIntent.primaryIntent}
                    </Badge>
                    <ConfidenceBadge confidence={lastIntent.confidence} />
                  </div>
                </div>

                {/* Widget Decision */}
                {lastIntent.widgetToShow && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Widget Decision</h4>
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Type:</span>
                        <Badge variant="outline" className="font-mono text-primary">
                          {lastIntent.widgetToShow.type}
                        </Badge>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground">Reason:</span>
                        <span className="text-xs">{lastIntent.widgetToShow.reason}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Entities */}
                {lastIntent.entities && Object.keys(lastIntent.entities).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entities</h4>
                    <div className="bg-muted/50 rounded-md p-3 space-y-1">
                      {Object.entries(lastIntent.entities)
                        .filter(([_, v]) => v !== null && v !== undefined && v !== "")
                        .map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground font-mono">{key}:</span>
                            <span className="font-mono break-all">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Reasoning (if available) */}
                {reasoning && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chain of Thought</h4>
                    <div className="bg-muted/50 rounded-md p-3 space-y-2 text-xs">
                      {reasoning.understanding && (
                        <div>
                          <span className="text-muted-foreground">Understanding:</span>
                          <p className="mt-1">{reasoning.understanding}</p>
                        </div>
                      )}
                      {reasoning.responseStrategy && (
                        <div>
                          <span className="text-muted-foreground">Strategy:</span>
                          <p className="mt-1">{reasoning.responseStrategy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Flow State */}
                {flowState && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Flow State</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(flowState)
                        .filter(([key]) => key.startsWith("has") || key === "isReadyToSearch")
                        .map(([key, value]) => (
                          <Badge
                            key={key}
                            variant={value ? "default" : "outline"}
                            className={cn(
                              "text-[10px] font-mono",
                              value ? "bg-green-500/10 text-green-600 border-green-500/30" : "text-muted-foreground"
                            )}
                          >
                            {key.replace("has", "").replace("isReadyToSearch", "ready")}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {/* Intent History (collapsible) */}
                {intentHistory.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowIntentHistory(!showIntentHistory)}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                    >
                      {showIntentHistory ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      Intent History ({intentHistory.length})
                    </button>
                    {showIntentHistory && (
                      <div className="space-y-1 ml-1">
                        {intentHistory.slice().reverse().map((entry, i) => {
                          const time = new Date(entry.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          return (
                            <div key={`${entry.timestamp}-${i}`} className="flex items-center gap-2 py-1 px-2 rounded bg-muted/30 text-xs">
                              <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
                              <Badge variant="secondary" className="font-mono text-[10px]">{entry.intent.primaryIntent}</Badge>
                              <ConfidenceBadge confidence={entry.intent.confidence} />
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{entry.source}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No intent classification yet</p>
                <p className="text-xs mt-1">Send a message to see intent analysis</p>
              </div>
            )}
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="m-0 p-4">
            <ToolTimeline executions={toolExecutions} />
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="m-0 p-4">
            <Suspense fallback={<div className="text-center text-muted-foreground text-xs py-4">Loading...</div>}>
              <ErrorsTab />
            </Suspense>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="m-0 p-4">
            <Suspense fallback={<div className="text-center text-muted-foreground text-xs py-4">Loading...</div>}>
              <InteractionsTab />
            </Suspense>
          </TabsContent>

          {/* Memory Tab */}
          <TabsContent value="memory" className="m-0 p-4">
            <MemoryInspector context={memoryContext} />
          </TabsContent>

          {/* Raw Tab */}
          <TabsContent value="raw" className="m-0 p-4">
            <RawResponseViewer responses={rawResponses} />
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="m-0 p-4">
            <Suspense fallback={<div className="text-center text-muted-foreground text-xs py-4">Chargement...</div>}>
              <MessageTimeline />
            </Suspense>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidence >= 80 ? "high" : confidence >= 60 ? "medium" : "low";
  const colors = {
    high: "bg-green-500/10 text-green-600 border-green-500/30",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    low: "bg-red-500/10 text-red-600 border-red-500/30",
  };

  return (
    <Badge variant="outline" className={cn("font-mono text-xs", colors[level])}>
      {confidence}%
    </Badge>
  );
}

export default memo(DebugPanelComponent);
