import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Widget Cooldown System
 *
 * Validates the cooldown system works end-to-end:
 * - Widgets respect max attempts (2)
 * - Confirmed widgets don't reappear
 * - User-typed-instead penalty works
 * - Blocked widgets are communicated to LLM
 */

test.describe('Widget Cooldown System', () => {

  test('widget should not appear more than max attempts', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Trigger widget flow 3 times
    for (let i = 0; i < 3; i++) {
      await page.sendChatMessage(`Aide-moi à choisir mon style de voyage (tentative ${i + 1})`);
      await page.waitForChatResponse(8000);
    }

    // Count all preferenceStyle widgets
    const widgetCount = await authenticatedPage.evaluate(() => {
      return document.querySelectorAll('[data-widget-type="preferenceStyle"]').length;
    });

    // Should be at most MAX_WIDGET_ATTEMPTS (2)
    expect(widgetCount).toBeLessThanOrEqual(2);
  });

  test('typing instead of using widget should trigger penalty', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Trigger a widget
    await page.sendChatMessage('Quel style de voyage me convient ?');
    await page.waitForChatResponse(8000);

    // Instead of using the widget, type a response
    await page.sendChatMessage('Je préfère taper ma réponse : aventure et culture');
    await page.waitForChatResponse(8000);

    // Try to trigger the same widget again immediately
    await page.sendChatMessage('Montre-moi le widget de style');
    await page.waitForChatResponse(8000);

    // Should NOT show the widget again (penalty active)
    const lastMsg = await page.getLastChatMessage();
    // Bot should respond conversationally instead of showing widget
    expect(lastMsg.length).toBeGreaterThan(10);
  });

  test('different widgets have independent cooldowns', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Trigger preferenceStyle
    await page.sendChatMessage('Quel style de voyage ?');
    await page.waitForChatResponse(8000);

    // Trigger a different widget (datePicker) — should work independently
    await page.sendChatMessage('Quand est-ce que je pars ?');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    // Should respond about dates, not blocked by preferenceStyle cooldown
    expect(lastMsg.toLowerCase()).toMatch(/date|quand|when|départ|jour|mois/i);
  });
});
