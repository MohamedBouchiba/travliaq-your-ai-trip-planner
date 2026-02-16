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
  messagesUntilReport?: number;
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
  messagesUntilReport = 0,
}: ChatInputAreaProps) {
  const { t } = useTranslation();

  return (
    <div className="relative z-20 max-w-3xl mx-auto p-4 pt-0">
      <div className="relative z-20 flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
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
          className="pointer-events-auto flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ minHeight: "40px", maxHeight: "120px" }}
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
            "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
            input.trim() && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          aria-label={t("planner.chat.send")}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center mt-1.5">
        {isReporting ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("planner.chat.reportBugUploading")}
          </span>
        ) : canReport ? (
          <span>
            {t("planner.chat.reportBugPrefix")}
            <button
              type="button"
              onClick={onReportBug}
              className="underline text-primary/80 hover:text-primary transition-colors cursor-pointer"
            >
              {t("planner.chat.reportBugLink")}
            </button>
          </span>
        ) : messagesUntilReport > 0 ? (
          <span>{t("planner.chat.reportBugCooldown", { count: messagesUntilReport })}</span>
        ) : (
          <span>{t("planner.chat.inputHelper")}</span>
        )}
      </p>
    </div>
  );
});
