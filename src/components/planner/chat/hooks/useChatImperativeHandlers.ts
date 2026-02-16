/**
 * useChatImperativeHandlers - Hook for imperative methods exposed via ref
 *
 * These handlers are called externally by parent components to:
 * - Inject system messages (country selection)
 * - Show airport choice widgets
 * - Offer flight search
 * - Update accommodations/activities
 * - Handle preference detection
 */

import { useCallback } from "react";
import { supabaseFetch } from "@/utils/supabaseFetch";
import { toastSuccess, toastError } from "@/lib/toast";
import { eventBus } from "@/lib/eventBus";
import i18n from "@/i18n/config";
import type { CountrySelectionEvent, AirportChoice, DualAirportChoice, AirportConfirmationData, CitySelectionData } from "@/types/flight";
import type { AccommodationEntry, ActivityEntry, TripPreferences } from "@/stores/hooks";
import type { ChatMessage } from "../types";

const t = i18n.t.bind(i18n);

/**
 * Options for the imperative handlers hook
 */
export interface UseChatImperativeHandlersOptions {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // Memory functions
  findAccommodationByCity: (city: string) => AccommodationEntry | null;
  updateAccommodation: (id: string, updates: Partial<AccommodationEntry>) => void;
  getActivitiesByDestination: (city: string) => ActivityEntry[];
  updateActivity: (id: string, updates: Partial<ActivityEntry>) => void;
  addManualActivity: (activity: Partial<ActivityEntry>) => string;
  updatePreferences: (prefs: Partial<TripPreferences & { detectedFromChat?: boolean }>) => void;
  accomMemory: { accommodations: AccommodationEntry[] };

  // Refs
  citySelectionShownRef: React.MutableRefObject<string | null>;
}

/**
 * Fetch top cities for a country
 */
async function fetchTopCities(countryCode: string): Promise<CitySelectionData["cities"] | null> {
  try {
    const response = await supabaseFetch("top-cities-by-country", {
      method: "GET",
      params: { country_code: countryCode, limit: "5" },
    });

    const data = await response.json();

    if (data.cities && data.cities.length > 0) {
      return data.cities.map((c: any) => ({
        name: c.name,
        description: c.description || t("planner.systemMessage.importantCity"),
        population: c.population,
      }));
    }

    return null;
  } catch (error) {
    console.error("Error fetching cities:", error);
    return null;
  }
}

/**
 * Hook for imperative handlers
 */
