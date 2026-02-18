/**
 * SuggestionEngine - Intelligent context-aware suggestion generation
 * 
 * Generates smart suggestions based on:
 * - Conversation history (what assistant just said)
 * - User intent analysis
 * - Current workflow step
 * - Trip data completion status
 * - Active visual context (map, panels)
 */

import i18n from "@/i18n/config";
import { 
  analyzeLastAssistantMessage, 
  analyzeUserIntent, 
  getAnticipatedSuggestions,
  detectLanguage,
  type AnticipatedSuggestion
} from './messageAnalyzer';

const t = i18n.t.bind(i18n);

export interface SuggestionContext {
  // Workflow state
  workflowStep: 'inspiration' | 'destination' | 'dates' | 'travelers' | 'search' | 'compare' | 'book';
  
  // Trip data
  hasDestination: boolean;
  hasDates: boolean;
  hasTravelers: boolean;
  hasFlights: boolean;
  hasHotels: boolean;
  destinationName?: string;
  departureCity?: string;
  tripDuration?: number;
  
  // Visual context
  currentTab: 'flights' | 'stays' | 'activities' | 'preferences';
  visibleFlightsCount: number;
  visibleHotelsCount: number;
  visibleActivitiesCount: number;
  cheapestFlightPrice?: number;
  cheapestHotelPrice?: number;
  
  // Temporal context
  isWeekend?: boolean;
  nextMonth?: string;
  
  // Inspire flow state
  inspireFlowStep?: 'idle' | 'style' | 'interests' | 'extra' | 'must_haves' | 'dietary' | 'loading' | 'results';
  
  // Destinations proposed (not yet selected)
  hasProposedDestinations?: boolean;
  proposedDestinationNames?: string[];
  
  // Conversation context (for intelligent anticipation)
  lastAssistantMessage?: string;
  lastUserMessage?: string;
  conversationTurn?: number;
}

export interface Suggestion {
  id: string;
  label: string;
  message: string;
  iconName: 'sparkles' | 'sun' | 'building' | 'calendar' | 'zap' | 'user' | 'users' | 'plane' | 'scale' | 'sunrise' | 'star' | 'map-pin' | 'camera' | 'compass' | 'utensils' | 'search' | 'clock';
  emoji?: string; // For anticipated suggestions
}

// Get next month key for i18n
function getNextMonthKey(): string {
  const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return monthKeys[nextMonth.getMonth()];
}

// INSPIRATION suggestions (no destination yet)
function getInspirationSuggestions(): Suggestion[] {
  const monthKey = getNextMonthKey();
  const monthName = t(`planner.months.${monthKey}`);
  
  return [
    {
      id: 'inspire',
      label: t('planner.suggestions.inspire'),
      message: t('planner.suggestions.inspireMessage'),
      iconName: 'sparkles',
    },
    {
      id: 'weekend-sun',
      label: t('planner.suggestions.weekendSun'),
      message: t('planner.suggestions.weekendSunMessage'),
      iconName: 'sun',
    },
    {
      id: 'city-break',
      label: t('planner.suggestions.cityBreak'),
      message: t('planner.suggestions.cityBreakMessage'),
      iconName: 'building',
    },
    {
      id: 'where-month',
      label: t('planner.suggestions.whereIn', { month: monthName }),
      message: t('planner.suggestions.whereInMessage', { month: monthName }),
      iconName: 'calendar',
    },
  ];
}

// DESTINATION suggestions (has destination, no dates)
function getDatesSuggestions(context: SuggestionContext): Suggestion[] {
  const dest = context.destinationName || t('planner.suggestions.thisDestination');
  return [
    {
      id: 'best-period',
      label: t('planner.suggestions.bestPeriod'),
      message: t('planner.suggestions.bestPeriodMessage', { destination: dest }),
      iconName: 'calendar',
    },
    {
      id: 'this-weekend',
      label: t('planner.suggestions.thisWeekend'),
      message: t('planner.suggestions.thisWeekendMessage', { destination: dest }),
      iconName: 'zap',
    },
    {
      id: 'next-week',
      label: t('planner.suggestions.nextWeek'),
      message: t('planner.suggestions.nextWeekMessage'),
      iconName: 'calendar',
    },
  ];
}

// TRAVELERS suggestions (has dates, no travelers)
function getTravelersSuggestions(): Suggestion[] {
  return [
    {
      id: 'solo',
      label: t('planner.suggestions.solo'),
      message: t('planner.suggestions.soloMessage'),
      iconName: 'user',
    },
    {
      id: 'couple',
      label: t('planner.suggestions.couple'),
      message: t('planner.suggestions.coupleMessage'),
      iconName: 'users',
    },
    {
      id: 'family',
      label: t('planner.suggestions.family'),
      message: t('planner.suggestions.familyMessage'),
      iconName: 'users',
    },
  ];
}

