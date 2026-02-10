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
import type { WidgetType } from "@/types/flight";
import type { IntentClassification } from "./useChatStream";
import { parseAction, flightDataToMemory, getMissingFieldLabel } from "../utils";
import { getCityCoords } from "../types";
import { persistExtractedEntities } from "./persistExtractedEntities";
import { geocodeCity } from "@/utils/geocodeCity";
import { eventBus, emitTabChange, emitTabAndZoom } from "@/lib/eventBus";
import { FLIGHTS_ZOOM } from "@/constants/mapSettings";
import { useDebugStore } from "@/stores/debugStore";

// ─── Types ───

interface StreamResponseFn {
  (
    messages: Array<{ role: string; content: string }>,
    messageId: string,
    context: Record<string, unknown>,
    onChunk: (id: string, text: string, isComplete: boolean) => void,
  ): Promise<{
    content: string | null;
    flightData: Record<string, unknown> | null;
    preferencesData: Record<string, unknown> | null;
    quickReplies: { replies?: Array<{ label: string; emoji?: string; message: string }> } | null;
    destinationSuggestionRequest: { requestedCount?: number } | null;
    intentClassification: IntentClassification | null;
    flightSearchTrigger: boolean;
  }>;
}

interface WidgetFlowShape {
  setPendingTripDuration: (d: string) => void;
  setPendingPreferredMonth: (m: string) => void;
  setPendingTravelersWidget: (v: boolean) => void;
  citySelectionShownRef: React.MutableRefObject<string | null>;
  isSearchButtonShown: () => boolean;
  markSearchButtonShown: () => void;
  resetFlowState: () => void;
  determineNextWidget: (showDate: boolean, showTravelers: boolean, mem: Record<string, unknown>) => WidgetType | undefined;
  getWidgetData: () => Record<string, unknown> | undefined;
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
    widgetType: string | null;
    widgetData?: Record<string, unknown>;
  };
}

interface SessionContextShape {
  buildConversationSummary: (n: number) => string;
  sessionEntities: Record<string, unknown>;
  widgetDecisions: unknown[];
}

interface WidgetActionExecutorShape {
  getPendingWidgets: () => Array<{ type: string; options?: string[] }>;
  executeChooseWidgetAction: (action: Record<string, unknown>) => boolean;
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
  memory: Record<string, unknown>;
  updateMemory: (partial: Record<string, unknown>) => void;
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

      // Build memory context
      const activityMemoryState = opts.getActivityMemory();
      const preferenceMemoryState = opts.getPreferenceMemory();
      const visualContext = opts.mapContext.buildContextString();

      const activityContext =
        typeof (activityMemoryState as Record<string, unknown>)?.totalActivities === "number" && (activityMemoryState as Record<string, unknown>).totalActivities as number > 0
          ? `\n[ACTIVITÉS] ${(activityMemoryState as Record<string, unknown>).totalActivities} activité(s) planifiée(s)`
          : "";

      const preferenceContext = preferenceMemoryState
        ? `\n[PRÉFÉRENCES] Rythme: ${(preferenceMemoryState as Record<string, unknown>).pace}, Style: ${(preferenceMemoryState as Record<string, unknown>).travelStyle}, Confort: ${(preferenceMemoryState as Record<string, unknown>).comfortLabel}, Intérêts: ${((preferenceMemoryState as Record<string, unknown>).interests as string[])?.join(", ") || ""}`
        : "";

      // Build active widgets context for "choose for me"
      const activeWidgetsContext = opts.widgetTracking.getActiveWidgetsContext();
      const pendingWidgets = opts.widgetActionExecutor.getPendingWidgets();

      // Build detailed destination context
      let destinationDetailsContext = "";
      const destinationWidgetMessage = opts.messages.find(
        (m) => m.widget === "destinationSuggestions" && !m.widgetConfirmed && m.widgetData?.suggestions
      );
      if (destinationWidgetMessage?.widgetData?.suggestions) {
        const suggestions = destinationWidgetMessage.widgetData.suggestions as Array<{
          countryName: string;
          countryCode: string;
          headline?: string;
          description?: string;
          matchScore?: number;
          highlights?: string[];
          budgetRange?: string;
        }>;
        destinationDetailsContext = `[DESTINATIONS PROPOSÉES - CHOISIS PARMI CELLES-CI]\n${suggestions
          .map(
            (d, i) =>
              `${i + 1}. **${d.countryName}** (${d.countryCode})${d.matchScore ? ` - ${d.matchScore}% match` : ""}\n` +
              `   Titre: ${d.headline || "Non spécifié"}\n` +
              `   Description: ${d.description || "Non spécifié"}\n` +
              `   Points forts: ${d.highlights?.join(", ") || "Non spécifié"}\n` +
              `   Budget: ${d.budgetRange || "Non spécifié"}`
          )
          .join("\n\n")}`;
      }

      const pendingWidgetsContext =
        pendingWidgets.length > 0
          ? pendingWidgets
              .map((w) =>
                w.options ? `- Widget "${w.type}" avec options: ${w.options.join(", ")}` : `- Widget "${w.type}" en attente`
              )
              .join("\n")
          : "";

