/**
 * Message Analyzer - Intelligent conversation analysis for anticipating user intent
 *
 * Analyzes the last assistant message to detect what was proposed,
 * and predicts the most likely user responses to generate smart suggestions.
 *
 * BILINGUAL: Supports both French and English patterns.
 *
 * Pattern dictionaries extracted to analyzerPatterns.ts.
 */

import i18n from "@/i18n/config";
import { destinationIndex } from "@/services/destinationIndex";
import {
  DESTINATION_PATTERNS, DATES_QUESTION_PATTERNS, TRAVELERS_QUESTION_PATTERNS,
  BUDGET_QUESTION_PATTERNS, FLIGHTS_PATTERNS, HOTELS_PATTERNS, ACTIVITIES_PATTERNS,
  DESTINATION_INFO_PATTERNS, CONFIRMATION_PATTERNS, DEPARTURE_QUESTION_PATTERNS,
  NEXT_STEPS_PATTERNS, GREETING_PATTERNS,
  BUDGET_INTENT_PATTERNS, DATE_INTENT_PATTERNS, COMPARISON_INTENT_PATTERNS,
  MORE_OPTIONS_INTENT_PATTERNS, BOOKING_INTENT_PATTERNS, POSITIVE_INTENT_PATTERNS,
  NEGATIVE_INTENT_PATTERNS, UNDECIDED_INTENT_PATTERNS,
  FALLBACK_DESTINATIONS, SUGGESTION_TEMPLATES, WIDGET_COHERENCE_RULES,
} from "./analyzerPatterns";

export type ProposedContentType =
  | 'destinations'
  | 'dates_question'
  | 'travelers_question'
  | 'budget_question'
  | 'flights'
  | 'hotels'
  | 'activities'
  | 'destination_info'
  | 'confirmation'
  | 'departure_question'
  | 'next_steps'
  | 'open_question'
  | 'greeting'
  | 'unknown';

export interface LastProposedContent {
  type: ProposedContentType;
  items?: string[];           // Extracted options (destination names, etc.)
  questionTopic?: string;     // What the question is about
  isAskingForChoice?: boolean;
}

export interface UserIntent {
  wantsBudgetInfo?: boolean;
  wantsDateInfo?: boolean;
  wantsComparison?: boolean;
  wantsMoreOptions?: boolean;
  wantsToBook?: boolean;
  mentionedBudget?: string;
  mentionedDestination?: string;
  isPositive?: boolean;
  isNegative?: boolean;
  isUndecided?: boolean;
}

export interface AnticipatedSuggestion {
  id: string;
  label: string;
  message: string;
  emoji?: string;
  priority: number; // Lower = higher priority
}

/**
 * Extract destination names from text (bilingual)
 */
function extractDestinationNames(text: string): string[] {
  const found = new Map<string, string>(); // lowercase key → displayName

  // Primary: use DB-backed index (covers ~5000 cities + 250 countries)
  if (destinationIndex.isReady()) {
    for (const name of destinationIndex.match(text)) {
      found.set(name.toLowerCase(), name);
    }
  }

  // Always check fallback list for common spellings the DB may store differently
  const textLower = text.toLowerCase();
  for (const dest of FALLBACK_DESTINATIONS) {
    const key = dest.toLowerCase();
    if (textLower.includes(key) && !found.has(key)) {
      found.set(key, dest);
    }
  }

  return [...found.values()].slice(0, 6);
}

/**
 * Analyze what the assistant just proposed in their last message
 */
