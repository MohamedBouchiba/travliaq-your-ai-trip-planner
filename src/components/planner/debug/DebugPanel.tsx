/**
 * DebugPanel - Main debug panel for developer insights
 * 
 * Shows:
 * - Intent classification with confidence
 * - Tool execution timeline
 * - Flow state
 * - Memory context
 * - Raw response viewer
 */

import { useState, useEffect, memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bug, Brain, Wrench, Database, FileJson, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebugStore } from "@/stores/debugStore";
import { ToolTimeline } from "./ToolTimeline";
import { MemoryInspector } from "./MemoryInspector";
import { RawResponseViewer } from "./RawResponseViewer";

function DebugPanelComponent() {
  const { 
    lastIntent, 
    toolExecutions, 
    flowState, 
    memoryContext, 
    rawResponses,
    reasoning,
  } = useDebugStore();
  
  const [activeTab, setActiveTab] = useState("intent");

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Bug className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Debug Panel</span>
        <Badge variant="outline" className="ml-auto text-xs">DEV</Badge>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="intent" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            <Brain className="h-3 w-3 mr-1.5" />
            Intent
          </TabsTrigger>
          <TabsTrigger 
            value="tools"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            <Wrench className="h-3 w-3 mr-1.5" />
            Tools
          </TabsTrigger>
          <TabsTrigger 
            value="memory"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            <Database className="h-3 w-3 mr-1.5" />
            Memory
          </TabsTrigger>
          <TabsTrigger 
            value="raw"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 text-xs"
          >
            <FileJson className="h-3 w-3 mr-1.5" />
            Raw
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
          
          {/* Memory Tab */}
          <TabsContent value="memory" className="m-0 p-4">
            <MemoryInspector context={memoryContext} />
          </TabsContent>
          
          {/* Raw Tab */}
          <TabsContent value="raw" className="m-0 p-4">
            <RawResponseViewer responses={rawResponses} />
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
