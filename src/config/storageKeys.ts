/**
 * Centralized localStorage key definitions.
 * All localStorage keys used across the app should be defined here
 * to prevent key name mismatches and enable easy refactoring.
 */

export const STORAGE_KEYS = {
  // Memory stores
  FLIGHT_MEMORY: "travliaq_flight_memory",
  TRAVEL_MEMORY: "travliaq_travel_memory",
  ACCOMMODATION_MEMORY: "travliaq_accommodation_memory",
  MEMORY_VERSIONS: "travliaq_memory_versions",

  // Preferences
  USER_PREFERENCES: "travliaq_user_preferences",
  NEGATIVE_PREFERENCES: "travliaq_negative_preferences",
  PREFERENCES_LEGACY: "travliaq_preferences",

  // Chat sessions
  CHAT_SESSIONS_INDEX: "travliaq_chat_sessions_index",
  CHAT_SESSION_PREFIX: "travliaq_chat_session_",

  // UI state
  PLANNER_ACTIVE_TAB: "travliaq_planner_active_tab",
  ONBOARDING_COMPLETED: "travliaq_onboarding_completed",
  SMART_TAGS: "travliaq_smart_tags_v2",

  // Cache
  AUTO_DEPARTURE: "travliaq_auto_departure",
  PRICE_CACHE: "travliaq_price_cache_v3",
  PRICE_CACHE_V2: "travliaq_price_cache_v2",
  ACTIVITY_CACHE_PREFIX: "travliaq_activity",

  // Debug
  HOTELS_DEBUG: "hotels_debug",
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
