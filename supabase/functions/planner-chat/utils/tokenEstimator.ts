/**
 * tokenEstimator — Simple token estimation and message truncation.
 *
 * Uses the ~4 chars/token heuristic for GPT-class models.
 * Provides intelligent truncation that preserves the system prompt
 * and most recent messages.
 */

import { type RequestLogger } from "../../_shared/logger.ts";

const CHARS_PER_TOKEN = 4;

/** Estimate token count for a string */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Estimate token count for an array of chat messages */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>
): number {
  let total = 0;
  for (const msg of messages) {
    // ~4 tokens overhead per message (role, separators)
    total += 4 + estimateTokens(msg.content || "");
  }
  return total;
}

/**
 * Truncate messages to fit within a token budget.
 *
 * Strategy:
 * - Always keep the system prompt (first message)
 * - Always keep the last N messages (most recent context)
 * - Remove oldest non-system messages first
 *
 * @param messages - Full message array
 * @param maxTokens - Maximum token budget (e.g. 12000)
 * @param keepLastN - Minimum recent messages to preserve (default: 6)
 * @param log - Logger for observability
 * @returns Truncated messages array
 */
export function truncateMessages(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  log?: RequestLogger,
  keepLastN = 6,
): Array<{ role: string; content: string }> {
  const totalTokens = estimateMessagesTokens(messages);

  if (totalTokens <= maxTokens) {
    return messages;
  }

  // Separate system prompt from conversation
  const systemMessages = messages.filter((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const systemTokens = estimateMessagesTokens(systemMessages);
  const budgetForConversation = maxTokens - systemTokens;

  // Keep the last N messages as priority
  const recentMessages = conversationMessages.slice(-keepLastN);
  const olderMessages = conversationMessages.slice(0, -keepLastN);

  let recentTokens = estimateMessagesTokens(recentMessages);
  const result = [...systemMessages];

  // Add older messages from newest to oldest until budget is exceeded
  const fittingOlder: Array<{ role: string; content: string }> = [];
  let olderTokens = 0;

  for (let i = olderMessages.length - 1; i >= 0; i--) {
    const msgTokens = 4 + estimateTokens(olderMessages[i].content || "");
    if (olderTokens + msgTokens + recentTokens <= budgetForConversation) {
      fittingOlder.unshift(olderMessages[i]);
      olderTokens += msgTokens;
    } else {
      break;
    }
  }

  result.push(...fittingOlder, ...recentMessages);

  const removedCount = messages.length - result.length;
  if (removedCount > 0 && log) {
    log.info("token_truncation", `Truncated ${removedCount} messages`, {
      originalTokens: totalTokens,
      truncatedTokens: estimateMessagesTokens(result),
      maxTokens,
      removedMessages: removedCount,
    });
  }

  return result;
}
