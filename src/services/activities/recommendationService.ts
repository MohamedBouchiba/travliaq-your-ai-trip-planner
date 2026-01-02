/**
 * Recommendation Service
 *
 * Intelligent activity recommendations based on user preferences,
 * weather, budget, and existing activities
 */

import { activityService } from './activityService';
import type {
  ActivitySearchParams,
  ViatorActivity,
} from '../../types/activity';

/**
 * User preferences interface (matches PreferenceMemoryContext)
 */
interface UserPreferences {
  interests: string[];
  comfortLevel: number;
  travelPace?: 'relaxed' | 'moderate' | 'intense';
  dietaryRestrictions?: string[];
}

/**
 * Recommendation Service
 */
export const recommendationService = {
  /**
   * Get personalized activity recommendations
   *
   * @param city City name
   * @param countryCode Country code (ISO 3166-1 alpha-2)
   * @param startDate Start date (YYYY-MM-DD)
   * @param preferences User preferences
   * @param existingActivities Already planned activities (to avoid duplicates)
   * @returns Array of recommended activities
   */
  async getPersonalizedRecommendations(
    city: string,
    countryCode: string,
    startDate: string,
    preferences: UserPreferences,
    existingActivities: ViatorActivity[] = []
  ): Promise<ViatorActivity[]> {
    // Map preferences to search categories
    const categories = this.mapPreferencesToCategories(preferences.interests);

    // Map comfort level to budget
    const priceRange = this.mapComfortToBudget(preferences.comfortLevel);

    // Build search params
    const searchParams: ActivitySearchParams = {
      city,
      countryCode,
      startDate,
      categories,
      priceRange,
      ratingMin: 4.0, // Always recommend well-rated activities
      currency: 'EUR',
      language: 'fr',
      limit: 15,
    };

    try {
      // Search activities
      const response = await activityService.searchActivities(searchParams);

      // Filter out duplicates (already added activities)
      const existingIds = new Set(existingActivities.map((a) => a.id));
      const filtered = response.results.activities.filter(
        (activity) => !existingIds.has(activity.id)
      );

      // Sort by relevance (rating * log(review count))
      const sorted = this.sortByRelevance(filtered);

      // Return top 10
      return sorted.slice(0, 10);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  },

  /**
   * Get recommendations based on weather forecast
   *
   * @param city City name
   * @param countryCode Country code
   * @param startDate Start date
   * @param willRain Whether rain is forecasted
   * @returns Array of activities
   */
  async getWeatherBasedRecommendations(
    city: string,
    countryCode: string,
    startDate: string,
    willRain: boolean
  ): Promise<ViatorActivity[]> {
    const categories = willRain
      ? ['museum', 'indoor', 'food', 'cultural', 'shopping']
      : ['outdoor', 'nature', 'tours', 'walking', 'beach'];

    try {
      const response = await activityService.searchActivities({
        city,
        countryCode,
        startDate,
        categories,
        ratingMin: 4.0,
        limit: 10,
      });

      return response.results.activities;
    } catch (error) {
      console.error('Error fetching weather-based recommendations:', error);
      return [];
    }
  },

  /**
   * Get budget-friendly recommendations
   *
   * @param city City name
   * @param countryCode Country code
   * @param startDate Start date
   * @param maxBudgetPerActivity Max budget per activity
   * @returns Array of activities
   */
  async getBudgetFriendlyRecommendations(
    city: string,
    countryCode: string,
    startDate: string,
    maxBudgetPerActivity: number
  ): Promise<ViatorActivity[]> {
    try {
      const response = await activityService.searchActivities({
        city,
        countryCode,
        startDate,
        priceRange: { min: 0, max: maxBudgetPerActivity },
        ratingMin: 4.0,
        limit: 10,
      });

      return response.results.activities;
    } catch (error) {
      console.error('Error fetching budget-friendly recommendations:', error);
      return [];
    }
  },

  /**
   * Get similar activities to a given activity
   *
   * @param activity Reference activity
   * @param city City name
   * @param countryCode Country code
   * @param startDate Start date
   * @returns Array of similar activities
   */
  async getSimilarActivities(
    activity: ViatorActivity,
    city: string,
    countryCode: string,
    startDate: string
  ): Promise<ViatorActivity[]> {
    try {
      const response = await activityService.searchActivities({
        city,
        countryCode,
        startDate,
        categories: activity.categories,
        priceRange: {
          min: activity.pricing.from_price * 0.7,
          max: activity.pricing.from_price * 1.3,
        },
        ratingMin: 3.5,
        limit: 10,
      });

      // Filter out the original activity
      return response.results.activities.filter((a) => a.id !== activity.id);
    } catch (error) {
      console.error('Error fetching similar activities:', error);
      return [];
    }
  },

  /**
   * Map user interests to activity categories
   *
   * @param interests Array of user interests
   * @returns Array of category keywords
   */
  mapPreferencesToCategories(interests: string[]): string[] {
    const mapping: Record<string, string[]> = {
      culture: ['museum', 'cultural', 'tours', 'historical', 'art'],
      food: ['food', 'culinary', 'gastronomy', 'wine', 'cooking'],
      nature: ['nature', 'outdoor', 'hiking', 'parks', 'wildlife'],
      beach: ['beach', 'water', 'coastal', 'swimming'],
      wellness: ['wellness', 'spa', 'relaxation', 'yoga', 'massage'],
      sport: ['sport', 'adventure', 'active', 'biking', 'climbing'],
      shopping: ['shopping', 'markets', 'boutiques'],
      nightlife: ['nightlife', 'bars', 'clubs', 'entertainment'],
      photography: ['photography', 'scenic', 'viewpoints'],
      family: ['family', 'kids', 'children'],
    };

    const categories = new Set<string>();

    interests.forEach((interest) => {
      const mapped = mapping[interest.toLowerCase()] || [];
      mapped.forEach((cat) => categories.add(cat));
    });

    return Array.from(categories);
  },

  /**
   * Map comfort level to budget range
   *
   * @param comfortLevel Comfort level (0-100)
   * @returns Price range
   */
  mapComfortToBudget(comfortLevel: number): { min: number; max: number } {
    if (comfortLevel < 25) {
      // Eco
      return { min: 0, max: 50 };
    } else if (comfortLevel < 50) {
      // Budget
      return { min: 0, max: 100 };
    } else if (comfortLevel < 75) {
      // Comfort
      return { min: 50, max: 200 };
    } else {
      // Luxury
      return { min: 100, max: 500 };
    }
  },

  /**
   * Sort activities by relevance score
   *
   * Relevance = rating * log(review_count + 1)
   * This favors highly-rated activities with many reviews
   *
   * @param activities Array of activities
   * @returns Sorted array
   */
  sortByRelevance(activities: ViatorActivity[]): ViatorActivity[] {
    return activities.sort((a, b) => {
      const scoreA = a.rating.average * Math.log(a.rating.count + 1);
      const scoreB = b.rating.average * Math.log(b.rating.count + 1);
      return scoreB - scoreA;
    });
  },

  /**
   * Filter activities by category saturation
   *
   * Avoids recommending too many activities of the same category
   *
   * @param recommendations Recommended activities
   * @param existingActivities Existing activities
   * @param maxPerCategory Max activities per category
   * @returns Filtered recommendations
   */
  filterByCategorySaturation(
    recommendations: ViatorActivity[],
    existingActivities: ViatorActivity[],
    maxPerCategory: number = 3
  ): ViatorActivity[] {
    // Count existing categories
    const categoryCounts = new Map<string, number>();

    existingActivities.forEach((activity) => {
      activity.categories.forEach((cat) => {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      });
    });

    // Filter recommendations
    const filtered: ViatorActivity[] = [];

    for (const activity of recommendations) {
      const primaryCategory = activity.categories[0];

      if ((categoryCounts.get(primaryCategory) || 0) < maxPerCategory) {
        filtered.push(activity);

        // Update count
        categoryCounts.set(
          primaryCategory,
          (categoryCounts.get(primaryCategory) || 0) + 1
        );
      }
    }

    return filtered;
  },
};

export default recommendationService;