export function analyzeLastAssistantMessage(text: string | undefined): LastProposedContent {
  if (!text) {
    return { type: 'unknown' };
  }

  // Check for greetings first (takes priority at conversation start)
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(text)) {
      return { type: 'greeting' };
    }
  }

  // ── Contextual score-based classification ──
  //
  // Priority tiers (higher = wins):
  //   Tier 1 — Structural content (hotels/flights): 25 pts per match
  //   Tier 2 — Destination name detection: 20 base + 3 per extra name
  //   Tier 3 — Standard patterns: 10 pts per match
  //   Question bonus: +5 ONLY when a base pattern already scored > 0
  //
  // This ensures destination names almost always win over standard patterns
  // (dates_question, confirmation, activities…) but structural content
  // (hotels, flights) still takes priority since it's more specific.

  const scores: Record<ProposedContentType, number> = {
    destinations: 0, dates_question: 0, travelers_question: 0,
    budget_question: 0, flights: 0, hotels: 0, activities: 0,
    destination_info: 0, departure_question: 0, next_steps: 0,
    confirmation: 0, open_question: 0, greeting: 0, unknown: 0,
  };

  const STRUCTURAL_SCORE = 25;
  const NAME_BASE_SCORE = 20;
  const NAME_PER_EXTRA = 3;
  const PATTERN_SCORE = 10;
  const QUESTION_BONUS = 5;
  const endsWithQuestion = text.trim().endsWith('?');

  // ── Tier 1: Structural content (hotels, flights) ──
  const structuralPatterns: Array<[ProposedContentType, RegExp[]]> = [
    ['flights', FLIGHTS_PATTERNS],
    ['hotels', HOTELS_PATTERNS],
  ];
  for (const [category, patterns] of structuralPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[category] += STRUCTURAL_SCORE;
      }
    }
  }

  // ── Tier 2: Destination name detection ──
  const extractedItems = extractDestinationNames(text);
  if (extractedItems.length > 0) {
    scores.destinations += NAME_BASE_SCORE + Math.max(0, extractedItems.length - 1) * NAME_PER_EXTRA;
  }

  // ── Tier 3: Standard patterns ──
  const standardPatterns: Array<[ProposedContentType, RegExp[]]> = [
    ['destinations', DESTINATION_PATTERNS],
    ['dates_question', DATES_QUESTION_PATTERNS],
    ['travelers_question', TRAVELERS_QUESTION_PATTERNS],
    ['budget_question', BUDGET_QUESTION_PATTERNS],
    ['activities', ACTIVITIES_PATTERNS],
    ['destination_info', DESTINATION_INFO_PATTERNS],
    ['departure_question', DEPARTURE_QUESTION_PATTERNS],
    ['next_steps', NEXT_STEPS_PATTERNS],
    ['confirmation', CONFIRMATION_PATTERNS],
  ];
  for (const [category, patterns] of standardPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[category] += PATTERN_SCORE;
      }
    }
  }

  // ── Strong confirmation boost ──
  // When 2+ confirmation patterns match (e.g. "I understand. Let me help..."),
  // the signal is strong enough to beat a single incidental destination name.
  if (scores.confirmation >= 2 * PATTERN_SCORE) {
    scores.confirmation += PATTERN_SCORE;
  }

  // ── Question bonus: ONLY if a base pattern already scored > 0 ──
  if (endsWithQuestion) {
    for (const [category] of [...structuralPatterns, ...standardPatterns]) {
      if (category.endsWith('_question') && scores[category] > 0) {
        scores[category] += QUESTION_BONUS;
      }
    }
  }

  // ── Find winner ──
  let bestType: ProposedContentType = 'unknown';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as Array<[ProposedContentType, number]>) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  if (bestScore === 0) {
    // Fallback: open question or unknown
    if (endsWithQuestion) return { type: 'open_question' };
    return { type: 'unknown' };
  }

  // Build result based on winning type
  switch (bestType) {
    case 'destinations':
      return {
        type: 'destinations',
        items: extractedItems,
        isAskingForChoice: extractedItems.length > 1 || /que penses-tu|choisi|what do you think|choose/i.test(text),
      };
    case 'dates_question':
      return { type: 'dates_question', questionTopic: 'dates' };
    case 'travelers_question':
      return { type: 'travelers_question', questionTopic: 'travelers' };
    case 'budget_question':
      return { type: 'budget_question', questionTopic: 'budget' };
    case 'flights':
      return { type: 'flights', isAskingForChoice: true };
    case 'hotels':
      return { type: 'hotels', isAskingForChoice: true };
    case 'activities':
      return { type: 'activities', isAskingForChoice: true };
    case 'destination_info':
      return { type: 'destination_info', items: extractedItems };
    case 'departure_question':
      return { type: 'departure_question', questionTopic: 'departure_city' };
    case 'next_steps':
      return { type: 'next_steps', questionTopic: 'missing_fields' };
    case 'confirmation':
      return { type: 'confirmation' };
    default:
      return { type: bestType };
  }
}

