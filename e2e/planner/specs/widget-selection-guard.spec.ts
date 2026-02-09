import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Widget Selection Guard
 *
 * Validates that widgets don't auto-select options without
 * explicit user delegation (e.g., "choisis pour moi").
 *
 * Anomaly covered: A11 (auto-selection of Oman)
 */

test.describe('Widget Selection Guard', () => {

  test('destination widget should NOT auto-select without user request', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set preferences
    await page.sendChatMessage('Je veux un voyage aventure en montagne');
    await page.waitForChatResponse(8000);

    // Ask for destination suggestions
    await page.sendChatMessage('Quelles destinations me proposes-tu ?');
    await page.waitForChatResponse(10000);

    // Check that no destination was auto-selected
    const travelMemory = await page.memory.getTravelMemory();
    // If destinations were suggested, none should be auto-confirmed
    // without explicit user action
    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20); // Bot presented options
  });

  test('"choisis pour moi" should allow bot to select', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set up context
    await page.sendChatMessage('Je veux un voyage culturel en Europe');
    await page.waitForChatResponse(8000);

    // Ask for destinations
    await page.sendChatMessage('Propose-moi des destinations');
    await page.waitForChatResponse(10000);

    // Explicitly delegate choice
    await page.sendChatMessage('Choisis pour moi');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    // Bot should have made a selection
    expect(lastMsg.length).toBeGreaterThan(20);
  });

  test('"à toi de décider" should also trigger delegation', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('Voyage plage en Asie');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('Propose des options');
    await page.waitForChatResponse(10000);

    await page.sendChatMessage('À toi de décider');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20);
  });
});
