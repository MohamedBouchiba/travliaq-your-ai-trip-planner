/**
 * ActivityCardSkeleton - Loading skeleton for activity cards
 */

import { Skeleton } from "@/components/ui/skeleton";

interface ActivityCardSkeletonProps {
  compact?: boolean;
}

export function ActivityCardSkeleton({ compact = false }: ActivityCardSkeletonProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden bg-card border border-border/40">
      {/* Image skeleton */}
      <Skeleton className="aspect-[16/10] w-full" />

      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Rating & Duration */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Price */}
        <Skeleton className="h-4 w-24" />

        {/* Button */}
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </div>
  );
}

export function ActivityCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ActivityCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default ActivityCardSkeleton;
