/**
 * useChatSubmit - Extracted from PlannerChat.tsx
 *
 * Encapsulates the sendText logic: constructing the LLM payload, streaming,
 * processing intent classification, flight data, preferences, widget routing,
 * and dynamic suggestions.
 */

import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";
import type { ChatMessage } from "../types";
import type { WidgetType } from "@/types/flight";
import type { FlightMemory } from "@/stores/hooks/useFlightMemoryStore";
import type { IntentClassification, APIMessage, MemoryContext, StreamResult, OnContentUpdate, StreamError } from "./chatStreamTypes";
import type { ChooseWidgetAction } from "./useWidgetActionExecutor";
import { parseAction, generateId, updateMessageById } from "../utils";
import { persistExtractedEntities } from "./persistExtractedEntities";
import { geocodeCity } from "@/utils/geocodeCity";
import { eventBus } from "@/lib/eventBus";
import { usePlannerStoreV2 } from "@/stores/plannerStoreV2";
import { buildLLMContext } from "./buildLLMContext";
import { processFlightData, processAction, buildCombinedSuggestions, shouldForceShowDateWidget } from "./processStreamResult";
import { computeFlowState, type IntentProcessResult, type FlowState } from "./intentRouterCore";
import { fetchTopCities } from "../utils/fetchTopCities";

// ─── Departure city validation (Bug D fix) ───

const INVALID_DEPARTURE_PATTERNS = [
  /^(ici|là|là où|je suis|mon emplacement|ma position|ma ville|current|here|my location|my city|where i am|my place)/i,
  /^(près de|proche de|around|near)/i,
];

/** @internal Exported for testing */
export function isValidDepartureCity(city: string): boolean {
  if (!city || city.trim().length < 2 || city.trim().length > 60) return false;
  return !INVALID_DEPARTURE_PATTERNS.some((p) => p.test(city.trim()));
}

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
  processIntent: (intent: IntentClassification, flowStateOverride?: FlowState) => {
    shouldShowWidget: boolean;
    widgetType: WidgetType | null;
    widgetData?: Record<string, unknown>;
  };
}

interface SessionContextShape {
  buildConversationSummary: (n: number) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  imperativeHandlers: { handlePreferencesDetection: (prefs: unknown) => void };
  preFillBudgetPreferences: (ecoVsLuxuryValue: number) => void;
  handleLLMDestinationRequest: (messageId: string, count?: number, departureCityOverride?: string) => Promise<void>;
  generateContextualReplies: () => Array<{ id: string; label: string; icon?: string; action: { type: string; message?: string } }>;
  completedMessageIdsRef: React.MutableRefObject<Set<string>>;
  intentWidgetRef: React.MutableRefObject<WidgetType | null>;
  userMessageCountRef: React.MutableRefObject<number>;
}

