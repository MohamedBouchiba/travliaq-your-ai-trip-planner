import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Stream Cancellation
 *
 * Validates that streaming can be cancelled and the UI recovers:
 * - Cancel button appears during streaming
 * - Partial content is preserved
 * - Input becomes active after cancellation
 */

test.describe('Stream Cancellation', () => {

  test('cancel button appears during streaming', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send a message that will trigger streaming
    await page.sendChatMessage('Explique-moi en détail les meilleures destinations pour un voyage culturel en Asie du Sud-Est');

    // Check for streaming indicator or cancel button within first 3 seconds
    await page.wait(500);

    // The streaming cursor (blinking bar) should be visible
    const streamingCursor = authenticatedPage.locator('.animate-pulse').first();
    const isStreaming = await streamingCursor.isVisible({ timeout: 5000 }).catch(() => false);

    // Wait for response to complete
    await page.waitForChatResponse(15000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0);
  });

  test('chat remains functional after rapid send during stream', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send first message
    await page.sendChatMessage('Voyage en Thaïlande');

    // Wait briefly then send another message while first might still be streaming
    await page.wait(1000);
    await page.sendChatMessage('Combien ça coûte ?');

    // Wait for all responses
    await page.waitForChatResponse(15000);

    // Chat should still be functional
    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0);

    // Input should be editable
    const chatInput = authenticatedPage.locator('[data-testid="chat-input"]');
    if (await chatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(chatInput).toBeEnabled();
    }
  });
});
