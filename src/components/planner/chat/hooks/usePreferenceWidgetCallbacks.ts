/**
 * usePreferenceWidgetCallbacks - Encapsulates preference widget flow callbacks
 * Reduces complexity in PlannerChat by isolating preference widget logic
 * 
 * Phase 2: Integrated with useWidgetCooldown to prevent infinite loops
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ChatMessage } from "../types";
import type { InspireFlowStep } from "../MemoizedSmartSuggestions";
import type { WidgetType } from "@/types/flight";
import type { StyleAxes, MustHaves } from "@/stores/slices/preferenceTypes";
import type { UseWidgetCooldownReturn } from "./useWidgetCooldown";

interface PreferenceMemoryShape {
  preferences: {
    styleAxes: StyleAxes;
    interests: string[];
    mustHaves: MustHaves;
    dietaryRestrictions: string[];
  };
}

interface WidgetTrackingShape {
  trackStyleConfig: (axes: Record<string, number>) => void;
  trackInterestsSelect: (interests: string[]) => void;
  recordInteraction: (
    id: string,
    type: string,
    data: Record<string, unknown>,
    label: string
  ) => void;
}

interface UsePreferenceWidgetCallbacksOptions {
  prefMemory: PreferenceMemoryShape;
  widgetTracking: WidgetTrackingShape;
  setInspireFlowStep: (step: InspireFlowStep) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setDynamicSuggestions: React.Dispatch<
    React.SetStateAction<Array<{ id: string; label: string; emoji: string; message: string }>>
  >;
  handleFetchDestinations: (loadingMessageId: string) => Promise<void>;
  /** Widget cooldown system to prevent infinite loops */
  widgetCooldown?: UseWidgetCooldownReturn;
  /** Departure city from flight memory - used to check if we need to ask before fetching destinations */
  departureCityName?: string | null;
}

interface PreferenceWidgetCallbacks {
  onStyleContinue: () => void;
  onInterestsContinue: () => void;
  onMustHavesContinue: () => void;
  onDietaryContinue: () => void;
}