// FLIGHTS TAB suggestions
function getFlightSuggestions(context: SuggestionContext): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dest = context.destinationName || t('planner.suggestions.thisDestination');
  
  // If cheapest price is visible
  if (context.cheapestFlightPrice) {
    suggestions.push({
      id: 'cheapest-flight',
      label: t('planner.suggestions.cheapestFlight', { price: context.cheapestFlightPrice }),
      message: t('planner.suggestions.cheapestFlightMessage', { price: context.cheapestFlightPrice }),
      iconName: 'plane',
    });
  }
  
  // If multiple flights visible
  if (context.visibleFlightsCount > 2) {
    suggestions.push({
      id: 'compare-flights',
      label: t('planner.suggestions.compareFlights'),
      message: t('planner.suggestions.compareFlightsMessage'),
      iconName: 'scale',
    });
  }
  
  suggestions.push({
    id: 'morning-flight',
    label: t('planner.suggestions.morningFlight'),
    message: t('planner.suggestions.morningFlightMessage'),
    iconName: 'sunrise',
  });
  
  // If no flights visible, show search prompt
  if (context.visibleFlightsCount === 0) {
    suggestions.unshift({
      id: 'find-flights',
      label: t('planner.suggestions.findFlights'),
      message: t('planner.suggestions.findFlightsMessage', { destination: dest }),
      iconName: 'search',
    });
  }
  
  return suggestions;
}

// STAYS TAB suggestions
function getStaysSuggestions(context: SuggestionContext): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dest = context.destinationName || t('planner.suggestions.thisDestination');
  
  // If cheapest hotel price visible
  if (context.cheapestHotelPrice) {
    suggestions.push({
      id: 'best-value',
      label: t('planner.suggestions.bestValue'),
      message: t('planner.suggestions.bestValueMessage'),
      iconName: 'star',
    });
  }
  
  suggestions.push({
    id: 'central-location',
    label: t('planner.suggestions.centralLocation'),
    message: t('planner.suggestions.centralLocationMessage', { destination: dest }),
    iconName: 'map-pin',
  });
  
  // If hotels are visible
  if (context.visibleHotelsCount > 2) {
    suggestions.push({
      id: 'compare-hotels',
      label: t('planner.suggestions.compareHotels'),
      message: t('planner.suggestions.compareHotelsMessage'),
      iconName: 'scale',
    });
  } else {
    suggestions.push({
      id: 'find-hotels',
      label: t('planner.suggestions.findHotels'),
      message: t('planner.suggestions.findHotelsMessage', { destination: dest }),
      iconName: 'search',
    });
  }
  
  return suggestions;
}

// ACTIVITIES TAB suggestions
function getActivitiesSuggestions(context: SuggestionContext): Suggestion[] {
  const dest = context.destinationName || t('planner.suggestions.thisDestination');
  
  return [
    {
      id: 'must-see',
      label: t('planner.suggestions.mustSee'),
      message: t('planner.suggestions.mustSeeMessage', { destination: dest }),
      iconName: 'camera',
    },
    {
      id: 'hidden-gems',
      label: t('planner.suggestions.hiddenGems'),
      message: t('planner.suggestions.hiddenGemsMessage', { destination: dest }),
      iconName: 'compass',
    },
    {
      id: 'local-food',
      label: t('planner.suggestions.localFood'),
      message: t('planner.suggestions.localFoodMessage', { destination: dest }),
      iconName: 'utensils',
    },
  ];
}

// PREFERENCES TAB suggestions
function getPreferencesSuggestions(context: SuggestionContext): Suggestion[] {
  const dest = context.destinationName || t('planner.suggestions.thisDestination');
  
  return [
    {
      id: 'optimize-trip',
      label: t('planner.suggestions.optimizeTrip'),
      message: t('planner.suggestions.optimizeTripMessage', { destination: dest }),
      iconName: 'sparkles',
    },
    {
      id: 'itinerary',
      label: t('planner.suggestions.itinerary'),
      message: t('planner.suggestions.itineraryMessage', { destination: dest }),
      iconName: 'calendar',
    },
    {
      id: 'budget-tips',
      label: t('planner.suggestions.budgetTips'),
      message: t('planner.suggestions.budgetTipsMessage'),
      iconName: 'star',
    },
  ];
}

// SEARCH READY suggestions (all info but no search yet)
function getSearchReadySuggestions(context: SuggestionContext): Suggestion[] {
  const dest = context.destinationName || t('planner.suggestions.thisDestination');
  
  return [
    {
      id: 'launch-search',
      label: t('planner.suggestions.launchSearch'),
      message: t('planner.suggestions.launchSearchMessage'),
      iconName: 'search',
    },
    {
      id: 'direct-flights',
      label: t('planner.suggestions.directFlights'),
      message: t('planner.suggestions.directFlightsMessage'),
      iconName: 'plane',
    },
    {
      id: 'best-time',
      label: t('planner.suggestions.bestTime'),
      message: t('planner.suggestions.bestTimeMessage', { destination: dest }),
      iconName: 'clock',
    },
  ];
}

