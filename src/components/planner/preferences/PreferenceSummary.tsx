/**
 * PreferenceSummary
 * Displays an AI-generated engaging summary of user preferences.
 * Calls LLM with creative prompt for fun, factual summaries.
 */

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { usePreferenceMemoryStore, type TripPreferences } from "@/stores/hooks";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface PreferenceSummaryProps {
  className?: string;
  compact?: boolean;
}

function getPreferencesHash(prefs: TripPreferences): string {
  return JSON.stringify({
    style: prefs.travelStyle,
    axes: prefs.styleAxes,
    interests: prefs.interests.slice(0, 5),
    occasion: prefs.tripContext.occasion,
    mustHaves: prefs.mustHaves,
  });
}

function getEnergyLabel(chillVsIntense: number, t: (key: string) => string): string {
  if (chillVsIntense < 30) return t("planner.summary.energy.zen");
  if (chillVsIntense < 50) return t("planner.summary.energy.balanced");
  if (chillVsIntense < 70) return t("planner.summary.energy.dynamic");
  return t("planner.summary.energy.intense");
}

function getTerrainLabel(cityVsNature: number, t: (key: string) => string): string {
  if (cityVsNature < 30) return t("planner.summary.terrain.urban");
  if (cityVsNature < 50) return t("planner.summary.terrain.mixed");
  if (cityVsNature < 70) return t("planner.summary.terrain.open");
  return t("planner.summary.terrain.wild");
}

function getBudgetLabel(ecoVsLuxury: number, t: (key: string) => string): string {
  if (ecoVsLuxury < 25) return t("planner.summary.budget.budget");
  if (ecoVsLuxury < 50) return t("planner.summary.budget.smart");
  if (ecoVsLuxury < 75) return t("planner.summary.budget.comfortable");
  return t("planner.summary.budget.luxury");
}

function getAuthLabel(touristVsLocal: number, t: (key: string) => string): string {
  if (touristVsLocal < 30) return t("planner.summary.auth.classic");
  if (touristVsLocal < 50) return t("planner.summary.auth.balanced");
  if (touristVsLocal < 70) return t("planner.summary.auth.local");
  return t("planner.summary.auth.authentic");
}

const CHANGES_THRESHOLD = 3; // Regenerate every N changes to optimize LLM costs

export const PreferenceSummary = memo(function PreferenceSummary({ className, compact = false }: PreferenceSummaryProps) {
  const { t, i18n } = useTranslation();
  const PLACEHOLDER = t("planner.summary.placeholder");
  const { getPreferences, getProfileCompletion } = usePreferenceMemoryStore();
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHashRef = useRef<string>("");
  const changeCountRef = useRef<number>(0);
  const prefs = getPreferences();
  const completion = getProfileCompletion();

  const generateSummary = useCallback(async (force = false) => {
    const currentHash = getPreferencesHash(prefs);
    
    // Track changes
    if (currentHash !== lastHashRef.current) {
      changeCountRef.current += 1;
    }
    
    // Skip if nothing changed
    if (currentHash === lastHashRef.current && !force) return;
    
    // Skip if profile too sparse (less than 20% complete)
    if (completion < 20) {
      setSummary("");
      return;
    }
    
    // Only regenerate every N changes (or on force/first time)
    const isFirstGeneration = !lastHashRef.current || !summary;
    if (!force && !isFirstGeneration && changeCountRef.current < CHANGES_THRESHOLD) {
      return;
    }
    
    // Reset counter and update hash
    changeCountRef.current = 0;
    lastHashRef.current = currentHash;
    setIsLoading(true);

    try {
      // Build human-readable profile description using i18n
      const styleLabel = t(`planner.summary.travelStyle.${prefs.travelStyle}`) || t("planner.summary.travelStyle.solo");
      const interestsList = prefs.interests.length > 0 ? prefs.interests.slice(0, 4).join(", ") : t("planner.summary.polyvalent");
      const occasionLabel = prefs.tripContext.occasion 
        ? t(`planner.summary.occasion.${prefs.tripContext.occasion}`) 
        : "";

      // Use the current language for the prompt
      const isEnglish = i18n.language?.startsWith("en");
      const promptLang = isEnglish ? "English" : "French";
      
      const prompt = `You are a friendly travel assistant. Describe this traveler warmly and personally in 2-3 short sentences. Respond in ${promptLang}.

YOUR STYLE:
- Speak like a friend who knows them well
- Use "you" and be warm
- Highlight what makes them unique
- Maximum 40 words, short sentences
- No complicated metaphors, stay simple and authentic
- One emoji maximum at end of sentence

PROFILE:
- Type: ${styleLabel} trip
- Energy: ${getEnergyLabel(prefs.styleAxes.chillVsIntense, t)}
- Preferred environment: ${getTerrainLabel(prefs.styleAxes.cityVsNature, t)}
- Budget: ${getBudgetLabel(prefs.styleAxes.ecoVsLuxury, t)}
- Style: ${getAuthLabel(prefs.styleAxes.touristVsLocal, t)}
- What attracts you: ${interestsList}${occasionLabel ? `\n- Occasion: ${occasionLabel}` : ""}

EXAMPLES:
- "You love traveling as a couple, between cultural discoveries and good restaurants. A relaxed pace with a touch of comfort. 🌿"
- "Solo adventurer, you prefer going off the beaten path. Nature and authenticity are your keywords. ⛰️"
- "As a family, you're looking for experiences accessible to everyone. Beach and fun activities are on the agenda! 🏖️"

Respond only with the description, without quotes.`;

      const { data, error } = await supabase.functions.invoke("planner-chat", {
        body: {
          messages: [{ role: "user", content: prompt }],
          stream: false,
        },
      });

      if (error) throw error;
      
      const content = data?.content || "";
      if (content && content.length > 20) {
        setSummary(content);
      }
    } catch (err) {
      console.warn("[PreferenceSummary] Generation failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [prefs, completion, t, i18n.language]);

  // Debounced generation on preference change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      generateSummary();
    }, 2000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [generateSummary]);

  const handleRefresh = () => {
    generateSummary(true); // Force regeneration
  };

  if (compact) {
    return (
      <div className={cn("text-xs text-muted-foreground italic", className)}>
        {isLoading ? (
          <span className="text-primary/70">✨ {t("planner.summary.generating")}</span>
        ) : summary ? (
          <span className="line-clamp-2">{summary}</span>
        ) : (
          <span className="opacity-60">{PLACEHOLDER}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 min-h-[100px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t("planner.summary.yourProfile")}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || completion < 20}
          className="p-1 rounded-md hover:bg-muted/50 disabled:opacity-40 transition-colors"
          title={t("planner.summary.regenerate")}
        >
          <RefreshCw className={cn("h-3 w-3 text-muted-foreground", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="text-sm leading-relaxed min-h-[40px]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-primary/70">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="text-xs">{t("planner.summary.analyzing")}</span>
          </div>
        ) : summary ? (
          <p className="text-foreground/90">{summary}</p>
        ) : (
          <p className="text-muted-foreground/70 italic">{PLACEHOLDER}</p>
        )}
      </div>

      {/* Subtle decoration */}
      <div className="absolute -bottom-1 -right-1 w-16 h-16 bg-gradient-to-tl from-primary/10 to-transparent rounded-full blur-xl pointer-events-none" />
    </div>
  );
});

export default PreferenceSummary;
