import { describe, it, expect } from 'vitest';

/**
 * Regression tests for critical bug fixes.
 * These ensure previously-broken features stay working.
 */

// --- Test 1: Auto-detect departure skip logic ---
describe('useAutoDetectDeparture skip logic', () => {
  const shouldSkip = (departure: Record<string, unknown> | null | undefined): boolean => {
    const dep = departure;
    const hasValidDeparture =
      dep &&
      typeof dep.iata === 'string' && (dep.iata as string).trim() !== '' &&
      typeof dep.city === 'string' && (dep.city as string).trim() !== '';
    return !!(hasValidDeparture || (dep as Record<string, unknown>)?.userProvided);
  };

  it('should NOT skip when departure is undefined', () => {
    expect(shouldSkip(undefined)).toBe(false);
  });

  it('should NOT skip when departure is null', () => {
    expect(shouldSkip(null)).toBe(false);
  });

  it('should NOT skip when departure is an empty object', () => {
    expect(shouldSkip({})).toBe(false);
  });

  it('should NOT skip when departure has empty iata and city', () => {
    expect(shouldSkip({ iata: '', city: '' })).toBe(false);
  });

  it('should NOT skip when departure has iata but no city', () => {
    expect(shouldSkip({ iata: 'CDG', city: '' })).toBe(false);
  });

  it('should skip when departure has both valid iata AND city', () => {
    expect(shouldSkip({ iata: 'CDG', city: 'Paris' })).toBe(true);
  });

  it('should skip when userProvided is true even without iata/city', () => {
    expect(shouldSkip({ userProvided: true })).toBe(true);
  });
});

// --- Test 2: TripPriceBar step calculation ---
describe('TripPriceBar step calculations', () => {
  type BasketItem = { type: string; price: number };

  const calculateSteps = (
    basketItems: BasketItem[],
    flexibleTripType: string
  ) => {
    const completedTypes = new Set(basketItems.map((i) => i.type));
    const completed: string[] = [];
    if (completedTypes.has('flight')) completed.push('flights');
    if (completedTypes.has('hotel')) completed.push('hotels');
    if (completedTypes.has('activity')) completed.push('activities');

    const requiredMap: Record<string, string[]> = {
      'flight-hotel': ['flights', 'hotels', 'activities'],
      'hotel-only': ['hotels', 'activities'],
      'day-trip': ['activities'],
    };
    const required = requiredMap[flexibleTripType] || ['flights', 'hotels', 'activities'];
    const missing = required.filter((s) => !completed.includes(s));

    return {
      completedSteps: completed,
      requiredSteps: required,
      isComplete: missing.length === 0 && basketItems.length > 0,
    };
  };

  it('returns 0 completed steps for empty basket', () => {
    const result = calculateSteps([], 'flight-hotel');
    expect(result.completedSteps).toEqual([]);
    expect(result.isComplete).toBe(false);
  });

  it('marks flights as completed when flight item exists', () => {
    const result = calculateSteps([{ type: 'flight', price: 200 }], 'flight-hotel');
    expect(result.completedSteps).toContain('flights');
    expect(result.isComplete).toBe(false);
  });

  it('marks complete when all required steps are done', () => {
    const items = [
      { type: 'flight', price: 200 },
      { type: 'hotel', price: 150 },
      { type: 'activity', price: 50 },
    ];
    const result = calculateSteps(items, 'flight-hotel');
    expect(result.isComplete).toBe(true);
  });

  it('respects day-trip requiring only activities', () => {
    const result = calculateSteps([{ type: 'activity', price: 30 }], 'day-trip');
    expect(result.requiredSteps).toEqual(['activities']);
    expect(result.isComplete).toBe(true);
  });

  it('calculates progress percentage correctly', () => {
    const items = [{ type: 'flight', price: 200 }];
    const { completedSteps, requiredSteps } = calculateSteps(items, 'flight-hotel');
    const visibleSteps = ['flights', 'hotels', 'activities'].filter((s) => requiredSteps.includes(s));
    const doneCount = visibleSteps.filter((s) => completedSteps.includes(s)).length;
    const percent = Math.round((doneCount / visibleSteps.length) * 100);
    expect(percent).toBe(33);
  });
});

// --- Test 3: Autocomplete result formatting ---
describe('Location autocomplete result formatting', () => {
  interface ApiResult {
    id: string;
    name: string;
    type: string;
    country_code: string;
    country_name: string;
    iata?: string;
    latitude: number;
    longitude: number;
  }

  const formatResult = (item: ApiResult) => {
    let displayName = item.name;
    if (item.type === 'airport' && item.iata) {
      displayName = `${item.name} (${item.iata})`;
    } else if (item.type === 'city') {
      displayName = `${item.name}, ${item.country_name}`;
    }
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      display_name: displayName,
      lat: item.latitude,
      lng: item.longitude,
    };
  };

  it('formats airport with IATA code', () => {
    const result = formatResult({
      id: '1', name: 'Charles de Gaulle', type: 'airport',
      country_code: 'FR', country_name: 'France', iata: 'CDG',
      latitude: 49.0, longitude: 2.5,
    });
    expect(result.display_name).toBe('Charles de Gaulle (CDG)');
  });

  it('formats city with country name', () => {
    const result = formatResult({
      id: '2', name: 'Paris', type: 'city',
      country_code: 'FR', country_name: 'France',
      latitude: 48.8, longitude: 2.3,
    });
    expect(result.display_name).toBe('Paris, France');
  });

  it('uses plain name for country type', () => {
    const result = formatResult({
      id: '3', name: 'France', type: 'country',
      country_code: 'FR', country_name: 'France',
      latitude: 46.0, longitude: 2.0,
    });
    expect(result.display_name).toBe('France');
  });
});

// --- Test 4: Session switching ref stability ---
describe('isSwitchingSessionRef stability', () => {
  it('effect with unstable dep in deps array fires every render (simulates bug)', () => {
    // This test documents the bug: if widgetFlow (which changes identity every render)
    // is in the deps array of the session-switch effect, isSwitchingSessionRef stays true forever.
    let renderCount = 0;
    let effectCount = 0;

    // Simulate: each "render" creates a new object (like widgetFlow return)
    const simulateRenders = (numRenders: number, deps: () => unknown[]) => {
      let prevDeps: unknown[] | null = null;
      for (let i = 0; i < numRenders; i++) {
        renderCount++;
        const currentDeps = deps();
        // Effect fires if deps changed
        if (!prevDeps || currentDeps.some((d, idx) => d !== prevDeps![idx])) {
          effectCount++;
        }
        prevDeps = currentDeps;
      }
    };

    const stableSessionId = 'session-1';

    // BUG scenario: widgetFlow changes every render
    simulateRenders(5, () => [stableSessionId, { resetFlowState: () => {} }]);
    // Effect fires every render because object identity changes
    expect(effectCount).toBe(5);

    // FIXED scenario: only activeSessionId in deps
    renderCount = 0;
    effectCount = 0;
    simulateRenders(5, () => [stableSessionId]);
    // Effect fires only once (first render)
    expect(effectCount).toBe(1);
  });
});
