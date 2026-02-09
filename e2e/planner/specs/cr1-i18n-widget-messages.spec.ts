import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: CR1 — i18n Widget Messages
 *
 * Validates that all auto-generated widget messages (dates, travelers,
 * trip type, city selection) use i18n and respect the user's language.
 *
 * Anomaly covered: A1 (language mismatch)
 */

test.describe('CR1: i18n Widget Messages', () => {

  test.describe('French locale (default)', () => {

    test('date selection message is in French', async ({ authenticatedPage }) => {
      const page = new PlannerPage(authenticatedPage);
      await page.goto();

      // Interact with date picker widget
      await page.sendChatMessage('Je veux partir en vacances');
      await page.waitForChatResponse(6000);

      // After the bot responds and shows a date widget, simulate date selection
      await page.sendChatMessage('15 juin 2025');
      await page.waitForChatResponse(6000);

      // The auto-generated user message should be in French
      const lastMsg = await page.getLastChatMessage();
      // Should NOT contain English keywords like "I depart" or "I travel"
      expect(lastMsg).not.toMatch(/I depart|I travel|I return/i);
    });

    test('travelers message uses French labels', async ({ authenticatedPage }) => {
      const page = new PlannerPage(authenticatedPage);
      await page.goto();

      await page.sendChatMessage('Nous sommes 2 adultes et 1 enfant');
      await page.waitForChatResponse(6000);

      // The auto-generated message should use French labels
      const messages = await authenticatedPage.locator('[data-testid="chat-message"]').allTextContents();
      const allText = messages.join(' ');

      // Should contain French labels, not English
      expect(allText).not.toMatch(/\badults?\b(?!e)/i); // "adult" without "e" = English
    });

    test('trip type confirmation is in French', async ({ authenticatedPage }) => {
      const page = new PlannerPage(authenticatedPage);
      await page.goto();

      await page.sendChatMessage('Vol aller-retour Paris Tokyo');
      await page.waitForChatResponse(8000);

      const lastMsg = await page.getLastChatMessage();
      // Should NOT contain English trip type labels
      expect(lastMsg).not.toMatch(/\bround\s*trip\b|\bone[\s-]*way\b/i);
    });

    test('city selection message is in French', async ({ authenticatedPage }) => {
      const page = new PlannerPage(authenticatedPage);
      await page.goto();

      await page.sendChatMessage('Je veux aller à Tokyo au Japon');
      await page.waitForChatResponse(6000);

      const messages = await authenticatedPage.locator('[data-testid="chat-message"]').allTextContents();
      const allText = messages.join(' ');

      // Should NOT contain "I choose" (English)
      expect(allText).not.toMatch(/\bI choose\b/i);
    });
  });

  test.describe('English locale', () => {

    test('date messages should be in English when locale is EN', async ({ authenticatedPage }) => {
      const page = new PlannerPage(authenticatedPage);

      // Set English locale before navigating
      await authenticatedPage.evaluate(() => {
        localStorage.setItem('i18nextLng', 'en');
      });

      await page.goto();

      await page.sendChatMessage('I want to travel on June 15, 2025');
      await page.waitForChatResponse(6000);

      const messages = await authenticatedPage.locator('[data-testid="chat-message"]').allTextContents();
      const allText = messages.join(' ');

      // Should NOT contain French date-related keywords from hardcoded strings
      expect(allText).not.toMatch(/\bJe pars\b|\bJe reviens\b|\bNous sommes\b/);
    });

    test('travelers message in English', async ({ authenticatedPage }) => {
      const page = new PlannerPage(authenticatedPage);

      await authenticatedPage.evaluate(() => {
        localStorage.setItem('i18nextLng', 'en');
      });
      await page.goto();

      await page.sendChatMessage('We are 3 adults');
      await page.waitForChatResponse(6000);

      const messages = await authenticatedPage.locator('[data-testid="chat-message"]').allTextContents();
      const allText = messages.join(' ');

      // Should NOT contain French labels
      expect(allText).not.toMatch(/\badulte\b|\benfant\b|\bbébé\b/i);
    });
  });
});
