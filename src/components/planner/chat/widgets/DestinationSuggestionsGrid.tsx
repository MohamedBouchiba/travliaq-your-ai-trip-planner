/**
 * DestinationSuggestionsGrid - Premium carousel of destination suggestions
 * Shows 1 card fully visible with peek of next card for sliding hint
 */

import { memo, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { DestinationSuggestionCard } from "./DestinationSuggestionCard";
import type { DestinationSuggestion, ProfileCompleteness } from "@/types/destinations";

interface DestinationSuggestionsGridProps {
  suggestions: DestinationSuggestion[];
  basedOnProfile?: ProfileCompleteness;
  onSelect?: (suggestion: DestinationSuggestion) => void;
  isLoading?: boolean;
}

export const DestinationSuggestionsGrid = memo(function DestinationSuggestionsGrid({
  suggestions,
  basedOnProfile,
  onSelect,
  isLoading = false,
}: DestinationSuggestionsGridProps) {
  const { t } = useTranslation();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Track current slide and scroll capabilities
  useEffect(() => {
    if (!api) return;

    const updateState = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap());
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    updateState();
    api.on("select", updateState);
    api.on("reInit", updateState);

    return () => {
      api.off("select", updateState);
      api.off("reInit", updateState);
    };
  }, [api]);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-8 rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-border/50 shadow-lg"
      >
        <div className="flex flex-col items-center justify-center gap-4 py-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="relative h-10 w-10 text-primary animate-spin" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">{t("planner.suggestions.analyzingPreferences")}</p>
            <p className="text-xs text-muted-foreground">{t("planner.suggestions.searchingDestinations")}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 p-8 rounded-2xl bg-card border border-border shadow-md"
      >
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <Sparkles className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t("planner.suggestions.noSuggestions")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4 space-y-4"
    >
      {/* Profile Completeness Badge */}
      {basedOnProfile && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-col gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm text-foreground/80">
              {t("planner.suggestions.basedOnProfile")}{" "}
              <span className="font-semibold text-primary">
                {t("planner.suggestions.profileComplete", { score: basedOnProfile.completionScore })}
              </span>
            </span>
          </div>
          {/* Incitation message when profile is incomplete */}
          {basedOnProfile.completionScore < 70 && (
            <p className="text-xs text-muted-foreground ml-9">
              {t("planner.suggestions.improveRecommendations")}
            </p>
          )}
        </motion.div>
      )}

      {/* Carousel Container */}
      <div className="relative group">
        {/* Main Carousel */}
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: false,
            skipSnaps: false,
            dragFree: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {suggestions.map((suggestion, index) => (
              <CarouselItem
                key={`${suggestion.countryCode}-${index}`}
                className="pl-3 basis-[93%]"
              >
                <DestinationSuggestionCard
                  suggestion={suggestion}
                  onSelect={onSelect ? () => onSelect(suggestion) : undefined}
                  isLoading={isLoading}
                  animationDelay={index * 0.1}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Navigation - Arrows + Pagination together */}
      {count > 1 && (
        <div className="flex justify-center items-center gap-4 pt-2">
          {/* Previous Arrow */}
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className={cn(
              "p-2 rounded-full border border-border bg-background shadow-sm transition-all duration-200",
              canScrollPrev 
                ? "hover:bg-muted hover:scale-105 text-foreground" 
                : "opacity-30 cursor-not-allowed text-muted-foreground"
            )}
            aria-label={t("planner.suggestions.previousDestination")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Pagination Dots */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {current + 1} / {count}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: count }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  aria-label={t("planner.suggestions.goToDestination", { index: index + 1 })}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    current === index
                      ? "bg-primary w-6"
                      : "bg-muted-foreground/25 w-2 hover:bg-muted-foreground/40"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Next Arrow */}
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            className={cn(
              "p-2 rounded-full border border-border bg-background shadow-sm transition-all duration-200",
              canScrollNext 
                ? "hover:bg-muted hover:scale-105 text-foreground" 
                : "opacity-30 cursor-not-allowed text-muted-foreground"
            )}
            aria-label={t("planner.suggestions.nextDestination")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Swipe hint for mobile */}
      {count > 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground/60 sm:hidden"
        >
          {t("planner.suggestions.swipeHint")}
        </motion.p>
      )}
    </motion.div>
  );
});

export default DestinationSuggestionsGrid;
