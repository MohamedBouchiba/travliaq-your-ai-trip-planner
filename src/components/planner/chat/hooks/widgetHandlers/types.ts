/**
 * Shared types for widget handler modules
 */

import type { Locale } from "date-fns";
import type { TFunction } from "i18next";
import type { FlightMemory } from "@/stores/hooks";
import type { UseWidgetCooldownReturn } from "../useWidgetCooldown";
import type { ChatMessage } from "../../types";

/** Return type of useWidgetTracking */
interface WidgetTracking {
  trackAirportSelect: (name: string, iata: string, type: "departure" | "arrival") => void;
  trackDateSelect: (date: Date, type: "departure" | "return") => void;
  trackDateRangeSelect: (departure: Date, returnDate: Date) => void;
  trackTravelersSelect: (travelers: { adults: number; children: number; infants: number }) => void;
  trackTripTypeSelect: (tripType: "roundtrip" | "oneway" | "multi") => void;
  trackCitySelect: (cityName: string, countryName: string) => void;
  recordInteraction: (id: string, type: string, data?: Record<string, unknown>, summary?: string) => void;
}

/**
 * Shared dependencies passed to all handler functions
 */
export interface HandlerDeps {
  memory: FlightMemory;
  updateMemory: (updates: Partial<FlightMemory>) => void;
  updateTravelers: (travelers: {
    adults: number;
    children: number;
    infants: number;
    childrenAges: number[];
  }) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  tracking: WidgetTracking;
  t: TFunction;
  dateFnsLocale: Locale;
  /** Build i18n-aware travelers label */
  buildTravelersLabel: (travelers: { adults: number; children: number; infants: number }) => string;
  /** Widget cooldown system to prevent re-showing confirmed widgets */
  widgetCooldown?: UseWidgetCooldownReturn;
  /** Refs for flow state */
  refs: {
    pendingTravelersWidget: React.MutableRefObject<boolean>;
    travelersConfirmed: React.MutableRefObject<boolean>;
    pendingTripDuration: React.MutableRefObject<string | null>;
    pendingPreferredMonth: React.MutableRefObject<string | null>;
    citySelectionShownForCountry: React.MutableRefObject<string | null>;
    searchButtonShown: React.MutableRefObject<boolean>;
    pendingFromCountry: React.MutableRefObject<{ code: string; name: string } | null>;
    pendingSearchAfterTravelers: React.MutableRefObject<boolean>;
  };
}