      const userPrefsForChoice = preferenceMemoryState
        ? `\n[PRÉFÉRENCES UTILISATEUR POUR LE CHOIX]\n` +
          `- Style: ${(preferenceMemoryState as Record<string, unknown>).travelStyle || "non défini"}\n` +
          `- Rythme: ${(preferenceMemoryState as Record<string, unknown>).pace || "non défini"}\n` +
          `- Intérêts: ${((preferenceMemoryState as Record<string, unknown>).interests as string[])?.join(", ") || "non définis"}\n` +
          `- Niveau confort: ${(preferenceMemoryState as Record<string, unknown>).comfortLabel || "non défini"}`
        : "";

      const combinedWidgetContext = [
        destinationDetailsContext,
        userPrefsForChoice,
        activeWidgetsContext,
        pendingWidgetsContext ? `[OPTIONS WIDGETS ACTIFS]\n${pendingWidgetsContext}` : "",
      ]
        .filter(Boolean)
        .join("\n\n")
        .trim();

      const { content, flightData, preferencesData, quickReplies, destinationSuggestionRequest, intentClassification, flightSearchTrigger } =
        await opts.streamResponse(
          apiMessages,
          messageId,
          {
            flightSummary: opts.getMemorySummary(),
            activityContext: activityContext + (visualContext ? `\n${visualContext}` : ""),
            preferenceContext,
            missingFields: opts.missingFields,
            widgetHistory: opts.widgetTracking.getContextForLLM(),
            activeWidgetsContext: combinedWidgetContext,
            conversationSummary: opts.sessionContext.buildConversationSummary(5),
            sessionEntities: opts.sessionContext.sessionEntities,
            widgetDecisions: opts.sessionContext.widgetDecisions,
            basketSummary: opts.getBasketSummary(),
            blockedWidgets: opts.widgetCooldown.getBlockedWidgets(),
            preferencesState: {
              interests: Array.isArray((preferenceMemoryState as Record<string, unknown>)?.interests)
                ? (preferenceMemoryState as Record<string, unknown>).interests as string[]
                : [],
              style:
                typeof (preferenceMemoryState as Record<string, unknown>)?.travelStyle === "string"
                  ? (preferenceMemoryState as Record<string, unknown>).travelStyle
                  : null,
              pace:
                typeof (preferenceMemoryState as Record<string, unknown>)?.pace === "string"
                  ? (preferenceMemoryState as Record<string, unknown>).pace
                  : null,
              styleAxesConfigured: (() => {
                const axes = (preferenceMemoryState as Record<string, unknown>)?.styleAxes as
                  | { chillVsIntense: number; cityVsNature: number; ecoVsLuxury: number; touristVsLocal: number }
                  | undefined;
                if (!axes) return false;
                return axes.chillVsIntense !== 50 || axes.cityVsNature !== 50 || axes.ecoVsLuxury !== 50 || axes.touristVsLocal !== 50;
              })(),
            },
          },
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

        const intentResult = opts.intentRouter.processIntent(intentClassification);
        if (intentResult.widgetType) {
          opts.setLastWidgetTriggered(intentResult.widgetType);

          if (intentResult.shouldShowWidget && intentResult.widgetType) {
            const widgetType = intentResult.widgetType as WidgetType;
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
      const mem = opts.memory as Record<string, unknown>;
      let nextMem = { ...mem, passengers: { ...(mem.passengers as Record<string, unknown>) } };
      let widget: WidgetType | undefined;
      let showDateWidget = false;
      let showTravelersWidget = false;

      // Unified Entity Pipeline
      persistExtractedEntities(
        intentClassification?.entities as Record<string, unknown> | undefined,
        flightData as Record<string, unknown> | null,
        opts.widgetFlow,
        opts.updateMemory
      );

      if (flightData && Object.keys(flightData).length > 0) {
        const fd = flightData as Record<string, unknown>;
        const needsDestinationCity = fd.needsCitySelection && fd.toCountryCode;
        const needsDepartureCity = fd.fromCountryCode && !fd.from;
        const skipDateWidget = needsDestinationCity || needsDepartureCity;

        showDateWidget = fd.needsDateWidget === true && !skipDateWidget;
        showTravelersWidget = fd.needsTravelersWidget === true;

        if (showDateWidget && showTravelersWidget) {
          opts.widgetFlow.setPendingTravelersWidget(true);
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memoryUpdates = flightDataToMemory(fd as any, mem as any);
        opts.updateMemory(memoryUpdates as unknown as Record<string, unknown>);
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
            const executed = opts.widgetActionExecutor.executeChooseWidgetAction(action as Record<string, unknown>);
            if (import.meta.env.DEV && executed) console.log("[useChatSubmit] Widget action executed");
          } else {
            if (import.meta.env.DEV) console.warn("[useChatSubmit] Blocked auto-chooseWidget:", action);
            const { addBlockedAction } = useDebugStore.getState();
            addBlockedAction({
              type: action.type,
              widgetType: (action as Record<string, unknown>).widgetType as string || "unknown",
              option: (action as Record<string, unknown>).option as string || "unknown",
              reason: "Intent not classified as delegate_choice",
              timestamp: Date.now(),
            });
          }
        } else if (action.type === "tab") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          emitTabChange((action as any).tab);
        } else if (action.type === "zoom") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          eventBus.emit("map:zoom", { center: (action as any).center, zoom: (action as any).zoom });
        } else if (action.type === "tabAndZoom") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          emitTabAndZoom((action as any).tab, (action as any).center, (action as any).zoom);
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

  return { sendText };
}
