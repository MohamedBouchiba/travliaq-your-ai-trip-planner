/**
 * Style Step Component
 * Second step: Style equalizer, interests, smart tags
 */

import { memo } from "react";
import { ChevronDown, Sparkles, Sliders } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePreferenceMemoryStore } from "@/stores/hooks";
import { StyleEqualizer, InterestPicker, SmartTagsWidget } from "../";
import { SectionHeader } from "../widgets";

interface StyleStepProps {
  onNextStep: () => void;
}

export const StyleStep = memo(function StyleStep({ onNextStep }: StyleStepProps) {
  const { t } = useTranslation();
  const {
    memory: { preferences },
    setStyleAxis,
    setStyleAxesOrder,
    toggleInterest,
  } = usePreferenceMemoryStore();

  return (
    <div className="space-y-4">
      {/* Style Equalizer */}
      <div>
        <SectionHeader icon={Sliders} title={t("planner.preferences.style.yourStyle")} />
        <StyleEqualizer
          axes={preferences.styleAxes}
          axesOrder={preferences.styleAxesOrder}
          onAxisChange={setStyleAxis}
          onOrderChange={setStyleAxesOrder}
        />
      </div>

      {/* Interests */}
      <div>
        <SectionHeader icon={Sparkles} title={t("planner.preferences.style.interests")} />
        <InterestPicker
          selected={preferences.interests}
          onToggle={toggleInterest}
          maxSelections={5}
        />
      </div>

      {/* Smart Tags */}
      <SmartTagsWidget />

      {/* Next step hint */}
      <button
        onClick={onNextStep}
        className="w-full py-2.5 px-4 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
      >
        {t("planner.preferences.style.defineCriteria")}
        <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
      </button>
    </div>
  );
});

export default StyleStep;
