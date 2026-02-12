/**
 * ToolStatusIndicator - Displays real-time status of AI tool execution
 * 
 * Shows which tools are currently running during chat processing,
 * providing transparency into the AI's reasoning process.
 */

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle, Brain, Plane, MessageSquare, MapPin, Calendar, Users, Search, Sparkles, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

/**
 * Tool status type
 */
export type ToolStatus = "pending" | "running" | "success" | "error";

/**
 * Tool execution state
 */
export interface ToolExecution {
  name: string;
  status: ToolStatus;
  startTime?: number;
  duration?: number;
  summary?: string;
  reason?: string;
}

/**
 * Props for ToolStatusIndicator
 */
interface ToolStatusIndicatorProps {
  tools: ToolExecution[];
  className?: string;
  compact?: boolean;
}

/**
 * Tool icon/color config (static, no i18n needed)
 */
const TOOL_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  classify_intent: { icon: Brain, color: "text-purple-500" },
  plan_response: { icon: Sparkles, color: "text-amber-500" },
  update_flight_widget: { icon: Plane, color: "text-sky-500" },
  update_accommodation_widget: { icon: Hotel, color: "text-emerald-500" },
  update_preferences: { icon: Users, color: "text-pink-500" },
  generate_quick_replies: { icon: MessageSquare, color: "text-indigo-500" },
  request_destination_suggestions: { icon: MapPin, color: "text-rose-500" },
  trigger_flight_search: { icon: Search, color: "text-teal-500" },
};

const TOOL_LABEL_KEYS: Record<string, string> = {
  classify_intent: "planner.tool.analyze",
  plan_response: "planner.tool.thinking",
  update_flight_widget: "planner.tool.flight",
  update_accommodation_widget: "planner.tool.accommodation",
  update_preferences: "planner.tool.preferences",
  generate_quick_replies: "planner.tool.suggestions",
  request_destination_suggestions: "planner.tool.destinations",
  trigger_flight_search: "planner.tool.search",
};

const DEFAULT_ICON = { icon: Brain, color: "text-muted-foreground" };

/**
 * Get tool config with i18n label
 */
function getToolConfig(toolName: string, t: TFunction) {
  const iconConfig = TOOL_ICONS[toolName] || DEFAULT_ICON;
  const labelKey = TOOL_LABEL_KEYS[toolName];
  const label = labelKey ? t(labelKey) : toolName;
  return { ...iconConfig, label };
}

/**
 * Status icon component
 */
function StatusIcon({ status, className }: { status: ToolStatus; className?: string }) {
  switch (status) {
    case "running":
      return <Loader2 className={cn("h-3 w-3 animate-spin", className)} />;
    case "success":
      return <CheckCircle className={cn("h-3 w-3 text-accent-foreground", className)} />;
    case "error":
      return <AlertCircle className={cn("h-3 w-3 text-destructive", className)} />;
    default:
      return null;
  }
}

/**
 * Individual tool status item
 */
const ToolItem = memo(function ToolItem({
  tool,
  compact,
  t,
}: {
  tool: ToolExecution;
  compact: boolean;
  t: TFunction;
}) {
  const config = getToolConfig(tool.name, t);
  const Icon = config.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      aria-label={`${config.label}: ${tool.status}`}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1",
        "bg-muted/50 border border-border/50",
        tool.status === "running" && "bg-primary/5 border-primary/20",
        tool.status === "success" && "bg-accent/50 border-accent",
        tool.status === "error" && "bg-destructive/5 border-destructive/20"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", config.color)} />
      
      {!compact && (
        <span className="text-xs text-muted-foreground">
          {config.label}
        </span>
      )}
      
      <StatusIcon status={tool.status} />
      
      {tool.duration && tool.status === "success" && !compact && (
        <span className="text-[10px] text-muted-foreground/70">
          {tool.duration}ms
        </span>
      )}
    </motion.div>
  );
});

/**
 * Main ToolStatusIndicator component
 */
export const ToolStatusIndicator = memo(function ToolStatusIndicator({
  tools,
  className,
  compact = false,
}: ToolStatusIndicatorProps) {
  const { t } = useTranslation();
  // Filter to show running and recently completed tools
  const visibleTools = tools.filter(tool =>
    tool.status === "running" ||
    tool.status === "pending" ||
    (tool.status === "success" && tool.duration !== undefined)
  );
  
  if (visibleTools.length === 0) {
    return null;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {visibleTools.map((tool) => (
          <ToolItem
            key={`${tool.name}-${tool.startTime}`}
            tool={tool}
            compact={compact}
            t={t}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

export default ToolStatusIndicator;
