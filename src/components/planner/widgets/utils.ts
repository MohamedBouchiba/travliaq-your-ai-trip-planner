/**
 * Shared utilities for chat widgets
 */

/**
 * Parse a month name (French/English) into a Date object.
 * Returns the 1st day of the specified month.
 * If the month is in the past for this year, returns next year.
 */
export const parsePreferredMonth = (monthStr?: string): Date | null => {
  if (!monthStr) return null;
  
  const monthMap: Record<string, number> = {
    "janvier": 0, "january": 0, "jan": 0,
    "février": 1, "fevrier": 1, "february": 1, "feb": 1,
    "mars": 2, "march": 2, "mar": 2,
    "avril": 3, "april": 3, "apr": 3,
    "mai": 4, "may": 4,
    "juin": 5, "june": 5, "jun": 5,
    "juillet": 6, "july": 6, "jul": 6,
    "août": 7, "aout": 7, "august": 7, "aug": 7,
    "septembre": 8, "september": 8, "sep": 8, "sept": 8,
    "octobre": 9, "october": 9, "oct": 9,
    "novembre": 10, "november": 10, "nov": 10,
    "décembre": 11, "decembre": 11, "december": 11, "dec": 11,
    // Seasons
    "printemps": 3, "spring": 3,
    "été": 6, "ete": 6, "summer": 6,
    "automne": 9, "autumn": 9, "fall": 9,
    "hiver": 0, "winter": 0,
  };
  
  const normalized = monthStr.toLowerCase().trim();
  const monthIndex = monthMap[normalized];
  
  if (monthIndex !== undefined) {
    const now = new Date();
    let year = now.getFullYear();
    // If the month is in the past this year, use next year
    if (monthIndex < now.getMonth() || (monthIndex === now.getMonth() && now.getDate() > 15)) {
      year++;
    }
    return new Date(year, monthIndex, 1);
  }
  
  return null;
};
