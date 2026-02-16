/**
 * Selection Widgets - Quick filter and selection widgets for chat
 *
 * These micro-widgets enable rapid filtering and selection within the chat interface.
 */

// Quick Filter Chips - Multi-purpose filter chips
export {
  QuickFilterChips,
  type FilterChip,
  type FilterChipGroup,
  PRICE_FILTER_CHIPS,
  STAR_RATING_CHIPS,
  HOTEL_AMENITY_CHIPS,
  DURATION_CHIPS,
  TIME_OF_DAY_CHIPS,
  CABIN_CLASS_CHIPS,
  FLIGHT_TYPE_CHIPS,
} from "./QuickFilterChips";

// Star Rating Selector - Hotel rating filter
export {
  StarRatingSelector,
} from "./StarRatingSelector";

// Duration Chips - Activity duration filter
export {
  DurationChips,
  type DurationOption,
  DEFAULT_DURATION_OPTIONS,
  formatDuration,
  getDurationRangeString,
} from "./DurationChips";

// Cabin Class Selector - Flight cabin class
export {
  CabinClassSelector,
  type CabinClassOption,
  CABIN_CLASS_OPTIONS,
  SIMPLE_CABIN_OPTIONS,
  getCabinDisplayName,
  getCabinIcon,
} from "./CabinClassSelector";

// Direct Flight Toggle - Flight stops filter
export {
  DirectFlightToggle,
  StopCountSelector,
  type StopOption,
  DEFAULT_STOP_OPTIONS,
} from "./DirectFlightToggle";

// Budget Range Slider - Price range selector
export {
  BudgetRangeSlider,
  BudgetChips,
  type BudgetRange,
  type BudgetPreset,
  BUDGET_PRESETS,
  HOTEL_BUDGET_PRESETS,
  ACTIVITY_BUDGET_PRESETS,
} from "./BudgetRangeSlider";
