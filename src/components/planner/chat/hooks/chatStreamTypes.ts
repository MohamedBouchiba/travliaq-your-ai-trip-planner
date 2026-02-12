/**
 * chatStreamTypes.ts - Type definitions for the chat streaming system
 *
 * Extracted from useChatStream.ts to reduce file size.
 */

import type { FlightFormData } from "@/types/flight";
import type { MissingField } from "@/stores/hooks";

/**
 * Maximum messages to send to API to prevent context overflow
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
  widgetHistory?: string;
  currentPhase?: TravelPhase;
  negativePreferences?: NegativePreference[];
  activeWidgetsContext?: string;
  conversationSummary?: string;
  sessionEntities?: SessionEntities;
  widgetDecisions?: WidgetDecision[];
  basketSummary?: string;
  blockedWidgets?: string[];
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
  | "network"
  | "auth"
  | "server"
  | "rate_limit"
  | "timeout"
  | "cancelled"
  | "unknown";

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
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}
