/**
 * Zustand Store Types
 * Shared types for all store slices
 */

// ============================================================================
// TRAVEL SLICE TYPES
// ============================================================================

export interface DestinationInfo {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  lat?: number;
  lng?: number;
  arrivalDate?: Date;
  departureDate?: Date;
  nights?: number;
}

export interface TravelersInfo {
  adults: number;
  children: number;
  childrenAges: number[];
  infants: number;
}

export interface TravelState {
  travelers: TravelersInfo;
  destinations: DestinationInfo[];
  departureDate: Date | null;
  returnDate: Date | null;
  activeDestinationIndex: number;
}

export interface TravelActions {
  updateTravelers: (travelers: Partial<TravelersInfo>) => void;
  getTotalTravelers: () => number;
  addDestination: (destination: Omit<DestinationInfo, 'id'>) => void;
  removeDestination: (id: string) => void;
  updateDestination: (id: string, update: Partial<DestinationInfo>) => void;
  setActiveDestination: (index: number) => void;
  getActiveDestination: () => DestinationInfo | null;
  setDates: (departureDate: Date | null, returnDate: Date | null) => void;
  resetTravel: () => void;
}

export interface TravelSlice extends TravelState, TravelActions {}

// ============================================================================
// FLIGHT SLICE TYPES
// ============================================================================

export interface AirportInfo {
  airport?: string;
  iata?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
}

export interface FlightLegMemory {
  id: string;
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  date: Date | null;
}

export type TripType = 'roundtrip' | 'oneway' | 'multi';
export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

export interface FlightPassengers {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightState {
  tripType: TripType;
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  departureDate: Date | null;
  returnDate: Date | null;
  legs: FlightLegMemory[];
  passengers: FlightPassengers;
  cabinClass: CabinClass;
  directOnly: boolean;
  flexibleDates: boolean;
}

export interface FlightActions {
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

export interface FlightSlice extends FlightState, FlightActions {}

// ============================================================================
// COMBINED STORE TYPE
// ============================================================================

export interface PlannerStore extends TravelSlice, FlightSlice {
  // Hydration state
  isHydrated: boolean;
  _setHydrated: (hydrated: boolean) => void;
}
