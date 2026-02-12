/**
 * MessageBubble - Single chat message display component
 * Handles styling for user vs assistant messages
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { MarkdownMessage } from "./widgets/MarkdownMessage";
import { TypingIndicator } from "./TypingIndicator";
import { MessageActions } from "./MessageActions";
import type { ChatMessage } from "./types";

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
}

export const MessageBubble = memo(function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === "user";
  
  return (
    <div className={cn("flex-1 min-w-0", isUser ? "text-right" : "")}>
      <div className={cn(
        "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
        isUser 
          ? "bg-primary text-primary-foreground text-left" 
          : "bg-muted text-foreground text-left"
      )}>
        {message.isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            <MarkdownMessage content={message.text} />
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
            )}
          </>
        )}
      </div>

      {/* Copy / Like / Dislike actions for assistant messages */}
      {!isUser && !message.isTyping && !message.isStreaming && message.text && (
        <MessageActions messageId={message.id} text={message.text} onRegenerate={onRegenerate} />
      )}
    </div>
  );
});
