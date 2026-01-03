import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { Plane, History, User, Send } from "lucide-react";
import logo from "@/assets/logo-travliaq.png";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { useChatSessions, type StoredMessage } from "@/hooks/useChatSessions";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Chat module components - widgets imported from modular structure
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
} from "./chat/widgets";
import { getCityCoords } from "./chat/types";
import type { CountrySelectionEvent } from "@/types/flight";
import { findNearestAirports, type Airport } from "@/hooks/useNearestAirports";
import { useFlightMemory, type AirportInfo, type MissingField } from "@/contexts/FlightMemoryContext";
import { useTravelMemory } from "@/contexts/TravelMemoryContext";
import { useAccommodationMemory, type AccommodationEntry } from "@/contexts/AccommodationMemoryContext";
import { useActivityMemory, type ActivityEntry } from "@/contexts/ActivityMemoryContext";
import { usePreferenceMemory, type TripPreferences } from "@/contexts/PreferenceMemoryContext";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { eventBus, emitTabChange, emitTabAndZoom } from "@/lib/eventBus";
import { toastSuccess, toastError } from "@/lib/toast";

// Import unified types from centralized location
import type {
  ChatQuickAction,
  FlightFormData,
  AirportChoice,
  DualAirportChoice,
  WidgetType,
  CityChoice,
  CitySelectionData,
  AirportLegSuggestion,
  AirportConfirmationData,
  ConfirmedAirports,
} from "@/types/flight";

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
};

interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  isTyping?: boolean;
  isStreaming?: boolean;
  isHidden?: boolean;
  airportChoices?: AirportChoice;
  dualAirportChoices?: DualAirportChoice;
  hasSearchButton?: boolean;
  widget?: WidgetType;
  widgetData?: {
    preferredMonth?: string; // e.g. "février", "march", "summer"
    tripDuration?: string;
    citySelection?: CitySelectionData;
    isDeparture?: boolean; // true if selecting departure city
    airportConfirmation?: AirportConfirmationData; // Multi-destination airport confirmation
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface PlannerChatProps {
  // Props intentionally empty - using event bus for communication
}

export interface PlannerChatRef {
  injectSystemMessage: (event: CountrySelectionEvent) => void;
  askAirportChoice: (choice: AirportChoice) => void;
  askDualAirportChoice: (choices: DualAirportChoice) => void;
  offerFlightSearch: (from: string, to: string) => void;
  handleAccommodationUpdate: (city: string, updates: Partial<AccommodationEntry>) => boolean;
  askAirportConfirmation: (data: AirportConfirmationData) => void;
  handleActivityUpdate: (city: string, updates: Partial<ActivityEntry>) => boolean;
  handleAddActivityForCity: (city: string, activity: Partial<ActivityEntry>) => string | null;
  handlePreferencesDetection: (detectedPrefs: Partial<TripPreferences>) => void;
}

// parseAction uses getCityCoords from types.ts
function parseAction(content: string): { cleanContent: string; action: ChatQuickAction | null } {
  const actionMatch = content.match(/<action>(.*?)<\/action>/s);
  const cleanContent = content.replace(/<action>.*?<\/action>/gs, "").trim();

  if (!actionMatch) return { cleanContent, action: null };

  try {
    const actionData = JSON.parse(actionMatch[1]);
    
    if (actionData.type === "zoom" && actionData.city) {
      const coords = getCityCoords(actionData.city);
      if (coords) {
        return { cleanContent, action: { type: "zoom", center: coords, zoom: 12 } };
      }
    }
    
    if (actionData.type === "tab" && actionData.tab) {
      return { cleanContent, action: { type: "tab", tab: actionData.tab } };
    }
    
    if (actionData.type === "tabAndZoom" && actionData.tab && actionData.city) {
      const coords = getCityCoords(actionData.city);
      if (coords) {
        return { cleanContent, action: { type: "tabAndZoom", tab: actionData.tab, center: coords, zoom: 12 } };
      }
    }
  } catch (e) {
    console.error("Failed to parse action:", e);
  }

  return { cleanContent, action: null };
}

// NOTE: All inline widget components (AirportButton, DualAirportSelection, DatePickerWidget,
// DateRangePickerWidget, TravelersWidget, TripTypeConfirmWidget, TravelersConfirmBeforeSearchWidget,
// CitySelectionWidget, AirportConfirmationWidget, MarkdownMessage) have been moved to ./chat/widgets/
// and are imported at the top of this file.

// Helper to convert FlightFormData to memory updates
function flightDataToMemory(flightData: FlightFormData): Partial<{
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  departureDate: Date | null;
  returnDate: Date | null;
  passengers: { adults: number; children: number; infants: number };
  tripType: "roundtrip" | "oneway" | "multi";
}> {
  const updates: ReturnType<typeof flightDataToMemory> = {};
  
  if (flightData.from) {
    updates.departure = { city: flightData.from };
  }
  if (flightData.to) {
    updates.arrival = { city: flightData.to };
  }
  if (flightData.departureDate) {
    updates.departureDate = new Date(flightData.departureDate);
  }
  if (flightData.returnDate) {
    updates.returnDate = new Date(flightData.returnDate);
  }
  // Handle new adults/children/infants format
  if (flightData.adults !== undefined || flightData.children !== undefined || flightData.infants !== undefined) {
    updates.passengers = { 
      adults: flightData.adults || 1, 
      children: flightData.children || 0, 
      infants: flightData.infants || 0 
    };
  } else if (flightData.passengers) {
    updates.passengers = { adults: flightData.passengers, children: 0, infants: 0 };
  }
  if (flightData.tripType) {
    updates.tripType = flightData.tripType;
  }
  
  return updates;
}

// Get field label in French
function getMissingFieldLabel(field: MissingField): string {
  switch (field) {
    case "departure": return "ville de départ";
    case "arrival": return "destination";
    case "departureDate": return "date de départ";
    case "returnDate": return "date de retour";
    case "passengers": return "nombre de voyageurs";
    default: return field;
  }
}

const PlannerChatComponent = forwardRef<PlannerChatRef, PlannerChatProps>((_props, ref) => {
  // Access memory contexts for persistence
  const { getSerializedState: getFlightMemory } = useFlightMemory();
  const { getSerializedState: getAccommodationMemory } = useAccommodationMemory();
  const { getSerializedState: getTravelMemory } = useTravelMemory();
  const {
    addManualActivity,
    updateActivity,
    getActivitiesByDestination,
    getSerializedState: getActivityMemory,
  } = useActivityMemory();
  const {
    updatePreferences,
    toggleInterest,
    setPace,
    setComfortLevel,
    getSerializedState: getPreferenceMemory,
  } = usePreferenceMemory();

  // Chat sessions hook for multi-conversation management
  const {
    sessions,
    activeSessionId,
    messages: storedMessages,
    updateMessages: updateStoredMessages,
    selectSession,
    createNewSession,
    deleteSession,
    forceSyncToDatabase,
  } = useChatSessions({
    getFlightMemory,
    getAccommodationMemory,
    getTravelMemory,
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Convert stored messages to ChatMessage (with widgets/typing state)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Sync from storedMessages when switching sessions (avoid feedback loop)
  useEffect(() => {
    setMessages(
      storedMessages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        isHidden: m.isHidden,
        hasSearchButton: m.hasSearchButton,
      }))
    );
  }, [activeSessionId]);

  // Persist chat history when messages change (debounced via hook)
  const persistMessages = useCallback(
    (msgs: ChatMessage[]) => {
      const toStore: StoredMessage[] = msgs
        .filter((m) => !m.isTyping)
        .map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          hasSearchButton: m.hasSearchButton,
          isHidden: m.isHidden,
        }))
        .slice(-200);
      updateStoredMessages(toStore);
    },
    [updateStoredMessages]
  );

  // Persist on message changes (excluding typing indicators)
  useEffect(() => {
    const nonTyping = messages.filter((m) => !m.isTyping);
    if (nonTyping.length > 0) {
      persistMessages(messages);
    }
  }, [messages, persistMessages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchButtonShownRef = useRef(false);
  const pendingTravelersWidgetRef = useRef(false); // Track if we need to show travelers widget after date selection
  const pendingTripDurationRef = useRef<string | null>(null); // Store trip duration for calculating return date
  const pendingPreferredMonthRef = useRef<string | null>(null); // Store preferred month for calendar navigation
  const citySelectionShownForCountryRef = useRef<string | null>(null); // Prevent duplicate city selection messages
  const pendingFromCountryRef = useRef<{ code: string; name: string } | null>(null); // Track departure country selection

  // When switching conversations, reset transient refs so workflow can restart cleanly
  useEffect(() => {
    searchButtonShownRef.current = false;
    pendingTravelersWidgetRef.current = false;
    pendingTripDurationRef.current = null;
    pendingPreferredMonthRef.current = null;
    citySelectionShownForCountryRef.current = null;
    pendingFromCountryRef.current = null;
    setIsLoading(false);
    setInput("");
  }, [activeSessionId]);
  
  // Access flight memory
  const { memory, updateMemory, resetMemory, isReadyToSearch, hasCompleteInfo, needsAirportSelection, missingFields, getMemorySummary } = useFlightMemory();

  // Access travel memory for travelers propagation
  const { updateTravelers } = useTravelMemory();

  // Access accommodation memory for targeting specific accommodations
  const { memory: accomMemory, updateAccommodation } = useAccommodationMemory();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show appropriate message when we have complete info
  useEffect(() => {
    if (!hasCompleteInfo || searchButtonShownRef.current) return;
    
    const departure = memory.departure?.city || "départ";
    const arrival = memory.arrival?.city || "destination";
    const depCode = memory.departure?.iata ? ` (${memory.departure.iata})` : "";
    const arrCode = memory.arrival?.iata ? ` (${memory.arrival.iata})` : "";
    
    // Format dates
    const depDate = memory.departureDate ? format(memory.departureDate, "d MMMM yyyy", { locale: fr }) : "-";
    const retDate = memory.returnDate ? format(memory.returnDate, "d MMMM yyyy", { locale: fr }) : null;
    const travelers = memory.passengers.adults + memory.passengers.children;
    
    // Check if we need airports
    const needsDepartureAirport = needsAirportSelection.departure;
    const needsArrivalAirport = needsAirportSelection.arrival;
    
    if (needsDepartureAirport || needsArrivalAirport) {
      // We have cities but need airport selection - search for airports and show them
      searchButtonShownRef.current = true;
      
      const messageId = `airport-selection-${Date.now()}`;
      
      // Add typing indicator
      setMessages((prev) => [
        ...prev,
        { id: messageId, role: "assistant", text: "", isTyping: true },
      ]);
      
      // Fetch destination fact and airports in parallel
      const fetchAirportsAndFact = async () => {
        try {
          // Fetch airports for both cities if needed
          const [fromAirportsResult, toAirportsResult, factResult] = await Promise.all([
            needsDepartureAirport && memory.departure?.city 
              ? findNearestAirports(memory.departure.city, 3, memory.departure.countryCode)
              : null,
            needsArrivalAirport && memory.arrival?.city
              ? findNearestAirports(memory.arrival.city, 3, memory.arrival.countryCode)
              : null,
            memory.arrival?.city
              ? supabase.functions.invoke("destination-fact", {
                  body: { city: memory.arrival.city, country: memory.arrival.country }
                }).then(r => r.data?.fact || null).catch(() => null)
              : null,
          ]);
          
          // Build airport choices
          let dualChoices: DualAirportChoice | undefined;
          
          if (fromAirportsResult?.airports?.length || toAirportsResult?.airports?.length) {
            dualChoices = {};
            if (fromAirportsResult?.airports?.length) {
              dualChoices.from = {
                field: "from",
                cityName: memory.departure?.city || departure,
                airports: fromAirportsResult.airports,
              };
            }
            if (toAirportsResult?.airports?.length) {
              dualChoices.to = {
                field: "to",
                cityName: memory.arrival?.city || arrival,
                airports: toAirportsResult.airports,
              };
            }
          }
          
          // Build the message
          const factLine = factResult ? `\n\n💡 **Le saviez-vous ?** ${factResult}` : "";
          
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `Super ! Votre voyage **${departure} → ${arrival}** est configuré :\n\n📅 Départ : ${depDate}${retDate ? `\n📅 Retour : ${retDate}` : ""}\n👥 ${travelers} voyageur${travelers > 1 ? "s" : ""}${factLine}\n\nSélectionnez vos aéroports ci-dessous :`,
                    isTyping: false,
                    dualAirportChoices: dualChoices,
                  }
                : m
            )
          );
        } catch (error) {
          console.error("Error fetching airports/fact:", error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `Super ! Votre voyage **${departure} → ${arrival}** est configuré.\n\n📅 Départ : ${depDate}${retDate ? `\n📅 Retour : ${retDate}` : ""}\n👥 ${travelers} voyageur${travelers > 1 ? "s" : ""}\n\nVeuillez sélectionner vos aéroports dans le panneau de droite.`,
                    isTyping: false,
                  }
                : m
            )
          );
        }
      };
      
      fetchAirportsAndFact();
    } else {
      // All airports selected - ready to search!
      searchButtonShownRef.current = true;
      
      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-auto-${Date.now()}`,
          role: "assistant",
          text: `Parfait ! Votre itinéraire **${departure}${depCode} → ${arrival}${arrCode}** est prêt !\n\n📅 Départ : ${depDate}${retDate ? `\n📅 Retour : ${retDate}` : ""}\n👥 ${travelers} voyageur${travelers > 1 ? "s" : ""}\n\nCliquez ci-dessous pour lancer la recherche. 🚀`,
          hasSearchButton: true,
        },
      ]);
    }
  }, [hasCompleteInfo, isReadyToSearch, memory, needsAirportSelection]);

  // Reset search button shown when memory is reset
  useEffect(() => {
    if (!memory.departure && !memory.arrival) {
      searchButtonShownRef.current = false;
    }
  }, [memory.departure, memory.arrival]);

  // Handle airport selection from buttons (single or dual)
  const handleAirportSelect = (messageId: string, field: "from" | "to", airport: Airport, isDual?: boolean) => {
    if (isDual) {
      // For dual selection, update the message to remove the selected column
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.dualAirportChoices) return m;
          
          const updated = { ...m.dualAirportChoices };
          if (field === "from") delete updated.from;
          if (field === "to") delete updated.to;
          
          // If both are now selected, remove the whole choices block
          const stillHasChoices = updated.from || updated.to;
          return { 
            ...m, 
            dualAirportChoices: stillHasChoices ? updated : undefined 
          };
        })
      );
    } else {
      // For single selection, remove the airport choices
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, airportChoices: undefined } : m
        )
      );
    }

    // Update flight memory with full airport info (keep all data, preserve existing country info)
    const existingInfo = field === "from" ? memory.departure : memory.arrival;
    const airportInfo: AirportInfo = {
      airport: airport.name,
      iata: airport.iata,
      city: airport.city_name,
      // Preserve existing country/countryCode if we had them (from city selection), otherwise use airport's code
      country: existingInfo?.country,
      countryCode: airport.country_code || existingInfo?.countryCode,
      lat: airport.lat,
      lng: airport.lon, // Note: Airport type uses 'lon' not 'lng'
    };
    
    if (field === "from") {
      updateMemory({ departure: airportInfo });
    } else {
      updateMemory({ arrival: airportInfo });
    }

    // Add brief inline confirmation (no duplicate IATA code)
    const confirmText = field === "from" 
      ? `✓ Départ : **${airport.name}**`
      : `✓ Arrivée : **${airport.name}**`;

    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-${Date.now()}-${field}`,
        role: "assistant",
        text: confirmText,
      },
    ]);

    // Notify parent to update the flight form
    eventBus.emit("flight:selectAirport", { field, airport });
  };

  // Handle date selection from widget
  const handleDateSelect = (messageId: string, dateType: "departure" | "return", date: Date) => {
    // Compute updated memory snapshot to avoid stale reads
    let nextMem = {
      ...memory,
      passengers: { ...memory.passengers },
    };

    if (dateType === "departure") {
      nextMem = { ...nextMem, departureDate: date };
      updateMemory({ departureDate: date });

      // If we have a pending trip duration, calculate return date
      if (pendingTripDurationRef.current) {
        const duration = pendingTripDurationRef.current;
        const match = duration.match(/(\d+)\s*(semaine|jour|week|day)/i);
        let computedReturn: Date | null = null;

        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          let days = num;
          if (unit.includes("semaine") || unit.includes("week")) {
            days = num * 7;
          }
          computedReturn = addDays(date, days);
        } else if (duration.toLowerCase().includes("semaine") || duration.toLowerCase().includes("week")) {
          computedReturn = addDays(date, 7);
        }

        if (computedReturn) {
          nextMem = { ...nextMem, returnDate: computedReturn };
          updateMemory({ returnDate: computedReturn });
        }

        pendingTripDurationRef.current = null;
      }
    } else {
      nextMem = { ...nextMem, returnDate: date };
      updateMemory({ returnDate: date });
    }

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Add confirmation message
    const confirmText = dateType === "departure"
      ? `✓ Date de départ : **${format(date, "d MMMM yyyy", { locale: fr })}**`
      : `✓ Date de retour : **${format(date, "d MMMM yyyy", { locale: fr })}**`;

    // Check if we need to show travelers widget next
    if (dateType === "departure" && pendingTravelersWidgetRef.current) {
      pendingTravelersWidgetRef.current = false;

      const computedReturnInfo = nextMem.returnDate
        ? ` Retour prévu le ${format(nextMem.returnDate, "d MMMM", { locale: fr })}.`
        : "";

      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-date-${Date.now()}`,
          role: "assistant",
          text: `${confirmText}${computedReturnInfo} Maintenant, combien êtes-vous ? 🧳`,
          widget: "travelersSelector",
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-date-${Date.now()}`,
          role: "assistant",
          text: confirmText,
        },
      ]);

      // Ask for next missing field if any (based on updated snapshot)
      setTimeout(() => askNextMissingField(nextMem), 0);
    }
  };

  // Handle travelers selection from widget
  const handleTravelersSelect = (messageId: string, travelers: { adults: number; children: number; infants: number }) => {
    // Update flight memory
    updateMemory({ passengers: travelers });

    // Update travel memory for accommodation suggestions
    updateTravelers({
      adults: travelers.adults,
      children: travelers.children,
      infants: travelers.infants,
      childrenAges: [] // Default empty, user can refine in widget
    });

    // Remove widget from message (already handled by the component showing confirmation)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Build confirmation text
    const parts = [`${travelers.adults} adulte${travelers.adults > 1 ? "s" : ""}`];
    if (travelers.children > 0) {
      parts.push(`${travelers.children} enfant${travelers.children > 1 ? "s" : ""}`);
    }
    if (travelers.infants > 0) {
      parts.push(`${travelers.infants} bébé${travelers.infants > 1 ? "s" : ""}`);
    }

    // Now ask trip type confirmation before search
    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-travelers-${Date.now()}`,
        role: "assistant",
        text: `Parfait, ${parts.join(", ")} ! C'est bien un aller-retour ?`,
        widget: "tripTypeConfirm",
      },
    ]);
  };

  // Handle trip type confirmation
  const handleTripTypeConfirm = (messageId: string, tripType: "roundtrip" | "oneway" | "multi") => {
    // Update memory
    updateMemory({ tripType });

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    if (tripType === "multi") {
      // Multi-destinations: ask for all destinations
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-multi-${Date.now()}`,
          role: "assistant",
          text: `Super ! Pour un voyage multi-destinations, indiquez-moi toutes vos étapes (ex: "Paris → Rome → Barcelone → Paris" ou listez vos villes). 🗺️`,
        },
      ]);
    } else {
      // Roundtrip or oneway: ready to search
      const label = tripType === "roundtrip" ? "Aller-retour" : "Aller simple";
      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-${Date.now()}`,
          role: "assistant",
          text: `Parfait, **${label}** confirmé ! Cliquez ci-dessous pour lancer la recherche. 🚀`,
          hasSearchButton: true,
        },
      ]);
    }
  };

  // Track if we're waiting for travelers confirmation before search
  const pendingSearchAfterTravelersRef = useRef(false);

  // Handle search button click - check if travelers confirmation is needed
  const handleSearchButtonClick = (messageId: string) => {
    const totalTravelers = memory.passengers.adults + memory.passengers.children + memory.passengers.infants;
    
    // If only 1 adult (default value) and user hasn't explicitly confirmed travelers, ask confirmation
    if (totalTravelers === 1 && memory.passengers.adults === 1 && memory.passengers.children === 0 && memory.passengers.infants === 0) {
      // Mark the hasSearchButton message to hide the button and show widget instead
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, hasSearchButton: false, widget: "travelersConfirmBeforeSearch" } : m
        )
      );
      pendingSearchAfterTravelersRef.current = true;
    } else {
      // Travelers already configured, proceed with search
      eventBus.emit("flight:triggerSearch");
    }
  };

  // Handle confirmation of solo travel
  const handleTravelersConfirmSolo = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );
    pendingSearchAfterTravelersRef.current = false;
    eventBus.emit("flight:triggerSearch");
  };

  // Handle edit travelers before search
  const handleTravelersEditBeforeSearch = (messageId: string, travelers: { adults: number; children: number; infants: number }) => {
    updateMemory({ passengers: travelers });
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );
    pendingSearchAfterTravelersRef.current = false;
    
    // Show search button again with updated count
    const total = travelers.adults + travelers.children + travelers.infants;
    const parts = [`${travelers.adults} adulte${travelers.adults > 1 ? "s" : ""}`];
    if (travelers.children > 0) parts.push(`${travelers.children} enfant${travelers.children > 1 ? "s" : ""}`);
    if (travelers.infants > 0) parts.push(`${travelers.infants} bébé${travelers.infants > 1 ? "s" : ""}`);
    
    setMessages((prev) => [
      ...prev,
      {
        id: `search-ready-updated-${Date.now()}`,
        role: "assistant",
        text: `C'est noté, ${parts.join(", ")} ! Cliquez ci-dessous pour lancer la recherche. 🚀`,
        hasSearchButton: true,
      },
    ]);
  };

  // Handle city selection from widget
  const handleCitySelect = async (messageId: string, cityName: string, countryName: string, countryCode: string) => {
    // Reset country selection ref to allow re-selection later
    citySelectionShownForCountryRef.current = null;
    
    // Update memory with the selected city AND country code (important for API calls)
    updateMemory({ arrival: { city: cityName, country: countryName, countryCode } });

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Determine which date widget to show based on what we know
    // Logic:
    // - If tripDuration is known → show datePicker (we can calculate return)
    // - If tripType is oneway → show datePicker
    // - Otherwise → show dateRangePicker (need both dates)
    const hasTripDuration = !!pendingTripDurationRef.current;
    const isOneway = memory.tripType === "oneway";
    
    // Show date widget next if dates are not set
    if (!memory.departureDate) {
      let widgetType: WidgetType;
      let messageText: string;
      
      if (hasTripDuration) {
        // Duration known → just need departure date
        widgetType = "datePicker";
        messageText = `Excellent choix, **${cityName}** ! 😊 Tu as mentionné ${pendingTripDurationRef.current}. Choisis ta date de départ :`;
      } else if (isOneway) {
        // One-way trip → just need departure date
        widgetType = "datePicker";
        messageText = `Excellent choix, **${cityName}** ! 😊 Quand souhaites-tu partir ?`;
      } else {
        // Need both dates
        widgetType = "dateRangePicker";
        messageText = `Excellent choix, **${cityName}** ! 😊 Choisis tes dates de voyage :`;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-date-after-city-${Date.now()}`,
          role: "assistant",
          text: messageText,
          widget: widgetType,
          widgetData: {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          },
        },
      ]);
    } else if (!memory.returnDate && memory.tripType !== "oneway") {
      // Have departure but not return
      if (hasTripDuration) {
        // Calculate return from duration
        const duration = pendingTripDurationRef.current!;
        const match = duration.match(/(\d+)\s*(semaine|jour|week|day)/i);
        let computedReturn: Date | null = null;

        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          let days = num;
          if (unit.includes("semaine") || unit.includes("week")) {
            days = num * 7;
          }
          computedReturn = addDays(memory.departureDate!, days);
        } else if (duration.toLowerCase().includes("semaine") || duration.toLowerCase().includes("week")) {
          computedReturn = addDays(memory.departureDate!, 7);
        }

        if (computedReturn) {
          updateMemory({ returnDate: computedReturn });
          pendingTripDurationRef.current = null;
          
          // Ask for travelers next
          setMessages((prev) => [
            ...prev,
            {
              id: `ask-travelers-after-city-${Date.now()}`,
              role: "assistant",
              text: `Parfait, **${cityName}** du ${format(memory.departureDate!, "d MMMM", { locale: fr })} au ${format(computedReturn, "d MMMM", { locale: fr })} ! Combien êtes-vous ?`,
              widget: "travelersSelector",
            },
          ]);
        }
      } else {
        // Need return date
        setMessages((prev) => [
          ...prev,
          {
            id: `ask-return-after-city-${Date.now()}`,
            role: "assistant",
            text: `Excellent choix, **${cityName}** ! Quand souhaites-tu revenir ?`,
            widget: "returnDatePicker",
            widgetData: {
              preferredMonth: pendingPreferredMonthRef.current || undefined,
            },
          },
        ]);
      }
    } else {
      // Dates are complete, ask for travelers if needed
      if (memory.passengers.adults < 1) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ask-travelers-after-city-${Date.now()}`,
            role: "assistant",
            text: `Excellent choix, **${cityName}** ! Combien êtes-vous ?`,
            widget: "travelersSelector",
          },
        ]);
      }
    }
  };

  // Fetch cities for a country and show the widget
  const fetchAndShowCities = async (messageId: string, countryCode: string, countryName: string) => {
    try {
      // We must call this edge function with query params (GET) so it has `country_code`.
      // (Using `supabase.functions.invoke` here would POST without query params and return 400.)

      const fetchResponse = await fetch(
        `https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/top-cities-by-country?country_code=${countryCode}&limit=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmJubWxmcGZmbXlqbWt3YmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDQ2MTQsImV4cCI6MjA3MzUyMDYxNH0.yrju-Pv4OlfU9Et-mRWg0GRHTusL7ZpJevqKemJFbuA",
          },
        }
      );

      const data = await fetchResponse.json();
      
      if (data.cities && data.cities.length > 0) {
        const citySelection: CitySelectionData = {
          countryCode,
          countryName,
          cities: data.cities.map((c: any) => ({
            name: c.name,
            description: c.description || `Ville importante de ${countryName}`,
            population: c.population,
          })),
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isTyping: false,
                  widget: "citySelector",
                  widgetData: { ...m.widgetData, citySelection },
                }
              : m
          )
        );
      } else {
        // No cities found, ask manually
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  text: `${countryName} est une destination fascinante ! Dans quelle ville souhaites-tu aller ?`,
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
          m.id === messageId
            ? {
                ...m,
                text: `${countryName} est une destination fascinante ! Dans quelle ville souhaites-tu aller ?`,
                isTyping: false,
              }
            : m
        )
      );
    }
  };

  // Fetch and show cities for departure country selection
  const fetchAndShowCitiesForDeparture = async (messageId: string, countryCode: string, countryName: string) => {
    try {
      const fetchResponse = await fetch(
        `https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/top-cities-by-country?country_code=${countryCode}&limit=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmJubWxmcGZmbXlqbWt3YmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDQ2MTQsImV4cCI6MjA3MzUyMDYxNH0.yrju-Pv4OlfU9Et-mRWg0GRHTusL7ZpJevqKemJFbuA",
          },
        }
      );

      const data = await fetchResponse.json();
      
      if (data.cities && data.cities.length > 0) {
        const citySelection: CitySelectionData = {
          countryCode,
          countryName,
          cities: data.cities.map((c: any) => ({
            name: c.name,
            description: c.description || `Ville importante de ${countryName}`,
            population: c.population,
          })),
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isTyping: false,
                  widget: "citySelector",
                  widgetData: { 
                    ...m.widgetData, 
                    citySelection,
                    isDeparture: true, // Mark as departure city selection
                  },
                }
              : m
          )
        );
      } else {
        // No cities found, ask manually
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  text: `D'où partez-vous en ${countryName} ? Indiquez-moi la ville.`,
                  isTyping: false,
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Error fetching departure cities:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                text: `D'où partez-vous en ${countryName} ? Indiquez-moi la ville.`,
                isTyping: false,
              }
            : m
        )
      );
    }
  };

  // Handle departure city selection (from country)
  const handleDepartureCitySelect = async (messageId: string, cityName: string, countryName: string, countryCode: string) => {
    // Update memory with the selected departure city AND country code (important for API calls)
    updateMemory({ departure: { city: cityName, country: countryName, countryCode } });
    pendingFromCountryRef.current = null;

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Now check if we need to ask for destination or continue flow
    if (!memory.arrival?.city) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-destination-${Date.now()}`,
          role: "assistant",
          text: `Parfait, départ de **${cityName}** ! 😊 Où souhaitez-vous aller ?`,
        },
      ]);
    } else {
      // Destination already set, continue with dates
      askNextMissingField();
    }
  };

  // Handle date range selection (both departure AND return)
  const handleDateRangeSelect = (messageId: string, departure: Date, returnDate: Date) => {
    // Update memory with both dates
    updateMemory({ departureDate: departure, returnDate: returnDate });
    
    // Clear pending refs since dates are now set
    pendingTripDurationRef.current = null;
    pendingPreferredMonthRef.current = null;

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Get current passengers count (fresh read from memory after update)
    const currentPassengers = memory.passengers;
    const needsTravelersWidget = pendingTravelersWidgetRef.current || currentPassengers.adults < 1;
    
    // Reset ref
    pendingTravelersWidgetRef.current = false;
    
    if (needsTravelersWidget) {
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-dates-${Date.now()}`,
          role: "assistant",
          text: `✓ **${format(departure, "d MMMM", { locale: fr })}** → **${format(returnDate, "d MMMM yyyy", { locale: fr })}**. Combien êtes-vous ? 🧳`,
          widget: "travelersSelector",
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-dates-${Date.now()}`,
          role: "assistant",
          text: `✓ Dates confirmées : **${format(departure, "d MMMM", { locale: fr })}** → **${format(returnDate, "d MMMM yyyy", { locale: fr })}**`,
        },
      ]);
      
      // Ask for next missing field if any
      setTimeout(() => askNextMissingField(), 300);
    }
  };

  // Ask for the next missing field
  const askNextMissingField = (memOverride?: typeof memory) => {
    const mem = memOverride ?? memory;

    // Compute missing fields from current memory snapshot (avoid stale state/race conditions)
    const computedMissing: MissingField[] = [];
    if (!mem.departure?.iata && !mem.departure?.city) computedMissing.push("departure");
    if (!mem.arrival?.iata && !mem.arrival?.city) computedMissing.push("arrival");
    if (!mem.departureDate) computedMissing.push("departureDate");
    if (mem.tripType === "roundtrip" && !mem.returnDate) computedMissing.push("returnDate");
    if (mem.passengers.adults < 1) computedMissing.push("passengers");

    if (computedMissing.length === 0) return;

    const nextField = computedMissing[0];

    if (nextField === "departureDate") {
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-date-${Date.now()}`,
          role: "assistant",
          text: "Quand souhaitez-vous partir ? 📅",
          // If roundtrip and no duration, prefer a range picker to minimize interactions
          widget: mem.tripType === "roundtrip" && !pendingTripDurationRef.current ? "dateRangePicker" : "datePicker",
          widgetData: {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          },
        },
      ]);
    } else if (nextField === "returnDate" && mem.tripType === "roundtrip") {
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-return-date-${Date.now()}`,
          role: "assistant",
          text: "Et quand souhaitez-vous revenir ? 📅",
          widget: "returnDatePicker",
          widgetData: {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          },
        },
      ]);
    }
  };

  // Stream response from SSE
  const streamResponse = async (
    apiMessages: { role: string; content: string }[],
    messageId: string
  ): Promise<{ content: string; flightData: FlightFormData | null; accommodationData: any | null }> => {
    let fullContent = "";
    let flightData: FlightFormData | null = null;
    let accommodationData: any | null = null;

    // Include memory context in the request
    const memoryContext = getMemorySummary();

    // Build activity and preference context
    const activityMemoryState = getActivityMemory();
    const preferenceMemoryState = getPreferenceMemory();

    const activityContext = activityMemoryState && typeof activityMemoryState.totalActivities === 'number' && activityMemoryState.totalActivities > 0
      ? `\n[ACTIVITÉS] ${activityMemoryState.totalActivities} activité(s) planifiée(s)`
      : "";

    const preferenceContext = preferenceMemoryState
      ? `\n[PRÉFÉRENCES] Rythme: ${preferenceMemoryState.pace}, Style: ${preferenceMemoryState.travelStyle}, Confort: ${preferenceMemoryState.comfortLabel}, Intérêts: ${Array.isArray(preferenceMemoryState.interests) ? (preferenceMemoryState.interests as string[]).join(", ") : ""}`
      : "";

    const contextMessage = memoryContext
      ? `[CONTEXTE MÉMOIRE] ${memoryContext}${activityContext}${preferenceContext}\n[CHAMPS MANQUANTS] ${missingFields.map(getMissingFieldLabel).join(", ") || "Aucun - prêt à chercher"}`
      : "";

    const response = await fetch(
      `https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/planner-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmJubWxmcGZmbXlqbWt3YmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDQ2MTQsImV4cCI6MjA3MzUyMDYxNH0.yrju-Pv4OlfU9Et-mRWg0GRHTusL7ZpJevqKemJFbuA",
        },
        body: JSON.stringify({ 
          messages: apiMessages, 
          stream: true,
          memoryContext: contextMessage,
          missingFields: missingFields,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Stream request failed");
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            
            if (parsed.type === "flightData" && parsed.flightData) {
              flightData = parsed.flightData;
            } else if (parsed.type === "accommodationData" && parsed.accommodationData) {
              accommodationData = parsed.accommodationData;
            } else if (parsed.type === "content" && parsed.content) {
              fullContent += parsed.content;
              // Update message with new content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? { ...m, text: fullContent, isStreaming: true, isTyping: false }
                    : m
                )
              );
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // Mark streaming as complete
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isStreaming: false } : m
      )
    );

    return { content: fullContent, flightData, accommodationData };
  };

  // Helper function to find accommodation by city name
  const findAccommodationByCity = useCallback((cityName: string): AccommodationEntry | null => {
    const normalizedCity = cityName.toLowerCase().trim();
    return accomMemory.accommodations.find(
      a => a.city?.toLowerCase().trim() === normalizedCity
    ) || null;
  }, [accomMemory.accommodations]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    injectSystemMessage: async (event: CountrySelectionEvent) => {
      const countryCode = event.country.country_code;
      const countryKey = `${event.field}-${countryCode}`;
      
      // Prevent duplicate messages for the same country+field combination within a short time
      // But allow re-triggering if user clicks the search button again
      if (citySelectionShownForCountryRef.current === countryKey) {
        // Check if there's already a citySelector widget visible for this
        const hasActiveCitySelector = messages.some(
          (m) => m.widget === "citySelector" && !m.isTyping
        );
        if (hasActiveCitySelector) {
          console.log("[PlannerChat] City selector already visible for", countryKey);
          return;
        }
      }
      citySelectionShownForCountryRef.current = countryKey;
      
      const countryName = event.country.name;
      
      // Instead of calling the AI, directly show the city selection widget
      setIsLoading(true);
      const messageId = `city-select-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { 
          id: messageId, 
          role: "assistant", 
          text: `Je vois que vous avez sélectionné **${countryName}**. Dans quelle ville de ce pays souhaitez-vous ${event.field === "from" ? "partir" : "arriver"} ?`, 
          isTyping: true 
        },
      ]);

      // Fetch cities directly
      fetchAndShowCities(messageId, countryCode, countryName);
      setIsLoading(false);
    },

    askAirportChoice: (choice: AirportChoice) => {
      const fieldLabel = choice.field === "from" ? "départ" : "destination";
      const messageId = `airport-choice-${Date.now()}`;
      
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: `🛫 La ville de **${choice.cityName}** a plusieurs aéroports. Lequel souhaitez-vous utiliser comme ${fieldLabel} ?`,
          airportChoices: choice,
        },
      ]);
    },

    askDualAirportChoice: (choices: DualAirportChoice) => {
      const messageId = `dual-airport-choice-${Date.now()}`;
      
      // Build a message describing both selections needed
      const parts: string[] = [];
      if (choices.from) parts.push(`**${choices.from.cityName}** (départ)`);
      if (choices.to) parts.push(`**${choices.to.cityName}** (arrivée)`);
      
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: `Plusieurs aéroports sont disponibles pour ${parts.join(" et ")}. Sélectionnez vos préférences :`,
          dualAirportChoices: choices,
        },
      ]);
    },

    offerFlightSearch: (from: string, to: string) => {
      const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from;
      const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to;

      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-${Date.now()}`,
          role: "assistant",
          text: `Parfait ! Votre itinéraire **${fromCode} → ${toCode}** est prêt. Cliquez ci-dessous pour lancer la recherche de vols.`,
          hasSearchButton: true,
        },
      ]);
    },

    handleAccommodationUpdate: (city: string, updates: Partial<AccommodationEntry>): boolean => {
      const accommodation = findAccommodationByCity(city);
      if (!accommodation) {
        console.warn(`[PlannerChat] No accommodation found for city: ${city}`);
        toastError(
          "Hébergement introuvable",
          `Aucun hébergement trouvé pour ${city}`
        );
        return false;
      }

      // Update the accommodation with the provided changes
      updateAccommodation(accommodation.id, updates);
      console.log(`[PlannerChat] Updated accommodation for ${city}:`, updates);

      // Show success toast
      toastSuccess(
        "Hébergement mis à jour",
        `Les préférences pour ${city} ont été modifiées`
      );
      return true;
    },

    askAirportConfirmation: (data: AirportConfirmationData) => {
      // Build a descriptive message
      const legsText = data.legs.map((leg, i) => {
        const fromAirport = leg.from.suggestedAirport;
        const toAirport = leg.to.suggestedAirport;
        return `**Segment ${i + 1}** : ${leg.from.city} → ${leg.to.city} (${fromAirport.iata} → ${toAirport.iata})`;
      }).join("\n");

      setMessages((prev) => [
        ...prev,
        {
          id: `airport-confirm-${Date.now()}`,
          role: "assistant",
          text: `J'ai identifié les aéroports suivants pour votre itinéraire multi-destination :\n\n${legsText}\n\nVous pouvez modifier chaque aéroport ci-dessous ou valider pour lancer la recherche.`,
          widget: "airportConfirmation",
          widgetData: {
            airportConfirmation: data,
          },
        },
      ]);
    },

    handleActivityUpdate: (city: string, updates: Partial<ActivityEntry>): boolean => {
      const activities = getActivitiesByDestination(city);

      if (activities.length === 0) {
        console.warn(`[PlannerChat] No activities found for city: ${city}`);
        toastError(
          "Aucune activité",
          `Aucune activité trouvée pour ${city}`
        );
        return false;
      }

      // Update all activities for this city
      activities.forEach(activity => {
        updateActivity(activity.id, updates);
      });

      console.log(`[PlannerChat] Updated ${activities.length} activity(ies) for ${city}:`, updates);

      toastSuccess(
        "Activité mise à jour",
        `${activities.length} activité(s) pour ${city} modifiée(s)`
      );
      return true;
    },

    handleAddActivityForCity: (city: string, activity: Partial<ActivityEntry>): string | null => {
      // Find destination by city
      const destination = accomMemory.accommodations.find(
        a => a.city?.toLowerCase().trim() === city.toLowerCase().trim()
      );

      if (!destination) {
        console.warn(`[PlannerChat] No destination found for city: ${city}`);
        toastError(
          "Destination introuvable",
          `Aucune destination trouvée pour ${city}`
        );
        return null;
      }

      const id = addManualActivity({
        destinationId: destination.id,
        city: destination.city || city,
        country: destination.country || "",
        ...activity,
      });

      console.log(`[PlannerChat] Added activity for ${city}:`, activity);

      toastSuccess(
        "Activité ajoutée",
        `Nouvelle activité pour ${city}`
      );
      return id;
    },

    handlePreferencesDetection: (detectedPrefs: Partial<TripPreferences>): void => {
      updatePreferences({
        ...detectedPrefs,
        detectedFromChat: true,
      });

      // Build summary of detected preferences
      const summary: string[] = [];
      if (detectedPrefs.pace) summary.push(`rythme ${detectedPrefs.pace}`);
      if (detectedPrefs.interests && detectedPrefs.interests.length > 0) {
        summary.push(`centres d'intérêt: ${detectedPrefs.interests.join(", ")}`);
      }
      if (detectedPrefs.travelStyle) summary.push(`style ${detectedPrefs.travelStyle}`);
      if (detectedPrefs.comfortLevel !== undefined) {
        const comfortLabel = detectedPrefs.comfortLevel < 25 ? "économique" :
                             detectedPrefs.comfortLevel < 50 ? "confort" :
                             detectedPrefs.comfortLevel < 75 ? "premium" : "luxe";
        summary.push(`niveau ${comfortLabel}`);
      }

      if (summary.length > 0) {
        console.log(`[PlannerChat] Detected preferences:`, detectedPrefs);
        toastSuccess(
          "Préférences détectées",
          `L'IA a détecté: ${summary.join(", ")}. Modifiez-les dans l'onglet Préférences.`
        );
      }
    },
  }));

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
    };

    // Clear any active widgets when user sends a message (user chose to type instead of click)
    setMessages((prev) => [
      ...prev.map((m) => m.widget ? { ...m, widget: undefined } : m),
      userMessage,
    ]);
    setInput("");
    setIsLoading(true);
    
    // Reset city selection ref since user is typing (might be changing their mind)
    citySelectionShownForCountryRef.current = null;

    const messageId = `bot-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", text: "", isTyping: true },
    ]);

    try {
      const apiMessages = messages
        .filter((m) => !m.isTyping && m.id !== "welcome")
        .map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.text }));
      apiMessages.push({ role: "user", content: userText });

      const { content, flightData, accommodationData } = await streamResponse(apiMessages, messageId);
      const { cleanContent, action } = parseAction(content || "Désolé, je n'ai pas pu répondre.");

      // Detect which widget to show (PRIORITY: only ONE widget at a time)
      let showDateWidget = false;
      let showTravelersWidget = false;

      // We'll build an up-to-date memory snapshot to avoid stale state in this tick
      let nextMem = {
        ...memory,
        passengers: { ...memory.passengers },
      };

      if (flightData && Object.keys(flightData).length > 0) {
        // Check for city selection (country instead of city) - handle BOTH from and to
        const needsDestinationCitySelection = flightData.needsCitySelection === true && flightData.toCountryCode;
        const needsDepartureCitySelection = flightData.fromCountryCode && !flightData.from;
        
        // Check widget flags - prioritize city selection first, then date widget
        const skipDateWidget = needsDestinationCitySelection || needsDepartureCitySelection;
        showDateWidget = flightData.needsDateWidget === true && !skipDateWidget;
        showTravelersWidget = flightData.needsTravelersWidget === true;

        // Store pending widgets for sequential display
        if (showDateWidget && showTravelersWidget) {
          pendingTravelersWidgetRef.current = true;
        }

        // Store trip duration for return date calculation
        if (flightData.tripDuration) {
          pendingTripDurationRef.current = flightData.tripDuration;
        }

        // Store preferred month for calendar navigation
        if (flightData.preferredMonth) {
          pendingPreferredMonthRef.current = flightData.preferredMonth;
        }

        // Update memory with extracted data (excluding widget flags)
        const memoryUpdates = flightDataToMemory(flightData);
        updateMemory(memoryUpdates);

        // Apply updates locally for immediate, consistent decisions
        nextMem = {
          ...nextMem,
          ...memoryUpdates,
          passengers: memoryUpdates.passengers
            ? { ...nextMem.passengers, ...memoryUpdates.passengers }
            : nextMem.passengers,
        };

        // Handle departure country (fromCountryCode) - store for later if destination also needs selection
        if (needsDepartureCitySelection && flightData.fromCountryCode && flightData.fromCountryName) {
          pendingFromCountryRef.current = { code: flightData.fromCountryCode, name: flightData.fromCountryName };
        }

        // If destination country detected, fetch cities and show widget (priority over departure)
        if (needsDestinationCitySelection && flightData.toCountryCode && flightData.toCountryName) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, text: cleanContent, isTyping: false, isStreaming: false }
                : m
            )
          );
          fetchAndShowCities(messageId, flightData.toCountryCode, flightData.toCountryName);
          setIsLoading(false);
          return;
        }
        
        // If only departure country needs selection (no destination country)
        if (needsDepartureCitySelection && !needsDestinationCitySelection && flightData.fromCountryCode && flightData.fromCountryName) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, text: cleanContent, isTyping: false, isStreaming: false }
                : m
            )
          );
          // Fetch cities for departure country
          fetchAndShowCitiesForDeparture(messageId, flightData.fromCountryCode, flightData.fromCountryName);
          setIsLoading(false);
          return;
        }

        const destCity = flightData.to;
        if (destCity) {
          const coords = getCityCoords(destCity.toLowerCase().split(",")[0].trim());
          if (coords) {
            emitTabAndZoom("flights", coords, 8);
          } else {
            emitTabChange("flights");
          }
        } else {
          emitTabChange("flights");
        }

        eventBus.emit("flight:updateFormData", flightData);
      } else if (action) {
        // Dispatch action to event bus
        if (action.type === "tab") {
          emitTabChange(action.tab);
        } else if (action.type === "zoom") {
          eventBus.emit("map:zoom", { center: action.center, zoom: action.zoom });
        } else if (action.type === "tabAndZoom") {
          emitTabAndZoom(action.tab, action.center, action.zoom);
        }
      }

      // Determine widget to show - ONLY ONE at a time, with priority order:
      // - If user hasn't given any dates: prefer a single interaction
      //   - If duration is known: pick departure only (return will be computed)
      //   - Else (roundtrip): pick a range (departure + return)
      // - If departure is known but return is missing (roundtrip): ask return
      // - Else travelers if needed
      let widget: WidgetType | undefined;

      if (showDateWidget) {
        // Default tripType is "roundtrip" if not yet defined
        const effectiveTripType = nextMem.tripType || "roundtrip";
        
        if (!nextMem.departureDate) {
          if (pendingTripDurationRef.current) {
            // Duration known: just pick departure, return is calculated
            widget = "datePicker";
          } else if (effectiveTripType === "oneway") {
            // One-way: only departure needed
            widget = "datePicker";
          } else {
            // Roundtrip (default) or multi: show range picker for departure + return
            widget = "dateRangePicker";
          }
        } else if (effectiveTripType === "roundtrip" && !nextMem.returnDate) {
          widget = "returnDatePicker";
        }
      }

      if (!widget && showTravelersWidget) {
        widget = "travelersSelector";
      }

      // Build widget data
      const widgetData = widget
        ? {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          }
        : undefined;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: cleanContent, isTyping: false, isStreaming: false, widget, widgetData }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to get chat response:", err);
      
      // Reset pending refs on error to avoid stale state
      pendingTravelersWidgetRef.current = false;
      pendingTripDurationRef.current = null;
      pendingPreferredMonthRef.current = null;
      pendingFromCountryRef.current = null;
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
                isTyping: false,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      // Always restore focus to the input to minimize clicks
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <aside className="h-full w-full bg-background flex flex-col relative overflow-hidden">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={(sessionId) => {
          selectSession(sessionId);
        }}
        onNewSession={() => {
          createNewSession();
          resetMemory();
        }}
        onDeleteSession={deleteSession}
      />

      {/* Header with history button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-4 w-4" />
          <span className="text-sm font-medium">Historique</span>
        </button>
        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
          {sessions.find((s) => s.id === activeSessionId)?.title || "Nouvelle conversation"}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
          {messages.filter((m) => !m.isHidden).map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-4",
                m.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white"
                )}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <img src={logo} alt="Travliaq" className="h-6 w-6 object-contain" />
                )}
              </div>

              {/* Message content */}
              <div
                className={cn(
                  "flex-1 min-w-0",
                  m.role === "user" ? "text-right" : ""
                )}
              >
                <div
                  className={cn(
                    "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground text-left"
                      : "bg-muted text-foreground text-left"
                  )}
                >
                  {m.isTyping ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    <>
                      <MarkdownMessage content={m.text} />
                      {m.isStreaming && (
                        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
                      )}
                    </>
                  )}
                </div>

                {/* Airport choice buttons - single */}
                {m.airportChoices && (
                  <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
                    {m.airportChoices.airports.map((airport) => (
                      <AirportButton
                        key={airport.iata}
                        airport={airport}
                        onClick={() => handleAirportSelect(m.id, m.airportChoices!.field, airport, false)}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                )}

                {/* Dual airport selection (from + to side by side) */}
                {m.dualAirportChoices && (
                  <DualAirportSelection
                    choices={m.dualAirportChoices}
                    onSelect={(field, airport) => handleAirportSelect(m.id, field, airport, true)}
                    disabled={isLoading}
                  />
                )}

                {/* Date Picker Widget */}
                {m.widget === "datePicker" && (
                  <DatePickerWidget
                    label="Choisir la date de départ"
                    value={memory.departureDate}
                    onChange={(date) => handleDateSelect(m.id, "departure", date)}
                    preferredMonth={m.widgetData?.preferredMonth}
                  />
                )}
                {m.widget === "returnDatePicker" && (
                  <DatePickerWidget
                    label="Choisir la date de retour"
                    value={memory.returnDate}
                    onChange={(date) => handleDateSelect(m.id, "return", date)}
                    minDate={memory.departureDate || undefined}
                    preferredMonth={m.widgetData?.preferredMonth}
                  />
                )}

                {/* Date Range Picker Widget (departure + return) */}
                {m.widget === "dateRangePicker" && (
                  <DateRangePickerWidget
                    tripDuration={m.widgetData?.tripDuration}
                    preferredMonth={m.widgetData?.preferredMonth}
                    onConfirm={(dep, ret) => handleDateRangeSelect(m.id, dep, ret)}
                  />
                )}

                {/* Travelers Selector Widget */}
                {m.widget === "travelersSelector" && (
                  <TravelersWidget
                    initialValues={memory.passengers}
                    onConfirm={(travelers) => handleTravelersSelect(m.id, travelers)}
                  />
                )}

                {/* Trip Type Confirmation Widget */}
                {m.widget === "tripTypeConfirm" && (
                  <TripTypeConfirmWidget
                    currentType={memory.tripType}
                    onConfirm={(tripType) => handleTripTypeConfirm(m.id, tripType)}
                  />
                )}

                {/* City Selection Widget */}
                {m.widget === "citySelector" && m.widgetData?.citySelection && (
                  <CitySelectionWidget
                    citySelection={m.widgetData.citySelection}
                    onSelect={(cityName) => {
                      const { countryCode, countryName } = m.widgetData!.citySelection!;
                      // Check if this is a departure or destination city selection
                      if (m.widgetData?.isDeparture) {
                        handleDepartureCitySelect(m.id, cityName, countryName, countryCode);
                      } else {
                        handleCitySelect(m.id, cityName, countryName, countryCode);
                      }
                    }}
                  />
                )}

                {/* Travelers Confirmation Before Search Widget */}
                {m.widget === "travelersConfirmBeforeSearch" && (
                  <TravelersConfirmBeforeSearchWidget
                    currentTravelers={memory.passengers}
                    onConfirm={() => handleTravelersConfirmSolo(m.id)}
                    onEditConfirm={(travelers) => handleTravelersEditBeforeSearch(m.id, travelers)}
                  />
                )}

                {/* Airport Confirmation Widget for multi-destination */}
                {m.widget === "airportConfirmation" && m.widgetData?.airportConfirmation && (
                  <AirportConfirmationWidget
                    data={m.widgetData.airportConfirmation}
                    onConfirm={(confirmed) => {
                      // Trigger multi-destination search with confirmed airports
                      eventBus.emit("flight:confirmedAirports", confirmed);
                    }}
                  />
                )}

                {/* Flight search button */}
                {m.hasSearchButton && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleSearchButtonClick(m.id)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                      <Plane className="h-4 w-4" />
                      Rechercher les vols maintenant
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              placeholder="Envoyer un message..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              style={{ minHeight: "40px", maxHeight: "120px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                  // Ensure focus stays on input (minimize clicks)
                  setTimeout(() => inputRef.current?.focus(), 0);
                }
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || isLoading}
              className={cn(
                "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Tapez une destination ou demandez des vols, activités, hébergements
          </p>
        </div>
      </div>
    </aside>
  );
});

PlannerChatComponent.displayName = "PlannerChat";

export default PlannerChatComponent;
