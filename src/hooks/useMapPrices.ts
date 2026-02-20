import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MapPrice {
  price: number;
  date: string;
}

export interface MapPricesResult {
  [iata: string]: MapPrice | null;
}

interface UseMapPricesOptions {
  enabled?: boolean;
  debounceMs?: number;
}

interface UseMapPricesResult {
  prices: MapPricesResult;
  isLoading: boolean;
  error: string | null;
  fetchPrices: (origins: string[], destinations: string[]) => void;
  /** Returns destinations that are NOT in cache, NOT pending, and NOT already known */
  getMissingDestinations: (origins: string[], destinations: string[]) => string[];
  /** Force version increment to trigger re-renders */
  priceVersion: number;
  /** Clear cache for specific destinations or all */
  clearCache: (destinations?: string[]) => void;
}

// Constants
// Keep backward compatibility across versions to avoid "lost cache" after refresh/deploy
import { STORAGE_KEYS as SK } from "@/config/storageKeys";
const PRICE_CACHE_KEYS = [SK.PRICE_CACHE, SK.PRICE_CACHE_V2];
const STORAGE_KEY = PRICE_CACHE_KEYS[0];
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours for ALL prices (including null - no flight available)
const MAX_CACHE_ENTRIES = 500;

// Cache with TTL - persists across component remounts
// Key is sorted origins + destination to ensure stability
interface CacheEntry {
  data: MapPrice | null;
  timestamp: number;
}

const pricesCache = new Map<string, CacheEntry>();
let cacheLoaded = false;

// Track pending destinations to avoid duplicate requests
const pendingRequests = new Set<string>();

function normalizeIata(iata: string): string {
  return (iata || "").trim().toUpperCase();
}

function normalizeIatas(list: string[]): string[] {
  return (list || []).map(normalizeIata).filter(Boolean);
}

function getCacheKey(origins: string[], destination: string): string {
  const o = normalizeIatas(origins).sort();
  const d = normalizeIata(destination);
  return `${o.join(',')}-${d}`;
}

function getOriginsKey(origins: string[]): string {
  return normalizeIatas(origins).sort().join(',');
}

// Get TTL - same for all (null = no flight, we remember that)
function getTTL(): number {
  return CACHE_TTL;
}

// Load cache from localStorage
function loadCacheFromStorage(): void {
  if (cacheLoaded) return;
  cacheLoaded = true;

  try {
    // Try newest key first, then fall back to older keys
    let stored: string | null = null;
    for (const key of PRICE_CACHE_KEYS) {
      stored = localStorage.getItem(key);
      if (stored) break;
    }
    if (!stored) return;

    const parsed = JSON.parse(stored) as Record<string, CacheEntry>;
    const now = Date.now();
    let validCount = 0;

    for (const [key, entry] of Object.entries(parsed)) {
      if (now - entry.timestamp < CACHE_TTL) {
        pricesCache.set(key, entry);
        validCount++;
      }
    }

    console.log(`[useMapPrices] Loaded ${validCount} cached prices from localStorage`);
  } catch (err) {
    console.warn('[useMapPrices] Failed to load cache from localStorage:', err);
  }
}

// Save cache to localStorage
function saveCacheToStorage(): void {
  try {
    // Clean up expired entries and limit size
    const now = Date.now();
    const entries: [string, CacheEntry][] = [];
    
    pricesCache.forEach((entry, key) => {
      if (now - entry.timestamp < CACHE_TTL) {
        entries.push([key, entry]);
      }
    });
    
    // Sort by timestamp (newest first) and limit
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    const limitedEntries = entries.slice(0, MAX_CACHE_ENTRIES);
    
    const obj = Object.fromEntries(limitedEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn('[useMapPrices] Failed to save cache to localStorage:', err);
  }
}

// Debounced save to avoid excessive writes
let saveTimeout: NodeJS.Timeout | null = null;
function debouncedSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveCacheToStorage, 2000);
}

