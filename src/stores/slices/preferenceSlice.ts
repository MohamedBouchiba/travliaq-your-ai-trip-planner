/**
 * Preference Slice
 * Manages user travel preferences state
 */

import type { StateCreator } from 'zustand';
import type {
  TripPreferences,
  StyleAxes,
  MustHaves,
  TravelStyle,
  TripContext,
  WorkPreferences,
} from './preferenceTypes';
import { createDefaultPreferences } from './preferenceTypes';

// ============================================================================
// STATE
// ============================================================================

export interface PreferenceState {
  preferences: TripPreferences;
}

export const initialPreferenceState: PreferenceState = {
  preferences: createDefaultPreferences(),
};

// ============================================================================
// ACTIONS
// ============================================================================

export interface PreferenceActions {
  // Core update
  updatePreferences: (updates: Partial<TripPreferences>, fromChat?: boolean) => void;
  
  // Style axes
  setStyleAxis: (axis: keyof StyleAxes, value: number) => void;
  setStyleAxesOrder: (order: (keyof StyleAxes)[]) => void;
  
  // Travel style
  setTravelStyle: (style: TravelStyle) => void;
  
  // Interests
  toggleInterest: (interest: string) => void;
  
  // Must-haves
  toggleMustHave: (key: keyof MustHaves) => void;
  
  // Work preferences
  setWorkPreference: (key: keyof WorkPreferences, value: boolean) => void;
  
  // Trip context
  setOccasion: (occasion: TripContext['occasion']) => void;
  setFlexibility: (flexibility: TripContext['flexibility']) => void;
  
  // Legacy fields
  setPace: (pace: TripPreferences['pace']) => void;
  setComfortLevel: (level: number) => void;
  toggleDietaryRestriction: (restriction: string) => void;
  toggleAccessibilityNeed: (need: string) => void;
  
  // Reset
  resetPreferences: () => void;
}

// ============================================================================
// SLICE
// ============================================================================

export interface PreferenceSlice extends PreferenceState, PreferenceActions {}

export const createPreferenceSlice: StateCreator<
  PreferenceSlice,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  PreferenceSlice
