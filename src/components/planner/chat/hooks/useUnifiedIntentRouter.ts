/**
 * Unified Intent Router Hook (Phase 2 - Intent Unification)
 *
 * This hook combines the functionality of useIntentHandler and useIntentRouter
 * into a single source of truth for widget triggering based on:
 * 1. Backend intent classification (primary source of truth)
 * 2. Flow state validation (prerequisites check)
 * 3. Fallback logic when backend classification fails
 * 4. Detection of already-provided information to avoid redundant widgets
 */

import { useCallback, useMemo, useRef } from "react";
import type { FlightMemory } from "@/stores/hooks";
import type { WidgetType } from "@/types/flight";
import type { IntentClassification } from "./useChatStream";
import type { WidgetInteraction } from "@/contexts/WidgetHistoryContext";
import { boostIntentConfidence } from "../services/intentConfidenceBooster";

/**
 * Flow state computed from memory
 */
export interface FlowState {
  hasDestination: boolean;
  hasDestinationCity: boolean;
  hasDepartureCity: boolean;
  hasDepartureDate: boolean;
  hasReturnDate: boolean;
  hasTravelers: boolean;
  hasTripType: boolean;
  tripType: "roundtrip" | "oneway" | "multi";
  isReadyToSearch: boolean;
}

/**
 * Widget validation result
 */
export interface WidgetValidation {
  valid: boolean;
  reason?: string;
  suggestedWidget?: WidgetType;
}

/**
 * Result of processing an intent
 */
export interface IntentProcessResult {
  shouldShowWidget: boolean;
  widgetType: WidgetType | null;
  widgetData?: Record<string, unknown>;
  action?: "search" | "delegate" | "clarify" | "none";
  reason?: string;
}

/**
 * Hook options
 */
export interface UseUnifiedIntentRouterOptions {
  memory: FlightMemory;
  /** Widget interaction history from useWidgetTracking */
  widgetInteractions?: WidgetInteraction[];
  /** Widget cooldown system to prevent infinite loops */
  widgetCooldown?: {
    canShowWidget: (widgetType: WidgetType) => boolean;
    getBlockReason: (widgetType: WidgetType) => string | null;
  };
  /** Last user message for confidence boosting */
  lastUserMessage?: string;
  /** Last assistant message for context */
  lastAssistantMessage?: string;
  onWidgetTriggered?: (widgetType: WidgetType, data?: Record<string, unknown>) => void;
  onSearchTriggered?: () => void;
  onDelegateChoice?: (intent: IntentClassification) => void;
}

/**
 * Hook return type
 */
export interface UseUnifiedIntentRouterReturn {
  /** Process a backend intent classification */
  processIntent: (intent: IntentClassification | null) => IntentProcessResult;

  /** Validate if a widget can be shown */
  canShowWidget: (widgetType: WidgetType) => WidgetValidation;

  /** Check if user already provided data for this widget type */
  hasAlreadyProvided: (widgetType: WidgetType) => boolean;

  /** Adaptive check: should we show this widget based on user behavior? */
  shouldShowWidgetAdaptive: (widgetType: WidgetType) => boolean;

  /** Get the next required widget based on flow state */
  getNextRequiredWidget: () => WidgetType | null;

  /** Get current flow state */
  flowState: FlowState;

  /** Get detected user behavior */
  userBehavior: UserBehavior;

  /** Get the last processed intent */
  lastIntent: IntentClassification | null;
}

/**
 * Confidence thresholds for intent processing
 */
const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40,
} as const;

/**
 * User behavior detection for adaptive widget triggering
 */
export interface UserBehavior {
  /** User prefers using widgets vs typing directly */
  prefersWidgets: boolean;
  /** Completion rate of shown widgets (0-1) */
  completionRate: number;
  /** User interaction style: "guided" needs more widgets, "expert" fewer */
  style: "guided" | "expert";
}

/**
 * Critical widgets that should always be shown regardless of user behavior
 * These collect essential information for flight search
 */
const CRITICAL_WIDGETS: WidgetType[] = [
  "citySelector",
  "dateRangePicker",
  "datePicker",
  "travelersSelector",
];

/**
 * Widget prerequisites - defines what's needed before showing each widget
 * More relaxed than before to allow flexible user journeys
 */
