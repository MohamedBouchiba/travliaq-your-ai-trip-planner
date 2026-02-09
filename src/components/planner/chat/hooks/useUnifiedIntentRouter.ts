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
        console.log(`[UnifiedIntentRouter] Widget ${widgetType} blocked by cooldown: ${reason}`);
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
        console.log(
          `[UnifiedIntentRouter] Skipping non-critical widget "${widgetType}" for expert user`
        );
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
    
    console.log("[UnifiedIntentRouter] Processing intent:", intent.primaryIntent, 
      "original:", intent.confidence, "boosted:", effectiveConfidence,
      "lang:", boostResult.detectedLanguage);
    
    // Handle undecided users with delegate suggestion
    if (boostResult.suggestedIntent === 'delegate_choice' && boostResult.frontendSignals.isUndecided) {
      if (onDelegateChoice) onDelegateChoice(intent);
      return { shouldShowWidget: false, widgetType: null, action: "delegate" };
    }
    
    // Check boosted confidence level (not original)
    if (effectiveConfidence < CONFIDENCE_THRESHOLDS.LOW && boostResult.shouldClarify) {
      console.log("[UnifiedIntentRouter] Low confidence after boost, requesting clarification");
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
        console.log("[UnifiedIntentRouter] Fallback citySelector blocked — no country selected");
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
      "ask_recommendations",
      "gather_preferences",
    ];
    
    // ============================================================================
    // COMPREHENSIVE KEYWORD TRIGGERS - Maps user keywords to widgets (sorted by priority)
    // ============================================================================
    const COMPREHENSIVE_KEYWORD_TRIGGERS: Array<{
      keywords: string[];
      widgetType: WidgetType;
      priority: number;
    }> = [
      // === DIETARY (priority 10 - highest) ===
      { 
        keywords: [
          // FR
          "végétarien", "végétarienne", "vegan", "végan", "halal", "casher", "kosher", 
          "sans gluten", "gluten", "lactose", "intolérant", "allergie", "allergique", 
          "régime", "restriction alimentaire", "alimentaire", "pescétarien", 
          "sans œuf", "sans noix", "noix", "arachide", "je mange",
          // EN
          "vegetarian", "vegan", "halal", "kosher", "gluten-free", "gluten free", 
          "lactose", "intolerant", "allergy", "allergic", "diet", "dietary", 
          "restriction", "pescatarian", "no eggs", "no nuts", "nut", "peanut"
        ],
        widgetType: "dietary",
        priority: 10
      },
      
      // === MUST-HAVES (priority 9) ===
      { 
        keywords: [
          // FR
          "fauteuil roulant", "fauteuil", "mobilité réduite", "pmr", "handicap", 
          "handicapé", "accessible", "accessibilité", "chien", "chat", "animal", 
          "animaux", "pet", "wifi obligatoire", "piscine", "famille nombreuse",
          "bébé", "poussette", "ascenseur", "rez-de-chaussée", "avec mon chien",
          "avec mon chat", "animal de compagnie",
          // EN
          "wheelchair", "mobility", "disability", "disabled", "accessible", 
          "accessibility", "dog", "cat", "pet", "pets", "wifi", "pool", 
          "baby", "stroller", "elevator", "ground floor", "with my dog", "with my cat"
        ],
        widgetType: "mustHaves",
        priority: 9
      },
      
      // === PREFERENCE INTERESTS (priority 7) ===
      { 
        keywords: [
          // FR - Direct interests
          "plage", "culture", "nature", "gastronomie", "cuisine locale", 
          "sport", "aventure", "bien-être", "wellness", "spa", "massage",
          "shopping", "histoire", "musée", "musées", "vie nocturne", "nightlife",
          "randonnée", "montagne", "mer", "océan", "lac", "forêt", "parc national",
          "temple", "église", "monument", "architecture", "art", "galerie",
          "festival", "concert", "théâtre", "danse", "photographie", "safari",
          "plongée", "snorkeling", "surf", "ski", "escalade", "vélo", "kayak",
          "j'aime", "j'adore", "je préfère", "passion", "passionné", "fan de",
          "découvrir", "explorer", "visiter", "beach", "farniente", "détente",
          // EN
          "beach", "culture", "nature", "gastronomy", "local food", "cuisine",
          "sport", "adventure", "wellness", "spa", "massage", "shopping",
          "history", "museum", "museums", "nightlife", "hiking", "mountain",
          "sea", "ocean", "lake", "forest", "national park", "temple", "church",
          "monument", "architecture", "art", "gallery", "festival", "concert",
          "theater", "dance", "photography", "safari", "diving", "snorkeling",
          "surfing", "skiing", "climbing", "cycling", "kayaking",
          "i like", "i love", "i prefer", "passion", "passionate", "fan of",
          "discover", "explore", "visit"
        ],
        widgetType: "preferenceInterests",
        priority: 7
      },
      
      // === PREFERENCE STYLE (priority 6) ===
      { 
        keywords: [
          // FR
          "luxe", "luxueux", "économique", "pas cher", "budget", "backpacker", 
          "routard", "premium", "haut de gamme", "5 étoiles", "4 étoiles",
          "confort", "confortable", "relax", "relaxant", "zen", "chill", 
          "intensif", "dynamique", "actif", "urbain", "campagne", 
          "rural", "authentique", "local", "touristique", "populaire",
          "tranquille", "calme", "animé", "festif", "romantique", "intime",
          "voyage économique", "voyage luxe", "voyage relax",
          // EN
          "luxury", "luxurious", "cheap", "budget", "backpacker", "backpacking",
          "premium", "high-end", "5 star", "4 star", "comfort", "comfortable",
          "relax", "relaxing", "chill", "intense", "dynamic", "active", 
          "urban", "city", "countryside", "rural", "authentic", "local", 
          "touristy", "popular", "quiet", "calm", "lively", "festive", "romantic",
          "budget trip", "luxury trip", "relaxing trip"
        ],
        widgetType: "preferenceStyle",
        priority: 6
      },
      
      // === DATE PICKER (priority 5) ===
      { 
        keywords: [
          // FR
          "quand partir", "quelle date", "quel mois", "dates", "départ", 
          "partir en", "voyage en", "janvier", "février", "mars", "avril", 
          "mai", "juin", "juillet", "août", "septembre", "octobre", 
          "novembre", "décembre", "été", "hiver", "printemps", "automne",
          "semaine prochaine", "mois prochain", "vacances", "congés",
          "pâques", "noël", "toussaint", "été prochain", "cet hiver",
          // EN
          "when to go", "what date", "which month", "dates", "departure",
          "travel in", "january", "february", "march", "april", "may", 
          "june", "july", "august", "september", "october", "november", 
          "december", "summer", "winter", "spring", "fall", "autumn",
          "next week", "next month", "vacation", "holiday", "easter",
          "christmas", "next summer", "this winter"
        ],
        widgetType: "datePicker",
        priority: 5
      },
      
      // === TRAVELERS SELECTOR (priority 5) ===
      { 
        keywords: [
          // FR
          "seul", "solo", "en solo", "couple", "à deux", "en couple",
          "famille", "en famille", "avec enfants", "groupe", "entre amis",
          "ami", "amis", "combien de personnes", "nombre de voyageurs",
          "adulte", "adultes", "enfant", "enfants", "bébé", "nourrisson",
          "nous sommes", "on est", "je suis seul", "on voyage", "voyager avec",
          "personnes", "voyageurs",
          // EN
          "alone", "solo", "by myself", "couple", "together", "as a couple",
          "family", "with family", "with children", "with kids", "group",
          "with friends", "friend", "friends", "how many people", "travelers",
          "adult", "adults", "child", "children", "baby", "infant",
          "we are", "traveling with", "i'm alone", "i'm traveling"
        ],
        widgetType: "travelersSelector",
        priority: 5
      },
      
      // === DESTINATION SUGGESTIONS (priority 4) ===
      { 
        keywords: [
          // FR
          "inspire", "inspire-moi", "où aller", "quelle destination", 
          "idée de voyage", "suggestion", "recommandation", "conseille-moi",
          "je ne sais pas où", "pas d'idée", "surprise", "surprise-moi",
          "propose-moi", "recommande-moi", "aide-moi à choisir",
          // EN
          "inspire", "inspire me", "where to go", "which destination",
          "travel idea", "suggestion", "recommendation", "suggest",
          "don't know where", "no idea", "surprise", "surprise me",
          "suggest me", "recommend me", "help me choose"
        ],
        widgetType: "destinationSuggestions",
        priority: 4
      }
    ];
    
    // Sort by priority (highest first)
    const sortedTriggers = [...COMPREHENSIVE_KEYWORD_TRIGGERS].sort((a, b) => b.priority - a.priority);
    
    // Check if user message contains keywords - works for ANY intent now
    if (lastUserMessage) {
      const messageLower = lastUserMessage.toLowerCase();
      
      for (const trigger of sortedTriggers) {
        const matchedKeyword = trigger.keywords.find(kw => messageLower.includes(kw));
        if (matchedKeyword) {
          const validation = canShowWidget(trigger.widgetType);
          if (validation.valid) {
            console.log(`[UnifiedIntentRouter] Keyword matched: "${matchedKeyword}" → ${trigger.widgetType} (priority ${trigger.priority})`);
            if (onWidgetTriggered) {
              onWidgetTriggered(trigger.widgetType);
            }
            return {
              shouldShowWidget: true,
              widgetType: trigger.widgetType,
              action: "none",
              reason: `User mentioned "${matchedKeyword}"`,
            };
          }
        }
      }
      
      // Check entities from intent classification as fallback
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
        if (entities.budgetLevel && canShowWidget("preferenceStyle").valid) {
          if (onWidgetTriggered) onWidgetTriggered("preferenceStyle");
          return { shouldShowWidget: true, widgetType: "preferenceStyle", action: "none", reason: "Budget/style detected" };
        }
      }
    }
    
    if (widgetTriggeringIntents.includes(intent.primaryIntent)) {
      const nextRequired = getNextRequiredWidget();
      
      if (nextRequired) {
        // Build widget data from entities if available
        const widgetData: Record<string, unknown> = {};
        
        if (intent.entities.preferredMonth) {
          widgetData.preferredMonth = intent.entities.preferredMonth;
        }
        if (intent.entities.tripDuration) {
          widgetData.tripDuration = intent.entities.tripDuration;
        }
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
    
    // Proactive destination guard — runs for ALL intents as last resort
    if (!flowState.hasDestination) {
      const hasPreferences = widgetInteractions.some(i => 
        i.interactionType === "style_configured" || i.interactionType === "interests_selected"
      );
      if (hasPreferences) {
        const destValidation = canShowWidget("destinationSuggestions");
        if (destValidation.valid) {
          console.log("[UnifiedIntentRouter] Preferences filled, no destination — auto-triggering destinationSuggestions");
          if (onWidgetTriggered) onWidgetTriggered("destinationSuggestions");
          return {
            shouldShowWidget: true,
            widgetType: "destinationSuggestions" as WidgetType,
            action: "none",
            reason: "Preferences filled, no destination — proactive suggestions",
          };
        }
      }
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
