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
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { useChatSessions, type StoredMessage, type ChatTranslations } from "@/hooks/useChatSessions";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useChatMapContext } from "@/hooks/useChatMapContext";
import { cn } from "@/lib/utils";

// Chat module imports
import { useDynamicQuickReplies } from "./chat/QuickReplies";
import { useChatStream, useChatWidgetFlow, useChatImperativeHandlers, useWidgetTracking, useWidgetActionExecutor, usePreferenceWidgetCallbacks, useUnifiedIntentRouter, useSessionContext, useWidgetCooldown, useChatSubmit } from "./chat/hooks";
import { useChatDestinationFlow } from "./chat/hooks/useChatDestinationFlow";
import { useChatReset } from "./chat/hooks/useChatReset";
import { useReadyMessage } from "./chat/hooks/useReadyMessage";
import { useDebugEventBusCapture } from "@/hooks/useDebugEventBusCapture";

import { getMissingFieldLabel, isDismissalMessage } from "./chat/utils";
import type { ChatMessage } from "./chat/types";
import { MemoizedSmartSuggestions, type InspireFlowStep } from "./chat/MemoizedSmartSuggestions";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatInputArea } from "./chat/ChatInputArea";
import { BugReportDialog } from "./chat/BugReportDialog";
import { useBugReport } from "@/hooks/useBugReport";
import { ChatMessageBubble } from "./chat/ChatMessageBubble";
import type { ToolExecution } from "./chat/ToolStatusIndicator";
import type { DestinationSuggestion } from "@/types/destinations";
import { ScrollToBottomButton } from "./chat/ScrollToBottomButton";


