/**
 * Trip Basket Store
 * Separate Zustand store to avoid type conflicts with FlightSlice.tripType
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type {
  TripBasketState,
  BasketItem,
  BasketItemType,
  FlexibleTripType,
} from './slices/tripBasketTypes';
import { initialTripBasketState, getRequiredSteps, TRIP_TYPE_PATTERNS } from './slices/tripBasketTypes';

const STORAGE_KEY = 'travliaq_trip_basket';

export interface TripBasketStore extends TripBasketState {
  // Item management
  addBasketItem: (item: Omit<BasketItem, 'id' | 'addedAt'>) => string;
  replaceItemsByType: (type: BasketItemType, item: Omit<BasketItem, 'id' | 'addedAt'>) => string;
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
    items: Array<{ type: string; name: string; price: number; city?: string; details: string }>;
    flexibleTripType: string;
    totalPrice: number;
    currency: string;
    completedSteps: string[];
    missingSteps: string[];
    isComplete: boolean;
  };
}

const customStorage = createJSONStorage<TripBasketStore>(() => localStorage, {
  reviver: (_key, value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
      return new Date(value);
    }
    return value;
  },
  replacer: (_key, value) => (value instanceof Date ? value.toISOString() : value),
});

export const useTripBasketStore = create<TripBasketStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialTripBasketState,

        addBasketItem: (item) => {
          const id = crypto.randomUUID();
          const newItem: BasketItem = { ...item, id, addedAt: new Date() };
          set((state) => ({ basketItems: [...state.basketItems, newItem] }));
          return id;
        },

        replaceItemsByType: (type, item) => {
          const id = crypto.randomUUID();
          const newItem: BasketItem = { ...item, id, addedAt: new Date() };
          set((state) => ({
            basketItems: [
              ...state.basketItems.filter((i) => i.type !== type),
              newItem,
            ],
          }));
          return id;
        },

        removeBasketItem: (id) => {
          set((state) => ({ basketItems: state.basketItems.filter((item) => item.id !== id) }));
        },

        updateBasketItem: (id, updates) => {
          set((state) => ({
            basketItems: state.basketItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
          }));
        },

        clearBasket: () => {
          set({ basketItems: [], explicitRequirements: initialTripBasketState.explicitRequirements });
        },

        setFlexibleTripType: (flexibleTripType) => {
          const isFlightRequired = ['flight-hotel', 'custom'].includes(flexibleTripType);
          const isHotelRequired = ['flight-hotel', 'hotel-only', 'train-journey', 'road-trip'].includes(flexibleTripType);
          set({ flexibleTripType, isFlightRequired, isHotelRequired });
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

        setExplicitRequirement: (key, value) => {
          set((state) => ({ explicitRequirements: { ...state.explicitRequirements, [key]: value } }));
        },

        getBasketItems: () => get().basketItems,
        getItemsByType: (type) => get().basketItems.filter((item) => item.type === type),
        getItemsByCity: (city) => get().basketItems.filter((item) => item.destinationCity?.toLowerCase() === city.toLowerCase()),
        hasItemOfType: (type) => get().basketItems.some((item) => item.type === type),
        getTotalPrice: () => get().basketItems.reduce((total, item) => total + item.price, 0),
        getRequiredStepsForTripType: () => getRequiredSteps(get().flexibleTripType),
        
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
          return required.filter(s => bookableSteps.includes(s) && !completed.includes(s));
        },

        isBasketComplete: () => get().getMissingSteps().length === 0 && get().basketItems.length > 0,

        getBasketSummary: () => {
          const state = get();
          if (state.basketItems.length === 0) return '[PANIER VOYAGE] Vide';
          const lines = ['[PANIER VOYAGE]'];
          state.basketItems.forEach(item => {
            lines.push(`- ${item.type}: ${item.name}, ${item.price}${state.basketCurrency}`);
          });
          lines.push(`- Total: ${state.getTotalPrice()}${state.basketCurrency}`);
          const missing = state.getMissingSteps();
          if (missing.length > 0) lines.push(`- Manque: ${missing.join(', ')}`);
          else lines.push('- Statut: Complet ✓');
          return lines.join('\n');
        },

        getBasketForLLM: () => {
          const state = get();
          return {
            items: state.basketItems.map(item => ({
              type: item.type, name: item.name, price: item.price, city: item.destinationCity, details: item.description || '',
            })),
            flexibleTripType: state.flexibleTripType,
            totalPrice: state.getTotalPrice(),
            currency: state.basketCurrency,
            completedSteps: state.getCompletedSteps(),
            missingSteps: state.getMissingSteps(),
            isComplete: state.isBasketComplete(),
          };
        },
      }),
      { name: STORAGE_KEY, storage: customStorage }
    ),
    { name: 'TripBasketStore' }
  )
);
