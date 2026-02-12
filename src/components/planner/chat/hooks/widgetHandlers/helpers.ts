/**
 * Shared helper functions for widget handlers
 */

/**
 * Parse trip duration string to number of days
 */
export function parseDurationToDays(duration: string): number | null {
  const match = duration.match(/(\d+)\s*(semaine|jour|week|day)/i);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.includes("semaine") || unit.includes("week")) {
      return num * 7;
    }
    return num;
  }
  if (duration.toLowerCase().includes("semaine") || duration.toLowerCase().includes("week")) {
    return 7;
  }
  return null;
}
