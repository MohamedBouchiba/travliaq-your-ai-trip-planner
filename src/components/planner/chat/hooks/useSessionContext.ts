/**
 * useSessionContext - Hook for building enriched session context for LLM
 *
 * Provides:
 * - Conversation summary from recent messages
 * - Cumulative session entities (destinations, dates, budgets)
 * - Widget decisions history
 */

import { useMemo, useCallback } from "react";
import type { ChatMessage } from "../types";
import type { WidgetInteraction } from "@/contexts/WidgetHistoryContext";
import type { SessionEntities, WidgetDecision } from "./useChatStream";

interface UseSessionContextOptions {
  messages: ChatMessage[];
  widgetInteractions: WidgetInteraction[];
}

interface UseSessionContextReturn {
  /** Build conversation summary from last N messages */
  buildConversationSummary: (maxMessages?: number) => string;
  /** Extract session entities from messages and interactions */
  sessionEntities: SessionEntities;
  /** Get widget decisions from interactions */
  widgetDecisions: WidgetDecision[];
  /** Get full enriched context string */
  getEnrichedContext: () => string;
}

/**
 * Regex patterns for entity extraction
 */
/**
 * Reject filter: candidates matching these words are NOT destinations
 */
const DESTINATION_REJECT = /\b(cher|chere|chère|chères|chers|cheap|budget|moins|plus|pas|possible|affordable|luxe|luxury|prix|price|economique|économique)\b/i;

