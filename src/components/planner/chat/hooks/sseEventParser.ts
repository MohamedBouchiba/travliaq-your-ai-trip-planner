/**
 * sseEventParser - Extracts SSE parsing and event dispatching logic
 * from useChatStream.ts for better separation of concerns.
 *
 * Handles:
 * - Splitting raw chunks into SSE data lines
 * - JSON parsing each "data: ..." line
 * - Dispatching by parsed.type to typed handlers
 * - Accumulating stream results (content, flightData, etc.)
 */

import type { FlightFormData } from "@/types/flight";
import type {
  IntentClassification,
  ReasoningData,
  QuickReplyData,
  DestinationSuggestionRequest,
} from "./useChatStream";
import type { TripRecapData } from "../types";

// ─── Accumulator ─────────────────────────────────────────────────────────────

/**
 * Mutable accumulator that collects data across SSE events
 * throughout a single stream response.
 */
export interface SSEAccumulator {
  content: string;
  flightData: FlightFormData | null;
  accommodationData: any | null;
  preferencesData: any | null;
  quickReplies: QuickReplyData | null;
  destinationSuggestionRequest: DestinationSuggestionRequest | null;
  intentClassification: IntentClassification | null;
  /** Preserved reasoning-derived intent — survives intentClassification overwrite */
  reasoningWidgetDecision: IntentClassification | null;
  reasoning: ReasoningData | null;
  flightSearchTrigger: boolean;
  tripRecapData: TripRecapData | null;
}

/**
 * Create a fresh accumulator for a new stream.
 */
