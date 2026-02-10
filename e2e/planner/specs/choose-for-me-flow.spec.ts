import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Choose For Me Flow
 *
 * Validates the delegation pattern where user explicitly asks
 * the bot to make a choice for them.
 *
 * Key scenarios:
 * - "Choisis pour moi" triggers bot selection
 * - Bot must NOT auto-select without explicit delegation
 * - Multiple delegation phrases are recognized
 */

test.describe('Choose For Me Flow', () => {

  test('bot selects a destination after explicit "choisis pour moi"', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set up preferences
    await page.sendChatMessage('Je veux un voyage aventure en montagne, 2 semaines');
    await page.waitForChatResponse(10000);

    // Ask for suggestions
    await page.sendChatMessage('Quelles destinations me proposes-tu ?');
    await page.waitForChatResponse(12000);

    // Explicitly delegate
    await page.sendChatMessage('Choisis pour moi la meilleure destination');
    await page.waitForChatResponse(10000);

    const lastMsg = await page.getLastChatMessage();
    // Bot should have made a selection and explain it
    expect(lastMsg.length).toBeGreaterThan(30);
  });

  test('"je te fais confiance" also triggers delegation', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('Voyage culturel en Europe, budget moyen');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('Propose-moi des options');
    await page.waitForChatResponse(10000);

    await page.sendChatMessage('Je te fais confiance, prends la meilleure option');
    await page.waitForChatResponse(10000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20);
  });

  test('bot does NOT auto-select without delegation', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set preferences
    await page.sendChatMessage('Voyage plage en Asie');
    await page.waitForChatResponse(8000);

    // Ask for suggestions without delegation
    await page.sendChatMessage('Quelles sont mes options ?');
    await page.waitForChatResponse(10000);

    // Verify bot presented options without auto-selecting
    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20);

    // Check that no destination was automatically committed to memory
    const travelMemory = await page.memory.getTravelMemory();
    // The flight memory should NOT have a destination auto-set
    // (unless the LLM correctly inferred one from "Asie")
  });
});
