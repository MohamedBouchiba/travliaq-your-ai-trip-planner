/**
 * Chat Components - Barrel export
 */

// Types
export * from "./types";

// Core components
export { ChatInput, type ChatInputRef } from "./ChatInput";
export { ChatMessage } from "./ChatMessage";
export { ChatMessages } from "./ChatMessages";
export { QuickReplies, QUICK_REPLY_PRESETS } from "./QuickReplies";

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
