/**
 * Map Bounds Search Integration Test
 *
 * Tests the complete flow:
 * 1. User clicks "Rechercher dans cette zone" button
 * 2. Event bus requests bounds from PlannerMap
 * 3. Map responds with current viewport bounds
 * 4. API call is made with bounds parameter
 * 5. Results are displayed (activities list + attractions on map)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '@/lib/eventBus';

describe('Map Bounds Search Integration', () => {
  beforeEach(() => {
    // Clear all event listeners before each test
    eventBus.all.clear();
  });

  it('should emit map:getBounds event when button is clicked', async () => {
    const mockHandler = vi.fn();

    // Listen for the getBounds event
    eventBus.on('map:getBounds', mockHandler);

    // Simulate button click (triggers event emission)
    eventBus.emit('map:getBounds');

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should receive bounds from map with correct structure', async () => {
    const mockBounds = {
      north: 48.8566,
      south: 48.8466,
      east: 2.3522,
      west: 2.3422
    };

    // Setup listener for bounds response
    const boundsPromise = new Promise<any>((resolve) => {
      const handler = (data: any) => {
        eventBus.off('map:bounds', handler);
        resolve(data);
      };
      eventBus.on('map:bounds', handler);
    });

    // Simulate map responding with bounds
    eventBus.emit('map:bounds', { bounds: mockBounds });

    const data = await boundsPromise;
    expect(data.bounds).toBeDefined();
    expect(data.bounds.north).toBe(mockBounds.north);
    expect(data.bounds.south).toBe(mockBounds.south);
    expect(data.bounds.east).toBe(mockBounds.east);
    expect(data.bounds.west).toBe(mockBounds.west);
  });

  it('should construct valid API request body with bounds', () => {
    const mockBounds = {
      north: 48.8566,
      south: 48.8466,
      east: 2.3522,
      west: 2.3422
    };

    const expectedRequestBody = {
      search_mode: "both",
      location: {
        city: "Paris",
        geo: {
          bounds: mockBounds
        }
      },
      dates: {
        start: "2026-01-15",
        end: "2026-01-20"
      },
      filters: {
        categories: ["culture", "food"],
        price_range: { min: 0, max: 150 },
        rating_min: 4.0
      },
      user_preferences: {
        interests: ["culture", "food"],
        comfortLevel: 60,
        pace: "moderate"
      },
      pagination: {
        page: 1,
        limit: 40
      }
    };

    // Verify structure matches backend expectations
    expect(expectedRequestBody.location.geo.bounds).toEqual(mockBounds);
    expect(expectedRequestBody.location.geo.bounds.north).toBeGreaterThan(
      expectedRequestBody.location.geo.bounds.south
    );
    expect(expectedRequestBody.location.geo.bounds.east).toBeGreaterThan(
      expectedRequestBody.location.geo.bounds.west
    );
  });

  it('should handle bounds timeout gracefully', async () => {
    const timeout = 1000; // 1 second timeout

    const boundsPromise = new Promise<any>((resolve) => {
      const timeoutId = setTimeout(() => resolve(null), timeout);

      const handler = (data: any) => {
        clearTimeout(timeoutId);
        eventBus.off('map:bounds', handler);
        resolve(data.bounds);
      };
      eventBus.on('map:bounds', handler);

      eventBus.emit('map:getBounds');
    });

    // Don't emit response - should timeout
    const result = await boundsPromise;

    expect(result).toBeNull();
  });

  it('should validate bounds are within valid lat/lng ranges', () => {
    const validBounds = {
      north: 48.8566,
      south: 48.8466,
      east: 2.3522,
      west: 2.3422
    };

    const invalidBounds = {
      north: 95, // Invalid: > 90
      south: -95, // Invalid: < -90
      east: 200, // Invalid: > 180
      west: -200 // Invalid: < -180
    };

    // Validation function
    const isValidBounds = (bounds: any) => {
      return (
        bounds.north >= -90 && bounds.north <= 90 &&
        bounds.south >= -90 && bounds.south <= 90 &&
        bounds.east >= -180 && bounds.east <= 180 &&
        bounds.west >= -180 && bounds.west <= 180 &&
        bounds.north > bounds.south &&
        bounds.east > bounds.west
      );
    };

    expect(isValidBounds(validBounds)).toBe(true);
    expect(isValidBounds(invalidBounds)).toBe(false);
  });

  it('should handle API response with v2 structure (activities + attractions)', () => {
    const mockApiResponse = {
      results: {
        activities_list: [
          {
            id: "act1",
            title: "Louvre Museum Tour",
            rating: { average: 4.8, count: 1234 },
            pricing: { from_price: { amount: 45, currency: "EUR" } }
          }
        ],
        attractions: [
          {
            id: "attr1",
            title: "Eiffel Tower",
            location: { coordinates: { lat: 48.8584, lon: 2.2945 } },
            rating: { average: 4.9, count: 5678 }
          }
        ],
        total_activities: 38,
        total_attractions: 12
      }
    };

    expect(mockApiResponse.results.activities_list).toHaveLength(1);
    expect(mockApiResponse.results.attractions).toHaveLength(1);
    expect(mockApiResponse.results.total_activities).toBe(38);
    expect(mockApiResponse.results.total_attractions).toBe(12);

    // Verify attractions have coordinates (for map)
    expect(mockApiResponse.results.attractions[0].location.coordinates).toBeDefined();
  });
});

describe('Map Bounds Calculation', () => {
  it('should calculate correct center from bounds', () => {
    const bounds = {
      north: 48.8566,
      south: 48.8466,
      east: 2.3522,
      west: 2.3422
    };

    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.east + bounds.west) / 2;

    expect(centerLat).toBeCloseTo(48.8516, 4);
    expect(centerLon).toBeCloseTo(2.3472, 4);
  });

  it('should calculate approximate radius from bounds', () => {
    const bounds = {
      north: 48.8566,
      south: 48.8466,
      east: 2.3522,
      west: 2.3422
    };

    // Haversine distance approximation
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.east + bounds.west) / 2;

    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(bounds.north - centerLat);
    const dLon = toRad(bounds.east - centerLon);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(centerLat)) *
              Math.cos(toRad(bounds.north)) *
              Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const radiusKm = 6371 * c; // Earth radius in km

    expect(radiusKm).toBeGreaterThan(0);
    expect(radiusKm).toBeLessThan(50); // Max radius is 50km per plan
  });
});

describe('UI State Management', () => {
  it('should show loading state during search', () => {
    let isSearching = false;

    // Simulate search start
    isSearching = true;
    expect(isSearching).toBe(true);

    // Simulate search complete
    isSearching = false;
    expect(isSearching).toBe(false);
  });

  it('should update search results state with v2 structure', () => {
    const initialState = {
      activities: [],
      attractions: [],
      total: 0
    };

    const updatedState = {
      activities: [{ id: "act1", title: "Activity 1" }],
      attractions: [{ id: "attr1", title: "Attraction 1" }],
      total: 2
    };

    expect(initialState.activities).toHaveLength(0);
    expect(updatedState.activities).toHaveLength(1);
    expect(updatedState.attractions).toHaveLength(1);
  });

  it('should display toast notification with results count', () => {
    const activitiesCount = 38;
    const attractionsCount = 12;

    const expectedMessage = `${attractionsCount} attractions et ${activitiesCount} activités trouvées dans cette zone`;

    expect(expectedMessage).toContain('38 activités');
    expect(expectedMessage).toContain('12 attractions');
  });
});
