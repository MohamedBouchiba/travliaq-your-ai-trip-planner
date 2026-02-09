/**
 * ToolTimeline - Visual timeline of tool executions
 */

import { memo } from "react";
import { Check, X, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolExecution } from "@/stores/debugStore";

interface ToolTimelineProps {
  executions: ToolExecution[];
}

function ToolTimelineComponent({ executions }: ToolTimelineProps) {
  if (executions.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No tool executions yet</p>
        <p className="text-xs mt-1">Tools will appear here as they execute</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Execution Timeline
      </h4>
      
      <div className="space-y-1">
        {executions.map((execution, index) => (
          <div
            key={`${execution.tool}-${execution.timestamp}-${index}`}
            className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            {/* Status Icon */}
            <div className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full",
              execution.status === "finished" && "bg-green-500/10",
              execution.status === "failed" && "bg-red-500/10",
              execution.status === "started" && "bg-blue-500/10",
            )}>
              {execution.status === "finished" && <Check className="h-3 w-3 text-green-500" />}
              {execution.status === "failed" && <X className="h-3 w-3 text-red-500" />}
              {execution.status === "started" && <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />}
            </div>
            
            {/* Tool Name */}
            <span className="font-mono text-xs flex-1 truncate">{execution.tool}</span>
            
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
      
      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total: {executions.length} tools</span>
          <span>
            {executions.filter(e => e.status === "finished").length} succeeded,{" "}
            {executions.filter(e => e.status === "failed").length} failed
          </span>
        </div>
        {executions.length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            Total time: {
              executions
                .filter(e => e.latency_ms !== undefined)
                .reduce((sum, e) => sum + (e.latency_ms || 0), 0)
            }ms
          </div>
        )}
      </div>
    </div>
  );
}

export const ToolTimeline = memo(ToolTimelineComponent);
