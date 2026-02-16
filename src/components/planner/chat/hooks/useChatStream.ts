/**
 * useChatStream - Hook for streaming chat responses via SSE
 *
 * Features:
 * - SSE streaming with content updates
 * - AbortController for cancellation
 * - Retry mechanism with exponential backoff
 * - Error classification and handling
 * - Mounted check for cleanup
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createCircuitBreaker } from "./circuitBreaker";
import { supabaseFetch } from "@/utils/supabaseFetch";
import type { FlightFormData } from "@/types/flight";
import type { AccommodationEntry } from "@/stores/slices/accommodationTypes";
import { useDebugStore } from "@/stores/debugStore";
import { plannerLogger } from "@/utils/logger";
import { createAccumulator, parseSSEChunk, type SSEEventHandlers } from "./sseEventParser";
import { getMissingFieldLabel } from "../utils/flightDataToMemory";

// Re-export types and utils from extracted modules for backward compatibility
export type {
  APIMessage, IntentClassification, ReasoningData, ToolStatusEvent, OnToolStatusUpdate,
  StreamResult, DestinationSuggestionRequest, QuickReplyData, TravelPhase,
  NegativePreference, SessionEntities, WidgetDecision, MemoryContext,
  OnContentUpdate, StreamErrorType, StreamError, RetryConfig,
} from "./chatStreamTypes";
export { MAX_MESSAGES_TO_SEND } from "./chatStreamTypes";
export {
  limitMessages, createStreamError, classifyError, calculateBackoffDelay,
  sleep, buildContextMessage, buildNegativePreferencesContext, DEFAULT_RETRY_CONFIG,
} from "./chatStreamUtils";

// Local imports for use within this file
import type {
  APIMessage, StreamError, StreamResult, MemoryContext,
  OnContentUpdate, OnToolStatusUpdate, RetryConfig,
} from "./chatStreamTypes";
import {
  limitMessages, createStreamError, classifyError, calculateBackoffDelay,
  sleep, buildContextMessage, buildNegativePreferencesContext, DEFAULT_RETRY_CONFIG,
} from "./chatStreamUtils";

// (Types, constants, and utility functions have been extracted to chatStreamTypes.ts and chatStreamUtils.ts)

/**
 * U2: Wait for the browser to come back online before retrying.
 * Returns immediately if already online. Resolves when `online` event fires.
 * Rejects if the AbortSignal is aborted while waiting.
 */
function waitForOnline(signal: AbortSignal, timeoutMs = 30_000): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const onOnline = () => { cleanup(); resolve(); };
    const onAbort = () => { cleanup(); reject(createStreamError("planner.error.cancelled", "cancelled")); };
    const onTimeout = setTimeout(() => { cleanup(); reject(createStreamError("planner.error.network", "network")); }, timeoutMs);
    function cleanup() {
      window.removeEventListener("online", onOnline);
      signal.removeEventListener("abort", onAbort);
      clearTimeout(onTimeout);
    }
    window.addEventListener("online", onOnline);
    signal.addEventListener("abort", onAbort);
  });
}

/**
 * Hook options
 */
export interface UseChatStreamOptions {
  retryConfig?: Partial<RetryConfig>;
  onError?: (error: StreamError) => void;
  onRetry?: (attempt: number, maxRetries: number) => void;
  onToolStatus?: OnToolStatusUpdate;
}

/**
 * Hook for streaming chat responses
 */