export function useMapPrices(options: UseMapPricesOptions = {}): UseMapPricesResult {
  const { enabled = true, debounceMs = 800 } = options;
  
  // Load cache on first mount
  useEffect(() => {
    loadCacheFromStorage();
  }, []);
  
  // Use ref to accumulate prices (never reset, only update)
  const pricesRef = useRef<MapPricesResult>({});
  const [prices, setPrices] = useState<MapPricesResult>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceVersion, setPriceVersion] = useState(0);
  
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const lastOriginsKey = useRef<string>('');

  /**
   * Clear cache for specific destinations or all
   */
  const clearCache = useCallback((destinations?: string[]) => {
    if (!destinations) {
      pricesCache.clear();
      pricesRef.current = {};
      setPrices({});
      PRICE_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
      console.log('[useMapPrices] Cleared all cache');
    } else {
      // Clear specific destinations for all origins
      const keysToDelete: string[] = [];
      pricesCache.forEach((_, key) => {
        const dest = key.split('-').pop();
        if (dest && destinations.includes(dest)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => pricesCache.delete(key));

      destinations.forEach((dest) => {
        delete pricesRef.current[dest];
      });
      setPrices({ ...pricesRef.current });
      debouncedSave();
      console.log(`[useMapPrices] Cleared cache for ${destinations.length} destinations`);
    }
    setPriceVersion((v) => v + 1);
  }, []);

  /**
   * Returns destinations that need to be fetched:
   * - Not in global cache (or cache expired)
   * - Not already in pricesRef (current session)
   * - Not currently pending
   */
  const getMissingDestinations = useCallback((origins: string[], destinations: string[]): string[] => {
    if (origins.length === 0) return [];

    const now = Date.now();
    const originsKey = getOriginsKey(origins);
    const currentOriginsKey = lastOriginsKey.current;

    // If origins changed, everything is "missing"
    const originsChanged = originsKey !== currentOriginsKey && currentOriginsKey !== '';

    // IMPORTANT: hydrate session state from cache so that a "100% cache hit"
    // does not leave the UI stuck in "…" forever.
    let hydratedAny = false;

    const missing = destinations.filter((dest) => {
      // If origins just changed, we need all destinations
      if (originsChanged) return true;

      const cacheKey = getCacheKey(origins, dest);

      // Check global cache (6h TTL for ALL prices including null)
      const cached = pricesCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL) {
        if (pricesRef.current[dest] === undefined) {
          pricesRef.current[dest] = cached.data;
          hydratedAny = true;
        }
        return false; // Valid cache hit - don't re-request
      }

      // Check session-level prices
      if (pricesRef.current[dest] !== undefined) {
        return false; // Already known this session
      }

      // Check pending requests
      if (pendingRequests.has(cacheKey)) {
        return false; // Already being fetched
      }

      return true; // Need to fetch
    });

    if (hydratedAny) {
      setPrices({ ...pricesRef.current });
      setPriceVersion((v) => v + 1);
    }

    return missing;
  }, []);

  // Track pending fetch destinations to avoid resetting debounce unnecessarily
  const pendingFetchDestsRef = useRef<Set<string>>(new Set());

  const fetchPrices = useCallback((origins: string[], destinations: string[]) => {
    console.log(`[useMapPrices] fetchPrices called: enabled=${enabled}, origins=${origins.length}, destinations=${destinations.length}`);
    if (!enabled || origins.length === 0 || destinations.length === 0) {
      return;
    }

    const normalizedOrigins = normalizeIatas(origins);
    const normalizedDestinations = normalizeIatas(destinations);

    const originsKey = getOriginsKey(normalizedOrigins);

    // If origins changed, clear the accumulated prices
    if (originsKey !== lastOriginsKey.current) {
      console.log(`[useMapPrices] Origins changed: ${lastOriginsKey.current} -> ${originsKey}, resetting prices`);
      pricesRef.current = {};
      lastOriginsKey.current = originsKey;
    }

    // Check if we will actually fetch anything
    const now = Date.now();
    const uncachedDestinations: string[] = [];
    let hydratedFromCache = false;

    for (const dest of normalizedDestinations) {
      const cacheKey = getCacheKey(normalizedOrigins, dest);
      const cached = pricesCache.get(cacheKey);

      if (cached && now - cached.timestamp < CACHE_TTL) {
        // Hydrate from cache immediately (includes null = no flight)
        if (pricesRef.current[dest] === undefined || pricesRef.current[dest] !== cached.data) {
          pricesRef.current[dest] = cached.data;
          hydratedFromCache = true;
        }
        continue;
      }

      if (pricesRef.current[dest] !== undefined) continue;
      if (pendingRequests.has(cacheKey)) continue;

      uncachedDestinations.push(dest);
    }

    // Only update state if new values were actually hydrated from cache
    if (hydratedFromCache) {
      setPrices({ ...pricesRef.current });
    }

    // If nothing to fetch, done
    if (uncachedDestinations.length === 0) {
      console.log(`[useMapPrices] All ${destinations.length} destinations cached/known`);
      setIsLoading(false);
      return;
    }

    // Check if new uncached destinations are already covered by the pending debounce
    const newUncached = uncachedDestinations.filter(d => !pendingFetchDestsRef.current.has(d));
    if (newUncached.length === 0 && debounceTimeout.current) {
      console.log(`[useMapPrices] All ${uncachedDestinations.length} uncached destinations already pending, skipping debounce reset`);
      return;
    }

    // Clear previous debounce since we have new destinations
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Track what's pending in the new debounce
    uncachedDestinations.forEach(d => pendingFetchDestsRef.current.add(d));

    // We will fetch, set loading
    console.log(`[useMapPrices] Will fetch ${uncachedDestinations.length} destinations after debounce (${newUncached.length} new)`);
    setIsLoading(true);
    setError(null);

    debounceTimeout.current = setTimeout(async () => {
      // Clear pending tracking
      pendingFetchDestsRef.current.clear();
      // Mark destinations as pending
      const pendingKeys = uncachedDestinations.map(dest => getCacheKey(origins, dest));
      pendingKeys.forEach(key => pendingRequests.add(key));

      // Abort previous request
      if (abortController.current) {
        abortController.current.abort();
      }
      abortController.current = new AbortController();

      try {
        // Batch in chunks of 50
        const chunks: string[][] = [];
        for (let i = 0; i < uncachedDestinations.length; i += 50) {
          chunks.push(uncachedDestinations.slice(i, i + 50));
        }

        console.log(`[useMapPrices] Fetching ${uncachedDestinations.length} prices in ${chunks.length} chunk(s)`);

        for (const chunk of chunks) {
          const { data, error: fnError } = await supabase.functions.invoke('map-prices', {
            body: {
              origins,
              destinations: chunk,
              adults: 1,
              currency: 'EUR'
            }
          });

          if (fnError) {
            throw new Error(fnError.message);
          }

          if (data?.success && data?.prices) {
            const responseTime = Date.now();
            let pricesReceived = 0;

            // Track which destinations we actually received from the function
            const receivedSet = new Set<string>();

            for (const [iata, priceData] of Object.entries(data.prices)) {
              receivedSet.add(iata);
              const price = priceData as MapPrice | null;

              // Update accumulated prices
              pricesRef.current[iata] = price;

              // Update cache with fresh timestamp
              const cacheKey = getCacheKey(origins, iata);
              pricesCache.set(cacheKey, {
                data: price,
                timestamp: responseTime,
              });

              // Remove from pending
              pendingRequests.delete(cacheKey);
              pricesReceived++;
            }

            // IMPORTANT: if the function omitted some requested destinations,
            // mark them as null (no price) to avoid infinite "…".
            for (const requestedDest of chunk) {
              if (receivedSet.has(requestedDest)) continue;
              if (pricesRef.current[requestedDest] !== undefined) continue;

              pricesRef.current[requestedDest] = null;
              const cacheKey = getCacheKey(origins, requestedDest);
              pricesCache.set(cacheKey, {
                data: null,
                timestamp: responseTime,
              });
              pendingRequests.delete(cacheKey);
            }

            console.log(`[useMapPrices] Cached ${pricesReceived} prices (TTL: 6h for all)`);
          }
        }

        // Trigger re-render with new version
        setPriceVersion(v => v + 1);
        setPrices({ ...pricesRef.current });
        
        // Save to localStorage
        debouncedSave();
      } catch (err) {
        // Clear pending on error
        pendingKeys.forEach(key => pendingRequests.delete(key));
        
        if ((err as Error).name !== 'AbortError') {
          console.error('[useMapPrices] Error fetching prices:', err);
          setError((err as Error).message);
        }
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [enabled, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return { prices, isLoading, error, fetchPrices, getMissingDestinations, priceVersion, clearCache };
}
