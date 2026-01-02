/**
 * ActivityCard - Rich visual card for Travliaq API activities
 */

import { memo } from "react";
import { Heart, Star, Clock, ExternalLink, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { TravliaqActivity } from "@/contexts/ActivityMemoryContext";
import { Button } from "@/components/ui/button";

interface ActivityCardProps {
  activity: TravliaqActivity;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
  compact?: boolean;
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const ActivityCard = memo(function ActivityCard({
  activity,
  isSaved,
  onSave,
  onUnsave,
  compact = false,
}: ActivityCardProps) {
  const coverImage = activity.images?.find(img => img.is_cover) || activity.images?.[0];
  const imageUrl = coverImage?.variants?.medium || coverImage?.url;
  const isPopular = activity.flags?.includes("LIKELY_TO_SELL_OUT");
  const isInstantConfirmation = activity.confirmation_type === "INSTANT";

  const handleBookClick = () => {
    if (activity.booking_url) {
      window.open(activity.booking_url, "_blank", "noopener,noreferrer");
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
        {/* Thumbnail */}
        {imageUrl && (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={imageUrl}
              alt={activity.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{activity.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{activity.duration.formatted}</span>
            <span>•</span>
            <span className="text-primary font-medium">
              {formatPrice(activity.pricing.from_price, activity.pricing.currency)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={isSaved ? onUnsave : onSave}
          className={cn(
            "p-1.5 rounded-full transition-colors",
            isSaved
              ? "text-red-500 bg-red-500/10"
              : "text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-md transition-all group">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={activity.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <span className="text-4xl">🎭</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {isPopular && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-semibold flex items-center gap-1">
              <Flame className="h-3 w-3" />
              Très demandé
            </span>
          )}
          {activity.pricing.is_discounted && (
            <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-semibold">
              Promo
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={isSaved ? onUnsave : onSave}
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full transition-all",
            isSaved
              ? "bg-white text-red-500"
              : "bg-black/30 backdrop-blur-sm text-white hover:bg-white hover:text-red-500"
          )}
        >
          <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
          {activity.title}
        </h3>

        {/* Rating & Duration */}
        <div className="flex items-center gap-3 text-xs">
          {activity.rating.average > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{activity.rating.average.toFixed(1)}</span>
              <span className="text-muted-foreground">({activity.rating.count.toLocaleString()})</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{activity.duration.formatted}</span>
          </div>
        </div>

        {/* Price & Book */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-baseline gap-1">
            {activity.pricing.is_discounted && activity.pricing.original_price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(activity.pricing.original_price, activity.pricing.currency)}
              </span>
            )}
            <span className="text-sm font-semibold text-primary">
              À partir de {formatPrice(activity.pricing.from_price, activity.pricing.currency)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            className="flex-1 h-8 text-xs"
            onClick={handleBookClick}
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            Réserver
          </Button>
        </div>

        {/* Instant confirmation badge */}
        {isInstantConfirmation && (
          <p className="text-[10px] text-green-600 font-medium text-center">
            ✓ Confirmation instantanée
          </p>
        )}
      </div>
    </div>
  );
});

export default ActivityCard;