const ENTITY_PATTERNS = {
  // Destinations: cities, countries
  // NOTE: flag `g` only (not `gi`) — case-sensitive [A-ZÀ-Ü] ensures we only match capitalized words (proper nouns)
  destinations: [
    /(?:aller|partir|voyager|visiter)\s+(?:[àa]|en|au|aux)?\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/g,
    /([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)\s+(?:comme destination|m'int[ée]resse)/g,
    // Departure city patterns (FR) - tolerant to missing accents
    /[àa]\s+partir\s+de\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/g,
    /(?:au d[ée]part de|je pars de)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/g,
    /depuis\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/g,
    // EN patterns
    /(?:to|from|in)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/g,
  ],
  // Dates: months, specific dates, durations
  dates: [
    /(?:en|au mois de|pour)\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/gi,
    /(?:du|le)?\s*(\d{1,2})\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/gi,
    /(printemps|été|automne|hiver)/gi,
    // Duration patterns (FR + EN)
    /(\d+)\s*jours?/gi,
    /(\d+)\s*semaines?/gi,
    /(\d+)\s*nuits?/gi,
    /(\d+)\s*days?/gi,
    /(\d+)\s*weeks?/gi,
  ],
  // Budgets: amounts, ranges, qualitative
  budgets: [
    /(\d+(?:\s*[–-]\s*\d+)?)\s*(?:€|euros?|EUR)/gi,
    /budget\s+(?:de\s+)?(\d+(?:\s*[–-]\s*\d+)?)/gi,
    /(petit budget|budget moyen|budget élevé|luxe|économique)/gi,
    /(?:le |la )?(moins cher(?:s|e)?|pas cher|budget serré|bon marché)/gi,
    /(?:the )?(cheapest|budget-friendly|low[- ]?cost|affordable)/gi,
    /[$£]\s*(\d[\d\s]*\d)/gi,
    /(\d[\d\s]*\d?)\s*(?:\$|dollars?|£|pounds?)/gi,
  ],
  // Constraints: requirements
  constraints: [
    /(?:je veux|il me faut|j'ai besoin de|obligatoire|impératif)\s*:?\s*([^.!?]+)/gi,
    /(?:accessibilité|PMR|animaux|enfants|wifi)/gi,
  ],
};

/**
 * Extract unique matches from text using patterns
 */
/**
 * Extract unique matches from text using patterns
 * @param rejectFilter - optional regex to reject false-positive matches
 */
function extractEntities(text: string, patterns: RegExp[], minLength = 3, rejectFilter?: RegExp): string[] {
  const matches = new Set<string>();
  for (const pattern of patterns) {
    // Reset regex state
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Use full match (match[0]) to preserve context like "2 jours"
      const value = match[1] || match[0];
      if (value && value.trim().length >= minLength) {
        // Apply reject filter if provided (e.g. budget words for destinations)
        if (rejectFilter && rejectFilter.test(value)) {
          continue;
        }
        matches.add(value.trim());
      }
    }
  }
  return Array.from(matches);
}

export function useSessionContext({
  messages,
  widgetInteractions,
}: UseSessionContextOptions): UseSessionContextReturn {
  /**
   * Build conversation summary from last N messages
   */
  const buildConversationSummary = useCallback(
    (maxMessages = 10): string => {
      const recentMessages = messages
        .filter((m) => !m.isTyping && m.text && m.text.trim().length > 0)
        .slice(-maxMessages);

      if (recentMessages.length === 0) {
        return "";
      }

      const summaryParts: string[] = [];

      // Group by user/assistant for better readability
      for (const msg of recentMessages) {
        const prefix = msg.role === "user" ? "Utilisateur" : "Assistant";
        // Truncate long messages
        const text =
          msg.text.length > 150
            ? msg.text.slice(0, 147) + "..."
            : msg.text;
        summaryParts.push(`${prefix}: ${text}`);
      }

      return `[RÉSUMÉ CONVERSATION]\n${summaryParts.join("\n")}`;
    },
    [messages]
  );

  /**
   * Extract session entities from all messages
   */
  const sessionEntities = useMemo<SessionEntities>(() => {
    // Extract entities per-message to avoid cross-boundary regex matches
    const userMessages = messages.filter((m) => m.role === "user" && m.text);

    const destinationsSet = new Set<string>();
    const datesSet = new Set<string>();
    const budgetsSet = new Set<string>();
    const constraintsSet = new Set<string>();

    for (const msg of userMessages) {
      for (const d of extractEntities(msg.text, ENTITY_PATTERNS.destinations, 3, DESTINATION_REJECT)) destinationsSet.add(d);
      for (const d of extractEntities(msg.text, ENTITY_PATTERNS.dates, 1)) datesSet.add(d);
      for (const b of extractEntities(msg.text, ENTITY_PATTERNS.budgets)) budgetsSet.add(b);
      for (const c of extractEntities(msg.text, ENTITY_PATTERNS.constraints)) constraintsSet.add(c);
    }

    const destinations = Array.from(destinationsSet);
    const dates = Array.from(datesSet);
    const budgets = Array.from(budgetsSet);
    const constraints = Array.from(constraintsSet);

    // Also extract from widget interactions
    for (const interaction of widgetInteractions) {
      if (interaction.interactionType === "destination_selected") {
        const dest = interaction.data?.destinationName as string;
        if (dest && !destinations.includes(dest)) {
          destinations.push(dest);
        }
      }
      if (interaction.interactionType === "city_selected") {
        const city = interaction.data?.cityName as string;
        if (city && !destinations.includes(city)) {
          destinations.push(city);
        }
      }
      if (
        interaction.interactionType === "date_selected" ||
        interaction.interactionType === "date_range_selected"
      ) {
        const dateStr = interaction.summary;
        if (dateStr && !dates.includes(dateStr)) {
          dates.push(dateStr);
        }
      }
    }

    return {
      destinations: destinations.slice(0, 10), // Limit to 10
      dates: dates.slice(0, 5),
      budgets: budgets.slice(0, 3),
      constraints: constraints.slice(0, 5),
    };
  }, [messages, widgetInteractions]);

  /**
   * Convert widget interactions to decisions
   */
  const widgetDecisions = useMemo<WidgetDecision[]>(() => {
    return widgetInteractions
      .filter((i) =>
        [
          "date_selected",
          "date_range_selected",
          "travelers_selected",
          "trip_type_selected",
          "city_selected",
          "destination_selected",
          "style_configured",
          "interests_selected",
        ].includes(i.interactionType)
      )
      .map((i) => ({
        widgetType: i.widgetType,
        chosen: i.summary,
        timestamp: i.timestamp,
      }))
      .slice(-10); // Last 10 decisions
  }, [widgetInteractions]);

  /**
   * Get full enriched context string
   */
  const getEnrichedContext = useCallback((): string => {
    const parts: string[] = [];

    // Conversation summary (last 5 messages for brevity)
    const summary = buildConversationSummary(5);
    if (summary) {
      parts.push(summary);
    }

    // Session entities
    const { destinations, dates, budgets, constraints } = sessionEntities;
    if (destinations.length > 0 || dates.length > 0 || budgets.length > 0) {
      const entityLines: string[] = [];
      if (destinations.length > 0) {
        entityLines.push(`- Destinations mentionnées: ${destinations.join(", ")}`);
      }
      if (dates.length > 0) {
        entityLines.push(`- Dates mentionnées: ${dates.join(", ")}`);
      }
      if (budgets.length > 0) {
        entityLines.push(`- Budgets mentionnés: ${budgets.join(", ")}`);
      }
      if (constraints.length > 0) {
        entityLines.push(`- Contraintes: ${constraints.join(", ")}`);
      }
      parts.push(`[ENTITÉS SESSION]\n${entityLines.join("\n")}`);
    }

    // Widget decisions
    if (widgetDecisions.length > 0) {
      const decisionLines = widgetDecisions.map((d) => `- ${d.chosen}`);
      parts.push(`[CHOIX VIA WIDGETS]\n${decisionLines.join("\n")}`);
    }

    return parts.join("\n\n");
  }, [buildConversationSummary, sessionEntities, widgetDecisions]);

  return {
    buildConversationSummary,
    sessionEntities,
    widgetDecisions,
    getEnrichedContext,
  };
}

export default useSessionContext;
