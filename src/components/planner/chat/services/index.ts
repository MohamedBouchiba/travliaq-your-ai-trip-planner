/**
 * Chat Services - Business logic and orchestration
 *
 * These services provide workflow control, suggestions,
 * and conflict detection for the chat planning experience.
 */

// FilterParser - Natural language filter parsing (Phase 3)
export {
  parseFilters,
  formatFiltersForDisplay,
  FILTER_EXAMPLES,
  type FilterTarget,
  type PriceFilter,
  type TimeFilter,
  type DurationFilter,
  type RatingFilter,
  type LocationFilter,
  type FlightFilters,
  type HotelFilters,
  type ActivityFilters,
  type ParsedFilters,
} from "./filterParser";

// SuggestionEngine - Ultra-contextual quick replies
export {
  getSuggestions,
  getWorkflowStep,
  type SuggestionContext,
  type Suggestion,
} from "./suggestionEngine";
