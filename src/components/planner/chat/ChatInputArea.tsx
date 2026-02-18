/**
 * ChatInputArea - Textarea + send button at the bottom of PlannerChat.
 *
 * Extracted from PlannerChat.tsx (A1) to keep the parent focused on orchestration.
 */

import { memo } from "react";
import { Send, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ChatInputAreaProps {
  input: string;
  setInput: (v: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isLoading: boolean;
  onSend: (text: string) => void;
  onReportBug?: () => void;
  canReport?: boolean;
  isReporting?: boolean;
}

export const ChatInputArea = memo(function ChatInputArea({
  input,
  setInput,
  inputRef,
  isLoading,
  onSend,
  onReportBug,
  canReport = false,
  isReporting = false,
}: ChatInputAreaProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-4 pt-2 pb-3">
      {/* Main input row */}
      <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onPointerDown={(e) => {
            const { clientX, clientY } = e;
            requestAnimationFrame(() => {
              if (document.activeElement !== inputRef.current) {
                const el = document.elementFromPoint(clientX, clientY);
                const cs = el ? window.getComputedStyle(el) : null;
                // eslint-disable-next-line no-console
                console.warn("[ChatInputArea] click not reaching textarea", {
                  x: clientX,
                  y: clientY,
                  topElement: el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.className ? `.${String(el.className).split(" ").slice(0, 3).join(".")}` : ""}` : null,
                  pointerEvents: cs?.pointerEvents,
                  zIndex: cs?.zIndex,
                  position: cs?.position,
                });
              }
            });
          }}
          onFocus={() => {
            // Safety net: if driver.js ever leaves pointer-events blocked, restore interactivity.
            document.body.classList.remove("driver-active");
            document.documentElement.classList.remove("driver-active");
          }}
          placeholder={isLoading ? t("planner.chat.inputLoading") : t("planner.chat.inputPlaceholder")}
          aria-label={t("planner.chat.inputPlaceholder")}
          rows={1}
          disabled={false}
          className="pointer-events-auto flex-1 resize-none bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ minHeight: "36px", maxHeight: "120px" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(input);
              setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
        />
        <button
          type="button"
          onClick={() => onSend(input)}
          disabled={!input.trim() || isLoading}
          className={cn(
            "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center transition-all mb-0.5",
            input.trim() && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          aria-label={t("planner.chat.send")}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Bug report — only when eligible, pinned at bottom, ultra-subtle */}
      {(isReporting || canReport) && (
        <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5 leading-none">
          {isReporting ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              {t("planner.chat.reportBugUploading")}
            </span>
          ) : (
            <span>
              {t("planner.chat.reportBugPrefix")}
              <button
                type="button"
                onClick={onReportBug}
                className="underline text-primary/50 hover:text-primary/80 transition-colors cursor-pointer ml-0.5"
              >
                {t("planner.chat.reportBugLink")}
              </button>
            </span>
          )}
        </p>
      )}
    </div>
  );
});
