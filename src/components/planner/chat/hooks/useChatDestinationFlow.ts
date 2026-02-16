/**
 * useChatDestinationFlow - Manages destination suggestion fetching and selection
 * 
 * Extracted from PlannerChat.tsx to eliminate duplication and improve maintainability.
 * Handles: fetching destination suggestions, processing selection, triggering city fetching.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DestinationSuggestion } from "@/types/destinations";
import type { WidgetType } from "@/types/flight";
import type { TripPreferences } from "@/stores/slices/preferenceTypes";
import type { ChatMessage } from "../types";
import { getDestinationSuggestions } from "@/services/destinations";
import { buildDestinationPayload } from "../utils/buildDestinationPayload";
import { supabaseFetch } from "@/utils/supabaseFetch";
import { generateId, updateMessageById } from "../utils/messageHelpers";
import type { InspireFlowStep } from "../MemoizedSmartSuggestions";

interface UseChatDestinationFlowOptions {
  getPreferences: () => TripPreferences;
  departureCity: string | undefined;
  departureCountry: string | undefined;
  departureDateMs: number | undefined;
  tripDuration: string | undefined;
  updateMemory: (partial: Record<string, unknown>) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  widgetTracking: {
    trackDestinationSelect: (countryName: string, countryCode: string) => void;
  };
}

export interface UseChatDestinationFlowReturn {
  destinationSuggestions: DestinationSuggestion[];
  destinationProfileScore: number;
  isLoadingDestinations: boolean;
  inspireFlowStep: InspireFlowStep;
  setInspireFlowStep: (step: InspireFlowStep) => void;
  /** Fetch destination suggestions and update a loading message in-place */
  handleFetchDestinations: (loadingMessageId: string) => Promise<void>;
  /** Handle inline destination suggestion request from LLM (during sendText) */
  handleLLMDestinationRequest: (
    messageId: string,
    requestedCount: number,
  ) => Promise<void>;
  /** Handle user selecting a destination from the grid */
  handleDestinationSelect: (messageId: string, destination: DestinationSuggestion) => Promise<void>;
}

