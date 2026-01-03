/**
 * QuickReplies - Clickable chips after assistant messages for guided interaction
 */

import { cn } from "@/lib/utils";
import { eventBus, emitTabChange } from "@/lib/eventBus";
import type { QuickReply, QuickReplyAction } from "./types";

interface QuickRepliesProps {
  replies: QuickReply[];
  onSendMessage: (message: string) => void;
  onTriggerWidget?: (widget: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickReplies({
  replies,
  onSendMessage,
  onTriggerWidget,
  disabled = false,
  className,
}: QuickRepliesProps) {
  const handleQuickReply = (reply: QuickReply) => {
    if (disabled) return;

    const action = reply.action;

    switch (action.type) {
      case "sendMessage":
        onSendMessage(action.message);
        break;

      case "triggerWidget":
        onTriggerWidget?.(action.widget);
        break;

      case "emitEvent":
        eventBus.emit(action.event as keyof typeof eventBus, action.payload);
        break;

      case "navigate":
        emitTabChange(action.tab);
        break;
    }
  };

  if (!replies || replies.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 mt-3",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      {replies.map((reply) => (
        <button
          key={reply.id}
          onClick={() => handleQuickReply(reply)}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
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
 * Pre-defined quick reply sets for common scenarios
 */
export const QUICK_REPLY_PRESETS = {
  afterDestination: (city: string): QuickReply[] => [
    {
      id: "when-to-go",
      label: "Quand partir?",
      icon: "📅",
      action: { type: "triggerWidget", widget: "datePicker" },
    },
    {
      id: "budget",
      label: "Combien ça coûte?",
      icon: "💰",
      action: { type: "sendMessage", message: `Quel est le budget moyen pour un voyage à ${city}?` },
    },
    {
      id: "activities",
      label: "Voir les activités",
      icon: "🎭",
      action: { type: "navigate", tab: "activities" },
    },
  ],

  afterFlightSearch: (): QuickReply[] => [
    {
      id: "cheapest",
      label: "Vol le moins cher",
      icon: "💵",
      action: { type: "sendMessage", message: "Montre-moi le vol le moins cher" },
      variant: "primary",
    },
    {
      id: "fastest",
      label: "Vol le plus rapide",
      icon: "⚡",
      action: { type: "sendMessage", message: "Montre-moi le vol le plus rapide" },
    },
    {
      id: "hotels",
      label: "Chercher un hôtel",
      icon: "🏨",
      action: { type: "navigate", tab: "stays" },
    },
  ],

  afterDateSelection: (): QuickReply[] => [
    {
      id: "travelers",
      label: "Nombre de voyageurs",
      icon: "👥",
      action: { type: "triggerWidget", widget: "travelersSelector" },
    },
    {
      id: "flexible",
      label: "Dates flexibles?",
      icon: "🔄",
      action: { type: "sendMessage", message: "Je suis flexible sur les dates, +/- quelques jours" },
    },
  ],

  afterAccommodation: (): QuickReply[] => [
    {
      id: "activities",
      label: "Découvrir les activités",
      icon: "🎡",
      action: { type: "navigate", tab: "activities" },
      variant: "primary",
    },
    {
      id: "other-hotels",
      label: "Autres hôtels",
      icon: "🏨",
      action: { type: "sendMessage", message: "Montre-moi d'autres options d'hébergement" },
    },
    {
      id: "summary",
      label: "Récapitulatif",
      icon: "📋",
      action: { type: "sendMessage", message: "Fais-moi un récapitulatif de mon voyage" },
    },
  ],

  general: (): QuickReply[] => [
    {
      id: "help",
      label: "Aide",
      icon: "❓",
      action: { type: "sendMessage", message: "Comment puis-je planifier mon voyage?" },
    },
    {
      id: "inspire",
      label: "Inspire-moi",
      icon: "✨",
      action: { type: "sendMessage", message: "Suggère-moi une destination pour mes prochaines vacances" },
    },
  ],
} as const;
