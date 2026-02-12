/**
 * usePerformance - Performance optimization hooks
 *
 * Provides hooks for:
 * - Debouncing user input
 * - Throttling frequent events
 * - Stable callback references
 * - Lazy initialization
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/**
 * useDebounce - Debounce a value
 *
 * Delays updating a value until after a specified delay has passed
 * since the last change. Useful for search inputs, filters, etc.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   // Only called 300ms after user stops typing
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounce a callback function
 *
 * Returns a debounced version of the callback that only executes
 * after the specified delay has passed since the last call.
 *
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   fetchResults(query);
 * }, 300);
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * useThrottle - Throttle a value
 *
 * Limits how often a value can update. Useful for scroll position,
 * window size, etc.
 *
 * @example
 * ```tsx
 * const [scrollY, setScrollY] = useState(0);
 * const throttledScrollY = useThrottle(scrollY, 100);
 *
 * // throttledScrollY only updates at most every 100ms
 * ```
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now - lastUpdated.current >= interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useThrottledCallback - Throttle a callback function
 *
 * Returns a throttled version of the callback that only executes
 * at most once per interval.
 *
 * @example
 * ```tsx
 * const handleScroll = useThrottledCallback(() => {
 *   updateScrollPosition(window.scrollY);
 * }, 100);
 *
 * useEffect(() => {
 *   window.addEventListener("scroll", handleScroll);
 *   return () => window.removeEventListener("scroll", handleScroll);
 * }, [handleScroll]);
 * ```
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  interval: number
): (...args: Parameters<T>) => void {
  const lastExecuted = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastExecution = now - lastExecuted.current;

      if (timeSinceLastExecution >= interval) {
        lastExecuted.current = now;
        callbackRef.current(...args);
      } else if (!timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          lastExecuted.current = Date.now();
          timeoutRef.current = null;
          callbackRef.current(...args);
        }, interval - timeSinceLastExecution);
      }
    },
    [interval]
  );
}

/**
 * useStableCallback - Create a stable callback reference
 *
 * Returns a callback that always has the same reference but
 * calls the latest version of the provided callback.
 * Useful for event handlers passed to memoized components.
 *
 * @example
 * ```tsx
 * // onClick will always be the same reference
 * const onClick = useStableCallback(() => {
 *   console.log(latestValue); // Always uses latest value
 * });
 *
 * // MemoizedComponent won't re-render due to onClick changes
 * <MemoizedComponent onClick={onClick} />
 * ```
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  // Update ref on each render
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Return stable callback that calls latest ref
  return useCallback(
    ((...args: Parameters<T>) => {
      return callbackRef.current(...args);
    }) as T,
    []
  );
}

/**
 * useLazyInit - Lazy initialization for expensive computations
 *
 * Only computes the value once, on first access.
 * Unlike useMemo, this guarantees the computation only runs once.
 *
 * @example
 * ```tsx
 * const expensiveData = useLazyInit(() => {
 *   return computeExpensiveData();
 * });
 * ```
 */
export function useLazyInit<T>(factory: () => T): T {
  const initialized = useRef(false);
  const value = useRef<T | undefined>(undefined);

  if (!initialized.current) {
    value.current = factory();
    initialized.current = true;
  }

  return value.current as T;
}

/**
 * usePrevious - Get the previous value of a variable
 *
 * Useful for comparing current and previous values in effects.
 *
 * @example
 * ```tsx
 * const prevCount = usePrevious(count);
 *
 * useEffect(() => {
 *   if (prevCount !== undefined && count > prevCount) {
 *     console.log("Count increased!");
 *   }
 * }, [count, prevCount]);
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * useUpdateEffect - Effect that skips the first render
 *
 * Like useEffect but doesn't run on mount.
 *
 * @example
 * ```tsx
 * useUpdateEffect(() => {
 *   // Only runs when 'value' changes, not on mount
 *   console.log("Value changed to", value);
 * }, [value]);
 * ```
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps?: React.DependencyList
): void {
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * useIsMounted - Check if component is still mounted
 *
 * Useful for preventing state updates after unmount in async operations.
 *
 * @example
 * ```tsx
 * const isMounted = useIsMounted();
 *
 * const fetchData = async () => {
 *   const data = await api.getData();
 *   if (isMounted()) {
 *     setData(data);
 *   }
 * };
 * ```
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * useRenderCount - Track render count (development only)
 *
 * Useful for debugging performance issues.
 *
 * @example
 * ```tsx
 * const renderCount = useRenderCount("MyComponent");
 * // Logs: "MyComponent rendered 5 times"
 * ```
 */
export function useRenderCount(componentName?: string): number {
  const count = useRef(0);
  count.current += 1;

  if (import.meta.env.DEV && componentName) {
    console.log(`${componentName} rendered ${count.current} times`);
  }

  return count.current;
}

/**
 * Comparison function type for useMemoCompare
 */
type CompareFunction<T> = (prev: T | undefined, next: T) => boolean;

/**
 * useMemoCompare - Memoize with custom comparison
 *
 * Like useMemo but with a custom comparison function.
 * Only recomputes if the comparison function returns false.
 *
 * @example
 * ```tsx
 * const memoizedItems = useMemoCompare(
 *   items,
 *   (prev, next) => prev?.length === next.length
 * );
 * ```
 */
export function useMemoCompare<T>(value: T, compare: CompareFunction<T>): T {
  const ref = useRef<T | undefined>(undefined);

  const isEqual = ref.current !== undefined && compare(ref.current, value);

  useEffect(() => {
    if (!isEqual) {
      ref.current = value;
    }
  });

  return isEqual ? (ref.current as T) : value;
}

export default {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useThrottledCallback,
  useStableCallback,
  useLazyInit,
  usePrevious,
  useUpdateEffect,
  useIsMounted,
  useRenderCount,
  useMemoCompare,
};