export function createAccumulator(): SSEAccumulator {
  return {
    content: "",
    flightData: null,
    accommodationData: null,
    preferencesData: null,
    quickReplies: null,
    destinationSuggestionRequest: null,
    intentClassification: null,
    reasoningWidgetDecision: null,
    reasoning: null,
    flightSearchTrigger: false,
    tripRecapData: null,
  };
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

/**
 * Handlers invoked when specific SSE event types are received.
 * All methods are optional; unhandled events are silently ignored.
 */
export interface SSEEventHandlers {
  /** Chain-of-Thought reasoning data */
  onReasoning?: (reasoning: ReasoningData, derivedIntent: IntentClassification | null) => void;
  /** Explicit intent classification from backend */
  onIntentClassification?: (intent: IntentClassification) => void;
  /** Flight form data extracted by LLM */
  onFlightData?: (data: FlightFormData) => void;
  /** Accommodation data extracted by LLM */
  onAccommodationData?: (data: any) => void;
  /** Preferences data extracted by LLM */
  onPreferencesData?: (data: any) => void;
  /** Quick reply suggestions */
  onQuickReplies?: (data: QuickReplyData) => void;
  /** Destination suggestion request from LLM */
  onDestinationSuggestionRequest?: (data: DestinationSuggestionRequest) => void;
  /** Flight search trigger */
  onFlightSearchTrigger?: (trigger: any) => void;
  /** Trip recap data */
  onTripRecapData?: (data: TripRecapData) => void;
  /** MCP tool started */
  onToolStarted?: (parsed: { tool: string; reason?: string; timestamp?: number }) => void;
  /** MCP tool finished (or failed) */
  onToolFinished?: (parsed: { tool: string; success?: boolean; latency_ms?: number; summary?: string; timestamp?: number }) => void;
  /** Streaming text content chunk */
  onContent?: (contentChunk: string) => void;
  /** SSE JSON parse error */
  onParseError?: (rawData: string) => void;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Process a single SSE data line (the part after "data: ").
 *
 * Updates the accumulator in-place and invokes the matching handler.
 *
 * @param jsonStr  The JSON string from the SSE line (after stripping "data: ")
 * @param handlers Callbacks for each event type
 * @param acc      Mutable accumulator to update
 * @returns `true` if [DONE] sentinel was received, `false` otherwise
 */
export function processSSELine(
  jsonStr: string,
  handlers: SSEEventHandlers,
  acc: SSEAccumulator,
): boolean {
  if (jsonStr === "[DONE]") return true;

  try {
    const parsed = JSON.parse(jsonStr);

    if (parsed.type === "reasoning" && parsed.reasoning) {
      acc.reasoning = parsed.reasoning;

      // If no explicit intentClassification yet, derive one from reasoning
      let derivedIntent: IntentClassification | null = null;
      if (!acc.intentClassification && parsed.reasoning.widgetDecision) {
        derivedIntent = {
          primaryIntent: parsed.reasoning.widgetDecision.widgetType || "unknown",
          confidence: parsed.reasoning.confidence,
          entities: {},
          widgetToShow: {
            type: parsed.reasoning.widgetDecision.widgetType || "",
            reason: parsed.reasoning.widgetDecision.reason || "",
          },
        };
        acc.intentClassification = derivedIntent;
      }

      // Always preserve reasoning widget decision separately (survives intent overwrite)
      if (parsed.reasoning.widgetDecision) {
        acc.reasoningWidgetDecision = derivedIntent || {
          primaryIntent: parsed.reasoning.widgetDecision.widgetType || "unknown",
          confidence: parsed.reasoning.confidence,
          entities: {},
          widgetToShow: {
            type: parsed.reasoning.widgetDecision.widgetType || "",
            reason: parsed.reasoning.widgetDecision.reason || "",
          },
        };
      }

      handlers.onReasoning?.(parsed.reasoning, derivedIntent);
    } else if (parsed.type === "intentClassification" && parsed.intentClassification) {
      acc.intentClassification = parsed.intentClassification;
      handlers.onIntentClassification?.(parsed.intentClassification);
    } else if (parsed.type === "flightData" && parsed.flightData) {
      acc.flightData = parsed.flightData;
      handlers.onFlightData?.(parsed.flightData);
    } else if (parsed.type === "accommodationData" && parsed.accommodationData) {
      acc.accommodationData = parsed.accommodationData;
      handlers.onAccommodationData?.(parsed.accommodationData);
    } else if (parsed.type === "preferencesData" && parsed.preferencesData) {
      acc.preferencesData = parsed.preferencesData;
      handlers.onPreferencesData?.(parsed.preferencesData);
    } else if (parsed.type === "quickReplies" && parsed.quickReplies) {
      acc.quickReplies = parsed.quickReplies;
      handlers.onQuickReplies?.(parsed.quickReplies);
    } else if (parsed.type === "destinationSuggestionRequest" && parsed.destinationSuggestionRequest) {
      acc.destinationSuggestionRequest = parsed.destinationSuggestionRequest;
      handlers.onDestinationSuggestionRequest?.(parsed.destinationSuggestionRequest);
    } else if (parsed.type === "flightSearchTrigger" && parsed.trigger) {
      acc.flightSearchTrigger = true;
      handlers.onFlightSearchTrigger?.(parsed.trigger);
    } else if (parsed.type === "tripRecapData" && parsed.tripRecapData) {
      acc.tripRecapData = parsed.tripRecapData;
      handlers.onTripRecapData?.(parsed.tripRecapData);
    } else if (parsed.type === "tool_started" && parsed.tool) {
      handlers.onToolStarted?.(parsed);
    } else if (parsed.type === "tool_finished" && parsed.tool) {
      handlers.onToolFinished?.(parsed);
    } else if (parsed.type === "content" && parsed.content) {
      acc.content += parsed.content;
      handlers.onContent?.(parsed.content);
    }
  } catch {
    handlers.onParseError?.(jsonStr);
  }

  return false;
}

/**
 * Process a raw SSE chunk (may contain multiple lines).
 *
 * Splits the chunk into lines, filters for "data: " prefixed lines,
 * and delegates each to `processSSELine`. Incomplete lines (from TCP
 * chunking) are returned as `remainingBuffer` for the next call.
 *
 * @param chunk       Raw text chunk from the ReadableStream
 * @param handlers    Callbacks for each event type
 * @param acc         Mutable accumulator to update
 * @param lineBuffer  Leftover from previous chunk (default "")
 * @returns `{ done, remainingBuffer }`
 */
export function parseSSEChunk(
  chunk: string,
  handlers: SSEEventHandlers,
  acc: SSEAccumulator,
  lineBuffer: string = "",
): { done: boolean; remainingBuffer: string } {
  const raw = lineBuffer + chunk;

  // If the raw data doesn't end with a newline, the last segment is incomplete
  const endsWithNewline = raw.endsWith("\n");
  const segments = raw.split("\n");
  const remaining = endsWithNewline ? "" : (segments.pop() || "");

  for (const line of segments) {
    if (line.trim() === "") continue;
    if (line.startsWith("data: ")) {
      const jsonStr = line.slice(6);
      const isDone = processSSELine(jsonStr, handlers, acc);
      if (isDone) return { done: true, remainingBuffer: "" };
    }
  }

  return { done: false, remainingBuffer: remaining };
}
