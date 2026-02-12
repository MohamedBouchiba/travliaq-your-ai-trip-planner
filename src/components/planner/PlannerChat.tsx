/**
 * PlannerChat - Main chat component for travel planning
 *
 * This component has been refactored to use modular hooks:
 * - useChatStream: Handles SSE streaming responses
 * - useChatWidgetFlow: Manages widget interactions
 * - useChatImperativeHandlers: Provides methods exposed via ref
 * - useChatScroll: Intelligent scroll management
 * - useChatMapContext: Map/widget context for LLM
 */

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback, memo, useMemo } from "react";
import { Plane, History, Send, PanelLeftClose } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-travliaq.png";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { useChatSessions, type StoredMessage, type ChatTranslations } from "@/hooks/useChatSessions";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatMapContext } from "@/hooks/useChatMapContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

// Chat module imports
import {
  AirportButton,
  DualAirportSelection,
  MarkdownMessage,
  WidgetRenderer,
} from "./chat/widgets";
import { QuickReplies, useDynamicQuickReplies } from "./chat/QuickReplies";
import { useChatStream, useChatWidgetFlow, useChatImperativeHandlers, useWidgetTracking, useWidgetActionExecutor, usePreferenceWidgetCallbacks, useUnifiedIntentRouter, useSessionContext, useThinkingState, useWidgetCooldown, useChatSubmit } from "./chat/hooks";
import { useChatDestinationFlow } from "./chat/hooks/useChatDestinationFlow";
import { useChatReset } from "./chat/hooks/useChatReset";
import { useDebugEventBusCapture } from "@/hooks/useDebugEventBusCapture";
import { ThinkingIndicator } from "./chat/ThinkingIndicator";
import { IntentDebugPanel } from "./chat/IntentDebugPanel";
import { getMissingFieldLabel } from "./chat/utils";
import type { ChatMessage } from "./chat/types";
import { MemoizedSmartSuggestions, type InspireFlowStep } from "./chat/MemoizedSmartSuggestions";
import { MessageBubble } from "./chat/MessageBubble";
import { MessageActions } from "./chat/MessageActions";
import type { DestinationSuggestion } from "@/types/destinations";
import { ScrollToBottomButton } from "./chat/ScrollToBottomButton";

// Context imports
import type { CountrySelectionEvent } from "@/types/flight";
import { findNearestAirports } from "@/hooks/useNearestAirports";
import { useFlightMemoryStore, useTravelMemoryStore, useAccommodationMemoryStore, useActivityMemoryStore, usePreferenceMemoryStore, useTripBasketStore, type AccommodationEntry } from "@/stores/hooks";
import { useDebugStore } from "@/stores/debugStore";
import { useLocale } from "@/hooks/useLocale";
import { eventBus } from "@/lib/eventBus";

// Re-export types for external consumers
export type {
  ChatQuickAction,
  FlightFormData,
  AirportChoice,
  DualAirportChoice,
  CityChoice,
  CitySelectionData,
  AirportLegSuggestion,
  AirportConfirmationData,
  ConfirmedAirports,
} from "@/types/flight";

// Props and ref interface
interface PlannerChatProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface PlannerChatRef {
  injectSystemMessage: (event: CountrySelectionEvent) => void;
  askAirportChoice: (choice: import("@/types/flight").AirportChoice) => void;
  askDualAirportChoice: (choices: import("@/types/flight").DualAirportChoice) => void;
  offerFlightSearch: (from: string, to: string) => void;
  handleAccommodationUpdate: (city: string, updates: Partial<AccommodationEntry>) => boolean;
  askAirportConfirmation: (data: import("@/types/flight").AirportConfirmationData) => void;
  handleActivityUpdate: (city: string, updates: Partial<import("@/stores/hooks").ActivityEntry>) => boolean;
  handleAddActivityForCity: (city: string, activity: Partial<import("@/stores/hooks").ActivityEntry>) => string | null;
  handlePreferencesDetection: (detectedPrefs: Partial<import("@/stores/hooks").TripPreferences>) => void;
  /** Start a fresh session (clears all memories and creates new session) */
  startNewSession: () => void;
  /** Send a message programmatically (e.g., from URL query param) */
  sendInitialMessage: (message: string) => void;
}

