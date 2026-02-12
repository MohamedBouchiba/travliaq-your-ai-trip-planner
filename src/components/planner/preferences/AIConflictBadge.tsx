/**
 * AI Conflict Badge Component
 * Shows when AI detected a preference different from manual value
 * Offers "Apply suggestion" button
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlannerEvent } from "@/lib/eventBus";

interface ConflictData {
  field: string;
  chatValue: unknown;
  manualValue: unknown;
}

interface AIConflictBadgeProps {
  onApply: (field: string, value: unknown) => void;
  className?: string;
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  travelStyle: "planner.ai.conflict.travelStyle",
  comfortLevel: "planner.ai.conflict.comfortLevel",
  pace: "planner.ai.conflict.pace",
  interests: "planner.ai.conflict.interests",
  occasion: "planner.ai.conflict.occasion",
  "styleAxes.chillVsIntense": "planner.ai.conflict.energy",
  "styleAxes.ecoVsLuxury": "planner.ai.conflict.budget",
  "styleAxes.cityVsNature": "planner.ai.conflict.environment",
  "styleAxes.touristVsLocal": "planner.ai.conflict.authenticity",
};

export function AIConflictBadge({ onApply, className }: AIConflictBadgeProps) {
  const { t } = useTranslation();
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  
  // Listen for conflict events
  usePlannerEvent("preferences:conflictDetected", (data) => {
    const conflict = data as ConflictData;
    setConflicts(prev => {
      // Avoid duplicates
      if (prev.some(c => c.field === conflict.field)) {
        return prev.map(c => c.field === conflict.field ? conflict : c);
      }
      return [...prev, conflict];
    });
  });

  const handleApply = (conflict: ConflictData) => {
    onApply(conflict.field, conflict.chatValue);
    setConflicts(prev => prev.filter(c => c.field !== conflict.field));
  };

  const handleDismiss = (field: string) => {
    setConflicts(prev => prev.filter(c => c.field !== field));
  };

  if (conflicts.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {conflicts.map((conflict) => (
        <div
          key={conflict.field}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 truncate">
                {t("planner.ai.suggests", { field: t(FIELD_LABEL_KEYS[conflict.field] || conflict.field) })}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {t("planner.ai.detectedValueDifferent")}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleApply(conflict)}
              className="p-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 transition-colors"
              title={t("planner.ai.applySuggestion")}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDismiss(conflict.field)}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
              title={t("planner.ai.ignore")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AIConflictBadge;
