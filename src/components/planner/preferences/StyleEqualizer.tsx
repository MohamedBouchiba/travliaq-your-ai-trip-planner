/**
 * Style Equalizer Component
 * Visual sliders for style axes with drag & drop reordering
 */

import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import { DualSlider } from "@/components/ui/dual-slider";
import { cn } from "@/lib/utils";
import type { StyleAxes } from "@/stores/hooks";

interface StyleEqualizerProps {
  axes: StyleAxes;
  axesOrder: (keyof StyleAxes)[];
  onAxisChange: (axis: keyof StyleAxes, value: number) => void;
  onOrderChange: (order: (keyof StyleAxes)[]) => void;
  compact?: boolean;
}

const AXES_LABELS: Record<keyof StyleAxes, {
  leftLabelKey: string;
  rightLabelKey: string;
  leftEmoji: string;
  rightEmoji: string;
}> = {
  chillVsIntense: { leftLabelKey: "planner.preferences.axes.chill", rightLabelKey: "planner.preferences.axes.intense", leftEmoji: "🧘", rightEmoji: "🏃" },
  cityVsNature: { leftLabelKey: "planner.preferences.axes.urban", rightLabelKey: "planner.preferences.axes.nature", leftEmoji: "🏙️", rightEmoji: "🌲" },
  ecoVsLuxury: { leftLabelKey: "planner.preferences.axes.budget", rightLabelKey: "planner.preferences.axes.luxury", leftEmoji: "💰", rightEmoji: "✨" },
  touristVsLocal: { leftLabelKey: "planner.preferences.axes.tourist", rightLabelKey: "planner.preferences.axes.authentic", leftEmoji: "📸", rightEmoji: "🏠" },
};

interface DraggableAxisProps {
  axisKey: keyof StyleAxes;
  rank: number;
  value: number;
  onChange: (key: keyof StyleAxes, value: number) => void;
  compact?: boolean;
}

const DraggableAxis = memo(function DraggableAxis({ axisKey, rank, value, onChange, compact }: DraggableAxisProps) {
  const { t } = useTranslation();
  const controls = useDragControls();
  const { leftLabelKey, rightLabelKey, leftEmoji, rightEmoji } = AXES_LABELS[axisKey];

  return (
    <Reorder.Item
      value={axisKey}
      dragListener={false}
      dragControls={controls}
      className="group flex items-center gap-1.5"
      whileDrag={{ scale: 1.02, boxShadow: "0 4px 16px hsl(var(--primary) / 0.15)", zIndex: 10 }}
      transition={{ duration: 0.2 }}
    >
      {/* Drag handle + rank badge */}
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
      <div className={cn(
        "flex items-center gap-1 min-w-[80px] justify-end",
        compact && "min-w-[65px]"
      )}>
        <span className="text-sm">{leftEmoji}</span>
        <span className={cn(
          "text-[11px] font-medium transition-colors whitespace-nowrap",
          value < 40 ? "text-foreground" : "text-muted-foreground"
        )}>
          {t(leftLabelKey)}
        </span>
      </div>

      {/* Slider */}
      <div className="flex-1 relative">
        <DualSlider
          value={[value]}
          onValueChange={([v]) => onChange(axisKey, v)}
          max={100}
          step={1}
        />
      </div>

      {/* Right label */}
      <div className={cn(
        "flex items-center gap-1 min-w-[80px]",
        compact && "min-w-[65px]"
      )}>
        <span className={cn(
          "text-[11px] font-medium transition-colors whitespace-nowrap",
          value > 60 ? "text-foreground" : "text-muted-foreground"
        )}>
          {t(rightLabelKey)}
        </span>
        <span className="text-sm">{rightEmoji}</span>
      </div>
    </Reorder.Item>
  );
});

export const StyleEqualizer = memo(function StyleEqualizer({ axes, axesOrder, onAxisChange, onOrderChange, compact = false }: StyleEqualizerProps) {
  const { t } = useTranslation();

  const handleAxisChange = useCallback((key: keyof StyleAxes, value: number) => {
    onAxisChange(key, value);
  }, [onAxisChange]);

  // Ensure order always has all keys (defensive)
  const safeOrder = useMemo(() => {
    const allKeys: (keyof StyleAxes)[] = ["chillVsIntense", "cityVsNature", "ecoVsLuxury", "touristVsLocal"];
    if (axesOrder && axesOrder.length === allKeys.length) return axesOrder;
    return allKeys;
  }, [axesOrder]);

  return (
    <div className={cn("space-y-1", compact && "space-y-0.5")}>
      <p className="text-[10px] text-muted-foreground mb-1.5">
        {t("planner.preferences.style.dragHint", "Glissez pour réorganiser par priorité")}
      </p>
      <Reorder.Group
        axis="y"
        values={safeOrder}
        onReorder={onOrderChange}
        className="space-y-2"
      >
        {safeOrder.map((key, index) => (
          <DraggableAxis
            key={key}
            axisKey={key}
            rank={index + 1}
            value={axes[key]}
            onChange={handleAxisChange}
            compact={compact}
          />
        ))}
      </Reorder.Group>
    </div>
  );
});

export default StyleEqualizer;