const PlannerChatComponent = forwardRef<PlannerChatRef, PlannerChatProps>(({ isCollapsed, onToggleCollapse }, ref) => {
  // i18n and locale
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  
  // Memory contexts
  const { getSerializedState: getFlightMemory, memory, updateMemory, resetMemory: resetFlightMemory, hasCompleteInfo, needsAirportSelection, missingFields, getMemorySummary } = useFlightMemoryStore();
  const { getSerializedState: getAccommodationMemory, memory: accomMemory, updateAccommodation, resetMemory: resetAccommodationMemory } = useAccommodationMemoryStore();
  const { getSerializedState: getTravelMemory, updateTravelers, resetMemory: resetTravelMemory } = useTravelMemoryStore();
  const { addManualActivity, updateActivity, getActivitiesByDestination, getSerializedState: getActivityMemory, resetMemory: resetActivityMemory } = useActivityMemoryStore();
  const { updatePreferences, resetToDefaults: resetPreferenceMemory, getSerializedState: getPreferenceMemory, getPreferences, memory: prefMemory } = usePreferenceMemoryStore();
  const { getBasketSummary } = useTripBasketStore();

  // Chat translations
  const chatTranslations: ChatTranslations = useMemo(() => ({
    newConversation: t("planner.chat.newConversation"),
    startConversation: t("planner.chat.startConversation"),
    welcomeMessage: t("planner.chat.welcomeMessage"),
  }), [t]);

  // Chat sessions
  const {
    sessions,
    activeSessionId,
    messages: storedMessages,
    updateMessages: updateStoredMessages,
    selectSession,
    createNewSession,
    deleteSession,
    deleteAllSessions,
  } = useChatSessions({ getFlightMemory, getAccommodationMemory, getTravelMemory, translations: chatTranslations });

  // Local state
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<Array<{id: string; label: string; emoji: string; message: string}>>([]);
  
  // Track completed message IDs to prevent late streaming updates from resetting isStreaming
  const completedMessageIdsRef = useRef<Set<string>>(new Set());
  // Track "inspire" intent to trigger preference widgets flow
  const lastIntentRef = useRef<string | null>(null);
  // Hard reset guard (new conversation / delete all): suppress auto-effects that can spam messages
  const isHardResetRef = useRef(false);
  // Safeguard: store intent-router widget to prevent loss between setMessages calls
  const intentWidgetRef = useRef<import("@/types/flight").WidgetType | null>(null);
  
  // Destination flow is managed by a dedicated hook (extracted from this component)
  // State variables: inspireFlowStep, destinationSuggestions, destinationProfileScore, isLoadingDestinations
  // are now managed inside useChatDestinationFlow — see below.
  
  
  // Intent classification debug state
  const [lastIntentClassification, setLastIntentClassification] = useState<import("./chat/hooks/useChatStream").IntentClassification | null>(null);
  const [lastWidgetTriggered, setLastWidgetTriggered] = useState<string | null>(null);

  // Sync message timeline to debug store
  useEffect(() => {
    const { setMessageTimeline } = useDebugStore.getState();
    setMessageTimeline(
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        textPreview: m.text.substring(0, 100) + (m.text.length > 100 ? "..." : ""),
        fullText: m.text,
        timestamp: m.timestamp || Date.now(),
        widget: m.widget,
        widgetConfirmed: m.widgetConfirmed,
        widgetData: m.widgetData,
        isAutoGenerated: m.isAutoGenerated,
      }))
    );
  }, [messages]);



  // Sync current suggestions to the last assistant message in debug store
  useEffect(() => {
    if (dynamicSuggestions.length === 0) return;
    const { messageTimeline, setMessageTimeline } = useDebugStore.getState();
    if (messageTimeline.length === 0) return;
    
    // Find the last assistant message and attach suggestion labels
    const labels = dynamicSuggestions.map(s => s.label);
    const updated = [...messageTimeline];
    for (let i = updated.length - 1; i >= 0; i--) {
      if (updated[i].role === "assistant") {
        updated[i] = { ...updated[i], suggestionsShown: labels };
        break;
      }
    }
    setMessageTimeline(updated);
  }, [dynamicSuggestions]);

  // Prevent repeated airport fetch loops (same inputs => only fetch once)
  const airportFetchKeyRef = useRef<string | null>(null);

  // Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userMessageCountRef = useRef(0);

  // CRITICAL: Hard guard against any global CSS that blocks pointer events (e.g., driver.js leaving `driver-active` behind)
  useEffect(() => {
    const restoreInteractivity = () => {
      // Driver.js (and some tour libraries) can leave global locks behind.
      document.body.classList.remove("driver-active");
      document.documentElement.classList.remove("driver-active");

      // Remove any lingering driver layers.
      document.querySelectorAll(".driver-overlay, .driver-stage, .driver-popover").forEach((el) => el.remove());

      // Remove inert attributes that fully disable interaction + focus.
      document.querySelectorAll("[inert]").forEach((el) => {
        el.removeAttribute("inert");
      });

      // If pointer-events were disabled globally, restore them.
      if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
      if (document.documentElement.style.pointerEvents === "none") document.documentElement.style.pointerEvents = "";
    };

    restoreInteractivity();

    const obs = new MutationObserver(() => {
      if (document.body.classList.contains("driver-active") || document.documentElement.classList.contains("driver-active")) {
        restoreInteractivity();
      }
    });

    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => obs.disconnect();
  }, []);

  // Custom hooks
  const { streamResponse, isStreaming } = useChatStream({
    onRetry: useCallback((attempt: number, maxRetries: number) => {
      toast.info(t("planner.chat.retrying", { attempt, max: maxRetries }));
    }, [t]),
  });
  const mapContext = useChatMapContext();
  
  // Chain of Thought thinking state
  const thinkingState = useThinkingState();
  
  // Widget cooldown system - prevents infinite widget loops
  const widgetCooldown = useWidgetCooldown();

  // Capture key eventBus events in debug store (dev only)
  useDebugEventBusCapture();
  
  // Widget tracking for LLM context
  const widgetTracking = useWidgetTracking();
  
  // Unified Intent Router - single source of truth for intent processing
  // Now includes widget interactions for hasAlreadyProvided check
  // Now includes widget cooldown for anti-loop protection
  const intentRouter = useUnifiedIntentRouter({
    memory,
    widgetInteractions: widgetTracking.interactions,
    widgetCooldown, // Pass cooldown system for validation
    onWidgetTriggered: useCallback((widgetType, data) => {
      if (import.meta.env.DEV) console.log("[PlannerChat] Intent router triggered widget:", widgetType);
      setLastWidgetTriggered(widgetType);
    }, []),
    onSearchTriggered: useCallback(() => {
      if (import.meta.env.DEV) console.log("[PlannerChat] Intent router triggered search");
    }, []),
  });

  // Session context for enriched LLM context (Phase 3)
  const sessionContext = useSessionContext({
    messages,
    widgetInteractions: widgetTracking.interactions,
  });

  // Sync memory context to debug store in real-time (not just during LLM calls)
  // Use stable primitives as deps to avoid infinite loops from object references
  const debugSyncKey = `${getMemorySummary()}|${missingFields?.join(",")}|${widgetTracking.interactions.length}|${widgetCooldown.getBlockedWidgets().join(",")}`;
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const { setMemoryContext } = useDebugStore.getState();
      const prefState = getPreferenceMemory();
      const prefCtx = prefState
        ? `\n[PRÉFÉRENCES] Rythme: ${prefState.pace}, Style: ${prefState.travelStyle}, Confort: ${prefState.comfortLabel}, Intérêts: ${(prefState.interests as string[])?.join(", ") || ""}`
        : "";
      setMemoryContext({
        flightSummary: getMemorySummary(),
        preferenceContext: prefCtx,
        widgetHistory: widgetTracking.getContextForLLM(),
        blockedWidgets: widgetCooldown.getBlockedWidgets(),
        basketSummary: getBasketSummary(),
        conversationSummary: sessionContext.buildConversationSummary(5),
        sessionEntities: sessionContext.sessionEntities,
        missingFields: missingFields?.map(getMissingFieldLabel),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugSyncKey]);

  // Dynamic quick replies based on widget interactions and flow state (Phase 3)
  const { generateContextualReplies } = useDynamicQuickReplies(
    widgetTracking.interactions,
    sessionContext.sessionEntities,
    {
      hasDestination: intentRouter.flowState.hasDestination,
      hasDestinationCity: intentRouter.flowState.hasDestinationCity,
      hasDepartureDate: intentRouter.flowState.hasDepartureDate,
      hasTravelers: intentRouter.flowState.hasTravelers,
      isReadyToSearch: intentRouter.flowState.isReadyToSearch,
    }
  );

  // Intelligent scroll management
  const {
    isUserScrolling,
    showNewMessageIndicator,
    newMessageCount,
    scrollToBottom,
    handleScroll,
    markMessagesAsRead,
  } = useChatScroll({
    messagesCount: messages.length,
    containerRef: messagesContainerRef,
  });

  const widgetFlow = useChatWidgetFlow({
    memory,
    updateMemory,
    updateTravelers,
    setMessages,
    t,
    dateFnsLocale,
  });

  // Widget action executor for LLM "choose for me" functionality
  // We need a ref for onDestinationSelect since it's defined later
  const onDestinationSelectRef = useRef<((destination: import("@/types/destinations").DestinationSuggestion) => void) | null>(null);
  
  const widgetActionExecutor = useWidgetActionExecutor({
    messages,
    setMessages,
    t,
    handleCitySelect: widgetFlow.handleCitySelect,
    handleTripTypeConfirm: widgetFlow.handleTripTypeConfirm,
    handleTravelersSelect: widgetFlow.handleTravelersSelect,
    handleDateSelect: widgetFlow.handleDateSelect,
    handleDateRangeSelect: widgetFlow.handleDateRangeSelect,
    onDestinationSelect: (destination) => {
      if (onDestinationSelectRef.current) {
        onDestinationSelectRef.current(destination);
      }
    },
  });

  // Helper to find accommodation by city
  const findAccommodationByCity = useCallback((cityName: string): AccommodationEntry | null => {
    const normalized = cityName.toLowerCase().trim();
    return accomMemory.accommodations.find((a) => a.city?.toLowerCase().trim() === normalized) || null;
  }, [accomMemory.accommodations]);

  const imperativeHandlers = useChatImperativeHandlers({
    messages,
    setMessages,
    setIsLoading,
    findAccommodationByCity,
    updateAccommodation,
    getActivitiesByDestination,
    updateActivity,
    addManualActivity,
    updatePreferences,
    accomMemory,
    citySelectionShownRef: widgetFlow.citySelectionShownRef,
  });

  // Destination flow hook (extracted from this component)
  const departureCity = memory.departure?.city;
  const departureCountry = memory.departure?.country;
  const departureDateValue = memory.departureDate?.getTime();

  const destinationFlow = useChatDestinationFlow({
    getPreferences,
    departureCity,
    departureCountry,
    departureDateMs: departureDateValue,
    updateMemory: updateMemory as (partial: Record<string, unknown>) => void,
    setMessages,
    widgetTracking,
  });

  const {
    destinationSuggestions,
    destinationProfileScore,
    isLoadingDestinations,
    inspireFlowStep,
    setInspireFlowStep,
    handleFetchDestinations,
    handleLLMDestinationRequest,
    handleDestinationSelect,
  } = destinationFlow;

  // Preference widget callbacks (encapsulated for maintainability)
  // Now includes widget cooldown for anti-loop protection
  const preferenceCallbacks = usePreferenceWidgetCallbacks({
    prefMemory,
    widgetTracking,
    setInspireFlowStep,
    setMessages,
    setDynamicSuggestions,
    handleFetchDestinations,
    widgetCooldown, // Pass cooldown system
    departureCityName: departureCity, // Pass departure city for pre-destination check
  });

  // Utilities to avoid infinite sync loops between local state ↔ persisted state
  const areStoredMessagesEqual = useCallback((a: StoredMessage[], b: StoredMessage[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      const am = a[i];
      const bm = b[i];
      if (
        am.id !== bm.id ||
        am.role !== bm.role ||
        am.text !== bm.text ||
        am.hasSearchButton !== bm.hasSearchButton ||
        am.isHidden !== bm.isHidden ||
        am.widget !== bm.widget ||
        am.widgetConfirmed !== bm.widgetConfirmed ||
        am.widgetDisplayLabel !== bm.widgetDisplayLabel
      ) {
        return false;
      }
    }
    return true;
  }, []);

  const toStoredMessages = useCallback((msgs: ChatMessage[]): StoredMessage[] => {
    return msgs
      // Never persist transient UI messages
      .filter((m) => !m.isTyping && !m.isStreaming)
      .map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        hasSearchButton: m.hasSearchButton,
        isHidden: m.isHidden,
        // Persist widget state for history stability
        widget: m.widget,
        widgetData: m.widgetData,
        widgetConfirmed: m.widgetConfirmed,
        widgetSelectedValue: m.widgetSelectedValue,
        widgetDisplayLabel: m.widgetDisplayLabel,
        isAutoGenerated: m.isAutoGenerated,
      }))
      .slice(-200);
  }, []);

  // Sync from storedMessages when switching sessions (only if different)
  useEffect(() => {
    const next = storedMessages.map((m) => ({
      id: m.id,
      role: m.role,
      // CRITICAL: For welcome messages, always use the current translation instead of stored text
      // This ensures welcome message displays in the user's current language, not the language when it was stored
      text: m.id === "welcome" ? chatTranslations.welcomeMessage : m.text,
      isHidden: m.isHidden,
      hasSearchButton: m.hasSearchButton,
      // CRITICAL: Always reset streaming/typing states when loading from storage
      isStreaming: false,
      isTyping: false,
      // Restore widget state from storage
      widget: m.widget as import("@/types/flight").WidgetType | undefined,
      widgetData: m.widgetData,
      widgetConfirmed: m.widgetConfirmed,
      widgetSelectedValue: m.widgetSelectedValue,
      widgetDisplayLabel: m.widgetDisplayLabel,
      isAutoGenerated: m.isAutoGenerated,
    }));

    const currentStored = toStoredMessages(messages);
    if (!areStoredMessagesEqual(currentStored, storedMessages)) {
      setMessages(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, storedMessages, chatTranslations.welcomeMessage]);

  // Persist messages (only if changed) with guard against deleted sessions
  const isSwitchingSessionRef = useRef(false);
  const persistMessages = useCallback(
    (msgs: ChatMessage[]) => {
      // Guard: don't persist during session switching or if no active session
      if (isSwitchingSessionRef.current || !activeSessionId) return;

      // CRITICAL: never write while streaming/typing to avoid saving partial content like "P"/"B"
      if (msgs.some((m) => m.isStreaming || m.isTyping)) return;

      const toStore = toStoredMessages(msgs);
      if (!areStoredMessagesEqual(toStore, storedMessages)) {
        updateStoredMessages(toStore);
      }
    },
    [updateStoredMessages, storedMessages, areStoredMessagesEqual, toStoredMessages, activeSessionId]
  );

  useEffect(() => {
    const nonTyping = messages.filter((m) => !m.isTyping);
    if (nonTyping.length > 0) {
      persistMessages(messages);
    }
  }, [messages, persistMessages]);

  // Reset transient UI state on session change
  // IMPORTANT: Do NOT wipe the input here; it causes "type then instantly cleared" if session ID churns.
  useEffect(() => {
    isSwitchingSessionRef.current = true;
    widgetFlow.resetFlowState();
    setIsLoading(false);
    airportFetchKeyRef.current = null;

    const timer = setTimeout(() => {
      isSwitchingSessionRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [activeSessionId, widgetFlow]);

  // Notify outside world whether the chat has user content (for leave confirmations)
  const lastDirtyRef = useRef<boolean | null>(null);
  useEffect(() => {
    const dirty = messages.some((m) => m.role === "user" && !m.isHidden);
    if (lastDirtyRef.current !== dirty) {
      lastDirtyRef.current = dirty;
      eventBus.emit("chat:dirty", { dirty });
    }
  }, [messages]);

  // Auto-scroll only when a new message is added (not on content updates)
  const prevMessageCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && !isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, isUserScrolling]);

  // Show ready message when complete - use primitive deps to avoid loops
  const arrivalCity = memory.arrival?.city;
  const arrivalIata = memory.arrival?.iata;
  const arrivalCountryCode = memory.arrival?.countryCode;
  const departureIata = memory.departure?.iata;
  const departureCountryCodeForReady = memory.departure?.countryCode;
  const departureDateForReady = memory.departureDate;
  const returnDateForReady = memory.returnDate;
  const passengersTotal = memory.passengers.adults + memory.passengers.children;
  const tripTypeForReady = memory.tripType;
  const needsDepartureAirport = needsAirportSelection.departure;
  const needsArrivalAirport = needsAirportSelection.arrival;
  
  useEffect(() => {
    // During hard resets/session switching, suppress auto-messages (prevents "typing" spam + crashes)
    if (isSwitchingSessionRef.current || isHardResetRef.current) return;
    if (!hasCompleteInfo || widgetFlow.isSearchButtonShown()) return;

    const departure = departureCity || t("planner.departure");
    const arrival = arrivalCity || t("planner.askDestination");
    const depCode = departureIata ? ` (${departureIata})` : "";
    const arrCode = arrivalIata ? ` (${arrivalIata})` : "";
    const depDate = departureDateForReady ? format(departureDateForReady, "d MMMM yyyy", { locale: dateFnsLocale }) : "-";
    const retDate = returnDateForReady ? format(returnDateForReady, "d MMMM yyyy", { locale: dateFnsLocale }) : null;
    const travelers = passengersTotal;

    if (needsDepartureAirport || needsArrivalAirport) {
      // Guard: avoid re-triggering the same airport fetch in a loop
      const fetchKey = `${departureCity || ""}|${arrivalCity || ""}|${needsDepartureAirport ? 1 : 0}|${needsArrivalAirport ? 1 : 0}`;
      if (airportFetchKeyRef.current === fetchKey) return;
      airportFetchKeyRef.current = fetchKey;

      widgetFlow.markSearchButtonShown();
      const messageId = `airport-selection-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: messageId, role: "assistant", text: "", isTyping: true },
      ]);

      // Fetch airports
      const fetchAirports = async () => {
        try {
          const [fromAirports, toAirports] = await Promise.all([
            needsDepartureAirport && departureCity
              ? findNearestAirports(departureCity, 3, departureCountryCodeForReady)
              : null,
            needsArrivalAirport && arrivalCity
              ? findNearestAirports(arrivalCity, 3, arrivalCountryCode)
              : null,
          ]);

          let dualChoices: import("@/types/flight").DualAirportChoice | undefined;
          if (fromAirports?.airports?.length || toAirports?.airports?.length) {
            dualChoices = {};
            if (fromAirports?.airports?.length) {
              dualChoices.from = {
                field: "from",
                cityName: departureCity || departure,
                airports: fromAirports.airports,
              };
            }
            if (toAirports?.airports?.length) {
              dualChoices.to = {
                field: "to",
                cityName: arrivalCity || arrival,
                airports: toAirports.airports,
              };
            }
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `${t("planner.messages.tripConfigured", { from: departure, to: arrival })}\n\n${t("planner.messages.departureDate", { date: depDate })}${retDate ? `\n${t("planner.messages.returnDate", { date: retDate })}` : ""}\n${t(travelers > 1 ? "planner.messages.travelersPlural" : "planner.messages.travelers", { count: travelers })}\n\n${t("planner.messages.selectAirports")}`,
                    isTyping: false,
                    dualAirportChoices: dualChoices,
                  }
                : m
            )
          );
        } catch (error) {
          console.error("Error fetching airports:", error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `${t("planner.messages.tripConfigured", { from: departure, to: arrival })}\n\n${t("planner.messages.selectAirportsPanel")}`,
                    isTyping: false,
                  }
                : m
            )
          );
        }
      };

      fetchAirports();
    } else {
      widgetFlow.markSearchButtonShown();
      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-auto-${Date.now()}`,
          role: "assistant",
          text: `${t("planner.messages.searchReady", { from: `${departure}${depCode}`, to: `${arrival}${arrCode}` })}\n\n${t("planner.messages.departureDate", { date: depDate })}${retDate ? `\n${t("planner.messages.returnDate", { date: retDate })}` : ""}\n${t(travelers > 1 ? "planner.messages.travelersPlural" : "planner.messages.travelers", { count: travelers })}\n\n${t("planner.messages.clickToSearch")}`,
          hasSearchButton: true,
        },
      ]);
    }
  }, [
    hasCompleteInfo,
    departureCity,
    arrivalCity,
    departureIata,
    arrivalIata,
    arrivalCountryCode,
    departureCountryCodeForReady,
    departureDateForReady,
    returnDateForReady,
    passengersTotal,
    needsDepartureAirport,
    needsArrivalAirport,
    widgetFlow,
  ]);

  // Hard reset logic (shared between new session and delete all)
  const { performHardReset, finishReset } = useChatReset({
    setIsLoading, setDynamicSuggestions, setInput,
    lastIntentRef, completedMessageIdsRef, userMessageCountRef, airportFetchKeyRef,
    isHardResetRef, isSwitchingSessionRef,
    widgetFlow, widgetCooldown,
    resetFlightMemory, resetTravelMemory, resetAccommodationMemory, resetActivityMemory, resetPreferenceMemory,
  });

  const handleStartNewSession = useCallback(() => {
    performHardReset();
    createNewSession();
    finishReset(400);
  }, [performHardReset, finishReset, createNewSession]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    injectSystemMessage: imperativeHandlers.injectSystemMessage,
    askAirportChoice: imperativeHandlers.askAirportChoice,
    askDualAirportChoice: imperativeHandlers.askDualAirportChoice,
    offerFlightSearch: imperativeHandlers.offerFlightSearch,
    handleAccommodationUpdate: imperativeHandlers.handleAccommodationUpdate,
    askAirportConfirmation: imperativeHandlers.askAirportConfirmation,
    handleActivityUpdate: imperativeHandlers.handleActivityUpdate,
    handleAddActivityForCity: imperativeHandlers.handleAddActivityForCity,
    handlePreferencesDetection: imperativeHandlers.handlePreferencesDetection,
    startNewSession: handleStartNewSession,
    sendInitialMessage: (message: string) => {
      // Delay to ensure session is ready after creation
      setTimeout(() => {
        sendText(message);
      }, 100);
    },
  }));

  // Send message — extracted into useChatSubmit hook
  const { sendText, regenerateLastResponse } = useChatSubmit({
    messages,
    setMessages,
    setIsLoading,
    setInput,
    setDynamicSuggestions,
    setLastIntentClassification,
    setLastWidgetTriggered,
    inputRef,
    isLoading,
    memory,
    updateMemory,
    getMemorySummary,
    missingFields,
    getActivityMemory,
    getPreferenceMemory,
    getBasketSummary,
    streamResponse,
    widgetFlow,
    widgetTracking,
    widgetActionExecutor,
    widgetCooldown,
    intentRouter,
    sessionContext,
    mapContext,
    imperativeHandlers,
    handleLLMDestinationRequest,
    generateContextualReplies,
    completedMessageIdsRef,
    intentWidgetRef,
    userMessageCountRef,
  });

  // Memoize visible messages to avoid re-filtering on every render
  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.isHidden).slice(-100),
    [messages],
  );

  return (
    <aside
      className={cn(
        "h-full w-full flex flex-col relative overflow-hidden transition-all duration-300 ease-out",
        isCollapsed ? "bg-transparent opacity-0" : "bg-background opacity-100"
      )}
    >
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={selectSession}
        onNewSession={handleStartNewSession}
        onDeleteSession={deleteSession}
        onDeleteAllSessions={() => {
          performHardReset();
          deleteAllSessions();
          finishReset(500);
        }}
      />

      {/* Header - only show when not collapsed */}
      {!isCollapsed && (
        <div className="flex items-center justify-between h-12 px-3 border-b border-border shrink-0 bg-background animate-fade-in">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img src={logo} alt="Travliaq" className="h-6 w-6 object-contain shrink-0" />
            <span className="font-medium text-foreground text-sm truncate max-w-[240px]">
              {(() => {
                const title = sessions.find((s) => s.id === activeSessionId)?.title || t("planner.chat.newConversation");
                const titleWithoutEmoji = title.replace(/^\p{Extended_Pictographic}\s*/u, "");
                // Normalize default titles to current locale
                const defaultTitles = ["Nouvelle conversation", "New conversation"];
                if (defaultTitles.includes(titleWithoutEmoji)) {
                  return t("planner.chat.newConversation");
                }
                return titleWithoutEmoji;
              })()}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={t("planner.chat.history")}
              aria-label={t("planner.chat.history")}
            >
              <History className="h-4 w-4" />
            </button>

            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t("planner.chat.closeChat")}
                aria-label={t("planner.chat.closeChat")}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsible content */}
      <div
        className={cn(
          // `relative` + z-index: ensure chat content (especially input) stays above any stray overlays within the panel group
          "relative z-10 flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-out",
          isCollapsed ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
        )}
      >
          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto"
            role="log"
            aria-label={t("planner.chat.conversationMessages")}
            aria-live="polite"
          >
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {/* Memoized: filter once per messages change */}
              {visibleMessages.map((m) => (
                <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "")}>
                  {/* Content - no avatars */}
                  <div className={cn("flex-1 min-w-0", m.role === "user" ? "text-right" : "")}>
                    <div className={cn(
                      "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
                      m.role === "user" ? "bg-primary text-primary-foreground text-left" : "bg-muted text-foreground text-left"
                    )}>
                      {m.isTyping ? (
                        <div className="flex gap-1 py-1" role="status" aria-label={t("planner.chat.assistantTyping")}>
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      ) : (
                        <>
                          <MarkdownMessage content={m.text} />
                          {m.isStreaming && <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />}
                        </>
                      )}
                    </div>

                    {/* Copy / Like / Dislike actions for assistant messages */}
                    {m.role === "assistant" && !m.isTyping && !m.isStreaming && m.text && (
                      <MessageActions messageId={m.id} text={m.text} onRegenerate={regenerateLastResponse} />
                    )}

                    {/* Airport choices */}
                    {m.airportChoices && (
                      <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
                        {m.airportChoices.airports.map((airport) => (
                          <AirportButton
                            key={airport.iata}
                            airport={airport}
                            onClick={() => widgetFlow.handleAirportSelect(m.id, m.airportChoices!.field, airport, false)}
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    )}

                    {/* Dual airport selection */}
                    {m.dualAirportChoices && (
                      <DualAirportSelection
                        choices={m.dualAirportChoices}
                        onSelect={(field, airport) => widgetFlow.handleAirportSelect(m.id, field, airport, true)}
                        disabled={isLoading}
                      />
                    )}

                    {/* Widgets */}
                    {m.widget && !m.widgetDismissed && (
                      <WidgetRenderer
                        message={m}
                        widgetFlow={widgetFlow}
                        preferenceCallbacks={preferenceCallbacks}
                        handleDestinationSelect={handleDestinationSelect}
                        isLoadingDestinations={isLoadingDestinations}
                        memory={memory}
                        t={t}
                      />
                    )}

                    {/* Search button */}
                    {m.hasSearchButton && (
                      <div className="mt-3">
                        <button
                          onClick={() => widgetFlow.handleSearchButtonClick(m.id)}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
                        >
                          <Plane className="h-4 w-4" />
                          {t("planner.chat.searchFlightsNow")}
                        </button>
                      </div>
                    )}

                    {/* Quick Replies */}
                    {m.quickReplies && m.quickReplies.length > 0 && (
                      <QuickReplies
                        replies={m.quickReplies}
                        onSendMessage={(message) => sendText(message)}
                        onFillInput={(message) => {
                          setInput(message);
                          setTimeout(() => inputRef.current?.focus(), 0);
                        }}
                        onTriggerWidget={(widget) => {
                          // Trigger preference widgets on demand
                          if (widget === "preferenceInterests") {
                            const widgetId = `interests-widget-${Date.now()}`;
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: widgetId,
                                role: "assistant",
                                text: t("planner.chat.selectInterests"),
                                widget: "preferenceInterests" as import("@/types/flight").WidgetType,
                              },
                            ]);
                          } else if (widget === "preferenceStyle") {
                            const widgetId = `style-widget-${Date.now()}`;
                            setMessages((prev) => [
                              ...prev,
                              {
                                id: widgetId,
                                role: "assistant",
                                text: t("planner.chat.adjustTravelStyle"),
                                widget: "preferenceStyle" as import("@/types/flight").WidgetType,
                              },
                            ]);
                          }
                        }}
                        disabled={isLoading}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll to bottom button */}
          <ScrollToBottomButton
            show={isUserScrolling || showNewMessageIndicator}
            newMessageCount={newMessageCount}
            onClick={() => {
              scrollToBottom();
              markMessagesAsRead();
            }}
          />

          {/* Smart Suggestions + Input */}
          <div className="relative z-20 border-t border-border bg-background" aria-hidden={isCollapsed}>
            {/* Smart Suggestions - context is memoized to prevent re-renders */}
            <MemoizedSmartSuggestions
              memory={memory}
              mapContext={mapContext}
              inspireFlowStep={inspireFlowStep}
              destinationSuggestions={destinationSuggestions}
              messages={messages}
              dynamicSuggestions={dynamicSuggestions}
              onSuggestionClick={(message) => {
                if (import.meta.env.DEV) {
                  useDebugStore.getState().addUserInteraction({
                    timestamp: Date.now(),
                    category: "suggestion",
                    action: "clicked",
                    detail: `Suggestion: "${message.slice(0, 60)}"`,
                  });
                }
                // Handle special tokens that trigger widgets or actions directly
                
                // === CASE 1: Direct widget triggering ===
                if (message.startsWith("__WIDGET__")) {
                  const widgetType = message.replace("__WIDGET__", "") as import("@/types/flight").WidgetType;
                  
                  // Check cooldown before showing widget
                  if (!widgetCooldown.canShowWidget(widgetType)) {
                    toast.info(t("planner.widget.alreadyConfigured"));
                    setDynamicSuggestions([]);
                    return;
                  }
                  
                  // Record widget shown in cooldown system
                  widgetCooldown.recordWidgetShown(widgetType);
                  
                  // Get appropriate intro text for the widget
                  const widgetIntros: Record<string, string> = {
                    dietary: t("planner.preference.configureDietary"),
                    mustHaves: t("planner.preference.configureMustHaves"),
                    preferenceStyle: t("planner.preference.configureStyle"),
                    preferenceInterests: t("planner.preference.selectInterests"),
                  };
                  
                  const widgetId = `widget-${widgetType}-${Date.now()}`;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: widgetId,
                      role: "assistant",
                      text: widgetIntros[widgetType] || "",
                      widget: widgetType,
                    },
                  ]);
                  
                  setDynamicSuggestions([]);
                  return;
                }
                
                // === CASE 2: Direct destination fetch (with departure check) ===
                if (message === "__FETCH_DESTINATIONS__") {
                  // Check if departure city is set first
                  if (!departureCity) {
                    const askId = `ask-departure-${Date.now()}`;
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: askId,
                        role: "assistant",
                        text: t("planner.preference.askDepartureCity"),
                      },
                    ]);
                    setDynamicSuggestions([]);
                    return;
                  }
                  
                  const loadingId = `fetching-${Date.now()}`;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: loadingId,
                      role: "assistant",
                      text: t("planner.preference.searchingDestinations"),
                      isTyping: true,
                    },
                  ]);
                  handleFetchDestinations(loadingId);
                  setDynamicSuggestions([]);
                  return;
                }
                
                // === CASE 3: Choose for me ===
                if (message === "__CHOOSE_FOR_ME__") {
                  setInput(t("planner.suggestions.chooseForMeMessage"));
                  setDynamicSuggestions([]);
                  setTimeout(() => inputRef.current?.focus(), 0);
                  return;
                }
                
                // === DEFAULT: Fill input only, let user review & send ===
                setDynamicSuggestions([]);
                setInput(message);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              isLoading={isLoading}
            />

            <div className="relative z-20 max-w-3xl mx-auto p-4 pt-0">
              <div className="relative z-20 flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onPointerDown={(e) => {
                    const { clientX, clientY } = e;
                    requestAnimationFrame(() => {
                      // If a layer is capturing clicks, the textarea won't become the active element.
                      if (document.activeElement !== inputRef.current) {
                        const el = document.elementFromPoint(clientX, clientY);
                        const cs = el ? window.getComputedStyle(el) : null;
                        // eslint-disable-next-line no-console
                        console.warn("[ChatInputBlock] click not reaching textarea", {
                          x: clientX,
                          y: clientY,
                          topElement: el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.className ? `.${String(el.className).split(" ").slice(0, 3).join(".")}` : ""}` : null,
                          pointerEvents: cs?.pointerEvents,
                          zIndex: cs?.zIndex,
                          position: cs?.position,
                        });
                      }
                    });
                  }}
                  onFocus={() => {
                    // Safety net: if driver.js ever leaves pointer-events blocked, restore interactivity.
                    document.body.classList.remove("driver-active");
                    document.documentElement.classList.remove("driver-active");
                  }}
                  placeholder={isLoading ? t("planner.chat.inputLoading") : t("planner.chat.inputPlaceholder")}
                  aria-label={t("planner.chat.inputPlaceholder")}
                  rows={1}
                  disabled={false}
                  className="pointer-events-auto flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  style={{ minHeight: "40px", maxHeight: "120px" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendText(input);
                      setTimeout(() => inputRef.current?.focus(), 0);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => sendText(input)}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
                    input.trim() && !isLoading
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                  aria-label={t("planner.chat.send")}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 text-center mt-1.5">
                {t("planner.chat.inputHelper")}
              </p>
            </div>
          </div>
      </div>
      
      {/* Intent Debug Panel - only visible in development */}
      <IntentDebugPanel
        intent={lastIntentClassification}
        flowState={intentRouter.flowState}
        widgetTriggered={lastWidgetTriggered}
      />
    </aside>
  );
});

PlannerChatComponent.displayName = "PlannerChat";

// Memoized export to prevent unnecessary re-renders from parent components
export default memo(PlannerChatComponent);
