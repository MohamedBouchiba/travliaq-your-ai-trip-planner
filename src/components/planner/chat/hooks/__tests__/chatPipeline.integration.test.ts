/**
 * Chat Pipeline Integration Tests
 *
 * Simulates real conversation turns and verifies the full pipeline:
 * SSE parsing → memory updates → widget decisions → cooldown → phase detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createAccumulator,
  processSSELine,
  parseSSEChunk,
  type SSEAccumulator,
  type SSEEventHandlers,
} from "../sseEventParser";
import { buildLLMContext } from "../buildLLMContext";
import { flightDataToMemory } from "../../utils/flightDataToMemory";
import { getDefaultWelcomeMessage, type StoredMessage } from "@/hooks/sessionHelpers";
import type { ChatMessage } from "../../types";
import type { FlightFormData } from "@/types/flight";

// Mock i18n for sessionHelpers
vi.mock("@/i18n/config", () => ({
  default: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        "planner.chat.newConversation": "Nouvelle conversation",
        "planner.chat.startConversation": "Commencer",
        "planner.chat.welcomeMessage": "Bonjour ! Je suis votre assistant de voyage.",
      };
      return translations[key] || key;
    },
  },
}));

// Mock phaseDetector
vi.mock("../../services/phaseDetector", () => ({
  getSimplePhase: (
    hasDestination: boolean,
    hasDates: boolean,
    hasTravelers: boolean,
    hasFlightResults: boolean,
    hasHotelResults: boolean,
    _askedForInspiration?: boolean,
  ) => {
    // C5: askedForInspiration no longer overrides when destination is set
    if (!hasDestination) return "inspiration";
    if (hasFlightResults || hasHotelResults) return "comparison";
    if (hasDestination && hasDates && hasTravelers) return "planning";
    return "research";
  },
}));

// ─── Helpers ───

const noopHandlers: SSEEventHandlers = {};

function simulateSSE(
  events: Array<Record<string, unknown>>,
  handlers: SSEEventHandlers = noopHandlers,
): SSEAccumulator {
  const acc = createAccumulator();
  for (const event of events) {
    processSSELine(JSON.stringify(event), handlers, acc);
  }
  return acc;
}

function migrateMessageTimestamps(messages: StoredMessage[], baseTimestamp: number): StoredMessage[] {
  return messages.map((m, i) => {
    if (m.timestamp) return m;
    if (m.id === "welcome") {
      return { ...m, timestamp: baseTimestamp - 1000 };
    }
    return { ...m, timestamp: baseTimestamp + i * 60_000 };
  });
}

// ─── Scenario 1: "Je veux partir à la plage en mai" ───

describe("Scenario 1 — Preference + date extraction", () => {
  it("preserves reasoning widgetDecision when intent overwrites", () => {
    const acc = simulateSSE([
      {
        type: "reasoning",
        reasoning: {
          understanding: "User wants beach vacation",
          contextAnalysis: "early exploration",
          responseStrategy: "show preference widget",
          confidence: 0.85,
          widgetDecision: {
            shouldShow: true,
            widgetType: "preferenceInterests",
            reason: "user expressed interest in beach",
          },
        },
      },
      {
        type: "intentClassification",
        intentClassification: {
          primaryIntent: "provide_preferences",
          confidence: 0.8,
          entities: { interests: ["beach", "sun"] },
          // No widgetToShow — backend didn't include one
        },
      },
      {
        type: "content",
        content: "Super ! Vous aimez la plage et le soleil.",
      },
    ]);

    // Intent classification has interests
    expect(acc.intentClassification!.entities?.interests).toEqual(["beach", "sun"]);
    // But no widgetToShow (overwritten)
    expect(acc.intentClassification!.widgetToShow).toBeUndefined();
    // Reasoning widget preserved separately
    expect(acc.reasoningWidgetDecision).not.toBeNull();
    expect(acc.reasoningWidgetDecision!.widgetToShow?.type).toBe("preferenceInterests");
    // Content accumulated
    expect(acc.content).toBe("Super ! Vous aimez la plage et le soleil.");
  });
});

// ─── Scenario 2: "Paris du 5 au 8 mai, 2 adultes" ───

describe("Scenario 2 — Flight data dominates widget decision", () => {
  it("flightDataToMemory correctly maps flight details", () => {
    const flightData: FlightFormData = {
      from: "Paris",
      departureDate: "2025-05-05",
      returnDate: "2025-05-08",
      adults: 2,
      children: 0,
      infants: 0,
    } as FlightFormData;

    const result = flightDataToMemory(flightData);

    expect(result.departure).toEqual({ city: "Paris" });
    expect(result.departureDate).toEqual(new Date("2025-05-05"));
    expect(result.returnDate).toEqual(new Date("2025-05-08"));
    expect(result.passengers).toEqual({ adults: 2, children: 0, infants: 0 });
  });

  it("SSE flight data populates accumulator correctly", () => {
    const acc = simulateSSE([
      {
        type: "flightData",
        flightData: {
          from: "Paris",
          to: "Tokyo",
          departureDate: "2025-05-05",
          returnDate: "2025-05-08",
          adults: 2,
          needsDateWidget: false,
          needsTravelersWidget: false,
        },
      },
      {
        type: "intentClassification",
        intentClassification: {
          primaryIntent: "provide_flight_info",
          confidence: 0.95,
          entities: {},
        },
      },
    ]);

    expect(acc.flightData).not.toBeNull();
    expect(acc.flightData!.from).toBe("Paris");
    expect(acc.flightData!.to).toBe("Tokyo");
    expect(acc.intentClassification!.primaryIntent).toBe("provide_flight_info");
  });
});

// ─── Scenario 3: "là où je suis" rejected (Bug D) ───

describe("Scenario 3 — Departure city validation", () => {
  // Inline the validation logic for testing
  const INVALID_DEPARTURE_PATTERNS = [
    /^(ici|là|là où|je suis|mon emplacement|ma position|ma ville|current|here|my location|my city|where i am|my place)/i,
    /^(près de|proche de|around|near)/i,
  ];

  function isValidDepartureCity(city: string): boolean {
    if (!city || city.trim().length < 2 || city.trim().length > 60) return false;
    return !INVALID_DEPARTURE_PATTERNS.some((p) => p.test(city.trim()));
  }

  it("rejects 'là où je suis'", () => {
    expect(isValidDepartureCity("là où je suis")).toBe(false);
  });

  it("rejects 'ici'", () => {
    expect(isValidDepartureCity("ici")).toBe(false);
  });

  it("rejects 'my location'", () => {
    expect(isValidDepartureCity("my location")).toBe(false);
  });

  it("accepts 'Paris'", () => {
    expect(isValidDepartureCity("Paris")).toBe(true);
  });

  it("accepts 'New York'", () => {
    expect(isValidDepartureCity("New York")).toBe(true);
  });

  it("SSE pipeline extracts departureCity from intent", () => {
    const acc = simulateSSE([
      {
        type: "intentClassification",
        intentClassification: {
          primaryIntent: "provide_departure",
          confidence: 0.9,
          entities: { departureCity: "là où je suis" },
        },
      },
    ]);

    // Departure city is in entities
    const depCity = acc.intentClassification!.entities?.departureCity as string;
    // But validation should catch it
    expect(isValidDepartureCity(depCity)).toBe(false);
  });
});

// ─── Scenario 4: Widget re-show after confirmation (Bug A) ───

describe("Scenario 4 — Refinable widget re-show", () => {
  // Simulate cooldown state with a simple map
  const REFINABLE_WIDGETS = new Set(["preferenceInterests", "preferenceStyle"]);
  const WIDGET_COOLDOWN_MS = 60000;
  const MAX_WIDGET_ATTEMPTS = 2;

  interface MockRecord {
    confirmed: boolean;
    shownAt: number;
    attempts: number;
    userTypedInstead: boolean;
  }

  function canShowWidget(widgetType: string, record: MockRecord | undefined, now: number): boolean {
    if (!record) return true;
    if (record.confirmed && !REFINABLE_WIDGETS.has(widgetType)) return false;
    if (record.attempts >= MAX_WIDGET_ATTEMPTS) return false;
    if (record.userTypedInstead && (now - record.shownAt) < 120000) return false;
    if ((now - record.shownAt) < WIDGET_COOLDOWN_MS) return false;
    return true;
  }

  it("confirmed refinable widget is re-showable after cooldown", () => {
    const baseTime = 1000000;
    const record: MockRecord = {
      confirmed: true,
      shownAt: baseTime,
      attempts: 1,
      userTypedInstead: false,
    };

    // During cooldown — blocked
    expect(canShowWidget("preferenceInterests", record, baseTime + 30_000)).toBe(false);
    // After cooldown — allowed (refinable)
    expect(canShowWidget("preferenceInterests", record, baseTime + 61_000)).toBe(true);
  });

  it("confirmed one-shot widget is permanently blocked", () => {
    const baseTime = 1000000;
    const record: MockRecord = {
      confirmed: true,
      shownAt: baseTime,
      attempts: 1,
      userTypedInstead: false,
    };

    // Even after long time — still blocked
    expect(canShowWidget("dateRangePicker", record, baseTime + 300_000)).toBe(false);
  });
});

// ─── Scenario 5: Reasoning widget fallback (Bug A) ───

describe("Scenario 5 — Reasoning widget as fallback", () => {
  it("reasoning widgetDecision survives intent overwrite", () => {
    const acc = simulateSSE([
      {
        type: "reasoning",
        reasoning: {
          understanding: "test",
          contextAnalysis: "test",
          responseStrategy: "show widget",
          confidence: 0.9,
          widgetDecision: {
            shouldShow: true,
            widgetType: "preferenceInterests",
            reason: "user mentioned preferences",
          },
        },
      },
      {
        type: "intentClassification",
        intentClassification: {
          primaryIntent: "provide_preferences",
          confidence: 0.8,
          entities: {},
          // No widgetToShow
        },
      },
    ]);

    // Main intent has no widget
    expect(acc.intentClassification!.widgetToShow).toBeUndefined();

    // Reasoning widget available for fallback
    expect(acc.reasoningWidgetDecision).not.toBeNull();
    const rwDecision = acc.reasoningWidgetDecision!;
    expect(rwDecision.widgetToShow?.type).toBe("preferenceInterests");

    // Can construct a synthetic intent from reasoning for fallback
    const syntheticIntent = {
      primaryIntent: rwDecision.widgetToShow!.type,
      confidence: 0.9,
      entities: {},
      widgetToShow: rwDecision.widgetToShow,
    };
    expect(syntheticIntent.widgetToShow?.type).toBe("preferenceInterests");
  });
});

// ─── Scenario 6: SSE chunk split (Bug C) ───

describe("Scenario 6 — SSE chunk split mid-JSON", () => {
  it("buffers incomplete line and completes on next chunk", () => {
    const acc = createAccumulator();

    // Chunk 1: incomplete
    const r1 = parseSSEChunk(
      'data: {"type":"content","con',
      noopHandlers,
      acc,
    );
    expect(acc.content).toBe(""); // Nothing parsed yet
    expect(r1.remainingBuffer).toBe('data: {"type":"content","con');

    // Chunk 2: completes
    const r2 = parseSSEChunk(
      'tent":"bonjour"}\n\ndata: [DONE]\n\n',
      noopHandlers,
      acc,
      r1.remainingBuffer,
    );
    expect(acc.content).toBe("bonjour");
    expect(r2.done).toBe(true);
  });

  it("handles three-way split", () => {
    const acc = createAccumulator();

    const r1 = parseSSEChunk('data: {"type":', noopHandlers, acc);
    const r2 = parseSSEChunk('"content","content":', noopHandlers, acc, r1.remainingBuffer);
    const r3 = parseSSEChunk('"salut"}\n\n', noopHandlers, acc, r2.remainingBuffer);

    expect(acc.content).toBe("salut");
    expect(r3.remainingBuffer).toBe("");
  });
});

// ─── Scenario 7: Welcome message timestamp (Bug B) ───

describe("Scenario 7 — Welcome message and timestamp migration", () => {
  it("getDefaultWelcomeMessage includes timestamp", () => {
    const msg = getDefaultWelcomeMessage();
    expect(msg.timestamp).toBeDefined();
    expect(typeof msg.timestamp).toBe("number");
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it("migrateMessageTimestamps assigns sequential timestamps", () => {
    const baseTime = 1700000000000;
    const messages: StoredMessage[] = [
      { id: "welcome", role: "assistant", text: "Bonjour" },
      { id: "msg-1", role: "user", text: "Salut" },
      { id: "msg-2", role: "assistant", text: "Comment puis-je vous aider ?" },
    ];

    const migrated = migrateMessageTimestamps(messages, baseTime);

    // Welcome gets earliest timestamp
    expect(migrated[0].timestamp).toBe(baseTime - 1000);
    // Others get sequential timestamps
    expect(migrated[1].timestamp).toBe(baseTime + 1 * 60_000);
    expect(migrated[2].timestamp).toBe(baseTime + 2 * 60_000);
  });

  it("preserves existing timestamps during migration", () => {
    const baseTime = 1700000000000;
    const messages: StoredMessage[] = [
      { id: "welcome", role: "assistant", text: "Bonjour", timestamp: 1699999000000 },
      { id: "msg-1", role: "user", text: "Salut" },
    ];

    const migrated = migrateMessageTimestamps(messages, baseTime);

    // Existing timestamp preserved
    expect(migrated[0].timestamp).toBe(1699999000000);
    // Missing timestamp assigned
    expect(migrated[1].timestamp).toBe(baseTime + 1 * 60_000);
  });
});

// ─── Scenario 8: Phase detection in buildLLMContext ───

describe("Scenario 8 — Phase detection", () => {
  function makeMinimalSources(overrides: Record<string, unknown> = {}) {
    return {
      messages: [] as ChatMessage[],
      getActivityMemory: () => null,
      getPreferenceMemory: () => null,
      mapContext: { buildContextString: () => "" },
      widgetTracking: { getActiveWidgetsContext: () => "", getContextForLLM: () => "" },
      widgetActionExecutor: { getPendingWidgets: () => [] },
      getMemorySummary: () => "",
      missingFields: undefined,
      sessionContext: { buildConversationSummary: () => "", sessionEntities: {}, widgetDecisions: [] },
      getBasketSummary: () => "",
      widgetCooldown: { getBlockedWidgets: () => [] },
      ...overrides,
    };
  }

  it("inspiration phase when no destination", () => {
    const result = buildLLMContext(makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "inspire-moi" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: false, hasDates: false, hasTravelers: false,
        hasFlightResults: false, hasHotelResults: false,
      },
    }) as any);
    expect(result.currentPhase).toBe("inspiration");
  });

  it("research phase when destination but no dates", () => {
    const result = buildLLMContext(makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "Tokyo" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: true, hasDates: false, hasTravelers: false,
        hasFlightResults: false, hasHotelResults: false,
      },
    }) as any);
    expect(result.currentPhase).toBe("research");
  });

  it("planning phase when all basic info", () => {
    const result = buildLLMContext(makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "on part" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasFlightResults: false, hasHotelResults: false,
      },
    }) as any);
    expect(result.currentPhase).toBe("planning");
  });

  it("comparison phase when flight results exist", () => {
    const result = buildLLMContext(makeMinimalSources({
      messages: [{ id: "1", role: "user", text: "les vols" }] as ChatMessage[],
      phaseSignals: {
        hasDestination: true, hasDates: true, hasTravelers: true,
        hasFlightResults: true, hasHotelResults: false,
      },
    }) as any);
    expect(result.currentPhase).toBe("comparison");
  });
});
