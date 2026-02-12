/**
 * Tests for useChatStream pure functions
 * Tests: limitMessages, createStreamError, classifyError, calculateBackoffDelay,
 *        buildContextMessage, buildNegativePreferencesContext
 */

import { describe, it, expect } from "vitest";
import {
  limitMessages,
  createStreamError,
  classifyError,
  calculateBackoffDelay,
  buildContextMessage,
  buildNegativePreferencesContext,
  MAX_MESSAGES_TO_SEND,
  type APIMessage,
  type MemoryContext,
  type NegativePreference,
  type RetryConfig,
} from "../useChatStream";

// ─── limitMessages ───

describe("limitMessages", () => {
  const makeMsg = (role: string, i: number): APIMessage => ({
    role,
    content: `msg-${i}`,
  });

  it("returns all messages when count <= MAX", () => {
    const msgs = Array.from({ length: 5 }, (_, i) => makeMsg("user", i));
    expect(limitMessages(msgs)).toEqual(msgs);
  });

  it("returns all messages when count equals MAX", () => {
    const msgs = Array.from({ length: MAX_MESSAGES_TO_SEND }, (_, i) => makeMsg("user", i));
    expect(limitMessages(msgs)).toHaveLength(MAX_MESSAGES_TO_SEND);
  });

  it("keeps system message + last (MAX-1) when first is system", () => {
    const msgs: APIMessage[] = [
      makeMsg("system", 0),
      ...Array.from({ length: 20 }, (_, i) => makeMsg("user", i + 1)),
    ];
    const result = limitMessages(msgs);
    expect(result).toHaveLength(MAX_MESSAGES_TO_SEND);
    expect(result[0].role).toBe("system");
    expect(result[0].content).toBe("msg-0");
    // Last messages should be the most recent
    expect(result[result.length - 1].content).toBe("msg-20");
  });

  it("keeps last MAX messages when no system message", () => {
    const msgs = Array.from({ length: 20 }, (_, i) => makeMsg("user", i));
    const result = limitMessages(msgs);
    expect(result).toHaveLength(MAX_MESSAGES_TO_SEND);
    expect(result[0].content).toBe(`msg-${20 - MAX_MESSAGES_TO_SEND}`);
    expect(result[result.length - 1].content).toBe("msg-19");
  });

  it("handles empty array", () => {
    expect(limitMessages([])).toEqual([]);
  });
});

// ─── createStreamError ───

describe("createStreamError", () => {
  it("creates error with type and statusCode", () => {
    const err = createStreamError("test error", "server", 500);
    expect(err.message).toBe("test error");
    expect(err.type).toBe("server");
    expect(err.statusCode).toBe(500);
  });

  it("marks network errors as retryable", () => {
    expect(createStreamError("net", "network").retryable).toBe(true);
  });

  it("marks server errors as retryable", () => {
    expect(createStreamError("srv", "server", 502).retryable).toBe(true);
  });

  it("marks timeout errors as retryable", () => {
    expect(createStreamError("timeout", "timeout").retryable).toBe(true);
  });

  it("marks auth errors as NOT retryable", () => {
    expect(createStreamError("auth", "auth", 401).retryable).toBe(false);
  });

  it("marks rate_limit errors as NOT retryable", () => {
    expect(createStreamError("rl", "rate_limit", 429).retryable).toBe(false);
  });

  it("marks cancelled errors as NOT retryable", () => {
    expect(createStreamError("cancelled", "cancelled").retryable).toBe(false);
  });

  it("marks unknown errors as NOT retryable", () => {
    expect(createStreamError("???", "unknown").retryable).toBe(false);
  });
});

// ─── classifyError ───