const WIDGET_PREREQUISITES: Record<WidgetType, (flow: FlowState) => WidgetValidation> = {
  // City selector can always be shown
  citySelector: () => ({ valid: true }),
  
  // Date widgets - always available (user might want to pick dates first)
  datePicker: () => ({ valid: true }),
  dateRangePicker: () => ({ valid: true }),
  returnDatePicker: (flow) => ({
    valid: flow.hasDepartureDate,
    reason: flow.hasDepartureDate ? undefined : "Departure date required first",
  }),
  
  // Travelers - always available
  travelersSelector: () => ({ valid: true }),
  
  // Trip type confirm - need travelers
  tripTypeConfirm: (flow) => ({
    valid: flow.hasTravelers,
    reason: flow.hasTravelers ? undefined : "Travelers count required first",
    suggestedWidget: flow.hasTravelers ? undefined : "travelersSelector",
  }),
  
  // Final confirmation - need all core info
  travelersConfirmBeforeSearch: (flow) => ({
    valid: flow.hasDestinationCity && flow.hasDepartureDate && flow.hasTravelers,
    reason: flow.isReadyToSearch ? undefined : "Complete trip info required",
  }),
  
  // Airport confirmation - need all core info
  airportConfirmation: (flow) => ({
    valid: flow.isReadyToSearch,
    reason: flow.isReadyToSearch ? undefined : "Complete trip info required",
  }),
  
  // Preference widgets can always be shown
  preferenceStyle: () => ({ valid: true }),
  preferenceInterests: () => ({ valid: true }),
  mustHaves: () => ({ valid: true }),
  dietary: () => ({ valid: true }),
  destinationSuggestions: () => ({ valid: true }),
  
  // Quick filter widgets - always available
  quickFilterChips: () => ({ valid: true }),
  starRatingSelector: () => ({ valid: true }),
  durationChips: () => ({ valid: true }),
  timeOfDayChips: () => ({ valid: true }),
  cabinClassSelector: () => ({ valid: true }),
  directFlightToggle: () => ({ valid: true }),
  budgetRangeSlider: () => ({ valid: true }),
  
  // Phase 4/5 widgets - pending implementation
  comparisonWidget: () => ({ valid: true }),
  conflictAlert: () => ({ valid: true }),
  priceAlert: () => ({ valid: true }),
};

/**
 * Widget type to interaction type mapping
 * Used to check if user already provided data for a widget type
 */
const WIDGET_TO_INTERACTION_MAP: Record<string, string[]> = {
  travelersSelector: ["travelers_selected"],
  travelersConfirmBeforeSearch: ["travelers_selected"],
  dateRangePicker: ["date_range_selected"],
  datePicker: ["date_selected"],
  returnDatePicker: ["date_selected"],
  citySelector: ["city_selected", "destination_selected"],
  destinationSuggestions: ["destination_selected"],
  tripTypeConfirm: ["trip_type_selected"],
  airportConfirmation: ["airport_selected"],
  preferenceStyle: ["style_configured"],
  preferenceInterests: ["interests_selected"],
  mustHaves: ["must_haves_configured"],
  dietary: ["dietary_configured"],
};

/**
 * ─── PRINCIPLE 1: State-Driven Phase Transitions ───
 * 
 * Pure function that evaluates flow state to determine if the next phase
 * should begin. Runs as a universal fallback regardless of intent type.
 * 
 * Phase order (from phased workflow):
 * 1. Discovery: preferences → destination suggestions
 * 2. Logistics: dates → travelers
 * 3. Accommodation, Activities, Recap (future)
 * 
 * Each guard checks: "Are the prerequisites for the NEXT step met, 
 * but that step hasn't started yet?"
 */
