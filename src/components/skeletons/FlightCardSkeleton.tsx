import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for flight search result cards
 * Used in FlightResults.tsx while loading flight data
 */
export function FlightCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      {/* Airline logo and flight number */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Flight route (departure → arrival) */}
      <div className="flex items-center justify-between gap-4">
        {/* Departure */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-16" /> {/* Time */}
          <Skeleton className="h-4 w-20" /> {/* Airport code */}
        </div>

        {/* Duration and stops */}
        <div className="flex-1 flex flex-col items-center space-y-2">
          <Skeleton className="h-3 w-16" /> {/* Duration */}
          <Skeleton className="h-1 w-full" /> {/* Line */}
          <Skeleton className="h-3 w-12" /> {/* Stops */}
        </div>

        {/* Arrival */}
        <div className="flex-1 space-y-2 text-right">
          <Skeleton className="h-6 w-16 ml-auto" /> {/* Time */}
          <Skeleton className="h-4 w-20 ml-auto" /> {/* Airport code */}
        </div>
      </div>

      {/* Price and action button */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="space-y-1">
          <Skeleton className="h-6 w-24" /> {/* Price */}
          <Skeleton className="h-3 w-16" /> {/* Per person */}
        </div>
        <Skeleton className="h-10 w-28" /> {/* Select button */}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for multiple flight cards
 * @param count Number of skeleton cards to display
 */
export function FlightCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <FlightCardSkeleton key={i} />
      ))}
    </div>
  );
}
