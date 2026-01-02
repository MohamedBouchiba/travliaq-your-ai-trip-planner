/**
 * Activity Service
 *
 * Service for interacting with Travliaq API activities endpoints
 * Wraps Viator API through Travliaq backend
 */

import { travliaqClient } from '../api/travliaqClient';
import type {
  ActivitySearchParams,
  ActivitySearchResponse,
  ActivityDetailsResponse,
  TagSearchResponse,
  CategoryWithEmoji,
} from '../../types/activity';

/**
 * Activity Service
 */
export const activityService = {
  /**
   * Search activities with filters
   *
   * @param params Search parameters
   * @returns Activity search response
   */
  async searchActivities(params: ActivitySearchParams): Promise<ActivitySearchResponse> {
    const { data } = await travliaqClient.post<ActivitySearchResponse>(
      '/api/v1/activities/search',
      {
        location: {
          city: params.city,
          country_code: params.countryCode,
        },
        dates: {
          start: params.startDate,
          end: params.endDate,
        },
        filters: {
          categories: params.categories,
          price_range: params.priceRange,
          rating_min: params.ratingMin,
          duration_minutes: params.durationMinutes,
        },
        currency: params.currency || 'EUR',
        language: params.language || 'fr',
        pagination: {
          page: params.page || 1,
          limit: params.limit || 30,
        },
      }
    );

    return data;
  },

  /**
   * Get activity details by product code
   *
   * @param productCode Viator product code
   * @param language Language code (default: 'fr')
   * @param currency Currency code (default: 'EUR')
   * @returns Activity details response
   */
  async getActivityDetails(
    productCode: string,
    language: string = 'fr',
    currency: string = 'EUR'
  ): Promise<ActivityDetailsResponse> {
    const { data } = await travliaqClient.get<ActivityDetailsResponse>(
      `/api/v1/activities/${productCode}`,
      {
        params: { language, currency },
      }
    );

    return data;
  },

  /**
   * Check availability for an activity
   *
   * @param productCode Viator product code
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD, optional)
   * @returns Availability response
   */
  async checkAvailability(
    productCode: string,
    startDate: string,
    endDate?: string
  ): Promise<any> {
    const { data } = await travliaqClient.post(
      `/api/v1/activities/${productCode}/availability`,
      {
        start_date: startDate,
        end_date: endDate,
        currency: 'EUR',
      }
    );

    return data;
  },

  /**
   * Search tags/categories by keyword
   *
   * @param keyword Search keyword
   * @param language Language code (default: 'fr')
   * @param limit Max results (default: 20)
   * @returns Tag search response
   */
  async searchTags(
    keyword: string,
    language: string = 'fr',
    limit: number = 20
  ): Promise<TagSearchResponse> {
    const { data } = await travliaqClient.get<TagSearchResponse>(
      '/admin/tags/search',
      {
        params: { keyword, language, limit },
      }
    );

    return data;
  },

  /**
   * Get all root categories
   *
   * @param language Language code (default: 'fr')
   * @returns Array of categories with emojis
   */
  async getRootCategories(language: string = 'fr'): Promise<CategoryWithEmoji[]> {
    const { data } = await travliaqClient.get<{
      count: number;
      root_tags: Array<{
        tag_id: number;
        tag_name: string;
        all_names: Record<string, string>;
      }>;
    }>('/admin/tags/root');

    // Map to categories with emojis
    return data.root_tags.map((tag) => ({
      id: tag.tag_id,
      label: tag.all_names[language] || tag.tag_name,
      emoji: this.getCategoryEmoji(tag.tag_name),
      keyword: tag.tag_name.toLowerCase(),
    }));
  },

  /**
   * Get emoji for a category tag
   *
   * @param tagName Tag name
   * @returns Emoji string
   */
  getCategoryEmoji(tagName: string): string {
    const mapping: Record<string, string> = {
      'Museums': '🏛️',
      'Musées': '🏛️',
      'Museum': '🏛️',
      'Food & Drink': '🍽️',
      'Gastronomie': '🍽️',
      'Food': '🍽️',
      'Tours': '🎯',
      'Cultural': '🎨',
      'Culture': '🎨',
      'Outdoor': '🌲',
      'Nature': '🌿',
      'Water Sports': '🏄',
      'Water': '🏄',
      'Shows': '🎭',
      'Performances': '🎭',
      'Classes': '📚',
      'Workshops': '📚',
      'Air': '🚁',
      'Helicopter': '🚁',
      'Balloon': '🎈',
      'Shopping': '🛍️',
      'Wellness': '💆',
      'Spa': '💆',
      'Nightlife': '🎵',
      'Night': '🌙',
      'Adventure': '🧗',
      'Sport': '⚽',
      'Beach': '🏖️',
      'Historical': '⏳',
      'Architecture': '🏰',
      'Art': '🎨',
      'Photography': '📸',
      'Wine': '🍷',
      'Beer': '🍺',
      'Coffee': '☕',
      'Walking': '🚶',
      'Bike': '🚴',
      'Cruise': '🚢',
      'Train': '🚂',
    };

    // Find matching emoji
    for (const [key, emoji] of Object.entries(mapping)) {
      if (tagName.toLowerCase().includes(key.toLowerCase())) {
        return emoji;
      }
    }

    // Default emoji
    return '🎫';
  },

  /**
   * Get activity category keywords from tag names
   *
   * @param tagIds Array of tag IDs
   * @returns Array of keyword strings
   */
  async getKeywordsFromTags(tagIds: number[]): Promise<string[]> {
    // For now, return empty array
    // In future, could fetch tag details and extract keywords
    return [];
  },
};

export default activityService;
