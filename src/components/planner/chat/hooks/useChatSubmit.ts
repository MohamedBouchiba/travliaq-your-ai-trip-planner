/**
 * useChatSubmit - Extracted from PlannerChat.tsx
 *
 * Encapsulates the sendText logic: constructing the LLM payload, streaming,
 * processing intent classification, flight data, preferences, widget routing,
 * and dynamic suggestions.
 */

import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { ChatMessage } from "../types";
import type { FlightFormData, ChatQuickAction, WidgetType } from "@/types/flight";
import type { FlightMemory } from "@/stores/hooks/useFlightMemoryStore";
import type { IntentClassification, APIMessage, MemoryContext, StreamResult, OnContentUpdate, SessionEntities } from "./chatStreamTypes";
import type { ChooseWidgetAction } from "./useWidgetActionExecutor";
import { parseAction, flightDataToMemory } from "../utils";
import { getCityCoords } from "../types";
import { persistExtractedEntities } from "./persistExtractedEntities";
import { geocodeCity } from "@/utils/geocodeCity";
import { eventBus, emitTabChange, emitTabAndZoom } from "@/lib/eventBus";
import { FLIGHTS_ZOOM } from "@/constants/mapSettings";
import { useDebugStore } from "@/stores/debugStore";
import { buildLLMContext } from "./buildLLMContext";

// ─── Types ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamResponseFn = (
  messages: APIMessage[],
  messageId: string,
  context: any,
  onChunk: OnContentUpdate,
) => Promise<StreamResult>;

interface WidgetFlowShape {
  setPendingTripDuration: (d: string) => void;
  setPendingPreferredMonth: (m: string) => void;
  setPendingTravelersWidget: (v: boolean) => void;
  citySelectionShownRef: React.MutableRefObject<string | null>;
  isSearchButtonShown: () => boolean;
  markSearchButtonShown: () => void;
  resetFlowState: () => void;
  determineNextWidget: (showDate: boolean, showTravelers: boolean, mem: FlightMemory) => WidgetType | undefined;
  getWidgetData: () => { preferredMonth?: string; tripDuration?: string } | undefined;
}

interface WidgetTrackingShape {
  getContextForLLM: () => string;
  getActiveWidgetsContext: () => string;
  trackDestinationSelect: (name: string, code: string) => void;
  dismissWidget: (id: string) => void;
}

interface IntentRouterShape {
  processIntent: (intent: IntentClassification) => {
    shouldShowWidget: boolean;
    widgetType: WidgetType | null;
    widgetData?: Record<string, unknown>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SessionContextShape {
  buildConversationSummary: (n: number) => string;
  sessionEntities: any;
  widgetDecisions: unknown[];
}

interface WidgetActionExecutorShape {
  getPendingWidgets: () => Array<{ type: WidgetType; messageId: string; options?: string[] }>;
  executeChooseWidgetAction: (action: ChooseWidgetAction) => boolean;
}

interface WidgetCooldownShape {
  getBlockedWidgets: () => string[];
}

export interface UseChatSubmitOptions {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLoading: (v: boolean) => void;
  setInput: (v: string) => void;
  setDynamicSuggestions: React.Dispatch<React.SetStateAction<Array<{ id: string; label: string; emoji: string; message: string }>>>;
  setLastIntentClassification: (v: IntentClassification | null) => void;
  setLastWidgetTriggered: (v: string | null) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  isLoading: boolean;
  memory: FlightMemory;
  updateMemory: (partial: Partial<FlightMemory>) => void;
  getMemorySummary: () => string;
  missingFields: string[] | undefined;
  getActivityMemory: () => Record<string, unknown> | null;
  getPreferenceMemory: () => Record<string, unknown> | null;
  getBasketSummary: () => string;
  streamResponse: StreamResponseFn;
  widgetFlow: WidgetFlowShape;
  widgetTracking: WidgetTrackingShape;
  widgetActionExecutor: WidgetActionExecutorShape;
  widgetCooldown: WidgetCooldownShape;
  intentRouter: IntentRouterShape;
  sessionContext: SessionContextShape;
  mapContext: { buildContextString: () => string };
  imperativeHandlers: { handlePreferencesDetection: (prefs: Record<string, unknown>) => void };
  preFillBudgetPreferences: (ecoVsLuxuryValue: number) => void;
  handleLLMDestinationRequest: (messageId: string, count?: number) => Promise<void>;
  generateContextualReplies: () => Array<{ id: string; label: string; icon?: string; action: { type: string; message?: string } }>;
  completedMessageIdsRef: React.MutableRefObject<Set<string>>;
  intentWidgetRef: React.MutableRefObject<WidgetType | null>;
  userMessageCountRef: React.MutableRefObject<number>;
}

export function useChatSubmit(opts: UseChatSubmitOptions) {
  const { t } = useTranslation();

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || opts.isLoading) return;

    const userText = text.trim();

    // Clear input immediately
    opts.setInput("");
    if (opts.inputRef.current) {
      opts.inputRef.current.style.height = "auto";
    }

    // Dismiss non-confirmed widgets
    opts.setMessages((prev) =>
      prev.map((m) => {
        if (m.widget && !m.widgetConfirmed) {
          opts.widgetTracking.dismissWidget(m.id);
          return { ...m, widgetDismissed: true };
        }
        return m;
      })
    );

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
      timestamp: Date.now(),
    };

