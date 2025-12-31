/**
 * Unified Flight Types
 * 
 * This file centralizes all flight-related interfaces used across the Planner.
 * Both PlannerChat and PlannerPanel should import from here.
 */

import type { Airport } from "@/hooks/useNearestAirports";

// ===== Flight Form Data =====

/**
 * Data structure for flight search parameters.
 * Used for communication between Chat and Panel components.
 */
export interface FlightFormData {
  // Departure
  from?: string;
  fromCountryCode?: string;
  fromCountryName?: string;
  
  // Arrival
  to?: string;
  toCountryCode?: string;
  toCountryName?: string;
  
  // Dates
  departureDate?: string;
  returnDate?: string;
  
  // Passengers
  passengers?: number;
  adults?: number;
  children?: number;
  infants?: number;
  
  // Trip configuration
  tripType?: "roundtrip" | "oneway" | "multi";
  
  // UI hints for widgets
  needsTravelersWidget?: boolean;
  needsDateWidget?: boolean;
  needsCitySelection?: boolean;
  
  // Natural language hints from chat
  tripDuration?: string;    // e.g. "une semaine", "3 jours"
  preferredMonth?: string;  // e.g. "février", "summer"
  budgetHint?: string;      // e.g. "pas cher", "business"
}

// ===== Route Points =====

/**
 * Point on the map for flight routes visualization.
 */
export interface FlightRoutePoint {
  city: string;
  lat: number;
  lng: number;
}

// ===== Airport Selection =====

/**
 * Airport selection for chat buttons when multiple airports exist for a city.
 */
export interface AirportChoice {
  field: "from" | "to";
  cityName: string;
  airports: Airport[];
}

/**
 * Dual airport selection (both departure and destination in one message).
 */
export interface DualAirportChoice {
  from?: AirportChoice;
  to?: AirportChoice;
}

// ===== Multi-Destination =====

/**
 * Airport suggestion for a single leg of a multi-destination trip.
 */
export interface AirportLegSuggestion {
  legIndex: number;
  from: {
    city: string;
    suggestedAirport: Airport;
    alternativeAirports: Airport[];
  };
  to: {
    city: string;
    suggestedAirport: Airport;
    alternativeAirports: Airport[];
  };
  date?: Date;
}

/**
 * Data for airport confirmation widget in multi-destination mode.
 */
export interface AirportConfirmationData {
  legs: AirportLegSuggestion[];
}

/**
 * Confirmed airports after user selection for multi-destination search.
 */
export interface ConfirmedAirports {
  legs: Array<{
    legIndex: number;
    fromIata: string;
    fromDisplay: string;
    toIata: string;
    toDisplay: string;
    date?: Date;
  }>;
}

// ===== City Selection =====

/**
 * City choice when user selects a country.
 */
export interface CityChoice {
  name: string;
  description: string;
  population?: number;
}

/**
 * Data for city selection widget.
 */
export interface CitySelectionData {
  countryCode: string;
  countryName: string;
  cities: CityChoice[];
}

// ===== Country Selection =====

/**
 * Event emitted when a country is selected (for city disambiguation).
 */
export interface CountrySelectionEvent {
  field: "from" | "to";
  country: {
    id: string;
    name: string;
    type: string;
    country_code?: string;
    country_name?: string;
    lat?: number;
    lng?: number;
    display_name?: string;
  };
}

// ===== User Location =====

/**
 * Detected user location from IP.
 */
export interface UserLocation {
  lat: number;
  lng: number;
  city: string;
}

// ===== Widget Types =====

/**
 * Types of inline widgets that can be shown in the chat.
 */
export type WidgetType = 
  | "datePicker" 
  | "returnDatePicker" 
  | "dateRangePicker" 
  | "travelersSelector" 
  | "tripTypeConfirm" 
  | "citySelector" 
  | "travelersConfirmBeforeSearch" 
  | "airportConfirmation";

// ===== Chat Actions =====

/**
 * Actions that the chat can dispatch to control the UI.
 */
export type ChatQuickAction =
  | { type: "tab"; tab: "flights" | "activities" | "stays" | "preferences" }
  | { type: "zoom"; center: [number, number]; zoom: number }
  | { type: "tabAndZoom"; tab: "flights" | "activities" | "stays" | "preferences"; center: [number, number]; zoom: number }
  | { type: "updateFlight"; flightData: FlightFormData }
  | { type: "selectAirport"; field: "from" | "to"; airport: Airport }
  | { type: "triggerFlightSearch" }
  | { type: "triggerMultiFlightSearch"; confirmedAirports: ConfirmedAirports };