> = (set, get) => ({
  ...initialPreferenceState,

  updatePreferences: (updates: Partial<TripPreferences>, fromChat = false) => {
    set(
      (state) => {
        const now = new Date();
        const newManualOverrides = fromChat
          ? state.preferences.manualOverrides
          : [...new Set([...state.preferences.manualOverrides, ...Object.keys(updates)])];

        // Sync comfortLevel ↔ styleAxes.ecoVsLuxury
        let syncedUpdates = { ...updates };
        if ('comfortLevel' in updates && updates.comfortLevel !== undefined) {
          syncedUpdates = {
            ...syncedUpdates,
            styleAxes: {
              ...state.preferences.styleAxes,
              ...updates.styleAxes,
              ecoVsLuxury: updates.comfortLevel,
            },
          };
        }
        if (updates.styleAxes?.ecoVsLuxury !== undefined) {
          syncedUpdates.comfortLevel = updates.styleAxes.ecoVsLuxury;
        }

        return {
          preferences: {
            ...state.preferences,
            ...syncedUpdates,
            lastUpdated: now,
            detectedFromChat: fromChat,
            manualOverrides: newManualOverrides,
          },
        };
      },
      false,
      'preferences/update'
    );
  },

  setStyleAxis: (axis: keyof StyleAxes, value: number) => {
    set(
      (state) => {
        const now = new Date();
        const clampedValue = Math.max(0, Math.min(100, value));
        const newStyleAxes = { ...state.preferences.styleAxes, [axis]: clampedValue };

        const updates: Partial<TripPreferences> = {
          styleAxes: newStyleAxes,
          lastUpdated: now,
          detectedFromChat: false,
          manualOverrides: [...new Set([...state.preferences.manualOverrides, 'styleAxes'])],
        };

        // Sync ecoVsLuxury with comfortLevel
        if (axis === 'ecoVsLuxury') {
          updates.comfortLevel = clampedValue;
        }

        // Sync chillVsIntense with pace
        if (axis === 'chillVsIntense') {
          if (clampedValue < 35) updates.pace = 'relaxed';
          else if (clampedValue < 70) updates.pace = 'moderate';
          else updates.pace = 'intense';
        }

        return { preferences: { ...state.preferences, ...updates } };
      },
      false,
      'preferences/setStyleAxis'
    );
  },

  setStyleAxesOrder: (order: (keyof StyleAxes)[]) => {
    set(
      (state) => ({
        preferences: {
          ...state.preferences,
          styleAxesOrder: order,
          lastUpdated: new Date(),
        },
      }),
      false,
      'preferences/setStyleAxesOrder'
    );
  },

  setTravelStyle: (style: TravelStyle) => {
    set(
      (state) => {
        const now = new Date();
        const newMustHaves = { ...state.preferences.mustHaves };
        
        // Auto-set family-friendly if family
        if (style === 'family') newMustHaves.familyFriendly = true;
        // Auto-set pet-friendly if pet
        if (style === 'pet') newMustHaves.petFriendly = true;

        return {
          preferences: {
            ...state.preferences,
            travelStyle: style,
            mustHaves: newMustHaves,
            lastUpdated: now,
            detectedFromChat: false,
            manualOverrides: [...new Set([...state.preferences.manualOverrides, 'travelStyle'])],
          },
        };
      },
      false,
      'preferences/setTravelStyle'
    );
  },

  toggleInterest: (interest: string) => {
    set(
      (state) => {
        const now = new Date();
        let interests = [...state.preferences.interests];
        
        if (interests.includes(interest)) {
          interests = interests.filter(i => i !== interest);
        } else if (interests.length < 5) {
          interests.push(interest);
        }

        // Auto-set workation mode if workation interest
        const workPreferences = { ...state.preferences.workPreferences };
        if (interest === 'workation' && interests.includes('workation')) {
          workPreferences.workationMode = true;
          workPreferences.needsWifi = true;
        }

        return {
          preferences: {
            ...state.preferences,
            interests,
            workPreferences,
            lastUpdated: now,
            detectedFromChat: false,
            manualOverrides: [...new Set([...state.preferences.manualOverrides, 'interests'])],
          },
        };
      },
      false,
      'preferences/toggleInterest'
    );
  },

  toggleMustHave: (key: keyof MustHaves) => {
    set(
      (state) => {
        const now = new Date();
        return {
          preferences: {
            ...state.preferences,
            mustHaves: {
              ...state.preferences.mustHaves,
              [key]: !state.preferences.mustHaves[key],
            },
            lastUpdated: now,
            detectedFromChat: false,
            manualOverrides: [...new Set([...state.preferences.manualOverrides, 'mustHaves'])],
          },
        };
      },
      false,
      'preferences/toggleMustHave'
    );
  },

  setWorkPreference: (key: keyof WorkPreferences, value: boolean) => {
    set(
      (state) => {
        const now = new Date();
        return {
          preferences: {
            ...state.preferences,
            workPreferences: {
              ...state.preferences.workPreferences,
              [key]: value,
            },
            lastUpdated: now,
            detectedFromChat: false,
            manualOverrides: [...new Set([...state.preferences.manualOverrides, 'workPreferences'])],
          },
        };
      },
      false,
      'preferences/setWorkPreference'
    );
  },

  setOccasion: (occasion: TripContext['occasion']) => {
    set(
      (state) => {
        const now = new Date();
        return {
          preferences: {
            ...state.preferences,
            tripContext: { ...state.preferences.tripContext, occasion },
            lastUpdated: now,
            detectedFromChat: false,
          },
        };
      },
      false,
      'preferences/setOccasion'
    );
  },

  setFlexibility: (flexibility: TripContext['flexibility']) => {
    set(
      (state) => {
        const now = new Date();
        return {
          preferences: {
            ...state.preferences,
            tripContext: { ...state.preferences.tripContext, flexibility },
            lastUpdated: now,
            detectedFromChat: false,
          },
        };
      },
      false,
      'preferences/setFlexibility'
    );
  },

  setPace: (pace: TripPreferences['pace']) => {
    set(
      (state) => {
        const now = new Date();
        // Sync with styleAxes.chillVsIntense
        const chillVsIntense = pace === 'relaxed' ? 20 : pace === 'moderate' ? 50 : 80;
        return {
          preferences: {
            ...state.preferences,
            pace,
            styleAxes: { ...state.preferences.styleAxes, chillVsIntense },
            lastUpdated: now,
            detectedFromChat: false,
          },
        };
      },
      false,
      'preferences/setPace'
    );
  },

  setComfortLevel: (level: number) => {
    set(
      (state) => {
        const now = new Date();
        const clamped = Math.max(0, Math.min(100, level));
        return {
          preferences: {
            ...state.preferences,
            comfortLevel: clamped,
            styleAxes: { ...state.preferences.styleAxes, ecoVsLuxury: clamped },
            lastUpdated: now,
            detectedFromChat: false,
          },
        };
      },
      false,
      'preferences/setComfortLevel'
    );
  },

  toggleDietaryRestriction: (restriction: string) => {
    set(
      (state) => {
        const now = new Date();
        const dietaryRestrictions = state.preferences.dietaryRestrictions.includes(restriction)
          ? state.preferences.dietaryRestrictions.filter(r => r !== restriction)
          : [...state.preferences.dietaryRestrictions, restriction];
        return {
          preferences: {
            ...state.preferences,
            dietaryRestrictions,
            lastUpdated: now,
            detectedFromChat: false,
          },
        };
      },
      false,
      'preferences/toggleDietaryRestriction'
    );
  },

  toggleAccessibilityNeed: (need: string) => {
    set(
      (state) => {
        const now = new Date();
        const accessibilityNeeds = state.preferences.accessibilityNeeds.includes(need)
          ? state.preferences.accessibilityNeeds.filter(n => n !== need)
          : [...state.preferences.accessibilityNeeds, need];

        // Sync with mustHaves
        const hasWheelchair = accessibilityNeeds.includes('wheelchair');
        return {
          preferences: {
            ...state.preferences,
            accessibilityNeeds,
            mustHaves: { ...state.preferences.mustHaves, accessibilityRequired: hasWheelchair },
            lastUpdated: now,
            detectedFromChat: false,
          },
        };
      },
      false,
      'preferences/toggleAccessibilityNeed'
    );
  },

  resetPreferences: () => {
    set({ preferences: createDefaultPreferences() }, false, 'preferences/reset');
  },
});
