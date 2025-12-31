/**
 * Memory Versioning System
 * 
 * Centralized versioning and migration system for localStorage data.
 * Ensures safe schema evolution across app updates.
 */

// ===== Version Constants =====

export const MEMORY_VERSIONS = {
  flight: 1,
  travel: 1,
  accommodation: 1,
} as const;

export type MemoryKey = keyof typeof MEMORY_VERSIONS;

// ===== Storage Keys =====

export const STORAGE_KEYS = {
  flight: "travliaq_flight_memory",
  travel: "travliaq_travel_memory",
  accommodation: "travliaq_accommodation_memory",
  versions: "travliaq_memory_versions",
} as const;

// ===== Migration Types =====

export interface MigrationPayload<T = unknown> {
  data: T;
  fromVersion: number;
  toVersion: number;
}

export type MigrationFn<T = unknown> = (payload: MigrationPayload<T>) => T;

export interface MigrationRegistry {
  [version: number]: MigrationFn;
}

// ===== Migration Registries =====

/**
 * Flight memory migrations.
 * Add new migrations here when schema changes.
 */
export const flightMigrations: MigrationRegistry = {
  // Example: Migration from v0 to v1
  // 1: ({ data }) => ({
  //   ...data,
  //   newField: "default",
  // }),
};

/**
 * Travel memory migrations.
 */
export const travelMigrations: MigrationRegistry = {};

/**
 * Accommodation memory migrations.
 */
export const accommodationMigrations: MigrationRegistry = {};

// ===== Core Functions =====

/**
 * Get stored versions for all memory types.
 */
export function getStoredVersions(): Record<MemoryKey, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.versions);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn("[MemoryVersioning] Failed to parse stored versions");
  }
  
  // Default to version 0 (no migrations applied)
  return {
    flight: 0,
    travel: 0,
    accommodation: 0,
  };
}

/**
 * Save current versions to localStorage.
 */
export function saveVersions(versions: Record<MemoryKey, number>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.versions, JSON.stringify(versions));
  } catch (error) {
    console.error("[MemoryVersioning] Failed to save versions:", error);
  }
}

/**
 * Apply migrations to data.
 * Runs all migrations from fromVersion to toVersion in sequence.
 */
export function applyMigrations<T>(
  data: T,
  fromVersion: number,
  toVersion: number,
  migrations: MigrationRegistry
): T {
  let result = data;
  
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const migration = migrations[v];
    if (migration) {
      console.log(`[MemoryVersioning] Applying migration v${v - 1} → v${v}`);
      result = migration({ data: result, fromVersion: v - 1, toVersion: v }) as T;
    }
  }
  
  return result;
}

/**
 * Load data from localStorage with automatic migrations.
 */
export function loadWithMigration<T>(
  key: MemoryKey,
  storageKey: string,
  currentVersion: number,
  migrations: MigrationRegistry,
  deserialize: (stored: string) => T,
  defaultValue: T
): T {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return defaultValue;
    
    const data = deserialize(stored);
    const versions = getStoredVersions();
    const storedVersion = versions[key] || 0;
    
    if (storedVersion < currentVersion) {
      // Apply migrations
      const migrated = applyMigrations(data, storedVersion, currentVersion, migrations);
      
      // Update stored version
      versions[key] = currentVersion;
      saveVersions(versions);
      
      return migrated;
    }
    
    return data;
  } catch (error) {
    console.error(`[MemoryVersioning] Failed to load ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Save data to localStorage and update version.
 */
export function saveWithVersion<T>(
  key: MemoryKey,
  storageKey: string,
  data: T,
  serialize: (data: T) => string
): void {
  try {
    localStorage.setItem(storageKey, serialize(data));
    
    // Ensure version is up to date
    const versions = getStoredVersions();
    if (versions[key] !== MEMORY_VERSIONS[key]) {
      versions[key] = MEMORY_VERSIONS[key];
      saveVersions(versions);
    }
  } catch (error) {
    console.error(`[MemoryVersioning] Failed to save ${key}:`, error);
  }
}

/**
 * Check if any migration is needed.
 * Useful for showing migration progress UI.
 */
export function checkMigrationsNeeded(): {
  needed: boolean;
  details: Array<{ key: MemoryKey; from: number; to: number }>;
} {
  const storedVersions = getStoredVersions();
  const details: Array<{ key: MemoryKey; from: number; to: number }> = [];
  
  for (const key of Object.keys(MEMORY_VERSIONS) as MemoryKey[]) {
    const storedVersion = storedVersions[key] || 0;
    const currentVersion = MEMORY_VERSIONS[key];
    
    if (storedVersion < currentVersion) {
      details.push({ key, from: storedVersion, to: currentVersion });
    }
  }
  
  return {
    needed: details.length > 0,
    details,
  };
}

/**
 * Reset all memory versions.
 * Useful for debugging or forced re-migrations.
 */
export function resetVersions(): void {
  localStorage.removeItem(STORAGE_KEYS.versions);
  console.log("[MemoryVersioning] Versions reset");
}

/**
 * Clear all memory data and versions.
 * Use with caution!
 */
export function clearAllMemory(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
  console.log("[MemoryVersioning] All memory cleared");
}

export default {
  MEMORY_VERSIONS,
  STORAGE_KEYS,
  loadWithMigration,
  saveWithVersion,
  checkMigrationsNeeded,
  resetVersions,
  clearAllMemory,
};
