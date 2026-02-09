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
  DatePickerWidget,
  DateRangePickerWidget,
  TravelersWidget,
  TravelersConfirmBeforeSearchWidget,
  TripTypeConfirmWidget,
  CitySelectionWidget,
  AirportButton,
  DualAirportSelection,
  AirportConfirmationWidget,
  MarkdownMessage,
  PreferenceStyleWidget,
  PreferenceInterestsWidget,
  MustHavesWidget,
  DietaryWidget,
  DestinationSuggestionsGrid,
  ConfirmedWidget,
  // Selection widgets (Phase 2 integration)
  BudgetRangeSlider,
  QuickFilterChips,
  StarRatingSelector,
  CabinClassSelector,
  DirectFlightToggle,
  DurationChips,
  TimeOfDayChips,
  // Comparison widgets (Phase 3 integration)
  ComparisonWidget,
  // Alert widgets (Phase 4 integration)
  ConflictAlert,
  ConflictSummaryWidget,
  // Price alert
  PriceAlertBanner,
} from "./chat/widgets";
import { QuickReplies, useDynamicQuickReplies } from "./chat/QuickReplies";
import { useChatStream, useChatWidgetFlow, useChatImperativeHandlers, useWidgetTracking, useWidgetActionExecutor, usePreferenceWidgetCallbacks, useUnifiedIntentRouter, useSessionContext, useThinkingState, useWidgetCooldown } from "./chat/hooks";
import { ThinkingIndicator } from "./chat/ThinkingIndicator";
import { IntentDebugPanel } from "./chat/IntentDebugPanel";
import { parseAction, flightDataToMemory, getMissingFieldLabel } from "./chat/utils";
import type { ChatMessage } from "./chat/types";
import { getCityCoords } from "./chat/types";
import { MemoizedSmartSuggestions, type InspireFlowStep } from "./chat/MemoizedSmartSuggestions";
import { MessageBubble } from "./chat/MessageBubble";
import { MessageActions } from "./chat/MessageActions";
import { getDestinationSuggestions } from "@/services/destinations";
import type { DestinationSuggestRequest, DestinationSuggestion } from "@/types/destinations";
import { ScrollToBottomButton } from "./chat/ScrollToBottomButton";
import { FLIGHTS_ZOOM } from "@/constants/mapSettings";
import { geocodeCity } from "@/utils/geocodeCity";