// Context imports
import type { CountrySelectionEvent } from "@/types/flight";
import { useFlightMemoryStore, useTravelMemoryStore, useAccommodationMemoryStore, useActivityMemoryStore, usePreferenceMemoryStore, useTripBasketStore, type AccommodationEntry } from "@/stores/hooks";
import { useDebugStore } from "@/stores/debugStore";
import { useLocale } from "@/hooks/useLocale";
import { eventBus } from "@/lib/eventBus";
import { STORAGE_KEYS as SK } from "@/config/storageKeys";

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
  const { updatePreferences, resetToDefaults: resetPreferenceMemory, getSerializedState: getPreferenceMemory, getPreferences, memory: prefMemory, setStyleAxis, setStyleAxesOrder } = usePreferenceMemoryStore();
  const { getBasketSummary, clearBasket } = useTripBasketStore();

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
  const [bugReportDialogOpen, setBugReportDialogOpen] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  // Separate streaming state — decoupled from messages array for word-by-word rendering
  const [streamingText, setStreamingText] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  // Ref version to detect first-token transition inside the callback (no stale closure)
  const streamingMessageIdRef = useRef<string | null>(null);
  // Keep ref in sync with state
  const handleSetStreamingMessageId = useCallback((id: string | null) => {
    streamingMessageIdRef.current = id;
    setStreamingMessageId(id);
  }, []);

  // User message count for bug report rate limiting
  const userMessageCount = useMemo(() => messages.filter(m => m.role === "user").length, [messages]);

  // Bug report hook
  const bugReport = useBugReport({ activeSessionId, userMessageCount });

  const handleReportBug = useCallback(async () => {
    const reportId = await bugReport.submitReport();
    if (reportId) {
      setCurrentReportId(reportId);
      setBugReportDialogOpen(true);
    }
  }, [bugReport]);
  
  // Track completed message IDs to prevent late streaming updates from resetting isStreaming
  const completedMessageIdsRef = useRef<Set<string>>(new Set());
  // Hard reset guard (new conversation / delete all): suppress auto-effects that can spam messages
  const isHardResetRef = useRef(false);
  // Safeguard: store intent-router widget to prevent loss between setMessages calls
  const intentWidgetRef = useRef<import("@/types/flight").WidgetType | null>(null);
  
  // Destination flow is managed by a dedicated hook (extracted from this component)
  // State variables: inspireFlowStep, destinationSuggestions, destinationProfileScore, isLoadingDestinations
  // are now managed inside useChatDestinationFlow — see below.
  
  
  // U3: Tool execution state for ToolStatusIndicator
  const [activeTools, setActiveTools] = useState<ToolExecution[]>([]);

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

  // Bug C fix: Re-translate welcome message when i18n language changes
  const { i18n } = useTranslation();
  const prevLangRef = useRef(i18n.language);
  useEffect(() => {
    if (prevLangRef.current !== i18n.language) {
      prevLangRef.current = i18n.language;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "welcome" ? { ...m, text: chatTranslations.welcomeMessage } : m
        )
      );
    }
  }, [i18n.language, chatTranslations.welcomeMessage]);


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
    // U3: Wire tool status events to ToolStatusIndicator
    onToolStatus: useCallback((event: import("./chat/hooks/chatStreamTypes").ToolStatusEvent) => {
      setActiveTools(prev => {
        const idx = prev.findIndex(t => t.name === event.tool && t.status === "running");
        if (event.status === "started") {
          return [...prev, { name: event.tool, status: "running" as const, startTime: event.timestamp, reason: event.reason }];
        }
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          status: event.status === "finished" ? "success" as const : "error" as const,
          duration: event.latency_ms,
          summary: event.summary,
        };
        return updated;
      });
    }, []),
  });
  const mapContext = useChatMapContext();

  // Clear tool list when streaming ends (ToolStatusIndicator auto-fades success items)
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming) {
      const t = setTimeout(() => setActiveTools([]), 3000);
      return () => clearTimeout(t);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Widget cooldown system - prevents infinite widget loops
  const widgetCooldown = useWidgetCooldown();

  // Listen for planifier:blocked event → inject in-chat guidance message
  const { basketItems, explicitRequirements } = useTripBasketStore();
  useEffect(() => {
    const handlePlanifierBlocked = (data: { completedSteps: string[]; missingSteps: string[] }) => {
      const { completedSteps, missingSteps } = data;

      const activitiesSkipped = explicitRequirements.wantsActivities === false;
      const activitiesDone = completedSteps.includes('activities') || activitiesSkipped;

      // Build clean status lines — NO markdown links (they cause browser navigation)
      // Each item on its own line with double-newline for proper markdown paragraph breaks
      const flightDone = completedSteps.includes('flights');
      const hotelDone = completedSteps.includes('hotels');

      const checklistItems = [
        flightDone ? '✅ **Vol sélectionné**' : '☐ **Vol** — à sélectionner',
        hotelDone ? '✅ **Hébergement sélectionné**' : '☐ **Hébergement** — à sélectionner',
        activitiesDone
          ? `✅ **Activités**${activitiesSkipped ? ' *(passées)*' : ''}`
          : '☐ **Activités** — à ajouter ou passer',
      ];

      const checklist = checklistItems.join('\n\n');
      const missingCount = missingSteps.length;

      const BLOCKED_VARIATIONS = [
        (l: string) => `Presque là ! 🎯\n\n${l}\n\n_Complète les étapes manquantes pour débloquer **Planifier**._`,
        (l: string) => `Ton voyage prend forme ✈️\n\n${l}\n\n_Sélectionne les éléments restants, puis clique sur **Planifier**._`,
        (l: string) => `On y est presque 🚀\n\n${l}\n\n_Ces éléments sont nécessaires pour construire ton itinéraire._`,
        (l: string) => `Encore quelques étapes !\n\n${l}\n\n_Dès que tout est prêt, le bouton **Planifier** s'activera._`,
        (l: string) => `Voici ce qu'il reste à faire 📋\n\n${l}\n\n_Clique sur un bouton ci-dessous pour continuer._`,
      ];

      const variation = BLOCKED_VARIATIONS[Math.floor(Math.random() * BLOCKED_VARIATIONS.length)];
      const messageText = (missingCount > 0 ? variation(checklist) : `Tout est prêt ! 🚀\n\n${checklist}\n\n_Clique sur **Planifier** pour générer ton itinéraire._`).trim();

      // Build quickReplies as proper navigation buttons (not markdown links)
      const quickReplies: import('./chat/types').QuickReply[] = missingSteps
        .filter(step => !activitiesDone || step !== 'activities')
        .map(step => {
          if (step === 'flights') return {
            id: 'goto-flights',
            label: '✈️ Voir les vols',
            action: { type: 'navigate' as const, tab: 'flights' as const },
            variant: 'primary' as const,
          };
          if (step === 'hotels') return {
            id: 'goto-hotels',
            label: '🏨 Voir les hôtels',
            action: { type: 'navigate' as const, tab: 'stays' as const },
            variant: 'primary' as const,
          };
          return {
            id: 'goto-activities',
            label: '🧭 Voir les activités',
            action: { type: 'navigate' as const, tab: 'activities' as const },
            variant: 'outline' as const,
          };
        });

      const guidanceMessage: import('./chat/types').ChatMessage = {
        id: `planifier-blocked-${Date.now()}`,
        role: 'assistant',
        text: messageText,
        timestamp: Date.now(),
        isStreaming: false,
        isTyping: false,
        quickReplies: quickReplies.length > 0 ? quickReplies : undefined,
      };

      setMessages((prev) => {
        // Deduplication: if the last assistant message is already a planifier-blocked,
        // don't append a new one — just flash the existing one by toggling a key
        const lastAssistant = [...prev].reverse().find(m => m.role === 'assistant' && !m.isTyping);
        if (lastAssistant?.id.startsWith('planifier-blocked-')) {
          return prev.map(m =>
            m.id === lastAssistant.id
              ? { ...m, _flashKey: Date.now() }
              : m
          );
        }
        return [...prev, guidanceMessage];
      });
    };

    eventBus.on('planifier:blocked', handlePlanifierBlocked);
    return () => eventBus.off('planifier:blocked', handlePlanifierBlocked);
  }, [explicitRequirements.wantsActivities, setMessages]);

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
  // isStreaming (from useChatStream) is used as proxy: RAF-loop keeps scroll pinned to bottom
  // while the assistant is writing, regardless of messagesCount not changing
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
    isStreaming,
  });

  const widgetFlow = useChatWidgetFlow({
    memory,
    updateMemory,
    updateTravelers,
    setMessages,
    t,
    dateFnsLocale,
    widgetCooldown,
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
    tripDuration: widgetFlow.getWidgetData().tripDuration,
    updateMemory: updateMemory as (partial: Record<string, unknown>) => void,
    setMessages,
    widgetTracking,
    geoRegions: sessionContext.sessionEntities.geoRegions,
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
    updatePreferences, // Pass updatePreferences for styleAxesUserConfirmed flag
  });

  // Reopen a confirmed widget so the user can modify their selection
  const handleWidgetReopen = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widgetConfirmed: false } : m
      )
    );
  }, [setMessages]);

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
        timestamp: m.timestamp,
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

  // Sync from storedMessages when switching sessions; in-place welcome text update otherwise
  const prevSyncSessionIdRef = useRef(activeSessionId);
  useEffect(() => {
    const isSessionSwitch = prevSyncSessionIdRef.current !== activeSessionId;
    prevSyncSessionIdRef.current = activeSessionId;

    if (isSessionSwitch) {
      // Full resync from storedMessages (session switch)
      const next = storedMessages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.id === "welcome" ? chatTranslations.welcomeMessage : m.text,
        timestamp: m.timestamp,
        isHidden: m.isHidden,
        hasSearchButton: m.hasSearchButton,
        isStreaming: false,
        isTyping: false,
        widget: m.widget as import("@/types/flight").WidgetType | undefined,
        widgetData: m.widgetData,
        widgetConfirmed: m.widgetConfirmed,
        widgetSelectedValue: m.widgetSelectedValue,
        widgetDisplayLabel: m.widgetDisplayLabel,
        isAutoGenerated: m.isAutoGenerated,
      }));
      setMessages(next);

      // Re-hydrate stores from session snapshot (fixes stale "1 voyageur", missing fields)
      try {
        const snapshotRaw = localStorage.getItem(SK.CHAT_SESSION_STATE_PREFIX + activeSessionId);
        if (snapshotRaw) {
          const snapshot = JSON.parse(snapshotRaw);
          if (snapshot.flight) {
            const f = snapshot.flight;
            updateMemory({
              ...(f.departure && { departure: f.departure }),
              ...(f.arrival && { arrival: f.arrival }),
              ...(f.departureDate && { departureDate: new Date(f.departureDate) }),
              ...(f.returnDate && { returnDate: new Date(f.returnDate) }),
              ...(f.passengers && { passengers: f.passengers }),
              ...(f.tripType && { tripType: f.tripType }),
              ...(f.cabinClass && { cabinClass: f.cabinClass }),
            });
          }
          if (snapshot.preferences) {
            const p = snapshot.preferences;
            if (p.interests?.length || p.travelStyle || p.pace) {
              updatePreferences({
                ...(p.interests?.length && { interests: p.interests }),
                ...(p.travelStyle && { travelStyle: p.travelStyle }),
                ...(p.pace && { pace: p.pace }),
              });
            }
          }
          // U1: Restore dynamic suggestions (quick replies) from snapshot
          if (Array.isArray(snapshot.dynamicSuggestions) && snapshot.dynamicSuggestions.length > 0) {
            setDynamicSuggestions(snapshot.dynamicSuggestions);
          } else {
            setDynamicSuggestions([]);
          }
        } else {
          setDynamicSuggestions([]);
        }
      } catch { /* corrupt snapshot — non-critical */ }
    } else {
      // Within same session: only update welcome text if translation changed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "welcome" ? { ...m, text: chatTranslations.welcomeMessage } : m
        )
      );
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

        // Save store snapshots per session for re-hydration on restore
        try {
          const snapshot = {
            flight: getFlightMemory(),
            preferences: getPreferenceMemory(),
            dynamicSuggestions,
          };
          localStorage.setItem(SK.CHAT_SESSION_STATE_PREFIX + activeSessionId, JSON.stringify(snapshot));
        } catch { /* quota exceeded — non-critical */ }
      }
    },
    [updateStoredMessages, storedMessages, areStoredMessagesEqual, toStoredMessages, activeSessionId, getFlightMemory, getPreferenceMemory, dynamicSuggestions]
  );

  useEffect(() => {
    const nonTyping = messages.filter((m) => !m.isTyping);
    if (nonTyping.length > 0) {
      persistMessages(messages);
    }
  }, [messages, persistMessages]);

  // Force-flush any pending debounced save before the page unloads (refresh/close)
  const messagesForFlushRef = useRef(messages);
  messagesForFlushRef.current = messages;
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!activeSessionId) return;
      const msgs = messagesForFlushRef.current;
      if (msgs.some((m) => m.isStreaming || m.isTyping)) return;
      const toStore = toStoredMessages(msgs);
      // Direct localStorage write - no debounce
      try {
        localStorage.setItem(SK.CHAT_SESSION_PREFIX + activeSessionId, JSON.stringify(toStore));
      } catch { /* ignore */ }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeSessionId, toStoredMessages]);

  // Reset transient UI state on session change
  // IMPORTANT: Do NOT wipe the input here; it causes "type then instantly cleared" if session ID churns.
  // FIX: widgetFlow was in deps but changes identity every render (no useMemo), causing
  // isSwitchingSessionRef to be perpetually true → persistMessages never saved to localStorage.
  // widgetFlow.resetFlowState is a stable useCallback, so we access it via ref.
  const resetFlowStateRef = useRef(widgetFlow.resetFlowState);
  resetFlowStateRef.current = widgetFlow.resetFlowState;

  useEffect(() => {
    isSwitchingSessionRef.current = true;
    resetFlowStateRef.current();
    setIsLoading(false);
    airportFetchKeyRef.current = null;
    // B7: Clear completed message IDs to prevent stale IDs from previous session
    completedMessageIdsRef.current.clear();

    const timer = setTimeout(() => {
      isSwitchingSessionRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

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

  // A1: Ready-message + airport fetch logic extracted to useReadyMessage
  const { airportFetchKeyRef } = useReadyMessage({
    hasCompleteInfo,
    departureCity,
    arrivalCity: memory.arrival?.city,
    departureIata: memory.departure?.iata,
    arrivalIata: memory.arrival?.iata,
    arrivalCountryCode: memory.arrival?.countryCode,
    departureCountryCode: memory.departure?.countryCode,
    departureDateMs: memory.departureDate?.getTime(),
    returnDateMs: memory.returnDate?.getTime(),
    passengersTotal: memory.passengers.adults + memory.passengers.children,
    needsDepartureAirport: needsAirportSelection.departure,
    needsArrivalAirport: needsAirportSelection.arrival,
    isSearchButtonShown: widgetFlow.isSearchButtonShown,
    markSearchButtonShown: widgetFlow.markSearchButtonShown,
    setMessages,
    isSwitchingSessionRef,
    isHardResetRef,
  });

  // Hard reset logic (shared between new session and delete all)
  const { performHardReset, finishReset } = useChatReset({
    setIsLoading, setDynamicSuggestions, setInput,
    completedMessageIdsRef, userMessageCountRef, airportFetchKeyRef,
    isHardResetRef, isSwitchingSessionRef,
    widgetFlow, widgetCooldown,
    resetFlightMemory, resetTravelMemory, resetAccommodationMemory, resetActivityMemory, resetPreferenceMemory,
    clearBasket,
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

  // Pre-fill preference store when LLM detects budget level
  const preFillBudgetPreferences = useCallback((ecoVsLuxuryValue: number) => {
    setStyleAxis("ecoVsLuxury", ecoVsLuxuryValue);
    setStyleAxesOrder(["ecoVsLuxury", "chillVsIntense", "cityVsNature", "touristVsLocal"]);
  }, [setStyleAxis, setStyleAxesOrder]);

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
    preFillBudgetPreferences,
    handleLLMDestinationRequest,
    generateContextualReplies,
    completedMessageIdsRef,
    intentWidgetRef,
    userMessageCountRef,
    setStreamingText,
    setStreamingMessageId: handleSetStreamingMessageId,
    streamingMessageIdRef,
  });

  // Wrapper around sendText: intercept "nothing else" responses during inspire flow
  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;
    bugReport.trackUserMessage();

    // During inspire flow "extra" step, intercept "nothing else" text → trigger destination fetch
    if (inspireFlowStep === "extra" && isDismissalMessage(text)) {
      // Show the user message in chat
      const userMsgId = `user-${Date.now()}`;
      if (!departureCity) {
        const askId = `ask-departure-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: userMsgId, role: "user" as const, text: text.trim(), timestamp: Date.now() },
          { id: askId, role: "assistant" as const, text: t("planner.preference.askDepartureCity"), timestamp: Date.now() },
        ]);
        setDynamicSuggestions([]);
        setInput("");
        return;
      }

      const loadingId = `fetching-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user" as const, text: text.trim(), timestamp: Date.now() },
        { id: loadingId, role: "assistant" as const, text: t("planner.preference.searchingDestinations"), isTyping: true, timestamp: Date.now() },
      ]);
      handleFetchDestinations(loadingId);
      setDynamicSuggestions([]);
      setInput("");
      return;
    }

    sendText(text);
  }, [inspireFlowStep, departureCity, sendText, handleFetchDestinations, setMessages, setDynamicSuggestions, setInput, t]);

  // Memoize visible messages to avoid re-filtering on every render
  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.isHidden).slice(-100),
    [messages],
  );

  // A1: Stable callbacks for ChatMessageBubble (avoid re-creating on each render)
  const handleFillInput = useCallback((message: string) => {
    setInput(message);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [setInput, inputRef]);

  const handleTriggerWidget = useCallback((widget: string) => {
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
  }, [setMessages, t]);

  // A1: Extracted from inline JSX → stable callback for MemoizedSmartSuggestions
  const handleSuggestionClick = useCallback((message: string) => {
    if (import.meta.env.DEV) {
      useDebugStore.getState().addUserInteraction({
        timestamp: Date.now(),
        category: "suggestion",
        action: "clicked",
        detail: `Suggestion: "${message.slice(0, 60)}"`,
      });
    }

    // === CASE 1: Direct widget triggering ===
    if (message.startsWith("__WIDGET__")) {
      const widgetType = message.replace("__WIDGET__", "") as import("@/types/flight").WidgetType;

      if (!widgetCooldown.canShowWidget(widgetType)) {
        toast.info(t("planner.widget.alreadyConfigured"));
        setDynamicSuggestions([]);
        return;
      }

      widgetCooldown.recordWidgetShown(widgetType);

      const widgetIntros: Record<string, string> = {
        dietary: t("planner.preference.configureDietary"),
        mustHaves: t("planner.preference.configureMustHaves"),
        preferenceStyle: t("planner.preference.configureStyle"),
        preferenceInterests: t("planner.preference.selectInterests"),
      };

      const widgetId = `widget-${widgetType}-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: widgetId, role: "assistant", text: widgetIntros[widgetType] || "", widget: widgetType, timestamp: Date.now() },
      ]);

      setDynamicSuggestions([]);
      return;
    }

    // === CASE 2: Direct destination fetch (with departure check) ===
    if (message === "__FETCH_DESTINATIONS__") {
      if (!departureCity) {
        const askId = `ask-departure-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          { id: askId, role: "assistant", text: t("planner.preference.askDepartureCity"), timestamp: Date.now() },
        ]);
        setDynamicSuggestions([]);
        return;
      }

      const loadingId = `fetching-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: loadingId, role: "assistant", text: t("planner.preference.searchingDestinations"), isTyping: true, timestamp: Date.now() },
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
  }, [widgetCooldown, departureCity, handleFetchDestinations, setMessages, setDynamicSuggestions, setInput, inputRef, t]);

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
        <ChatHeader
          sessions={sessions}
          activeSessionId={activeSessionId}
          onHistoryOpen={() => setIsHistoryOpen(true)}
          onToggleCollapse={onToggleCollapse}
        />
      )}

      {/* Collapsible content */}
      <div
        className={cn(
          // `relative` + z-index: ensure chat content (especially input) stays above any stray overlays within the panel group
          "relative z-10 flex flex-col flex-1 transition-all duration-300 ease-out",
          isCollapsed ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
        )}
      >
          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto themed-scroll"
            role="log"
            aria-label={t("planner.chat.conversationMessages")}
            aria-live="polite"
          >
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {visibleMessages.map((m) => (
                <ChatMessageBubble
                  key={m.id}
                  message={m}
                  activeTools={activeTools}
                  isLoading={isLoading}
                  memory={memory}
                  streamingText={m.id === streamingMessageId ? streamingText : undefined}
                  widgetFlow={widgetFlow}
                  preferenceCallbacks={preferenceCallbacks}
                  handleDestinationSelect={handleDestinationSelect}
                  isLoadingDestinations={isLoadingDestinations}
                  onWidgetReopen={handleWidgetReopen}
                  onRegenerate={regenerateLastResponse}
                  onSend={handleSend}
                  onFillInput={handleFillInput}
                  onTriggerWidget={handleTriggerWidget}
                />
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

          {/* Input zone — no visible border, suggestions float above input */}
          <div className="relative z-20 bg-background" aria-hidden={isCollapsed}>
            {/* Suggestion chips — float just above the input, no separator */}
            <MemoizedSmartSuggestions
              memory={memory}
              mapContext={mapContext}
              inspireFlowStep={inspireFlowStep}
              destinationSuggestions={destinationSuggestions}
              lastAssistantMessage={messages.filter(m => m.role === 'assistant' && !m.isTyping && m.text && m.text.length > 10).at(-1)?.text}
              lastUserMessage={messages.filter(m => m.role === 'user').at(-1)?.text}
              conversationTurn={userMessageCount}
              dynamicSuggestions={dynamicSuggestions}
              onSuggestionClick={handleSuggestionClick}
              isLoading={isLoading}
            />

            <ChatInputArea
              input={input}
              setInput={setInput}
              inputRef={inputRef}
              isLoading={isLoading}
              onSend={handleSend}
              onReportBug={handleReportBug}
              canReport={bugReport.canReport}
              isReporting={bugReport.isUploading}
            />
          </div>

          {/* Bug Report Comment Dialog */}
          <BugReportDialog
            isOpen={bugReportDialogOpen}
            onClose={() => setBugReportDialogOpen(false)}
            onSubmitComment={(comment) => {
              if (currentReportId) bugReport.submitComment(currentReportId, comment);
            }}
          />
      </div>
      
    </aside>
  );
});

PlannerChatComponent.displayName = "PlannerChat";

// Memoized export to prevent unnecessary re-renders from parent components
export default memo(PlannerChatComponent);
