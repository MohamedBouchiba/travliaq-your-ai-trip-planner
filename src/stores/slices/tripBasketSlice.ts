/**
 * Trip Basket Slice
 * Central basket for all trip selections
 */

import type { StateCreator } from 'zustand';
import {
  type TripBasketState,
  type BasketItem,
  type BasketItemType,
  type FlexibleTripType,
  type BasketItemDetails,
  initialTripBasketState,
  getRequiredSteps,
} from './tripBasketTypes';

export interface TripBasketActions {
  // Item management
  addBasketItem: (item: Omit<BasketItem, 'id' | 'addedAt'>) => string;
  removeBasketItem: (id: string) => void;
  updateBasketItem: (id: string, updates: Partial<BasketItem>) => void;
  clearBasket: () => void;
  
  // Trip type management
  setFlexibleTripType: (tripType: FlexibleTripType) => void;
  detectTripTypeFromMessage: (message: string) => FlexibleTripType | null;
  
  // Requirements
  setExplicitRequirement: (key: keyof TripBasketState['explicitRequirements'], value: boolean | null) => void;
  
  // Queries
  getBasketItems: () => BasketItem[];
  getItemsByType: (type: BasketItemType) => BasketItem[];
  getItemsByCity: (city: string) => BasketItem[];
  hasItemOfType: (type: BasketItemType) => boolean;
  getTotalPrice: () => number;
  getRequiredStepsForTripType: () => string[];
  getCompletedSteps: () => string[];
  getMissingSteps: () => string[];
  isBasketComplete: () => boolean;
  
  // LLM context
  getBasketSummary: () => string;
  getBasketForLLM: () => {
    items: Array<{
      type: string;
      name: string;
      price: number;
      city?: string;
      details: string;
    }>;
    flexibleTripType: string;
    totalPrice: number;
    currency: string;
    completedSteps: string[];
    missingSteps: string[];
    isComplete: boolean;
  };
}

export type TripBasketSlice = TripBasketState & TripBasketActions;

// Import trip type patterns
import { TRIP_TYPE_PATTERNS } from './tripBasketTypes';

/**
 * Create the trip basket slice
 * Note: Using 'any' for StateCreator to avoid intersection conflicts with FlightSlice's tripType
 */
export const createTripBasketSlice: StateCreator<
  TripBasketSlice,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  TripBasketSlice