export function useChatStream(options: UseChatStreamOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<StreamError | null>(null);

  // Circuit breaker: blocks requests after repeated failures
  const circuitBreaker = useMemo(() => createCircuitBreaker(), []);

  // Debug store for developer insights
  const debugStore = useDebugStore();

  // Track mounted state for cleanup
  const isMountedRef = useRef(true);

  // Store current abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount + clear debug store on mount (new conversation)
  useEffect(() => {
    isMountedRef.current = true;
    // Purge stale debug data from previous sessions
    useDebugStore.getState().clearAll();
    // Reset stale departure from previous session (localStorage persistence)
    try {
      // Dynamic import to avoid circular dependency issues
      import("@/stores/plannerStoreV2").then(({ usePlannerStoreV2 }) => {
        const currentDeparture = usePlannerStoreV2.getState().departure;
        if (currentDeparture?.iata || currentDeparture?.city) {
          usePlannerStoreV2.getState().setDeparture(null);
        }
      });
    } catch (_e) { /* store not available */ }
    return () => {
      isMountedRef.current = false;
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Cancel the current stream
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const streamResponse = useCallback(
    async (
      apiMessages: APIMessage[],
      messageId: string,
      memoryContext: MemoryContext,
      onContentUpdate: OnContentUpdate
    ): Promise<StreamResult> => {
      // Cancel any previous request
      cancelStream();

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // U2: Reject early with clear message if browser is offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw createStreamError("planner.error.network", "network");
      }

      // Circuit breaker: reject immediately if server is known to be down
      if (!circuitBreaker.canRequest()) {
        throw createStreamError("Server temporarily unavailable", "server");
      }

      const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };

      // ─── P0 FIX: Global stream timeout (60s) ───
      // If the server streams slowly without closing, abort after 60s.
      const STREAM_TIMEOUT_MS = 60_000;
      const streamTimeoutId = setTimeout(() => {
        if (!abortController.signal.aborted) {
          plannerLogger.logError("timeout", new Error("Stream timeout after 60s"), { requestId: "pending" });
          abortController.abort("timeout");
        }
      }, STREAM_TIMEOUT_MS);

      // Generate unique request ID for tracing
      const requestId = crypto.randomUUID();
      const requestStartTime = Date.now();
      
      // Set Sentry context for this request
      plannerLogger.setRequestContext(requestId, memoryContext.currentPhase);
      plannerLogger.logRequest(requestId, "Starting chat request", {
        messages_count: apiMessages.length,
        phase: memoryContext.currentPhase,
        has_blocked_widgets: (memoryContext.blockedWidgets?.length || 0) > 0,
      });

      // Track phase transitions
      if (memoryContext.currentPhase) {
        const { phaseHistory } = useDebugStore.getState();
        const lastPhase = phaseHistory.length > 0 ? phaseHistory[phaseHistory.length - 1].toPhase : undefined;
        if (lastPhase !== memoryContext.currentPhase) {
          debugStore.addPhaseTransition({
            timestamp: Date.now(),
            fromPhase: lastPhase,
            toPhase: memoryContext.currentPhase,
            confidence: 80,
          });
        }
      }

      if (isMountedRef.current) {
        setIsStreaming(true);
        setError(null);
        // Clear stale reasoning from previous stream
        debugStore.setReasoning(null);
      }

      let fullContent = "";
      let flightData: FlightFormData | null = null;
      let accommodationData: Partial<AccommodationEntry> | null = null;
      let lastError: StreamError | null = null;

      for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
          // Check if cancelled
          if (abortController.signal.aborted) {
            throw createStreamError("planner.error.cancelled", "cancelled");
          }

          // Notify retry attempt
          if (attempt > 0) {
            options.onRetry?.(attempt, retryConfig.maxRetries);
            debugStore.addRetryAttempt({
              timestamp: Date.now(),
              attempt,
              maxRetries: retryConfig.maxRetries,
              delayMs: calculateBackoffDelay(attempt - 1, retryConfig),
            });
          }

          const contextMessage = buildContextMessage(memoryContext);
          const negativeContext = buildNegativePreferencesContext(memoryContext.negativePreferences || []);

          const response = await supabaseFetch("planner-chat", {
            method: "POST",
            authOptional: true,
            headers: { "X-Request-ID": requestId },
            body: JSON.stringify({
              messages: limitMessages(apiMessages),
              stream: true,
              requestId,
              memoryContext: contextMessage,
              missingFields: memoryContext.missingFields,
              currentPhase: memoryContext.currentPhase || "research",
              negativePreferences: negativeContext,
              widgetHistory: memoryContext.widgetHistory || "",
              activeWidgetsContext: memoryContext.activeWidgetsContext || "",
              blockedWidgets: memoryContext.blockedWidgets || [],
              preferencesState: memoryContext.preferencesState || { interests: [], style: null, pace: null },
            }),
            signal: abortController.signal,
          });

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

      // Reset accumulator for this attempt
      const acc = createAccumulator();
      fullContent = "";

      // Throttle UI updates to reduce re-renders (max every 50ms)
          let lastUpdateTime = 0;
          const THROTTLE_MS = 50;
          let pendingUpdate = false;

          const throttledUpdate = () => {
            const now = Date.now();
            if (now - lastUpdateTime >= THROTTLE_MS) {
              lastUpdateTime = now;
              if (isMountedRef.current) {
                onContentUpdate(messageId, acc.content, false);
              }
              pendingUpdate = false;
            } else if (!pendingUpdate) {
              pendingUpdate = true;
              setTimeout(() => {
                if (isMountedRef.current && pendingUpdate) {
                  lastUpdateTime = Date.now();
                  onContentUpdate(messageId, acc.content, false);
                  pendingUpdate = false;
                }
              }, THROTTLE_MS - (now - lastUpdateTime));
            }
          };

          // Wire up SSE event handlers
          const sseHandlers: SSEEventHandlers = {
            onReasoning: (reasoning, derivedIntent) => {
              if (import.meta.env.DEV) console.log("[Stream] 🧠 CoT reasoning:", reasoning.confidence);
              debugStore.setReasoning(reasoning);
              if (derivedIntent) {
                debugStore.setLastIntent(derivedIntent);
                debugStore.addIntentHistory({ timestamp: Date.now(), intent: derivedIntent, source: "reasoning" });
                if (import.meta.env.DEV) console.log("[Stream] Intent from reasoning:", derivedIntent.primaryIntent);
              }
            },
            onIntentClassification: (intent) => {
              if (import.meta.env.DEV) console.log("[Stream] Intent:", intent.primaryIntent, intent.confidence);
              debugStore.setLastIntent(intent);
              debugStore.addIntentHistory({ timestamp: Date.now(), intent, source: "backend" });
            },
            onPreferencesData: () => {
              if (import.meta.env.DEV) console.log("[Stream] Preferences detected");
            },
            onFlightSearchTrigger: () => {
              if (import.meta.env.DEV) console.log("[Stream] Flight search trigger");
            },
            onToolStarted: (parsed) => {
              plannerLogger.logToolEvent(requestId, parsed.tool, "started", {
                reason: parsed.reason,
              });
              options.onToolStatus?.({
                tool: parsed.tool,
                status: "started",
                reason: parsed.reason,
                timestamp: parsed.timestamp || Date.now(),
              });
              debugStore.addToolExecution({
                tool: parsed.tool,
                status: "started",
                reason: parsed.reason,
                timestamp: parsed.timestamp || Date.now(),
              });
            },
            onToolFinished: (parsed) => {
              const status = parsed.success ? "finished" as const : "failed" as const;
              plannerLogger.logToolEvent(requestId, parsed.tool, status, {
                latency_ms: parsed.latency_ms,
                summary: parsed.summary,
              });
              options.onToolStatus?.({
                tool: parsed.tool,
                status,
                latency_ms: parsed.latency_ms,
                summary: parsed.summary,
                timestamp: parsed.timestamp || Date.now(),
              });
              debugStore.addToolExecution({
                tool: parsed.tool,
                status,
                latency_ms: parsed.latency_ms,
                summary: parsed.summary,
                timestamp: parsed.timestamp || Date.now(),
              });
            },
            onContent: () => {
              fullContent = acc.content;
              throttledUpdate();
            },
            onParseError: (rawData) => {
              debugStore.addSSEParseError({ timestamp: Date.now(), rawData: rawData.slice(0, 500) });
            },
          };

          let sseLineBuffer = "";
          while (true) {
            // Check if cancelled
            if (abortController.signal.aborted) {
              reader.cancel();
              throw createStreamError("planner.error.cancelled", "cancelled");
            }

            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const parseResult = parseSSEChunk(chunk, sseHandlers, acc, sseLineBuffer);
            sseLineBuffer = parseResult.remainingBuffer;
            if (parseResult.done) break;
          }

          // Sync final accumulator state to local variables
          fullContent = acc.content;
          flightData = acc.flightData;
          accommodationData = acc.accommodationData;

          // Store raw response in debug store
          debugStore.addRawResponse({
            requestId,
            timestamp: Date.now(),
            data: {
              content: fullContent,
              flightData,
              accommodationData,
              preferencesData: acc.preferencesData,
              quickReplies: acc.quickReplies,
              destinationSuggestionRequest: acc.destinationSuggestionRequest,
              intentClassification: acc.intentClassification,
              reasoning: acc.reasoning,
              flightSearchTrigger: acc.flightSearchTrigger,
            },
          });

          // Update memory context in debug store
          debugStore.setMemoryContext({
            flightSummary: memoryContext.flightSummary,
            activityContext: memoryContext.activityContext,
            preferenceContext: memoryContext.preferenceContext,
            widgetHistory: memoryContext.widgetHistory,
            blockedWidgets: memoryContext.blockedWidgets,
            basketSummary: memoryContext.basketSummary,
            conversationSummary: memoryContext.conversationSummary,
            currentPhase: memoryContext.currentPhase,
            missingFields: memoryContext.missingFields?.map(getMissingFieldLabel),
            sessionEntities: memoryContext.sessionEntities,
          });

          // Success - mark streaming as complete
          if (isMountedRef.current) {
            onContentUpdate(messageId, fullContent, true);
          }

          // Log request completion with timing
          plannerLogger.logRequestComplete(requestId, Date.now() - requestStartTime, {
            content_length: fullContent.length,
            has_flight_data: !!flightData,
            has_intent: !!acc.intentClassification,
            tools_detected: [
              flightData && 'flight',
              accommodationData && 'accommodation',
              acc.preferencesData && 'preferences',
              acc.quickReplies && 'quickReplies',
              acc.destinationSuggestionRequest && 'destinationSuggestion',
              acc.flightSearchTrigger && 'flightSearch',
            ].filter(Boolean),
          });

          clearTimeout(streamTimeoutId);
          circuitBreaker.recordSuccess();
          return { content: fullContent, flightData, accommodationData, preferencesData: acc.preferencesData, quickReplies: acc.quickReplies, destinationSuggestionRequest: acc.destinationSuggestionRequest, intentClassification: acc.intentClassification, reasoning: acc.reasoning, flightSearchTrigger: acc.flightSearchTrigger, tripRecapData: acc.tripRecapData, requestId };

        } catch (err) {
          lastError = err instanceof Error && "type" in err
            ? (err as StreamError)
            : classifyError(err);

          // Log the error
          plannerLogger.logError(requestId, lastError, {
            attempt,
            type: lastError.type,
            retryable: lastError.retryable,
          });

          // Capture error in debug store
          debugStore.addStreamError({
            timestamp: Date.now(),
            type: lastError.type,
            message: lastError.message,
            statusCode: lastError.statusCode,
            retryable: lastError.retryable,
          });

          // Don't retry non-retryable errors
          if (!lastError.retryable || lastError.type === "cancelled") {
            break;
          }

          // Don't retry if we've exhausted attempts
          if (attempt >= retryConfig.maxRetries) {
            break;
          }

          // U2: If offline, wait for reconnection before burning retry attempts
          await waitForOnline(abortController.signal);

          // Wait before retrying
          const delay = calculateBackoffDelay(attempt, retryConfig);
          await sleep(delay);
        }
      }

      // All retries failed
      clearTimeout(streamTimeoutId);
      circuitBreaker.recordFailure();
      if (isMountedRef.current) {
        setError(lastError);
        if (options.onError && lastError) {
          options.onError(lastError);
        }
      }

      throw lastError || createStreamError("Erreur inconnue", "unknown");
    },
    [cancelStream, options, circuitBreaker]
  );

  // Cleanup streaming state
  useEffect(() => {
    return () => {
      if (isMountedRef.current) {
        setIsStreaming(false);
      }
    };
  }, []);

  return {
    streamResponse,
    isStreaming,
    error,
    cancelStream,
    clearError: useCallback(() => setError(null), []),
  };
}

export default useChatStream;