/**
 * Analyze user intent from their last message (bilingual)
 */
export function analyzeUserIntent(text: string | undefined): UserIntent {
  if (!text) {
    return {};
  }

  const intent: UserIntent = {};

  // Detect budget mentions
  for (const pattern of BUDGET_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.wantsBudgetInfo = true;
      // Try to extract amount (works for €, $, £ — both prefix and suffix)
      const budgetMatch = text.match(/(\d[\d\s]*\d?)\s*(euros?|€|\$|dollars?|£|pounds?)/i)
        || text.match(/[$€£]\s*(\d[\d\s]*\d)/);
      if (budgetMatch) {
        // For prefix match ($2000), the amount is in group 1; for suffix match, also group 1
        const raw = budgetMatch[1].replace(/\s/g, "");
        intent.mentionedBudget = raw;
      }
      break;
    }
  }

  // Detect date interests
  for (const pattern of DATE_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.wantsDateInfo = true;
      break;
    }
  }

  // Detect comparison requests
  for (const pattern of COMPARISON_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.wantsComparison = true;
      break;
    }
  }

  // Detect more options requests
  for (const pattern of MORE_OPTIONS_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.wantsMoreOptions = true;
      break;
    }
  }

  // Detect booking intent
  for (const pattern of BOOKING_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.wantsToBook = true;
      break;
    }
  }

  // Detect positive sentiment
  for (const pattern of POSITIVE_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.isPositive = true;
      break;
    }
  }

  // Detect negative sentiment
  for (const pattern of NEGATIVE_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.isNegative = true;
      break;
    }
  }

  // Detect undecided
  for (const pattern of UNDECIDED_INTENT_PATTERNS) {
    if (pattern.test(text)) {
      intent.isUndecided = true;
      break;
    }
  }

  // Detect destination mentions
  const destinationPatterns = [
    /(?:aller|partir|voyager)\s+(?:[àa]|en|au|aux)\s+([A-ZÀ-Ü][\w\s-]+)/i,
    /destination\s*[:=]?\s*([A-ZÀ-Ü][\w\s-]+)/i,
    /(?:je\s+veux|on\s+va|direction)\s+([A-ZÀ-Ü][\w\s-]+)/i,
  ];
  for (const pattern of destinationPatterns) {
    const match = text.match(pattern);
    if (match) {
      intent.mentionedDestination = match[1].trim();
      break;
    }
  }


  return intent;
}

// ============================================================================
// ANTICIPATED SUGGESTIONS - Bilingual with language detection
// ============================================================================

/**
 * Detect language from text - uses i18n.language as default when text is ambiguous
 */
export function detectLanguage(text: string | undefined): 'fr' | 'en' {
  // If no text, use current i18n language
  if (!text || text.trim().length === 0) {
    const currentLang = i18n.language?.split('-')[0];
    return currentLang === 'fr' ? 'fr' : 'en';
  }

  // French markers — use /gi to count ALL occurrences
  const frMarkers = /\b(je|tu|nous|vous|est|sont|le|la|les|un|une|des|pour|avec|dans|sur|qui|que|quoi|comment|pourquoi|où|quand|bonjour|merci|oui|non|on|en|au|du|ne|pas|mon|ton|son|mais|tout|ou|ni|se)\b/gi;

  // English markers
  const enMarkers = /\b(i|you|we|they|is|are|the|a|an|some|for|with|in|on|who|what|why|where|when|how|hello|thanks|yes|no|please|to|my|your|this|that|it|do|can|will|not|just|from)\b/gi;

  const frCount = [...text.matchAll(frMarkers)].length;
  const enCount = [...text.matchAll(enMarkers)].length;

  // If counts are equal or both zero, use current i18n language
  if (frCount === enCount) {
    const currentLang = i18n.language?.split('-')[0];
    return currentLang === 'fr' ? 'fr' : 'en';
  }

  return frCount > enCount ? 'fr' : 'en';
}