export function useChatDestinationFlow({
  getPreferences,
  departureCity,
  departureCountry,
  departureDateMs,
  tripDuration,
  updateMemory,
  setMessages,
  widgetTracking,
}: UseChatDestinationFlowOptions): UseChatDestinationFlowReturn {
  const { t } = useTranslation();

  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [destinationProfileScore, setDestinationProfileScore] = useState(0);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [inspireFlowStep, setInspireFlowStep] = useState<InspireFlowStep>("idle");
  // F3: Auto-resume destination fetch when departure city becomes available
  const [pendingDestinationFetch, setPendingDestinationFetch] = useState(false);

  // F5: Refs to always have latest departure info (avoids stale closure in async calls)
  const departureCityRef = useRef(departureCity);
  const departureCountryRef = useRef(departureCountry);
  departureCityRef.current = departureCity;
  departureCountryRef.current = departureCountry;

  // Shared fetch logic — reads departure from refs to avoid stale closures
  const fetchSuggestions = useCallback(async (limit: number) => {
    const prefs = getPreferences();
    const payload = buildDestinationPayload({
      preferences: prefs,
      departure: { city: departureCityRef.current, country: departureCountryRef.current },
      departureDateMs,
      tripDuration,
    });
    return getDestinationSuggestions(payload, { limit });
  }, [getPreferences, departureDateMs, tripDuration]);

  // Preference-flow destination fetch (after style/interests widgets)
  const handleFetchDestinations = useCallback(async (loadingMessageId: string) => {
    setIsLoadingDestinations(true);
    setInspireFlowStep("loading");

    try {
      const response = await fetchSuggestions(3);

      if (response.success && response.suggestions.length > 0) {
        setDestinationSuggestions(response.suggestions);
        setDestinationProfileScore(response.basedOnProfile?.completionScore || 0);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMessageId
              ? {
                  ...m,
                  text: t(
                    response.suggestions.length > 1
                      ? "planner.messages.destinationsFoundPlural"
                      : "planner.messages.destinationsFound",
                    { count: response.suggestions.length, score: response.basedOnProfile?.completionScore || 0 },
                  ),
                  isTyping: false,
                  widget: "destinationSuggestions" as WidgetType,
                  widgetData: {
                    suggestions: response.suggestions,
                    basedOnProfile: response.basedOnProfile,
                  },
                }
              : m
          )
        );
        setInspireFlowStep("results");
      } else {
        setMessages(updateMessageById(loadingMessageId, { text: t("planner.messages.noDestinations"), isTyping: false }));
        setInspireFlowStep("idle");
      }
    } catch (error) {
      console.error("Error fetching destination suggestions:", error);
      setMessages(updateMessageById(loadingMessageId, { text: t("planner.messages.errorDestinations"), isTyping: false }));
      setInspireFlowStep("idle");
    } finally {
      setIsLoadingDestinations(false);
    }
  }, [fetchSuggestions, setMessages, t]);

  // Stable ref to handleFetchDestinations for the auto-resume effect
  const handleFetchRef = useRef(handleFetchDestinations);
  handleFetchRef.current = handleFetchDestinations;

  // F3: Auto-resume destination fetch when departureCity becomes available after a pending request
  useEffect(() => {
    if (pendingDestinationFetch && departureCity) {
      setPendingDestinationFetch(false);
      const loadingId = generateId("fetching");
      setMessages((prev) => [
        ...prev,
        { id: loadingId, role: "assistant" as const, text: t("planner.preference.searchingDestinations"), isTyping: true },
      ]);
      handleFetchRef.current(loadingId);
    }
  }, [departureCity, pendingDestinationFetch, setMessages, t]);

  // LLM-triggered destination suggestion request (during chat flow)
  const handleLLMDestinationRequest = useCallback(async (
    messageId: string,
    requestedCount: number,
  ) => {
    // A4: Dismiss any previous unconfirmed destination suggestion widgets
    setMessages((prev) =>
      prev.map((m) =>
        m.widget === "destinationSuggestions" && !m.widgetConfirmed
          ? { ...m, widget: undefined, widgetData: undefined }
          : m
      )
    );

    // A6: Guard — ensure we have a departure city before suggesting (read from ref to avoid stale closure)
    if (!departureCityRef.current) {
      // Don't overwrite the LLM message — add a NEW assistant message asking for departure city
      const askId = generateId("ask-departure");
      setMessages((prev) => {
        const cleaned = prev.map((m) =>
          m.id === messageId
            ? { ...m, isTyping: false, isStreaming: false }
            : m
        );
        return [
          ...cleaned,
          {
            id: askId,
            role: "assistant" as const,
            text: t("planner.messages.needDepartureCityFirst"),
          },
        ];
      });
      // F3: Mark pending so fetch auto-resumes when departureCity becomes available
      setPendingDestinationFetch(true);
      return;
    }

    // Show loading state on the existing message
    setMessages(updateMessageById(messageId, { isStreaming: false, isTyping: true }));

    try {
      const limit = Math.min(requestedCount, 5);
      const response = await fetchSuggestions(limit);

      if (response.success && response.suggestions.length > 0) {
        setDestinationSuggestions(response.suggestions);
        const completionScore = response.basedOnProfile?.completionScore || 0;
        setDestinationProfileScore(completionScore);

        // Build conditional quick replies for low profile scores
        const profileQuickReplies: import("../types").QuickReply[] = completionScore < 50 ? [
          {
            id: generateId("profile-prefs"),
            label: t("planner.suggestions.fillPreferences"),
            icon: "⚙️",
            action: { type: "navigate" as const, tab: "preferences" as const },
            variant: "primary" as const,
          },
          {
            id: generateId("profile-ok"),
            label: t("planner.suggestions.keepGoing"),
            icon: "👍",
            action: { type: "sendMessage" as const, message: t("planner.suggestions.keepGoing") },
          },
        ] : [];

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isTyping: false,
                  isStreaming: false,
                  widget: "destinationSuggestions" as WidgetType,
                  widgetData: {
                    suggestions: response.suggestions,
                    basedOnProfile: response.basedOnProfile,
                  },
                  quickReplies: profileQuickReplies.length > 0 ? profileQuickReplies : m.quickReplies,
                }
              : m
          )
        );
        setInspireFlowStep("results");
      } else {
        setMessages(updateMessageById(messageId, { text: t("planner.messages.noDestinationsHint"), isTyping: false, isStreaming: false }));
      }
    } catch (apiError) {
      console.error("Error fetching destination suggestions:", apiError);
      setMessages(updateMessageById(messageId, { text: t("planner.messages.errorDestinations"), isTyping: false, isStreaming: false }));
    }
  }, [fetchSuggestions, setMessages, t]);

  // Handle destination selection from DestinationSuggestionsGrid
  const handleDestinationSelect = useCallback(async (messageId: string, destination: DestinationSuggestion) => {
    // Track destination selection
    widgetTracking.trackDestinationSelect(destination.countryName, destination.countryCode);

    // Mark widget as confirmed
    setMessages(updateMessageById(messageId, {
      widgetConfirmed: true,
      widgetSelectedValue: destination,
      widgetDisplayLabel: destination.countryName,
    }));

    // Store country info — clear city to prevent stale data
    updateMemory({
      arrival: {
        city: undefined,
        iata: undefined,
        airport: undefined,
        countryCode: destination.countryCode,
        country: destination.countryName,
      },
    });

    // Reset inspire flow
    setInspireFlowStep("idle");
    setDestinationSuggestions([]);

    // Add loading message for city fetch
    const loadingId = generateId("city-loading");
    setMessages((prev) => [
      ...prev,
      {
        id: loadingId,
        role: "assistant",
        text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${t("planner.chat.searchingCities")}`,
        isTyping: true,
      },
    ]);

    // Fetch cities for the selected country
    try {
      const response = await supabaseFetch("top-cities-by-country", {
        method: "GET",
        params: { country_code: destination.countryCode, limit: "5" },
      });

      const data = await response.json();

      if (data.cities && data.cities.length > 0) {
        const cities = data.cities.map((c: { name: string; description?: string; population?: number }) => ({
          name: c.name,
          description: c.description || t("planner.chat.importantCity"),
          population: c.population,
        }));

        setMessages(updateMessageById(loadingId, {
          text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${destination.description}\n\n${t("planner.chat.whichCityToVisit")}`,
          isTyping: false,
          widget: "citySelector" as WidgetType,
          widgetData: {
            citySelection: {
              countryCode: destination.countryCode,
              countryName: destination.countryName,
              cities,
            },
            isDeparture: false,
          },
        }));
      } else {
        setMessages(updateMessageById(loadingId, {
          text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${t("planner.chat.whichCityToVisit")} ${t("planner.chat.typeInChat")}`,
          isTyping: false,
        }));
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      setMessages(updateMessageById(loadingId, {
        text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${t("planner.chat.whichCityToVisit")} ${t("planner.chat.typeInChat")}`,
        isTyping: false,
      }));
    }
  }, [widgetTracking, updateMemory, setMessages, t]);

  return {
    destinationSuggestions,
    destinationProfileScore,
    isLoadingDestinations,
    inspireFlowStep,
    setInspireFlowStep,
    handleFetchDestinations,
    handleLLMDestinationRequest,
    handleDestinationSelect,
  };
}
