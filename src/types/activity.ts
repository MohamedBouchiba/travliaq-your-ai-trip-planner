/**
 * Activity Types
 *
 * Type definitions for Viator activities from Travliaq API
 */

/**
 * Activity image with responsive variants
 */
export interface ActivityImage {
  url: string;
  is_cover: boolean;
  variants: {
    small?: string;   // ~200px
    medium?: string;  // ~600px
    large?: string;   // ~1200px
  };
}

/**
 * Activity pricing information
 */
export interface ActivityPricing {
  from_price: number;
  currency: string;
  original_price?: number;
  is_discounted: boolean;
}

/**
 * Activity rating information
 */
export interface ActivityRating {
  average: number;
  count: number;
}

/**
 * Activity duration information
 */
export interface ActivityDuration {
  minutes: number;
  formatted: string; // e.g., "2h", "1h 30min"
}

/**
 * Activity location information
 */
export interface ActivityLocation {
  destination: string;
  country: string;
  city?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

/**
 * Viator Activity from API
 */
export interface ViatorActivity {
  id: string;
  title: string;
  description: string;
  type?: "activity" | "attraction";  // Type from unified search (backend balancing)
  images: ActivityImage[];
  pricing: ActivityPricing;
  rating: ActivityRating;
  duration: ActivityDuration;
  categories: string[];
  flags: string[]; // e.g., "LIKELY_TO_SELL_OUT"
  booking_url: string;
  confirmation_type: string;
  location: ActivityLocation;
  availability: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Activity entry in user's trip (planned activity)
 */
export interface ActivityEntry {
  // Identifiers
  id: string;
  viatorId?: string;
  destinationId: string;

  // Location
  city: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };

  // Core data
  title: string;
  description: string;
  images: ActivityImage[];

  // Categories & Tags
  categories: string[];
  viatorTags?: number[];

  // Pricing
  pricing: ActivityPricing;

  // Rating
  rating: ActivityRating;

  // Duration
  duration: ActivityDuration;

  // Planning
  date: Date | null;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'flexible' | null;

  // Status
  availability: 'available' | 'checking' | 'unavailable';
  isBooked: boolean;
  bookingUrl?: string;

  // Flags
  flags: string[];

  // Metadata
  source: 'viator' | 'manual';
  addedAt: Date;
  userModified: boolean;
  notes: string;
}

/**
 * Activity search parameters
 */
export interface ActivitySearchParams {
  city: string;
  countryCode: string;
  startDate: string;
  endDate?: string;
  categories?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  ratingMin?: number;
  durationMinutes?: number;
  currency?: string;
  language?: string;
  page?: number;
  limit?: number;
}

/**
 * Activity search response from API
 */
export interface ActivitySearchResponse {
  success: boolean;
  results: {
    activities: ViatorActivity[];
    total_count: number;
    page: number;
    per_page: number;
    has_more: boolean;
  };
  location_resolution: {
    destination_id: string;
    matched_city: string | null;
  };
  cache_info: {
    cached: boolean;
    cached_at: string | null;
    ttl_seconds: number;
  };
  request_summary: {
    city: string;
    country_code: string;
    start_date: string;
    categories?: string[];
    price_range?: { min?: number; max?: number };
    rating_min?: number;
  };
}

/**
 * Activity details response from API
 */
export interface ActivityDetailsResponse {
  success: boolean;
  activity: ViatorActivity;
}

/**
 * Tag/Category from API
 */
export interface ActivityTag {
  tag_id: number;
  tag_name: string;
  parent_tag_id: number | null;
  all_names: Record<string, string>;
}

/**
 * Tag search response from API
 */
export interface TagSearchResponse {
  keyword: string;
  language: string;
  count: number;
  results: ActivityTag[];
  tag_ids: number[];
}

/**
 * Category with emoji for UI
 */
export interface CategoryWithEmoji {
  id: number;
  label: string;
  emoji: string;
  keyword: string;
}

/**
 * Time of day options for activities
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

/**
 * Duration range options for activities
 */
export type DurationRange = 'under1h' | '1to4h' | 'over4h' | 'fullDay' | 'multiDay';

/**
 * Activity Filters interface
 */
export interface ActivityFilters {
  categories: string[];
  priceRange: [number, number];
  ratingMin: number;
  durationMax?: number; // in minutes
  timeOfDay: TimeOfDay[];
  durationRange: DurationRange[];
}
