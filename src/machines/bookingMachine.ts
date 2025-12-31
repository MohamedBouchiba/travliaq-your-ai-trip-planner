/**
 * Booking State Machine
 * 
 * Defines the state machine for the trip booking flow.
 * Uses XState for declarative, predictable state transitions.
 * 
 * This provides a single source of truth for the booking flow logic,
 * replacing implicit state scattered across multiple components.
 */

import { createMachine, assign } from "xstate";
import type { FlightFormData, ConfirmedAirports } from "@/types/flight";

// ===== Context Type =====

export interface BookingContext {
  // Trip basics
  tripType: "roundtrip" | "oneway" | "multi";
  
  // Flight data
  departure: string | null;
  arrival: string | null;
  departureDate: Date | null;
  returnDate: Date | null;
  
  // Multi-destination
  legs: Array<{
    from: string;
    to: string;
    date: Date | null;
  }>;
  
  // Passengers
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  
  // Accommodations
  accommodations: Array<{
    city: string;
    checkIn: Date | null;
    checkOut: Date | null;
  }>;
  
  // Flow state
  currentStep: number;
  confirmedAirports: ConfirmedAirports | null;
  
  // Search results
  flightResults: unknown[];
  accommodationResults: unknown[];
  
  // Errors
  error: string | null;
}

// ===== Event Types =====

export type BookingEvent =
  | { type: "SET_TRIP_TYPE"; tripType: BookingContext["tripType"] }
  | { type: "SET_DEPARTURE"; value: string }
  | { type: "SET_ARRIVAL"; value: string }
  | { type: "SET_DEPARTURE_DATE"; date: Date }
  | { type: "SET_RETURN_DATE"; date: Date }
  | { type: "SET_PASSENGERS"; passengers: BookingContext["passengers"] }
  | { type: "ADD_LEG" }
  | { type: "REMOVE_LEG"; index: number }
  | { type: "UPDATE_LEG"; index: number; field: string; value: unknown }
  | { type: "CONFIRM_AIRPORTS"; airports: ConfirmedAirports }
  | { type: "SEARCH_FLIGHTS" }
  | { type: "SEARCH_FLIGHTS_SUCCESS"; results: unknown[] }
  | { type: "SEARCH_FLIGHTS_ERROR"; error: string }
  | { type: "SELECT_FLIGHT"; flightId: string }
  | { type: "SEARCH_ACCOMMODATIONS" }
  | { type: "SEARCH_ACCOMMODATIONS_SUCCESS"; results: unknown[] }
  | { type: "SELECT_ACCOMMODATION"; accommodationId: string }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "RESET" };

// ===== State Machine =====

