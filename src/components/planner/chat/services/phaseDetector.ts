/**
 * Phase Detector - Intelligent travel phase detection for adaptive chat behavior
 * 
 * Detects the current phase of the travel planning journey to adapt
 * the AI's personality, tone, and approach dynamically.
 */

import i18n from "@/i18n/config";

// ===== Types =====

export type TravelPhase =
  | "inspiration"    // User doesn't know where to go - exploratory mode
  | "research"       // Collecting info (destination, dates, travelers)
  | "comparison"     // Choosing between options (flights, hotels)
  | "planning"       // Trip details (activities, transfers, schedule)
  | "booking";       // Confirmation and booking

export interface PhaseContext {
  currentPhase: TravelPhase;
  completedSteps: string[];
  pendingChoices: number;
  hasNegativeFeedback: boolean;
  confidenceScore: number; // 0-100
}

export interface PhaseSignals {
  // From workflow/memory
  hasDestination: boolean;
  hasDates: boolean;
  hasTravelers: boolean;
  hasDeparture: boolean;
  hasFlightResults: boolean;
  hasHotelResults: boolean;
  hasActivities: boolean;
  
  // From widget interactions
  destinationConfirmed: boolean;
  datesConfirmed: boolean;
  travelersConfirmed: boolean;
  
  // From conversation
  askedForInspiration: boolean;
  hasNegativePreferences: boolean;
  requestedComparison: boolean;
  readyToBook: boolean;
}

// ===== Phase Detection Logic =====

/**
 * Detect the current travel planning phase based on signals
 */
export function detectCurrentPhase(signals: PhaseSignals): PhaseContext {
  const completedSteps: string[] = [];
  
  // Track completed steps
  if (signals.hasDestination || signals.destinationConfirmed) {
    completedSteps.push("destination");
  }
  if (signals.hasDates || signals.datesConfirmed) {
    completedSteps.push("dates");
  }
  if (signals.hasTravelers || signals.travelersConfirmed) {
    completedSteps.push("travelers");
  }
  if (signals.hasDeparture) {
    completedSteps.push("departure");
  }
  if (signals.hasFlightResults) {
    completedSteps.push("flights");
  }
  if (signals.hasHotelResults) {
    completedSteps.push("hotels");
  }
  if (signals.hasActivities) {
    completedSteps.push("activities");
  }

  // Count pending choices
  let pendingChoices = 0;
  if (signals.hasFlightResults && !completedSteps.includes("flight_selected")) {
    pendingChoices++;
  }
  if (signals.hasHotelResults && !completedSteps.includes("hotel_selected")) {
    pendingChoices++;
  }

  // Determine phase
  let currentPhase: TravelPhase;
  let confidenceScore = 80;

  // BOOKING: Ready to book
  if (signals.readyToBook && completedSteps.length >= 4) {
    currentPhase = "booking";
    confidenceScore = 95;
  }
  // COMPARISON: Has results to compare
  else if (signals.requestedComparison || pendingChoices > 0) {
    currentPhase = "comparison";
    confidenceScore = 90;
  }
  // PLANNING: Has flights/hotels selected, working on details
  else if (completedSteps.includes("flights") && completedSteps.includes("hotels")) {
    currentPhase = "planning";
    confidenceScore = 85;
  }
  // INSPIRATION: User asked for inspiration OR has no destination
  else if (signals.askedForInspiration || !signals.hasDestination) {
    currentPhase = "inspiration";
    confidenceScore = signals.askedForInspiration ? 95 : 75;
  }
  // RESEARCH: Has destination, collecting other info
  else {
    currentPhase = "research";
    confidenceScore = 80;
  }

  return {
    currentPhase,
    completedSteps,
    pendingChoices,
    hasNegativeFeedback: signals.hasNegativePreferences,
    confidenceScore,
  };
}

/**
 * Extract phase signals from various sources
 */