describe("classifyError", () => {
  it("classifies AbortError as cancelled", () => {
    const err = new DOMException("Aborted", "AbortError");
    const result = classifyError(err);
    expect(result.type).toBe("cancelled");
    expect(result.retryable).toBe(false);
  });

  it("classifies fetch errors as network", () => {
    const err = new Error("fetch failed");
    const result = classifyError(err);
    expect(result.type).toBe("network");
  });

  it("classifies network keyword as network", () => {
    const err = new Error("network error occurred");
    const result = classifyError(err);
    expect(result.type).toBe("network");
  });

  it("classifies 401 as auth", () => {
    const result = classifyError(new Error("Unauthorized"), 401);
    expect(result.type).toBe("auth");
    expect(result.statusCode).toBe(401);
  });

  it("classifies 403 as auth", () => {
    const result = classifyError(new Error("Forbidden"), 403);
    expect(result.type).toBe("auth");
  });

  it("classifies 429 as rate_limit", () => {
    const result = classifyError(new Error("Too many"), 429);
    expect(result.type).toBe("rate_limit");
    expect(result.retryable).toBe(false);
  });

  it("classifies 500 as server", () => {
    const result = classifyError(new Error("Internal"), 500);
    expect(result.type).toBe("server");
    expect(result.retryable).toBe(true);
  });

  it("classifies 503 as server", () => {
    const result = classifyError(new Error("Unavailable"), 503);
    expect(result.type).toBe("server");
  });

  it("classifies unknown errors as unknown", () => {
    const result = classifyError("some string error");
    expect(result.type).toBe("unknown");
  });

  it("classifies non-Error objects as unknown", () => {
    const result = classifyError({ code: 42 });
    expect(result.type).toBe("unknown");
  });
});

// ─── calculateBackoffDelay ───

describe("calculateBackoffDelay", () => {
  const config: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  };

  it("returns delay around base for attempt 0", () => {
    const delay = calculateBackoffDelay(0, config);
    // Base = 1000, jitter 0-30% → range [1000, 1300]
    expect(delay).toBeGreaterThanOrEqual(1000);
    expect(delay).toBeLessThanOrEqual(1300);
  });

  it("returns delay around 2x base for attempt 1", () => {
    const delay = calculateBackoffDelay(1, config);
    // 2000 + 0-30% jitter → [2000, 2600]
    expect(delay).toBeGreaterThanOrEqual(2000);
    expect(delay).toBeLessThanOrEqual(2600);
  });

  it("returns delay around 4x base for attempt 2", () => {
    const delay = calculateBackoffDelay(2, config);
    // 4000 + 0-30% jitter → [4000, 5200]
    expect(delay).toBeGreaterThanOrEqual(4000);
    expect(delay).toBeLessThanOrEqual(5200);
  });

  it("never exceeds maxDelayMs", () => {
    // Attempt 10 would be 1000 * 2^10 = 1024000, capped at 10000
    const delay = calculateBackoffDelay(10, config);
    expect(delay).toBeLessThanOrEqual(config.maxDelayMs);
  });

  it("returns positive delay for attempt 0", () => {
    expect(calculateBackoffDelay(0, config)).toBeGreaterThan(0);
  });
});

// ─── buildContextMessage ───

