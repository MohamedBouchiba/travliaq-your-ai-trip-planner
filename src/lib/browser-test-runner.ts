/**
 * Mini test framework for running tests in the browser.
 * Provides describe/it/expect API similar to vitest.
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export interface SuiteResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

type TestFn = () => void | Promise<void>;

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) =>
    deepEqual(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k]
    )
  );
}

function createExpect(actual: unknown) {
  const assert = {
    toBe(expected: unknown) {
      if (actual !== expected)
        throw new AssertionError(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected: unknown) {
      if (!deepEqual(actual, expected))
        throw new AssertionError(`Expected deep equal ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeNull() {
      if (actual !== null)
        throw new AssertionError(`Expected null, got ${JSON.stringify(actual)}`);
    },
    toBeUndefined() {
      if (actual !== undefined)
        throw new AssertionError(`Expected undefined, got ${JSON.stringify(actual)}`);
    },
    toBeInstanceOf(cls: Function) {
      if (!(actual instanceof (cls as any)))
        throw new AssertionError(`Expected instance of ${cls.name}`);
    },
    toContain(sub: string) {
      if (typeof actual !== "string" || !actual.includes(sub))
        throw new AssertionError(`Expected "${actual}" to contain "${sub}"`);
    },
    toBeCloseTo(expected: number, precision = 2) {
      const pow = Math.pow(10, -precision) / 2;
      if (Math.abs((actual as number) - expected) >= pow)
        throw new AssertionError(`Expected ${actual} to be close to ${expected}`);
    },
    toHaveProperty(key: string, value?: unknown) {
      if (actual == null || typeof actual !== "object" || !(key in (actual as any)))
        throw new AssertionError(`Expected property "${key}"`);
      if (value !== undefined && (actual as any)[key] !== value)
        throw new AssertionError(`Expected property "${key}" to be ${JSON.stringify(value)}, got ${JSON.stringify((actual as any)[key])}`);
    },
    not: {
      toBeNull() {
        if (actual === null)
          throw new AssertionError(`Expected not null`);
      },
      toThrow() {
        if (typeof actual !== "function") throw new AssertionError("Expected a function");
        try {
          (actual as Function)();
        } catch {
          throw new AssertionError("Expected not to throw");
        }
      },
      toContain(sub: string) {
        if (typeof actual === "string" && actual.includes(sub))
          throw new AssertionError(`Expected "${actual}" NOT to contain "${sub}"`);
      },
    },
    toThrow(message?: string) {
      if (typeof actual !== "function") throw new AssertionError("Expected a function");
      try {
        (actual as Function)();
        throw new AssertionError("Expected to throw but did not");
      } catch (e: any) {
        if (e instanceof AssertionError) throw e;
        if (message && !e.message?.includes(message))
          throw new AssertionError(`Expected error message to contain "${message}", got "${e.message}"`);
      }
    },
  };
  return assert;
}

interface TestEntry {
  suiteName: string;
  testName: string;
  fn: TestFn;
}

let _entries: TestEntry[] = [];
let _currentSuite = "";

export function describe(name: string, fn: () => void) {
  const prev = _currentSuite;
  _currentSuite = prev ? `${prev} > ${name}` : name;
  fn();
  _currentSuite = prev;
}

export function it(name: string, fn: TestFn) {
  _entries.push({ suiteName: _currentSuite, testName: name, fn });
}

export const expect = createExpect as unknown as (actual: unknown) => ReturnType<typeof createExpect>;

// Override expect to create fresh instance each call
export { createExpect };

export async function runAllTests(
  onProgress?: (result: TestResult, index: number, total: number) => void
): Promise<SuiteResult[]> {
  const suiteMap = new Map<string, TestResult[]>();
  const total = _entries.length;

  for (let i = 0; i < _entries.length; i++) {
    const entry = _entries[i];
    const start = performance.now();
    let passed = true;
    let error: string | undefined;

    try {
      // Re-bind expect for this test
      const origExpect = (globalThis as any).__browserExpect;
      (globalThis as any).__browserExpect = createExpect;
      await entry.fn();
      (globalThis as any).__browserExpect = origExpect;
    } catch (e: any) {
      passed = false;
      error = e.message || String(e);
    }

    const result: TestResult = {
      name: `${entry.suiteName} > ${entry.testName}`,
      passed,
      error,
      duration: performance.now() - start,
    };

    if (!suiteMap.has(entry.suiteName)) suiteMap.set(entry.suiteName, []);
    suiteMap.get(entry.suiteName)!.push(result);

    onProgress?.(result, i, total);
  }

  const suites: SuiteResult[] = [];
  for (const [name, tests] of suiteMap) {
    suites.push({
      name,
      tests,
      passed: tests.filter((t) => t.passed).length,
      failed: tests.filter((t) => !t.passed).length,
      duration: tests.reduce((a, t) => a + t.duration, 0),
    });
  }

  return suites;
}

export function clearTests() {
  _entries = [];
  _currentSuite = "";
}

// Re-export for test suites
export const test = it;
