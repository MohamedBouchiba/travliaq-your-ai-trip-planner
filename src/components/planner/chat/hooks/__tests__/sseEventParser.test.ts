/**
 * Tests for sseEventParser pure functions
 * Tests: createAccumulator, processSSELine, parseSSEChunk
 */

import { describe, it, expect, vi } from "vitest";
import {
  createAccumulator,
  processSSELine,
  parseSSEChunk,
  type SSEAccumulator,
  type SSEEventHandlers,
} from "../sseEventParser";

// ─── Helpers ───

const noopHandlers: SSEEventHandlers = {};

function makeHandlers(overrides: Partial<SSEEventHandlers> = {}): SSEEventHandlers {
  return {
    onContent: vi.fn(),
    onReasoning: vi.fn(),
    onIntentClassification: vi.fn(),
    onFlightData: vi.fn(),
    onAccommodationData: vi.fn(),
    onPreferencesData: vi.fn(),
    onQuickReplies: vi.fn(),
    onDestinationSuggestionRequest: vi.fn(),
    onFlightSearchTrigger: vi.fn(),
    onToolStarted: vi.fn(),
    onToolFinished: vi.fn(),
    onParseError: vi.fn(),
    ...overrides,
  };
}

// ─── createAccumulator ───

describe("createAccumulator", () => {
  it("returns empty accumulator with all fields initialized", () => {
    const acc = createAccumulator();
    expect(acc.content).toBe("");
    expect(acc.flightData).toBeNull();
    expect(acc.accommodationData).toBeNull();
    expect(acc.preferencesData).toBeNull();
    expect(acc.quickReplies).toBeNull();
    expect(acc.destinationSuggestionRequest).toBeNull();
    expect(acc.intentClassification).toBeNull();
    expect(acc.reasoning).toBeNull();
    expect(acc.flightSearchTrigger).toBe(false);
  });
});

// ─── processSSELine ───

