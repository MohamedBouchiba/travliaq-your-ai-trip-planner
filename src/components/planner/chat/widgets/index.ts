/**
 * Chat Widgets - Barrel export
 */

// Common utilities (Error handling, Loading states)
export * from "./common";

// Core widgets
export { DatePickerWidget } from "./DatePickerWidget";
export { DateRangePickerWidget } from "./DateRangePickerWidget";
export { TravelersWidget, TravelersConfirmBeforeSearchWidget } from "./TravelersWidget";
export { TripTypeConfirmWidget } from "./TripTypeWidget";
export { CitySelectionWidget } from "./CitySelectionWidget";
export { AirportButton, DualAirportSelection, AirportConfirmationWidget } from "./AirportWidgets";
export { MarkdownMessage } from "./MarkdownMessage";
export { ConfirmedWidget } from "./ConfirmedWidget";

// Preference widgets (synced with PreferenceMemory)
export { PreferenceStyleWidget } from "./PreferenceStyleWidget";
export { PreferenceInterestsWidget } from "./PreferenceInterestsWidget";
export { MustHavesWidget } from "./MustHavesWidget";
export { DietaryWidget } from "./DietaryWidget";

// Destination suggestion widgets
export { DestinationSuggestionCard } from "./DestinationSuggestionCard";
export { DestinationSuggestionsGrid } from "./DestinationSuggestionsGrid";

// Selection widgets (Sprint 1A - Quick filters)
export * from "./selection";

// Advice widgets (Sprint 1B - Tips & Suggestions)
export * from "./advice";

// Progress widgets (Sprint 1C - Workflow tracking)
export * from "./progress";

// Results widgets (Sprint 2A - Compact result cards)
export * from "./results";

// Navigation widgets (Sprint 2B - Navigation & Actions)
export * from "./navigation";

// Comparison widgets (Phase 3 - Comparison & Advanced Filtering)
export * from "./comparison";

// Alert widgets (Phase 4 - Intelligence Proactive)
export * from "./alerts";

// Interactive widgets (Phase 5 - Rich Interactions)
export * from "./interactive";

// Booking widgets (Phase 6 - Premium Features)
export * from "./booking";

// Composite renderer
export { WidgetRenderer, type WidgetRendererProps } from "./WidgetRenderer";
