/**
 * Chat Widgets - Shared utilities and exports
 * 
 * This folder contains inline widgets extracted from PlannerChat.tsx
 * for better maintainability and reusability.
 */

// Re-export all widgets
export { DatePickerWidget } from "./DatePickerWidget";
export { DateRangePickerWidget } from "./DateRangePickerWidget";
export { TravelersWidget } from "./TravelersWidget";
export { TripTypeConfirmWidget } from "./TripTypeConfirmWidget";
export { TravelersConfirmBeforeSearchWidget } from "./TravelersConfirmBeforeSearchWidget";
export { CitySelectionWidget } from "./CitySelectionWidget";
export { AirportConfirmationWidget } from "./AirportConfirmationWidget";

// Shared utilities
export { parsePreferredMonth } from "./utils";
