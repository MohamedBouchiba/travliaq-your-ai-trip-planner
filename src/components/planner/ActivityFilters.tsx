/**
 * Activity Filters Component
 *
 * Filtering UI for activity search
 */

import { useState, useEffect, useCallback } from "react";
import { Filter, X, Star, DollarSign, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { activityService } from "@/services/activities/activityService";
import type { ActivityFilters as ActivityFiltersType, CategoryWithEmoji } from "@/types/activity";

export interface ActivityFiltersProps {
  filters: ActivityFiltersType;
  onFiltersChange: (filters: Partial<ActivityFiltersType>) => void;
  className?: string;
  compact?: boolean;
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

const FilterSection = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium text-foreground">{title}</span>
    </div>
    {children}
  </div>
);

const ChipButton = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
      selected
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
    )}
  >
    {children}
  </button>
);

// Default categories (no API call needed)
const DEFAULT_CATEGORIES: CategoryWithEmoji[] = [
  { id: 1, label: "Culture", emoji: "🎨", keyword: "culture" },
  { id: 2, label: "Gastronomie", emoji: "🍽️", keyword: "food" },
  { id: 3, label: "Nature", emoji: "🌲", keyword: "nature" },
  { id: 4, label: "Aventure", emoji: "🧗", keyword: "adventure" },
  { id: 5, label: "Musées", emoji: "🏛️", keyword: "museums" },
  { id: 6, label: "Sports", emoji: "⚽", keyword: "sport" },
];

export const ActivityFilters = ({ filters, onFiltersChange, className, compact = false }: ActivityFiltersProps) => {
  // Use default categories (no API call to avoid CORS issues)
  const categories = DEFAULT_CATEGORIES;
  const isLoadingCategories = false;

  const handleCategoryToggle = (keyword: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(keyword)
      ? currentCategories.filter((c) => c !== keyword)
      : [...currentCategories, keyword];

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

  const handleClearFilters = () => {
    onFiltersChange({
      categories: [],
      priceRange: [0, 500],
      ratingMin: 0,
      durationMax: undefined,
    });
  };

  const activeCount = [
    (filters.categories?.length || 0) > 0,
    filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 500),
    (filters.ratingMin || 0) > 0,
  ].filter(Boolean).length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Filtres</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
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

      <div className="space-y-4">
        {/* Categories */}
        {!compact && (
          <FilterSection icon={Sparkles} title="Catégories">
            {isLoadingCategories ? (
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-7 w-20 bg-muted/30 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 6).map((category) => {
                  const isSelected = filters.categories?.includes(category.keyword) || false;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.keyword)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all border",
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                      )}
                    >
                      <span>{category.emoji}</span>
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </FilterSection>
        )}

        {/* Budget - Clear chip buttons */}
        <FilterSection icon={DollarSign} title="Budget par personne">
          <div className="flex flex-wrap gap-1.5">
            {BUDGET_RANGES.map((range) => {
              const isSelected = filters.priceRange[0] === range.min && filters.priceRange[1] === range.max;
              return (
                <ChipButton
                  key={range.id}
                  selected={isSelected}
                  onClick={() => handleBudgetSelect(range)}
                >
                  {range.label}
                </ChipButton>
              );
            })}
          </div>
        </FilterSection>

        {/* Rating */}
        <FilterSection icon={Star} title="Note minimum">
          <div className="flex flex-wrap gap-1.5">
            {RATING_OPTIONS.map((option) => (
              <ChipButton
                key={option.value}
                selected={(filters.ratingMin || 0) === option.value}
                onClick={() => handleRatingChange(option.value)}
              >
                {option.value > 0 && <Star className="h-3 w-3 fill-current inline mr-0.5" />}
                {option.label}
              </ChipButton>
            ))}
          </div>
        </FilterSection>
      </div>
    </div>
  );
};

export default ActivityFilters;
