/**
 * Hotel Service
 * 
 * Handles API calls to Travliaq Hotels API with caching
 * Base URL: https://travliaq-api-production.up.railway.app/api/v1/hotels
 * 
 * Endpoints:
 * - POST /search - Recherche d'hôtels
 * - GET /{hotel_id} - Détails d'un hôtel
 * - POST /map-prices - Prix minimum par ville (carte)
 * - GET /health - Health check
 */

import { travliaqClient, getErrorMessage } from '@/services/api/travliaqClient';
import { logger, LogCategory } from '@/utils/logger';
import { STORAGE_KEYS } from '@/config/storageKeys';

const HOTELS_DEBUG_KEY = STORAGE_KEYS.HOTELS_DEBUG;

// ============= Types =============

// Room configuration
export interface RoomOccupancy {
  adults: number;            // 1-10
  childrenAges?: number[];   // [5, 8] - âges des enfants
}

// Search filters
export interface HotelFilters {
  priceMin?: number;
  priceMax?: number;
  minStars?: number;         // 1-5
  minRating?: number;        // 0-10
  types?: PropertyType[];
  amenities?: Amenity[];
}

// Property types
export type PropertyType = 
  | 'hotel' 
  | 'apartment' 
  | 'hostel' 
  | 'bed_and_breakfast' 
  | 'villa' 
  | 'resort' 
  | 'guest_house';

// Amenity codes
export type Amenity = 
  | 'wifi' 
  | 'parking' 
  | 'breakfast' 
  | 'pool' 
  | 'gym' 
  | 'spa' 
  | 'restaurant' 
  | 'bar' 
  | 'ac' 
  | 'kitchen';

// Sort options
export type SortBy = 
  | 'popularity' 
  | 'price_asc' 
  | 'price_desc' 
  | 'rating' 
  | 'distance';

// Search request params (matches official API docs)
export interface HotelSearchParams {
  city: string;              // Required - "Paris", "Lyon"
  countryCode: string;       // Required - "FR", "GB" (2 letters)
  checkIn: string;           // Required - "2025-03-15" (YYYY-MM-DD)
  checkOut: string;          // Required - "2025-03-17"
  rooms: RoomOccupancy[];    // Required - Configuration des chambres
  
  // Optional (documented by API)
  currency?: string;         // "EUR" par défaut
  sort?: SortBy;             // "popularity" par défaut
  limit?: number;            // 30 par défaut (max 100)
  filters?: HotelFilters;    // Filtres optionnels
}

// Hotel result from search
export interface HotelResult {
  id: string;                    // "htl_15084442"
  name: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  stars: number | null;          // 1-5
  rating: number | null;         // 0-10 (score Booking)
  reviewCount: number;
  pricePerNight: number;
  totalPrice: number | null;
  currency: string;
  address: string;
  distanceFromCenter: number | null;  // en km
  amenities: string[];           // ["wifi", "parking"]
  bookingUrl: string | null;
}

// Search response
export interface HotelSearchResponse {
  success: boolean;
  results: {
    hotels: HotelResult[];
    total: number;
    hasMore: boolean;
  };
  filters_applied: object;
  cache_info: { cached: boolean };
}

// Amenity categories
export type AmenityCategory =
  | 'connectivity'   // WiFi, Internet
  | 'food'           // Breakfast, Restaurant, Bar
  | 'wellness'       // Pool, Spa, Gym
  | 'room'           // AC, TV, Kitchen
  | 'services'       // Parking, Laundry
  | 'general';       // Others

// Amenity detail with category and free/paid status
export interface AmenityDetail {
  code: string;                    // "wifi"
  label: string;                   // "Free WiFi"
  category?: AmenityCategory;      // "connectivity"
  isFree?: boolean | null;         // true = free, false = paid, null = unknown
}

// Amenities grouped by category
export interface CategorizedAmenities {
  connectivity: AmenityDetail[];   // WiFi, Internet
  food: AmenityDetail[];           // Breakfast, Restaurant, Bar
  wellness: AmenityDetail[];       // Pool, Spa, Gym
  room: AmenityDetail[];           // AC, TV, Kitchen
  services: AmenityDetail[];       // Parking, Laundry
  general: AmenityDetail[];        // Others
}

// Hotel policies
export interface HotelPolicies {
  checkIn: string | null;       // "15:00"
  checkOut: string | null;      // "11:00"
  cancellation: string | null;
}

