/**
 * Intent Router Hook
 * 
 * Routes classified intents to appropriate widgets based on:
 * 1. The detected intent from the backend
 * 2. The current flow state (what data is already collected)
 * 3. Validation rules for widget prerequisites
 * 
 * This hook provides a single source of truth for widget triggering.
 */

import { useCallback, useMemo } from "react";
import type { FlightMemory } from "@/stores/hooks";
import type { WidgetType } from "@/types/flight";
import type {
  ClassifiedIntent,
  ExtractedEntities,
  FlowState,
  IntentWidgetRule,
  WidgetValidation,
  IntentType,
} from "../typeDefs/intent";

/**
 * Widget rule definitions - maps intents to widgets with conditions
 */
const INTENT_WIDGET_RULES: IntentWidgetRule[] = [
  // Destination intents
  {
    intent: "provide_destination",
    widgets: [
      {
        type: "citySelector",
        condition: (_, entities) => !!entities.destinationCountryCode && !entities.destinationCity,
        priority: 1,
        reason: "Country mentioned without city - need city selection"
      }
    ]
  },
  
  // Date intents
  {
    intent: "provide_dates",
    widgets: [
      {
        type: "dateRangePicker",
        condition: (flow, entities) => 
          flow.hasDestinationCity && 
          !flow.hasDepartureDate && 
          flow.tripType === "roundtrip" &&
          !entities.exactDepartureDate,
        priority: 1,
        reason: "Destination set, need dates for roundtrip"
      },
      {
        type: "datePicker",
        condition: (flow, entities) => 
          flow.hasDestinationCity && 
          !flow.hasDepartureDate && 
          flow.tripType === "oneway" &&
          !entities.exactDepartureDate,
        priority: 1,
        reason: "Destination set, need date for one-way"
      }
    ]
  },
  
  {
    intent: "provide_duration",
    widgets: [
      {
        type: "datePicker",
        condition: (flow) => 
          flow.hasDestinationCity && !flow.hasDepartureDate,
        priority: 1,
        reason: "Duration provided, need departure date to calculate return"
      }
    ]
  },
  
  // Traveler intents
  {
    intent: "provide_travelers",
    widgets: [
      {
        type: "travelersSelector",
        condition: (flow, entities) => 
          flow.hasDepartureDate && 
          !flow.hasTravelers &&
          !entities.adults,
        priority: 1,
        reason: "Dates set, need traveler count"
      }
    ]
  },
  
  {
    intent: "specify_composition",
    widgets: [
      {
        type: "travelersSelector",
        condition: (_, entities) => 
          entities.travelStyle === "family" || 
          entities.travelStyle === "friends" ||
          entities.travelStyle === "group",
        priority: 1,
        reason: "Vague traveler composition - need exact count"
      }
    ]
  },
  
  // Inspiration intents
  {
    intent: "ask_inspiration",
    widgets: [
      {
        type: "preferenceStyle",
        condition: () => true,
        priority: 1,
        reason: "User wants inspiration - show style preferences"
      }
    ]
  },
  
  {
    intent: "ask_recommendations",
    widgets: [
      {
        type: "destinationSuggestions",
        condition: () => true,
        priority: 1,
        reason: "User asked for recommendations"
      }
    ]
  },
  
  // Confirmation intents
  {
    intent: "confirm_selection",
    widgets: [
      {
        type: "tripTypeConfirm",
        condition: (flow) => 
          flow.hasDepartureDate && 
          flow.hasTravelers && 
          !flow.hasTripType,
        priority: 1,
        reason: "Travelers confirmed, need trip type"
      },
      {
        type: "travelersConfirmBeforeSearch",
        condition: (flow) => 
          flow.isReadyToSearch,
        priority: 2,
        reason: "All data collected, confirm before search"
      }
    ]
  }
];

/**
 * Prerequisite validation rules for each widget
 */
const WIDGET_PREREQUISITES: Record<WidgetType, (flow: FlowState) => WidgetValidation> = {
  citySelector: (flow) => ({
    valid: true, // citySelector can always be shown when country is detected
    reason: undefined
  }),
  
  datePicker: (flow) => ({
    valid: flow.hasDestinationCity,
    reason: flow.hasDestinationCity ? undefined : "Destination city required first",
    suggestedWidget: flow.hasDestinationCity ? undefined : "citySelector"
  }),
  
  dateRangePicker: (flow) => ({
    valid: flow.hasDestinationCity,
    reason: flow.hasDestinationCity ? undefined : "Destination city required first",
    suggestedWidget: flow.hasDestinationCity ? undefined : "citySelector"
  }),
  
  returnDatePicker: (flow) => ({
    valid: flow.hasDepartureDate,
    reason: flow.hasDepartureDate ? undefined : "Departure date required first"
  }),
  
  travelersSelector: (flow) => ({
    valid: flow.hasDepartureDate,
    reason: flow.hasDepartureDate ? undefined : "Dates required first",
    suggestedWidget: flow.hasDepartureDate ? undefined : "dateRangePicker"
  }),
  
  tripTypeConfirm: (flow) => ({
    valid: flow.hasTravelers,
    reason: flow.hasTravelers ? undefined : "Travelers count required first",
    suggestedWidget: flow.hasTravelers ? undefined : "travelersSelector"
  }),
  
  travelersConfirmBeforeSearch: (flow) => ({
    valid: flow.hasDestinationCity && flow.hasDepartureDate && flow.hasTravelers,
    reason: flow.isReadyToSearch ? undefined : "Complete trip info required"
  }),
  
  airportConfirmation: (flow) => ({
    valid: flow.isReadyToSearch,
    reason: flow.isReadyToSearch ? undefined : "Complete trip info required"
  }),
  
  // Preference widgets can be shown anytime
  preferenceStyle: () => ({ valid: true }),
  preferenceInterests: () => ({ valid: true }),
  mustHaves: () => ({ valid: true }),
  dietary: () => ({ valid: true }),
  destinationSuggestions: () => ({ valid: true }),
  
  // Quick filter widgets
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
  tripRecap: () => ({ valid: true }),
};

