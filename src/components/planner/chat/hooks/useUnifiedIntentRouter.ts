/**
 * Unified Intent Router Hook (Phase 2 - Intent Unification)
 *
 * This hook combines the functionality of useIntentHandler and useIntentRouter
 * into a single source of truth for widget triggering based on:
 * 1. Backend intent classification (primary source of truth)
 * 2. Flow state validation (prerequisites check)
 * 3. Fallback logic when backend classification fails
 * 4. Detection of already-provided information to avoid redundant widgets
 *
 * Pure logic is extracted to intentRouterCore.ts for testability.
 */

import { useCallback, useMemo, useRef } from "react";
import type { FlightMemory } from "@/stores/hooks";
import type { WidgetType } from "@/types/flight";
import type { IntentClassification } from "./useChatStream";
import type { WidgetInteraction } from "@/contexts/WidgetHistoryContext";
import { boostIntentConfidence } from "../services/intentConfidenceBooster";
import {
  computeFlowState,
  computeUserBehavior,
  hasAlreadyProvided as hasAlreadyProvidedCore,
  validateWidget,
  getNextRequiredWidget as getNextRequiredWidgetCore,
  evaluatePhaseTransition,
  isConversationalIntent,
  isWidgetTriggeringIntent,
  isCriticalWidget,
  CONFIDENCE_THRESHOLDS,
  type FlowState,
  type WidgetValidation,
  type IntentProcessResult,
  type UserBehavior,
} from "./intentRouterCore";
// Re-export types from core module for backward compatibility
export type { FlowState, WidgetValidation, IntentProcessResult, UserBehavior };

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
  const flowState = useMemo<FlowState>(() => computeFlowState(memory), [memory]);

  /**
   * Detect user behavior based on widget interaction history
   * This helps adapt the widget triggering strategy
   */
  const userBehavior = useMemo<UserBehavior>(() => computeUserBehavior(widgetInteractions), [widgetInteractions]);

  /**
   * Validate if a widget can be shown
   */
  const canShowWidget = useCallback(
    (widgetType: WidgetType): WidgetValidation => {
      return validateWidget(widgetType, flowState, widgetCooldown);
    },
    [flowState, widgetCooldown]
  );

  /**
   * Check if user already provided data for this widget type via a previous widget interaction
   * This prevents showing redundant widgets for already-provided information
   */
  const hasAlreadyProvided = useCallback(
    (widgetType: WidgetType): boolean => {
      return hasAlreadyProvidedCore(widgetType, widgetInteractions);
    },
    [widgetInteractions]
  );

  /**
   * Adaptive widget display based on user behavior
   * Critical widgets are always shown, non-critical only for guided users
   */
  const shouldShowWidgetAdaptive = useCallback(
    (widgetType: WidgetType): boolean => {
      if (isCriticalWidget(widgetType)) return true;
      if (userBehavior.style === "expert") {
        if (import.meta.env.DEV) console.log(`[UnifiedIntentRouter] Skipping non-critical widget "${widgetType}" for expert user`);
        return false;
      }
      return true;
    },
    [userBehavior.style]
  );

  /**
   * Get the next required widget based on flow state
   * Now checks hasAlreadyProvided to avoid redundant widgets
   */
  const getNextRequiredWidget = useCallback((): WidgetType | null => {
    return getNextRequiredWidgetCore(flowState, widgetInteractions);
  }, [flowState, widgetInteractions]);

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
    if (isConversationalIntent(intent.primaryIntent)) {
      return { shouldShowWidget: false, widgetType: null, action: "none" };
    }
    
    // No widget from backend - check if we should show the next required one
    
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
    if (isWidgetTriggeringIntent(intent.primaryIntent)) {
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
