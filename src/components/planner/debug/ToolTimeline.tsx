/**
 * ToolTimeline - Visual timeline of tool executions grouped by ReAct loop iteration
 */

import { memo, useMemo } from "react";
import { Check, X, Loader2, Clock, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolExecution } from "@/stores/debugStore";

interface ToolTimelineProps {
  executions: ToolExecution[];
}

interface LoopGroup {
  loopIteration: number;
  executions: ToolExecution[];
  totalLatency: number;
}

function ToolTimelineComponent({ executions }: ToolTimelineProps) {
  // Group by loopIteration
  const groups = useMemo<LoopGroup[]>(() => {
    const finished = executions.filter(e => e.status === "finished" || e.status === "failed");
    if (finished.length === 0) return [];

    const map = new Map<number, ToolExecution[]>();
    for (const exec of finished) {
      const loop = exec.loopIteration ?? 0;
      if (!map.has(loop)) map.set(loop, []);
      map.get(loop)!.push(exec);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([loopIteration, execs]) => ({
        loopIteration,
        executions: execs,
        totalLatency: execs.reduce((sum, e) => sum + (e.latency_ms || 0), 0),
      }));
  }, [executions]);

  if (executions.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No tool executions yet</p>
        <p className="text-xs mt-1">Tools will appear here as they execute</p>
      </div>
    );
  }

  // Show pending (started but not finished) tools
  const pending = executions.filter(e => e.status === "started");

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Execution Timeline
      </h4>
      
      {groups.map((group) => (
        <div key={group.loopIteration} className="space-y-1">
          {/* Loop header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Repeat className="h-3 w-3" />
            <span className="font-medium">Loop {group.loopIteration + 1}</span>
            <span className="text-[10px] opacity-70">
              ({group.executions.length} tools, {group.totalLatency}ms)
            </span>
          </div>
          
          {/* Tools in this loop */}
          <div className="ml-4 space-y-1">
            {group.executions.map((execution, index) => (
              <div
                key={`${execution.tool}-${execution.timestamp}-${index}`}
                className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Status Icon */}
                <div className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full",
                  execution.status === "finished" && "bg-green-500/10",
                  execution.status === "failed" && "bg-red-500/10",
                )}>
                  {execution.status === "finished" && <Check className="h-3 w-3 text-green-500" />}
                  {execution.status === "failed" && <X className="h-3 w-3 text-red-500" />}
                </div>
                
                {/* Tool Name */}
                <span className="font-mono text-xs flex-1 truncate">{execution.tool}</span>
                
                {/* Summary */}
                {execution.summary && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {execution.summary}
                  </span>
                )}
                
                {/* Latency */}
                {execution.latency_ms !== undefined && (
                  <span className={cn(
                    "text-[10px] font-mono",
                    execution.latency_ms < 100 && "text-green-500",
                    execution.latency_ms >= 100 && execution.latency_ms < 500 && "text-yellow-500",
                    execution.latency_ms >= 500 && "text-red-500",
                  )}>
                    {execution.latency_ms}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Pending tools */}
      {pending.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-blue-400 mb-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="font-medium">In Progress</span>
          </div>
          <div className="ml-4 space-y-1">
            {pending.map((execution, index) => (
              <div
                key={`pending-${execution.tool}-${index}`}
                className="flex items-center gap-3 py-1.5 px-3 rounded-md bg-blue-500/5"
              >
                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                <span className="font-mono text-xs flex-1 truncate">{execution.tool}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {groups.reduce((s, g) => s + g.executions.length, 0)} tools, {groups.length} loop{groups.length > 1 ? "s" : ""}
          </span>
          <span>
            {groups.reduce((s, g) => s + g.executions.filter(e => e.status === "finished").length, 0)} succeeded,{" "}
            {groups.reduce((s, g) => s + g.executions.filter(e => e.status === "failed").length, 0)} failed
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Total time: {groups.reduce((s, g) => s + g.totalLatency, 0)}ms
        </div>
      </div>
    </div>
  );
}

export const ToolTimeline = memo(ToolTimelineComponent);
