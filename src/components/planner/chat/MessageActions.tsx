/**
 * MessageActions - Copy, Like, Dislike buttons for assistant messages
 * Extracted from PlannerChat for better maintainability
 */

import { useState, useRef, memo } from "react";
import { Copy, ThumbsUp, ThumbsDown, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MessageActionsProps {
  messageId: string;
  text: string;
  onRegenerate?: () => void;
}

export const MessageActions = memo(function MessageActions({ messageId, text, onRegenerate }: MessageActionsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t("planner.message.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("planner.message.copyError"));
    }
  };

  const handleLike = () => {
    setFeedback(feedback === "like" ? null : "like");
    // TODO: Send feedback to analytics
  };

  const handleDislike = () => {
    setFeedback(feedback === "dislike" ? null : "dislike");
    // TODO: Send feedback to analytics
  };

  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = toolbarRef.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons || buttons.length === 0) return;

    const current = document.activeElement as HTMLButtonElement;
    const idx = Array.from(buttons).indexOf(current);
    if (idx === -1) return;

    let next = -1;
    if (e.key === "ArrowRight") {
      next = (idx + 1) % buttons.length;
    } else if (e.key === "ArrowLeft") {
      next = (idx - 1 + buttons.length) % buttons.length;
    }

    if (next >= 0) {
      e.preventDefault();
      buttons[next].focus();
    }
  };

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={t("planner.message.actionsLabel", "Message actions")}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-1 mt-1 max-w-[85%]"
    >
      <button
        onClick={handleCopy}
        tabIndex={0}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title={t("planner.message.copy")}
        aria-label={t("planner.message.copyMessage")}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          tabIndex={-1}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={t("planner.message.regenerate")}
          aria-label={t("planner.message.regenerate")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        onClick={handleLike}
        tabIndex={-1}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          feedback === "like"
            ? "text-green-500 bg-green-500/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title={t("planner.message.like")}
        aria-label={t("planner.message.likeResponse")}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={handleDislike}
        tabIndex={-1}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          feedback === "dislike" 
            ? "text-red-500 bg-red-500/10" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title={t("planner.message.dislike")}
        aria-label={t("planner.message.dislikeResponse")}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});
