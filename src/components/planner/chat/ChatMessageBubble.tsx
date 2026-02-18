/**
 * ChatMessageBubble - Renders a single chat message with its widgets/actions.
 *
 * Extracted from PlannerChat.tsx inline `.map()` (A1).
 * React.memo prevents re-rendering unchanged messages during streaming ticks.
 */

import { memo, useRef, useEffect, useState } from "react";
import { Plane, RefreshCw, AlertTriangle, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";
import type { FlightMemory } from "@/stores/hooks/useFlightMemoryStore";
import type { ToolExecution } from "./ToolStatusIndicator";
import type { WidgetRendererProps } from "./widgets/WidgetRenderer";
import type { Airport } from "@/hooks/useNearestAirports";
import {
  AirportButton,
  DualAirportSelection,
  MarkdownMessage,
  WidgetRenderer,
} from "./widgets";
import { QuickReplies } from "./QuickReplies";
import { MessageActions } from "./MessageActions";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  activeTools: ToolExecution[];
  isLoading: boolean;
  memory: FlightMemory;
  /** Live streaming text for this bubble (set only when m.id === streamingMessageId) */
  streamingText?: string;
  widgetFlow: WidgetRendererProps["widgetFlow"] & {
    handleAirportSelect: (msgId: string, field: string, airport: Airport, isDual?: boolean) => void;
    handleSearchButtonClick: (msgId: string) => void;
  };
  preferenceCallbacks: WidgetRendererProps["preferenceCallbacks"];
  handleDestinationSelect: WidgetRendererProps["handleDestinationSelect"];
  isLoadingDestinations: boolean;
  onWidgetReopen: (messageId: string) => void;
  onRegenerate: () => void;
  onSend: (text: string) => void;
  onFillInput: (text: string) => void;
  onTriggerWidget: (widget: string) => void;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message: m,
  activeTools,
  isLoading,
  memory,
  streamingText,
  widgetFlow,
  preferenceCallbacks,
  handleDestinationSelect,
  isLoadingDestinations,
  onWidgetReopen,
  onRegenerate,
  onSend,
  onFillInput,
  onTriggerWidget,
}: ChatMessageBubbleProps) {
  const { t } = useTranslation();
  const [isFlashing, setIsFlashing] = useState(false);
  const flashKeyRef = useRef(m._flashKey);

  // When _flashKey changes (same message re-triggered), apply a brief highlight + scroll into view
  useEffect(() => {
    if (m._flashKey && m._flashKey !== flashKeyRef.current) {
      flashKeyRef.current = m._flashKey;
      setIsFlashing(true);
      bubbleRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(() => setIsFlashing(false), 800);
      return () => clearTimeout(t);
    }
  }, [m._flashKey]);

  const bubbleRef = useRef<HTMLDivElement>(null);

  // Use live streamingText when this bubble is the active streaming target;
  // otherwise fall back to m.text (persisted final content).
  const displayText = streamingText !== undefined ? streamingText : m.text;
  const isLiveStreaming = streamingText !== undefined;

  return (
    <div ref={bubbleRef} className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "")}>
      <div className={cn("flex-1 min-w-0", m.role === "user" ? "text-right" : "")}>
        <div className={cn(
          "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%] transition-shadow duration-700",
          m.errorType
            ? "bg-destructive/10 text-destructive border border-destructive/20 text-left"
            : m.role === "user" ? "bg-primary text-primary-foreground text-left" : "bg-muted text-foreground text-left",
          isFlashing && "ring-2 ring-primary/40 shadow-lg shadow-primary/10"
        )}>
          {m.isTyping && !isLiveStreaming ? (
            <div className="flex gap-1 py-1" role="status" aria-label={t("planner.chat.assistantTyping")}>
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : m.errorType ? (
            <div className="flex items-start gap-2">
              {m.errorType === "network" ? (
                <WifiOff className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium">{displayText}</p>
                <button
                  onClick={onRegenerate}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t("planner.chat.retry")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <MarkdownMessage content={displayText} isStreaming={isLiveStreaming || m.isStreaming} />
            </>
          )}
        </div>

        {/* Copy / Like / Dislike actions for assistant messages */}
        {m.role === "assistant" && !m.isTyping && !m.isStreaming && m.text && (
          <MessageActions messageId={m.id} text={m.text} onRegenerate={onRegenerate} />
        )}

        {/* Airport choices */}
        {m.airportChoices && (
          <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
            {m.airportChoices.airports.map((airport) => (
              <AirportButton
                key={airport.iata}
                airport={airport}
                onClick={() => widgetFlow.handleAirportSelect(m.id, m.airportChoices!.field, airport, false)}
                disabled={isLoading}
              />
            ))}
          </div>
        )}

        {/* Dual airport selection */}
        {m.dualAirportChoices && (
          <DualAirportSelection
            choices={m.dualAirportChoices}
            onSelect={(field, airport) => widgetFlow.handleAirportSelect(m.id, field, airport, true)}
            disabled={isLoading}
          />
        )}

        {/* Widgets */}
        {m.widget && !m.widgetDismissed && (
          <WidgetRenderer
            message={m}
            widgetFlow={widgetFlow}
            preferenceCallbacks={preferenceCallbacks}
            handleDestinationSelect={handleDestinationSelect}
            isLoadingDestinations={isLoadingDestinations}
            memory={memory}
            t={t}
            onWidgetReopen={onWidgetReopen}
          />
        )}

        {/* Search button */}
        {m.hasSearchButton && (
          <div className="mt-3">
            <button
              onClick={() => widgetFlow.handleSearchButtonClick(m.id)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
            >
              <Plane className="h-4 w-4" />
              {t("planner.chat.searchFlightsNow")}
            </button>
          </div>
        )}

        {/* Quick Replies */}
        {m.quickReplies && m.quickReplies.length > 0 && (
          <QuickReplies
            replies={m.quickReplies}
            onSendMessage={onSend}
            onFillInput={onFillInput}
            onTriggerWidget={onTriggerWidget}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparator: skip re-render if message content + streaming text haven't changed
  const pm = prev.message;
  const nm = next.message;
  return (
    pm.id === nm.id &&
    pm.text === nm.text &&
    pm.isTyping === nm.isTyping &&
    pm.isStreaming === nm.isStreaming &&
    pm.widget === nm.widget &&
    pm.widgetConfirmed === nm.widgetConfirmed &&
    pm.widgetDismissed === nm.widgetDismissed &&
    pm.errorType === nm.errorType &&
    pm.hasSearchButton === nm.hasSearchButton &&
    pm._flashKey === nm._flashKey &&
    prev.activeTools === next.activeTools &&
    prev.isLoading === next.isLoading &&
    prev.streamingText === next.streamingText
  );
});
