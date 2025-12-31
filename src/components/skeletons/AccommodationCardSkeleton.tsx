import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for accommodation search result cards
 * Used in AccommodationPanel.tsx while loading accommodation data
 */
export function AccommodationCardSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Image placeholder */}
      <Skeleton className="h-48 w-full rounded-none" />

      <div className="p-4 space-y-3">
        {/* Hotel name and rating */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" /> {/* Name */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" /> {/* Stars */}
            <Skeleton className="h-4 w-16" /> {/* Rating */}
          </div>
        </div>

        {/* Location */}
        <Skeleton className="h-4 w-1/2" />

        {/* Amenities */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>

        {/* Price and action */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="space-y-1">
            <Skeleton className="h-6 w-28" /> {/* Price */}
            <Skeleton className="h-3 w-20" /> {/* Per night */}
          </div>
          <Skeleton className="h-9 w-24" /> {/* View button */}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for accommodation grid
 * @param count Number of skeleton cards to display
 */
export function AccommodationCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AccommodationCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for accommodation form fields
 * Used while accommodation panel is initializing
 */
export function AccommodationFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Location field */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" /> {/* Label */}
        <Skeleton className="h-10 w-full" /> {/* Input */}
      </div>

      {/* Date fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Budget slider */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>

      {/* Search button */}
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
