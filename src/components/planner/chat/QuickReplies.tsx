/**
 * QuickReplies - Clickable chips after assistant messages for guided interaction
 * Fully i18n-enabled
 */

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { eventBus, emitTabChange } from "@/lib/eventBus";
import type { QuickReply, QuickReplyAction } from "./types";
import type { WidgetInteraction } from "@/contexts/WidgetHistoryContext";
import type { SessionEntities } from "./hooks/useChatStream";

interface QuickRepliesProps {
  replies: QuickReply[];
  onSendMessage: (message: string) => void;
  onFillInput?: (message: string) => void;
  onTriggerWidget?: (widget: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickReplies({
  replies,
  onSendMessage,
  onFillInput,
  onTriggerWidget,
  disabled = false,
  className,
}: QuickRepliesProps) {
  const handleQuickReply = (reply: QuickReply) => {
    if (disabled) return;

    const action = reply.action;

    switch (action.type) {
      // IMPORTANT: sendMessage now behaves like fillInput - never send directly!
      // This ensures users always have a chance to review/modify before sending
      case "sendMessage":
      case "fillInput":
        onFillInput?.(action.message);
        break;

      case "triggerWidget":
        onTriggerWidget?.(action.widget);
        break;

      case "emitEvent":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventBus.emit(action.event as any, action.payload);
        break;

      case "navigate":
        emitTabChange(action.tab);
        break;
    }
  };

  if (!replies || replies.length === 0) return null;

  // Handle horizontal scroll with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  return (
    <div
      onWheel={handleWheel}
      className={cn(
        "flex gap-2 mt-3 overflow-x-auto pb-1 themed-scroll",
        className
      )}
      style={{ scrollbarWidth: 'thin' }}
    >
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => handleQuickReply(reply)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all shrink-0",
            "hover:scale-[1.02] active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1",
            // Variants
            reply.variant === "primary" && [
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "shadow-sm shadow-primary/20",
            ],
            reply.variant === "outline" && [
              "border border-border bg-background text-foreground",
              "hover:bg-accent hover:border-primary/50",
            ],
            (!reply.variant || reply.variant === "default") && [
              "bg-muted text-foreground",
              "hover:bg-muted/80 hover:text-primary",
            ],
            // Disabled state
            disabled && "opacity-50 cursor-not-allowed hover:scale-100"
          )}
        >
          {reply.icon && <span className="text-base leading-none">{reply.icon}</span>}
          <span>{reply.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Hook to get localized quick reply presets
 */
export function useQuickReplyPresets() {
  const { t } = useTranslation();
  
  return {
    afterDestination: (city: string): QuickReply[] => [
      {
        id: "when-to-go",
        label: t("planner.quick.whenToGo"),
        icon: "📅",
        action: { type: "triggerWidget", widget: "datePicker" },
      },
      {
        id: "budget",
        label: t("planner.quick.howMuch"),
        icon: "💰",
        action: { type: "fillInput", message: t("planner.quickReplies.budgetQuestion", { city }) },
      },
      {
        id: "activities",
        label: t("planner.quick.seeActivities"),
        icon: "🎭",
        action: { type: "navigate", tab: "activities" },
      },
    ],

    afterFlightSearch: (): QuickReply[] => [
      {
        id: "cheapest",
        label: t("planner.quick.cheapestFlight"),
        icon: "💵",
        action: { type: "fillInput", message: t("planner.quickReplies.cheapestFlight") },
        variant: "primary",
      },
      {
        id: "fastest",
        label: t("planner.quick.fastestFlight"),
        icon: "⚡",
        action: { type: "fillInput", message: t("planner.quickReplies.fastestFlight") },
      },
      {
        id: "hotels",
        label: t("planner.quick.findHotel"),
        icon: "🏨",
        action: { type: "navigate", tab: "stays" },
      },
    ],

    afterDateSelection: (): QuickReply[] => [
      {
        id: "travelers",
        label: t("planner.quick.travelers"),
        icon: "👥",
        action: { type: "triggerWidget", widget: "travelersSelector" },
      },
      {
        id: "flexible",
        label: t("planner.quick.flexible"),
        icon: "🔄",
        action: { type: "fillInput", message: t("planner.quickReplies.flexibleDates") },
      },
    ],

    afterAccommodation: (): QuickReply[] => [
      {
        id: "activities",
        label: t("planner.quick.discoverActivities"),
        icon: "🎡",
        action: { type: "navigate", tab: "activities" },
        variant: "primary",
      },
      {
        id: "other-hotels",
        label: t("planner.quick.otherHotels"),
        icon: "🏨",
        action: { type: "fillInput", message: t("planner.quickReplies.moreAccommodations") },
      },
      {
        id: "summary",
        label: t("planner.quick.summary"),
        icon: "📋",
        action: { type: "fillInput", message: t("planner.quickReplies.tripSummary") },
      },
    ],

    general: (): QuickReply[] => [
      {
        id: "help",
        label: t("planner.quick.help"),
        icon: "❓",
        action: { type: "fillInput", message: t("planner.quickReplies.howToPlan") },
      },
      {
        id: "inspire",
        label: t("planner.quick.inspireMe"),
        icon: "✨",
        action: { type: "fillInput", message: t("planner.quickReplies.suggestDestination") },
      },
    ],
  };
}

/**
 * Pre-defined quick reply sets for common scenarios
 * @deprecated Use useQuickReplyPresets() hook instead for i18n support
 */
export const QUICK_REPLY_PRESETS = {
  afterDestination: (city: string): QuickReply[] => [
    {
      id: "when-to-go",
      label: "When to go?",
      icon: "📅",
      action: { type: "triggerWidget", widget: "datePicker" },
    },
    {
      id: "budget",
      label: "How much?",
      icon: "💰",
      action: { type: "fillInput", message: `What is the average budget for a trip to ${city}?` },
    },
    {
      id: "activities",
      label: "See activities",
      icon: "🎭",
      action: { type: "navigate", tab: "activities" },
    },
  ],

  afterFlightSearch: (): QuickReply[] => [
    {
      id: "cheapest",
      label: "Cheapest flight",
      icon: "💵",
      action: { type: "fillInput", message: "Show me the cheapest flight" },
      variant: "primary",
    },
    {
      id: "fastest",
      label: "Fastest flight",
      icon: "⚡",
      action: { type: "fillInput", message: "Show me the fastest flight" },
    },
    {
      id: "hotels",
      label: "Find a hotel",
      icon: "🏨",
      action: { type: "navigate", tab: "stays" },
    },
  ],

  afterDateSelection: (): QuickReply[] => [
    {
      id: "travelers",
      label: "Number of travelers",
      icon: "👥",
      action: { type: "triggerWidget", widget: "travelersSelector" },
    },
    {
      id: "flexible",
      label: "Flexible dates?",
      icon: "🔄",
      action: { type: "fillInput", message: "I'm flexible on dates, +/- a few days" },
    },
  ],

  afterAccommodation: (): QuickReply[] => [
    {
      id: "activities",
      label: "Discover activities",
      icon: "🎡",
      action: { type: "navigate", tab: "activities" },
      variant: "primary",
    },
    {
      id: "other-hotels",
      label: "Other hotels",
      icon: "🏨",
      action: { type: "fillInput", message: "Show me other accommodation options" },
    },
    {
      id: "summary",
      label: "Summary",
      icon: "📋",
      action: { type: "fillInput", message: "Give me a summary of my trip" },
    },
  ],

  general: (): QuickReply[] => [
    {
      id: "help",
      label: "Help",
      icon: "❓",
      action: { type: "fillInput", message: "How can I plan my trip?" },
    },
    {
      id: "inspire",
      label: "Inspire me",
      icon: "✨",
      action: { type: "fillInput", message: "Suggest a destination for my next vacation" },
    },
  ],
} as const;

/**
 * Hook to generate dynamic quick replies based on widget interactions and session context
 * Phase 3: Intelligent, context-aware quick replies
 */
export function useDynamicQuickReplies(
  widgetInteractions: WidgetInteraction[],
  sessionEntities?: SessionEntities,
  flowState?: {
    hasDestination: boolean;
    hasDestinationCity: boolean;
    hasDepartureDate: boolean;
    hasTravelers: boolean;
    isReadyToSearch: boolean;
  }
) {
  const { t } = useTranslation();

  const generateContextualReplies = useCallback((): QuickReply[] => {
    const replies: QuickReply[] = [];

    // Get recent interaction types
    const recentInteractions = widgetInteractions.slice(-5);
    const recentTypes = new Set(recentInteractions.map((i) => i.interactionType));

    // If user selected multiple destinations, offer comparison
    const destinations = widgetInteractions
      .filter((w) => w.interactionType === "destination_selected" || w.interactionType === "city_selected")
      .map((w) => (w.data?.destinationName || w.data?.cityName) as string)
      .filter(Boolean);

    if (destinations.length > 1) {
      replies.push({
        id: "compare-destinations",
        label: t("planner.quickReplies.compareDestinations", "Comparer ces destinations"),
        icon: "⚖️",
        action: {
          type: "fillInput",
          message: t("planner.quickReplies.compareMessage", "Peux-tu comparer ces destinations?"),
        },
      });
    }

    // If user completed dates but not budget, suggest budget
    const hasCompletedDates = recentTypes.has("date_range_selected") || recentTypes.has("date_selected");
    const hasMentionedBudget = sessionEntities?.budgets && sessionEntities.budgets.length > 0;

    if (hasCompletedDates && !hasMentionedBudget) {
      replies.push({
        id: "define-budget",
        label: t("planner.quickReplies.defineBudget", "Définir mon budget"),
        icon: "💰",
        action: {
          type: "fillInput",
          message: t("planner.quickReplies.budgetMessage", "Je voudrais définir un budget"),
        },
      });
    }

    // If user completed travelers, suggest activities
    if (recentTypes.has("travelers_selected")) {
      replies.push({
        id: "activities-suggestion",
        label: t("planner.quickReplies.whatToDo", "Que faire sur place?"),
        icon: "🎭",
        action: {
          type: "navigate",
          tab: "activities",
        },
        variant: "outline",
      });
    }

    // If user configured style/interests BUT hasn't chosen a destination yet, offer suggestions
    if ((recentTypes.has("style_configured") || recentTypes.has("interests_selected")) && 
        flowState && !flowState.hasDestinationCity && !flowState.hasDestination) {
      replies.push({
        id: "suggest-destinations",
        label: t("planner.quickReplies.suggestForMe", "Suggère-moi des destinations"),
        icon: "✨",
        action: {
          type: "fillInput",
          message: t("planner.quickReplies.suggestMessage", "Donne-moi 3 recommandations selon mon profil"),
        },
        variant: "primary",
      });
    }

    // If ready to search, always show search button
    if (flowState?.isReadyToSearch) {
      replies.push({
        id: "launch-search",
        label: t("planner.quickReplies.launchSearch", "Lancer la recherche"),
        icon: "🚀",
        action: {
          type: "fillInput",
          message: t("planner.quickReplies.searchFlights", "Recherche les vols maintenant"),
        },
        variant: "primary",
      });
    }

    // If nothing specific, return general helpful suggestions
    if (replies.length === 0) {
      // Based on what's missing in flow state
      if (flowState && !flowState.hasDestinationCity && !flowState.hasDestination) {
        replies.push({
          id: "inspire-me",
          label: t("planner.quickReplies.inspireMe", "Inspirez-moi"),
          icon: "✨",
          action: {
            type: "fillInput",
            message: t("planner.quickReplies.inspireMessage", "Je ne sais pas où partir, inspirez-moi!"),
          },
        });
      } else if (flowState && !flowState.hasDepartureDate) {
        replies.push({
          id: "when-to-go",
          label: t("planner.quickReplies.whenToGo", "Quand partir?"),
          icon: "📅",
          action: {
            type: "triggerWidget",
            widget: "dateRangePicker",
          },
        });
      } else if (flowState && !flowState.hasTravelers) {
        replies.push({
          id: "how-many",
          label: t("planner.quickReplies.howMany", "Nombre de voyageurs"),
          icon: "👥",
          action: {
            type: "triggerWidget",
            widget: "travelersSelector",
          },
        });
      }
    }

    // Limit to 4 max
    return replies.slice(0, 4);
  }, [widgetInteractions, sessionEntities, flowState, t]);

  return {
    generateContextualReplies,
  };
}
