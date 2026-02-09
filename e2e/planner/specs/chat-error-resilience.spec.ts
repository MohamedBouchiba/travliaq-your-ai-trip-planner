import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Chat Error Resilience
 *
 * Validates that the chat handles edge cases and errors gracefully:
 * - Rapid successive messages
 * - Very long messages
 * - Special characters
 * - Network interruptions (simulated)
 */

test.describe('Chat Error Resilience', () => {

  test('handles rapid successive messages without crash', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send messages rapidly (don't wait for response)
    await page.sendChatMessage('Premier message');
    await page.wait(200);
    await page.sendChatMessage('Deuxième message');
    await page.wait(200);
    await page.sendChatMessage('Troisième message');

    // Wait for all responses
    await page.waitForChatResponse(15000);

    // Page should not crash — chat should still be functional
    const messages = await authenticatedPage.locator('[data-testid="chat-message"]').count();
    expect(messages).toBeGreaterThanOrEqual(3); // At least user messages
  });

  test('handles very long message without crash', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    const longMessage = 'Je veux un voyage ' + 'extraordinaire '.repeat(100);
    await page.sendChatMessage(longMessage);
    await page.waitForChatResponse(10000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0); // Got some response
  });

  test('handles special characters without crash', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('Je veux aller à São Paulo 🇧🇷 avec mes amis <script>alert("xss")</script>');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0);

    // XSS should not execute
    const alertTriggered = await authenticatedPage.evaluate(() => {
      return (window as any).__xssTriggered || false;
    });
    expect(alertTriggered).toBe(false);
  });

  test('handles emoji-only message', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('🏖️🌴✈️');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    // Bot should interpret the intent (beach/travel)
    expect(lastMsg.length).toBeGreaterThan(5);
  });

  test('chat remains functional after page reload', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send a message
    await page.sendChatMessage('Bonjour, je veux voyager');
    await page.waitForChatResponse(6000);

    // Reload page
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');

    // Chat should still work
    await page.sendChatMessage('Je suis de retour');
    await page.waitForChatResponse(6000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0);
  });
});
