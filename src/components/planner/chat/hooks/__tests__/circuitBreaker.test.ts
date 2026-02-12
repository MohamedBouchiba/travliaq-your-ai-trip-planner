import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCircuitBreaker } from "../circuitBreaker";

describe("createCircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in CLOSED state", () => {
    const cb = createCircuitBreaker();
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("stays CLOSED after fewer failures than threshold", () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("transitions to OPEN after reaching failure threshold", () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
    expect(cb.canRequest()).toBe(false);
  });

  it("blocks requests when OPEN", () => {
    const cb = createCircuitBreaker({ failureThreshold: 2 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.canRequest()).toBe(false);
  });

  it("transitions to HALF_OPEN after resetTimeout", () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 5000 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");

    vi.advanceTimersByTime(5000);
    expect(cb.getState()).toBe("HALF_OPEN");
    expect(cb.canRequest()).toBe(true);
  });

  it("returns to CLOSED after success in HALF_OPEN", () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();

    vi.advanceTimersByTime(1000);
    expect(cb.canRequest()).toBe(true); // HALF_OPEN

    cb.recordSuccess();
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("returns to OPEN after failure in HALF_OPEN", () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();

    vi.advanceTimersByTime(1000);
    expect(cb.canRequest()).toBe(true); // HALF_OPEN

    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
    expect(cb.canRequest()).toBe(false);
  });

  it("resets failure count on success", () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    // After success, count resets; 2 more failures should not open
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("CLOSED");
    // Third failure opens it
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
  });

  it("reset() returns to initial state", () => {
    const cb = createCircuitBreaker({ failureThreshold: 2 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");

    cb.reset();
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.canRequest()).toBe(true);
  });

  it("canRequest() also transitions OPEN to HALF_OPEN after timeout", () => {
    const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 2000 });
    cb.recordFailure();
    expect(cb.canRequest()).toBe(false);

    vi.advanceTimersByTime(2000);
    // canRequest should detect timeout and allow the request
    expect(cb.canRequest()).toBe(true);
  });

  it("uses default config values", () => {
    const cb = createCircuitBreaker();
    // Default: failureThreshold=3, resetTimeoutMs=30000
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe("CLOSED");
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");

    vi.advanceTimersByTime(29999);
    expect(cb.canRequest()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(cb.canRequest()).toBe(true);
  });

  it("allows multiple OPEN→HALF_OPEN→OPEN cycles", () => {
    const cb = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });

    // Cycle 1
    cb.recordFailure();
    expect(cb.getState()).toBe("OPEN");
    vi.advanceTimersByTime(100);
    expect(cb.canRequest()).toBe(true);
    cb.recordFailure(); // fails in HALF_OPEN
    expect(cb.getState()).toBe("OPEN");

    // Cycle 2
    vi.advanceTimersByTime(100);
    expect(cb.canRequest()).toBe(true);
    cb.recordSuccess(); // succeeds in HALF_OPEN
    expect(cb.getState()).toBe("CLOSED");
  });
});
