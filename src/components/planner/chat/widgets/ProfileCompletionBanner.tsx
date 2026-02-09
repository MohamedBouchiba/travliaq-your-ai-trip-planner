/**
 * ProfileCompletionBanner - Tiered banner showing profile completion status
 * < 50%: Orange warning with CTA
 * 50-69%: Blue info with progress
 * >= 70%: Green success badge
 */

import { memo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { AlertTriangle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { eventBus, emitTabChange } from "@/lib/eventBus";
import type { ProfileCompleteness } from "@/types/destinations";

interface ProfileCompletionBannerProps {
  basedOnProfile: ProfileCompleteness;
}

export const ProfileCompletionBanner = memo(function ProfileCompletionBanner({
  basedOnProfile,
}: ProfileCompletionBannerProps) {
  const { t } = useTranslation();
  const score = basedOnProfile.completionScore;

  const handleCompleteProfile = () => {
    emitTabChange("preferences");
  };

  // >= 70%: Green success
  if (score >= 70) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
      >
        <div className="p-1.5 rounded-lg bg-emerald-500/15">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {t("planner.suggestions.highProfileSuccess")}
        </span>
        <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 ml-auto">
          {score}%
        </span>
      </motion.div>
    );
  }

  // 50-69%: Blue info
  if (score >= 50) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm text-foreground/80">
            {t("planner.suggestions.mediumProfileInfo")}
          </span>
        </div>
        <div className="flex items-center gap-3 ml-9">
          <Progress value={score} className="h-1.5 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">{score}%</span>
        </div>
      </motion.div>
    );
  }

  // < 50%: Orange warning with CTA
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex flex-col gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25"
    >
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-amber-500/15 mt-0.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
          {t("planner.suggestions.lowProfileWarning", { score })}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-9">
        <Progress value={score} className="h-1.5 flex-1" />
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{score}%</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCompleteProfile}
        className="ml-9 w-fit border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/50"
      >
        {t("planner.suggestions.completeProfile")}
        <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </motion.div>
  );
});

export default ProfileCompletionBanner;
