import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Preference-First Workflow
 *
 * Validates the preference-first logic works correctly:
 * - Style → Interests → Destinations order is respected
 * - BUT conversational intents are never blocked
 * - AND specific widget requests are honored
 */

test.describe('Preference-First Workflow', () => {

  test('indecisive user gets guided through style → interests → destinations', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Vague request — should trigger style first
    await page.sendChatMessage('Je ne sais pas où aller, aide-moi');
    await page.waitForChatResponse(8000);

    let lastMsg = await page.getLastChatMessage();
    // Should ask about preferences/style, NOT jump to destinations
    expect(lastMsg.toLowerCase()).toMatch(
      /style|préférence|goût|type.*voyage|ambiance|rythme|interest|preference/i
    );
  });

  test('decisive user with destination skips preference phase', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // User already knows what they want
    await page.sendChatMessage('Je veux aller au Japon en avril, 2 personnes');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    const msgLower = lastMsg.toLowerCase();

    // Should acknowledge Japan, not force style widget
    expect(msgLower).toMatch(/japon|japan/i);
  });

  test('preference-first does NOT block "question" intents', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Ask a question before any preferences are set
    await page.sendChatMessage('Quels sont les meilleurs mois pour visiter la Thaïlande ?');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    const msgLower = lastMsg.toLowerCase();

    // Should answer the question, not redirect to preference widget
    expect(msgLower).toMatch(/thaïlande|thailand|mois|month|saison|season|climat|weather/i);
  });

  test('preference-first does NOT block "cancel" or "restart" intents', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('Je veux recommencer à zéro');
    await page.waitForChatResponse(6000);

    const lastMsg = await page.getLastChatMessage();

    // Should acknowledge restart, not force a widget
    expect(lastMsg.length).toBeGreaterThan(10);
    expect(lastMsg.toLowerCase()).toMatch(
      /recommenc|restart|nouveau|new|reset|zéro|début|begin/i
    );
  });
});