function evaluatePhaseTransition(
  flowState: FlowState,
  widgetInteractions: WidgetInteraction[],
  canShowWidget: (widgetType: WidgetType) => WidgetValidation,
  flightSearchTriggered?: boolean
): IntentProcessResult | null {
  // Guard 0: If flight search is triggered, skip ALL phase transitions
  // This prevents the search + datePicker conflict
  if (flightSearchTriggered) {
    if (import.meta.env.DEV) console.log("[evaluatePhaseTransition] Skipped — flight search active");
    return null;
  }

  const hasInteraction = (type: string) => 
    widgetInteractions.some(i => i.interactionType === type);

  // Guard 1: Preferences filled + no destination → suggest destinations
  if (!flowState.hasDestination) {
    const hasStyleOrInterests = hasInteraction("style_configured") || hasInteraction("interests_selected");
    if (hasStyleOrInterests && canShowWidget("destinationSuggestions").valid) {
      return {
        shouldShowWidget: true,
        widgetType: "destinationSuggestions" as WidgetType,
        action: "none",
        reason: "Phase transition: preferences complete → destination suggestions",
      };
    }
  }

  // Guard 2: Destination set + no dates → date picker
  // BUT skip if dates already confirmed via widget
  if (flowState.hasDestinationCity && !flowState.hasDepartureDate) {
    const hasDateConfirmation = hasInteraction("date_selected") || hasInteraction("date_range_selected");
    if (!hasDateConfirmation) {
      const hasDestinationInteraction = hasInteraction("destination_selected") || hasInteraction("city_selected");
      const dateWidget = flowState.tripType === "roundtrip" ? "dateRangePicker" : "datePicker";
      if (hasDestinationInteraction && canShowWidget(dateWidget).valid) {
        return {
          shouldShowWidget: true,
          widgetType: dateWidget as WidgetType,
          action: "none",
          reason: "Phase transition: destination complete → dates",
        };
      }
    }
  }

  // Guard 3: Dates set + travelers not confirmed → travelers selector
  // BUT skip if travelers already confirmed via widget
  if (flowState.hasDepartureDate && !hasInteraction("travelers_selected")) {
    const hasDateInteraction = hasInteraction("date_selected") || hasInteraction("date_range_selected");
    if (hasDateInteraction && canShowWidget("travelersSelector").valid) {
      return {
        shouldShowWidget: true,
        widgetType: "travelersSelector" as WidgetType,
        action: "none",
        reason: "Phase transition: dates complete → travelers",
      };
    }
  }

  // No transition needed
  return null;
}

/**
 * Unified Intent Router Hook
 */
