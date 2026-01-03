/**
 * FlightPreview - Mini flight card inline
 */

import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlightPreviewData } from "../types";

interface FlightPreviewProps {
  flight: FlightPreviewData;
  onSelect?: (flight: FlightPreviewData) => void;
  className?: string;
}

export function FlightPreview({ flight, onSelect, className }: FlightPreviewProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(flight);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 p-3 bg-muted rounded-lg",
        "border border-border/50",
        onSelect && "cursor-pointer hover:bg-muted/80 hover:border-primary/30 transition-all",
        className
      )}
    >
      {/* Departure */}
      <div className="text-center min-w-[50px]">
        <div className="text-lg font-bold text-foreground">{flight.fromIata}</div>
        <div className="text-xs text-muted-foreground">{flight.departureTime}</div>
      </div>

      {/* Flight path */}
      <div className="flex-1 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <div className="relative">
          <Plane className="h-4 w-4 text-primary" />
          {flight.airline && (
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap">
              {flight.airline}
            </span>
          )}
        </div>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Arrival */}
      <div className="text-center min-w-[50px]">
        <div className="text-lg font-bold text-foreground">{flight.toIata}</div>
        <div className="text-xs text-muted-foreground">{flight.arrivalTime}</div>
      </div>

      {/* Price & Duration */}
      <div className="text-right pl-2 border-l border-border">
        <div className="font-bold text-primary">
          {flight.price}{flight.currency || "€"}
        </div>
        <div className="text-xs text-muted-foreground">{flight.duration}</div>
      </div>
    </div>
  );
}

/**
 * FlightPreviewList - Multiple flight previews
 */
export function FlightPreviewList({
  flights,
  onSelect,
  maxDisplay = 3,
  className,
}: {
  flights: FlightPreviewData[];
  onSelect?: (flight: FlightPreviewData) => void;
  maxDisplay?: number;
  className?: string;
}) {
  const displayedFlights = flights.slice(0, maxDisplay);
  const remainingCount = flights.length - maxDisplay;

  return (
    <div className={cn("space-y-2", className)}>
      {displayedFlights.map((flight, idx) => (
        <FlightPreview
          key={`${flight.fromIata}-${flight.toIata}-${idx}`}
          flight={flight}
          onSelect={onSelect}
        />
      ))}
      {remainingCount > 0 && (
        <div className="text-center text-xs text-muted-foreground py-1">
          +{remainingCount} autres vols disponibles
        </div>
      )}
    </div>
  );
}
