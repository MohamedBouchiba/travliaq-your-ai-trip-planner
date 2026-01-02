/**
 * Activity Filters Component
 *
 * Comprehensive filtering UI for activity search and recommendations
 * Features:
 * - Category selection with emojis (from API)
 * - Price range slider
 * - Minimum rating filter
 * - Duration filter
 * - Clear all filters
 * - Active filter count badge
 */

import { useState, useEffect, useCallback } from "react";
import { Filter, X, Star, DollarSign, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { activityService } from "@/services/activities/activityService";
import type { ActivityFilters as ActivityFiltersType, CategoryWithEmoji } from "@/types/activity";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityFiltersProps {
  /**
   * Current filter values
   */
  filters: ActivityFiltersType;

  /**
   * Called when filters change
   */
  onFiltersChange: (filters: ActivityFiltersType) => void;

  /**
   * Optional CSS class
   */
  className?: string;

  /**
   * Show compact mode (for mobile/sidebar)
   */
  compact?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RATING_OPTIONS = [
  { value: 0, label: "Tous" },
  { value: 3.5, label: "3.5+" },
  { value: 4.0, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
  { value: 4.8, label: "Excellent" },
];

const DURATION_OPTIONS = [
  { id: "short", label: "< 2h", maxMinutes: 120 },
  { id: "medium", label: "2-4h", maxMinutes: 240 },
  { id: "long", label: "4-8h", maxMinutes: 480 },
  { id: "full-day", label: "Journée", maxMinutes: 999 },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

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
      <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <span className="text-xs font-medium text-foreground uppercase tracking-wide">
        {title}
      </span>
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
      "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
      selected
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
    )}
  >
    {children}
  </button>
);

// ============================================================================
// COMPONENT
// ============================================================================

export const ActivityFilters = ({ filters, onFiltersChange, className, compact = false }: ActivityFiltersProps) => {
  const [categories, setCategories] = useState<CategoryWithEmoji[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const rootCategories = await activityService.getRootCategories("fr");
        setCategories(rootCategories);
      } catch (error) {
        console.error("Error loading categories:", error);
        // Fallback to basic categories
        setCategories([
          { id: 1, label: "Culture", emoji: "🎨", keyword: "culture" },
          { id: 2, label: "Gastronomie", emoji: "🍽️", keyword: "food" },
          { id: 3, label: "Nature", emoji: "🌲", keyword: "nature" },
          { id: 4, label: "Aventure", emoji: "🧗", keyword: "adventure" },
          { id: 5, label: "Plage", emoji: "🏖️", keyword: "beach" },
          { id: 6, label: "Shopping", emoji: "🛍️", keyword: "shopping" },
        ]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // Calculate active filter count
  const activeFilterCount = useCallback(() => {
    let count = 0;
    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 500)) count++;
    if (filters.ratingMin && filters.ratingMin > 0) count++;
    if (filters.durationMax && filters.durationMax < 999) count++;
    return count;
  }, [filters]);

  // Handlers
  const handleCategoryToggle = (keyword: string) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(keyword)
      ? currentCategories.filter((c) => c !== keyword)
      : [...currentCategories, keyword];

    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handlePriceRangeChange = (value: number[]) => {
    onFiltersChange({ ...filters, priceRange: [value[0], value[1]] as [number, number] });
  };

  const handleRatingChange = (rating: number) => {
    onFiltersChange({ ...filters, ratingMin: rating });
  };

  const handleDurationChange = (maxMinutes: number | null) => {
    onFiltersChange({ ...filters, durationMax: maxMinutes || undefined });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      categories: [],
      priceRange: [0, 500],
      ratingMin: 0,
      durationMax: undefined,
    });
  };

  const activeCount = activeFilterCount();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Filtres</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
              {activeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Effacer
            </button>
          )}

          {compact && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <Filter className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {/* Filters Content */}
      {(!compact || isExpanded) && (
        <div className="space-y-5">
          {/* Categories */}
          <FilterSection icon={Sparkles} title="Catégories">
            {isLoadingCategories ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {categories.slice(0, 8).map((category) => {
                  const isSelected = filters.categories?.includes(category.keyword) || false;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.keyword)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all border",
                        isSelected
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50"
                      )}
                    >
                      <span className="text-base">{category.emoji}</span>
                      <span className="truncate">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </FilterSection>

          {/* Price Range */}
          <FilterSection icon={DollarSign} title="Budget">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Par personne</span>
                <span className="font-semibold text-primary">
                  {filters.priceRange?.[0] || 0}€ - {filters.priceRange?.[1] || 500}€
                </span>
              </div>
              <Slider
                value={filters.priceRange || [0, 500]}
                onValueChange={handlePriceRangeChange}
                min={0}
                max={500}
                step={10}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0€</span>
                <span>250€</span>
                <span>500€</span>
              </div>
            </div>
          </FilterSection>

          {/* Rating */}
          <FilterSection icon={Star} title="Note minimum">
            <div className="flex flex-wrap gap-2">
              {RATING_OPTIONS.map((option) => (
                <ChipButton
                  key={option.value}
                  selected={(filters.ratingMin || 0) === option.value}
                  onClick={() => handleRatingChange(option.value)}
                >
                  {option.value > 0 && <Star className="h-3 w-3 fill-current inline mr-1" />}
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </FilterSection>

          {/* Duration */}
          <FilterSection icon={Clock} title="Durée">
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((option) => (
                <ChipButton
                  key={option.id}
                  selected={(filters.durationMax || 999) === option.maxMinutes}
                  onClick={() =>
                    handleDurationChange(
                      (filters.durationMax || 999) === option.maxMinutes ? null : option.maxMinutes
                    )
                  }
                >
                  {option.label}
                </ChipButton>
              ))}
            </div>
          </FilterSection>
        </div>
      )}
    </div>
  );
};

export default ActivityFilters;
