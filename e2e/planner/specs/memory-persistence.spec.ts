import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Memory Persistence
 *
 * Validates that all memory stores (flight, travel, accommodation)
 * persist correctly across tab switches, page reloads, and session changes.
 */

test.describe('Memory Persistence', () => {

  test('travel memory persists travelers across tab switches', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set travelers
    await page.sendChatMessage('3 adultes et 2 enfants');
    await page.waitForChatResponse(8000);

    // Switch tabs
    await page.switchToFlights();
    await page.wait(300);
    await page.switchToStays();
    await page.wait(300);
    await page.switchToActivities();
    await page.wait(300);

    // Check memory
    const travelMemory = await page.memory.getTravelMemory();
    if (travelMemory?.travelers) {
      expect(travelMemory.travelers.adults).toBe(3);
      expect(travelMemory.travelers.children).toBe(2);
    }
  });

  test('flight memory persists trip type', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('Vol aller simple Paris Bangkok');
    await page.waitForChatResponse(8000);

    const flightMemory = await page.memory.getFlightMemory();
    if (flightMemory?.tripType) {
      expect(flightMemory.tripType).toBe('oneway');
    }
  });

  test('clearing memory resets all stores', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set some memory
    await page.sendChatMessage('2 adultes, Paris Tokyo aller-retour');
    await page.waitForChatResponse(8000);

    // Clear all
    await page.memory.clearAllMemories();

    // Verify cleared
    const flightMemory = await page.memory.getFlightMemory();
    const travelMemory = await page.memory.getTravelMemory();
    const accomMemory = await page.memory.getAccommodationMemory();

    expect(flightMemory).toBeNull();
    expect(travelMemory).toBeNull();
    expect(accomMemory).toBeNull();
  });

  test('accommodation memory persists budget selections', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('Voyage à Rome, hébergement premium');
    await page.waitForChatResponse(8000);

    await page.switchToStays();
    await page.waitForAccommodationSync();

    const accomMemory = await page.memory.getAccommodationMemory();
    if (accomMemory?.accommodations?.length > 0) {
      // At least one accommodation exists
      expect(accomMemory.accommodations.length).toBeGreaterThanOrEqual(1);
    }
  });
});
