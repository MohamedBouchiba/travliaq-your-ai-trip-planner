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

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import type { FlightFormData } from "@/types/flight";
import type { MissingField } from "@/stores/hooks";
import { useDebugStore } from "@/stores/debugStore";
import { getMissingFieldLabel } from "../utils/flightDataToMemory";
import { plannerLogger } from "@/utils/logger";

/**
 * Maximum messages to send to API to prevent context overflow
 * The memoryContext already contains structured summaries, so we only need recent messages
 */
export const MAX_MESSAGES_TO_SEND = 15;

/**
 * API message format for the chat endpoint
 */
export interface APIMessage {
  role: string;
  content: string;
}

/**
 * Limit messages to MAX_MESSAGES_TO_SEND while preserving system context
 * Keeps the first system message (if any) and the last N-1 messages
 */
export function limitMessages(messages: APIMessage[]): APIMessage[] {
  if (messages.length <= MAX_MESSAGES_TO_SEND) {
    return messages;
  }
  
  // Check if first message is a system message
  const hasSystemMessage = messages[0]?.role === "system";
  
  if (hasSystemMessage) {
    // Keep system message + last (MAX - 1) messages
    const systemMessage = messages[0];
    const recentMessages = messages.slice(-(MAX_MESSAGES_TO_SEND - 1));
    return [systemMessage, ...recentMessages];
  }
  
  // No system message - just take the last MAX messages
  return messages.slice(-MAX_MESSAGES_TO_SEND);
}

/**
 * Intent classification from backend
 */
export interface IntentClassification {
  primaryIntent: string;
  confidence: number;
  entities: Record<string, unknown>;
  widgetToShow?: {
    type: string;
    reason: string;
    data?: Record<string, unknown>;
  };
  nextExpectedIntent?: string;
  requiresClarification?: boolean;
  clarificationQuestion?: string;
}

/**
 * Reasoning data from Chain of Thought
 */
export interface ReasoningData {
  understanding: string;
  contextAnalysis: string;
  responseStrategy: string;
  keyInsights?: string[];
  anticipatedNextSteps?: string[];
  widgetDecision?: {
    shouldShow: boolean;
    widgetType?: string;
    reason?: string;
  };
  confidence: number;
}

/**
 * Tool execution status for real-time tracking
 */
export interface ToolStatusEvent {
  tool: string;
  status: "started" | "finished" | "failed";
  reason?: string;
  summary?: string;
  latency_ms?: number;
  timestamp: number;
}

/**
 * Callback for tool status updates
 */
export type OnToolStatusUpdate = (event: ToolStatusEvent) => void;

/**
 * Stream response result
 */
export interface StreamResult {
  content: string;
  flightData: FlightFormData | null;
  accommodationData: any | null;
  preferencesData: any | null;
  quickReplies: QuickReplyData | null;
  destinationSuggestionRequest: DestinationSuggestionRequest | null;
  intentClassification: IntentClassification | null;
  reasoning: ReasoningData | null;
  flightSearchTrigger: boolean;
  requestId: string;
}

/**
 * Destination suggestion request from LLM
 */
export interface DestinationSuggestionRequest {
  requestedCount: number;
  reason?: string;
  exceededLimit?: boolean;
}

/**
 * Quick replies data from AI
 */
export interface QuickReplyData {
  replies: Array<{
    label: string;
    emoji: string;
    message: string;
  }>;
}

/**
 * Travel phase for adaptive chat behavior
 */
export type TravelPhase = "inspiration" | "research" | "comparison" | "planning" | "booking";

/**
 * Negative preference from user
 */
export interface NegativePreference {
  category: string;
  value: string;
  reason?: string;
}

/**
 * Session entities - cumulative mentions in this session
 */
export interface SessionEntities {
  destinations: string[];
  dates: string[];
  budgets: string[];
  constraints: string[];
}

/**
 * Widget decision record for LLM context
 */
export interface WidgetDecision {
  widgetType: string;
  chosen: string;
  timestamp: number;
}

/**
 * Memory context for building API requests
 */
export interface MemoryContext {
  flightSummary: string;
  activityContext: string;
  preferenceContext: string;
  missingFields: MissingField[];
  // Widget interaction history for better LLM context
  widgetHistory?: string;
  // Current travel phase for adaptive behavior
  currentPhase?: TravelPhase;
  // Negative preferences to avoid
  negativePreferences?: NegativePreference[];
  // Active widgets context for "choose for me" functionality
  activeWidgetsContext?: string;
  // NEW Phase 3: Conversation summary for context continuity
  conversationSummary?: string;
  // NEW Phase 3: Cumulative session entities
  sessionEntities?: SessionEntities;
  // NEW Phase 3: Widget decisions history
  widgetDecisions?: WidgetDecision[];
  // Trip Basket: summary of user selections (flights, hotels, activities)
  basketSummary?: string;
  // Anti-loop: widgets already shown/confirmed that should not be re-proposed
  blockedWidgets?: string[];
  // Deterministic preference-first logic: structured preferences state
  preferencesState?: { interests: string[]; style: string | null; pace: string | null; styleAxesConfigured: boolean };
}

