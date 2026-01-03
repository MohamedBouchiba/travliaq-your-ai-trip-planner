/**
 * ActivityCarousel - Horizontal carousel of activity cards
 */

import { Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { ActivityCardData } from "../types";

interface ActivityCardProps {
  activity: ActivityCardData;
  onSelect?: (activity: ActivityCardData) => void;
}

function ActivityCard({ activity, onSelect }: ActivityCardProps) {
  return (
    <div
      onClick={() => onSelect?.(activity)}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        "transition-all hover:shadow-md",
        onSelect && "cursor-pointer hover:border-primary/30"
      )}
    >
      {/* Image */}
      {activity.imageUrl && (
        <div className="relative h-24 overflow-hidden">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-2.5">
        <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
          {activity.title}
        </h4>

        <div className="flex items-center gap-2 mt-1.5">
          {/* Rating */}
          {activity.rating && (
            <div className="flex items-center gap-0.5 text-xs">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{activity.rating.toFixed(1)}</span>
              {activity.reviewCount && (
                <span className="text-muted-foreground">({activity.reviewCount})</span>
              )}
            </div>
          )}

          {/* Duration */}
          {activity.duration && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{activity.duration}</span>
            </div>
          )}
        </div>

        {/* Price */}
        {activity.price !== undefined && (
          <div className="mt-1.5">
            <span className="text-sm font-bold text-primary">
              {activity.price}{activity.currency || "€"}
            </span>
            <span className="text-xs text-muted-foreground ml-1">/ pers.</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityCarouselProps {
  activities: ActivityCardData[];
  onSelect?: (activity: ActivityCardData) => void;
  className?: string;
}

export function ActivityCarousel({ activities, onSelect, className }: ActivityCarouselProps) {
  if (!activities || activities.length === 0) return null;

  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
      }}
      className={cn("w-full max-w-md", className)}
    >
      <CarouselContent className="-ml-2">
        {activities.map((activity) => (
          <CarouselItem key={activity.id} className="pl-2 basis-2/3 md:basis-1/2">
            <ActivityCard activity={activity} onSelect={onSelect} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {activities.length > 2 && (
        <>
          <CarouselPrevious className="hidden md:flex -left-3 h-8 w-8" />
          <CarouselNext className="hidden md:flex -right-3 h-8 w-8" />
        </>
      )}
    </Carousel>
  );
}
