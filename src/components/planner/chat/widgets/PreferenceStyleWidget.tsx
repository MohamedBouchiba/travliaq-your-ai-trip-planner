/**
 * PreferenceStyleWidget - Style sliders for chat flow
 * With drag & drop reordering for priority
 * Syncs with PreferenceMemory context
 */

import { memo, useCallback, useMemo } from "react";
import { Sliders, ArrowRight, GripVertical, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reorder, useDragControls } from "framer-motion";
import { DualSlider } from "@/components/ui/dual-slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePreferenceMemoryStore, type StyleAxes } from "@/stores/hooks";
import { cn } from "@/lib/utils";

interface PreferenceStyleWidgetProps {
  onContinue?: () => void;
}

const AXES_LABELS: Record<keyof StyleAxes, {
  leftLabelKey: string;
  rightLabelKey: string;
  leftEmoji: string;
  rightEmoji: string;
}> = {
  chillVsIntense: { leftLabelKey: "planner.style.chill", rightLabelKey: "planner.style.intense", leftEmoji: "🧘", rightEmoji: "🏃" },
  cityVsNature: { leftLabelKey: "planner.style.urban", rightLabelKey: "planner.style.nature", leftEmoji: "🏙️", rightEmoji: "🌲" },
  ecoVsLuxury: { leftLabelKey: "planner.style.budget", rightLabelKey: "planner.style.luxury", leftEmoji: "💰", rightEmoji: "✨" },
  touristVsLocal: { leftLabelKey: "planner.style.tourist", rightLabelKey: "planner.style.authentic", leftEmoji: "📸", rightEmoji: "🏠" },
};

interface ChatDraggableAxisProps {
  axisKey: keyof StyleAxes;
  rank: number;
  value: number;
  onChange: (key: keyof StyleAxes, value: number) => void;
}

const ChatDraggableAxis = memo(function ChatDraggableAxis({ axisKey, rank, value, onChange }: ChatDraggableAxisProps) {
  const { t } = useTranslation();
  const controls = useDragControls();
  const { leftLabelKey, rightLabelKey, leftEmoji, rightEmoji } = AXES_LABELS[axisKey];

  return (
    <Reorder.Item
      value={axisKey}
      dragListener={false}
      dragControls={controls}
      className="group flex items-center gap-2 py-1 px-1.5 bg-muted/5 rounded-lg"
      whileDrag={{ scale: 1.02, boxShadow: "0 4px 16px hsl(var(--primary) / 0.15)", zIndex: 10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Drag handle + rank */}
      <div
        className="flex items-center gap-0.5 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={(e) => controls.start(e)}
      >
        <span className={cn(
          "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
          "bg-primary/15 text-primary"
        )}>
          {rank}
        </span>
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Left label */}
      <div className="flex items-center gap-1.5 w-[100px] justify-end">
        <span className="text-base">{leftEmoji}</span>
        <span className={cn(
          "text-xs font-medium transition-colors",
          value < 40 ? "text-foreground" : "text-muted-foreground"
        )}>
          {t(leftLabelKey)}
        </span>
      </div>

      {/* Slider */}
      <div className="flex-1">
        <DualSlider
          value={[value]}
          onValueChange={([v]) => onChange(axisKey, v)}
          max={100}
          step={1}
        />
      </div>

      {/* Right label */}
      <div className="flex items-center gap-1.5 w-[100px]">
        <span className={cn(
          "text-xs font-medium transition-colors",
          value > 60 ? "text-foreground" : "text-muted-foreground"
        )}>
          {t(rightLabelKey)}
        </span>
        <span className="text-base">{rightEmoji}</span>
      </div>
    </Reorder.Item>
  );
});

export const PreferenceStyleWidget = memo(function PreferenceStyleWidget({
  onContinue,
}: PreferenceStyleWidgetProps) {
  const { t } = useTranslation();
  const { memory, setStyleAxis, setStyleAxesOrder } = usePreferenceMemoryStore();
  const axes = memory.preferences.styleAxes;
  const axesOrder = memory.preferences.styleAxesOrder;

  const handleAxisChange = useCallback((key: keyof StyleAxes, value: number) => {
    setStyleAxis(key, value);
  }, [setStyleAxis]);

  const safeOrder = useMemo(() => {
    const allKeys: (keyof StyleAxes)[] = ["chillVsIntense", "cityVsNature", "ecoVsLuxury", "touristVsLocal"];
    if (axesOrder && axesOrder.length === allKeys.length) return axesOrder;
    return allKeys;
  }, [axesOrder]);

  return (
    <div className="mt-3 p-4 rounded-2xl bg-card border border-border shadow-md max-w-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sliders className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground flex-1">{t("planner.preference.styleTitle")}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[240px] whitespace-pre-line text-xs">
              {t("planner.preferences.style.helpTooltip")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <p className="text-[10px] text-muted-foreground mb-3">
        {t("planner.preferences.style.dragHint", "Glissez pour réorganiser par priorité")}
      </p>

      {/* Sliders with drag & drop */}
      <Reorder.Group
        axis="y"
        values={safeOrder}
        onReorder={setStyleAxesOrder}
        className="space-y-3"
      >
        {safeOrder.map((key, index) => (
          <ChatDraggableAxis
            key={key}
            axisKey={key}
            rank={index + 1}
            value={axes[key]}
            onChange={handleAxisChange}
          />
        ))}
      </Reorder.Group>

      {/* Continue Button */}
      {onContinue && (
        <button
          onClick={onContinue}
          className="mt-5 w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {t("planner.preference.continue")}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

export default PreferenceStyleWidget;