/**
 * Callback for content updates during streaming
 */
export type OnContentUpdate = (messageId: string, content: string, isComplete: boolean) => void;

/**
 * Error types for better error handling
 */
export type StreamErrorType =
  | "network"      // Network connectivity issues
  | "auth"         // Authentication failures
  | "server"       // Server errors (5xx)
  | "rate_limit"   // Rate limiting (429)
  | "timeout"      // Request timeout
  | "cancelled"    // User cancelled
  | "unknown";     // Unknown error

/**
 * Stream error with classification
 */
export interface StreamError extends Error {
  type: StreamErrorType;
  retryable: boolean;
  statusCode?: number;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Create a StreamError with classification
 */
function createStreamError(
  message: string,
  type: StreamErrorType,
  statusCode?: number
): StreamError {
  const error = new Error(message) as StreamError;
  error.type = type;
  error.statusCode = statusCode;
  error.retryable = type === "network" || type === "server" || type === "timeout";
  return error;
}

/**
 * Classify error based on response or exception
 */
function classifyError(error: unknown, statusCode?: number): StreamError {
  if (error instanceof Error) {
    // Check for abort
    if (error.name === "AbortError") {
      return createStreamError("Requête annulée", "cancelled");
    }

    // Check for network errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return createStreamError("Erreur de connexion réseau", "network");
    }
  }

  // Classify by status code
  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) {
      return createStreamError("Session expirée, veuillez vous reconnecter", "auth", statusCode);
    }
    if (statusCode === 429) {
      return createStreamError("Trop de requêtes, veuillez patienter", "rate_limit", statusCode);
    }
    if (statusCode >= 500) {
      return createStreamError("Erreur serveur, réessai en cours...", "server", statusCode);
    }
  }

  return createStreamError(
    error instanceof Error ? error.message : "Erreur inconnue",
    "unknown"
  );
}

/**
 * Calculate delay for exponential backoff
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the context message for the API
 */
function buildContextMessage(memoryContext: MemoryContext): string {
  const {
    flightSummary,
    activityContext,
    preferenceContext,
    missingFields,
    widgetHistory,
    activeWidgetsContext,
    conversationSummary,
    sessionEntities,
    widgetDecisions,
    basketSummary,
    blockedWidgets,
  } = memoryContext;

  if (!flightSummary && !activeWidgetsContext && !basketSummary) return widgetHistory || "";

  const missingFieldsStr =
    missingFields.length > 0
      ? missingFields.map(getMissingFieldLabel).join(", ")
      : "Aucun - prêt à chercher";

  // Start with blocked widgets warning (anti-loop)
  let context = "";
  if (blockedWidgets && blockedWidgets.length > 0) {
    context += `[WIDGETS BLOQUÉS - NE PAS RE-PROPOSER CES WIDGETS] ${blockedWidgets.join(', ')}\n`;
  }

  context += flightSummary
    ? `[CONTEXTE MÉMOIRE] ${flightSummary}${activityContext}${preferenceContext}\n[CHAMPS MANQUANTS] ${missingFieldsStr}`
    : "";

  // Add trip basket summary (user selections)
  if (basketSummary) {
    context += `\n${basketSummary}`;
  }

  // Add conversation summary (Phase 3)
  if (conversationSummary) {
    context += `\n${conversationSummary}`;
  }

  // Add session entities (Phase 3)
  if (sessionEntities) {
    const { destinations, dates, budgets, constraints } = sessionEntities;
    const entityParts: string[] = [];
    if (destinations.length > 0) {
      entityParts.push(`Destinations mentionnées: ${destinations.join(", ")}`);
    }
    if (dates.length > 0) {
      entityParts.push(`Dates: ${dates.join(", ")}`);
    }
    if (budgets.length > 0) {
      entityParts.push(`Budgets: ${budgets.join(", ")}`);
    }
    if (constraints.length > 0) {
      entityParts.push(`Contraintes: ${constraints.join(", ")}`);
    }
    if (entityParts.length > 0) {
      context += `\n[ENTITÉS SESSION] ${entityParts.join(" | ")}`;
    }
  }

  // Add widget decisions (Phase 3)
  if (widgetDecisions && widgetDecisions.length > 0) {
    const decisionStr = widgetDecisions.map((d) => d.chosen).join(" → ");
    context += `\n[CHOIX VIA WIDGETS] ${decisionStr}`;
  }

  // Add widget history if available
  if (widgetHistory) {
    context += `\n${widgetHistory}`;
  }

  // Add active widgets context for "choose for me" functionality
  if (activeWidgetsContext) {
    context += `\n${activeWidgetsContext}`;
  }

  return context;
}