// Rating breakdown (sub-scores)
export interface RatingBreakdown {
  cleanliness?: number;     // Propreté (0-10)
  staff?: number;           // Personnel (0-10)
  location?: number;        // Emplacement (0-10)
  facilities?: number;      // Équipements (0-10)
  comfort?: number;         // Confort (0-10)
  valueForMoney?: number;   // Rapport qualité/prix (0-10)
}

// Property badge (visible advantage)
export interface PropertyBadge {
  code: string;            // "free_breakfast", "pool", "spa"
  label: string;           // "Petit-déjeuner inclus"
  icon?: string;           // Icon hint: "coffee", "waves", "shield"
}

// Room option
export interface RoomOption {
  id: string;
  name: string;
  description: string | null;
  maxOccupancy: number;
  bedType: string | null;
  pricePerNight: number;
  totalPrice: number;
  amenities: string[];
  cancellationFree: boolean;
}

// Hotel details
export interface HotelDetails {
  id: string;
  name: string;
  lat: number;
  lng: number;
  stars: number | null;
  rating: number | null;
  reviewCount: number;
  address: string;
  distanceFromCenter: number | null;
  description: string | null;
  images: string[];                             // URLs des photos
  amenities: AmenityDetail[];                   // Flat list (backward compat)
  amenitiesByCategory?: CategorizedAmenities;   // Grouped by category
  highlights: string[];
  badges?: PropertyBadge[];                     // Badges équipements (petit-déj, piscine, etc.)
  ratingBreakdown?: RatingBreakdown;            // Sous-notes détaillées
  policies: HotelPolicies | null;
  rooms: RoomOption[];
  bookingUrl: string | null;
}

// Details response
export interface HotelDetailsResponse {
  success: boolean;
  hotel: HotelDetails | null;
  cache_info: { cached: boolean };
}

// City for map prices
export interface CityPrice {
  city: string;
  countryCode: string;
  lat?: number;               // Optional
  lng?: number;               // Optional
}

// Map prices request
export interface MapPricesParams {
  cities: CityPrice[];        // Max 10 cities
  checkIn: string;
  checkOut: string;
  rooms: RoomOccupancy[];
  currency?: string;          // "EUR" par défaut
}

// City price result
export interface CityPriceResult {
  minPrice: number | null;
  currency: string;
}

// Map prices response
export interface MapPricesResponse {
  success: boolean;
  prices: Record<string, CityPriceResult | null>;  // "Paris_FR"
  cache_info: { cached: boolean };
}

// Health response
export interface HealthResponse {
  status: string;       // "healthy"
  service: string;      // "hotels"
  booking_api: string;  // "connected"
}

// Error response
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: object | null;
  };
}

// ============= Cache =============

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = 'travliaq_hotel';

// TTLs (client-side, shorter than server)
const CACHE_TTL = {
  search: 30 * 60 * 1000,       // 30 minutes (server: 2h)
  details: 2 * 60 * 60 * 1000,  // 2 hours (server: 7d)
  mapPrices: 1 * 60 * 60 * 1000, // 1 hour (server: 24h)
};

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function isHotelsDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(HOTELS_DEBUG_KEY) === '1';
}

function hotelsDebugLog(message: string, data?: unknown) {
  if (!isHotelsDebugEnabled()) return;
  // Console-only: very verbose, for local debugging.
  console.debug(`[HotelsAPI] ${message}`, data);
  logger.debug(`HotelsAPI: ${message}`, {
    category: LogCategory.API,
    metadata: typeof data === 'object' ? { data } : { value: data },
  });
}

function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObject);
  const sorted: Record<string, unknown> = {};
  Object.keys(obj as Record<string, unknown>).sort().forEach((key) => {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
  });
  return sorted;
}

function getCacheKey(type: string, params: unknown): string {
  const paramString = JSON.stringify(sortObject(params));
  return `${CACHE_PREFIX}_${type}_${hashString(paramString)}`;
}