// Context imports
import type { CountrySelectionEvent } from "@/types/flight";
import { findNearestAirports } from "@/hooks/useNearestAirports";
import { useFlightMemoryStore, useTravelMemoryStore, useAccommodationMemoryStore, useActivityMemoryStore, usePreferenceMemoryStore, useTripBasketStore, type AccommodationEntry } from "@/stores/hooks";
import { useDebugStore } from "@/stores/debugStore";
import { useLocale } from "@/hooks/useLocale";
import { eventBus, emitTabChange, emitTabAndZoom } from "@/lib/eventBus";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

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
  
  // Inspire flow state: idle → style → interests → extra → loading → results
  // Uses InspireFlowStep type from MemoizedSmartSuggestions
  const [inspireFlowStep, setInspireFlowStep] = useState<InspireFlowStep>("idle");
  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [destinationProfileScore, setDestinationProfileScore] = useState<number>(0);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  
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
        timestamp: m.timestamp || Date.now(),
        widget: m.widget,
        widgetConfirmed: m.widgetConfirmed,
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
  const { streamResponse, isStreaming } = useChatStream();
  const mapContext = useChatMapContext();
  
  // Chain of Thought thinking state
  const thinkingState = useThinkingState();
  
  // Widget cooldown system - prevents infinite widget loops
  const widgetCooldown = useWidgetCooldown();
  
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
      console.log("[PlannerChat] Unified intent router triggered widget:", widgetType, data);
      setLastWidgetTriggered(widgetType);
    }, []),
    onSearchTriggered: useCallback(() => {
      console.log("[PlannerChat] Unified intent router triggered search");
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
  });

  // Widget action executor for LLM "choose for me" functionality
  // We need a ref for onDestinationSelect since it's defined later
  const onDestinationSelectRef = useRef<((destination: import("@/types/destinations").DestinationSuggestion) => void) | null>(null);
  
  const widgetActionExecutor = useWidgetActionExecutor({
    messages,
    setMessages,
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

  // Handler to fetch destination suggestions from API
  // Use primitive dependencies to avoid infinite loops
  const departureCity = memory.departure?.city;
  const departureCountry = memory.departure?.country;
  const departureDateValue = memory.departureDate?.getTime();
  
  const handleFetchDestinations = useCallback(async (loadingMessageId: string) => {
    setIsLoadingDestinations(true);
    setInspireFlowStep("loading");
    
    try {
      // Build preferences payload from memory - use getPreferences() for typed access
      const prefs = getPreferences();
      
      const payload: DestinationSuggestRequest = {
        // User location from departure if available
        userLocation: departureCity ? { city: departureCity, country: departureCountry } : undefined,
        
        // Style axes
        styleAxes: {
          chillVsIntense: prefs.styleAxes.chillVsIntense ?? 50,
          cityVsNature: prefs.styleAxes.cityVsNature ?? 50,
          ecoVsLuxury: prefs.styleAxes.ecoVsLuxury ?? 50,
          touristVsLocal: prefs.styleAxes.touristVsLocal ?? 50,
        },
        
        // Interests (max 5)
        interests: prefs.interests.slice(0, 5) as DestinationSuggestRequest["interests"],
        
        // Must-haves
        mustHaves: {
          accessibilityRequired: prefs.mustHaves.accessibilityRequired || false,
          petFriendly: prefs.mustHaves.petFriendly || false,
          familyFriendly: prefs.mustHaves.familyFriendly || false,
          highSpeedWifi: prefs.mustHaves.highSpeedWifi || false,
        },
        
        // Dietary restrictions
        dietaryRestrictions: prefs.dietaryRestrictions.length > 0 ? prefs.dietaryRestrictions : undefined,
        
        // Travel style mapping
        travelStyle: prefs.travelStyle as DestinationSuggestRequest["travelStyle"],
        
        // Occasion
        occasion: prefs.tripContext.occasion as DestinationSuggestRequest["occasion"],
        
        // Budget level from comfort (ecoVsLuxury 0-100 to budget levels)
        budgetLevel: prefs.styleAxes.ecoVsLuxury < 25 ? "budget" 
          : prefs.styleAxes.ecoVsLuxury < 50 ? "comfort" 
          : prefs.styleAxes.ecoVsLuxury < 75 ? "premium" 
          : "luxury",
        
        // Travel month from departure date if set
        travelMonth: departureDateValue ? new Date(departureDateValue).getMonth() + 1 : new Date().getMonth() + 1,
      };
      
      const response = await getDestinationSuggestions(payload, { limit: 3 });
      
      if (response.success && response.suggestions.length > 0) {
        setDestinationSuggestions(response.suggestions);
        setDestinationProfileScore(response.basedOnProfile?.completionScore || 0);
        
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMessageId
              ? {
                  ...m,
                  text: t(response.suggestions.length > 1 ? "planner.messages.destinationsFoundPlural" : "planner.messages.destinationsFound", { count: response.suggestions.length, score: response.basedOnProfile?.completionScore || 0 }),
                  isTyping: false,
                  widget: "destinationSuggestions" as import("@/types/flight").WidgetType,
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
              ? {
                  ...m,
                  text: t("planner.messages.noDestinations"),
                  isTyping: false,
                }
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
            ? {
                ...m,
                text: t("planner.messages.errorDestinations"),
                isTyping: false,
              }
            : m
        )
      );
      setInspireFlowStep("idle");
    } finally {
      setIsLoadingDestinations(false);
    }
  }, [departureCity, departureCountry, departureDateValue, getPreferences]);

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

  // Start new session handler (reusable for both sidebar and programmatic calls)
  const handleStartNewSession = useCallback(() => {
    // Hard guard: stop persistence/auto-effects while we reset everything
    isHardResetRef.current = true;
    isSwitchingSessionRef.current = true;

    // Full reset: behave like a new user (but without onboarding)
    setIsLoading(false);
    setDynamicSuggestions([]);
    setInput("");
    lastIntentRef.current = null;
    completedMessageIdsRef.current.clear();
    userMessageCountRef.current = 0;
    airportFetchKeyRef.current = null;
    widgetFlow.resetFlowState();
    
    // CRITICAL: Reset widget cooldowns for new session
    widgetCooldown.resetCooldowns();

    // Close the widget panel when creating a new session
    eventBus.emit("panel:toggle", { visible: false });

    // Reset all persisted memories (localStorage-backed)
    resetFlightMemory();
    resetTravelMemory();
    resetAccommodationMemory();
    resetActivityMemory();
    resetPreferenceMemory();

    createNewSession();

    // Re-enable effects after the reset has settled
    setTimeout(() => {
      isSwitchingSessionRef.current = false;
      isHardResetRef.current = false;
    }, 400);
  }, [createNewSession, resetFlightMemory, resetTravelMemory, resetAccommodationMemory, resetActivityMemory, resetPreferenceMemory, widgetFlow, widgetCooldown]);

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

  // Send message
  const sendText = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userText = text.trim();

    // CRITICAL: Clear input immediately after capturing text
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    // Cleanup ignored widgets: when user types a message, any non-confirmed widget
    // should be dismissed (tracked for analytics) but kept visible in history
    setMessages((prev) => prev.map((m) => {
      if (m.widget && !m.widgetConfirmed) {
        // Dismiss widget in tracking for analytics
        widgetTracking.dismissWidget(m.id);
        // Mark as dismissed but keep in history (don't remove)
        return { ...m, widgetDismissed: true };
      }
      return m;
    }));

    // Detect "inspire" intent for preference widgets flow
    const isInspireIntent = /inspire|inspiration|idée|voyage|destination.*propos|suggest|recommend/i.test(userText);
    
    // If it's an "inspire" intent, show a beautiful message with the travel style widget directly
    if (isInspireIntent) {
      const inspireMessages = [
        t("planner.inspire.title1"),
        t("planner.inspire.title2"),
        t("planner.inspire.title3"),
        t("planner.inspire.title4"),
        t("planner.inspire.title5"),
      ];
      const randomMessage = inspireMessages[Math.floor(Math.random() * inspireMessages.length)];
      
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text: userText,
      };
      
      userMessageCountRef.current += 1;
      eventBus.emit("chat:userMessage", { text: userText, messageCount: userMessageCountRef.current });
      
      const inspireMessageId = `inspire-${Date.now()}`;
      setMessages((prev) => [
        // CRITICAL: Do NOT clear widgets - they must remain visible in chat history
        ...prev,
        userMessage,
        {
          id: inspireMessageId,
          role: "assistant",
          text: randomMessage,
          widget: "preferenceStyle" as import("@/types/flight").WidgetType,
        },
      ]);
      
      // Clear input and exit - no need to call the API
      setInput("");
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      return;
    }
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
      timestamp: Date.now(),
    };

    userMessageCountRef.current += 1;
    eventBus.emit("chat:userMessage", { text: userText, messageCount: userMessageCountRef.current });

    // CRITICAL: Do NOT clear widgets - they must remain visible in chat history
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    widgetFlow.citySelectionShownRef.current = null;

    const messageId = `bot-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", text: "", isTyping: true, timestamp: Date.now() },
    ]);

    try {
      const apiMessages = messages
        .filter((m) => !m.isTyping && m.id !== "welcome")
        .map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.text }));
      apiMessages.push({ role: "user", content: userText });

      // Build memory context
      const activityMemoryState = getActivityMemory();
      const preferenceMemoryState = getPreferenceMemory();
      const visualContext = mapContext.buildContextString();

      const activityContext =
        typeof activityMemoryState?.totalActivities === 'number' && activityMemoryState.totalActivities > 0
          ? `\n[ACTIVITÉS] ${activityMemoryState.totalActivities} activité(s) planifiée(s)`
          : "";

      const preferenceContext = preferenceMemoryState
        ? `\n[PRÉFÉRENCES] Rythme: ${preferenceMemoryState.pace}, Style: ${preferenceMemoryState.travelStyle}, Confort: ${preferenceMemoryState.comfortLabel}, Intérêts: ${(preferenceMemoryState.interests as string[])?.join(", ") || ""}`
        : "";

      // Build active widgets context for "choose for me" functionality
      const activeWidgetsContext = widgetTracking.getActiveWidgetsContext();
      // Also get pending widgets from messages for more accurate options
      const pendingWidgets = widgetActionExecutor.getPendingWidgets();
      
      // Build detailed destination context for "choose for me"
      let destinationDetailsContext = "";
      const destinationWidgetMessage = messages.find(
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
        destinationDetailsContext = `[DESTINATIONS PROPOSÉES - CHOISIS PARMI CELLES-CI]\n${suggestions.map((d, i) => 
          `${i + 1}. **${d.countryName}** (${d.countryCode})${d.matchScore ? ` - ${d.matchScore}% match` : ""}\n` +
          `   Titre: ${d.headline || "Non spécifié"}\n` +
          `   Description: ${d.description || "Non spécifié"}\n` +
          `   Points forts: ${d.highlights?.join(", ") || "Non spécifié"}\n` +
          `   Budget: ${d.budgetRange || "Non spécifié"}`
        ).join("\n\n")}`;
      }
      
      const pendingWidgetsContext = pendingWidgets.length > 0
        ? pendingWidgets.map((w) => 
            w.options 
              ? `- Widget "${w.type}" avec options: ${w.options.join(", ")}`
              : `- Widget "${w.type}" en attente`
          ).join("\n")
        : "";
      
      // Prioritize destination details, then add user preferences context
      const userPrefsForChoice = preferenceMemoryState
        ? `\n[PRÉFÉRENCES UTILISATEUR POUR LE CHOIX]\n` +
          `- Style: ${preferenceMemoryState.travelStyle || "non défini"}\n` +
          `- Rythme: ${preferenceMemoryState.pace || "non défini"}\n` +
          `- Intérêts: ${(preferenceMemoryState.interests as string[])?.join(", ") || "non définis"}\n` +
          `- Niveau confort: ${preferenceMemoryState.comfortLabel || "non défini"}`
        : "";
      
      const combinedWidgetContext = [
        destinationDetailsContext,
        userPrefsForChoice,
        activeWidgetsContext,
        pendingWidgetsContext ? `[OPTIONS WIDGETS ACTIFS]\n${pendingWidgetsContext}` : ""
      ].filter(Boolean).join("\n\n").trim();

      const { content, flightData, preferencesData, quickReplies, destinationSuggestionRequest, intentClassification, flightSearchTrigger } = await streamResponse(
        apiMessages,
        messageId,
        {
          flightSummary: getMemorySummary(),
          activityContext: activityContext + (visualContext ? `\n${visualContext}` : ""),
          preferenceContext,
          missingFields,
          widgetHistory: widgetTracking.getContextForLLM(),
          activeWidgetsContext: combinedWidgetContext, // Include active widgets for "choose for me"
          // Phase 3: Enriched session context
          conversationSummary: sessionContext.buildConversationSummary(5),
          sessionEntities: sessionContext.sessionEntities,
          widgetDecisions: sessionContext.widgetDecisions,
          // Trip Basket: user selections summary
          basketSummary: getBasketSummary(),
          // Anti-loop: blocked widgets that should not be re-proposed
          blockedWidgets: widgetCooldown.getBlockedWidgets(),
          // Deterministic preference-first logic: send current preferences state
          preferencesState: {
            interests: (Array.isArray(preferenceMemoryState?.interests) ? preferenceMemoryState.interests as string[] : []),
            style: (typeof preferenceMemoryState?.travelStyle === "string" ? preferenceMemoryState.travelStyle : null),
            pace: (typeof preferenceMemoryState?.pace === "string" ? preferenceMemoryState.pace : null),
            styleAxesConfigured: (() => {
              const axes = preferenceMemoryState?.styleAxes as import("@/stores/hooks").StyleAxes | undefined;
              if (!axes) return false;
              // Style is configured if ANY axis has been moved from the default (50)
              return axes.chillVsIntense !== 50 || axes.cityVsNature !== 50 || axes.ecoVsLuxury !== 50 || axes.touristVsLocal !== 50;
            })(),
          },
        },
        (id, text, isComplete) => {
          // CRITICAL: Prevent late updates from resetting isStreaming after message is complete
          if (completedMessageIdsRef.current.has(id) && !isComplete) {
            return; // Ignore stale updates for already-completed messages
          }
          if (isComplete) {
            completedMessageIdsRef.current.add(id);
          }
          
          setMessages((prev) =>
            prev.map((m) =>
              m.id === id
                ? { ...m, text, isStreaming: !isComplete, isTyping: false }
                : m
            )
          );
        }
      );

      // Process intent classification for debug and potential widget triggering
      if (intentClassification) {
        console.log("[PlannerChat] Intent classification received:", intentClassification);
        setLastIntentClassification(intentClassification);
        
        // Process through unified intent router for validation and potential widget triggering
        const intentResult = intentRouter.processIntent(intentClassification);
        if (intentResult.widgetType) {
          setLastWidgetTriggered(intentResult.widgetType);
          
          // CRITICAL: When intent router validates a widget, attach it to the message
          // This covers gather_preferences, express_constraint, and any other intent with a valid widget
          if (intentResult.shouldShowWidget && intentResult.widgetType) {
            const widgetType = intentResult.widgetType as import("@/types/flight").WidgetType;
            intentWidgetRef.current = widgetType; // Safeguard: store in ref for fallback
            console.log("[PlannerChat] Intent", intentClassification.primaryIntent, ": Adding widget to message:", widgetType);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? { ...m, widget: widgetType, widgetData: intentResult.widgetData, widgetConfirmed: false }
                  : m
              )
            );
          }
        }
        
        // FIX #2 & #3: When provide_destination is detected with a destinationCity,
        // mark any pending citySelector widget as confirmed AND update flight memory
        if (intentClassification.primaryIntent === "provide_destination" && intentClassification.entities?.destinationCity) {
          const destinationCity = intentClassification.entities.destinationCity as string;
          console.log("[PlannerChat] provide_destination: Confirming citySelector and updating flight memory for:", destinationCity);
          
          // Mark any pending citySelector as confirmed
          setMessages((prev) =>
            prev.map((m) =>
              m.widget === "citySelector" && !m.widgetConfirmed
                ? { ...m, widgetConfirmed: true, widgetDisplayLabel: destinationCity }
                : m
            )
          );
          
          // Update flight memory with destination city + geocoded coordinates
          updateMemory({ arrival: { city: destinationCity } });
          eventBus.emit("flight:updateFormData", { to: destinationCity });
          
          // Geocode city to get coordinates for map route
          geocodeCity(destinationCity).then((coords) => {
            if (coords) {
              console.log("[PlannerChat] Geocoded destination:", destinationCity, coords);
              updateMemory({
                arrival: {
                  city: destinationCity,
                  lat: coords.lat,
                  lng: coords.lng,
                  country: coords.country,
                  countryCode: coords.countryCode,
                },
              });
            }
          });
        }
      }

      // Handle detected preferences from chat (dietary restrictions, travel style, etc.)
      if (preferencesData && Object.keys(preferencesData).length > 0) {
        console.log("[PlannerChat] Preferences detected from chat:", preferencesData);
        imperativeHandlers.handlePreferencesDetection(preferencesData);
      }

      // Handle flight search trigger from AI
      if (flightSearchTrigger) {
        console.log("[PlannerChat] AI triggered flight search");
        eventBus.emit("flight:triggerSearch");
      }

      if (destinationSuggestionRequest) {
        console.log("[PlannerChat] LLM requested destination suggestions:", destinationSuggestionRequest);
        
        // Keep the AI's natural text, just show loading state
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isStreaming: false, isTyping: true }
              : m
          )
        );
        
        // Fetch destinations from API
        try {
          const prefs = getPreferences();
          const payload: DestinationSuggestRequest = {
            userLocation: departureCity ? { city: departureCity, country: departureCountry } : undefined,
            styleAxes: {
              chillVsIntense: prefs.styleAxes.chillVsIntense ?? 50,
              cityVsNature: prefs.styleAxes.cityVsNature ?? 50,
              ecoVsLuxury: prefs.styleAxes.ecoVsLuxury ?? 50,
              touristVsLocal: prefs.styleAxes.touristVsLocal ?? 50,
            },
            interests: prefs.interests.slice(0, 5) as DestinationSuggestRequest["interests"],
            mustHaves: {
              accessibilityRequired: prefs.mustHaves.accessibilityRequired || false,
              petFriendly: prefs.mustHaves.petFriendly || false,
              familyFriendly: prefs.mustHaves.familyFriendly || false,
              highSpeedWifi: prefs.mustHaves.highSpeedWifi || false,
            },
            dietaryRestrictions: prefs.dietaryRestrictions.length > 0 ? prefs.dietaryRestrictions : undefined,
            travelStyle: prefs.travelStyle as DestinationSuggestRequest["travelStyle"],
            occasion: prefs.tripContext.occasion as DestinationSuggestRequest["occasion"],
            budgetLevel: prefs.styleAxes.ecoVsLuxury < 25 ? "budget" 
              : prefs.styleAxes.ecoVsLuxury < 50 ? "comfort" 
              : prefs.styleAxes.ecoVsLuxury < 75 ? "premium" 
              : "luxury",
            travelMonth: departureDateValue ? new Date(departureDateValue).getMonth() + 1 : new Date().getMonth() + 1,
          };
          
          const limit = Math.min(destinationSuggestionRequest.requestedCount, 5);
          const response = await getDestinationSuggestions(payload, { limit });
          
          if (response.success && response.suggestions.length > 0) {
            // Store suggestions in memory for context
            setDestinationSuggestions(response.suggestions);
            const completionScore = response.basedOnProfile?.completionScore || 0;
            setDestinationProfileScore(completionScore);
            
            // Build conditional quick replies for low profile scores
            const profileQuickReplies: import("./chat/types").QuickReply[] = completionScore < 50 ? [
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
            
            // Update message: keep AI natural text, attach widget + quick replies
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      // Keep the original AI text (content), don't overwrite with system text
                      isTyping: false,
                      isStreaming: false,
                      widget: "destinationSuggestions" as import("@/types/flight").WidgetType,
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
                  ? {
                      ...m,
                      text: t("planner.messages.noDestinationsHint"),
                      isTyping: false,
                      isStreaming: false,
                    }
                  : m
              )
            );
          }
        } catch (apiError) {
          console.error("Error fetching destination suggestions:", apiError);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: t("planner.messages.errorDestinations"),
                    isTyping: false,
                    isStreaming: false,
                  }
                : m
            )
          );
        }
        
        setIsLoading(false);
        return; // Early return - we handled the message
      }

      // Update dynamic suggestions: combine AI response with contextual replies
      const aiReplies = quickReplies?.replies?.map((r, i) => ({
        id: `dyn-${Date.now()}-${i}`,
        label: r.label,
        emoji: r.emoji || "✈️",
        message: r.message,
      })) || [];

      // Generate contextual replies based on widget interactions and flow state
      const contextualReplies = generateContextualReplies();
      const contextualSuggestions = contextualReplies
        .filter((r) => r.action.type === "fillInput") // Only include fillInput actions as suggestions
        .map((r) => ({
          id: r.id,
          label: r.label,
          emoji: r.icon || "✨",
          message: (r.action as { type: "fillInput"; message: string }).message,
        }));

      // Combine: AI replies first, then contextual (limit to 4 total)
      const combinedSuggestions = [...aiReplies, ...contextualSuggestions].slice(0, 4);
      setDynamicSuggestions(combinedSuggestions.length > 0 ? combinedSuggestions : []);

      const { cleanContent, action } = parseAction(content || t("planner.messages.defaultError"));

      // Process flight data
      let nextMem = { ...memory, passengers: { ...memory.passengers } };
      let widget: import("@/types/flight").WidgetType | undefined;
      let showDateWidget = false;
      let showTravelersWidget = false;

      // Persist tripDuration/preferredMonth from intent entities even without flightData
      if (intentClassification?.entities) {
        const ent = intentClassification.entities as Record<string, unknown>;
        if (ent.tripDuration && typeof ent.tripDuration === 'string') {
          widgetFlow.setPendingTripDuration(ent.tripDuration);
        }
        if (ent.preferredMonth && typeof ent.preferredMonth === 'string') {
          widgetFlow.setPendingPreferredMonth(ent.preferredMonth);
        }
      }

      if (flightData && Object.keys(flightData).length > 0) {
        const needsDestinationCity = flightData.needsCitySelection && flightData.toCountryCode;
        const needsDepartureCity = flightData.fromCountryCode && !flightData.from;
        const skipDateWidget = needsDestinationCity || needsDepartureCity;

        showDateWidget = flightData.needsDateWidget === true && !skipDateWidget;
        showTravelersWidget = flightData.needsTravelersWidget === true;

        if (showDateWidget && showTravelersWidget) {
          widgetFlow.setPendingTravelersWidget(true);
        }

        if (flightData.tripDuration) {
          widgetFlow.setPendingTripDuration(flightData.tripDuration);
        }

        if (flightData.preferredMonth) {
          widgetFlow.setPendingPreferredMonth(flightData.preferredMonth);
        }

        const memoryUpdates = flightDataToMemory(flightData, memory);
        updateMemory(memoryUpdates);
        nextMem = { ...nextMem, ...memoryUpdates };

        // Issue 3 fix: Track synthetic destination_selected when LLM picks a destination (delegate_choice)
        if (flightData.toCountryCode && flightData.toCountryName) {
          widgetTracking.trackDestinationSelect(flightData.toCountryName, flightData.toCountryCode);
        }

        if (flightData.to) {
          const coords = getCityCoords(flightData.to.toLowerCase().split(",")[0].trim());
          if (coords) {
            emitTabAndZoom("flights", coords, FLIGHTS_ZOOM);
          } else {
            emitTabChange("flights");
          }
        }

        eventBus.emit("flight:updateFormData", flightData);
      } else if (action) {
        if (action.type === "chooseWidget") {
          // GUARD: Only execute if user explicitly asked for delegation
          const lastUserMsg = messages.filter(m => m.role === "user").pop();
          const delegationPatterns = /choisis|decide|décide|a toi|à toi|fais confiance|prends le|meilleur pour moi|je te laisse|tu choisis/i;
          const userAskedForChoice = lastUserMsg && delegationPatterns.test(lastUserMsg.text);
          
          if (userAskedForChoice) {
            console.log("[PlannerChat] LLM chooseWidget action (user delegated):", action);
            const executed = widgetActionExecutor.executeChooseWidgetAction(action);
            if (executed) {
              console.log("[PlannerChat] Widget action executed successfully");
            }
          } else {
            console.warn("[PlannerChat] Blocked auto-chooseWidget - user did not ask for delegation:", action);
            // Track blocked action in debug store
            const { addBlockedAction } = useDebugStore.getState();
            addBlockedAction({
              type: action.type,
              widgetType: action.widgetType || "unknown",
              option: action.option || "unknown",
              reason: "User did not explicitly ask for delegation",
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
      widget = widgetFlow.determineNextWidget(showDateWidget, showTravelersWidget, nextMem);
      const widgetData = widget ? widgetFlow.getWidgetData() : undefined;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          // CRITICAL: Preserve widget if already set by intent router (e.g. gather_preferences → preferenceInterests)
          // Only override with flight-flow widget if one was determined
          // Only override widget if flight-flow determined one; otherwise keep whatever was set by intent router
          const finalWidget = widget ? widget : (m.widget || intentWidgetRef.current);
          const finalWidgetData = widget ? widgetData : (m.widgetData || undefined);
          // Clear the ref after use
          if (intentWidgetRef.current) intentWidgetRef.current = null;
          return { ...m, text: cleanContent, isTyping: false, isStreaming: false, widget: finalWidget, widgetData: finalWidgetData };
        })
      );
    } catch (err) {
      console.error("Failed to get chat response:", err);
      widgetFlow.resetFlowState();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: t("planner.chat.errorOccurred"), isTyping: false, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

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
          // Hard guard: stop persistence/auto-effects while we wipe everything
          isHardResetRef.current = true;
          isSwitchingSessionRef.current = true;

          // Full reset: clear all state
          setIsLoading(false);
          setDynamicSuggestions([]);
          setInput("");
          lastIntentRef.current = null;
          completedMessageIdsRef.current.clear();
          userMessageCountRef.current = 0;
          airportFetchKeyRef.current = null;
          widgetFlow.resetFlowState();

          // Close the widget panel when deleting all sessions
          eventBus.emit("panel:toggle", { visible: false });

          // Reset all persisted memories (localStorage-backed)
          resetFlightMemory();
          resetTravelMemory();
          resetAccommodationMemory();
          resetActivityMemory();
          resetPreferenceMemory();

          // Delete all sessions (this also clears localStorage)
          deleteAllSessions();

          // Re-enable effects after the wipe has settled
          setTimeout(() => {
            isSwitchingSessionRef.current = false;
            isHardResetRef.current = false;
          }, 500);
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
            >
              <History className="h-4 w-4" />
            </button>

            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title={t("planner.chat.closeChat")}
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
          >
            <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
              {/* Optimized: filter once, render visible messages */}
              {messages.filter((m) => !m.isHidden).slice(-100).map((m) => (
                <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "")}>
                  {/* Content - no avatars */}
                  <div className={cn("flex-1 min-w-0", m.role === "user" ? "text-right" : "")}>
                    <div className={cn(
                      "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
                      m.role === "user" ? "bg-primary text-primary-foreground text-left" : "bg-muted text-foreground text-left"
                    )}>
                      {m.isTyping ? (
                        <div className="flex gap-1 py-1">
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
                      <MessageActions messageId={m.id} text={m.text} />
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

                    {/* Widgets - Show ConfirmedWidget when widgetConfirmed is true */}
                    {m.widget === "datePicker" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="datePicker"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.dateSelected")}
                        />
                      ) : (
                        <DatePickerWidget
                          label={t("planner.widget.selectDepartureDate")}
                          value={memory.departureDate}
                          onChange={(date) => widgetFlow.handleDateSelect(m.id, "departure", date)}
                          preferredMonth={m.widgetData?.preferredMonth}
                        />
                      )
                    )}
                    {m.widget === "returnDatePicker" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="returnDatePicker"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.dateSelected")}
                        />
                      ) : (
                        <DatePickerWidget
                          label={t("planner.widget.selectReturnDate")}
                          value={memory.returnDate}
                          onChange={(date) => widgetFlow.handleDateSelect(m.id, "return", date)}
                          minDate={memory.departureDate || undefined}
                          preferredMonth={m.widgetData?.preferredMonth}
                        />
                      )
                    )}
                    {m.widget === "dateRangePicker" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="dateRangePicker"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.datesSelected")}
                        />
                      ) : (
                        <DateRangePickerWidget
                          tripDuration={m.widgetData?.tripDuration}
                          preferredMonth={m.widgetData?.preferredMonth}
                          onConfirm={(dep, ret) => widgetFlow.handleDateRangeSelect(m.id, dep, ret)}
                        />
                      )
                    )}
                    {m.widget === "travelersSelector" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="travelersSelector"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.travelersSelected")}
                        />
                      ) : (
                        <TravelersWidget
                          initialValues={memory.passengers}
                          onConfirm={(travelers) => widgetFlow.handleTravelersSelect(m.id, travelers)}
                        />
                      )
                    )}
                    {m.widget === "tripTypeConfirm" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="tripTypeConfirm"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.tripTypeSelected")}
                        />
                      ) : (
                        <TripTypeConfirmWidget
                          currentType={memory.tripType}
                          onConfirm={(tripType) => widgetFlow.handleTripTypeConfirm(m.id, tripType)}
                        />
                      )
                    )}
                    {m.widget === "citySelector" && m.widgetData?.citySelection && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="citySelector"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.citySelected")}
                        />
                      ) : (
                        <CitySelectionWidget
                          citySelection={m.widgetData.citySelection}
                          onSelect={(cityName) => {
                            const { countryCode, countryName } = m.widgetData!.citySelection!;
                            if (m.widgetData?.isDeparture) {
                              widgetFlow.handleDepartureCitySelect(m.id, cityName, countryName, countryCode);
                            } else {
                              widgetFlow.handleCitySelect(m.id, cityName, countryName, countryCode);
                            }
                          }}
                        />
                      )
                    )}
                    {m.widget === "travelersConfirmBeforeSearch" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="travelersConfirmBeforeSearch"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.travelersConfirmed")}
                        />
                      ) : (
                        <TravelersConfirmBeforeSearchWidget
                          currentTravelers={memory.passengers}
                          onConfirm={() => widgetFlow.handleTravelersConfirmSolo(m.id)}
                          onEditConfirm={(travelers) => widgetFlow.handleTravelersEditBeforeSearch(m.id, travelers)}
                        />
                      )
                    )}
                    {m.widget === "airportConfirmation" && m.widgetData?.airportConfirmation && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="airportConfirmation"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.airportsConfirmed")}
                        />
                      ) : (
                        <AirportConfirmationWidget
                          data={m.widgetData.airportConfirmation}
                          onConfirm={(confirmed) => eventBus.emit("flight:confirmedAirports", confirmed)}
                        />
                      )
                    )}
                    
                    {/* Preference Style Widget */}
                    {m.widget === "preferenceStyle" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="preferenceStyle"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.styleConfigured")}
                        />
                      ) : (
                        <PreferenceStyleWidget onContinue={preferenceCallbacks.onStyleContinue} />
                      )
                    )}

                    {/* Preference Interests Widget */}
                    {m.widget === "preferenceInterests" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="preferenceInterests"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.interestsSelected")}
                        />
                      ) : (
                        <PreferenceInterestsWidget onContinue={preferenceCallbacks.onInterestsContinue} />
                      )
                    )}

                    {/* Must-Haves Widget */}
                    {m.widget === "mustHaves" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="mustHaves"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.mustHavesConfigured")}
                        />
                      ) : (
                        <MustHavesWidget onContinue={preferenceCallbacks.onMustHavesContinue} />
                      )
                    )}

                    {/* Dietary Widget */}
                    {m.widget === "dietary" && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="dietary"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.dietaryConfigured")}
                        />
                      ) : (
                        <DietaryWidget onContinue={preferenceCallbacks.onDietaryContinue} />
                      )
                    )}

                    {/* Destination Suggestions Grid */}
                    {m.widget === "destinationSuggestions" && m.widgetData?.suggestions && (
                      m.widgetConfirmed ? (
                        <ConfirmedWidget
                          widgetType="destinationSuggestions"
                          selectedValue={m.widgetSelectedValue}
                          displayLabel={m.widgetDisplayLabel || t("planner.widget.destinationSelected")}
                        />
                      ) : (
                      <DestinationSuggestionsGrid
                        suggestions={m.widgetData.suggestions as DestinationSuggestion[]}
                        basedOnProfile={m.widgetData.basedOnProfile as { completionScore: number; keyFactors: string[] } | undefined}
                        onSelect={async (destination) => {
                          // Track destination selection
                          widgetTracking.trackDestinationSelect(destination.countryName, destination.countryCode);

                          // Mark widget as confirmed with selected destination
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === m.id
                                ? {
                                    ...msg,
                                    widgetConfirmed: true,
                                    widgetSelectedValue: destination,
                                    widgetDisplayLabel: destination.countryName,
                                  }
                                : msg
                            )
                          );

                          // Store only country info - explicitly clear city to avoid airport search with country name
                          updateMemory({
                            arrival: {
                              city: undefined, // CRITICAL: Clear city to prevent old country name from being used
                              iata: undefined, // Also clear any old airport selection
                              airport: undefined,
                              countryCode: destination.countryCode,
                              country: destination.countryName,
                            },
                          });

                          // Reset inspire flow
                          setInspireFlowStep("idle");
                          setDestinationSuggestions([]);
                          
                          // Add loading message
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
                              
                              // Update message with city selection widget
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === loadingId
                                    ? {
                                        ...m,
                                        text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${destination.description}\n\n${t("planner.chat.whichCityToVisit")}`,
                                        isTyping: false,
                                        widget: "citySelector" as import("@/types/flight").WidgetType,
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
                              // No cities found - ask user to type city name
                              setMessages((prev) =>
                                prev.map((m) =>
                                  m.id === loadingId
                                    ? {
                                        ...m,
                                        text: `${t("planner.chat.excellentChoice", { country: destination.countryName })}\n\n${destination.description}\n\n${t("planner.chat.whichCityToVisit")} ${t("planner.chat.typeInChat")}`,
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
                        }}
                        isLoading={isLoadingDestinations}
                      />
                      )
                    )}

                    {/* Phase 4/5 Widgets - Temporarily disabled pending type fixes
                    
                    These widgets were added but have type mismatches between:
                    - WidgetData interface in types.ts
                    - Actual component prop interfaces
                    
                    TODO: Fix widget component interfaces to match WidgetData or vice versa
                    
                    Affected widgets:
                    - budgetRangeSlider
                    - quickFilterChips
                    - starRatingSelector
                    - cabinClassSelector
                    - directFlightToggle
                    - durationChips
                    - timeOfDayChips
                    - comparisonWidget
                    - conflictAlert
                    - priceAlert
                    */}

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