/**
 * Get localized month name
 */
function getNextMonth(lang: 'fr' | 'en'): string {
  const monthsFr = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const months = lang === 'fr' ? monthsFr : monthsEn;
  return months[(new Date().getMonth() + 1) % 12];
}

/**
 * Parse next_steps message to detect which fields are missing and return targeted suggestions
 */
function getNextStepsSuggestions(text: string, lang: 'fr' | 'en'): AnticipatedSuggestion[] {
  const textLower = text.toLowerCase();

  // Check what's mentioned as missing
  const mentionsTravelers = /nombre\s+de\s+voyageurs?|combien|how\s+many\s+(people|travelers)/i.test(textLower);
  const mentionsDeparture = /ville\s+de\s+départ|depuis\s+quelle\s+ville|departure|where.*from/i.test(textLower);
  const mentionsDates = /dates?|quand|when|période|period/i.test(textLower);

  // If travelers is the first item mentioned, prioritize travelers suggestions
  if (mentionsTravelers) {
    return SUGGESTION_TEMPLATES.travelers_question[lang];
  }
  if (mentionsDeparture) {
    return SUGGESTION_TEMPLATES.departure_question[lang];
  }
  if (mentionsDates) {
    return SUGGESTION_TEMPLATES.dates_question[lang];
  }

  // Generic next_steps fallback
  return SUGGESTION_TEMPLATES.next_steps[lang];
}

/**
 * Generate anticipated suggestions based on conversation analysis (bilingual)
 */
