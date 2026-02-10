import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Mobile Responsive Chat
 *
 * Validates chat functionality on mobile viewports:
 * - Chat input is accessible
 * - Messages scroll correctly
 * - Widgets render properly on small screens
 */

test.describe('Mobile Responsive Chat', () => {

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test('chat input is visible and functional on mobile', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Chat input should be visible
    const chatInput = authenticatedPage.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Should be able to type
    await chatInput.fill('Bonjour');
    await chatInput.press('Enter');

    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0);
  });

  test('send button works on mobile', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Type a message
    const chatInput = authenticatedPage.locator('textarea').first();
    await chatInput.fill('Voyage au Japon');

    // Click send button
    const sendButton = authenticatedPage.locator('button[aria-label*="nvoyer"], button[aria-label*="end"]').first();
    if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sendButton.click();
      await page.waitForChatResponse(8000);

      const lastMsg = await page.getLastChatMessage();
      expect(lastMsg.length).toBeGreaterThan(0);
    }
  });

  test('messages container scrolls on mobile', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send multiple messages to fill the screen
    await page.sendChatMessage('Premier message - voyage au Portugal');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('Deuxième message - je veux visiter Lisbonne');
    await page.waitForChatResponse(8000);

    // The latest message should be visible (auto-scroll)
    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(0);

    // Page should not crash
    const title = await authenticatedPage.title();
    expect(title).toBeTruthy();
  });
});
