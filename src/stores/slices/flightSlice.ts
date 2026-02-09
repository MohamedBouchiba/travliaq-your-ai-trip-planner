/**
 * Flight Slice
 * Manages flight search state
 */

import type { StateCreator } from 'zustand';
import type {
  AirportInfo,
  FlightPassengers,
  FlightLegMemory,
  TripType,
  CabinClass,
} from '../types';

// Initial state
const initialFlightState = {
  tripType: 'roundtrip' as TripType,
  departure: null as AirportInfo | null,
  arrival: null as AirportInfo | null,
  flightDepartureDate: null as Date | null,
  flightReturnDate: null as Date | null,
  legs: [] as FlightLegMemory[],
  passengers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  cabinClass: 'economy' as CabinClass,
  directOnly: false,
  flexibleDates: false,
};

export interface FlightSlice {
  // State
  tripType: TripType;
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  flightDepartureDate: Date | null;
  flightReturnDate: Date | null;
  legs: FlightLegMemory[];
  passengers: FlightPassengers;
  cabinClass: CabinClass;
  directOnly: boolean;
  flexibleDates: boolean;
  
  // Actions
  setTripType: (type: TripType) => void;
  setDeparture: (info: AirportInfo | null) => void;
  setArrival: (info: AirportInfo | null) => void;
  setFlightDates: (departure: Date | null, returnDate?: Date | null) => void;
  setPassengers: (passengers: Partial<FlightPassengers>) => void;
  setCabinClass: (cabinClass: CabinClass) => void;
  setDirectOnly: (directOnly: boolean) => void;
  setFlexibleDates: (flexible: boolean) => void;
  addLeg: () => void;
  removeLeg: (legId: string) => void;
  updateLeg: (legId: string, update: Partial<FlightLegMemory>) => void;
  setLegs: (legs: FlightLegMemory[]) => void;
  resetFlight: () => void;
}

export const createFlightSlice: StateCreator<
  FlightSlice,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  FlightSlice
> = (set, get) => ({
  // Initial state
  ...initialFlightState,
  // Actions
  setTripType: (type: TripType) => {
    set(
      (state) => {
        if (type === 'multi' && state.tripType !== 'multi') {
          const legs: FlightLegMemory[] = [];
          if (state.departure && state.arrival) {
            legs.push({
              id: crypto.randomUUID(),
              departure: state.departure,
              arrival: state.arrival,
              date: state.flightDepartureDate,
            });
            legs.push({
              id: crypto.randomUUID(),
              departure: state.arrival,
              arrival: null,
              date: null,
            });
          } else {
            legs.push(
              { id: crypto.randomUUID(), departure: null, arrival: null, date: null },
              { id: crypto.randomUUID(), departure: null, arrival: null, date: null }
            );
          }
          return {
            tripType: type,
            legs,
            departure: null,
            arrival: null,
            flightDepartureDate: null,
            flightReturnDate: null,
          };
        }

        if (type !== 'multi' && state.tripType === 'multi' && state.legs.length > 0) {
          const firstLeg = state.legs[0];
          return {
            tripType: type,
            departure: firstLeg.departure,
            arrival: firstLeg.arrival,
            flightDepartureDate: firstLeg.date,
            flightReturnDate: type === 'roundtrip' ? null : state.flightReturnDate,
            legs: [],
          };
        }

        return { tripType: type };
      },
      false,
      'flight/setTripType'
    );
  },

  setDeparture: (info: AirportInfo | null) => {
    set(
      (state) => ({
        departure: info === null ? null : { ...state.departure, ...info },
      }),
      false,
      'flight/setDeparture'
    );
  },

  setArrival: (info: AirportInfo | null) => {
    set(
      (state) => ({
        arrival: info === null ? null : { ...state.arrival, ...info },
      }),
      false,
      'flight/setArrival'
    );
  },

  setFlightDates: (departure: Date | null, returnDate?: Date | null) => {
    set(
      {
        flightDepartureDate: departure,
        ...(returnDate !== undefined ? { flightReturnDate: returnDate } : {}),
      },
      false,
      'flight/setDates'
    );
  },

  setPassengers: (passengers: Partial<FlightPassengers>) => {
    set(
      (state) => ({
        passengers: { ...state.passengers, ...passengers },
      }),
      false,
      'flight/setPassengers'
    );
  },

  setCabinClass: (cabinClass: CabinClass) => {
    set({ cabinClass }, false, 'flight/setCabinClass');
  },

  setDirectOnly: (directOnly: boolean) => {
    set({ directOnly }, false, 'flight/setDirectOnly');
  },

  setFlexibleDates: (flexible: boolean) => {
    set({ flexibleDates: flexible }, false, 'flight/setFlexibleDates');
  },

  addLeg: () => {
    set(
      (state) => ({
        legs: [
          ...state.legs,
          { id: crypto.randomUUID(), departure: null, arrival: null, date: null },
        ],
      }),
      false,
      'flight/addLeg'
    );
  },

  removeLeg: (legId: string) => {
    set(
      (state) => ({
        legs: state.legs.filter((l) => l.id !== legId),
      }),
      false,
      'flight/removeLeg'
    );
  },

  updateLeg: (legId: string, update: Partial<FlightLegMemory>) => {
    set(
      (state) => ({
        legs: state.legs.map((l) => (l.id === legId ? { ...l, ...update } : l)),
      }),
      false,
      'flight/updateLeg'
    );
  },

  setLegs: (legs: FlightLegMemory[]) => {
    set({ legs }, false, 'flight/setLegs');
  },

  resetFlight: () => {
    set(initialFlightState, false, 'flight/reset');
  },
});
