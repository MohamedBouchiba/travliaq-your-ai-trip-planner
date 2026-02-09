import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: CR4 — Contextual Classification
 *
 * Validates that the intent classifier receives conversation history
 * (last 4 messages) to properly disambiguate inputs.
 *
 * Anomalies covered: A6 (greeting -> destinationSuggestions),
 *                    A9 (Valentine's -> datePicker instead of style),
 *                    A12 (travelers not extracted from semantic clues),
 *                    A13 (recommendations classified "other")
 * Also covers CR6: number disambiguation
 */

test.describe('CR4: Contextual Classification', () => {

  test('A9: "Valentine\'s trip" should be treated as style/mood, not date', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage("I want to plan a Valentine's trip");
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();

    // Should reference romance/couple, not immediately show a date picker
    expect(lastMsg.toLowerCase()).toMatch(
      /romantic|couple|saint.valentin|valentin|romance|amour|love|getaway/i
    );
  });

  test('A12: "with my husband" should imply 2 adults', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    await page.sendChatMessage('I want to travel with my husband');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();

    // The bot should recognize this implies 2 adults
    // Either ask to confirm 2 travelers or set it directly
    expect(lastMsg.toLowerCase()).toMatch(
      /2|deux|couple|husband|mari|together|ensemble|voyageur/i
    );
  });

  test('A13: "Give me 3 recommendations" should not be classified as "other"', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Set up context first
    await page.sendChatMessage('Je veux un voyage culturel en Asie');
    await page.waitForChatResponse(8000);

    // Now ask for recommendations (with context)
    await page.sendChatMessage('Donne-moi 3 recommandations');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();

    // Should provide actual recommendations, not a generic "I don't understand"
    expect(lastMsg.length).toBeGreaterThan(50);
  });

  test('CR6: number "2" after a numbered list should be a selection, not travelers', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Get bot to present a numbered list
    await page.sendChatMessage('Propose-moi 3 destinations en Europe');
    await page.waitForChatResponse(10000);

    const botResponse = await page.getLastChatMessage();

    // If bot gave a numbered list, selecting "2" should pick option 2
    if (botResponse.match(/1\.|2\.|3\./)) {
      await page.sendChatMessage('2');
      await page.waitForChatResponse(8000);

      const selectionResponse = await page.getLastChatMessage();

      // Should NOT ask "How many travelers?" — should confirm a selection
      expect(selectionResponse.toLowerCase()).not.toMatch(
        /combien.*voyageur|how many.*traveler|nombre.*personne/i
      );
    }
  });

  test('contextual follow-up should be understood', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Multi-turn conversation
    await page.sendChatMessage('Je veux partir en Italie');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('En juin');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();

    // "En juin" should be understood as a date in context of the trip
    expect(lastMsg.toLowerCase()).toMatch(
      /juin|june|date|départ|quand|when|voyage|trip/i
    );
  });

  test('A7: entities should accumulate across conversation', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Provide info incrementally
    await page.sendChatMessage('Je veux aller au Japon');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('En septembre');
    await page.waitForChatResponse(8000);

    await page.sendChatMessage('Nous serons 2');
    await page.waitForChatResponse(8000);

    // Ask for summary — bot should know all the pieces
    await page.sendChatMessage('Récapitule ce que tu sais');
    await page.waitForChatResponse(8000);

    const summary = await page.getLastChatMessage();
    const summaryLower = summary.toLowerCase();

    // Should mention accumulated entities
    expect(summaryLower).toMatch(/japon|japan/i);
    expect(summaryLower).toMatch(/septembre|september|sept/i);
    expect(summaryLower).toMatch(/2|deux|two/i);
  });
});
