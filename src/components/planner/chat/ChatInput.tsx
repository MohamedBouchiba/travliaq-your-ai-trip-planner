/**
 * ChatInput - Text input area for chat messages
 */

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  placeholder?: string;
  helperText?: string;
}

export interface ChatInputRef {
  focus: () => void;
  clear: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  ({ value, onChange, onSend, isLoading = false, placeholder = "Envoyer un message...", helperText }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => {
        onChange("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      },
    }));

    // Auto-resize textarea
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
        // Ensure focus stays on input
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    };

    const canSend = value.trim() && !isLoading;

    return (
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              style={{ minHeight: "40px", maxHeight: "120px" }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={cn(
                "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
                canSend
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {helperText && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {helperText}
            </p>
          )}
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
