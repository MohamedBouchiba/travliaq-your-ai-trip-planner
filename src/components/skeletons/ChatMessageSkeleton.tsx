import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for assistant chat messages
 * Used in PlannerChat.tsx while assistant is typing/processing
 */
export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 max-w-[85%]">
      {/* Assistant avatar */}
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />

      {/* Message content */}
      <div className="flex-1 space-y-2 bg-muted rounded-lg p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/**
 * Skeleton for chat message with action buttons
 * Used when loading messages with interactive widgets
 */
export function ChatMessageWithActionsSkeleton() {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />

      <div className="flex-1 space-y-3 bg-muted rounded-lg p-3">
        {/* Message text */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for typing indicator
 * Animated dots to show assistant is processing
 */
export function TypingIndicatorSkeleton() {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />

      <div className="bg-muted rounded-lg px-4 py-3">
        <div className="flex gap-1">
          <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
