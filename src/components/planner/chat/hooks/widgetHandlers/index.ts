/**
 * Widget Handlers - Modular handlers for chat widget interactions
 */

export type { HandlerDeps } from "./types";
export { parseDurationToDays } from "./helpers";

// Date handlers
export { handleDateSelect, handleDateRangeSelect } from "./dateHandlers";

// Traveler handlers
export {
  handleTravelersSelect,
  handleTravelersConfirmSolo,
  handleTravelersEditBeforeSearch,
} from "./travelerHandlers";

// Location handlers
export {
  handleAirportSelect,
  handleCitySelect,
  handleDepartureCitySelect,
} from "./locationHandlers";

// Trip type handler
export { handleTripTypeConfirm } from "./tripTypeHandler";

// Search handler
export { handleSearchButtonClick } from "./searchHandler";

// Selection handlers (Phase 2)
export {
  handleBudgetSelect,
  handleQuickFilterSelect,
  handleQuickFilterClear,
  handleStarRatingSelect,
  handleCabinClassSelect,
  handleDirectFlightToggle,
  handleDurationSelect,
  handleTimeOfDaySelect,
} from "./selectionHandlers";

// Comparison handlers (Phase 3)
export { handleComparisonSelect, handleComparisonRemove } from "./comparisonHandlers";

// Alert handlers (Phase 4)
export {
  handleConflictResolve,
  handlePriceAlertAction,
  handlePriceAlertDismiss,
} from "./alertHandlers";
