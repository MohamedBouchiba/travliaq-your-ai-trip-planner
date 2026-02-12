/**
 * ChatInput - Text input area for chat messages
 * Fully i18n-enabled with realtime suggestions
 */

import { useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useRealtimeSuggestions } from "./hooks/useRealtimeSuggestions";
import { RealtimeSuggestionChips } from "./RealtimeSuggestionChips";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading?: boolean;
  placeholder?: string;
  helperText?: string;
  enableRealtimeSuggestions?: boolean;
}

export interface ChatInputRef {
  focus: () => void;
  clear: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  ({ value, onChange, onSend, isLoading = false, placeholder, helperText, enableRealtimeSuggestions = true }, ref) => {
    const { t } = useTranslation();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Realtime suggestions while typing
    const { suggestions, applySuggestion } = useRealtimeSuggestions({
      inputValue: value,
      isEnabled: enableRealtimeSuggestions && !isLoading,
      debounceMs: 120,
      maxSuggestions: 3,
    });

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

    // Handle realtime suggestion selection
    const handleSuggestionSelect = useCallback((suggestion: { id: string; label: string; completion: string; emoji?: string }) => {
      const newValue = applySuggestion(suggestion);
      onChange(newValue);
      // Focus and move cursor to end
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newValue.length, newValue.length);
        }
      }, 0);
    }, [applySuggestion, onChange]);

    const canSend = value.trim() && !isLoading;
    const showRealtimeSuggestions = suggestions.length > 0 && value.length >= 2 && !isLoading;

    return (
      <div className="border-t border-border bg-background">
        {/* Realtime suggestions - appear while typing */}
        <RealtimeSuggestionChips
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
          isVisible={showRealtimeSuggestions}
        />
        
        <div className="p-4 pt-2">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                placeholder={placeholder || t("planner.chat.inputPlaceholder")}
                aria-label={t("planner.chat.inputPlaceholder")}
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
                aria-label={t("planner.chat.send")}
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
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";
