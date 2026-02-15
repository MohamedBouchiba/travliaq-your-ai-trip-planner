/**
 * useChatDestinationFlow - Manages destination suggestion fetching and selection
 * 
 * Extracted from PlannerChat.tsx to eliminate duplication and improve maintainability.
 * Handles: fetching destination suggestions, processing selection, triggering city fetching.
 */

import { useCallback, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { DestinationSuggestion } from "@/types/destinations";
import type { WidgetType } from "@/types/flight";
import type { TripPreferences } from "@/stores/slices/preferenceTypes";
import type { ChatMessage } from "../types";
import { getDestinationSuggestions } from "@/services/destinations";
import { buildDestinationPayload } from "../utils/buildDestinationPayload";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import type { InspireFlowStep } from "../MemoizedSmartSuggestions";

interface UseChatDestinationFlowOptions {
  getPreferences: () => TripPreferences;
  departureCity: string | undefined;
  departureCountry: string | undefined;
  departureDateMs: number | undefined;
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
  updateMemory,
  setMessages,
  widgetTracking,
}: UseChatDestinationFlowOptions): UseChatDestinationFlowReturn {
  const { t } = useTranslation();

  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [destinationProfileScore, setDestinationProfileScore] = useState(0);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [inspireFlowStep, setInspireFlowStep] = useState<InspireFlowStep>("idle");

  // C2: Cache suggestions by preferences hash to avoid regenerating different results
  const suggestionsCache = useRef<{ hash: string; suggestions: DestinationSuggestion[]; basedOnProfile?: { completionScore: number } } | null>(null);

  // Shared fetch logic
  const fetchSuggestions = useCallback(async (limit: number) => {
    const prefs = getPreferences();
    const payload = buildDestinationPayload({
      preferences: prefs,
      departure: { city: departureCity, country: departureCountry },
      departureDateMs,
    });
    return getDestinationSuggestions(payload, { limit });
  }, [getPreferences, departureCity, departureCountry, departureDateMs]);

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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMessageId
              ? { ...m, text: t("planner.messages.noDestinations"), isTyping: false }
              : m
          )
        );
        setInspireFlowStep("idle");
      }
    } catch (error) {
      console.error("Error fetching destination suggestions:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMessageId
            ? { ...m, text: t("planner.messages.errorDestinations"), isTyping: false }
            : m
        )
      );
      setInspireFlowStep("idle");
    } finally {
      setIsLoadingDestinations(false);
    }
  }, [fetchSuggestions, setMessages, t]);

  // LLM-triggered destination suggestion request (during chat flow)
  const handleLLMDestinationRequest = useCallback(async (
    messageId: string,
    requestedCount: number,
  ) => {
    // Show loading state on the existing message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, isStreaming: false, isTyping: true }
          : m
      )
    );

    try {
      const limit = Math.min(requestedCount, 5);

      // C2: Check cache — reuse suggestions if preferences haven't changed
      const prefs = getPreferences();
      const cacheKey = JSON.stringify({ interests: prefs.interests, style: prefs.travelStyle, budget: prefs.comfortLevel, departure: departureCity });
      if (suggestionsCache.current?.hash === cacheKey && suggestionsCache.current.suggestions.length >= limit) {
        const cached = suggestionsCache.current;
        const suggestions = cached.suggestions.slice(0, limit);
        setDestinationSuggestions(suggestions);
        setDestinationProfileScore(cached.basedOnProfile?.completionScore || 0);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isTyping: false,
                  isStreaming: false,
                  widget: "destinationSuggestions" as WidgetType,
                  widgetData: { suggestions, basedOnProfile: cached.basedOnProfile as import("@/types/destinations").ProfileCompleteness | undefined },
                }
              : m
          )
        );
        setInspireFlowStep("results");
        return;
      }

      const response = await fetchSuggestions(limit);

      if (response.success && response.suggestions.length > 0) {
        // C2: Cache the results for this preference set
        suggestionsCache.current = {
          hash: cacheKey,
          suggestions: response.suggestions,
          basedOnProfile: response.basedOnProfile ? { completionScore: response.basedOnProfile.completionScore || 0 } : undefined,
        };
        setDestinationSuggestions(response.suggestions);
        const completionScore = response.basedOnProfile?.completionScore || 0;
        setDestinationProfileScore(completionScore);

        // Build conditional quick replies for low profile scores
        const profileQuickReplies: import("../types").QuickReply[] = completionScore < 50 ? [
          {
            id: `profile-prefs-${Date.now()}`,
            label: t("planner.suggestions.fillPreferences"),
            icon: "⚙️",
            action: { type: "navigate" as const, tab: "preferences" as const },
            variant: "primary" as const,
          },
          {
            id: `profile-ok-${Date.now()}`,
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, text: t("planner.messages.noDestinationsHint"), isTyping: false, isStreaming: false }
              : m
          )
        );
      }
    } catch (apiError) {
      console.error("Error fetching destination suggestions:", apiError);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: t("planner.messages.errorDestinations"), isTyping: false, isStreaming: false }
            : m
        )
      );
    }
  }, [fetchSuggestions, getPreferences, departureCity, setMessages, t]);

  // Handle destination selection from DestinationSuggestionsGrid
  const handleDestinationSelect = useCallback(async (messageId: string, destination: DestinationSuggestion) => {
    // Track destination selection
    widgetTracking.trackDestinationSelect(destination.countryName, destination.countryCode);

    // Mark widget as confirmed
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              widgetConfirmed: true,
              widgetSelectedValue: destination,
              widgetDisplayLabel: destination.countryName,
            }
          : msg
      )
    );

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
    const loadingId = `city-loading-${Date.now()}`;
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
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/top-cities-by-country?country_code=${destination.countryCode}&limit=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const data = await response.json();

      if (data.cities && data.cities.length > 0) {
        const cities = data.cities.map((c: { name: string; description?: string; population?: number }) => ({
          name: c.name,
          description: c.description || t("planner.chat.importantCity"),
          population: c.population,
        }));

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
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
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${t("planner.chat.whichCityToVisit")} ${t("planner.chat.typeInChat")}`,
                  isTyping: false,
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${t("planner.chat.whichCityToVisit")} ${t("planner.chat.typeInChat")}`,
                isTyping: false,
              }
            : m
        )
      );
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