    opts.userMessageCountRef.current += 1;
    eventBus.emit("chat:userMessage", { text: userText, messageCount: opts.userMessageCountRef.current });

    opts.setMessages((prev) => [...prev, userMessage]);
    opts.setIsLoading(true);

    opts.widgetFlow.citySelectionShownRef.current = null;

    const messageId = `bot-${Date.now()}`;
    opts.setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", text: "", isTyping: true, timestamp: Date.now() },
    ]);

    try {
      const apiMessages = opts.messages
        .filter((m) => !m.isTyping && m.id !== "welcome")
        .map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.text }));
      apiMessages.push({ role: "user", content: userText });

      // Build LLM context from all sources
      const context = buildLLMContext({
        messages: opts.messages,
        getActivityMemory: opts.getActivityMemory,
        getPreferenceMemory: opts.getPreferenceMemory,
        mapContext: opts.mapContext,
        widgetTracking: opts.widgetTracking,
        widgetActionExecutor: opts.widgetActionExecutor,
        getMemorySummary: opts.getMemorySummary,
        missingFields: opts.missingFields,
        sessionContext: opts.sessionContext,
        getBasketSummary: opts.getBasketSummary,
        widgetCooldown: opts.widgetCooldown,
        phaseSignals: {
          hasDestination: !!opts.memory.arrival,
          hasDates: !!opts.memory.departureDate,
          hasTravelers: opts.memory.passengers.adults > 0,
          hasFlightResults: false, // Will be set by external state if available
          hasHotelResults: false,
        },
      });

      const { content, flightData, preferencesData, quickReplies, destinationSuggestionRequest, intentClassification, flightSearchTrigger } =
        await opts.streamResponse(
          apiMessages,
          messageId,
          context,
          (id, text2, isComplete) => {
            if (opts.completedMessageIdsRef.current.has(id) && !isComplete) return;
            if (isComplete) opts.completedMessageIdsRef.current.add(id);

            opts.setMessages((prev) =>
              prev.map((m) => (m.id === id ? { ...m, text: text2, isStreaming: !isComplete, isTyping: false } : m))
            );
          }
        );

      // Process intent classification
      if (intentClassification) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] Intent:", intentClassification.primaryIntent);
        opts.setLastIntentClassification(intentClassification);

        // Extract departureCity from intent when flightData is null
        if (!flightData && intentClassification.entities?.departureCity) {
          const depCity = intentClassification.entities.departureCity as string;
          if (import.meta.env.DEV) console.log("[useChatSubmit] departureCity from intent:", depCity);
          opts.updateMemory({ departure: { city: depCity } });
          eventBus.emit("flight:updateFormData", { from: depCity });
        }

        // Pre-fill budget preferences before widget routing so the preferenceStyle widget renders pre-filled
        if (intentClassification.entities?.budgetLevel) {
          const level = intentClassification.entities.budgetLevel as string;
          const ecoValue =
            level === "budget" ? 10 :
            level === "comfort" ? 40 :
            level === "premium" ? 70 : 90;
          opts.preFillBudgetPreferences(ecoValue);
          if (import.meta.env.DEV) console.log("[useChatSubmit] Pre-filled budget:", level, "→ ecoVsLuxury:", ecoValue);
        }

        // Sync extracted interests to preference store (only if store is empty)
        const intentInterests = intentClassification.entities?.interests;
        if (Array.isArray(intentInterests) && intentInterests.length > 0) {
          const currentPrefs = opts.getPreferenceMemory?.();
          const existingInterests = currentPrefs?.interests as string[] | undefined;
          if (!existingInterests?.length) {
            opts.imperativeHandlers.handlePreferencesDetection({ interests: intentInterests });
            if (import.meta.env.DEV) console.log("[useChatSubmit] Synced interests from intent:", intentInterests);
          }
        }

        const intentResult = opts.intentRouter.processIntent(intentClassification);
        if (intentResult.widgetType) {
          opts.setLastWidgetTriggered(intentResult.widgetType);

          if (intentResult.shouldShowWidget && intentResult.widgetType) {
            const widgetType = intentResult.widgetType;
            opts.intentWidgetRef.current = widgetType;
            if (import.meta.env.DEV) console.log("[useChatSubmit] Intent widget:", widgetType);
            opts.setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? { ...m, widget: widgetType, widgetData: intentResult.widgetData, widgetConfirmed: false }
                  : m
              )
            );
          }
        }

        // provide_destination handling
        if (intentClassification.primaryIntent === "provide_destination" && intentClassification.entities?.destinationCity) {
          const destinationCity = intentClassification.entities.destinationCity as string;
          if (import.meta.env.DEV) console.log("[useChatSubmit] provide_destination:", destinationCity);

          opts.setMessages((prev) =>
            prev.map((m) =>
              m.widget === "citySelector" && !m.widgetConfirmed
                ? { ...m, widgetConfirmed: true, widgetDisplayLabel: destinationCity }
                : m
            )
          );

          opts.updateMemory({ arrival: { city: destinationCity } });
          eventBus.emit("flight:updateFormData", { to: destinationCity });

          geocodeCity(destinationCity).then((coords) => {
            if (coords) {
              if (import.meta.env.DEV) console.log("[useChatSubmit] Geocoded:", destinationCity, coords);
              opts.updateMemory({
                arrival: { city: destinationCity, lat: coords.lat, lng: coords.lng, country: coords.country, countryCode: coords.countryCode },
              });
            }
          });
        }
      }

      // Handle detected preferences
      if (preferencesData && Object.keys(preferencesData).length > 0) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] Preferences detected:", preferencesData);
        opts.imperativeHandlers.handlePreferencesDetection(preferencesData);
      }

      // Handle flight search trigger
      if (flightSearchTrigger) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] AI triggered flight search");
        eventBus.emit("flight:triggerSearch");
      }

      if (destinationSuggestionRequest) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] LLM destination suggestions requested");
        await opts.handleLLMDestinationRequest(messageId, destinationSuggestionRequest.requestedCount);
        opts.setIsLoading(false);
        return;
      }

      // Dynamic suggestions
      const aiReplies =
        quickReplies?.replies?.map((r, i) => ({
          id: `dyn-${Date.now()}-${i}`,
          label: r.label,
          emoji: r.emoji || "✈️",
          message: r.message,
        })) || [];

      const contextualReplies = opts.generateContextualReplies();
      const contextualSuggestions = contextualReplies
        .filter((r) => r.action.type === "fillInput")
        .map((r) => ({
          id: r.id,
          label: r.label,
          emoji: r.icon || "✨",
          message: (r.action as { type: "fillInput"; message: string }).message,
        }));

      const combinedSuggestions = [...aiReplies, ...contextualSuggestions].slice(0, 4);
      opts.setDynamicSuggestions(combinedSuggestions.length > 0 ? combinedSuggestions : []);

      const { cleanContent, action } = parseAction(content || t("planner.messages.defaultError"));

      // Process flight data
      let nextMem: FlightMemory = { ...opts.memory, passengers: { ...opts.memory.passengers } };
      let widget: WidgetType | undefined;
      let showDateWidget = false;
      let showTravelersWidget = false;

      // Unified Entity Pipeline
      persistExtractedEntities(
        intentClassification?.entities as Record<string, unknown> | undefined,
        flightData as any,
        opts.widgetFlow,
        opts.updateMemory as (partial: Record<string, unknown>) => void
      );

      if (flightData && Object.keys(flightData).length > 0) {
        const fd = flightData as Record<string, unknown>;
        // Guard: ignore hallucinated toCountryCode when no destination city was provided
        if (fd.toCountryCode && !fd.to) {
          if (import.meta.env.DEV) console.warn("[useChatSubmit] Ignoring hallucinated toCountryCode:", fd.toCountryCode);
          delete fd.toCountryCode;
        }
        const needsDestinationCity = fd.needsCitySelection && fd.toCountryCode;
        const needsDepartureCity = fd.fromCountryCode && !fd.from;
        const skipDateWidget = needsDestinationCity || needsDepartureCity;

        showDateWidget = fd.needsDateWidget === true && !skipDateWidget;
        showTravelersWidget = fd.needsTravelersWidget === true;

        if (showDateWidget && showTravelersWidget) {
          opts.widgetFlow.setPendingTravelersWidget(true);
        }

        const memoryUpdates = flightDataToMemory(fd as FlightFormData, opts.memory);
        opts.updateMemory(memoryUpdates);
        nextMem = { ...nextMem, ...memoryUpdates };

        // Track synthetic destination_selected
        if (fd.toCountryCode && fd.toCountryName) {
          opts.widgetTracking.trackDestinationSelect(fd.toCountryName as string, fd.toCountryCode as string);
        }

        if (fd.to) {
          const coords = getCityCoords((fd.to as string).toLowerCase().split(",")[0].trim());
          if (coords) {
            emitTabAndZoom("flights", coords, FLIGHTS_ZOOM);
          } else {
            emitTabChange("flights");
          }
        }

        eventBus.emit("flight:updateFormData", fd);
      } else if (action) {
        if (action.type === "chooseWidget") {
          // GUARD: Use backend intent classification instead of fragile regex
          const userAskedForChoice = intentClassification?.primaryIntent === "delegate_choice";

          if (userAskedForChoice) {
            if (import.meta.env.DEV) console.log("[useChatSubmit] chooseWidget (delegated):", action);
            const executed = opts.widgetActionExecutor.executeChooseWidgetAction(action);
            if (import.meta.env.DEV && executed) console.log("[useChatSubmit] Widget action executed");
          } else {
            if (import.meta.env.DEV) console.warn("[useChatSubmit] Blocked auto-chooseWidget:", action);
            const { addBlockedAction } = useDebugStore.getState();
            addBlockedAction({
              type: action.type,
              widgetType: action.widgetType,
              option: action.option,
              reason: "Intent not classified as delegate_choice",
              timestamp: Date.now(),
            });
          }
        } else if (action.type === "tab") {
          emitTabChange(action.tab);
        } else if (action.type === "zoom") {
          eventBus.emit("map:zoom", { center: action.center, zoom: action.zoom });
        } else if (action.type === "tabAndZoom") {
          emitTabAndZoom(action.tab, action.center, action.zoom);
        }
      }

      // Determine widget from flight flow
      widget = opts.widgetFlow.determineNextWidget(showDateWidget, showTravelersWidget, nextMem);
      const widgetData = widget ? opts.widgetFlow.getWidgetData() : undefined;

      opts.setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const finalWidget = widget ? widget : m.widget || opts.intentWidgetRef.current;
          const finalWidgetData = widget ? widgetData : m.widgetData || undefined;
          if (opts.intentWidgetRef.current) opts.intentWidgetRef.current = null;
          return { ...m, text: cleanContent, isTyping: false, isStreaming: false, widget: finalWidget, widgetData: finalWidgetData };
        })
      );
    } catch (err) {
      console.error("Failed to get chat response:", err);
      opts.widgetFlow.resetFlowState();
      opts.setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: t("planner.chat.errorOccurred"), isTyping: false, isStreaming: false } : m
        )
      );
    } finally {
      opts.setIsLoading(false);
      setTimeout(() => opts.inputRef.current?.focus(), 0);
    }
  }, [
    opts.isLoading,
    opts.messages,
    opts.memory,
    opts.missingFields,
    t,
    opts.streamResponse,
    opts.getMemorySummary,
    opts.getActivityMemory,
    opts.getPreferenceMemory,
    opts.getBasketSummary,
    opts.mapContext,
    opts.widgetTracking,
    opts.widgetActionExecutor,
    opts.widgetCooldown,
    opts.intentRouter,
    opts.sessionContext,
    opts.widgetFlow,
    opts.imperativeHandlers,
    opts.handleLLMDestinationRequest,
    opts.generateContextualReplies,
  ]);

  /**
   * Regenerate the last assistant response by re-sending the last user message.
   */
  const regenerateLastResponse = useCallback(async () => {
    if (opts.isLoading) return;

    // Find the last user message
    const lastUserIdx = [...opts.messages].reverse().findIndex((m) => m.role === "user" && !m.isHidden);
    if (lastUserIdx === -1) return;
    const realIdx = opts.messages.length - 1 - lastUserIdx;
    const lastUserMessage = opts.messages[realIdx];

    // Remove all assistant messages after the last user message
    opts.setMessages((prev) => prev.filter((_, i) => i <= realIdx));

    // Re-send the same text through the normal flow
    // Small delay to let state settle after removal
    setTimeout(() => {
      sendText(lastUserMessage.text);
    }, 50);
  }, [opts.isLoading, opts.messages, opts.setMessages, sendText]);

  return { sendText, regenerateLastResponse };
}