export function extractPhaseSignals(
  flightMemory: { destination?: string; departure?: string; departureDate?: Date; travelers?: { adults: number } } | null,
  widgetHistory: string,
  lastUserMessage: string,
  hasFlightResults: boolean,
  hasHotelResults: boolean,
  hasActivities: boolean
): PhaseSignals {
  const lowerMessage = lastUserMessage.toLowerCase();
  
  // Detect inspiration intent
  const inspirationPatterns = [
    /inspire/i,
    /je ne sais pas/i,
    /aucune id[ée]e/i,
    /o[uù] aller/i,
    /propose/i,
    /sugg[eè]re/i,
    /que me conseill/i,
  ];
  const askedForInspiration = inspirationPatterns.some(p => p.test(lowerMessage));
  
  // Detect comparison request
  const comparisonPatterns = [
    /compare/i,
    /versus|vs/i,
    /diff[ée]rence/i,
    /lequel/i,
    /meilleur/i,
    /entre.*et/i,
  ];
  const requestedComparison = comparisonPatterns.some(p => p.test(lowerMessage));
  
  // Detect booking intent
  const bookingPatterns = [
    /r[ée]serve/i,
    /book/i,
    /confirme/i,
    /je prends/i,
    /c'est bon/i,
    /valide/i,
    /parfait.*on y va/i,
  ];
  const readyToBook = bookingPatterns.some(p => p.test(lowerMessage));
  
  // Detect negative preferences
  const negativePatterns = [
    /je n'aime pas/i,
    /pas de/i,
    /[ée]vite/i,
    /sans/i,
    /jamais/i,
    /d[ée]teste/i,
    /pas int[ée]ress/i,
    /non merci/i,
  ];
  const hasNegativePreferences = negativePatterns.some(p => p.test(lowerMessage));
  
  // Check widget history for confirmations
  const destinationConfirmed = widgetHistory.includes("Destination choisie") || widgetHistory.includes("destination_selected");
  const datesConfirmed = widgetHistory.includes("Dates choisies") || widgetHistory.includes("date_range_selected");
  const travelersConfirmed = widgetHistory.includes("Voyageurs") || widgetHistory.includes("travelers_selected");
  
  return {
    hasDestination: !!flightMemory?.destination,
    hasDates: !!flightMemory?.departureDate,
    hasTravelers: !!(flightMemory?.travelers?.adults && flightMemory.travelers.adults > 0),
    hasDeparture: !!flightMemory?.departure,
    hasFlightResults,
    hasHotelResults,
    hasActivities,
    destinationConfirmed,
    datesConfirmed,
    travelersConfirmed,
    askedForInspiration,
    hasNegativePreferences,
    requestedComparison,
    readyToBook,
  };
}

/**
 * Get a simple phase from memory state (for quick detection)
 */
export function getSimplePhase(
  hasDestination: boolean,
  hasDates: boolean,
  hasTravelers: boolean,
  hasFlightResults: boolean,
  hasHotelResults: boolean,
  askedForInspiration: boolean
): TravelPhase {
  if (askedForInspiration || !hasDestination) return "inspiration";
  if (hasFlightResults || hasHotelResults) return "comparison";
  if (hasDestination && hasDates && hasTravelers) return "planning";
  return "research";
}

/**
 * Get phase display info for debugging/UI
 */
export function getPhaseDisplayInfo(phase: TravelPhase): { label: string; emoji: string; color: string } {
  const t = i18n.t.bind(i18n);
  
  const info: Record<TravelPhase, { labelKey: string; emoji: string; color: string }> = {
    inspiration: { labelKey: "planner.phase.inspiration", emoji: "✨", color: "text-purple-500" },
    research: { labelKey: "planner.phase.research", emoji: "🔍", color: "text-blue-500" },
    comparison: { labelKey: "planner.phase.comparison", emoji: "⚖️", color: "text-amber-500" },
    planning: { labelKey: "planner.phase.planning", emoji: "📋", color: "text-green-500" },
    booking: { labelKey: "planner.phase.booking", emoji: "✅", color: "text-emerald-500" },
  };
  
  const phaseInfo = info[phase];
  return {
    label: t(phaseInfo.labelKey),
    emoji: phaseInfo.emoji,
    color: phaseInfo.color,
  };
}
