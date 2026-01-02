/**
 * Activity Detail Modal
 *
 * Full-screen modal displaying comprehensive activity information
 * Features:
 * - Image carousel with responsive images
 * - Full description and highlights
 * - Pricing and booking information
 * - Reviews and ratings
 * - Duration, location, categories
 * - Add to trip / Remove from trip actions
 * - External booking link
 */

import { useState } from "react";
import { X, Star, Clock, MapPin, Users, Calendar, ExternalLink, Plus, Trash2, Award, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { ViatorActivity, ActivityEntry } from "@/types/activity";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityDetailModalProps {
  /**
   * Activity to display (from Viator API or user's planned activities)
   */
  activity: ViatorActivity | ActivityEntry | null;

  /**
   * Whether modal is open
   */
  open: boolean;

  /**
   * Called when modal closes
   */
  onClose: () => void;

  /**
   * Called when user adds activity to trip (for Viator activities)
   */
  onAdd?: (activity: ViatorActivity) => void;

  /**
   * Called when user removes activity from trip (for planned activities)
   */
  onRemove?: (activityId: string) => void;

  /**
   * Whether activity is already in the trip
   */
  isInTrip?: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

function isViatorActivity(activity: ViatorActivity | ActivityEntry): activity is ViatorActivity {
  return "product_code" in activity;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);

const renderStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
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
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ActivityDetailModal = ({
  activity,
  open,
  onClose,
  onAdd,
  onRemove,
  isInTrip = false,
}: ActivityDetailModalProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!activity) return null;

  // Extract common properties
  const title = activity.title;
  const description = activity.description;
  const images = activity.images || [];
  const categories = activity.categories || [];

  const rating = isViatorActivity(activity)
    ? activity.rating
    : "rating" in activity && activity.rating
    ? activity.rating
    : null;

  const pricing = isViatorActivity(activity)
    ? activity.pricing
    : "pricing" in activity && activity.pricing
    ? activity.pricing
    : null;

  const duration = activity.duration;
  const location = isViatorActivity(activity) ? activity.location : null;

  const productCode = isViatorActivity(activity) ? activity.product_code : null;
  const bookingUrl = isViatorActivity(activity) ? activity.booking_url : null;

  // Format duration
  const formatDuration = () => {
    if (!duration) return "Durée non spécifiée";
    const { min_duration, max_duration, unit } = duration;
    const unitLabel = unit === "hours" ? "h" : "min";
    if (min_duration === max_duration) {
      return `${min_duration}${unitLabel}`;
    }
    return `${min_duration}-${max_duration}${unitLabel}`;
  };

  // Check if activity has discount
  const hasDiscount = pricing && pricing.original_price && pricing.original_price > pricing.from_price;
  const discountPercentage = hasDiscount
    ? Math.round(((pricing.original_price! - pricing.from_price) / pricing.original_price!) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Image Carousel */}
        {images.length > 0 && (
          <div className="relative h-80 bg-gradient-to-br from-primary/5 to-primary/10">
            <Carousel className="w-full h-full">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative h-80 w-full">
                      <img
                        src={image.variants?.large || image.url}
                        alt={`${title} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Discount Badge */}
                      {hasDiscount && index === 0 && (
                        <div className="absolute top-4 left-4 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg font-bold text-sm">
                          -{discountPercentage}%
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </>
              )}
            </Carousel>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>

            {/* Rating */}
            {rating && (
              <div className="flex items-center gap-3 mb-3">
                {renderStars(rating.average)}
                <span className="text-sm font-medium text-foreground">{rating.average.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">
                  ({rating.count.toLocaleString()} avis)
                </span>
                {rating.average >= 4.8 && (
                  <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Top noté
                  </span>
                )}
              </div>
            )}

            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((category, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" />
                    {category}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoRow icon={Clock} label="Durée" value={formatDuration()} />
            {location && (
              <InfoRow
                icon={MapPin}
                label="Lieu"
                value={`${location.city || ""}, ${location.country || ""}`.trim()}
              />
            )}
            {pricing && (
              <InfoRow
                icon={Users}
                label="Prix par personne"
                value={`${pricing.from_price}€${pricing.currency ? ` ${pricing.currency}` : ""}`}
              />
            )}
            {isViatorActivity(activity) && activity.flags && activity.flags.length > 0 && (
              <InfoRow icon={Calendar} label="Options" value={activity.flags.join(", ")} />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>

          {/* Pricing Details */}
          {pricing && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Prix à partir de</p>
                  <div className="flex items-baseline gap-2">
                    {hasDiscount && (
                      <span className="text-lg text-muted-foreground line-through">
                        {pricing.original_price}€
                      </span>
                    )}
                    <span className="text-3xl font-bold text-primary">{pricing.from_price}€</span>
                    <span className="text-sm text-muted-foreground">/ personne</span>
                  </div>
                </div>
                {hasDiscount && (
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Économisez</span>
                    <p className="text-xl font-bold text-destructive">-{discountPercentage}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            {/* Booking Link */}
            {bookingUrl && (
              <Button variant="outline" size="lg" className="flex-1 gap-2" asChild>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Voir sur Viator
                </a>
              </Button>
            )}

            {/* Add/Remove Button */}
            {isInTrip ? (
              <Button
                variant="destructive"
                size="lg"
                className="flex-1 gap-2"
                onClick={() => {
                  if (onRemove && "id" in activity) {
                    onRemove(activity.id);
                    onClose();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Retirer du planning
              </Button>
            ) : (
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={() => {
                  if (onAdd && isViatorActivity(activity)) {
                    onAdd(activity);
                    onClose();
                  }
                }}
              >
                <Plus className="h-4 w-4" />
                Ajouter au planning
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDetailModal;
