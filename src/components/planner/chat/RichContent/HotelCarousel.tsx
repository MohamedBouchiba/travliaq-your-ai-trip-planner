/**
 * HotelCarousel - Horizontal carousel of hotel cards
 */

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { HotelCardData } from "../types";

interface HotelCardProps {
  hotel: HotelCardData;
  onSelect?: (hotel: HotelCardData) => void;
}

function HotelCard({ hotel, onSelect }: HotelCardProps) {
  return (
    <div
      onClick={() => onSelect?.(hotel)}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        "transition-all hover:shadow-md",
        onSelect && "cursor-pointer hover:border-primary/30"
      )}
    >
      {/* Image */}
      {hotel.imageUrl && (
        <div className="relative h-24 overflow-hidden">
          <img
            src={hotel.imageUrl}
            alt={hotel.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Stars badge */}
          {hotel.stars && (
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-xs flex items-center gap-0.5">
              {hotel.stars}
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-2.5">
        <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
          {hotel.name}
        </h4>

        {/* Rating */}
        {hotel.rating && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">
              {hotel.rating.toFixed(1)}
            </div>
            {hotel.reviewCount && (
              <span className="text-xs text-muted-foreground">
                {hotel.reviewCount} avis
              </span>
            )}
          </div>
        )}

        {/* Price */}
        {hotel.pricePerNight !== undefined && (
          <div className="mt-1.5">
            <span className="text-sm font-bold text-primary">
              {hotel.pricePerNight}{hotel.currency || "€"}
            </span>
            <span className="text-xs text-muted-foreground ml-1">/ nuit</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface HotelCarouselProps {
  hotels: HotelCardData[];
  onSelect?: (hotel: HotelCardData) => void;
  className?: string;
}

export function HotelCarousel({ hotels, onSelect, className }: HotelCarouselProps) {
  if (!hotels || hotels.length === 0) return null;

  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
      }}
      className={cn("w-full max-w-md", className)}
    >
      <CarouselContent className="-ml-2">
        {hotels.map((hotel) => (
          <CarouselItem key={hotel.id} className="pl-2 basis-2/3 md:basis-1/2">
            <HotelCard hotel={hotel} onSelect={onSelect} />
          </CarouselItem>
        ))}
      </CarouselContent>
      {hotels.length > 2 && (
        <>
          <CarouselPrevious className="hidden md:flex -left-3 h-8 w-8" />
          <CarouselNext className="hidden md:flex -right-3 h-8 w-8" />
        </>
      )}
    </Carousel>
  );
}
