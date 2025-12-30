/**
 * Structured Logging for Memory Changes
 *
 * Provides detailed logging for debugging memory state changes
 * Helps trace data flow and identify issues
 */

export type MemoryType = 'accommodation' | 'flight' | 'travel';

export interface MemoryChangeLog {
  timestamp: string;
  memoryType: MemoryType;
  action: string;
  changes: any;
  context?: string;
  stackTrace?: string;
}

// In-memory log storage (last 100 entries)
const memoryLogs: MemoryChangeLog[] = [];
const MAX_LOGS = 100;

// Flag to enable/disable logging (can be toggled via console)
let loggingEnabled = false;

/**
 * Enable memory logging
 * Usage: window.enableMemoryLogging()
 */
export function enableMemoryLogging(): void {
  loggingEnabled = true;
  console.log('[MemoryLogger] Logging enabled. Use getMemoryLogs() to view history.');
}

/**
 * Disable memory logging
 */
export function disableMemoryLogging(): void {
  loggingEnabled = false;
  console.log('[MemoryLogger] Logging disabled.');
}

/**
 * Check if logging is enabled
 */
export function isLoggingEnabled(): boolean {
  return loggingEnabled;
}

/**
 * Log a memory change
 */
export function logMemoryChange(
  memoryType: MemoryType,
  action: string,
  changes: any,
  context?: string
): void {
  if (!loggingEnabled) return;

  const log: MemoryChangeLog = {
    timestamp: new Date().toISOString(),
    memoryType,
    action,
    changes,
    context,
  };

  // Add to in-memory storage
  memoryLogs.push(log);

  // Keep only last MAX_LOGS entries
  if (memoryLogs.length > MAX_LOGS) {
    memoryLogs.shift();
  }

  // Console output with color coding
  const color = getColorForMemoryType(memoryType);
  console.log(
    `%c[${memoryType.toUpperCase()}] ${action}`,
    `color: ${color}; font-weight: bold;`,
    changes,
    context ? `(${context})` : ''
  );
}

/**
 * Log accommodation-specific changes
 */
export function logAccommodationChange(
  action: string,
  changes: any,
  context?: string
): void {
  logMemoryChange('accommodation', action, changes, context);
}

/**
 * Log flight-specific changes
 */
export function logFlightChange(action: string, changes: any, context?: string): void {
  logMemoryChange('flight', action, changes, context);
}

/**
 * Log travel-specific changes
 */
export function logTravelChange(action: string, changes: any, context?: string): void {
  logMemoryChange('travel', action, changes, context);
}

/**
 * Get all memory logs
 */
export function getMemoryLogs(filterType?: MemoryType): MemoryChangeLog[] {
  if (filterType) {
    return memoryLogs.filter(log => log.memoryType === filterType);
  }
  return [...memoryLogs];
}

/**
 * Get recent logs (last N entries)
 */
export function getRecentLogs(count: number = 10, filterType?: MemoryType): MemoryChangeLog[] {
  const logs = filterType
    ? memoryLogs.filter(log => log.memoryType === filterType)
    : memoryLogs;
  return logs.slice(-count);
}

/**
 * Clear all logs
 */
export function clearMemoryLogs(): void {
  memoryLogs.length = 0;
  console.log('[MemoryLogger] Logs cleared.');
}

/**
 * Export logs as JSON (for debugging)
 */
export function exportLogs(): string {
  return JSON.stringify(memoryLogs, null, 2);
}

/**
 * Print formatted log summary
 */
export function printLogSummary(): void {
  const summary = memoryLogs.reduce((acc, log) => {
    const key = `${log.memoryType}:${log.action}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.table(summary);
}

/**
 * Get color for memory type (for console styling)
 */
function getColorForMemoryType(type: MemoryType): string {
  switch (type) {
    case 'accommodation':
      return '#4CAF50'; // Green
    case 'flight':
      return '#2196F3'; // Blue
    case 'travel':
      return '#FF9800'; // Orange
    default:
      return '#666666'; // Gray
  }
}

/**
 * Track sync operations specifically
 */
export function logSyncOperation(
  from: string,
  to: string,
  data: any,
  success: boolean
): void {
  if (!loggingEnabled) return;

  const action = success ? 'SYNC_SUCCESS' : 'SYNC_FAILED';
  const changes = {
    from,
    to,
    data,
    success,
  };

  logMemoryChange('accommodation', action, changes, `${from} → ${to}`);
}

/**
 * Track user modifications
 */
export function logUserModification(
  memoryType: MemoryType,
  field: string,
  oldValue: any,
  newValue: any
): void {
  if (!loggingEnabled) return;

  const changes = {
    field,
    oldValue,
    newValue,
  };

  logMemoryChange(memoryType, 'USER_MODIFIED', changes, field);
}

/**
 * Track automatic propagation
 */
export function logAutoPropagation(
  memoryType: MemoryType,
  field: string,
  value: any,
  isProtected: boolean
): void {
  if (!loggingEnabled) return;

  const action = isProtected ? 'AUTO_PROPAGATION_BLOCKED' : 'AUTO_PROPAGATION';
  const changes = {
    field,
    value,
    isProtected,
  };

  logMemoryChange(memoryType, action, changes, field);
}

// Expose logging functions globally for console access
if (typeof window !== 'undefined') {
  (window as any).enableMemoryLogging = enableMemoryLogging;
  (window as any).disableMemoryLogging = disableMemoryLogging;
  (window as any).getMemoryLogs = getMemoryLogs;
  (window as any).getRecentLogs = getRecentLogs;
  (window as any).clearMemoryLogs = clearMemoryLogs;
  (window as any).exportLogs = exportLogs;
  (window as any).printLogSummary = printLogSummary;
}
