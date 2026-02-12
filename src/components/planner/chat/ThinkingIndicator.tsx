/**
 * ThinkingIndicator - Shows AI is reasoning before responding
 * 
 * Displays a thinking animation with optional reasoning breakdown.
 */

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Sparkles, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export interface ReasoningData {
  understanding?: string;
  contextAnalysis?: string;
  responseStrategy?: string;
  keyInsights?: string[];
  anticipatedNextSteps?: string[];
  confidence?: number;
}

interface ThinkingIndicatorProps {
  isThinking: boolean;
  reasoning?: ReasoningData | null;
  showDebug?: boolean;
  className?: string;
}

const ThinkingIndicatorComponent = ({
  isThinking,
  reasoning,
  showDebug = false,
  className,
}: ThinkingIndicatorProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasReasoning = reasoning && (reasoning.understanding || reasoning.keyInsights?.length);

  if (!isThinking && !hasReasoning) return null;

  return (
    <AnimatePresence>
      {isThinking && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-2xl",
            "bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5",
            "border border-primary/10",
            "max-w-[85%] ml-2",
            className
          )}
          role="status"
          aria-live="polite"
          aria-label={t("planner.chat.assistantThinking")}
        >
          {/* Animated brain icon */}
          <div className="relative flex-shrink-0 mt-0.5">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <Brain className="w-5 h-5 text-primary" />
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-1 -right-1"
              >
                <Sparkles className="w-3 h-3 text-accent" />
              </motion.div>
            </motion.div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Main thinking text */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground/80">
                {t("planner.thinking.analyzing", "Réflexion en cours")}
              </span>
              
              {/* Animated dots */}
              <div className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                  />
                ))}
              </div>

              {/* Expand button (only in debug mode with reasoning) */}
              {showDebug && hasReasoning && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>

            {/* Thinking steps preview (always visible when thinking) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 flex flex-wrap gap-1.5"
            >
              {[
                { label: t("planner.thinking.understanding", "Comprendre"), delay: 0 },
                { label: t("planner.thinking.analyzing", "Analyser"), delay: 0.8 },
                { label: t("planner.thinking.planning", "Planifier"), delay: 1.6 },
              ].map((step, i) => (
                <motion.span
                  key={step.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: step.delay }}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs",
                    "bg-primary/10 text-primary/70",
                    "border border-primary/20"
                  )}
                >
                  {step.label}
                </motion.span>
              ))}
            </motion.div>

            {/* Expanded reasoning (debug mode) */}
            <AnimatePresence>
              {showDebug && isExpanded && reasoning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-primary/10 space-y-2"
                >
                  {reasoning.understanding && (
                    <div className="text-xs">
                      <span className="font-medium text-primary">Compréhension:</span>
                      <span className="ml-2 text-muted-foreground">{reasoning.understanding}</span>
                    </div>
                  )}
                  
                  {reasoning.keyInsights && reasoning.keyInsights.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium text-primary">Insights:</span>
                      <ul className="ml-4 mt-1 space-y-0.5 text-muted-foreground">
                        {reasoning.keyInsights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-accent" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reasoning.confidence !== undefined && (
                    <div className="text-xs flex items-center gap-2">
                      <span className="font-medium text-primary">Confiance:</span>
                      <div className="flex-1 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${reasoning.confidence}%` }}
                          className={cn(
                            "h-full rounded-full",
                            reasoning.confidence >= 70 ? "bg-green-500" :
                            reasoning.confidence >= 40 ? "bg-yellow-500" : "bg-red-500"
                          )}
                        />
                      </div>
                      <span className="text-muted-foreground">{reasoning.confidence}%</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ThinkingIndicator = memo(ThinkingIndicatorComponent);
export default ThinkingIndicator;