export function usePreferenceWidgetCallbacks({
  prefMemory,
  widgetTracking,
  setInspireFlowStep,
  setMessages,
  setDynamicSuggestions,
  handleFetchDestinations,
  widgetCooldown,
  departureCityName,
}: UsePreferenceWidgetCallbacksOptions): PreferenceWidgetCallbacks {
  const { t } = useTranslation();

  /**
   * Helper: check departure city before fetching destinations.
   * If missing, show a message asking for the departure city and a departure widget.
   * Returns true if departure is missing (fetch should be deferred).
   */
  const checkAndAskDepartureCity = useCallback((): boolean => {
    if (departureCityName) return false; // departure set, proceed

    // Departure city missing — ask user
    const askId = `ask-departure-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: askId,
        role: "assistant" as const,
        text: t("planner.preference.askDepartureCity"),
      },
    ]);
    setDynamicSuggestions([]);
    return true; // departure missing
  }, [departureCityName, setMessages, setDynamicSuggestions, t]);

  /**
   * Called when user completes style widget
   */
  const onStyleContinue = useCallback(() => {
    try {
      // CRITICAL: Record widget confirmation to prevent re-triggering
      widgetCooldown?.recordWidgetConfirmed("preferenceStyle");
      
      // Track style configuration
      const styleAxes = prefMemory.preferences.styleAxes;
      widgetTracking.trackStyleConfig({ ...styleAxes });

      // Build style summary for display
      const styleLabels: string[] = [];
      if (styleAxes.chillVsIntense > 60) styleLabels.push(t("planner.style.intense"));
      else if (styleAxes.chillVsIntense < 40) styleLabels.push(t("planner.style.chill"));
      if (styleAxes.ecoVsLuxury > 60) styleLabels.push(t("planner.style.luxury"));
      else if (styleAxes.ecoVsLuxury < 40) styleLabels.push(t("planner.style.eco"));
      const styleLabel = styleLabels.length > 0 ? styleLabels.join(", ") : t("planner.style.balanced");

      // Mark current style widget as confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.widget === "preferenceStyle" && !m.widgetConfirmed
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: styleAxes, widgetDisplayLabel: styleLabel }
            : m
        )
      );

      // Check if interests widget can be shown (cooldown check)
      if (widgetCooldown && !widgetCooldown.canShowWidget("preferenceInterests")) {
        // Skip interests, go directly to extra step
        setInspireFlowStep("extra");
        return;
      }

      // After style, show interests widget
      widgetCooldown?.recordWidgetShown("preferenceInterests");
      setInspireFlowStep("interests");
      const interestsId = `pref-interests-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: interestsId,
          role: "assistant",
          text: t("planner.preference.selectInterests"),
          widget: "preferenceInterests" as WidgetType,
        },
      ]);
    } catch (error) {
      console.error("[PreferenceCallbacks] onStyleContinue error:", error);
      toast.error(t("common.error"));
    }
  }, [prefMemory.preferences.styleAxes, widgetTracking, setInspireFlowStep, setMessages, t, widgetCooldown]);

  /**
   * Called when user completes interests widget
   */
  const onInterestsContinue = useCallback(() => {
    try {
      // CRITICAL: Record widget confirmation to prevent re-triggering
      widgetCooldown?.recordWidgetConfirmed("preferenceInterests");
      
      const interests = prefMemory.preferences.interests;
      widgetTracking.trackInterestsSelect(interests);

      const interestsLabel = interests.length > 0
        ? interests.slice(0, 3).join(", ") + (interests.length > 3 ? ` +${interests.length - 3}` : "")
        : t("planner.preference.noInterests");

      setMessages((prev) =>
        prev.map((m) =>
          m.widget === "preferenceInterests" && !m.widgetConfirmed
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: interests, widgetDisplayLabel: interestsLabel }
            : m
        )
      );

      setInspireFlowStep("extra");
      const questionId = `extra-question-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: questionId, role: "assistant", text: t("planner.preference.anythingElse") },
      ]);

      const suggestions: Array<{ id: string; label: string; emoji: string; message: string }> = [];
      if (!widgetCooldown || widgetCooldown.canShowWidget("mustHaves")) {
        suggestions.push({ id: "must-haves", label: t("planner.mustHaves.title"), emoji: "⚠️", message: t("planner.suggestion.configureMustHaves") });
      }
      if (!widgetCooldown || widgetCooldown.canShowWidget("dietary")) {
        suggestions.push({ id: "dietary", label: t("planner.dietary.title"), emoji: "🍽️", message: t("planner.suggestion.configureDietary") });
      }
      suggestions.push({ id: "nothing-else", label: t("planner.suggestion.nothingElse"), emoji: "✈️", message: "__FETCH_DESTINATIONS__" });
      setDynamicSuggestions(suggestions);
    } catch (error) {
      console.error("[PreferenceCallbacks] onInterestsContinue error:", error);
      toast.error(t("common.error"));
    }
  }, [prefMemory.preferences.interests, widgetTracking, setInspireFlowStep, setMessages, setDynamicSuggestions, t, widgetCooldown]);

  /**
   * Called when user completes must-haves widget
   */
  const onMustHavesContinue = useCallback(() => {
    try {
      widgetCooldown?.recordWidgetConfirmed("mustHaves");
      const mustHaves = prefMemory.preferences.mustHaves;
      widgetTracking.recordInteraction(`must-haves-${Date.now()}`, "must_haves_configured", { ...mustHaves }, t("planner.preference.mustHavesConfigured"));

      const activeHaves: string[] = [];
      if (mustHaves.accessibilityRequired) activeHaves.push(t("planner.mustHaves.accessibility"));
      if (mustHaves.petFriendly) activeHaves.push(t("planner.mustHaves.petFriendly"));
      if (mustHaves.familyFriendly) activeHaves.push(t("planner.mustHaves.familyFriendly"));
      if (mustHaves.highSpeedWifi) activeHaves.push(t("planner.mustHaves.wifi"));
      const mustHavesLabel = activeHaves.length > 0 ? activeHaves.join(", ") : t("planner.mustHaves.none");

      setMessages((prev) =>
        prev.map((m) =>
          m.widget === "mustHaves" && !m.widgetConfirmed
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: mustHaves, widgetDisplayLabel: mustHavesLabel }
            : m
        )
      );

      const questionId = `after-musthaves-${Date.now()}`;
      setMessages((prev) => [...prev, { id: questionId, role: "assistant", text: t("planner.preference.afterMustHaves") }]);

      const suggestions: Array<{ id: string; label: string; emoji: string; message: string }> = [];
      if (!widgetCooldown || widgetCooldown.canShowWidget("dietary")) {
        suggestions.push({ id: "dietary", label: t("planner.dietary.title"), emoji: "🍽️", message: t("planner.suggestion.configureDietary") });
      }
      suggestions.push({ id: "nothing-else", label: t("planner.suggestion.nothingElse"), emoji: "✈️", message: "__FETCH_DESTINATIONS__" });
      setDynamicSuggestions(suggestions);
    } catch (error) {
      console.error("[PreferenceCallbacks] onMustHavesContinue error:", error);
      toast.error(t("common.error"));
    }
  }, [prefMemory.preferences.mustHaves, widgetTracking, setMessages, setDynamicSuggestions, t, widgetCooldown]);

  const onDietaryContinue = useCallback(() => {
    try {
      widgetCooldown?.recordWidgetConfirmed("dietary");
      const dietary = prefMemory.preferences.dietaryRestrictions;
      if (dietary.length > 0) {
        widgetTracking.recordInteraction(`dietary-${Date.now()}`, "dietary_configured", { restrictions: dietary }, t("planner.preference.dietaryConfigured", { restrictions: dietary.join(", ") }));
      }

      const dietaryLabel = dietary.length > 0 ? dietary.join(", ") : t("planner.dietary.none");

      setMessages((prev) =>
        prev.map((m) =>
          m.widget === "dietary" && !m.widgetConfirmed
            ? { ...m, widgetConfirmed: true, widgetSelectedValue: dietary, widgetDisplayLabel: dietaryLabel }
            : m
        )
      );

      if (checkAndAskDepartureCity()) return;

      const loadingId = `fetching-destinations-${Date.now()}`;
      setMessages((prev) => [...prev, { id: loadingId, role: "assistant", text: t("planner.preference.searchingDestinations"), isTyping: true }]);
      setDynamicSuggestions([]);
      handleFetchDestinations(loadingId);
    } catch (error) {
      console.error("[PreferenceCallbacks] onDietaryContinue error:", error);
      toast.error(t("common.error"));
    }
  }, [prefMemory.preferences.dietaryRestrictions, widgetTracking, setMessages, setDynamicSuggestions, handleFetchDestinations, t, widgetCooldown, checkAndAskDepartureCity]);

  return {
    onStyleContinue,
    onInterestsContinue,
    onMustHavesContinue,
    onDietaryContinue,
  };
}
