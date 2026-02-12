/**
 * Circuit Breaker for SSE streaming
 *
 * Prevents hammering the server when it's down.
 * States: CLOSED (normal) → OPEN (blocked) → HALF_OPEN (testing)
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
};

export interface CircuitBreaker {
  canRequest: () => boolean;
  recordSuccess: () => void;
  recordFailure: () => void;
  getState: () => CircuitState;
  reset: () => void;
}

export function createCircuitBreaker(
  config: Partial<CircuitBreakerConfig> = {},
): CircuitBreaker {
  const { failureThreshold, resetTimeoutMs } = { ...DEFAULT_CONFIG, ...config };

  let state: CircuitState = "CLOSED";
  let failures = 0;
  let lastFailureTime = 0;

  function canRequest(): boolean {
    if (state === "CLOSED") return true;

    if (state === "OPEN") {
      // Check if enough time has passed to try again
      if (Date.now() - lastFailureTime >= resetTimeoutMs) {
        state = "HALF_OPEN";
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow exactly one request to test
    return true;
  }

  function recordSuccess(): void {
    failures = 0;
    state = "CLOSED";
  }

  function recordFailure(): void {
    failures += 1;
    lastFailureTime = Date.now();

    if (state === "HALF_OPEN" || failures >= failureThreshold) {
      state = "OPEN";
    }
  }

  function getState(): CircuitState {
    // Re-evaluate OPEN → HALF_OPEN on state check
    if (state === "OPEN" && Date.now() - lastFailureTime >= resetTimeoutMs) {
      state = "HALF_OPEN";
    }
    return state;
  }

  function reset(): void {
    state = "CLOSED";
    failures = 0;
    lastFailureTime = 0;
  }

  return { canRequest, recordSuccess, recordFailure, getState, reset };
}
