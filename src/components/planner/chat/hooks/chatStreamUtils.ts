/**
 * chatStreamUtils.ts - Utility functions for the chat streaming system
 *
 * Extracted from useChatStream.ts to reduce file size.
 */

import { getMissingFieldLabel } from "../utils/flightDataToMemory";
import type {
  APIMessage,
  StreamError,
  StreamErrorType,
  RetryConfig,
  MemoryContext,
  NegativePreference,
} from "./chatStreamTypes";
import { MAX_MESSAGES_TO_SEND } from "./chatStreamTypes";

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Limit messages to MAX_MESSAGES_TO_SEND while preserving system context
 */
export function limitMessages(messages: APIMessage[]): APIMessage[] {
  if (messages.length <= MAX_MESSAGES_TO_SEND) {
    return messages;
  }

  const hasSystemMessage = messages[0]?.role === "system";

  if (hasSystemMessage) {
    const systemMessage = messages[0];
    const recentMessages = messages.slice(-(MAX_MESSAGES_TO_SEND - 1));
    return [systemMessage, ...recentMessages];
  }

  return messages.slice(-MAX_MESSAGES_TO_SEND);
}

/**
 * Create a StreamError with classification
 */
export function createStreamError(
  message: string,
  type: StreamErrorType,
  statusCode?: number,
): StreamError {
  const error = new Error(message) as StreamError;
  error.type = type;
  error.statusCode = statusCode;
  error.retryable = type === "network" || type === "server" || type === "timeout";
  return error;
}

/**
 * Classify error based on response or exception.
 * Returns i18n keys as messages — consumers must translate via t().
 */
export function classifyError(error: unknown, statusCode?: number): StreamError {
  if (error instanceof Error) {
    // Distinguish timeout aborts from user-initiated cancels
    if (error.name === "AbortError") {
      const isTimeout = (error as DOMException).message === "timeout" ||
        (typeof (error as unknown as { reason?: unknown }).reason === "string" && (error as unknown as { reason: string }).reason === "timeout");
      if (isTimeout) {
        return createStreamError("planner.error.timeout", "timeout");
      }
      return createStreamError("planner.error.cancelled", "cancelled");
    }
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return createStreamError("planner.error.network", "network");
    }
  }

  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) {
      return createStreamError("planner.error.auth", "auth", statusCode);
    }
    if (statusCode === 429) {
      return createStreamError("planner.error.rateLimit", "rate_limit", statusCode);
    }
    if (statusCode >= 500) {
      return createStreamError("planner.error.server", "server", statusCode);
    }
  }

  return createStreamError(
    "planner.error.unknown",
    "unknown",
  );
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the context message for the API
 */
export function buildContextMessage(memoryContext: MemoryContext): string {
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

  let context = "";
  if (blockedWidgets && blockedWidgets.length > 0) {
    context += `[WIDGETS BLOQUÉS - NE PAS RE-PROPOSER CES WIDGETS] ${blockedWidgets.join(", ")}\n`;
  }

  context += flightSummary
    ? `[CONTEXTE MÉMOIRE] ${flightSummary}${activityContext}${preferenceContext}\n[CHAMPS MANQUANTS] ${missingFieldsStr}`
    : "";

  if (basketSummary) {
    context += `\n${basketSummary}`;
  }

  if (conversationSummary) {
    context += `\n${conversationSummary}`;
  }

  if (sessionEntities) {
    const { destinations, dates, budgets, constraints } = sessionEntities;
    const entityParts: string[] = [];
    if (destinations.length > 0) entityParts.push(`Destinations mentionnées: ${destinations.join(", ")}`);
    if (dates.length > 0) entityParts.push(`Dates: ${dates.join(", ")}`);
    if (budgets.length > 0) entityParts.push(`Budgets: ${budgets.join(", ")}`);
    if (constraints.length > 0) entityParts.push(`Contraintes: ${constraints.join(", ")}`);
    if (entityParts.length > 0) {
      context += `\n[ENTITÉS SESSION] ${entityParts.join(" | ")}`;
    }
  }

  if (widgetDecisions && widgetDecisions.length > 0) {
    const decisionStr = widgetDecisions.map((d) => d.chosen).join(" → ");
    context += `\n[CHOIX VIA WIDGETS] ${decisionStr}`;
  }

  if (widgetHistory) {
    context += `\n${widgetHistory}`;
  }

  if (activeWidgetsContext) {
    context += `\n${activeWidgetsContext}`;
  }

  return context;
}

/**
 * Build negative preferences context for LLM
 */
export function buildNegativePreferencesContext(prefs: NegativePreference[]): string {
  if (!prefs || prefs.length === 0) return "";

  const lines = prefs.map((p) => {
    return p.reason ? `- ${p.value} (${p.reason})` : `- ${p.value}`;
  });

  return `[PRÉFÉRENCES NÉGATIVES - NE PAS PROPOSER]\n${lines.join("\n")}`;
}
