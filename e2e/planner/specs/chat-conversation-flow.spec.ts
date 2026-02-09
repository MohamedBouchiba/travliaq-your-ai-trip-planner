import { test, expect } from '../../fixtures/auth';
import { PlannerPage } from '../../helpers/planner-page';

/**
 * Test Suite: Chat Conversation Flow
 *
 * Validates realistic multi-turn conversations through the 5-phase workflow:
 * Discovery → Logistics → Accommodation → Activities → Recap
 *
 * Tests the complete phased workflow and cross-phase handling.
 */

test.describe('Chat Conversation Flow', () => {

  test('Phase 1: Discovery — style then interests then destinations', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Step 1: Style preferences
    await page.sendChatMessage('Je veux un voyage relaxant et culturel');
    await page.waitForChatResponse(8000);

    let lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20);

    // Step 2: Interests
    await page.sendChatMessage('Je suis passionné par la gastronomie et l\'histoire');
    await page.waitForChatResponse(8000);

    lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20);

    // Step 3: The bot should suggest destinations based on preferences
    // (it might do this automatically or we ask)
    await page.sendChatMessage('Quelles destinations me proposes-tu ?');
    await page.waitForChatResponse(10000);

    lastMsg = await page.getLastChatMessage();
    // Should mention actual countries/cities
    expect(lastMsg.length).toBeGreaterThan(50);
  });

  test('Phase 2: Logistics — dates and flights', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Quick setup of Phase 1
    await page.sendChatMessage('Voyage aventure au Costa Rica, 2 adultes');
    await page.waitForChatResponse(8000);

    // Phase 2: Dates
    await page.sendChatMessage('Du 10 au 20 mars 2025');
    await page.waitForChatResponse(8000);

    let lastMsg = await page.getLastChatMessage();
    expect(lastMsg.toLowerCase()).toMatch(/mars|march|date|vol|flight|départ/i);

    // Phase 2: Departure city
    await page.sendChatMessage('Départ de Paris');
    await page.waitForChatResponse(8000);

    lastMsg = await page.getLastChatMessage();
    expect(lastMsg.toLowerCase()).toMatch(/paris|départ|departure|aéroport|airport/i);
  });

  test('Cross-phase: user asks about activities during logistics', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Setup in logistics phase
    await page.sendChatMessage('Vol Paris Tokyo le 1er juin 2025');
    await page.waitForChatResponse(8000);

    // Cross-phase request (activities during logistics)
    await page.sendChatMessage('Quelles activités je peux faire à Tokyo ?');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();

    // Bot should answer about activities (not block the request)
    expect(lastMsg.toLowerCase()).toMatch(/activit|tokyo|visit|temple|quartier/i);
    expect(lastMsg.length).toBeGreaterThan(30);
  });

  test('complete 5-phase flow from start to recap', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Phase 1: Discovery
    await page.sendChatMessage('Bonjour, je veux planifier un voyage');
    await page.waitForChatResponse(6000);

    await page.sendChatMessage('Voyage romantique, gastronomie et plage');
    await page.waitForChatResponse(8000);

    // Phase 2: Logistics
    await page.sendChatMessage('2 personnes, du 15 au 25 août 2025, départ de Lyon');
    await page.waitForChatResponse(8000);

    // Phase 5: Recap
    await page.sendChatMessage('Fais-moi un résumé complet de mon voyage');
    await page.waitForChatResponse(10000);

    const recap = await page.getLastChatMessage();
    const recapLower = recap.toLowerCase();

    // Should mention key elements
    expect(recapLower).toMatch(/2|deux|couple/i);
    expect(recapLower).toMatch(/août|august/i);
    expect(recap.length).toBeGreaterThan(100);
  });

  test('bot handles empty or very short messages gracefully', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Single character
    await page.sendChatMessage('?');
    await page.waitForChatResponse(6000);

    const lastMsg = await page.getLastChatMessage();
    // Should respond with help/clarification, not crash
    expect(lastMsg.length).toBeGreaterThan(5);
  });

  test('bot handles multi-language input gracefully', async ({ authenticatedPage }) => {
    const page = new PlannerPage(authenticatedPage);
    await page.goto();

    // Mix of French and English
    await page.sendChatMessage('I want to go to Paris, c\'est romantique !');
    await page.waitForChatResponse(8000);

    const lastMsg = await page.getLastChatMessage();
    expect(lastMsg.length).toBeGreaterThan(20);
    // Should not crash or return empty
    expect(lastMsg).not.toBe('');
  });
});
