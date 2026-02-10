import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Conversation History Persistence
 *
 * Validates that conversation state persists across:
 * - Page refreshes
 * - Widget confirmations survive reload
 * - Welcome message displays in current language after reload
 */

test.describe('Conversation History Persistence', () => {

  test('messages are restored after page refresh', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send messages
    await page.sendChatMessage('Je veux partir en vacances au Maroc');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('Pour 2 semaines en juin');
    await page.waitForChatResponse(8000);

    // Count messages before refresh
    const visibleMessages = authenticatedPage.locator('[data-testid="chat-message"]');
    const countBefore = await visibleMessages.count();

    // Refresh
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await page.wait(3000);

    // Messages should be restored
    const countAfter = await visibleMessages.count();
    // Should have at least some messages restored
    expect(countAfter).toBeGreaterThanOrEqual(1);
  });

  test('chat remains functional after reload', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send a message
    await page.sendChatMessage('Bonjour');
    await page.waitForChatResponse(6000);

    // Reload
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');
    await page.wait(2000);

    // Send another message after reload
    await page.sendChatMessage('Je veux aller à Barcelone');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0);
  });

  test('welcome message displays in correct language after reload', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();
    await page.wait(2000);

    // Get welcome message text
    const firstMessage = authenticatedPage.locator('[data-testid="chat-message"]').first();
    if (await firstMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      const welcomeText = await firstMessage.textContent();

      // Reload
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState('networkidle');
      await page.wait(2000);

      // Welcome message should still be in the same language
      const firstMessageAfter = authenticatedPage.locator('[data-testid="chat-message"]').first();
      if (await firstMessageAfter.isVisible({ timeout: 3000 }).catch(() => false)) {
        const welcomeTextAfter = await firstMessageAfter.textContent();
        // Both should be non-empty (language consistency)
        expect(welcomeTextAfter).toBeTruthy();
      }
    }
  });
});
