/**
 * Test Suite Registry
 * 
 * Central file that defines all categories and their test modules.
 * Each category is registered with metadata and a register function.
 */

import { clearTests, type CategoryInfo } from "@/lib/browser-test-runner";
export type { CategoryInfo };

// ─── Category Definitions ───

export const TEST_CATEGORIES: CategoryInfo[] = [
  {
    id: "validators",
    label: "Validators",
    emoji: "✅",
    description: "Validation des dates, nombres, chaînes, emails, voyageurs",
  },
  {
    id: "security",
    label: "Sécurité",
    emoji: "🔒",
    description: "Échappement HTML, sanitisation, JSON sécurisé",
  },
  {
    id: "parseAction",
    label: "Parse Action",
    emoji: "🎯",
    description: "Extraction d'actions depuis les réponses LLM",
  },
  {
    id: "intentRouter",
    label: "Intent Router",
    emoji: "🧠",
    description: "Classification d'intentions, flow state, phase transitions",
  },
  {
    id: "flightMemory",
    label: "Flight Memory",
    emoji: "✈️",
    description: "Conversion flight data, merge airport info, multi-legs",
  },
  {
    id: "entityPipeline",
    label: "Entity Pipeline",
    emoji: "🔗",
    description: "Extraction et persistance unifiée des entités",
  },
  {
    id: "destinationPayload",
    label: "Destination Payload",
    emoji: "🌍",
    description: "Construction du payload de suggestions de destinations",
  },
  {
    id: "eventBus",
    label: "Event Bus",
    emoji: "📡",
    description: "Communication inter-composants, émission et écoute d'événements",
  },
  // ─── Chat-Specific Categories ───
  {
    id: "messageAnalyzer",
    label: "Message Analyzer",
    emoji: "💬",
    description: "Analyse des messages assistant/user, détection d'intent, langue",
  },
  {
    id: "suggestionEngine",
    label: "Suggestion Engine",
    emoji: "💡",
    description: "Suggestions contextuelles, workflow step, anticipated chips",
  },
  {
    id: "chatTypes",
    label: "Chat Types",
    emoji: "📝",
    description: "parsePreferredMonth, getCityCoords, MONTH_MAP, CITY_COORDINATES",
  },
  {
    id: "widgetCooldown",
    label: "Widget Cooldown",
    emoji: "⏱️",
    description: "Anti-loop cooldown, max attempts, user-typed penalty, block reasons",
  },
  {
    id: "phaseDetector",
    label: "Phase Detector",
    emoji: "🔍",
    description: "Détection de phase voyage : inspiration, research, comparison, booking",
  },
  {
    id: "filterParser",
    label: "Filter Parser",
    emoji: "🔎",
    description: "Parsing NL de filtres : prix, durée, étoiles, amenities, classe",
  },
  {
    id: "chatCoherence",
    label: "Chat Coherence",
    emoji: "🔗",
    description: "Cohérence linguistique, flow multi-étapes, suggestions contextuelles, phases",
  },
  {
    id: "chatConversationSim",
    label: "Chat Conversation Sim",
    emoji: "🎭",
    description: "Simulations de conversations réelles multi-tours avec validation pipeline complète",
  },
  {
    id: "chatAdvancedSim",
    label: "Chat Advanced Sim",
    emoji: "🚀",
    description: "Tests avancés : widgets, mémoire, filtres, boosting, conflits, UX fluide",
  },
  {
    id: "chatJourneysSim",
    label: "Chat Journeys Sim",
    emoji: "🗺️",
    description: "Parcours utilisateur longs et réalistes : mémoire, phases, widgets, suggestions, qualité UX",
  },
  {
    id: "sessionEntities",
    label: "Session Entities",
    emoji: "🏷️",
    description: "Extraction d'entités (destinations, durées, budgets) et nettoyage du debug store",
  },
];

// ─── Registration ───

export async function registerAllBrowserTests(categories?: string[]) {
  clearTests();

  const all = !categories || categories.length === 0;

  if (all || categories?.includes("validators")) {
    const { registerValidatorTests } = await import("./suites/validators.suite");
    registerValidatorTests();
  }
  if (all || categories?.includes("security")) {
    const { registerSecurityTests } = await import("./suites/security.suite");
    registerSecurityTests();
  }
  if (all || categories?.includes("parseAction")) {
    const { registerParseActionTests } = await import("./suites/parseAction.suite");
    registerParseActionTests();
  }
  if (all || categories?.includes("intentRouter")) {
    const { registerIntentRouterTests } = await import("./suites/intentRouter.suite");
    registerIntentRouterTests();
  }
  if (all || categories?.includes("flightMemory")) {
    const { registerFlightMemoryTests } = await import("./suites/flightMemory.suite");
    registerFlightMemoryTests();
  }
  if (all || categories?.includes("entityPipeline")) {
    const { registerEntityPipelineTests } = await import("./suites/entityPipeline.suite");
    registerEntityPipelineTests();
  }
  if (all || categories?.includes("destinationPayload")) {
    const { registerDestinationPayloadTests } = await import("./suites/destinationPayload.suite");
    registerDestinationPayloadTests();
  }
  if (all || categories?.includes("eventBus")) {
    const { registerEventBusTests } = await import("./suites/eventBus.suite");
    registerEventBusTests();
  }
  // ─── Chat-Specific Suites ───
  if (all || categories?.includes("messageAnalyzer")) {
    const { registerMessageAnalyzerTests } = await import("./suites/messageAnalyzer.suite");
    registerMessageAnalyzerTests();
  }
  if (all || categories?.includes("suggestionEngine")) {
    const { registerSuggestionEngineTests } = await import("./suites/suggestionEngine.suite");
    registerSuggestionEngineTests();
  }
  if (all || categories?.includes("chatTypes")) {
    const { registerChatTypesTests } = await import("./suites/chatTypes.suite");
    registerChatTypesTests();
  }
  if (all || categories?.includes("widgetCooldown")) {
    const { registerWidgetCooldownTests } = await import("./suites/widgetCooldown.suite");
    registerWidgetCooldownTests();
  }
  if (all || categories?.includes("phaseDetector")) {
    const { registerPhaseDetectorTests } = await import("./suites/phaseDetector.suite");
    registerPhaseDetectorTests();
  }
  if (all || categories?.includes("filterParser")) {
    const { registerFilterParserTests } = await import("./suites/filterParser.suite");
    registerFilterParserTests();
  }
  if (all || categories?.includes("chatCoherence")) {
    const { registerChatCoherenceTests } = await import("./suites/chatCoherence.suite");
    registerChatCoherenceTests();
  }
  if (all || categories?.includes("chatConversationSim")) {
    const { registerChatConversationSimTests } = await import("./suites/chatConversationSim.suite");
    registerChatConversationSimTests();
  }
  if (all || categories?.includes("chatAdvancedSim")) {
    const { registerChatAdvancedSimTests } = await import("./suites/chatAdvancedSim.suite");
    registerChatAdvancedSimTests();
  }
  if (all || categories?.includes("chatJourneysSim")) {
    const { registerChatJourneysSimTests } = await import("./suites/chatJourneysSim.suite");
    registerChatJourneysSimTests();
  }
  if (all || categories?.includes("sessionEntities")) {
    const { registerSessionEntitiesTests } = await import("./suites/sessionEntities.suite");
    registerSessionEntitiesTests();
  }
}