export function useChatImperativeHandlers(options: UseChatImperativeHandlersOptions) {
  const {
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
    citySelectionShownRef,
  } = options;

  /**
   * Inject system message for country selection
   */
  const injectSystemMessage = useCallback(
    async (event: CountrySelectionEvent) => {
      const countryCode = event.country.country_code;
      const countryKey = `${event.field}-${countryCode}`;

      // Prevent duplicate messages
      if (citySelectionShownRef.current === countryKey) {
        const hasActiveCitySelector = messages.some(
          (m) => m.widget === "citySelector" && !m.isTyping
        );
        if (hasActiveCitySelector) {
          if (import.meta.env.DEV) console.log("[Chat] City selector already visible for", countryKey);
          return;
        }
      }
      citySelectionShownRef.current = countryKey;

      const countryName = event.country.name;
      
      const action = event.field === "from" 
        ? t("planner.systemMessage.actionDepart") 
        : t("planner.systemMessage.actionArrive");

      // Check if the latest assistant message was added very recently (within 3 seconds)
      // and could be an LLM response about the same country — if so, reuse it instead of adding a new message
      const now = Date.now();
      const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant" && !m.isTyping);
      const lastMsgTimestamp = lastAssistantMsg ? new Date(lastAssistantMsg.timestamp || 0).getTime() : 0;
      const isRecentLLMMessage = lastAssistantMsg && (now - lastMsgTimestamp < 3000 || lastAssistantMsg.id.startsWith("bot-"));
      const reuseExistingMessage = isRecentLLMMessage && !lastAssistantMsg.widget;

      const messageId = reuseExistingMessage ? lastAssistantMsg.id : `city-select-${Date.now()}`;

      setIsLoading(true);
      if (!reuseExistingMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            role: "assistant",
            text: t("planner.systemMessage.countrySelected", { country: countryName, action }),
            isTyping: true,
          },
        ]);
      } else {
        // Mark the existing message as loading while we fetch cities
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isTyping: true }
              : m
          )
        );
      }

      // Fetch cities
      const cities = await fetchTopCities(countryCode);

      if (cities) {
        const citySelection: CitySelectionData = {
          countryCode,
          countryName,
          cities,
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
                    isDeparture: event.field === "from",
                  },
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  text: t("planner.systemMessage.fascinatingDestination", { country: countryName }),
                  isTyping: false,
                }
              : m
          )
        );
      }

      setIsLoading(false);
    },
    [messages, setMessages, setIsLoading, citySelectionShownRef]
  );

  /**
   * Ask user to choose an airport (single city)
   */
  const askAirportChoice = useCallback(
    (choice: AirportChoice) => {
      const fieldLabel = choice.field === "from" 
        ? t("planner.systemMessage.fieldDeparture") 
        : t("planner.systemMessage.fieldDestination");
      const messageId = `airport-choice-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: t("planner.systemMessage.multipleAirports", { city: choice.cityName, fieldLabel }),
          airportChoices: choice,
        },
      ]);
    },
    [setMessages]
  );

  /**
   * Ask user to choose airports for both cities
   */
  const askDualAirportChoice = useCallback(
    (choices: DualAirportChoice) => {
      const messageId = `dual-airport-choice-${Date.now()}`;

      const parts: string[] = [];
      if (choices.from) parts.push(`**${choices.from.cityName}** (${t("planner.systemMessage.fieldDeparture")})`);
      if (choices.to) parts.push(`**${choices.to.cityName}** (${t("planner.systemMessage.fieldArrival")})`);

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: t("planner.systemMessage.multipleAirportsConfirm", { locations: parts.join(` ${t("planner.systemMessage.and")} `) }),
          dualAirportChoices: choices,
        },
      ]);
    },
    [setMessages]
  );

  /**
   * Offer flight search button
   */
  const offerFlightSearch = useCallback(
    (from: string, to: string) => {
      const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from;
      const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to;

      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-${Date.now()}`,
          role: "assistant",
          text: t("planner.systemMessage.routeReady", { from: fromCode, to: toCode }),
          hasSearchButton: true,
        },
      ]);
    },
    [setMessages]
  );

  /**
   * Update accommodation for a city
   */
  const handleAccommodationUpdate = useCallback(
    (city: string, updates: Partial<AccommodationEntry>): boolean => {
      const accommodation = findAccommodationByCity(city);
      if (!accommodation) {
        if (import.meta.env.DEV) console.warn(`[Chat] No accommodation found for city: ${city}`);
        toastError(
          t("planner.toast.accommodationNotFound"), 
          t("planner.toast.accommodationNotFoundDesc", { city })
        );
        return false;
      }

      updateAccommodation(accommodation.id, updates);
      if (import.meta.env.DEV) console.log(`[Chat] Updated accommodation for ${city}:`, updates);

      toastSuccess(
        t("planner.toast.accommodationUpdated"), 
        t("planner.toast.accommodationUpdatedDesc", { city })
      );
      return true;
    },
    [findAccommodationByCity, updateAccommodation]
  );

  /**
   * Ask for airport confirmation (multi-destination)
   */
  const askAirportConfirmation = useCallback(
    (data: AirportConfirmationData) => {
      const legsText = data.legs
        .map((leg, i) => {
          const fromAirport = leg.from.suggestedAirport;
          const toAirport = leg.to.suggestedAirport;
          return `**${t("planner.systemMessage.segment", { number: i + 1 })}** : ${leg.from.city} → ${leg.to.city} (${fromAirport.iata} → ${toAirport.iata})`;
        })
        .join("\n");

      setMessages((prev) => [
        ...prev,
        {
          id: `airport-confirm-${Date.now()}`,
          role: "assistant",
          text: t("planner.systemMessage.airportsIdentified", { legs: legsText }),
          widget: "airportConfirmation",
          widgetData: {
            airportConfirmation: data,
          },
        },
      ]);
    },
    [setMessages]
  );

  /**
   * Update activities for a city
   */
  const handleActivityUpdate = useCallback(
    (city: string, updates: Partial<ActivityEntry>): boolean => {
      const activities = getActivitiesByDestination(city);

      if (activities.length === 0) {
        if (import.meta.env.DEV) console.warn(`[Chat] No activities found for city: ${city}`);
        toastError(
          t("planner.toast.activityNotFound"), 
          t("planner.toast.activityNotFoundDesc", { city })
        );
        return false;
      }

      activities.forEach((activity) => {
        updateActivity(activity.id, updates);
      });

      if (import.meta.env.DEV) console.log(`[Chat] Updated ${activities.length} activity(ies) for ${city}:`, updates);

      toastSuccess(
        t("planner.toast.activityUpdated"),
        t("planner.toast.activityUpdatedDesc", { count: activities.length, city })
      );
      return true;
    },
    [getActivitiesByDestination, updateActivity]
  );

  /**
   * Add an activity for a city
   */
  const handleAddActivityForCity = useCallback(
    (city: string, activity: Partial<ActivityEntry>): string | null => {
      const destination = accomMemory.accommodations.find(
        (a) => a.city?.toLowerCase().trim() === city.toLowerCase().trim()
      );

      if (!destination) {
        if (import.meta.env.DEV) console.warn(`[Chat] No destination found for city: ${city}`);
        toastError(
          t("planner.toast.destinationNotFound"), 
          t("planner.toast.destinationNotFoundDesc", { city })
        );
        return null;
      }

      const id = addManualActivity({
        destinationId: destination.id,
        city: destination.city || city,
        country: destination.country || "",
        ...activity,
      });

      if (import.meta.env.DEV) console.log(`[Chat] Added activity for ${city}:`, activity);

      toastSuccess(
        t("planner.toast.activityAdded"), 
        t("planner.toast.activityAddedDesc", { city })
      );
      return id;
    },
    [accomMemory.accommodations, addManualActivity]
  );

  /**
   * Normalize dietary restriction strings from AI to match DietaryPicker IDs
   */
  const normalizeDietaryRestrictions = (restrictions: string[]): string[] => {
    const normalizeMap: Record<string, string> = {
      // French variations
      "végétarien": "vegetarian",
      "vegetarien": "vegetarian",
      "végan": "vegan",
      "vegan": "vegan",
      "halal": "halal",
      "casher": "kosher",
      "kosher": "kosher",
      "sans gluten": "gluten-free",
      "gluten-free": "gluten-free",
      "glutenfree": "gluten-free",
      "pescétarien": "pescatarian",
      "pescatarian": "pescatarian",
      "sans lactose": "lactose-free",
      "lactose-free": "lactose-free",
      "lactosefree": "lactose-free",
      "sans œufs": "no-eggs",
      "sans oeufs": "no-eggs",
      "no eggs": "no-eggs",
      "no-eggs": "no-eggs",
      "sans fruits à coque": "no-nuts",
      "sans noix": "no-nuts",
      "no nuts": "no-nuts",
      "no-nuts": "no-nuts",
    };

    return restrictions
      .map(r => normalizeMap[r.toLowerCase().trim()] || r.toLowerCase().trim())
      .filter((v, i, arr) => arr.indexOf(v) === i); // unique
  };

  /**
   * Map flat AI-extracted preferences to store structure
   */
  interface AIPreferencesData {
    // Flat fields from AI extraction
    travelStyle?: string;
    pace?: string;
    interests?: string[];
    occasion?: string;
    dietaryRestrictions?: string[];
    // MustHaves (flat from AI)
    accessibilityRequired?: boolean;
    petFriendly?: boolean;
    familyFriendly?: boolean;
    needsWifi?: boolean;
    // StyleAxes (flat from AI)
    chillVsIntense?: number;
    cityVsNature?: number;
    ecoVsLuxury?: number;
    touristVsLocal?: number;
  }

  /**
   * Handle detected preferences from chat
   */
  const handlePreferencesDetection = useCallback(
    (detectedPrefs: AIPreferencesData): void => {
      if (import.meta.env.DEV) console.log("[handlePreferencesDetection] Raw input:", detectedPrefs);
      
      // Build properly structured preferences for the store
      const storeUpdates: Partial<TripPreferences> = {};

      // Direct mappings
      if (detectedPrefs.travelStyle) {
        storeUpdates.travelStyle = detectedPrefs.travelStyle as TripPreferences['travelStyle'];
      }
      if (detectedPrefs.pace) {
        storeUpdates.pace = detectedPrefs.pace as TripPreferences['pace'];
      }
      if (detectedPrefs.interests && detectedPrefs.interests.length > 0) {
        storeUpdates.interests = detectedPrefs.interests;
      }

      // Normalize and set dietary restrictions
      if (detectedPrefs.dietaryRestrictions && detectedPrefs.dietaryRestrictions.length > 0) {
        storeUpdates.dietaryRestrictions = normalizeDietaryRestrictions(detectedPrefs.dietaryRestrictions);
      }

      // Map flat mustHaves to nested structure
      const hasMustHaves = 
        detectedPrefs.accessibilityRequired !== undefined ||
        detectedPrefs.petFriendly !== undefined ||
        detectedPrefs.familyFriendly !== undefined ||
        detectedPrefs.needsWifi !== undefined;

      if (hasMustHaves) {
        storeUpdates.mustHaves = {
          accessibilityRequired: detectedPrefs.accessibilityRequired ?? false,
          petFriendly: detectedPrefs.petFriendly ?? false,
          familyFriendly: detectedPrefs.familyFriendly ?? false,
          highSpeedWifi: detectedPrefs.needsWifi ?? false, // Map needsWifi → highSpeedWifi
        };
      }

      // Map flat styleAxes to nested structure
      const hasStyleAxes =
        detectedPrefs.chillVsIntense !== undefined ||
        detectedPrefs.cityVsNature !== undefined ||
        detectedPrefs.ecoVsLuxury !== undefined ||
        detectedPrefs.touristVsLocal !== undefined;

      if (hasStyleAxes) {
        storeUpdates.styleAxes = {
          chillVsIntense: detectedPrefs.chillVsIntense ?? 50,
          cityVsNature: detectedPrefs.cityVsNature ?? 50,
          ecoVsLuxury: detectedPrefs.ecoVsLuxury ?? 50,
          touristVsLocal: detectedPrefs.touristVsLocal ?? 50,
        };
      }

      // Map occasion to tripContext
      if (detectedPrefs.occasion) {
        storeUpdates.tripContext = {
          occasion: detectedPrefs.occasion as TripPreferences['tripContext']['occasion'],
          flexibility: 'flexible',
        };
      }

      // Apply to store
      updatePreferences({
        ...storeUpdates,
        detectedFromChat: true,
      });

      // Build summary for toast
      const summary: string[] = [];
      if (storeUpdates.pace) summary.push(`${t("planner.toast.pace")} ${storeUpdates.pace}`);
      if (storeUpdates.interests && storeUpdates.interests.length > 0) {
        summary.push(`${t("planner.toast.interests")}: ${storeUpdates.interests.join(", ")}`);
      }
      if (storeUpdates.travelStyle) summary.push(`${t("planner.toast.style")} ${storeUpdates.travelStyle}`);
      if (storeUpdates.dietaryRestrictions && storeUpdates.dietaryRestrictions.length > 0) {
        summary.push(`${t("planner.toast.dietary")}: ${storeUpdates.dietaryRestrictions.join(", ")}`);
      }
      if (hasMustHaves) {
        const mustHavesLabels: string[] = [];
        if (detectedPrefs.accessibilityRequired) mustHavesLabels.push(t("planner.toast.accessibility"));
        if (detectedPrefs.petFriendly) mustHavesLabels.push(t("planner.toast.pets"));
        if (detectedPrefs.familyFriendly) mustHavesLabels.push(t("planner.toast.family"));
        if (detectedPrefs.needsWifi) mustHavesLabels.push(t("planner.toast.wifi"));
        if (mustHavesLabels.length > 0) {
          summary.push(`${t("planner.toast.criteria")}: ${mustHavesLabels.join(", ")}`);
        }
      }

      if (summary.length > 0) {
        if (import.meta.env.DEV) console.log(`[Chat] Detected preferences:`, storeUpdates);
        toastSuccess(
          t("planner.toast.preferencesDetected"),
          t("planner.toast.preferencesDetectedDesc", { summary: summary.join(", ") })
        );
      }
    },
    [updatePreferences]
  );

  return {
    injectSystemMessage,
    askAirportChoice,
    askDualAirportChoice,
    offerFlightSearch,
    handleAccommodationUpdate,
    askAirportConfirmation,
    handleActivityUpdate,
    handleAddActivityForCity,
    handlePreferencesDetection,
  };
}

export default useChatImperativeHandlers;
