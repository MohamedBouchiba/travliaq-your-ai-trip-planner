/**
 * Base Step Component
 * First step: Travel style, occasion, presets, and summary
 */

import { memo, useState, useCallback } from "react";
import { ChevronDown, Sparkles, Users, Zap, Heart, PartyPopper, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { usePreferenceMemoryStore, type TravelStyle, type StyleAxes, type TripContext } from "@/stores/hooks";
import { TravelStyleSelector, OccasionSelector, PreferenceSummary } from "../";
import { SectionHeader, type Step } from "../widgets";
import { eventBus } from "@/lib/eventBus";

// ============================================================================
// QUICK PRESETS
// ============================================================================

interface PresetConfig {
  id: string;
  labelKey: string;
  emoji: string;
  icon: React.ElementType;
  travelStyle: TravelStyle;
  styleAxes: Partial<StyleAxes>;
  interests: string[];
  occasion?: TripContext["occasion"];
  color: string;
}

const QUICK_PRESETS: PresetConfig[] = [
  {
    id: "romantic",
    labelKey: "planner.presets.romantic",
    emoji: "💑",
    icon: Heart,
    travelStyle: "couple",
    styleAxes: { chillVsIntense: 30, ecoVsLuxury: 75, cityVsNature: 50 },
    interests: ["food", "wellness", "culture"],
    occasion: "honeymoon",
    color: "rose",
  },
  {
    id: "adventure",
    labelKey: "planner.presets.adventure",
    emoji: "🎒",
    icon: PartyPopper,
    travelStyle: "friends",
    styleAxes: { chillVsIntense: 80, ecoVsLuxury: 35, cityVsNature: 70, touristVsLocal: 65 },
    interests: ["adventure", "nature", "nightlife"],
    occasion: "vacation",
    color: "orange",
  },
  {
    id: "family",
    labelKey: "planner.presets.family",
    emoji: "👨‍👩‍👧‍👦",
    icon: Users,
    travelStyle: "family",
    styleAxes: { chillVsIntense: 40, ecoVsLuxury: 55, cityVsNature: 45 },
    interests: ["culture", "beach", "nature"],
    occasion: "vacation",
    color: "blue",
  },
  {
    id: "workation",
    labelKey: "planner.presets.workation",
    emoji: "💻",
    icon: Briefcase,
    travelStyle: "solo",
    styleAxes: { chillVsIntense: 45, ecoVsLuxury: 60, cityVsNature: 25 },
    interests: ["workation", "food", "culture"],
    occasion: "workation",
    color: "violet",
  },
];

interface QuickPresetsProps {
  onApply: (preset: PresetConfig) => void;
}

const QuickPresets = memo(function QuickPresets({ onApply }: QuickPresetsProps) {
  const { t } = useTranslation();
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {QUICK_PRESETS.map((preset) => {
        const Icon = preset.icon;
        return (
          <button
            key={preset.id}
            onClick={() => onApply(preset)}
            className={cn(
              "flex items-center gap-2 p-2.5 rounded-xl border border-border/50 text-left transition-all",
              "hover:border-primary/50 hover:bg-primary/5 group"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-lg",
              preset.color === "rose" && "bg-rose-100 dark:bg-rose-900/30",
              preset.color === "orange" && "bg-orange-100 dark:bg-orange-900/30",
              preset.color === "blue" && "bg-blue-100 dark:bg-blue-900/30",
              preset.color === "violet" && "bg-violet-100 dark:bg-violet-900/30",
            )}>
              {preset.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{t(preset.labelKey)}</p>
              <p className="text-[10px] text-muted-foreground">{t("planner.presets.oneClick")}</p>
            </div>
            <Zap className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        );
      })}
    </div>
  );
});

// ============================================================================
// BASE STEP
// ============================================================================

interface BaseStepProps {
  onNextStep: () => void;
}

export const BaseStep = memo(function BaseStep({ onNextStep }: BaseStepProps) {
  const { t } = useTranslation();
  const {
    memory: { preferences },
    setTravelStyle,
    setOccasion,
    getProfileCompletion,
    updatePreferences,
  } = usePreferenceMemoryStore();

  const [showPresets, setShowPresets] = useState(true);
  const completion = getProfileCompletion();

  const handleApplyPreset = useCallback((preset: PresetConfig) => {
    updatePreferences({
      travelStyle: preset.travelStyle,
      styleAxes: {
        ...preferences.styleAxes,
        ...preset.styleAxes,
      },
      interests: preset.interests,
      styleAxesUserConfirmed: true,
      tripContext: {
        ...preferences.tripContext,
        occasion: preset.occasion,
      },
    }, false);

    setShowPresets(false);

    eventBus.emit("preferences:updated", {
      preferences: { ...preferences, ...preset },
      source: "manual",
      fields: ["travelStyle", "styleAxes", "interests", "occasion"],
    });
  }, [preferences, updatePreferences]);

  return (
    <div className="space-y-4">
      {/* Quick Presets (collapsible) */}
      {showPresets && completion < 30 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              {t("planner.presets.quickStart")}
            </span>
            <button
              onClick={() => setShowPresets(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("planner.presets.close")}
            </button>
          </div>
          <QuickPresets onApply={handleApplyPreset} />
        </div>
      )}

      {/* Travel Style */}
      <div data-tour="preferences-widget">
        <SectionHeader icon={Users} title={t("planner.presets.travelers")} />
        <TravelStyleSelector
          selected={preferences.travelStyle}
          onSelect={setTravelStyle}
        />
      </div>

      {/* Occasion */}
      <div>
        <SectionHeader icon={Sparkles} title={t("planner.presets.occasion")} badge={t("planner.presets.optional")} />
        <OccasionSelector
          selected={preferences.tripContext.occasion}
          onSelect={setOccasion}
        />
      </div>

      {/* AI Summary */}
      <PreferenceSummary />

      {/* Next step hint */}
      <button
        onClick={onNextStep}
        className="w-full py-2.5 px-4 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
      >
        {t("planner.presets.defineStyle")}
        <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
      </button>
    </div>
  );
});

export default BaseStep;