export function useChatSubmit(opts: UseChatSubmitOptions) {
  const { t } = useTranslation();
  // B4: Read search results from store to feed phase detection
  const hasHotelResults = usePlannerStoreV2((s) => s.hotelSearchResults.length > 0);
  const hasFlightResults = usePlannerStoreV2((s) => s.flightSearchResults.length > 0);

  // P5: Stable ref to avoid recreating sendText on every render (~21 deps → 0)
  const stableRef = useRef({ opts, t, hasHotelResults, hasFlightResults });
  stableRef.current = { opts, t, hasHotelResults, hasFlightResults };

  // R4: Client-side rate limiting — minimum 1s between submissions
  const lastSendTimeRef = useRef(0);
  const SEND_COOLDOWN_MS = 1000;

  const sendText = useCallback(async (text: string) => {
    // Read latest values from ref at call-time (not creation-time)
    const { opts, t, hasHotelResults, hasFlightResults } = stableRef.current;
    if (!text.trim() || opts.isLoading) return;

    // R4: Rate limiting guard — reject rapid submissions
    const now = Date.now();
    if (now - lastSendTimeRef.current < SEND_COOLDOWN_MS) return;
    lastSendTimeRef.current = now;

    const userText = text.trim();

    // Clear input immediately
    opts.setInput("");
    if (opts.inputRef.current) {
      opts.inputRef.current.style.height = "auto";
    }

    // Widgets that should persist across messages (not dismissed on user input)
    const PERSISTENT_WIDGET_TYPES = new Set(["destinationSuggestions", "tripRecap"]);

    // Dismiss non-confirmed widgets (except persistent types like suggestions)
    opts.setMessages((prev) =>
      prev.map((m) => {
        if (m.widget && !m.widgetConfirmed && !PERSISTENT_WIDGET_TYPES.has(m.widget)) {
          opts.widgetTracking.dismissWidget(m.id);
          return { ...m, widgetDismissed: true };
        }
        return m;
      })
    );

    const userMessage: ChatMessage = {
      id: generateId("user"),
      role: "user",
      text: userText,
      timestamp: Date.now(),
    };

    opts.userMessageCountRef.current += 1;
    eventBus.emit("chat:userMessage", { text: userText, messageCount: opts.userMessageCountRef.current });

    opts.setMessages((prev) => [...prev, userMessage]);
    opts.setIsLoading(true);

    opts.widgetFlow.citySelectionShownRef.current = null;

    const messageId = generateId("bot");
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
          hasDestination: !!(opts.memory.arrival?.city || opts.memory.arrival?.countryCode),
          hasDates: !!opts.memory.departureDate,
          hasTravelers: opts.memory.passengers.adults > 0,
          hasFlightResults,        // C1: Wired from flight store
          hasHotelResults,         // B4: Wired from accommodation store
        },
      });

      // B7: Prune completedMessageIds to prevent unbounded growth
      if (opts.completedMessageIdsRef.current.size > 50) {
        const entries = [...opts.completedMessageIdsRef.current];
        opts.completedMessageIdsRef.current = new Set(entries.slice(-30));
      }

      const { content, flightData, preferencesData, quickReplies, destinationSuggestionRequest, intentClassification, reasoning, flightSearchTrigger, tripRecapData } =
        await opts.streamResponse(
          apiMessages,
          messageId,
          context,
          (id, text2, isComplete) => {
            if (opts.completedMessageIdsRef.current.has(id) && !isComplete) return;
            if (isComplete) opts.completedMessageIdsRef.current.add(id);

            opts.setMessages(updateMessageById(id, { text: text2, isStreaming: !isComplete, isTyping: false }));
          }
        );

      // Process intent classification
      let intentResult: IntentProcessResult | undefined;
      let freshMemory: FlightMemory | undefined;
      if (intentClassification) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] Intent:", intentClassification.primaryIntent);
        opts.setLastIntentClassification(intentClassification);

        // Bug 1 fix: Auto-switch i18n language when backend detects user language
        const detectedLang = (intentClassification as unknown as Record<string, unknown>).detectedLanguage as string | undefined;
        if (detectedLang && ["fr", "en", "es"].includes(detectedLang) && detectedLang !== i18n.language) {
          console.log(`[useChatSubmit] Auto-switching i18n language: ${i18n.language} → ${detectedLang}`);
          i18n.changeLanguage(detectedLang);
        }

        // Sanitize departureCity before entity persistence (Bug D guard)
        const sanitizedEntities = intentClassification.entities
          ? { ...intentClassification.entities }
          : undefined;
        if (sanitizedEntities?.departureCity) {
          const depCity = sanitizedEntities.departureCity as string;
          if (!isValidDepartureCity(depCity)) {
            if (import.meta.env.DEV) console.warn("[useChatSubmit] Rejected invalid departureCity:", depCity);
            delete sanitizedEntities.departureCity;
          }
        }

        // F7: Persist all extracted entities (travelers, location, dates) via declarative pipeline
        // Must run BEFORE processIntent so memory/flowState reflects new entities
        const memoryPatch = persistExtractedEntities(
          sanitizedEntities as Record<string, unknown> | undefined,
          flightData,
          opts.widgetFlow,
          opts.updateMemory,
          opts.memory,
        );

        // Compute fresh flowState from merged memory (avoids stale memoized state)
        freshMemory = { ...opts.memory, ...memoryPatch } as FlightMemory;
        const freshFlowState = computeFlowState(freshMemory);

        intentResult = opts.intentRouter.processIntent(intentClassification, freshFlowState);
        if (intentResult.widgetType) {
          opts.setLastWidgetTriggered(intentResult.widgetType);

          if (intentResult.shouldShowWidget && intentResult.widgetType) {
            const widgetType = intentResult.widgetType;
            opts.intentWidgetRef.current = widgetType;
            if (import.meta.env.DEV) console.log("[useChatSubmit] Intent widget:", widgetType);

            // B3: citySelector needs async city fetch — processIntent doesn't populate citySelection
            if (widgetType === "citySelector") {
              const countryCode = (intentResult.widgetData as Record<string, unknown>)?.countryCode as string
                || (intentResult.widgetData as Record<string, unknown>)?.destinationCountryCode as string
                || opts.memory.arrival?.countryCode;
              const countryName = (intentResult.widgetData as Record<string, unknown>)?.countryName as string
                || (intentResult.widgetData as Record<string, unknown>)?.destinationCountry as string
                || opts.memory.arrival?.country
                || "";

              if (countryCode) {
                opts.setMessages(updateMessageById(messageId, { isTyping: true }));
                fetchTopCities(countryCode, t("planner.systemMessage.importantCity")).then((cities) => {
                  if (cities) {
                    opts.setMessages(updateMessageById(messageId, {
                      widget: "citySelector" as WidgetType,
                      widgetData: { citySelection: { countryCode, countryName, cities }, isDeparture: false },
                      widgetConfirmed: false,
                      isTyping: false,
                    }));
                  } else {
                    opts.setMessages(updateMessageById(messageId, { isTyping: false }));
                  }
                });
              }
            } else {
              opts.setMessages(updateMessageById(messageId, { widget: widgetType, widgetData: intentResult.widgetData, widgetConfirmed: false }));
            }
          }
        }

        // C1: Reasoning widget fallback removed (A1: plan_response no longer exists).
        // Widget decisions now come from 2 sources only:
        // 1. Backend intent classification → intentRouter.processIntent()
        // 2. Flight flow state → widgetFlow.determineNextWidget()

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

      // Deferred preference pre-fill: only apply when processIntent did NOT trigger
      // a preference widget (avoids pre-filling store before user sees the widget)
      if (intentClassification && intentResult) {
        if (intentResult.widgetType !== "preferenceStyle" && intentClassification.entities?.budgetLevel) {
          const level = intentClassification.entities.budgetLevel as string;
          const ecoValue =
            level === "budget" ? 10 :
            level === "comfort" ? 40 :
            level === "premium" ? 70 : 90;
          opts.preFillBudgetPreferences(ecoValue);
          if (import.meta.env.DEV) console.log("[useChatSubmit] Pre-filled budget:", level, "→ ecoVsLuxury:", ecoValue);
        }
        const intentInterests = intentClassification.entities?.interests;
        if (intentResult.widgetType !== "preferenceInterests" && Array.isArray(intentInterests) && intentInterests.length > 0) {
          const currentPrefs = opts.getPreferenceMemory?.();
          const existingInterests = currentPrefs?.interests as string[] | undefined;
          if (!existingInterests?.length) {
            opts.imperativeHandlers.handlePreferencesDetection({ interests: intentInterests });
            if (import.meta.env.DEV) console.log("[useChatSubmit] Synced interests from intent:", intentInterests);
          }
        }
      }

      // Handle detected preferences from SSE stream
      if (preferencesData && Object.keys(preferencesData).length > 0) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] Preferences detected:", preferencesData);
        opts.imperativeHandlers.handlePreferencesDetection(preferencesData);
      }

      // Handle flight search trigger
      // FIX-B2: When backend confirms search trigger, emit directly.
      // This bypasses the travelersConfirmBeforeSearch widget since the backend
      // already validated all search criteria (destination + dates + travelers).
      if (flightSearchTrigger) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] AI triggered flight search (backend-confirmed)");
        eventBus.emit("flight:triggerSearch");
      }

      if (destinationSuggestionRequest) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] LLM destination suggestions requested");
        // B6: Pass fresh departure city to avoid stale departureCityRef (not yet updated by React re-render)
        const freshDeparture = freshMemory?.departure?.city;
        await opts.handleLLMDestinationRequest(messageId, destinationSuggestionRequest.requestedCount, freshDeparture);
        opts.setIsLoading(false);
        return;
      }

      // Dynamic suggestions (A2: extracted to processStreamResult)
      const combinedSuggestions = buildCombinedSuggestions(quickReplies, opts.generateContextualReplies());
      opts.setDynamicSuggestions(combinedSuggestions.length > 0 ? combinedSuggestions : []);

      const { cleanContent, action } = parseAction(content || t("planner.messages.defaultError"));

      // A2: Process flight data + actions (extracted to processStreamResult)
      // processFlightData handles: hallucination guard, memory updates, entity persistence,
      // destination tracking, map navigation, form data emission
      let widget: WidgetType | undefined;
      const hasFlightData = flightData && Object.keys(flightData).length > 0;
      let showDateWidget: boolean;
      let showTravelersWidget: boolean;
      let nextMem: FlightMemory;
      if (hasFlightData) {
        const result = processFlightData(flightData, !!intentClassification, {
          widgetFlow: opts.widgetFlow,
          updateMemory: opts.updateMemory,
          memory: opts.memory,
          widgetTracking: opts.widgetTracking,
        });
        nextMem = result.nextMem;
        showDateWidget = result.showDateWidget;
        showTravelersWidget = result.showTravelersWidget;
      } else {
        nextMem = { ...opts.memory, passengers: { ...opts.memory.passengers } } as FlightMemory;
        showDateWidget = false;
        showTravelersWidget = false;
      }

      if (!hasFlightData && action) {
        processAction(action, {
          widgetActionExecutor: opts.widgetActionExecutor,
          intentClassification,
        });
      }

      // B5: Force date widget when tripDuration extracted but no dates exist
      showDateWidget = shouldForceShowDateWidget({
        showDateWidget,
        hasDepartureDate: !!nextMem.departureDate,
        intentTripDuration: intentClassification?.entities?.tripDuration as string | undefined,
        flightDataTripDuration: flightData?.tripDuration as string | undefined,
      });

      // Determine widget from flight flow
      widget = opts.widgetFlow.determineNextWidget(showDateWidget, showTravelersWidget, nextMem);
      const widgetData = widget ? opts.widgetFlow.getWidgetData() : undefined;

      // E2: If trip recap data received, override widget to show recap
      if (tripRecapData) {
        if (import.meta.env.DEV) console.log("[useChatSubmit] Trip recap received:", tripRecapData.destination?.city);
        widget = "tripRecap" as WidgetType;
      }

      opts.setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          // C3: Don't fall back to m.widget (ghost widget from SSE) — if no widget determined, clear it
          const finalWidget = widget || opts.intentWidgetRef.current || null;
          const finalWidgetData = tripRecapData
            ? { tripRecap: tripRecapData }
            : widget ? widgetData : (opts.intentWidgetRef.current ? undefined : null);
          if (opts.intentWidgetRef.current) opts.intentWidgetRef.current = null;
          return { ...m, text: cleanContent, isTyping: false, isStreaming: false, widget: finalWidget, widgetData: finalWidgetData };
        })
      );
    } catch (err) {
      console.error("Failed to get chat response:", err);
      opts.widgetFlow.resetFlowState();
      // C2: Classify the error type for user-visible error rendering
      const streamErr = err instanceof Error && "type" in err ? (err as StreamError) : null;
      const errorType = streamErr?.type ?? "unknown";
      // Use type-specific i18n key if available, fallback to generic
      const errorMessageKey = streamErr?.message?.startsWith("planner.error.")
        ? streamErr.message
        : "planner.chat.errorOccurred";
      opts.setMessages(updateMessageById(messageId, { text: t(errorMessageKey), isTyping: false, isStreaming: false, errorType }));
    } finally {
      opts.setIsLoading(false);
      setTimeout(() => opts.inputRef.current?.focus(), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- P5: reads from stableRef.current at call-time
  }, []);

  /**
   * Regenerate the last assistant response by re-sending the last user message.
   */
  const regenerateLastResponse = useCallback(async () => {
    const { opts } = stableRef.current;
    if (opts.isLoading) return;

    // Find the last user message
    const lastUserIdx = [...opts.messages].reverse().findIndex((m) => m.role === "user" && !m.isHidden);
    if (lastUserIdx === -1) return;
    const realIdx = opts.messages.length - 1 - lastUserIdx;
    const lastUserMessage = opts.messages[realIdx];

    // R2: flushSync ensures state is committed before sendText reads it via stableRef
    flushSync(() => {
      opts.setMessages((prev) => prev.filter((_, i) => i <= realIdx));
    });

    sendText(lastUserMessage.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reads from stableRef.current
  }, [sendText]);

  return { sendText, regenerateLastResponse };
}