describe("processSSELine", () => {
  it("returns true for [DONE] sentinel", () => {
    const acc = createAccumulator();
    expect(processSSELine("[DONE]", noopHandlers, acc)).toBe(true);
  });

  it("accumulates content chunks", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();
    processSSELine(JSON.stringify({ type: "content", content: "Bonjour" }), handlers, acc);
    expect(acc.content).toBe("Bonjour");
    expect(handlers.onContent).toHaveBeenCalledWith("Bonjour");

    processSSELine(JSON.stringify({ type: "content", content: " monde" }), handlers, acc);
    expect(acc.content).toBe("Bonjour monde");
  });

  it("stores reasoning and creates derivedIntent when no intent exists", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();

    const reasoning = {
      understanding: "user wants preferences",
      contextAnalysis: "early stage",
      responseStrategy: "show widget",
      confidence: 0.85,
      widgetDecision: {
        shouldShow: true,
        widgetType: "preferenceInterests",
        reason: "user mentioned interests",
      },
    };

    processSSELine(JSON.stringify({ type: "reasoning", reasoning }), handlers, acc);

    // Reasoning stored
    expect(acc.reasoning).toEqual(reasoning);

    // DerivedIntent created
    expect(acc.intentClassification).not.toBeNull();
    expect(acc.intentClassification!.widgetToShow?.type).toBe("preferenceInterests");
    expect(acc.intentClassification!.confidence).toBe(0.85);

    // reasoningWidgetDecision preserved separately
    expect(acc.reasoningWidgetDecision).not.toBeNull();
    expect(acc.reasoningWidgetDecision!.widgetToShow?.type).toBe("preferenceInterests");

    // Handler called with both reasoning and derivedIntent
    expect(handlers.onReasoning).toHaveBeenCalledWith(reasoning, expect.objectContaining({
      widgetToShow: expect.objectContaining({ type: "preferenceInterests" }),
    }));
  });

  it("intentClassification overwrites derivedIntent but NOT reasoningWidgetDecision", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();

    // Step 1: reasoning arrives with widget decision
    processSSELine(JSON.stringify({
      type: "reasoning",
      reasoning: {
        understanding: "test",
        contextAnalysis: "test",
        responseStrategy: "test",
        confidence: 0.9,
        widgetDecision: { shouldShow: true, widgetType: "preferenceInterests", reason: "interests" },
      },
    }), handlers, acc);

    expect(acc.intentClassification!.widgetToShow?.type).toBe("preferenceInterests");
    expect(acc.reasoningWidgetDecision!.widgetToShow?.type).toBe("preferenceInterests");

    // Step 2: explicit intentClassification arrives WITHOUT widget
    processSSELine(JSON.stringify({
      type: "intentClassification",
      intentClassification: {
        primaryIntent: "provide_preferences",
        confidence: 0.8,
        entities: { interests: ["beach"] },
        // No widgetToShow!
      },
    }), handlers, acc);

    // intentClassification overwritten — no more widget
    expect(acc.intentClassification!.primaryIntent).toBe("provide_preferences");
    expect(acc.intentClassification!.widgetToShow).toBeUndefined();

    // reasoningWidgetDecision preserved!
    expect(acc.reasoningWidgetDecision).not.toBeNull();
    expect(acc.reasoningWidgetDecision!.widgetToShow?.type).toBe("preferenceInterests");
  });

  it("reasoning does NOT overwrite explicit intentClassification", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();

    // Step 1: intentClassification arrives first
    processSSELine(JSON.stringify({
      type: "intentClassification",
      intentClassification: {
        primaryIntent: "provide_destination",
        confidence: 0.95,
        entities: { destinationCity: "Tokyo" },
      },
    }), handlers, acc);

    // Step 2: reasoning arrives with widget decision
    processSSELine(JSON.stringify({
      type: "reasoning",
      reasoning: {
        understanding: "test",
        contextAnalysis: "test",
        responseStrategy: "test",
        confidence: 0.8,
        widgetDecision: { shouldShow: true, widgetType: "preferenceInterests", reason: "test" },
      },
    }), handlers, acc);

    // intentClassification NOT overwritten (already existed before reasoning)
    expect(acc.intentClassification!.primaryIntent).toBe("provide_destination");
    expect(acc.intentClassification!.entities?.destinationCity).toBe("Tokyo");

    // But reasoning widgetDecision IS still stored
    expect(acc.reasoningWidgetDecision).not.toBeNull();
    expect(acc.reasoningWidgetDecision!.widgetToShow?.type).toBe("preferenceInterests");
  });

  it("stores flight data", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();
    const fd = { from: "Paris", to: "Tokyo", departureDate: "2025-05-05" };

    processSSELine(JSON.stringify({ type: "flightData", flightData: fd }), handlers, acc);

    expect(acc.flightData).toEqual(fd);
    expect(handlers.onFlightData).toHaveBeenCalledWith(fd);
  });

  it("stores accommodation data", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();
    const data = { city: "Paris", stars: 4 };

    processSSELine(JSON.stringify({ type: "accommodationData", accommodationData: data }), handlers, acc);
    expect(acc.accommodationData).toEqual(data);
  });

  it("stores preferences data", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();
    const prefs = { travelStyle: "couple", pace: "moderate" };

    processSSELine(JSON.stringify({ type: "preferencesData", preferencesData: prefs }), handlers, acc);
    expect(acc.preferencesData).toEqual(prefs);
  });

  it("stores quick replies", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();
    const qr = { replies: [{ label: "Oui", emoji: "✅", message: "Oui" }] };

    processSSELine(JSON.stringify({ type: "quickReplies", quickReplies: qr }), handlers, acc);
    expect(acc.quickReplies).toEqual(qr);
  });

  it("stores destination suggestion request", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();
    const req = { requestedCount: 3 };

    processSSELine(JSON.stringify({ type: "destinationSuggestionRequest", destinationSuggestionRequest: req }), handlers, acc);
    expect(acc.destinationSuggestionRequest).toEqual(req);
  });

  it("sets flightSearchTrigger", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();

    processSSELine(JSON.stringify({ type: "flightSearchTrigger", trigger: true }), handlers, acc);
    expect(acc.flightSearchTrigger).toBe(true);
  });

  it("invokes tool handlers", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();

    processSSELine(JSON.stringify({ type: "tool_started", tool: "search_flights", reason: "test" }), handlers, acc);
    expect(handlers.onToolStarted).toHaveBeenCalledWith(expect.objectContaining({ tool: "search_flights" }));

    processSSELine(JSON.stringify({ type: "tool_finished", tool: "search_flights", success: true }), handlers, acc);
    expect(handlers.onToolFinished).toHaveBeenCalledWith(expect.objectContaining({ tool: "search_flights", success: true }));
  });

  it("calls onParseError for malformed JSON", () => {
    const acc = createAccumulator();
    const handlers = makeHandlers();

    processSSELine("{broken json", handlers, acc);
    expect(handlers.onParseError).toHaveBeenCalledWith("{broken json");
  });

  it("does not crash on malformed JSON", () => {
    const acc = createAccumulator();
    expect(() => processSSELine("not json at all", noopHandlers, acc)).not.toThrow();
  });
});