/**
 * Hook options
 */
export interface UseIntentRouterOptions {
  memory: FlightMemory;
}

/**
 * Hook return type
 */
export interface UseIntentRouterReturn {
  /** Route an intent to widgets */
  routeIntent: (intent: ClassifiedIntent) => Array<{
    type: WidgetType;
    reason: string;
    data?: Record<string, unknown>;
  }>;
  
  /** Validate if a widget can be shown */
  canShowWidget: (widgetType: WidgetType) => WidgetValidation;
  
  /** Get the next required widget based on flow state */
  getNextRequiredWidget: () => WidgetType | null;
  
  /** Get current flow state */
  flowState: FlowState;
  
  /** Determine fallback widget when intent detection fails */
  getFallbackWidget: () => WidgetType | null;
}

/**
 * Intent Router Hook
 */
export function useIntentRouter({ memory }: UseIntentRouterOptions): UseIntentRouterReturn {
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
      isReadyToSearch
    };
  }, [memory]);
  
  /**
   * Validate if a widget can be shown
   */
  const canShowWidget = useCallback((widgetType: WidgetType): WidgetValidation => {
    const validator = WIDGET_PREREQUISITES[widgetType];
    if (!validator) {
      return { valid: true };
    }
    return validator(flowState);
  }, [flowState]);
  
  /**
   * Route an intent to appropriate widgets
   */
  const routeIntent = useCallback((intent: ClassifiedIntent) => {
    const result: Array<{ type: WidgetType; reason: string; data?: Record<string, unknown> }> = [];
    
    // First, check if backend already specified a widget
    if (intent.widgets && intent.widgets.length > 0) {
      for (const widget of intent.widgets) {
        const validation = canShowWidget(widget.type);
        if (validation.valid) {
          result.push({
            type: widget.type,
            reason: widget.reason,
            data: widget.data
          });
        }
      }
      if (result.length > 0) {
        return result;
      }
    }
    
    // Otherwise, use intent rules
    const matchingRules = INTENT_WIDGET_RULES.filter(r => r.intent === intent.primaryIntent);
    
    for (const rule of matchingRules) {
      for (const widget of rule.widgets) {
        // Check condition if it exists
        if (widget.condition && !widget.condition(flowState, intent.entities)) {
          continue;
        }
        
        // Validate prerequisites
        const validation = canShowWidget(widget.type);
        if (!validation.valid) {
          // If widget can't be shown, try suggested alternative
          if (validation.suggestedWidget) {
            result.push({
              type: validation.suggestedWidget,
              reason: validation.reason || "Prerequisites not met"
            });
          }
          continue;
        }
        
        result.push({
          type: widget.type,
          reason: widget.reason
        });
      }
    }
    
    // Sort by priority and return first widget only
    return result.slice(0, 1);
  }, [flowState, canShowWidget]);
  
  /**
   * Get the next required widget based on flow state
   */
  const getNextRequiredWidget = useCallback((): WidgetType | null => {
    // Priority order for collecting data
    if (!flowState.hasDestinationCity) {
      return "citySelector";
    }
    if (!flowState.hasDepartureDate) {
      return flowState.tripType === "roundtrip" ? "dateRangePicker" : "datePicker";
    }
    if (flowState.tripType === "roundtrip" && !flowState.hasReturnDate) {
      return "dateRangePicker";
    }
    if (!flowState.hasTravelers) {
      return "travelersSelector";
    }
    if (!flowState.hasTripType) {
      return "tripTypeConfirm";
    }
    if (flowState.isReadyToSearch) {
      return "travelersConfirmBeforeSearch";
    }
    
    return null;
  }, [flowState]);
  
  /**
   * Get fallback widget when intent detection fails or is uncertain
   */
  const getFallbackWidget = useCallback((): WidgetType | null => {
    return getNextRequiredWidget();
  }, [getNextRequiredWidget]);
  
  return {
    routeIntent,
    canShowWidget,
    getNextRequiredWidget,
    flowState,
    getFallbackWidget
  };
}
