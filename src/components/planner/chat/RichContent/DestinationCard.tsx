/**
 * DestinationCard - Visual card for destination with image
 */

import { ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DestinationCardData } from "../types";

interface DestinationCardProps {
  destination: DestinationCardData;
  onExplore?: (destination: DestinationCardData) => void;
  className?: string;
}

// Fallback images for popular destinations
const FALLBACK_IMAGES: Record<string, string> = {
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop",
  london: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop",
  rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop",
  barcelona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=300&fit=crop",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop",
  "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=300&fit=crop",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop",
  amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400&h=300&fit=crop",
  default: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop",
};

function getImageUrl(city: string, providedUrl?: string): string {
  if (providedUrl) return providedUrl;
  const normalized = city.toLowerCase().trim();
  return FALLBACK_IMAGES[normalized] || FALLBACK_IMAGES.default;
}

export function DestinationCard({ destination, onExplore, className }: DestinationCardProps) {
  const imageUrl = getImageUrl(destination.city, destination.imageUrl);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        "max-w-sm transition-all hover:shadow-md",
        className
      )}
    >
      {/* Image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={imageUrl}
          alt={`${destination.city}, ${destination.country}`}
          className="w-full h-full object-cover transition-transform hover:scale-105"
          loading="lazy"
        />
        {/* Country badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
          {destination.countryCode || destination.country}
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{destination.city}</h4>
            <p className="text-xs text-muted-foreground">{destination.country}</p>
          </div>
        </div>

        {destination.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {destination.description}
          </p>
        )}
      </div>

      {/* Footer */}
      {onExplore && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onExplore(destination)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
          >
            Explorer
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
