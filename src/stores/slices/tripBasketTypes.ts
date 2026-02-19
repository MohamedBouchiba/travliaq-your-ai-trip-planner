/**
 * Trip Basket Types
 * Central basket for all trip selections (flights, hotels, activities, etc.)
 */

/**
 * Supported item types in the basket
 */
export type BasketItemType = 
  | 'flight'
  | 'hotel'
  | 'activity'
  | 'transfer'
  | 'train'
  | 'car-rental'
  | 'cruise';

/**
 * Status of a basket item
 */
export type BasketItemStatus = 'selected' | 'booked' | 'pending';

/**
 * Flexible trip types supported
 */
export type FlexibleTripType =
  | 'flight-hotel'      // Standard flight + hotel
  | 'hotel-only'        // No flight (road trip, local stay)
  | 'day-trip'          // Excursion, no overnight
  | 'train-journey'     // Train instead of flight
  | 'cruise'            // Cruise trip
  | 'road-trip'         // Car/driving trip
  | 'custom';           // User defines what they need

/**
 * Flight-specific details
 */
export interface FlightDetails {
  airline: string;
  airlineCode?: string;
  flightNumber?: string;
  departure: {
    airport: string;
    iata: string;
    city: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    iata: string;
    city: string;
    time: string;
    date: string;
  };
  duration?: string;
  stops?: number;
  cabinClass?: string;
  passengers?: number;
  pricePerPerson?: number; // per-person base price at time of search (for recalculation when traveler count changes)
  isReturn?: boolean;
  legIndex?: number;
}

/**
 * Hotel-specific details
 */
export interface HotelDetails {
  hotelName: string;
  hotelId?: string;
  address?: string;
  city: string;
  country?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rating?: number;
  stars?: number;
  roomType?: string;
  boardType?: string;
  amenities?: string[];
  imageUrl?: string;
}

/**
 * Activity-specific details
 */
export interface ActivityDetails {
  activityName: string;
  activityId?: string;
  category?: string;
  date?: string;
  time?: string;
  duration?: string;
  location?: string;
  city: string;
  description?: string;
  imageUrl?: string;
  participants?: number;
}

/**
 * Transfer-specific details
 */
export interface TransferDetails {
  transferType: 'airport-hotel' | 'hotel-airport' | 'city' | 'custom';
  from: string;
  to: string;
  date: string;
  time?: string;
  vehicleType?: string;
  passengers?: number;
}

/**
 * Train-specific details
 */
export interface TrainDetails {
  trainCompany: string;
  trainNumber?: string;
  departure: {
    station: string;
    city: string;
    time: string;
    date: string;
  };
  arrival: {
    station: string;
    city: string;
    time: string;
    date: string;
  };
  duration?: string;
  class?: string;
  passengers?: number;
}

/**
 * Car rental-specific details
 */
export interface CarRentalDetails {
  company: string;
  carType: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime?: string;
  dropoffDate: string;
  dropoffTime?: string;
  driverAge?: number;
}

/**
 * Union type for all details
 */
export type BasketItemDetails = 
  | FlightDetails 
  | HotelDetails 
  | ActivityDetails 
  | TransferDetails
  | TrainDetails
  | CarRentalDetails;

/**
 * A single item in the trip basket
 */
export interface BasketItem {
  id: string;
  type: BasketItemType;
  status: BasketItemStatus;
  price: number;
  currency: string;
  name: string;
  description?: string;
  details: BasketItemDetails;
  addedAt: Date;
  legIndex?: number; // For multi-destination trips
  destinationCity?: string; // Which city this item belongs to
}

/**
 * Trip basket state
 */
export interface TripBasketState {
  basketItems: BasketItem[];
  flexibleTripType: FlexibleTripType;
  isFlightRequired: boolean;
  isHotelRequired: boolean;
  basketCurrency: string;
  // Track what the user explicitly said they want
  explicitRequirements: {
    wantsFlight: boolean | null;
    wantsHotel: boolean | null;
    wantsActivities: boolean | null;
    wantsTransfer: boolean | null;
  };
}

/**
 * Initial basket state
 */
export const initialTripBasketState: TripBasketState = {
  basketItems: [],
  flexibleTripType: 'flight-hotel',
  isFlightRequired: true,
  isHotelRequired: true,
  basketCurrency: 'EUR',
  explicitRequirements: {
    wantsFlight: null,
    wantsHotel: null,
    wantsActivities: null,
    wantsTransfer: null,
  },
};

/**
 * Get required steps based on trip type
 */
export function getRequiredSteps(tripType: FlexibleTripType): string[] {
  const baseSteps = ['destination', 'dates', 'travelers'];
  
  switch (tripType) {
    case 'flight-hotel':
      return [...baseSteps, 'flights', 'hotels'];
    case 'hotel-only':
      return [...baseSteps, 'hotels'];
    case 'day-trip':
      return [...baseSteps, 'activities'];
    case 'train-journey':
      return [...baseSteps, 'train', 'hotels'];
    case 'cruise':
      return [...baseSteps, 'cruise'];
    case 'road-trip':
      return [...baseSteps, 'car-rental', 'hotels'];
    case 'custom':
      return baseSteps;
    default:
      return [...baseSteps, 'flights', 'hotels'];
  }
}

/**
 * Trip type detection patterns
 */
export const TRIP_TYPE_PATTERNS: Record<FlexibleTripType, string[]> = {
  'hotel-only': [
    'juste un hôtel', 'just a hotel', 'séjour sur place', 'sans vol', 
    'no flight', 'road trip', 'roadtrip', 'en voiture', 'by car',
    'je suis déjà sur place', 'already there', 'local stay'
  ],
  'day-trip': [
    'excursion', 'journée', 'day trip', 'visite à la journée',
    'one day', 'sans nuit', 'no overnight', 'day tour'
  ],
  'train-journey': [
    'en train', 'by train', 'TGV', 'Eurostar', 'Thalys', 
    'train ticket', 'billet de train', 'rail'
  ],
  'cruise': [
    'croisière', 'cruise', 'bateau', 'boat trip', 'ferry'
  ],
  'road-trip': [
    'road trip', 'roadtrip', 'en voiture', 'location de voiture',
    'car rental', 'rent a car', 'conduire', 'drive'
  ],
  'flight-hotel': [
    'vol et hôtel', 'flight and hotel', 'package', 'séjour complet'
  ],
  'custom': [],
};