function getFromCache<T>(type: string, params: unknown): T | null {
  try {
    const key = getCacheKey(type, params);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    const age = Date.now() - entry.timestamp;
    
    if (age > entry.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch {
    return null;
  }
}

function setInCache<T>(type: string, params: unknown, data: T): void {
  try {
    const key = getCacheKey(type, params);
    const ttl = CACHE_TTL[type as keyof typeof CACHE_TTL] || CACHE_TTL.search;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    // Quota exceeded - clear old entries
    console.warn('[HotelService] Cache set error:', error);
    clearOldCacheEntries();
  }
}

function clearOldCacheEntries(): void {
  try {
    const keys = Object.keys(localStorage);
    const hotelKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    // Remove oldest 50% of entries
    const entries = hotelKeys.map(key => {
      try {
        const data = localStorage.getItem(key);
        if (!data) return { key, timestamp: 0 };
        const parsed = JSON.parse(data);
        return { key, timestamp: parsed.timestamp || 0 };
      } catch {
        return { key, timestamp: 0 };
      }
    });
    
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = entries.slice(0, Math.ceil(entries.length / 2));
    toRemove.forEach(e => localStorage.removeItem(e.key));
  } catch {
    // Ignore errors during cleanup
  }
}

// ============= API Functions =============

/**
 * Search hotels in a city
 * 
 * @example
 * const result = await searchHotels({
 *   city: 'Paris',
 *   countryCode: 'FR',
 *   checkIn: '2025-03-15',
 *   checkOut: '2025-03-17',
 *   rooms: [{ adults: 2, childrenAges: [] }],
 *   filters: { priceMax: 200, minStars: 3 },
 *   sort: 'price_asc'
 * });
 */
export async function searchHotels(
  params: HotelSearchParams,
  forceRefresh: boolean = false
): Promise<HotelSearchResponse> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache<HotelSearchResponse>('search', params);
    if (cached) {
      hotelsDebugLog('search: cache hit', {
        city: params.city,
        countryCode: params.countryCode,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        rooms: params.rooms,
        filters: params.filters,
      });
      return cached;
    }
  }

  try {
    // Build request body with ONLY documented API parameters
    // API docs: city, countryCode, checkIn, checkOut, rooms, currency, limit, sort, filters
    // NOT supported: lat, lng, locale, offset
    const requestBody: Record<string, unknown> = {
      city: params.city,
      countryCode: params.countryCode,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      rooms: params.rooms.map(r => ({
        adults: r.adults,
        childrenAges: r.childrenAges || [],
      })),
      currency: params.currency || 'EUR',
      limit: params.limit || 30,
    };

    // Only add sort if specified (API defaults to popularity)
    if (params.sort) {
      requestBody.sort = params.sort;
    }

    // Only add filters if provided and non-empty
    if (params.filters && Object.keys(params.filters).length > 0) {
      requestBody.filters = params.filters;
    }

    const url = forceRefresh
      ? '/api/v1/hotels/search?force_refresh=true'
      : '/api/v1/hotels/search';

    hotelsDebugLog('search: request', { url, requestBody });

    const response = await travliaqClient.post<HotelSearchResponse>(url, requestBody);

    hotelsDebugLog('search: response', {
      success: response.data?.success,
      total: response.data?.results?.total,
      count: response.data?.results?.hotels?.length,
      cached: response.data?.cache_info?.cached,
    });

    // Cache successful response (avoid caching empty results to prevent "sticky" no-result UI)
    if (response.data.success && (response.data.results?.hotels?.length ?? 0) > 0) {
      setInCache('search', params, response.data);
    }

    return response.data;
  } catch (error) {
    hotelsDebugLog('search: error', {
      message: getErrorMessage(error),
      raw: error,
    });
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get detailed information about a specific hotel
 * 
 * @param hotelId - Hotel ID (e.g., "htl_15084442")
 * @param checkIn - Check-in date (YYYY-MM-DD)
 * @param checkOut - Check-out date (YYYY-MM-DD)
 * @param rooms - Room configuration
 * @param currency - Currency code (default: EUR)
 * @param locale - Language code (default: fr)
 * @param forceRefresh - Bypass cache
 * 
 * @example
 * const details = await getHotelDetails(
 *   'htl_15084442',
 *   '2025-03-15',
 *   '2025-03-17',
 *   [{ adults: 2 }]
 * );
 */
export async function getHotelDetails(
  hotelId: string,
  checkIn: string,
  checkOut: string,
  rooms: RoomOccupancy[],
  currency: string = 'EUR',
  locale: string = 'fr',
  forceRefresh: boolean = false
): Promise<HotelDetailsResponse> {
  const cacheParams = { hotelId, checkIn, checkOut, rooms, currency };
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache<HotelDetailsResponse>('details', cacheParams);
    if (cached) {
      console.log('[HotelService] Cache hit for details');
      return cached;
    }
  }
  
  try {
    // Format rooms for query param: "adults" or "adults-childAge1-childAge2"
    // Multiple rooms: "2,2-8-5" (comma-separated)
    const roomsParam = rooms.map(r => {
      if (r.childrenAges && r.childrenAges.length > 0) {
        return `${r.adults}-${r.childrenAges.join('-')}`;
      }
      return `${r.adults}`;
    }).join(',');
    
    const response = await travliaqClient.get<HotelDetailsResponse>(
      `/api/v1/hotels/${hotelId}`,
      {
        params: {
          checkIn,
          checkOut,
          rooms: roomsParam,
          currency,
          locale,
          ...(forceRefresh && { force_refresh: true }),
        },
      }
    );
    
    // Cache successful response
    if (response.data.success) {
      setInCache('details', cacheParams, response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('[HotelService] Get details error:', error);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get minimum hotel prices for multiple cities (for map markers)
 * 
 * @param params - Cities and search criteria
 * @param forceRefresh - Bypass cache
 * 
 * @example
 * const prices = await getMapPrices({
 *   cities: [
 *     { city: 'Paris', countryCode: 'FR' },
 *     { city: 'Lyon', countryCode: 'FR' }
 *   ],
 *   checkIn: '2025-03-15',
 *   checkOut: '2025-03-17',
 *   rooms: [{ adults: 2 }]
 * });
 * // prices.prices["Paris_FR"]?.minPrice === 106.5
 */
export async function getMapPrices(
  params: MapPricesParams,
  forceRefresh: boolean = false
): Promise<MapPricesResponse> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getFromCache<MapPricesResponse>('mapPrices', params);
    if (cached) {
      console.log('[HotelService] Cache hit for map prices');
      return cached;
    }
  }
  
  try {
    const requestBody = {
      cities: params.cities.slice(0, 10), // API max 10 cities
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      rooms: params.rooms.map(r => ({
        adults: r.adults,
        childrenAges: r.childrenAges || [],
      })),
      currency: params.currency || 'EUR',
    };

    const url = forceRefresh
      ? '/api/v1/hotels/map-prices?force_refresh=true'
      : '/api/v1/hotels/map-prices';

    const response = await travliaqClient.post<MapPricesResponse>(url, requestBody);
    
    // Cache successful response
    if (response.data.success) {
      setInCache('mapPrices', params, response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('[HotelService] Map prices error:', error);
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Check API health status
 * 
 * @returns true if API is healthy
 */
export async function checkHealth(): Promise<HealthResponse | null> {
  try {
    const response = await travliaqClient.get<HealthResponse>('/api/v1/hotels/health');
    return response.data;
  } catch {
    return null;
  }
}

/**
 * Check if API is available
 */
export async function isApiAvailable(): Promise<boolean> {
  const health = await checkHealth();
  return health?.status === 'healthy' && health?.booking_api === 'connected';
}

/**
 * Clear hotel cache
 * 
 * @param type - Optional type to clear ('search' | 'details' | 'mapPrices')
 */
export function clearHotelCache(type?: 'search' | 'details' | 'mapPrices'): void {
  try {
    const prefix = type ? `${CACHE_PREFIX}_${type}_` : `${CACHE_PREFIX}_`;
    const keys = Object.keys(localStorage);
    
    let count = 0;
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
        count++;
      }
    });
    
    console.log(`[HotelService] Cache cleared: ${type || 'all'} (${count} entries)`);
  } catch (error) {
    console.error('[HotelService] Cache clear error:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { count: number; sizeKB: number } {
  try {
    const keys = Object.keys(localStorage);
    const hotelKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    
    let totalSize = 0;
    hotelKeys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        totalSize += item.length * 2; // UTF-16 characters = 2 bytes each
      }
    });
    
    return {
      count: hotelKeys.length,
      sizeKB: Math.round(totalSize / 1024 * 10) / 10,
    };
  } catch {
    return { count: 0, sizeKB: 0 };
  }
}

// Export default object for convenience
export default {
  searchHotels,
  getHotelDetails,
  getMapPrices,
  checkHealth,
  isApiAvailable,
  clearHotelCache,
  getCacheStats,
};
