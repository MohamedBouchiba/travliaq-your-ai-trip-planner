/**
 * usePreferenceMemoryStore - Drop-in replacement for usePreferenceMemory (Context)
 * 
 * This hook provides the exact same API as PreferenceMemoryContext
 * but uses Zustand under the hood for better performance.
 * 
 * Migration: Replace `usePreferenceMemory` import with `usePreferenceMemoryStore`
 */

import { useMemo, useCallback } from 'react';
import { usePlannerStoreV2 } from '../plannerStoreV2';
import type {
  TripPreferences,
  StyleAxes,
  MustHaves,
  TravelStyle,
  TripContext,
  WorkPreferences,
  PreferenceMemory,
  HotelFiltersFromPreferences,
  ActivityFiltersFromPreferences,
  FlightPreferencesComputed,
  ComfortLabel,
} from '../slices/preferenceTypes';
import {
  selectComfortLabel,
  selectProfileCompletion,
  selectPreferenceSummary,
  selectHotelFilters,
  selectActivityFilters,
  selectFlightPreferences,
  selectSerializedState,
} from '../slices/preferenceTypes';

// Re-export types for compatibility
export type {
  TripPreferences,
  StyleAxes,
  MustHaves,
  TravelStyle,
  TripContext,
  WorkPreferences,
  PreferenceMemory,
  HotelFiltersFromPreferences,
  ActivityFiltersFromPreferences,
  FlightPreferencesComputed,
  ComfortLabel,
};

// Re-export defaults
export {
  DEFAULT_STYLE_AXES,
  DEFAULT_STYLE_AXES_ORDER,
  DEFAULT_MUST_HAVES,
  DEFAULT_WORK_PREFERENCES,
  DEFAULT_TRIP_CONTEXT,
  DEFAULT_PREFERENCES,
  DEFAULT_MEMORY,
  createDefaultPreferences,
  createDefaultMemory,
} from '../slices/preferenceTypes';

// ============================================================================
// HOOK RETURN TYPE
// ============================================================================

export interface PreferenceMemoryStoreValue {
  // Structure compatible with Context
  memory: PreferenceMemory;
  isHydrated: boolean;

  // Actions
  updatePreferences: (updates: Partial<TripPreferences>, fromChat?: boolean) => void;
  setStyleAxis: (axis: keyof StyleAxes, value: number) => void;
  setStyleAxesOrder: (order: (keyof StyleAxes)[]) => void;
  setTravelStyle: (style: TravelStyle) => void;
  toggleInterest: (interest: string) => void;
  toggleMustHave: (key: keyof MustHaves) => void;
  setWorkPreference: (key: keyof WorkPreferences, value: boolean) => void;
  setOccasion: (occasion: TripContext['occasion']) => void;
  setFlexibility: (flexibility: TripContext['flexibility']) => void;
  setPace: (pace: TripPreferences['pace']) => void;
  setComfortLevel: (level: number) => void;
  toggleDietaryRestriction: (restriction: string) => void;
  toggleAccessibilityNeed: (need: string) => void;
  resetToDefaults: () => void;

  // Computed values
  getPreferences: () => TripPreferences;
  getPreferenceSummary: () => string;
  getComfortLabel: () => ComfortLabel;
  getProfileCompletion: () => number;
  getHotelFilters: () => HotelFiltersFromPreferences;
  getActivityFilters: () => ActivityFiltersFromPreferences;
  getFlightPreferences: () => FlightPreferencesComputed;
  getSerializedState: () => Record<string, unknown>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * usePreferenceMemoryStore - Zustand-based replacement for usePreferenceMemory
 */
export function usePreferenceMemoryStore(): PreferenceMemoryStoreValue {
  const store = usePlannerStoreV2();

  // Build memory object (mirrors Context structure)
  const memory = useMemo<PreferenceMemory>(() => ({
    preferences: store.preferences,
  }), [store.preferences]);

  // Computed: getPreferences
  const getPreferences = useCallback((): TripPreferences => {
    return store.preferences;
  }, [store.preferences]);

  // Computed: getPreferenceSummary
  const getPreferenceSummary = useCallback((): string => {
    return selectPreferenceSummary(store.preferences);
  }, [store.preferences]);

  // Computed: getComfortLabel
  const getComfortLabel = useCallback((): ComfortLabel => {
    return selectComfortLabel(store.preferences);
  }, [store.preferences]);

  // Computed: getProfileCompletion
  const getProfileCompletion = useCallback(() => {
    return selectProfileCompletion(store.preferences);
  }, [store.preferences]);

  // Computed: getHotelFilters
  const getHotelFilters = useCallback((): HotelFiltersFromPreferences => {
    return selectHotelFilters(store.preferences);
  }, [store.preferences]);

  // Computed: getActivityFilters
  const getActivityFilters = useCallback((): ActivityFiltersFromPreferences => {
    return selectActivityFilters(store.preferences);
  }, [store.preferences]);

  // Computed: getFlightPreferences
  const getFlightPreferences = useCallback((): FlightPreferencesComputed => {
    return selectFlightPreferences(store.preferences);
  }, [store.preferences]);

  // Computed: getSerializedState
  const getSerializedState = useCallback((): Record<string, unknown> => {
    return selectSerializedState(store.preferences);
  }, [store.preferences]);

  // Memoize return value
  return useMemo(() => ({
    memory,
    isHydrated: store.isHydrated,

    // Actions (directly from store)
    updatePreferences: store.updatePreferences,
    setStyleAxis: store.setStyleAxis,
    setStyleAxesOrder: store.setStyleAxesOrder,
    setTravelStyle: store.setTravelStyle,
    toggleInterest: store.toggleInterest,
    toggleMustHave: store.toggleMustHave,
    setWorkPreference: store.setWorkPreference,
    setOccasion: store.setOccasion,
    setFlexibility: store.setFlexibility,
    setPace: store.setPace,
    setComfortLevel: store.setComfortLevel,
    toggleDietaryRestriction: store.toggleDietaryRestriction,
    toggleAccessibilityNeed: store.toggleAccessibilityNeed,
    resetToDefaults: store.resetPreferences,

    // Computed values
    getPreferences,
    getPreferenceSummary,
    getComfortLabel,
    getProfileCompletion,
    getHotelFilters,
    getActivityFilters,
    getFlightPreferences,
    getSerializedState,
  }), [
    memory,
    store.isHydrated,
    store.updatePreferences,
    store.setStyleAxis,
    store.setStyleAxesOrder,
    store.setTravelStyle,
    store.toggleInterest,
    store.toggleMustHave,
    store.setWorkPreference,
    store.setOccasion,
    store.setFlexibility,
    store.setPace,
    store.setComfortLevel,
    store.toggleDietaryRestriction,
    store.toggleAccessibilityNeed,
    store.resetPreferences,
    getPreferences,
    getPreferenceSummary,
    getComfortLabel,
    getProfileCompletion,
    getHotelFilters,
    getActivityFilters,
    getFlightPreferences,
    getSerializedState,
  ]);
}