/**
 * Build negative preferences context for LLM
 */
function buildNegativePreferencesContext(prefs: NegativePreference[]): string {
  if (!prefs || prefs.length === 0) return "";
  
  const lines = prefs.map(p => {
    return p.reason ? `- ${p.value} (${p.reason})` : `- ${p.value}`;
  });
  
  return `[PRÉFÉRENCES NÉGATIVES - NE PAS PROPOSER]\n${lines.join("\n")}`;
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

      const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };

      // ─── P0 FIX: Global stream timeout (60s) ───
      // If the server streams slowly without closing, abort after 60s.
      const STREAM_TIMEOUT_MS = 60_000;
      const streamTimeoutId = setTimeout(() => {
        if (!abortController.signal.aborted) {
          plannerLogger.logError("timeout", new Error("Stream timeout after 60s"), { requestId: "pending" });
          abortController.abort();
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

      if (isMountedRef.current) {
        setIsStreaming(true);
        setError(null);
        // Clear stale reasoning from previous stream
        debugStore.setReasoning(null);
      }

      let fullContent = "";
      let flightData: FlightFormData | null = null;
      let accommodationData: any | null = null;
      let lastError: StreamError | null = null;

      for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
          // Check if cancelled
          if (abortController.signal.aborted) {
            throw createStreamError("Requête annulée", "cancelled");
          }

          // Notify retry attempt
          if (attempt > 0 && options.onRetry) {
            options.onRetry(attempt, retryConfig.maxRetries);
          }

          const contextMessage = buildContextMessage(memoryContext);
          const negativeContext = buildNegativePreferencesContext(memoryContext.negativePreferences || []);

          // Get session
          const session = (await supabase.auth.getSession()).data.session;

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/planner-chat`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
                apikey: SUPABASE_PUBLISHABLE_KEY,
                "X-Request-ID": requestId,
              },
              body: JSON.stringify({
                messages: limitMessages(apiMessages),
                stream: true,
                requestId, // Also in body for backup
                memoryContext: contextMessage,
                missingFields: memoryContext.missingFields,
                currentPhase: memoryContext.currentPhase || "research",
                negativePreferences: negativeContext,
                widgetHistory: memoryContext.widgetHistory || "",
                // CRITICAL: Send active widgets context for "choose for me" functionality
                activeWidgetsContext: memoryContext.activeWidgetsContext || "",
                // Anti-loop: blocked widgets that should not be re-proposed
                blockedWidgets: memoryContext.blockedWidgets || [],
                // Deterministic preference-first logic: send current preferences state
                preferencesState: memoryContext.preferencesState || { interests: [], style: null, pace: null },
              }),
              signal: abortController.signal,
            }
          );

          if (!response.ok) {
            throw classifyError(null, response.status);
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

      // Reset content for this attempt
      fullContent = "";
      let quickReplies: QuickReplyData | null = null;
      let destinationSuggestionRequest: DestinationSuggestionRequest | null = null;
      let intentClassification: IntentClassification | null = null;
      let reasoning: ReasoningData | null = null;
      let preferencesData: any | null = null;
      let flightSearchTrigger = false;
      
      // Throttle UI updates to reduce re-renders (max every 50ms)
          let lastUpdateTime = 0;
          const THROTTLE_MS = 50;
          let pendingUpdate = false;
          
          const throttledUpdate = () => {
            const now = Date.now();
            if (now - lastUpdateTime >= THROTTLE_MS) {
              lastUpdateTime = now;
              if (isMountedRef.current) {
                onContentUpdate(messageId, fullContent, false);
              }
              pendingUpdate = false;
            } else if (!pendingUpdate) {
              pendingUpdate = true;
              setTimeout(() => {
                if (isMountedRef.current && pendingUpdate) {
                  lastUpdateTime = Date.now();
                  onContentUpdate(messageId, fullContent, false);
                  pendingUpdate = false;
                }
              }, THROTTLE_MS - (now - lastUpdateTime));
            }
          };

          while (true) {
            // Check if cancelled
            if (abortController.signal.aborted) {
              reader.cancel();
              throw createStreamError("Requête annulée", "cancelled");
            }

            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter((line) => line.trim() !== "");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                if (jsonStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(jsonStr);

                   if (parsed.type === "reasoning" && parsed.reasoning) {
                    reasoning = parsed.reasoning;
                    if (import.meta.env.DEV) console.log("[Stream] 🧠 CoT reasoning:", reasoning.confidence);
                    // Update debug store
                    debugStore.setReasoning(reasoning);
                    
                    // If no explicit intentClassification, derive it from reasoning
                    if (!intentClassification && reasoning.widgetDecision) {
                      const derivedIntent: IntentClassification = {
                        primaryIntent: reasoning.widgetDecision.widgetType || "unknown",
                        confidence: reasoning.confidence,
                        entities: {},
                        widgetToShow: {
                          type: reasoning.widgetDecision.widgetType || "",
                          reason: reasoning.widgetDecision.reason || "",
                        },
                      };
                      intentClassification = derivedIntent;
                      debugStore.setLastIntent(derivedIntent);
                      if (import.meta.env.DEV) console.log("[Stream] Intent from reasoning:", derivedIntent.primaryIntent);
                    }
                  } else if (parsed.type === "intentClassification" && parsed.intentClassification) {
                    intentClassification = parsed.intentClassification;
                    if (import.meta.env.DEV) console.log("[Stream] Intent:", intentClassification.primaryIntent, intentClassification.confidence);
                    // Update debug store
                    debugStore.setLastIntent(intentClassification);
                  } else if (parsed.type === "flightData" && parsed.flightData) {
                    flightData = parsed.flightData;
                  } else if (parsed.type === "accommodationData" && parsed.accommodationData) {
                    accommodationData = parsed.accommodationData;
                   } else if (parsed.type === "preferencesData" && parsed.preferencesData) {
                    preferencesData = parsed.preferencesData;
                    if (import.meta.env.DEV) console.log("[Stream] Preferences detected");
                  } else if (parsed.type === "quickReplies" && parsed.quickReplies) {
                    quickReplies = parsed.quickReplies;
                  } else if (parsed.type === "destinationSuggestionRequest" && parsed.destinationSuggestionRequest) {
                    destinationSuggestionRequest = parsed.destinationSuggestionRequest;
                   } else if (parsed.type === "flightSearchTrigger" && parsed.trigger) {
                    flightSearchTrigger = true;
                    if (import.meta.env.DEV) console.log("[Stream] Flight search trigger");
                  } else if (parsed.type === "tool_started" && parsed.tool) {
                    // Handle tool started event
                    plannerLogger.logToolEvent(requestId, parsed.tool, "started", {
                      reason: parsed.reason,
                    });
                    options.onToolStatus?.({
                      tool: parsed.tool,
                      status: "started",
                      reason: parsed.reason,
                      timestamp: parsed.timestamp || Date.now(),
                    });
                    // Update debug store
                    debugStore.addToolExecution({
                      tool: parsed.tool,
                      status: "started",
                      reason: parsed.reason,
                      timestamp: parsed.timestamp || Date.now(),
                    });
                  } else if (parsed.type === "tool_finished" && parsed.tool) {
                    // Handle tool finished event
                    const status = parsed.success ? "finished" : "failed";
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
                    // Update debug store
                    debugStore.addToolExecution({
                      tool: parsed.tool,
                      status,
                      latency_ms: parsed.latency_ms,
                      summary: parsed.summary,
                      timestamp: parsed.timestamp || Date.now(),
                    });
                  } else if (parsed.type === "content" && parsed.content) {
                    fullContent += parsed.content;
                    // Throttled content update to reduce flickering
                    throttledUpdate();
                  }
                } catch {
                  // Ignore parse errors for malformed chunks
                }
              }
            }
          }

          // Store raw response in debug store
          debugStore.addRawResponse({
            requestId,
            timestamp: Date.now(),
            data: {
              content: fullContent,
              flightData,
              accommodationData,
              preferencesData,
              quickReplies,
              destinationSuggestionRequest,
              intentClassification,
              reasoning,
              flightSearchTrigger,
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
            has_intent: !!intentClassification,
            tools_detected: [
              flightData && 'flight',
              accommodationData && 'accommodation',
              preferencesData && 'preferences',
              quickReplies && 'quickReplies',
              destinationSuggestionRequest && 'destinationSuggestion',
              flightSearchTrigger && 'flightSearch',
            ].filter(Boolean),
          });

          clearTimeout(streamTimeoutId);
          return { content: fullContent, flightData, accommodationData, preferencesData, quickReplies, destinationSuggestionRequest, intentClassification, reasoning, flightSearchTrigger, requestId };

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

          // Don't retry non-retryable errors
          if (!lastError.retryable || lastError.type === "cancelled") {
            break;
          }

          // Don't retry if we've exhausted attempts
          if (attempt >= retryConfig.maxRetries) {
            break;
          }

          // Wait before retrying
          const delay = calculateBackoffDelay(attempt, retryConfig);
          await sleep(delay);
        }
      }

      // All retries failed
      clearTimeout(streamTimeoutId);
      if (isMountedRef.current) {
        setError(lastError);
        if (options.onError && lastError) {
          options.onError(lastError);
        }
      }

      throw lastError || createStreamError("Erreur inconnue", "unknown");
    },
    [cancelStream, options]
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
