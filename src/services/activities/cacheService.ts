/**
 * Activity Cache Service
 *
 * Manages local cache for activity search results
 * Respects API's Redis cache TTL (7 days)
 */

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Activity Cache Service
 */
export const activityCacheService = {
  /**
   * Cache TTL (7 days to match API)
   */
  CACHE_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds

  /**
   * Cache key prefix
   */
  CACHE_PREFIX: 'travliaq_activity',

  /**
   * Generate cache key from type and params
   *
   * @param type Cache type (search, details, tags, etc.)
   * @param params Parameters object
   * @returns Cache key string
   */
  getCacheKey(type: string, params: any): string {
    // Create deterministic key from params
    const paramString = JSON.stringify(this.sortObject(params));
    return `${this.CACHE_PREFIX}_${type}_${this.hashString(paramString)}`;
  },

  /**
   * Get data from cache
   *
   * @param type Cache type
   * @param params Parameters
   * @returns Cached data or null if not found/expired
   */
  get<T>(type: string, params: any): T | null {
    try {
      const key = this.getCacheKey(type, params);
      const cached = localStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      // Check if cache is still valid
      if (age > entry.ttl) {
        // Expired - remove from cache
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set data in cache
   *
   * @param type Cache type
   * @param params Parameters
   * @param data Data to cache
   * @param ttl TTL in milliseconds (default: 7 days)
   */
  set<T>(type: string, params: any, data: T, ttl: number = this.CACHE_TTL): void {
    try {
      const key = this.getCacheKey(type, params);

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set error:', error);

      // If quota exceeded, clear old cache entries
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanup();
        // Try again
        try {
          const key = this.getCacheKey(type, params);
          localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), ttl }));
        } catch {
          console.warn('Cache still full after cleanup');
        }
      }
    }
  },

  /**
   * Clear cache for specific type
   *
   * @param type Cache type (optional - clears all if not specified)
   */
  clear(type?: string): void {
    try {
      const prefix = type
        ? `${this.CACHE_PREFIX}_${type}_`
        : `${this.CACHE_PREFIX}_`;

      const keys = Object.keys(localStorage);

      keys.forEach((key) => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });

      console.log(`Cache cleared: ${type || 'all'}`);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  /**
   * Cleanup expired cache entries
   */
  cleanup(): void {
    try {
      const keys = Object.keys(localStorage);
      let removed = 0;

      keys.forEach((key) => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key);
            if (!cached) return;

            const entry: CacheEntry<any> = JSON.parse(cached);
            const age = Date.now() - entry.timestamp;

            if (age > entry.ttl) {
              localStorage.removeItem(key);
              removed++;
            }
          } catch {
            // Invalid entry - remove it
            localStorage.removeItem(key);
            removed++;
          }
        }
      });

      console.log(`Cache cleanup: removed ${removed} entries`);
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  },

  /**
   * Get cache statistics
   *
   * @returns Cache stats
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const keys = Object.keys(localStorage);
    let totalSize = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    let count = 0;

    keys.forEach((key) => {
      if (key.startsWith(this.CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          count++;

          try {
            const entry: CacheEntry<any> = JSON.parse(value);
            if (entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
            }
            if (entry.timestamp > newestTimestamp) {
              newestTimestamp = entry.timestamp;
            }
          } catch {
            // Ignore invalid entries
          }
        }
      }
    });

    return {
      totalEntries: count,
      totalSize, // bytes
      oldestEntry: oldestTimestamp !== Infinity ? new Date(oldestTimestamp) : null,
      newestEntry: newestTimestamp !== 0 ? new Date(newestTimestamp) : null,
    };
  },

  /**
   * Sort object keys recursively for consistent hashing
   *
   * @param obj Object to sort
   * @returns Sorted object
   */
  sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(this.sortObject.bind(this));
    }

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObject(obj[key]);
      });

    return sorted;
  },

  /**
   * Simple hash function for strings
   *
   * @param str String to hash
   * @returns Hash string
   */
  hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  },

  /**
   * Check if cache is available (localStorage accessible)
   *
   * @returns true if cache is available
   */
  isAvailable(): boolean {
    try {
      const test = '__cache_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
};

// Auto-cleanup on module load (remove expired entries)
if (typeof window !== 'undefined') {
  activityCacheService.cleanup();
}

export default activityCacheService;
