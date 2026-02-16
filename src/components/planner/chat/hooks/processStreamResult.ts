/**
 * processStreamResult - Pure helper functions extracted from useChatSubmit.sendText.
 *
 * Handles flight data routing and action processing after stream completes.
 * Extracted (A2) to reduce useChatSubmit complexity.
 */

import type { FlightFormData, WidgetType } from "@/types/flight";
import type { FlightMemory } from "@/stores/hooks/useFlightMemoryStore";
import type { ChooseWidgetAction } from "./useWidgetActionExecutor";
import { flightDataToMemory } from "../utils";
import { getCityCoords } from "../types";
import { persistExtractedEntities } from "./persistExtractedEntities";
import { eventBus, emitTabChange, emitTabAndZoom } from "@/lib/eventBus";
import { FLIGHTS_ZOOM } from "@/constants/mapSettings";
import { useDebugStore } from "@/stores/debugStore";
import type { IntentClassification } from "./chatStreamTypes";

// ─── Types ───

interface FlightDataDeps {
  widgetFlow: {
    setPendingTravelersWidget: (v: boolean) => void;
  };
  updateMemory: (partial: Partial<FlightMemory>) => void;
  memory: FlightMemory;
  widgetTracking: {
    trackDestinationSelect: (name: string, code: string) => void;
  };
}

interface FlightDataResult {
  nextMem: FlightMemory;
  showDateWidget: boolean;
  showTravelersWidget: boolean;
}

interface ActionDeps {
  widgetActionExecutor: {
    executeChooseWidgetAction: (action: ChooseWidgetAction) => boolean;
  };
  intentClassification: IntentClassification | null | undefined;
}

// ─── Flight data processing ───

/**
 * Process flight data from the LLM stream response.
 *
 * Handles: hallucination guard, memory updates, destination tracking,
 * map navigation, and form data emission.
 */
export function processFlightData(
  flightData: FlightFormData,
  hasIntentClassification: boolean,
  deps: FlightDataDeps,
): FlightDataResult {
  let nextMem: FlightMemory = { ...deps.memory, passengers: { ...deps.memory.passengers } };
  let showDateWidget = false;
  let showTravelersWidget = false;

  // F7: Entity persistence for case where intentClassification is null but flightData has legs
  if (!hasIntentClassification && flightData?.legs) {
    persistExtractedEntities(undefined, flightData, deps.widgetFlow as never, deps.updateMemory, deps.memory);
  }

  if (flightData && Object.keys(flightData).length > 0) {
    // Mutable copy for hallucination guard
    const fd = { ...flightData };
    // Guard: ignore hallucinated toCountryCode when no destination city was provided
    if (fd.toCountryCode && !fd.to) {
      if (import.meta.env.DEV) console.warn("[processFlightData] Ignoring hallucinated toCountryCode:", fd.toCountryCode);
      delete fd.toCountryCode;
    }
    const needsDestinationCity = fd.needsCitySelection && fd.toCountryCode;
    const needsDepartureCity = fd.fromCountryCode && !fd.from;
    const skipDateWidget = needsDestinationCity || needsDepartureCity;

    showDateWidget = fd.needsDateWidget === true && !skipDateWidget;
    showTravelersWidget = fd.needsTravelersWidget === true;

    if (showDateWidget && showTravelersWidget) {
      deps.widgetFlow.setPendingTravelersWidget(true);
    }

    const memoryUpdates = flightDataToMemory(fd, deps.memory);
    deps.updateMemory(memoryUpdates);
    nextMem = { ...nextMem, ...memoryUpdates };

    // Track synthetic destination_selected
    if (fd.toCountryCode && fd.toCountryName) {
      deps.widgetTracking.trackDestinationSelect(fd.toCountryName, fd.toCountryCode);
    }

    if (fd.to) {
      const coords = getCityCoords(fd.to.toLowerCase().split(",")[0].trim());
      if (coords) {
        emitTabAndZoom("flights", coords, FLIGHTS_ZOOM);
      } else {
        emitTabChange("flights");
      }
    }

    eventBus.emit("flight:updateFormData", fd);
  }

  return { nextMem, showDateWidget, showTravelersWidget };
}

// ─── Action processing ───

/**
 * Process parsed action from the LLM response content.
 *
 * Handles: chooseWidget (with intent guard), tab, zoom, tabAndZoom.
 */
export function processAction(
  action: { type: string; tab?: string; center?: { lat: number; lng: number }; zoom?: number; widgetType?: string; option?: string },
  deps: ActionDeps,
): void {
  if (action.type === "chooseWidget") {
    // GUARD: Use backend intent classification instead of fragile regex
    const userAskedForChoice = deps.intentClassification?.primaryIntent === "delegate_choice";

    if (userAskedForChoice) {
      if (import.meta.env.DEV) console.log("[processAction] chooseWidget (delegated):", action);
      const executed = deps.widgetActionExecutor.executeChooseWidgetAction(action as ChooseWidgetAction);
      if (import.meta.env.DEV && executed) console.log("[processAction] Widget action executed");
    } else {
      if (import.meta.env.DEV) console.warn("[processAction] Blocked auto-chooseWidget:", action);
      const { addBlockedAction } = useDebugStore.getState();
      addBlockedAction({
        type: action.type,
        widgetType: action.widgetType,
        option: action.option,
        reason: "Intent not classified as delegate_choice",
        timestamp: Date.now(),
      });
    }
  } else if (action.type === "tab") {
    emitTabChange(action.tab!);
  } else if (action.type === "zoom") {
    eventBus.emit("map:zoom", { center: action.center, zoom: action.zoom });
  } else if (action.type === "tabAndZoom") {
    emitTabAndZoom(action.tab!, action.center!, action.zoom!);
  }
}

// ─── Suggestion building ───

interface QuickReply {
  label: string;
  emoji?: string;
  message: string;
}

interface ContextualReply {
  id: string;
  label: string;
  icon?: string;
  action: { type: string; message?: string };
}

export interface DynamicSuggestion {
  id: string;
  label: string;
  emoji: string;
  message: string;
}

/**
 * Build combined dynamic suggestions from AI quick replies + contextual replies.
 */
export function buildCombinedSuggestions(
  quickReplies: { replies?: QuickReply[] } | null | undefined,
  contextualReplies: ContextualReply[],
): DynamicSuggestion[] {
  const aiReplies =
    quickReplies?.replies?.map((r, i) => ({
      id: `dyn-${Date.now()}-${i}`,
      label: r.label,
      emoji: r.emoji || "✈️",
      message: r.message,
    })) || [];

  const contextualSuggestions = contextualReplies
    .filter((r) => r.action.type === "fillInput")
    .map((r) => ({
      id: r.id,
      label: r.label,
      emoji: r.icon || "✨",
      message: (r.action as { type: "fillInput"; message: string }).message,
    }));

  return [...aiReplies, ...contextualSuggestions].slice(0, 4);
}
