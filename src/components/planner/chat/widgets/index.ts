/**
 * Chat Widgets - Barrel export
 */

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

// Trip recap (E2)
export { TripRecapWidget } from "./TripRecapWidget";

// Selection widgets
export * from "./selection";

// Composite renderer
export { WidgetRenderer, type WidgetRendererProps } from "./WidgetRenderer";
