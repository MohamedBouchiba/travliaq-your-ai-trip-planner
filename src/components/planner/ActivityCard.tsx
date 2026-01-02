/**
 * Activity Card Component
 *
 * Enhanced card component for displaying activities in different contexts:
 * - "search" mode: Display search results with "Add" button
 * - "planned" mode: Display planned activities with "View Details" and "Remove" buttons
 *
 * Features:
 * - Responsive images (small/medium/large)
 * - Badges (discount, popular, top-rated)
 * - Rating with stars
 * - Duration and pricing
 * - Category tags
 * - Hover effects
 */

import { Star, Clock, MapPin, Plus, Trash2, Eye, Users, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViatorActivity, ActivityEntry } from "@/types/activity";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityCardProps {
  /**
   * Activity data (from Viator API or user's planned activities)
   */
  activity: ViatorActivity | ActivityEntry;

  /**
   * Display mode
   * - "search": Show "Add" button (for search results)
   * - "planned": Show "View Details" and "Remove" buttons (for planned activities)
   */
  mode: "search" | "planned";

  /**
   * Called when user clicks "Add" button (search mode only)
   */
  onAdd?: () => void;

  /**
   * Called when user clicks card or "View Details" button
   */
  onClick?: () => void;

  /**
   * Called when user clicks "Remove" button (planned mode only)
   */
  onRemove?: () => void;

  /**
   * Optional CSS class
   */
  className?: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if activity is from Viator API
 */
function isViatorActivity(activity: ViatorActivity | ActivityEntry): activity is ViatorActivity {
  return "product_code" in activity;
}

/**
 * Check if activity is a planned activity
 */
function isActivityEntry(activity: ViatorActivity | ActivityEntry): activity is ActivityEntry {
  return "destinationId" in activity;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get discount percentage if available
 */
function getDiscountPercentage(activity: ViatorActivity | ActivityEntry): number | null {
  if (isViatorActivity(activity)) {
    const { from_price, original_price } = activity.pricing;
    if (original_price && original_price > from_price) {
      return Math.round(((original_price - from_price) / original_price) * 100);
    }
  }
  return null;
}

/**
 * Check if activity is popular (high review count)
 */
function isPopular(activity: ViatorActivity | ActivityEntry): boolean {
  if (isViatorActivity(activity)) {
    return activity.rating.count >= 500;
  }
  return false;
}

/**
 * Check if activity is top-rated
 */
function isTopRated(activity: ViatorActivity | ActivityEntry): boolean {
  if (isViatorActivity(activity)) {
    return activity.rating.average >= 4.8;
  }
  if (isActivityEntry(activity) && activity.rating) {
    return activity.rating.average >= 4.8;
  }
  return false;
}

/**
 * Format duration text
 */
function formatDuration(activity: ViatorActivity | ActivityEntry): string {
  if (isViatorActivity(activity)) {
    const { min_duration, max_duration, unit } = activity.duration;
    if (min_duration === max_duration) {
      return `${min_duration}${unit === "hours" ? "h" : "min"}`;
    }
    return `${min_duration}-${max_duration}${unit === "hours" ? "h" : "min"}`;
  }

  if (isActivityEntry(activity) && activity.duration) {
    const { min_duration, max_duration, unit } = activity.duration;
    if (min_duration === max_duration) {
      return `${min_duration}${unit === "hours" ? "h" : "min"}`;
    }
    return `${min_duration}-${max_duration}${unit === "hours" ? "h" : "min"}`;
  }

  return "Durée non spécifiée";
}

/**
 * Get responsive image URL
 */
function getImageUrl(activity: ViatorActivity | ActivityEntry, size: "small" | "medium" | "large" = "medium"): string | null {
  const images = activity.images;
  if (!images || images.length === 0) return null;

  const primaryImage = images[0];

  // Use variants if available
  if (primaryImage.variants && primaryImage.variants[size]) {
    return primaryImage.variants[size];
  }

  // Fallback to main URL
  return primaryImage.url || null;
}

/**
 * Render star rating
 */
function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < fullStars
              ? "fill-amber-400 text-amber-400"
              : i === fullStars && hasHalfStar
              ? "fill-amber-400/50 text-amber-400"
              : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ActivityCard = ({ activity, mode, onAdd, onClick, onRemove, className }: ActivityCardProps) => {
  const imageUrl = getImageUrl(activity, "medium");
  const discountPercentage = getDiscountPercentage(activity);
  const popular = isPopular(activity);
  const topRated = isTopRated(activity);

  // Extract common properties
  const title = activity.title;
  const rating = isViatorActivity(activity)
    ? activity.rating
    : isActivityEntry(activity) && activity.rating
    ? activity.rating
    : null;

  const pricing = isViatorActivity(activity)
    ? activity.pricing
    : isActivityEntry(activity) && activity.pricing
    ? activity.pricing
    : null;

  const categories = activity.categories || [];

  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl border border-border overflow-hidden transition-all hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountPercentage && (
            <span className="px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-md">
              -{discountPercentage}%
            </span>
          )}
          {popular && (
            <span className="px-2 py-0.5 bg-accent text-accent-foreground text-xs font-medium rounded-md flex items-center gap-1">
              <Users className="h-3 w-3" />
              Populaire
            </span>
          )}
          {topRated && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-md flex items-center gap-1">
              <Award className="h-3 w-3" />
              Top noté
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">
          {title}
        </h4>

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-2">
            {renderStars(rating.average)}
            <span className="text-xs text-muted-foreground">
              {rating.average.toFixed(1)} ({rating.count.toLocaleString()} avis)
            </span>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDuration(activity)}</span>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 3).map((category, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded-full"
              >
                {category}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded-full">
                +{categories.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Pricing & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex flex-col">
            {pricing && (
              <>
                {pricing.original_price && pricing.original_price > pricing.from_price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {pricing.original_price}€
                  </span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-primary">
                    {pricing.from_price}€
                  </span>
                  <span className="text-xs text-muted-foreground">/ pers</span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {mode === "search" && onAdd && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                className="px-3 py-1.5 bg-accent text-accent-foreground hover:opacity-90 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            )}

            {mode === "planned" && (
              <>
                {onClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                    className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Détails
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
