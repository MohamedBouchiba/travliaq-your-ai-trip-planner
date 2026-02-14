/**
 * Tool Executor - Centralized tool execution with idempotence and caching
 * 
 * Implements:
 * - Tool result caching for idempotence
 * - Unified tool execution interface
 * - Error handling with structured responses
 */

import type { RequestLogger } from "../../_shared/logger.ts";

// In-memory cache for tool execution results (TTL: 5 minutes)
// In production, use Redis for persistence across cold starts
const toolResultCache = new Map<string, { result: ToolExecutionResult; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    suggestion?: string;
  };
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
}

/**
 * Generate a unique tool run ID for idempotence tracking
 */
export function generateToolRunId(requestId: string, toolCallId: string): string {
  return `${requestId}_${toolCallId}`;
}

/**
 * Check if a tool has already been executed and return cached result
 */
export function getCachedToolResult(toolRunId: string): ToolExecutionResult | null {
  const cached = toolResultCache.get(toolRunId);
  if (!cached) return null;
  
  // Check expiration
  if (Date.now() > cached.expiresAt) {
    toolResultCache.delete(toolRunId);
    return null;
  }
  
  return cached.result;
}

/**
 * Cache a tool execution result
 */
export function cacheToolResult(toolRunId: string, result: ToolExecutionResult): void {
  // Clean up expired entries periodically (1% chance per call)
  if (Math.random() < 0.01) {
    cleanupExpiredCache();
  }
  
  toolResultCache.set(toolRunId, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Remove expired cache entries
 */
function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of toolResultCache.entries()) {
    if (now > value.expiresAt) {
      toolResultCache.delete(key);
    }
  }
}

/**
 * Build a tool response message for the LLM
 */
export function buildToolResponseMessage(
  toolCallId: string,
  result: ToolExecutionResult
): { role: "tool"; tool_call_id: string; content: string } {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    content: JSON.stringify(result),
  };
}

/**
 * Multi-Tool Loop Configuration
 */
export const MULTI_TOOL_CONFIG = {
  MAX_LOOPS: 3,
  /** Max tokens for ReAct loop iterations (tool calls + reasoning) */
  REACT_MAX_TOKENS: 1000,
  /** Max tokens for final content-only generation call */
  FINAL_CONTENT_MAX_TOKENS: 800,
  ALLOWED_CHAINING_TOOLS: [
    "classify_intent",
    "plan_response",
    "update_flight_widget",
    "update_accommodation_widget",
    "update_preferences",
    "generate_quick_replies",
    "request_destination_suggestions",
    "trigger_flight_search",
  ],
} as const;

/**
 * Check if we should continue the multi-tool loop
 */
export function shouldContinueToolLoop(
  loopCount: number,
  hasToolCalls: boolean,
  toolNames: string[],
  log: RequestLogger
): boolean {
  // Always stop if max loops reached
  if (loopCount >= MULTI_TOOL_CONFIG.MAX_LOOPS) {
    log.warn("multi_tool", `Max tool loops (${MULTI_TOOL_CONFIG.MAX_LOOPS}) reached`, { loopCount });
    return false;
  }
  
  // Stop if no tool calls
  if (!hasToolCalls) {
    return false;
  }
  
  // Check if all tool calls are in allowed list
  const allAllowed = toolNames.every(name => 
    MULTI_TOOL_CONFIG.ALLOWED_CHAINING_TOOLS.includes(name as any)
  );
  
  if (!allAllowed) {
    log.info("multi_tool", "Non-chainable tool detected, ending loop", { toolNames });
    return false;
  }
  
  return true;
}

/**
 * Aggregate collected tool data across multiple loop iterations
 */
export interface CollectedToolData {
  flightData: Record<string, unknown> | null;
  accommodationData: Record<string, unknown> | null;
  preferencesData: Record<string, unknown> | null;
  quickRepliesData: { replies: unknown[] } | null;
  destinationSuggestionRequest: Record<string, unknown> | null;
  intentClassification: Record<string, unknown> | null;
  reasoningData: Record<string, unknown> | null;
  flightSearchTrigger: boolean;
  tripRecapData: Record<string, unknown> | null;
}

export function createEmptyCollectedData(): CollectedToolData {
  return {
    flightData: null,
    accommodationData: null,
    preferencesData: null,
    quickRepliesData: null,
    destinationSuggestionRequest: null,
    intentClassification: null,
    reasoningData: null,
    flightSearchTrigger: false,
    tripRecapData: null,
  };
}

/**
 * Merge new tool data into existing collected data
 * Later values override earlier ones (last tool call wins)
 */
export function mergeToolData(
  existing: CollectedToolData,
  newData: Partial<CollectedToolData>
): CollectedToolData {
  return {
    flightData: newData.flightData ?? existing.flightData,
    accommodationData: newData.accommodationData ?? existing.accommodationData,
    preferencesData: newData.preferencesData ?? existing.preferencesData,
    quickRepliesData: newData.quickRepliesData ?? existing.quickRepliesData,
    destinationSuggestionRequest: newData.destinationSuggestionRequest ?? existing.destinationSuggestionRequest,
    intentClassification: newData.intentClassification ?? existing.intentClassification,
    reasoningData: newData.reasoningData ?? existing.reasoningData,
    flightSearchTrigger: newData.flightSearchTrigger ?? existing.flightSearchTrigger,
  };
}
