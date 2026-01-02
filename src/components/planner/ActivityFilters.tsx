/**
 * Activity Filters Component
 *
 * Professional filtering UI for activity search
 */

import { Filter, X, Star, DollarSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
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

// Default categories (no API call needed)
const DEFAULT_CATEGORIES: CategoryWithEmoji[] = [
  { id: 1, label: "Culture", emoji: "🎨", keyword: "culture" },
  { id: 2, label: "Gastronomie", emoji: "🍽️", keyword: "food" },
  { id: 3, label: "Nature", emoji: "🌲", keyword: "nature" },
  { id: 4, label: "Aventure", emoji: "🧗", keyword: "adventure" },
  { id: 5, label: "Musées", emoji: "🏛️", keyword: "museums" },
  { id: 6, label: "Sports", emoji: "⚽", keyword: "sport" },
];

export const ActivityFilters = ({ 
  filters, 
  onFiltersChange, 
  className, 
  compact = false 
}: ActivityFiltersProps) => {
  const categories = DEFAULT_CATEGORIES;

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

      {/* Categories */}
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Catégories</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {categories.map((category) => {
              const isSelected = filters.categories?.includes(category.keyword) || false;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.keyword)}
                  className={cn(
                    "px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border",
                    isSelected
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                  )}
                >
                  <span className="text-sm">{category.emoji}</span>
                  <span>{category.label}</span>
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
        <div className="grid grid-cols-4 gap-1.5">
          {BUDGET_RANGES.map((range) => {
            const isSelected = filters.priceRange[0] === range.min && filters.priceRange[1] === range.max;
            return (
              <button
                key={range.id}
                onClick={() => handleBudgetSelect(range)}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-xs font-medium transition-all border text-center",
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
        <div className="grid grid-cols-4 gap-1.5">
          {RATING_OPTIONS.map((option) => {
            const isSelected = (filters.ratingMin || 0) === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleRatingChange(option.value)}
                className={cn(
                  "px-2 py-1.5 rounded-lg text-xs font-medium transition-all border text-center flex items-center justify-center gap-0.5",
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
    </div>
  );
};

export default ActivityFilters;
