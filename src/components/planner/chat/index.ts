/**
 * Chat Components - Barrel export
 */

// Types
export * from "./types";
// Intent types
export * from "./typeDefs/intent";

// Core components
export { ChatInput, type ChatInputRef } from "./ChatInput";
export { ChatMessage } from "./ChatMessage";
export { ChatMessages } from "./ChatMessages";
export { VirtualizedChatMessages, ChatMessagesVirtualized } from "./VirtualizedChatMessages";
export { QuickReplies, QUICK_REPLY_PRESETS } from "./QuickReplies";

// Extracted components (Phase 2.1 optimization)
export { MessageActions } from "./MessageActions";
export { MessageBubble } from "./MessageBubble";
export { TypingIndicator } from "./TypingIndicator";
export { MemoizedSmartSuggestions, type InspireFlowStep } from "./MemoizedSmartSuggestions";
export { SmartSuggestions, type DynamicSuggestion } from "./SmartSuggestions";
export { ChatMessageItem } from "./ChatMessageItem";
export { IntentDebugPanel } from "./IntentDebugPanel";
export { ToolStatusIndicator, type ToolExecution, type ToolStatus } from "./ToolStatusIndicator";

// Widgets
export {
  DatePickerWidget,
  DateRangePickerWidget,
  TravelersWidget,
  TravelersConfirmBeforeSearchWidget,
  TripTypeConfirmWidget,
  CitySelectionWidget,
  AirportButton,
  DualAirportSelection,
  AirportConfirmationWidget,
} from "./widgets";

// Rich Content
export {
  DestinationCard,
  FlightPreview,
  FlightPreviewList,
  ActivityCarousel,
  HotelCarousel,
} from "./RichContent";

// Hooks
export {
  useChatStream,
  useChatWidgetFlow,
  useChatImperativeHandlers,
  useUnifiedIntentRouter,
  type APIMessage,
  type StreamResult,
  type MemoryContext,
  type UseChatWidgetFlowOptions,
  type WidgetFlowState,
  type UseChatImperativeHandlersOptions,
  type UseUnifiedIntentRouterOptions,
  type UseUnifiedIntentRouterReturn,
  type FlowState,
  type IntentProcessResult,
} from "./hooks";

// Utils
export {
  parseAction,
  flightDataToMemory,
  getMissingFieldLabel,
  formatMissingFieldsMessage,
  type FlightMemoryUpdate,
} from "./utils";

