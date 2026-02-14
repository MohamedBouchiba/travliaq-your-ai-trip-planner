/**
 * Tools Index - Centralized exports for all planner-chat tools
 * 
 * This file exports all tool definitions and types for use in the main orchestrator.
 */

// Intent classification (already exists)
export { 
  intentClassifierTool, 
  parseIntentClassification, 
  type IntentClassificationResult 
} from "./intentClassifier.ts";

// Chain of Thought reasoning (already exists)
export { 
  reasoningTool, 
  parseReasoningResult, 
  CHAIN_OF_THOUGHT_INSTRUCTIONS, 
  type ReasoningResult 
} from "./reasoningEngine.ts";

// Flight extraction
export { 
  flightExtractionTool, 
  type FlightExtractionResult 
} from "./flightExtractor.ts";

// Accommodation extraction
export { 
  accommodationExtractionTool, 
  type AccommodationExtractionResult 
} from "./accommodationExtractor.ts";

// Preference extraction
export { 
  preferenceExtractionTool, 
  type PreferenceExtractionResult 
} from "./preferenceExtractor.ts";

// Quick replies generation
export { 
  quickRepliesExtractionTool, 
  type QuickRepliesResult,
  type QuickReply,
} from "./quickReplies.ts";

// Destination suggestions
export { 
  destinationSuggestionTool, 
  type DestinationSuggestionResult 
} from "./destinationSuggestions.ts";

// Flight search trigger
export {
  flightSearchTriggerTool,
  type FlightSearchTriggerResult
} from "./flightSearchTrigger.ts";

// Trip recap
export {
  tripRecapTool,
  type TripRecapData
} from "./tripRecap.ts";

/**
 * All tools array for Azure OpenAI tool_choice
 */
export const ALL_TOOLS = [
  // Re-exported from existing files
  // intentClassifierTool, // Import separately to avoid circular deps
  // reasoningTool,        // Import separately to avoid circular deps
  
  // New modular tools - these are imported in index.ts
];

/**
 * Tool names for logging and tracking
 */
export const TOOL_NAMES = {
  CLASSIFY_INTENT: "classify_intent",
  PLAN_RESPONSE: "plan_response",
  UPDATE_FLIGHT: "update_flight_widget",
  UPDATE_ACCOMMODATION: "update_accommodation_widget",
  UPDATE_PREFERENCES: "update_preferences",
  QUICK_REPLIES: "generate_quick_replies",
  DESTINATION_SUGGESTIONS: "request_destination_suggestions",
  FLIGHT_SEARCH: "trigger_flight_search",
  TRIP_RECAP: "generate_trip_recap",
} as const;

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];