// DESTINATION CHOICE suggestions (after inspire flow, destinations proposed)
function getDestinationChoiceSuggestions(context: SuggestionContext): Suggestion[] {
  const destinations = context.proposedDestinationNames || [];
  const suggestions: Suggestion[] = [
    {
      id: 'choose-for-me',
      label: t('planner.suggestions.chooseForMe'),
      message: t('planner.suggestions.chooseForMeMessage'),
      iconName: 'sparkles',
    },
  ];
  
  if (destinations.length > 0) {
    suggestions.push({
      id: 'more-about-first',
      label: t('planner.suggestions.moreAbout', { destination: destinations[0] }),
      message: t('planner.suggestions.moreAboutMessage', { destination: destinations[0] }),
      iconName: 'compass',
    });
  }
  
  suggestions.push({
    id: 'other-destinations',
    label: t('planner.suggestions.otherDestinations'),
    message: t('planner.suggestions.otherDestinationsMessage'),
    iconName: 'search',
  });
  
  return suggestions;
}

/**
 * Convert anticipated suggestions to standard suggestions format
 */
function convertAnticipatedToSuggestion(anticipated: AnticipatedSuggestion): Suggestion {
  // Map emoji to appropriate icon
  const emojiToIcon: Record<string, Suggestion['iconName']> = {
    '✨': 'sparkles',
    '☀️': 'sun',
    '🏙️': 'building',
    '🌍': 'compass',
    '📍': 'map-pin',
    '🎯': 'sparkles',
    '🔄': 'search',
    '📅': 'calendar',
    '📆': 'calendar',
    '🗓️': 'calendar',
    '🤷': 'user',
    '🧳': 'user',
    '💑': 'users',
    '👥': 'users',
    '👨‍👩‍👧': 'users',
    '💰': 'star',
    '💵': 'star',
    '💎': 'star',
    '💶': 'star',
    '⚡': 'zap',
    '✈️': 'plane',
    '⚖️': 'scale',
    '⭐': 'star',
    '🏊': 'star',
    '✅': 'star',
    '📋': 'calendar',
    '🆓': 'star',
    '👍': 'sparkles',
    '👎': 'user',
    'ℹ️': 'star',
    '▶️': 'zap',
    '🏨': 'building',
    '✏️': 'star',
    '❓': 'sparkles',
  };
  
  return {
    id: anticipated.id,
    label: anticipated.label,
    message: anticipated.message,
    iconName: emojiToIcon[anticipated.emoji || ''] || 'sparkles',
    emoji: anticipated.emoji,
  };
}

/**
 * Main function to get contextual suggestions
 * Priority: conversation-based replies > context-based suggestions
 */
export function getSuggestions(context: SuggestionContext): Suggestion[] {
  // 1. CONVERSATION-FIRST: If the assistant just said something, generate natural replies to it
  //    This makes suggestions feel like "quick replies" to the last message, not generic buttons
  if (context.lastAssistantMessage && context.lastAssistantMessage.length > 20) {
    const lastContent = analyzeLastAssistantMessage(context.lastAssistantMessage);
    const userIntent = analyzeUserIntent(context.lastUserMessage);
    const conversationTurn = context.conversationTurn ?? 0;
    const currentLang = i18n.language?.split('-')[0] as 'fr' | 'en' || 'en';
    const detectedLang = context.lastUserMessage
      ? detectLanguage(context.lastUserMessage)
      : currentLang;

    const anticipated = getAnticipatedSuggestions(lastContent, userIntent, conversationTurn, detectedLang, context.lastAssistantMessage);

    if (anticipated.length > 0) {
      return anticipated.map(convertAnticipatedToSuggestion).slice(0, 4);
    }
  }

  // 2. DESTINATIONS PROPOSED - after inspire flow
  if (context.inspireFlowStep === 'results' || context.hasProposedDestinations) {
    return getDestinationChoiceSuggestions(context).slice(0, 3);
  }

  // 3. During inspire flow widgets — no suggestions (let widget speak)
  if (context.inspireFlowStep && context.inspireFlowStep !== 'idle') {
    return [];
  }

  // 4. INSPIRATION — no destination: starter suggestions
  if (!context.hasDestination) {
    return getInspirationSuggestions().slice(0, 4);
  }

  // 5. Has destination, no dates
  if (!context.hasDates) {
    return getDatesSuggestions(context).slice(0, 3);
  }

  // 6. Has destination & dates, no travelers
  if (!context.hasTravelers) {
    return getTravelersSuggestions().slice(0, 3);
  }

  // 7. Tab-based contextual suggestions
  switch (context.currentTab) {
    case 'flights':
      return context.visibleFlightsCount === 0
        ? getSearchReadySuggestions(context).slice(0, 3)
        : getFlightSuggestions(context).slice(0, 3);
    case 'stays':
      return getStaysSuggestions(context).slice(0, 3);
    case 'activities':
      return getActivitiesSuggestions(context).slice(0, 3);
    case 'preferences':
      return getPreferencesSuggestions(context).slice(0, 3);
    default:
      return getInspirationSuggestions().slice(0, 3);
  }
}

/**
 * Determine workflow step from context
 */
export function getWorkflowStep(context: Omit<SuggestionContext, 'workflowStep'>): SuggestionContext['workflowStep'] {
  if (!context.hasDestination) return 'inspiration';
  if (!context.hasDates) return 'destination';
  if (!context.hasTravelers) return 'dates';
  if (!context.hasFlights && !context.hasHotels) return 'search';
  return 'compare';
}