> = (set, get) => ({
  ...initialTripBasketState,

  // ============ Item Management ============
  
  addBasketItem: (item) => {
    const id = crypto.randomUUID();
    const newItem: BasketItem = {
      ...item,
      id,
      addedAt: new Date(),
    };
    
    set((state) => ({
      basketItems: [...state.basketItems, newItem],
    }));
    
    console.log('[TripBasket] Added item:', newItem.type, newItem.name);
    return id;
  },

  removeBasketItem: (id) => {
    set((state) => ({
      basketItems: state.basketItems.filter((item) => item.id !== id),
    }));
    console.log('[TripBasket] Removed item:', id);
  },

  updateBasketItem: (id, updates) => {
    set((state) => ({
      basketItems: state.basketItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  },

  clearBasket: () => {
    set({
      basketItems: [],
      explicitRequirements: initialTripBasketState.explicitRequirements,
    });
    console.log('[TripBasket] Cleared basket');
  },

  // ============ Trip Type Management ============

  setFlexibleTripType: (flexibleTripType) => {
    const isFlightRequired = ['flight-hotel', 'custom'].includes(flexibleTripType);
    const isHotelRequired = ['flight-hotel', 'hotel-only', 'train-journey', 'road-trip'].includes(flexibleTripType);
    
    set({
      flexibleTripType,
      isFlightRequired,
      isHotelRequired,
    });
    console.log('[TripBasket] Set trip type:', flexibleTripType);
  },

  detectTripTypeFromMessage: (message) => {
    const lowerMessage = message.toLowerCase();
    
    for (const [tripType, patterns] of Object.entries(TRIP_TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
          return tripType as FlexibleTripType;
        }
      }
    }
    
    return null;
  },

  // ============ Requirements ============

  setExplicitRequirement: (key, value) => {
    set((state) => ({
      explicitRequirements: {
        ...state.explicitRequirements,
        [key]: value,
      },
    }));
  },

  // ============ Queries ============

  getBasketItems: () => get().basketItems,

  getItemsByType: (type) => get().basketItems.filter((item) => item.type === type),

  getItemsByCity: (city) => 
    get().basketItems.filter((item) => 
      item.destinationCity?.toLowerCase() === city.toLowerCase()
    ),

  hasItemOfType: (type) => get().basketItems.some((item) => item.type === type),

  getTotalPrice: () => {
    return get().basketItems.reduce((total, item) => total + item.price, 0);
  },

  getRequiredStepsForTripType: () => {
    return getRequiredSteps(get().flexibleTripType);
  },

  getCompletedSteps: () => {
    const items = get().basketItems;
    const completed: string[] = [];
    
    if (items.some(i => i.type === 'flight')) completed.push('flights');
    if (items.some(i => i.type === 'hotel')) completed.push('hotels');
    if (items.some(i => i.type === 'activity')) completed.push('activities');
    if (items.some(i => i.type === 'transfer')) completed.push('transfers');
    if (items.some(i => i.type === 'train')) completed.push('train');
    if (items.some(i => i.type === 'car-rental')) completed.push('car-rental');
    if (items.some(i => i.type === 'cruise')) completed.push('cruise');
    
    return completed;
  },

  getMissingSteps: () => {
    const required = get().getRequiredStepsForTripType();
    const completed = get().getCompletedSteps();
    
    const bookableSteps = ['flights', 'hotels', 'activities', 'transfers', 'train', 'car-rental', 'cruise'];
    const requiredBookable = required.filter(s => bookableSteps.includes(s));
    
    return requiredBookable.filter(step => !completed.includes(step));
  },

  isBasketComplete: () => {
    return get().getMissingSteps().length === 0 && get().basketItems.length > 0;
  },

  // ============ LLM Context ============

  getBasketSummary: () => {
    const state = get();
    const items = state.basketItems;
    
    if (items.length === 0) {
      return '[PANIER VOYAGE] Vide - Aucune sélection';
    }
    
    const lines: string[] = ['[PANIER VOYAGE]'];
    
    const flights = items.filter(i => i.type === 'flight');
    const hotels = items.filter(i => i.type === 'hotel');
    const activities = items.filter(i => i.type === 'activity');
    const others = items.filter(i => !['flight', 'hotel', 'activity'].includes(i.type));
    
    if (flights.length > 0) {
      flights.forEach(f => {
        lines.push(`- Vol: ${f.name}, ${f.price}${state.basketCurrency}`);
      });
    }
    
    if (hotels.length > 0) {
      hotels.forEach(h => {
        const details = h.details as unknown as Record<string, unknown> | undefined;
        const nights = details?.nights || '?';
        lines.push(`- Hôtel: ${h.name}, ${nights} nuits, ${h.price}${state.basketCurrency}`);
      });
    }
    
    if (activities.length > 0) {
      lines.push(`- Activités: ${activities.length} sélectionnées, ${activities.reduce((s, a) => s + a.price, 0)}${state.basketCurrency}`);
    }
    
    if (others.length > 0) {
      others.forEach(o => {
        lines.push(`- ${o.type}: ${o.name}, ${o.price}${state.basketCurrency}`);
      });
    }
    
    const total = state.getTotalPrice();
    lines.push(`- Total: ${total}${state.basketCurrency}`);
    
    const missing = state.getMissingSteps();
    if (missing.length > 0) {
      lines.push(`- Manque: ${missing.join(', ')}`);
    } else {
      lines.push('- Statut: Complet ✓');
    }
    
    return lines.join('\n');
  },

  getBasketForLLM: () => {
    const state = get();
    
    return {
      items: state.basketItems.map(item => ({
        type: item.type,
        name: item.name,
        price: item.price,
        city: item.destinationCity,
        details: item.description || '',
      })),
      flexibleTripType: state.flexibleTripType,
      totalPrice: state.getTotalPrice(),
      currency: state.basketCurrency,
      completedSteps: state.getCompletedSteps(),
      missingSteps: state.getMissingSteps(),
      isComplete: state.isBasketComplete(),
    };
  },
});

// Re-export types
export type { 
  TripBasketState, 
  BasketItem, 
  BasketItemType, 
  FlexibleTripType,
  BasketItemDetails,
} from './tripBasketTypes';