// ─── parseSSEChunk ───

describe("parseSSEChunk", () => {
  it("processes single data line", () => {
    const acc = createAccumulator();
    const result = parseSSEChunk(
      'data: {"type":"content","content":"hello"}\n\n',
      noopHandlers,
      acc,
    );
    expect(acc.content).toBe("hello");
    expect(result.done).toBe(false);
    expect(result.remainingBuffer).toBe("");
  });

  it("processes multiple data lines in one chunk", () => {
    const acc = createAccumulator();
    const chunk =
      'data: {"type":"content","content":"hello"}\n\n' +
      'data: {"type":"content","content":" world"}\n\n';

    parseSSEChunk(chunk, noopHandlers, acc);
    expect(acc.content).toBe("hello world");
  });

  it("returns done=true when [DONE] is received", () => {
    const acc = createAccumulator();
    const result = parseSSEChunk("data: [DONE]\n\n", noopHandlers, acc);
    expect(result.done).toBe(true);
  });

  it("ignores non-data lines", () => {
    const acc = createAccumulator();
    const chunk = 'event: message\ndata: {"type":"content","content":"test"}\n\n';
    parseSSEChunk(chunk, noopHandlers, acc);
    expect(acc.content).toBe("test");
  });

  it("buffers incomplete lines (SSE chunk split)", () => {
    const acc = createAccumulator();

    // Chunk 1: incomplete JSON line
    const result1 = parseSSEChunk(
      'data: {"type":"content","con',
      noopHandlers,
      acc,
    );
    expect(acc.content).toBe(""); // Nothing processed yet
    expect(result1.remainingBuffer).toBe('data: {"type":"content","con');

    // Chunk 2: completes the line
    const result2 = parseSSEChunk(
      'tent":"bonjour"}\n\ndata: [DONE]\n\n',
      noopHandlers,
      acc,
      result1.remainingBuffer,
    );
    expect(acc.content).toBe("bonjour");
    expect(result2.done).toBe(true);
  });

  it("handles empty chunks gracefully", () => {
    const acc = createAccumulator();
    const result = parseSSEChunk("", noopHandlers, acc);
    expect(result.done).toBe(false);
    expect(result.remainingBuffer).toBe("");
    expect(acc.content).toBe("");
  });

  it("carries buffer across multiple partial chunks", () => {
    const acc = createAccumulator();

    const r1 = parseSSEChunk('data: {"ty', noopHandlers, acc);
    expect(r1.remainingBuffer).toBe('data: {"ty');

    const r2 = parseSSEChunk('pe":"content",', noopHandlers, acc, r1.remainingBuffer);
    expect(r2.remainingBuffer).toBe('data: {"type":"content",');

    const r3 = parseSSEChunk('"content":"hi"}\n\n', noopHandlers, acc, r2.remainingBuffer);
    expect(acc.content).toBe("hi");
    expect(r3.remainingBuffer).toBe("");
  });
});
