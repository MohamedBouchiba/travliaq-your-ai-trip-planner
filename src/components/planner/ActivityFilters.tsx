/**
 * Activity Filters Component
 *
 * Professional filtering UI for activity search with advanced filters
 * NOW with Viator categories and intelligent auto-selection
 */

import { useState } from "react";
import { Filter, X, Star, DollarSign, Sparkles, Clock, Sun, SlidersHorizontal, Users, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ActivityFilters as ActivityFiltersType, CategoryWithEmoji, TimeOfDay, DurationRange } from "@/types/activity";
import { VIATOR_CATEGORIES } from "@/constants/metaCategories";
import { autoSelectFilters, getFiltersSummary } from "@/services/activities/filterAutoSelection";
import { usePreferenceMemory } from "@/contexts/PreferenceMemoryContext";
import { toast } from "sonner";

export interface ActivityFiltersProps {
  filters: ActivityFiltersType;
  onFiltersChange: (filters: Partial<ActivityFiltersType>) => void;
  className?: string;
  compact?: boolean;
  travelers?: { adults: number; children: number }; // From accommodation
}

const RATING_OPTIONS = [
  { value: 0, label: "Tous" },
  { value: 3.5, label: "3.5+" },
  { value: 4.0, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
];

const BUDGET_RANGES = [
  { id: "eco", label: "0-30€", min: 0, max: 30 },
  { id: "budget", label: "30-80€", min: 30, max: 80 },
  { id: "confort", label: "80-150€", min: 80, max: 150 },
  { id: "premium", label: "150€+", min: 150, max: 500 },
];

// Time of day options
const TIME_OF_DAY_OPTIONS: { id: TimeOfDay; label: string; hours: string }[] = [
  { id: "morning", label: "Matin", hours: "8h-12h" },
  { id: "afternoon", label: "Après-midi", hours: "12h-17h" },
  { id: "evening", label: "Soirée", hours: "17h-00h" },
];

// Duration range options
const DURATION_RANGE_OPTIONS: { id: DurationRange; label: string }[] = [
  { id: "under1h", label: "< 1h" },
  { id: "1to4h", label: "1-4h" },
  { id: "over4h", label: "> 4h" },
  { id: "fullDay", label: "1 journée" },
  { id: "multiDay", label: "Plusieurs jours" },
];

export const ActivityFilters = ({
  filters,
  onFiltersChange,
  className,
  compact = false,
  travelers
}: ActivityFiltersProps) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { memory } = usePreferenceMemory();
  const preferences = memory.preferences;

  // Use Viator categories
  const categories = VIATOR_CATEGORIES;

  // AUTO-SELECT: Intelligent filter selection based on user preferences
  const handleAutoSelect = () => {
    if (!preferences) {
      toast.error("Vos préférences de voyage ne sont pas disponibles");
      return;
    }

    const smartFilters = autoSelectFilters(preferences);

    onFiltersChange({
      categories: smartFilters.categories,
      priceRange: smartFilters.priceRange,
      ratingMin: smartFilters.ratingMin,
    });

    const summary = getFiltersSummary(smartFilters);
    toast.success(`Filtres appliqués : ${summary}`);
  };

  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((c) => c !== categoryId)
      : [...currentCategories, categoryId];

    onFiltersChange({ categories: newCategories });
  };

  const handleBudgetSelect = (range: typeof BUDGET_RANGES[0]) => {
    const currentRange = filters.priceRange;
    const isSelected = currentRange[0] === range.min && currentRange[1] === range.max;
    
    if (isSelected) {
      onFiltersChange({ priceRange: [0, 500] });
    } else {
      onFiltersChange({ priceRange: [range.min, range.max] });
    }
  };

  const handleRatingChange = (rating: number) => {
    onFiltersChange({ ratingMin: rating });
  };

  const handleTimeOfDayToggle = (timeId: TimeOfDay) => {
    const currentTimes = filters.timeOfDay || [];
    const newTimes = currentTimes.includes(timeId)
      ? currentTimes.filter((t) => t !== timeId)
      : [...currentTimes, timeId];

    onFiltersChange({ timeOfDay: newTimes });
  };

  const handleDurationRangeToggle = (durationId: DurationRange) => {
    const currentDurations = filters.durationRange || [];
    const newDurations = currentDurations.includes(durationId)
      ? currentDurations.filter((d) => d !== durationId)
      : [...currentDurations, durationId];

    onFiltersChange({ durationRange: newDurations });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      categories: [],
      priceRange: [0, 500],
      ratingMin: 0,
      durationMax: undefined,
      timeOfDay: [],
      durationRange: [],
    });
  };

  const activeCount = [
    (filters.categories?.length || 0) > 0,
    filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 500),
    (filters.ratingMin || 0) > 0,
    (filters.timeOfDay?.length || 0) > 0,
    (filters.durationRange?.length || 0) > 0,
  ].filter(Boolean).length;

  // Calculate total travelers from accommodation
  const totalTravelers = travelers ? travelers.adults + travelers.children : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Filtres</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] text-center">
              {activeCount}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Effacer
          </button>
        )}
      </div>

      {/* Travelers info (from accommodation) */}
      {totalTravelers !== null && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/30 border border-border/30">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">
            <span className="font-medium">{totalTravelers}</span> voyageur{totalTravelers > 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">
            ({travelers!.adults} adulte{travelers!.adults > 1 ? "s" : ""}{travelers!.children > 0 ? `, ${travelers!.children} enfant${travelers!.children > 1 ? "s" : ""}` : ""})
          </span>
        </div>
      )}

      {/* Auto-Select Button */}
      {!compact && (
        <button
          onClick={handleAutoSelect}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 hover:from-primary/20 hover:to-primary/10 transition-all group"
        >
          <Wand2 className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform" />
          <span className="text-sm font-medium text-primary">
            Sélection automatique selon mes préférences
          </span>
          <Sparkles className="h-3.5 w-3.5 text-primary/60" />
        </button>
      )}

      {/* Categories - 2 columns for 7 Viator categories */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Catégories</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((category) => {
              const isSelected = filters.categories?.includes(category.id) || false;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all border",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                  )}
                >
                  <span className="text-base">{category.emoji}</span>
                  <span className="truncate">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Budget / activité</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {BUDGET_RANGES.map((range) => {
            const isSelected = filters.priceRange[0] === range.min && filters.priceRange[1] === range.max;
            return (
              <button
                key={range.id}
                onClick={() => handleBudgetSelect(range)}
                className={cn(
                  "px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border text-center",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Note minimum</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {RATING_OPTIONS.map((option) => {
            const isSelected = (filters.ratingMin || 0) === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleRatingChange(option.value)}
                className={cn(
                  "px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border text-center flex items-center justify-center gap-0.5",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                )}
              >
                {option.value > 0 && <Star className="h-3 w-3 fill-current" />}
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filters Collapsible */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 w-full py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filtres avancés</span>
            <span className={cn(
              "ml-auto transition-transform",
              isAdvancedOpen && "rotate-180"
            )}>
              ▼
            </span>
            {((filters.timeOfDay?.length || 0) + (filters.durationRange?.length || 0)) > 0 && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">
                {(filters.timeOfDay?.length || 0) + (filters.durationRange?.length || 0)}
              </span>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Time of Day */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Moment de la journée</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {TIME_OF_DAY_OPTIONS.map((option) => {
                const isSelected = filters.timeOfDay?.includes(option.id) || false;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleTimeOfDayToggle(option.id)}
                    className={cn(
                      "px-2 py-2 rounded-lg text-[11px] font-medium flex flex-col items-center gap-0.5 transition-all border",
                      isSelected
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                    )}
                  >
                    <span>{option.label}</span>
                    <span className="text-[9px] opacity-70">{option.hours}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Durée de l'activité</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {DURATION_RANGE_OPTIONS.map((option) => {
                const isSelected = filters.durationRange?.includes(option.id) || false;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleDurationRangeToggle(option.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                      isSelected
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ActivityFilters;