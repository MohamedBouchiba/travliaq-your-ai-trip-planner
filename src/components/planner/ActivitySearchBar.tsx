/**
 * Activity Search Bar Component
 *
 * Search interface for finding activities
 * Features:
 * - Quick search by destination
 * - Date range selection
 * - Category quick filters
 * - Search suggestions
 * - Loading states
 */

import { useState, useCallback, useEffect } from "react";
import { Search, MapPin, Calendar, X, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivitySearchParams } from "@/types/activity";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivitySearchBarProps {
  /**
   * Default destination (city)
   */
  defaultCity?: string;

  /**
   * Default country code
   */
  defaultCountryCode?: string;

  /**
   * Default start date
   */
  defaultStartDate?: string;

  /**
   * Called when user submits search
   */
  onSearch: (params: ActivitySearchParams) => void;

  /**
   * Loading state
   */
  isSearching?: boolean;

  /**
   * Optional CSS class
   */
  className?: string;

  /**
   * Show compact mode
   */
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ActivitySearchBar = ({
  defaultCity = "",
  defaultCountryCode = "",
  defaultStartDate = "",
  onSearch,
  isSearching = false,
  className,
  compact = false,
}: ActivitySearchBarProps) => {
  const [city, setCity] = useState(defaultCity);
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [quickCategory, setQuickCategory] = useState<string | null>(null);

  // Update state when defaults change (e.g., destination selected)
  useEffect(() => {
    setCity(defaultCity);
    setCountryCode(defaultCountryCode);
    setStartDate(defaultStartDate);
  }, [defaultCity, defaultCountryCode, defaultStartDate]);

  // Quick category filters
  const quickCategories = [
    { id: "culture", label: "Culture", emoji: "🎨" },
    { id: "food", label: "Food", emoji: "🍽️" },
    { id: "nature", label: "Nature", emoji: "🌲" },
    { id: "adventure", label: "Aventure", emoji: "🧗" },
    { id: "beach", label: "Plage", emoji: "🏖️" },
  ];

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (!city || !countryCode) {
      return;
    }

    const params: ActivitySearchParams = {
      city,
      countryCode,
      startDate: startDate || new Date().toISOString().split("T")[0],
      categories: quickCategory ? [quickCategory] : undefined,
      currency: "EUR",
      language: "fr",
      page: 1,
      limit: 30,
    };

    onSearch(params);
  }, [city, countryCode, startDate, quickCategory, onSearch]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Clear search
  const handleClear = useCallback(() => {
    setCity(defaultCity);
    setCountryCode(defaultCountryCode);
    setStartDate(defaultStartDate);
    setQuickCategory(null);
  }, [defaultCity, defaultCountryCode, defaultStartDate]);

  const hasSearchParams = city && countryCode;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Search Input */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border/30 rounded-lg transition-all",
            "focus-within:bg-background focus-within:border-primary/50 focus-within:shadow-sm"
          )}
        >
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une destination..."
            disabled={isSearching}
            className={cn(
              "flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />

          {isSearching && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}

          {city && !isSearching && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
              title="Effacer"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Date Selection (if not compact) */}
      {!compact && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border/30 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSearching}
              className={cn(
                "flex-1 bg-transparent border-none outline-none text-sm text-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={!hasSearchParams || isSearching}
            className={cn(
              "px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-all",
              "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2"
            )}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Rechercher
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick Category Filters */}
      {!compact && hasSearchParams && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filtres rapides
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  const newCategory = quickCategory === category.id ? null : category.id;
                  setQuickCategory(newCategory);
                }}
                disabled={isSearching}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5",
                  quickCategory === category.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <span>{category.emoji}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Compact Search Button */}
      {compact && (
        <button
          onClick={handleSearch}
          disabled={!hasSearchParams || isSearching}
          className={cn(
            "w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-all",
            "hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recherche...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Rechercher
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ActivitySearchBar;
