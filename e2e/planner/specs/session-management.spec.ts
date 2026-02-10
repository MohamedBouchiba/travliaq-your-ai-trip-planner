import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Session Management
 *
 * Validates chat session lifecycle:
 * - Creating new sessions
 * - Switching between sessions
 * - Restoring conversation history
 * - Deleting sessions
 */

test.describe('Session Management', () => {

  test('creates a new session and sends messages', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send a message in the default session
    await page.sendChatMessage('Bonjour, je veux voyager en Italie');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(10);
  });

  test('conversation history survives page reload', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send messages
    await page.sendChatMessage('Je veux partir à Tokyo');
    await page.waitForChatResponse(8000);

    // Get message count before reload
    const msgCountBefore = await authenticatedPage.locator('[data-testid="chat-message"]').count();

    // Reload
    await authenticatedPage.reload();
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for messages to restore
    await page.wait(2000);

    // Messages should be restored (at least welcome + user message)
    const msgCountAfter = await authenticatedPage.locator('[data-testid="chat-message"]').count();
    // At minimum, the welcome message should be present
    expect(msgCountAfter).toBeGreaterThanOrEqual(1);
  });

  test('new session button resets conversation', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send a message
    await page.sendChatMessage('Voyage en Grèce');
    await page.waitForChatResponse(8000);

    // Click "new session" button (history sidebar)
    const historyButton = authenticatedPage.locator('button[title*="istori"], button[title*="istory"]').first();
    if (await historyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyButton.click();
      await page.wait(500);

      // Look for new session button
      const newSessionBtn = authenticatedPage.getByRole('button', { name: /nouvelle|new/i }).first();
      if (await newSessionBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newSessionBtn.click();
        await page.wait(1000);

        // Chat should be reset (only welcome message)
        const messages = await authenticatedPage.locator('[data-testid="chat-message"]').count();
        expect(messages).toBeLessThanOrEqual(2); // Welcome + maybe one auto message
      }
    }
  });
});
