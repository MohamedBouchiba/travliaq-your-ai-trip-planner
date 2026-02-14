/**
 * buildLLMContext - Pure function that assembles the LLM context payload.
 *
 * Extracted from useChatSubmit to keep the hook focused on orchestration.
 * Gathers data from 9+ sources (flight memory, activities, preferences,
 * map, widgets, session, basket, cooldowns) into a single context object.
 */

import type { ChatMessage } from "../types";
import type { WidgetType } from "@/types/flight";
import { getSimplePhase, type TravelPhase } from "../services/phaseDetector";

// ─── Input shapes (match the interfaces from useChatSubmit) ───

interface PhaseSignalInputs {
  hasDestination: boolean;
  hasDates: boolean;
  hasTravelers: boolean;
  hasFlightResults: boolean;
  hasHotelResults: boolean;
}

interface ContextSources {
  messages: ChatMessage[];
  getActivityMemory: () => Record<string, unknown> | null;
  getPreferenceMemory: () => Record<string, unknown> | null;
  mapContext: { buildContextString: () => string };
  widgetTracking: {
    getActiveWidgetsContext: () => string;
    getContextForLLM: () => string;
  };
  widgetActionExecutor: {
    getPendingWidgets: () => Array<{
      type: WidgetType;
      messageId: string;
      options?: string[];
    }>;
  };
  getMemorySummary: () => string;
  missingFields: string[] | undefined;
  sessionContext: {
    buildConversationSummary: (n: number) => string;
    sessionEntities: Record<string, unknown>;
    widgetDecisions: unknown[];
  };
  getBasketSummary: () => string;
  widgetCooldown: { getBlockedWidgets: () => string[] };
  phaseSignals?: PhaseSignalInputs;
}

/**
 * Build the full context object sent to the LLM via streamResponse.
 *
 * Pure function - no React state, no side-effects.
 */
export function buildLLMContext(sources: ContextSources): Record<string, unknown> {
  const activityMemoryState = sources.getActivityMemory();
  const preferenceMemoryState = sources.getPreferenceMemory();
  const visualContext = sources.mapContext.buildContextString();

  // ── Activity context ──
  const activityContext =
    typeof activityMemoryState?.totalActivities === "number" &&
    (activityMemoryState.totalActivities as number) > 0
      ? `\n[ACTIVITÉS] ${activityMemoryState.totalActivities} activité(s) planifiée(s)`
      : "";

  // ── Preference context ──
  const preferenceContext = preferenceMemoryState
    ? `\n[PRÉFÉRENCES] Rythme: ${preferenceMemoryState.pace}, Style: ${preferenceMemoryState.travelStyle}, Confort: ${preferenceMemoryState.comfortLabel}, Intérêts: ${(preferenceMemoryState.interests as string[])?.join(", ") || ""}`
    : "";

  // ── Widget contexts ──
  const activeWidgetsContext = sources.widgetTracking.getActiveWidgetsContext();
  const pendingWidgets = sources.widgetActionExecutor.getPendingWidgets();

  // Detailed destination context from active destination suggestion widget
  let destinationDetailsContext = "";
  const destinationWidgetMessage = sources.messages.find(
    (m) =>
      m.widget === "destinationSuggestions" &&
      !m.widgetConfirmed &&
      m.widgetData?.suggestions,
  );
  if (destinationWidgetMessage?.widgetData?.suggestions) {
    const suggestions = destinationWidgetMessage.widgetData.suggestions as Array<{
      countryName: string;
      countryCode: string;
      headline?: string;
      description?: string;
      matchScore?: number;
      highlights?: string[];
      budgetRange?: string;
    }>;
    destinationDetailsContext = `[DESTINATIONS PROPOSÉES - CHOISIS PARMI CELLES-CI]\n${suggestions
      .map(
        (d, i) =>
          `${i + 1}. **${d.countryName}** (${d.countryCode})${d.matchScore ? ` - ${d.matchScore}% match` : ""}\n` +
          `   Titre: ${d.headline || "Non spécifié"}\n` +
          `   Description: ${d.description || "Non spécifié"}\n` +
          `   Points forts: ${d.highlights?.join(", ") || "Non spécifié"}\n` +
          `   Budget: ${d.budgetRange || "Non spécifié"}`,
      )
      .join("\n\n")}`;
  }

  const pendingWidgetsContext =
    pendingWidgets.length > 0
      ? pendingWidgets
          .map((w) =>
            w.options
              ? `- Widget "${w.type}" avec options: ${w.options.join(", ")}`
              : `- Widget "${w.type}" en attente`,
          )
          .join("\n")
      : "";

  const userPrefsForChoice = preferenceMemoryState
    ? `\n[PRÉFÉRENCES UTILISATEUR POUR LE CHOIX]\n` +
      `- Style: ${preferenceMemoryState.travelStyle || "non défini"}\n` +
      `- Rythme: ${preferenceMemoryState.pace || "non défini"}\n` +
      `- Intérêts: ${(preferenceMemoryState.interests as string[])?.join(", ") || "non définis"}\n` +
      `- Niveau confort: ${preferenceMemoryState.comfortLabel || "non défini"}`
    : "";

  const combinedWidgetContext = [
    destinationDetailsContext,
    userPrefsForChoice,
    activeWidgetsContext,
    pendingWidgetsContext
      ? `[OPTIONS WIDGETS ACTIFS]\n${pendingWidgetsContext}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  // ── Preferences state for the LLM ──
  const preferencesState = {
    interests: Array.isArray(preferenceMemoryState?.interests)
      ? (preferenceMemoryState.interests as string[])
      : [],
    style:
      typeof preferenceMemoryState?.travelStyle === "string"
        ? preferenceMemoryState.travelStyle
        : null,
    pace:
      typeof preferenceMemoryState?.pace === "string"
        ? preferenceMemoryState.pace
        : null,
    styleAxesConfigured: (() => {
      const axes = preferenceMemoryState?.styleAxes as
        | {
            chillVsIntense: number;
            cityVsNature: number;
            ecoVsLuxury: number;
            touristVsLocal: number;
          }
        | undefined;
      if (!axes) return false;
      return (
        axes.chillVsIntense !== 50 ||
        axes.cityVsNature !== 50 ||
        axes.ecoVsLuxury !== 50 ||
        axes.touristVsLocal !== 50
      );
    })(),
  };

  // ── Phase detection ──
  let currentPhase: TravelPhase | undefined;
  if (sources.phaseSignals) {
    const s = sources.phaseSignals;
    // C5: Removed askedForInspiration regex — it matched common words like "propose"/"suggère"
    // and kept the phase stuck at "inspiration" even after destination was selected
    currentPhase = getSimplePhase(s.hasDestination, s.hasDates, s.hasTravelers, s.hasFlightResults, s.hasHotelResults);
  }

  return {
    flightSummary: sources.getMemorySummary(),
    activityContext:
      activityContext + (visualContext ? `\n${visualContext}` : ""),
    preferenceContext,
    missingFields: sources.missingFields,
    widgetHistory: sources.widgetTracking.getContextForLLM(),
    activeWidgetsContext: combinedWidgetContext,
    conversationSummary: sources.sessionContext.buildConversationSummary(5),
    sessionEntities: sources.sessionContext.sessionEntities,
    widgetDecisions: sources.sessionContext.widgetDecisions,
    basketSummary: sources.getBasketSummary(),
    blockedWidgets: sources.widgetCooldown.getBlockedWidgets(),
    preferencesState,
    currentPhase,
  };
}
