/**
 * fetchWithRetry — Wraps fetch() with exponential backoff retry logic.
 * Retries on transient HTTP errors (429, 500, 502, 503, 504).
 */

import { type RequestLogger } from "../../_shared/logger.ts";

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  log: RequestLogger,
  label = "azure_openai",
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.ok || !RETRYABLE_STATUS_CODES.has(response.status)) {
        return response;
      }

      // Retryable status — read body for logging, then retry
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        log.warn(label, `Retryable error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms`, {
          status: response.status,
          attempt,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        log.warn(label, `Network error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms`, {
          error: lastError.message,
          attempt,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  log.error(label, `All ${MAX_RETRIES + 1} attempts failed`, lastError ?? undefined);
  throw lastError ?? new Error(`fetchWithRetry: all attempts failed for ${label}`);
}
