/**
 * Event Bus for Planner Communication
 * 
 * Centralized event bus for inter-component communication in the Planner.
 * Using 'mitt' for a lightweight, typesafe event emitter.
 * 
 * This replaces the fragmented callback pattern with a unified pub/sub system.
 */

import mitt, { Emitter } from "mitt";
import type {
  FlightFormData,
  ConfirmedAirports,
} from "@/types/flight";
import type { ViatorActivity } from "@/types/activity";
import type { HotelResult } from "@/components/planner/HotelSearchResults";
import type { NormalizedDestination, DestinationSource } from "@/types/destination";

// ===== Event Types =====

/**
 * All events that can be emitted through the bus.
 *
 * NOTE: State-like events (tab:change, map:zoom, flight:updateFormData, etc.)
 * are candidates for migration to Zustand stores. Kept here for now to avoid
 * breaking changes; prefer store.subscribe() for new features.
 */
export type PlannerEvents = {
  // Tab & Navigation
  "tab:change": { tab: "flights" | "activities" | "stays" | "preferences" };
  "tab:flash": { tab: "flights" | "activities" | "stays" | "preferences" };
  "panel:toggle": { visible: boolean };

  // Map interactions
  "map:zoom": { center: [number, number]; zoom: number };
  "map:zoomOnly": { zoom: number };
  "map:getBounds": void;
  "map:bounds": {
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  "map:searchInArea": void;
  "map:searchInAreaStatus": { isSearching: boolean };

  // Flight-related
  "flight:updateFormData": FlightFormData;
  "flight:selectAirport": { field: "from" | "to"; airport: { iata: string; name: string; city_name: string; country_code: string; lat: number; lon: number; distance_km?: number; type?: string } };
  "flight:confirmedAirports": ConfirmedAirports;
  "flight:triggerSearch": void;

  // City selection
  "location:citySelected": { city: string; country: string; lat: number; lng: number };

  // Destination Sync (Cross-widget city propagation)
  "destination:flightFinalized": {
    legId: string;
    destination: NormalizedDestination;
    isMultiCity: boolean;
  };
  "destination:accommodationUpdated": {
    accommodationId: string;
    destination: NormalizedDestination;
  };
  "sync:cityPropagated": {
    from: DestinationSource;
    to: "accommodation" | "activity";
    destination: NormalizedDestination;
  };
  "sync:blocked": {
    widget: string;
    reason: "user_override" | "manual_edit";
    destinationId: string;
  };

  // Hotel events
  "hotels:results": { hotels: HotelResult[] };
  "hotels:select": { hotel: HotelResult };
  "hotels:hover": { hotel: HotelResult | null; source?: "map" | "list" };
  "hotels:openDetail": { hotel: HotelResult };
  "hotels:openPanel": void;
  "hotels:clearSelection": void;
  "hotels:fitToPrices": void;
  "hotels:starRating": { min: number; max: number };

  // Budget & filter events
  "budget:selected": { range: { min: number; max: number }; perPerson: boolean };
  "filters:changed": { filterId: string; selected: boolean };
  "filters:cleared": void;
  "flights:directOnly": { directOnly: boolean };
  "activities:duration": { duration: string };
  "activities:timeOfDay": { timeSlot: string };

  // Activities-related
  "activities:search": {
    city: string;
    countryCode: string;
    checkIn: Date | null;
    checkOut: Date | null;
    destinationId: string;
    lat?: number;
    lng?: number;
    filters?: {
      ratingMin: number;
      budgetMin: number;
      budgetMax: number;
    };
  };
  "activities:resultsReady": {
    activities: unknown[];
    destinationId: string;
    city: string;
    lat?: number;
    lng?: number;
  };
  "activities:cityFocus": {
    city: string;
    countryCode: string;
    lat?: number;
    lng?: number;
  };
  "attraction:click": {
    attraction: ViatorActivity;
  };

  // Preferences
  "preferences:updated": {
    preferences: Record<string, unknown>;
    source: "chat" | "manual";
    fields: string[];
  };
  "preferences:conflictDetected": { field: string; chatValue: unknown; manualValue: unknown };

  // Chat interactions
  "chat:userMessage": { text: string; messageCount: number };
  "chat:dirty": { dirty: boolean };

  // Airports layer
  "airports:fetch": {
    bounds: { north: number; south: number; east: number; west: number };
    zoom: number;
  };
  "airports:loading": { isLoading: boolean };
  "airports:click": {
    airport: {
      iata: string;
      name: string;
      cityName: string | null;
      countryCode: string | null;
      lat: number;
      lng: number;
      type: "large" | "medium";
    };
  };
};

// ===== Event Bus Instance =====

/**
 * Singleton event bus instance.
 * Import this in components to emit or listen to events.
 * 
 * @example
 * // Emit an event
 * eventBus.emit("tab:change", { tab: "flights" });
 * 
 * @example
 * // Listen to an event
 * useEffect(() => {
 *   const handler = (data) => console.log(data);
 *   eventBus.on("tab:change", handler);
 *   return () => eventBus.off("tab:change", handler);
 * }, []);
 */
export const eventBus: Emitter<PlannerEvents> = mitt<PlannerEvents>();

// ===== React Hook =====

/**
 * Custom hook to subscribe to an event bus event.
 * Automatically handles cleanup on unmount.
 * 
 * @example
 * usePlannerEvent("tab:change", (data) => {
 *   console.log("Tab changed to:", data.tab);
 * });
 */
import { useEffect } from "react";

export function usePlannerEvent<K extends keyof PlannerEvents>(
  event: K,
  handler: (data: PlannerEvents[K]) => void
) {
  useEffect(() => {
    eventBus.on(event, handler);
    return () => {
      eventBus.off(event, handler);
    };
  }, [event, handler]);
}

// ===== Utility Functions =====

/**
 * Emit a tab change event.
 */
export function emitTabChange(tab: PlannerEvents["tab:change"]["tab"]) {
  eventBus.emit("tab:change", { tab });
}

/**
 * Emit a map zoom event.
 */
export function emitMapZoom(center: [number, number], zoom: number) {
  eventBus.emit("map:zoom", { center, zoom });
}

/**
 * Emit both tab change and map zoom.
 */
export function emitTabAndZoom(
  tab: PlannerEvents["tab:change"]["tab"],
  center: [number, number],
  zoom: number
) {
  eventBus.emit("tab:change", { tab });
  eventBus.emit("map:zoom", { center, zoom });
}

export default eventBus;