export const bookingMachine = createMachine(
  {
    id: "booking",
    initial: "idle",
    context: {
      tripType: "roundtrip",
      departure: null,
      arrival: null,
      departureDate: null,
      returnDate: null,
      legs: [],
      passengers: { adults: 1, children: 0, infants: 0 },
      accommodations: [],
      currentStep: 0,
      confirmedAirports: null,
      flightResults: [],
      accommodationResults: [],
      error: null,
    } as BookingContext,
    states: {
      idle: {
        on: {
          SET_TRIP_TYPE: {
            actions: "setTripType",
          },
          SET_DEPARTURE: {
            actions: "setDeparture",
          },
          SET_ARRIVAL: {
            actions: "setArrival",
            target: "hasDestination",
          },
          RESET: {
            actions: "reset",
          },
        },
      },
      hasDestination: {
        on: {
          SET_DEPARTURE_DATE: {
            actions: "setDepartureDate",
            target: "hasDates",
          },
          SET_RETURN_DATE: {
            actions: "setReturnDate",
          },
          SET_DEPARTURE: {
            actions: "setDeparture",
          },
          SET_ARRIVAL: {
            actions: "setArrival",
          },
          RESET: {
            target: "idle",
            actions: "reset",
          },
        },
      },
      hasDates: {
        on: {
          SET_PASSENGERS: {
            actions: "setPassengers",
          },
          CONFIRM_AIRPORTS: {
            actions: "confirmAirports",
            target: "readyToSearch",
          },
          SEARCH_FLIGHTS: {
            target: "searchingFlights",
          },
          SET_DEPARTURE: {
            actions: "setDeparture",
          },
          SET_ARRIVAL: {
            actions: "setArrival",
          },
          SET_DEPARTURE_DATE: {
            actions: "setDepartureDate",
          },
          SET_RETURN_DATE: {
            actions: "setReturnDate",
          },
          RESET: {
            target: "idle",
            actions: "reset",
          },
        },
      },
      readyToSearch: {
        on: {
          SEARCH_FLIGHTS: {
            target: "searchingFlights",
          },
          RESET: {
            target: "idle",
            actions: "reset",
          },
        },
      },
      searchingFlights: {
        on: {
          SEARCH_FLIGHTS_SUCCESS: {
            target: "hasFlightResults",
            actions: "setFlightResults",
          },
          SEARCH_FLIGHTS_ERROR: {
            target: "hasDates",
            actions: "setError",
          },
        },
      },
      hasFlightResults: {
        on: {
          SELECT_FLIGHT: {
            target: "flightSelected",
            actions: "selectFlight",
          },
          SEARCH_FLIGHTS: {
            target: "searchingFlights",
          },
          RESET: {
            target: "idle",
            actions: "reset",
          },
        },
      },
      flightSelected: {
        on: {
          SEARCH_ACCOMMODATIONS: {
            target: "searchingAccommodations",
          },
          NEXT_STEP: {
            target: "confirmingBooking",
          },
          RESET: {
            target: "idle",
            actions: "reset",
          },
        },
      },
      searchingAccommodations: {
        on: {
          SEARCH_ACCOMMODATIONS_SUCCESS: {
            target: "hasAccommodationResults",
            actions: "setAccommodationResults",
          },
        },
      },
      hasAccommodationResults: {
        on: {
          SELECT_ACCOMMODATION: {
            target: "confirmingBooking",
            actions: "selectAccommodation",
          },
          RESET: {
            target: "idle",
            actions: "reset",
          },
        },
      },
      confirmingBooking: {
        type: "final",
      },
    },
  },
  {
    actions: {
      setTripType: assign({
        tripType: (_, event) => {
          if (event.type === "SET_TRIP_TYPE") return event.tripType;
          return "roundtrip";
        },
      }),
      setDeparture: assign({
        departure: (_, event) => {
          if (event.type === "SET_DEPARTURE") return event.value;
          return null;
        },
      }),
      setArrival: assign({
        arrival: (_, event) => {
          if (event.type === "SET_ARRIVAL") return event.value;
          return null;
        },
      }),
      setDepartureDate: assign({
        departureDate: (_, event) => {
          if (event.type === "SET_DEPARTURE_DATE") return event.date;
          return null;
        },
      }),
      setReturnDate: assign({
        returnDate: (_, event) => {
          if (event.type === "SET_RETURN_DATE") return event.date;
          return null;
        },
      }),
      setPassengers: assign({
        passengers: (_, event) => {
          if (event.type === "SET_PASSENGERS") return event.passengers;
          return { adults: 1, children: 0, infants: 0 };
        },
      }),
      confirmAirports: assign({
        confirmedAirports: (_, event) => {
          if (event.type === "CONFIRM_AIRPORTS") return event.airports;
          return null;
        },
      }),
      setFlightResults: assign({
        flightResults: (_, event) => {
          if (event.type === "SEARCH_FLIGHTS_SUCCESS") return event.results;
          return [];
        },
        error: () => null,
      }),
      setAccommodationResults: assign({
        accommodationResults: (_, event) => {
          if (event.type === "SEARCH_ACCOMMODATIONS_SUCCESS") return event.results;
          return [];
        },
      }),
      setError: assign({
        error: (_, event) => {
          if (event.type === "SEARCH_FLIGHTS_ERROR") return event.error;
          return null;
        },
      }),
      selectFlight: assign({
        currentStep: (ctx) => ctx.currentStep + 1,
      }),
      selectAccommodation: assign({
        currentStep: (ctx) => ctx.currentStep + 1,
      }),
      reset: assign({
        tripType: () => "roundtrip" as const,
        departure: () => null,
        arrival: () => null,
        departureDate: () => null,
        returnDate: () => null,
        legs: () => [],
        passengers: () => ({ adults: 1, children: 0, infants: 0 }),
        accommodations: () => [],
        currentStep: () => 0,
        confirmedAirports: () => null,
        flightResults: () => [],
        accommodationResults: () => [],
        error: () => null,
      }),
    },
  }
);

export default bookingMachine;
