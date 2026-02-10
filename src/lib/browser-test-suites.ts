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
}
