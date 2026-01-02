/**
 * ActivityCard - Rich visual card for map markers popup
 * Designed to look great on the Mapbox map
 */

import { memo } from "react";
import { Heart, Star, Clock, ExternalLink, Flame, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { TravliaqActivity } from "@/contexts/ActivityMemoryContext";
import { Button } from "@/components/ui/button";

interface ActivityCardProps {
  activity: TravliaqActivity;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
  variant?: "default" | "map" | "compact";
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Check if the activity is truly on promo (original price > current price)
const isRealDiscount = (activity: TravliaqActivity): boolean => {
  if (!activity.pricing.is_discounted) return false;
  if (!activity.pricing.original_price) return false;
  return activity.pricing.original_price > activity.pricing.from_price;
};

export const ActivityCard = memo(function ActivityCard({
  activity,
  isSaved,
  onSave,
  onUnsave,
  variant = "default",
}: ActivityCardProps) {
  const coverImage = activity.images?.find(img => img.is_cover) || activity.images?.[0];
  const imageUrl = coverImage?.variants?.medium || coverImage?.url;
  const isPopular = activity.flags?.includes("LIKELY_TO_SELL_OUT");
  const hasRealDiscount = isRealDiscount(activity);

  const handleBookClick = () => {
    if (activity.booking_url) {
      window.open(activity.booking_url, "_blank", "noopener,noreferrer");
    }
  };

  // Compact variant - for saved activities list in panel
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition-all group">
        {/* Thumbnail */}
        {imageUrl && (
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {activity.rating?.average > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {activity.rating.average.toFixed(1)}
              </span>
            )}
            <span>{activity.duration?.formatted}</span>
          </div>
          <p className="text-sm font-semibold text-primary mt-1">
            {formatPrice(activity.pricing.from_price, activity.pricing.currency)}
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={isSaved ? onUnsave : onSave}
          className={cn(
            "p-2 rounded-full transition-all",
            isSaved
              ? "text-red-500 bg-red-500/10"
              : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
          )}
        >
          <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
        </button>
      </div>
    );
  }

  // Map variant - for displaying in map popup (more stylized)
  if (variant === "map") {
    return (
      <div className="w-72 rounded-xl overflow-hidden bg-card shadow-xl border border-border/50">
        {/* Image with gradient overlay */}
        <div className="relative h-36 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={activity.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <MapPin className="h-10 w-10 text-primary/50" />
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {isPopular && (
              <span className="px-2 py-1 rounded-full bg-orange-500/90 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 shadow-lg">
                <Flame className="h-3 w-3" />
                Populaire
              </span>
            )}
            {hasRealDiscount && (
              <span className="px-2 py-1 rounded-full bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold shadow-lg">
                Promo
              </span>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={isSaved ? onUnsave : onSave}
            className={cn(
              "absolute top-2 right-2 p-2 rounded-full shadow-lg transition-all",
              isSaved
                ? "bg-white text-red-500"
                : "bg-white/90 backdrop-blur-sm text-muted-foreground hover:text-red-500"
            )}
          >
            <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
          </button>

          {/* Price badge */}
          <div className="absolute bottom-2 left-2">
            <div className="flex items-baseline gap-1.5">
              {hasRealDiscount && (
                <span className="text-xs text-white/70 line-through">
                  {formatPrice(activity.pricing.original_price!, activity.pricing.currency)}
                </span>
              )}
              <span className="px-2 py-1 rounded-lg bg-white/95 backdrop-blur-sm text-sm font-bold text-primary shadow-lg">
                {formatPrice(activity.pricing.from_price, activity.pricing.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug">
            {activity.title}
          </h3>

          {/* Rating & Duration */}
          <div className="flex items-center gap-3 text-xs">
            {activity.rating?.average > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{activity.rating.average.toFixed(1)}</span>
                <span className="text-muted-foreground">({activity.rating.count.toLocaleString()})</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{activity.duration?.formatted}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={isSaved ? "secondary" : "default"}
              className="flex-1 h-9 text-xs font-medium"
              onClick={isSaved ? onUnsave : onSave}
            >
              <Heart className={cn("h-3.5 w-3.5 mr-1.5", isSaved && "fill-current text-red-500")} />
              {isSaved ? "Sauvegardé" : "Sauvegarder"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3"
              onClick={handleBookClick}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default variant - grid display
  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border/40 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all group">
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
            <MapPin className="h-8 w-8 text-primary/30" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {isPopular && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500/90 backdrop-blur-sm text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
              <Flame className="h-3 w-3" />
              Très demandé
            </span>
          )}
          {hasRealDiscount && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold shadow-md">
              -{Math.round((1 - activity.pricing.from_price / activity.pricing.original_price!) * 100)}%
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={isSaved ? onUnsave : onSave}
          className={cn(
            "absolute top-2 right-2 p-2 rounded-full transition-all shadow-md",
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
        <h3 className="font-semibold text-sm line-clamp-2 leading-snug min-h-[2.5rem]">
          {activity.title}
        </h3>

        {/* Rating & Duration */}
        <div className="flex items-center gap-3 text-xs">
          {activity.rating?.average > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{activity.rating.average.toFixed(1)}</span>
              <span className="text-muted-foreground">({activity.rating.count.toLocaleString()})</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{activity.duration?.formatted}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 pt-1">
          {hasRealDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(activity.pricing.original_price!, activity.pricing.currency)}
            </span>
          )}
          <span className="text-sm font-bold text-primary">
            À partir de {formatPrice(activity.pricing.from_price, activity.pricing.currency)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="default"
            className="flex-1 h-8 text-xs font-medium"
            onClick={handleBookClick}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Réserver
          </Button>
        </div>
      </div>
    </div>
  );
});

export default ActivityCard;
