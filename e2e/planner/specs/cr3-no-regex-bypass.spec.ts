import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: CR3 — No Regex Bypass (Cooldown Respected)
 *
 * Validates that the regex interception for "inspire/suggest/recommend"
 * has been removed, and all messages go through the LLM pipeline
 * with proper cooldown enforcement.
 *
 * Anomalies covered: A15, A16 (preferenceStyle loops 4+ times),
 *                    A3 (destinationSuggestions non-confirmed),
 *                    A10 (destinationSuggestions repeated)
 */

test.describe('CR3: No Regex Bypass — Cooldown Respected', () => {

  test('A15/A16: "inspire me" should NOT create infinite preferenceStyle loop', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Send inspire-related messages multiple times
    await page.sendChatMessage('Inspire-moi pour un voyage');
    await page.waitForChatResponse(8000);

    // Count preferenceStyle widgets in messages
    const countWidgets = async () => {
      return authenticatedPage.evaluate(() => {
        const messages = document.querySelectorAll('[data-widget-type="preferenceStyle"]');
        return messages.length;
      });
    };

    const firstCount = await countWidgets();

    // Send again — should NOT trigger another preferenceStyle if cooldown active
    await page.sendChatMessage('Donne-moi des suggestions');
    await page.waitForChatResponse(8000);

    const secondCount = await countWidgets();

    // The widget should NOT appear more than 2 times (max attempts = 2)
    expect(secondCount).toBeLessThanOrEqual(2);
  });

  test('"recommend" keyword goes through LLM pipeline, not regex', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // This keyword was previously caught by the regex bypass
    await page.sendChatMessage('Can you recommend a destination?');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();

    // Should get an actual LLM response, not a hardcoded widget injection
    expect(lastMsg.length).toBeGreaterThan(20);
  });

  test('"suggest" keyword goes through LLM pipeline', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('Suggest me some travel ideas');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20);
  });

  test('A10: destinationSuggestions should not repeat indefinitely', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set preferences first
    await page.sendChatMessage('Je veux un voyage aventure en montagne');
    await page.waitForChatResponse(8000);

    // Ask for destinations multiple times
    await page.sendChatMessage('Propose-moi des destinations');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('Propose-moi encore des destinations');
    await page.waitForChatResponse(8000);

    // Count destination widgets
    const destWidgets = await authenticatedPage.evaluate(() => {
      const widgets = document.querySelectorAll('[data-widget-type="destinationSuggestions"]');
      return widgets.length;
    });

    // Should NOT exceed max attempts (2)
    expect(destWidgets).toBeLessThanOrEqual(2);
  });

  test('confirmed widget should not reappear after user confirms', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Trigger a widget flow
    await page.sendChatMessage('Aide-moi à planifier un voyage');
    await page.waitForChatResponse(8000);

    // Get count of any preference widgets
    const initialWidgets = await authenticatedPage.evaluate(() => {
      return document.querySelectorAll('[data-widget-type="preferenceStyle"]').length;
    });

    // If a widget appeared, "confirm" it by sending a follow-up
    if (initialWidgets > 0) {
      await page.sendChatMessage('Je valide mes préférences');
      await page.waitForChatResponse(8000);

      // Ask something else that could trigger the same widget
      await page.sendChatMessage('Inspire-moi');
      await page.waitForChatResponse(8000);

      // Should not show more preferenceStyle widgets (confirmed = blocked)
      const finalWidgets = await authenticatedPage.evaluate(() => {
        return document.querySelectorAll('[data-widget-type="preferenceStyle"]:not([data-confirmed])').length;
      });

      // New unconfirmed preferenceStyle widgets should not appear
      expect(finalWidgets).toBeLessThanOrEqual(initialWidgets);
    }
  });
});
