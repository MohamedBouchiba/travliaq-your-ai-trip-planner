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
  AirportChoice,
  DualAirportChoice,
  AirportConfirmationData,
  ConfirmedAirports,
  CountrySelectionEvent,
} from "@/types/flight";
import type { AccommodationEntry } from "@/contexts/AccommodationMemoryContext";

// ===== Event Types =====

/**
 * All events that can be emitted through the bus.
 * Using discriminated union for type safety.
 */
export type PlannerEvents = {
  // Tab & Navigation
  "tab:change": { tab: "flights" | "activities" | "stays" | "preferences" };
  "tab:flash": { tab: "flights" | "activities" | "stays" | "preferences" };
  "panel:toggle": { visible: boolean };
  
  // Map interactions
  "map:zoom": { center: [number, number]; zoom: number };
  "map:moveToLocation": { lat: number; lng: number; zoom?: number };
  
  // Flight-related
  "flight:updateFormData": FlightFormData;
  "flight:selectAirport": { field: "from" | "to"; airport: AirportChoice["airports"][0] };
  "flight:askAirportChoice": AirportChoice;
  "flight:askDualAirportChoice": DualAirportChoice;
  "flight:askAirportConfirmation": AirportConfirmationData;
  "flight:confirmedAirports": ConfirmedAirports;
  "flight:triggerSearch": void;
  "flight:searchComplete": { results: unknown[] };
  
  // Country/City selection
  "location:countrySelected": CountrySelectionEvent;
  "location:citySelected": { city: string; country: string; lat: number; lng: number };
  
  // Accommodation-related
  "accommodation:update": { city: string; updates: Partial<AccommodationEntry> };
  "accommodation:syncWithFlights": void;
  
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
  
  // Chat interactions
  "chat:injectMessage": { role: "assistant" | "system"; text: string };
  "chat:offerFlightSearch": { from: string; to: string };
  
  // User actions
  "user:locationDetected": { lat: number; lng: number; city: string };
  
  // Onboarding
  "onboarding:start": void;
  "onboarding:complete": void;
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