export function useUnifiedIntentRouter({
  memory,
  widgetInteractions = [],
  widgetCooldown,
  lastUserMessage,
  lastAssistantMessage,
  onWidgetTriggered,
  onSearchTriggered,
  onDelegateChoice,
}: UseUnifiedIntentRouterOptions): UseUnifiedIntentRouterReturn {
  const lastIntentRef = useRef<IntentClassification | null>(null);

  /**
   * Compute current flow state from memory
   */
  const flowState = useMemo<FlowState>(() => {
    const hasDestination = !!(memory.arrival?.country || memory.arrival?.countryCode);
    const hasDestinationCity = !!memory.arrival?.city;
    const hasDepartureCity = !!memory.departure?.city;
    const hasDepartureDate = !!memory.departureDate;
    const hasReturnDate = !!memory.returnDate;
    const hasTravelers = (memory.passengers?.adults ?? 0) >= 1;
    const tripType = memory.tripType || "roundtrip";
    const hasTripType = !!memory.tripType;
    
    const isReadyToSearch = 
      hasDestinationCity && 
      hasDepartureDate && 
      (tripType === "oneway" || hasReturnDate) && 
      hasTravelers;
    
    return {
      hasDestination,
      hasDestinationCity,
      hasDepartureCity,
      hasDepartureDate,
      hasReturnDate,
      hasTravelers,
      hasTripType,
      tripType,
      isReadyToSearch,
    };
  }, [memory]);

  /**
   * Detect user behavior based on widget interaction history
   * This helps adapt the widget triggering strategy
   */
  const userBehavior = useMemo<UserBehavior>(() => {
    // Count completed vs dismissed/ignored interactions
    const completedTypes = [
      "date_selected",
      "date_range_selected",
      "travelers_selected",
      "trip_type_selected",
      "city_selected",
      "destination_selected",
      "style_configured",
      "interests_selected",
    ];

    const completed = widgetInteractions.filter((i) =>
      completedTypes.includes(i.interactionType)
    ).length;

    // If no interactions yet, default to guided mode
    if (widgetInteractions.length === 0) {
      return {
        prefersWidgets: true,
        completionRate: 1,
        style: "guided" as const,
      };
    }

    // Calculate completion rate (completed / total relevant interactions)
    const totalRelevant = widgetInteractions.length;
    const completionRate = totalRelevant > 0 ? completed / totalRelevant : 1;

    // Determine style based on completion rate
    // High completion rate = user likes widgets (guided)
    // Low completion rate = user prefers typing (expert)
    const style = completionRate >= 0.5 ? "guided" : "expert";
    const prefersWidgets = completionRate >= 0.5;

    return {
      prefersWidgets,
      completionRate,
      style: style as "guided" | "expert",
    };
  }, [widgetInteractions]);

  /**
   * Validate if a widget can be shown
   */
  const canShowWidget = useCallback(
    (widgetType: WidgetType): WidgetValidation => {
      // FIRST: Check cooldown system (prevents infinite loops)
      if (widgetCooldown && !widgetCooldown.canShowWidget(widgetType)) {
        const reason = widgetCooldown.getBlockReason(widgetType);
        if (import.meta.env.DEV) console.log(`[UnifiedIntentRouter] Widget ${widgetType} blocked by cooldown: ${reason}`);
        return { valid: false, reason: reason || 'blocked_by_cooldown' };
      }
      
      // THEN: Check prerequisites
      const validator = WIDGET_PREREQUISITES[widgetType];
      if (!validator) {
        return { valid: true };
      }
      return validator(flowState);
    },
    [flowState, widgetCooldown]
  );

  /**
   * Check if user already provided data for this widget type via a previous widget interaction
   * This prevents showing redundant widgets for already-provided information
   */
  const hasAlreadyProvided = useCallback(
    (widgetType: WidgetType): boolean => {
      const interactionTypes = WIDGET_TO_INTERACTION_MAP[widgetType];
      if (!interactionTypes || interactionTypes.length === 0) {
        return false;
      }

      // Check if any interaction matches the widget's expected types
      return widgetInteractions.some((interaction) =>
        interactionTypes.includes(interaction.interactionType)
      );
    },
    [widgetInteractions]
  );

  /**
   * Adaptive widget display based on user behavior
   * Critical widgets are always shown, non-critical only for guided users
   */
  const shouldShowWidgetAdaptive = useCallback(
    (widgetType: WidgetType): boolean => {
      // Critical widgets are always shown
      if (CRITICAL_WIDGETS.includes(widgetType)) {
        return true;
      }

      // For expert users, skip non-critical widgets
      if (userBehavior.style === "expert") {
        if (import.meta.env.DEV) console.log(`[UnifiedIntentRouter] Skipping non-critical widget "${widgetType}" for expert user`);
        return false;
      }

      // Guided users get all widgets
      return true;
    },
    [userBehavior.style]
  );

  /**
   * Get the next required widget based on flow state
   * Now checks hasAlreadyProvided to avoid redundant widgets
   */
  const getNextRequiredWidget = useCallback((): WidgetType | null => {
    // Priority order for collecting data
    // Each check now also verifies the user hasn't already provided this via widget

    if (!flowState.hasDestinationCity && !hasAlreadyProvided("citySelector")) {
      // Only show citySelector if a country is already selected
      // Otherwise, the user needs to pick a destination first
      if (flowState.hasDestination) {
        return "citySelector";
      }
      // No country selected — don't force citySelector, let LLM guide destination discovery
      return null;
    }

    if (!flowState.hasDepartureDate) {
      const dateWidget = flowState.tripType === "roundtrip" ? "dateRangePicker" : "datePicker";
      if (!hasAlreadyProvided(dateWidget)) {
        return dateWidget;
      }
    }

    if (flowState.tripType === "roundtrip" && !flowState.hasReturnDate) {
      if (!hasAlreadyProvided("dateRangePicker")) {
        return "dateRangePicker";
      }
    }

    if (!flowState.hasTravelers && !hasAlreadyProvided("travelersSelector")) {
      return "travelersSelector";
    }

    if (!flowState.hasTripType && !hasAlreadyProvided("tripTypeConfirm")) {
      return "tripTypeConfirm";
    }

    if (flowState.isReadyToSearch && !hasAlreadyProvided("travelersConfirmBeforeSearch")) {
      return "travelersConfirmBeforeSearch";
    }

    return null;
  }, [flowState, hasAlreadyProvided]);

  /**
   * Process a backend intent classification
   * This is the main entry point - trusts the backend as source of truth
   * Now enhanced with frontend confidence boosting
   */
  const processIntent = useCallback((intent: IntentClassification | null): IntentProcessResult => {
    lastIntentRef.current = intent;
    
    if (!intent) {
      return { shouldShowWidget: false, widgetType: null, action: "none" };
    }
    
    // BOOST CONFIDENCE: Cross-reference with frontend analysis
    const boostResult = boostIntentConfidence(intent, lastUserMessage || '', lastAssistantMessage);
    const effectiveConfidence = boostResult.boostedConfidence;
    
    if (import.meta.env.DEV) console.log("[UnifiedIntentRouter] Processing intent:", intent.primaryIntent, 
      "original:", intent.confidence, "boosted:", effectiveConfidence);
    
    // Handle undecided users with delegate suggestion
    if (boostResult.suggestedIntent === 'delegate_choice' && boostResult.frontendSignals.isUndecided) {
      if (onDelegateChoice) onDelegateChoice(intent);
      return { shouldShowWidget: false, widgetType: null, action: "delegate" };
    }
    
    // Check boosted confidence level (not original)
    if (effectiveConfidence < CONFIDENCE_THRESHOLDS.LOW && boostResult.shouldClarify) {
      if (import.meta.env.DEV) console.log("[UnifiedIntentRouter] Low confidence after boost, requesting clarification");
      return { 
        shouldShowWidget: false, 
        widgetType: null, 
        action: "clarify",
        reason: (intent as IntentClassification & { clarificationQuestion?: string }).clarificationQuestion || "Please clarify your request",
      };
    }
    
    // Handle special actions
    if (intent.primaryIntent === "trigger_search") {
      if (onSearchTriggered) onSearchTriggered();
      return { shouldShowWidget: false, widgetType: null, action: "search" };
    }
    
    if (intent.primaryIntent === "delegate_choice") {
      if (onDelegateChoice) onDelegateChoice(intent);
      return { shouldShowWidget: false, widgetType: null, action: "delegate" };
    }
    
    // TRUST THE BACKEND: If backend specified a widget, validate and use it
    if (intent.widgetToShow?.type) {
      const widgetType = intent.widgetToShow.type as WidgetType;
      const validation = canShowWidget(widgetType);
      
      if (validation.valid) {
        if (onWidgetTriggered) {
          onWidgetTriggered(widgetType, intent.widgetToShow.data);
        }
        return {
          shouldShowWidget: true,
          widgetType,
          widgetData: intent.widgetToShow.data,
          action: "none",
          reason: intent.widgetToShow.reason,
        };
      }
      
      // Widget can't be shown, use suggested fallback or next required
      let fallbackWidget = validation.suggestedWidget || getNextRequiredWidget();

      // Guard: don't fallback to citySelector if no country is selected
      if (fallbackWidget === "citySelector" && !flowState.hasDestination) {
        if (import.meta.env.DEV) console.log("[UnifiedIntentRouter] Fallback citySelector blocked — no country selected");
        const hasPreferences = widgetInteractions.some(i => 
          i.interactionType === "style_configured" || i.interactionType === "interests_selected"
        );
        if (hasPreferences) {
          const destValidation = canShowWidget("destinationSuggestions");
          fallbackWidget = destValidation.valid ? "destinationSuggestions" : null;
        } else {
          fallbackWidget = null;
        }
      }

      if (fallbackWidget) {
        if (onWidgetTriggered) {
          onWidgetTriggered(fallbackWidget);
        }
        return {
          shouldShowWidget: true,
          widgetType: fallbackWidget,
          action: "none",
          reason: validation.reason || "Fallback to required widget",
        };
      }
    }
    
    // Conversational intents: never auto-trigger widgets
    const conversationalIntents = [
      "other", "ask_question", "ask_recommendations",
      "compare_options", "greeting", "thank_you"
    ];
    if (conversationalIntents.includes(intent.primaryIntent)) {
      return { shouldShowWidget: false, widgetType: null, action: "none" };
    }
    
    // No widget from backend - check if we should show the next required one
    // Only do this for intents that typically need a widget
    const widgetTriggeringIntents = [
      "provide_destination",
      "provide_dates",
      "provide_duration",
      "flexible_dates",
      "provide_travelers",
      "specify_composition",
      "confirm_selection",
      "express_preference",
      "express_constraint",
      "ask_inspiration",
      "gather_preferences",
    ];
    
    // ─── Fix 2: Removed COMPREHENSIVE_KEYWORD_TRIGGERS ───
    // Widget triggering is now handled entirely by:
    // 1. Backend intent classifier (widgetToShow)
    // 2. Entity-based fallback (below)
    // 3. evaluatePhaseTransition() (universal fallback)
    
    // Check entities from intent classification as fallback
    if (lastUserMessage) {
      if (intent.entities) {
        const entities = intent.entities as Record<string, unknown>;
        if (entities.dietaryRestrictions && canShowWidget("dietary").valid) {
          if (onWidgetTriggered) onWidgetTriggered("dietary");
          return { shouldShowWidget: true, widgetType: "dietary", action: "none", reason: "Dietary restrictions detected" };
        }
        if ((entities.accessibilityRequired || entities.petFriendly) && canShowWidget("mustHaves").valid) {
          if (onWidgetTriggered) onWidgetTriggered("mustHaves");
          return { shouldShowWidget: true, widgetType: "mustHaves", action: "none", reason: "Must-haves detected" };
        }
        if (entities.interests && Array.isArray(entities.interests) && (entities.interests as unknown[]).length > 0 && canShowWidget("preferenceInterests").valid) {
          if (onWidgetTriggered) onWidgetTriggered("preferenceInterests");
          return { shouldShowWidget: true, widgetType: "preferenceInterests", action: "none", reason: "Interests detected" };
        }
        if (entities.budgetLevel && canShowWidget("budgetRangeSlider").valid) {
          if (onWidgetTriggered) onWidgetTriggered("budgetRangeSlider");
          return { shouldShowWidget: true, widgetType: "budgetRangeSlider", action: "none", reason: "Budget level detected" };
        }
      }
    }
    
    // Intent-specific: if this intent triggers widgets AND there's a next required widget, show it
    if (widgetTriggeringIntents.includes(intent.primaryIntent)) {
      const nextRequired = getNextRequiredWidget();
      
      if (nextRequired) {
        const widgetData: Record<string, unknown> = {};
        if (intent.entities.preferredMonth) widgetData.preferredMonth = intent.entities.preferredMonth;
        if (intent.entities.tripDuration) widgetData.tripDuration = intent.entities.tripDuration;
        if (intent.entities.destinationCountryCode) {
          widgetData.countryCode = intent.entities.destinationCountryCode;
          widgetData.countryName = intent.entities.destinationCountry;
        }
        
        if (onWidgetTriggered) {
          onWidgetTriggered(nextRequired, Object.keys(widgetData).length > 0 ? widgetData : undefined);
        }
        
        return {
          shouldShowWidget: true,
          widgetType: nextRequired,
          widgetData: Object.keys(widgetData).length > 0 ? widgetData : undefined,
          action: "none",
          reason: `Next required: ${nextRequired}`,
        };
      }
    }
    
    // ─── PRINCIPLE 1: State-driven phase transitions ───
    // Universal fallback that runs for ALL intents.
    // Evaluates flow state to determine if the next phase should start,
    // regardless of what the intent classifier returned.
    // Pass flightSearchTrigger status to prevent search + widget conflicts
    const isSearchIntent = intent.primaryIntent === "trigger_search" || intent.primaryIntent === "confirm_selection";
    const phaseTransition = evaluatePhaseTransition(flowState, widgetInteractions, canShowWidget, isSearchIntent);
    if (phaseTransition) {
      if (import.meta.env.DEV) console.log("[UnifiedIntentRouter] Phase transition triggered:", phaseTransition.reason);
      if (phaseTransition.widgetType && onWidgetTriggered) {
        onWidgetTriggered(phaseTransition.widgetType);
      }
      return phaseTransition;
    }
    
    return { shouldShowWidget: false, widgetType: null, action: "none" };
  }, [canShowWidget, getNextRequiredWidget, onWidgetTriggered, onSearchTriggered, onDelegateChoice, lastUserMessage]);

  return {
    processIntent,
    canShowWidget,
    hasAlreadyProvided,
    shouldShowWidgetAdaptive,
    getNextRequiredWidget,
    flowState,
    userBehavior,
    lastIntent: lastIntentRef.current,
  };
}

export default useUnifiedIntentRouter;