describe("buildContextMessage", () => {
  const baseContext: MemoryContext = {
    flightSummary: "",
    activityContext: "",
    preferenceContext: "",
    missingFields: [],
  };

  it("returns empty string when no summary, widgets, or basket", () => {
    const result = buildContextMessage(baseContext);
    expect(result).toBe("");
  });

  it("returns widgetHistory when only that is present", () => {
    const result = buildContextMessage({ ...baseContext, widgetHistory: "[HISTORY]" });
    expect(result).toBe("[HISTORY]");
  });

  it("includes blocked widgets first", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      blockedWidgets: ["datePicker", "travelersSelector"],
    });
    expect(result).toContain("[WIDGETS BLOQUÉS");
    expect(result).toContain("datePicker");
    expect(result).toContain("travelersSelector");
    // Blocked widgets should come before the flight summary
    const blockedIdx = result.indexOf("[WIDGETS BLOQUÉS");
    const summaryIdx = result.indexOf("[CONTEXTE MÉMOIRE]");
    expect(blockedIdx).toBeLessThan(summaryIdx);
  });

  it("includes flight summary and missing fields", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "Paris → Tokyo",
      missingFields: ["departureDate" as any],
    });
    expect(result).toContain("[CONTEXTE MÉMOIRE] Paris → Tokyo");
    expect(result).toContain("[CHAMPS MANQUANTS]");
  });

  it("includes activity and preference context", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      activityContext: "\n[ACTIVITÉS] 2",
      preferenceContext: "\n[PREFS] culture",
    });
    expect(result).toContain("[ACTIVITÉS] 2");
    expect(result).toContain("[PREFS] culture");
  });

  it("includes basket summary", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      basketSummary: "[PANIER] Vol 450€",
    });
    expect(result).toContain("[PANIER] Vol 450€");
  });

  it("includes conversation summary", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      conversationSummary: "User discussed budget",
    });
    expect(result).toContain("User discussed budget");
  });

  it("includes session entities", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      sessionEntities: {
        destinations: ["Japon", "Thaïlande"],
        dates: ["mars 2026"],
        budgets: ["2000€"],
        constraints: [],
      },
    });
    expect(result).toContain("[ENTITÉS SESSION]");
    expect(result).toContain("Japon");
    expect(result).toContain("mars 2026");
    expect(result).toContain("2000€");
  });

  it("skips empty session entity categories", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      sessionEntities: {
        destinations: [],
        dates: [],
        budgets: [],
        constraints: [],
      },
    });
    expect(result).not.toContain("[ENTITÉS SESSION]");
  });

  it("includes widget decisions", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      widgetDecisions: [
        { widgetType: "datePicker", chosen: "15 mars", timestamp: 0 },
        { widgetType: "travelersSelector", chosen: "2 adultes", timestamp: 1 },
      ],
    });
    expect(result).toContain("[CHOIX VIA WIDGETS]");
    expect(result).toContain("15 mars");
    expect(result).toContain("2 adultes");
  });

  it("includes widget history and active widgets context", () => {
    const result = buildContextMessage({
      ...baseContext,
      flightSummary: "CDG → NRT",
      widgetHistory: "[WIDGET_HISTORY]",
      activeWidgetsContext: "[ACTIVE_WIDGETS]",
    });
    expect(result).toContain("[WIDGET_HISTORY]");
    expect(result).toContain("[ACTIVE_WIDGETS]");
  });
});

// ─── buildNegativePreferencesContext ───

describe("buildNegativePreferencesContext", () => {
  it("returns empty string for empty array", () => {
    expect(buildNegativePreferencesContext([])).toBe("");
  });

  it("returns empty string for null/undefined", () => {
    expect(buildNegativePreferencesContext(null as unknown as NegativePreference[])).toBe("");
    expect(buildNegativePreferencesContext(undefined as unknown as NegativePreference[])).toBe("");
  });

  it("formats preferences with reasons", () => {
    const prefs: NegativePreference[] = [
      { category: "food", value: "sushi", reason: "allergique" },
    ];
    const result = buildNegativePreferencesContext(prefs);
    expect(result).toContain("[PRÉFÉRENCES NÉGATIVES");
    expect(result).toContain("- sushi (allergique)");
  });

  it("formats preferences without reasons", () => {
    const prefs: NegativePreference[] = [
      { category: "activity", value: "plongée" },
    ];
    const result = buildNegativePreferencesContext(prefs);
    expect(result).toContain("- plongée");
    expect(result).not.toContain("(");
  });

  it("handles multiple preferences", () => {
    const prefs: NegativePreference[] = [
      { category: "food", value: "sushi", reason: "allergique" },
      { category: "activity", value: "escalade" },
      { category: "hotel", value: "auberge", reason: "trop bruyant" },
    ];
    const result = buildNegativePreferencesContext(prefs);
    const lines = result.split("\n");
    // Header + 3 items
    expect(lines.length).toBe(4);
  });
});