export function getAnticipatedSuggestions(
  lastAssistantContent: LastProposedContent,
  userIntent: UserIntent,
  conversationTurn: number,
  detectedLang?: 'fr' | 'en',
  lastAssistantText?: string
): AnticipatedSuggestion[] {
  // Use provided lang or current i18n language
  const currentLang = i18n.language?.split('-')[0] as 'fr' | 'en';
  const lang = detectedLang || currentLang || 'en';
  const suggestions: AnticipatedSuggestion[] = [];

  switch (lastAssistantContent.type) {
    case 'greeting':
      return SUGGESTION_TEMPLATES.greeting[lang];

    case 'destinations':
      // Destinations proposed - offer quick choices
      if (lastAssistantContent.items && lastAssistantContent.items.length > 0) {
        lastAssistantContent.items.slice(0, 2).forEach((dest, i) => {
          suggestions.push({
            id: `dest-${i}`,
            label: dest,
            message: lang === 'fr' ? `Je choisis ${dest}` : `I choose ${dest}`,
            emoji: '📍',
            priority: i + 1,
          });
        });
      }
      suggestions.push(
        {
          id: 'choose-for-me',
          label: lang === 'fr' ? 'Choisis pour moi' : 'Choose for me',
          message: lang === 'fr' ? 'Choisis la meilleure destination pour moi' : 'Choose the best destination for me',
          emoji: '🎯',
          priority: 3
        },
        {
          id: 'more-dest',
          label: lang === 'fr' ? 'Autres destinations' : 'Other destinations',
          message: lang === 'fr' ? 'Propose-moi d\'autres destinations' : 'Suggest other destinations',
          emoji: '🔄',
          priority: 4
        },
      );
      return suggestions.slice(0, 4);

    case 'dates_question': {
      // Add dynamic month suggestion
      const monthSuggestions = [...SUGGESTION_TEMPLATES.dates_question[lang]];
      monthSuggestions.splice(2, 0, {
        id: 'next-month',
        label: lang === 'fr' ? `En ${getNextMonth('fr')}` : `In ${getNextMonth('en')}`,
        message: lang === 'fr' ? `En ${getNextMonth('fr')}` : `In ${getNextMonth('en')}`,
        emoji: '🗓️',
        priority: 3,
      });
      return monthSuggestions;
    }

    case 'travelers_question':
      return SUGGESTION_TEMPLATES.travelers_question[lang];

    case 'budget_question':
      return SUGGESTION_TEMPLATES.budget_question[lang];

    case 'flights':
      return SUGGESTION_TEMPLATES.flights[lang];

    case 'hotels':
      return SUGGESTION_TEMPLATES.hotels[lang];

    case 'activities':
      return SUGGESTION_TEMPLATES.activities[lang];

    case 'destination_info':
      // Info about a destination
      if (lastAssistantContent.items && lastAssistantContent.items.length > 0) {
        const dest = lastAssistantContent.items[0];
        suggestions.push({
          id: 'interested',
          label: lang === 'fr' ? 'Ça m\'intéresse' : 'I\'m interested',
          message: lang === 'fr' ? `Je suis intéressé par ${dest}` : `I'm interested in ${dest}`,
          emoji: '👍',
          priority: 1
        });
      }
      suggestions.push(
        {
          id: 'when-go',
          label: lang === 'fr' ? 'Meilleure période' : 'Best time',
          message: lang === 'fr' ? 'Quelle est la meilleure période pour y aller ?' : 'What\'s the best time to go?',
          emoji: '📅',
          priority: 2
        },
        {
          id: 'budget-estimate',
          label: lang === 'fr' ? 'Budget estimé' : 'Budget estimate',
          message: lang === 'fr' ? 'Quel budget prévoir ?' : 'What budget should I plan for?',
          emoji: '💶',
          priority: 3
        },
        {
          id: 'other-dest',
          label: lang === 'fr' ? 'Autre destination' : 'Another destination',
          message: lang === 'fr' ? 'Montre-moi une autre destination' : 'Show me another destination',
          emoji: '🔄',
          priority: 4
        },
      );
      return suggestions.slice(0, 4);

    case 'confirmation':
      return SUGGESTION_TEMPLATES.confirmation[lang];

    case 'departure_question':
      return SUGGESTION_TEMPLATES.departure_question[lang];

    case 'next_steps':
      return getNextStepsSuggestions(lastAssistantText || '', lang);

    case 'open_question':
      return SUGGESTION_TEMPLATES.open_question[lang];

    default:
      // Unknown type - don't show generic suggestions
      // Let the static suggestion engine handle it contextually
      if (conversationTurn === 0) {
        return SUGGESTION_TEMPLATES.default_start[lang];
      }
      return [];
  }
}

// ============================================================================
// WIDGET COHERENCE GUARD
// ============================================================================

/**
 * Validate that a proposed widget is coherent with the assistant's text.
 * Returns null if the widget should be suppressed, or the original widgetType if OK.
 */
export function validateWidgetTextCoherence(
  text: string,
  widgetType: string | null | undefined
): string | null {
  if (!widgetType || !text) return widgetType ?? null;

  for (const rule of WIDGET_COHERENCE_RULES) {
    const textMatches = rule.textPatterns.some((p) => p.test(text));
    if (textMatches) {
      if (rule.validWidgets.includes(widgetType)) {
        return widgetType; // coherent
      }
      // Text says one thing, widget says another → suppress widget
      if (import.meta.env.DEV) {
        console.warn(
          `[CoherenceGuard] Text matches "${rule.label}" but widget is "${widgetType}" → suppressed`
        );
      }
      return null;
    }
  }

  // No rule matched → no over-correction
  return widgetType;
}
