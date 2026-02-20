/**
 * useChatDestinationFlow - Manages destination suggestion fetching and selection
 * 
 * Extracted from PlannerChat.tsx to eliminate duplication and improve maintainability.
 * Handles: fetching destination suggestions, processing selection, triggering city fetching.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlannerStoreV2 } from "@/stores/plannerStoreV2";
import { useTranslation } from "react-i18next";
import type { DestinationSuggestion } from "@/types/destinations";
import type { WidgetType } from "@/types/flight";
import type { TripPreferences } from "@/stores/slices/preferenceTypes";
import type { ChatMessage } from "../types";
import { getDestinationSuggestions } from "@/services/destinations";
import { buildDestinationPayload } from "../utils/buildDestinationPayload";
import { generateId, updateMessageById } from "../utils/messageHelpers";
import { fetchTopCities } from "../utils/fetchTopCities";
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
  /** Geographic regions extracted from user messages (e.g. ["Méditerranée", "Europe"]) */
  geoRegions?: string[];
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
    departureCityOverride?: string,
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
  geoRegions,
}: UseChatDestinationFlowOptions): UseChatDestinationFlowReturn {
  const { t } = useTranslation();

  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [destinationProfileScore, setDestinationProfileScore] = useState(0);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [inspireFlowStep, setInspireFlowStep] = useState<InspireFlowStep>("idle");
  // F3: Auto-resume destination fetch when departure city becomes available
  const [pendingDestinationFetch, setPendingDestinationFetch] = useState(false);
  // B2: Inflight-request guard — prevents concurrent destination fetches
  const isFetchingRef = useRef(false);

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
      preferredRegion: geoRegions?.[0],
    });
    return getDestinationSuggestions(payload, { limit });
  }, [getPreferences, departureDateMs, tripDuration, geoRegions]);

  // Preference-flow destination fetch (after style/interests widgets)
  const handleFetchDestinations = useCallback(async (loadingMessageId: string) => {
    // B2: Prevent concurrent destination fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

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
      isFetchingRef.current = false;
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
        { id: loadingId, role: "assistant" as const, text: t("planner.preference.searchingDestinations"), isTyping: true, timestamp: Date.now() },
      ]);
      handleFetchRef.current(loadingId);
    }
  }, [departureCity, pendingDestinationFetch, setMessages, t]);

  // LLM-triggered destination suggestion request (during chat flow)
  const handleLLMDestinationRequest = useCallback(async (
    messageId: string,
    requestedCount: number,
    departureCityOverride?: string,
  ) => {
    // B2: Prevent concurrent destination fetches
    if (isFetchingRef.current) {
      // Bug B fix: Don't leave an empty message — flash existing widget or show fallback
      setMessages((prev) => {
        const existingWidget = prev.find(
          (m) => m.widget === "destinationSuggestions" && !m.widgetConfirmed
        );
        if (existingWidget) {
          return prev.map((m) => {
            if (m.id === existingWidget.id) return { ...m, _flashKey: Date.now() };
            if (m.id === messageId) return { ...m, text: t("planner.messages.suggestionsAlreadyShown", "Je t'ai déjà proposé des destinations ci-dessus 👆"), isTyping: false, isStreaming: false };
            return m;
          });
        }
        // No existing widget — just clear loading state
        return prev.map((m) =>
          m.id === messageId ? { ...m, text: t("planner.messages.searchingDestinations", "Je cherche des destinations pour toi…"), isTyping: true, isStreaming: false } : m
        );
      });
      // If no existing widget, allow the fetch to proceed after current one finishes
      if (!isFetchingRef.current) return;
      return;
    }
    isFetchingRef.current = true;

    // B6: Apply departure city override from freshMemory (avoids stale ref during same-tick execution)
    if (departureCityOverride && !departureCityRef.current) {
      departureCityRef.current = departureCityOverride;
    }

    // A4: Dismiss any previous unconfirmed destination suggestion widgets
    setMessages((prev) =>
      prev.map((m) =>
        m.widget === "destinationSuggestions" && !m.widgetConfirmed
          ? { ...m, widget: undefined, widgetData: undefined }
          : m
      )
    );

    // A6: Guard — ensure we have a departure city before suggesting
    // Bug A fix: Read Zustand store directly to avoid stale React ref timing issues
    const storeCity = departureCityRef.current || usePlannerStoreV2.getState().departure?.city;
    if (!storeCity) {
      // Bug 11 fix: Deduplicate — don't add ask-departure if one exists in recent messages
      setMessages((prev) => {
        const recentAskDeparture = prev.slice(-3).some(
          (m) => m.id.startsWith("ask-departure") && m.role === "assistant"
        );
        if (recentAskDeparture) {
          // Just clean the loading state on the current message
          return prev.map((m) =>
            m.id === messageId ? { ...m, isTyping: false, isStreaming: false } : m
          );
        }
        const askId = generateId("ask-departure");
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
            timestamp: Date.now(),
          },
        ];
      });
      // F3: Mark pending so fetch auto-resumes when departureCity becomes available
      setPendingDestinationFetch(true);
      isFetchingRef.current = false;
      return;
    }
    // Update ref with store value for downstream use
    if (!departureCityRef.current && storeCity) {
      departureCityRef.current = storeCity;
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
    } finally {
      isFetchingRef.current = false;
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
    const fallbackMsg = `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${t("planner.chat.whichCityToVisit")} ${t("planner.chat.typeInChat")}`;
    const cities = await fetchTopCities(destination.countryCode, t("planner.chat.importantCity"));

    if (cities) {
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
        text: fallbackMsg,
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
