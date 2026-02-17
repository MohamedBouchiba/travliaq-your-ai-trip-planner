/**
 * persistExtractedEntities - Declarative Entity Persistence Pipeline
 *
 * Single point of entry for persisting entities from classify_intent and flightData.
 * Uses a declarative mapping table (ENTITY_PERSISTERS) — to handle a new entity,
 * just add an entry to the table instead of writing ad-hoc if/else.
 *
 * Priority: flightData > intent entities (flightData has its own persistence path
 * via flightDataToMemory, so intent entities only apply when flightData is absent).
 */

import type { FlightFormData } from "@/types/flight";
import type { FlightMemory } from "@/stores/hooks/useFlightMemoryStore";
import { eventBus } from "@/lib/eventBus";
import { addDays } from "date-fns";
import { parseDurationToDays } from "./widgetHandlers/helpers";

// ---------------------------------------------------------------------------
// Declarative mapping: entity name → persistence actions
// ---------------------------------------------------------------------------

interface EntityPersistAction {
  /** Build partial FlightMemory update from the entity value */
  toMemory?: (value: unknown, current: Partial<FlightMemory>) => Partial<FlightMemory>;
  /** Build partial form data to emit via eventBus ("flight:updateFormData") */
  toFormEvent?: (value: unknown) => Record<string, unknown>;
  /** Route to a widget-flow ref instead of memory */
  toWidgetRef?: "tripDuration" | "preferredMonth";
  /** Only apply when flightData is null (avoids overriding the more precise flightData path) */
  onlyWithoutFlightData?: boolean;
  /** B1: Only skip when a specific flightData field is already set (finer than onlyWithoutFlightData) */
  skipWhenFlightDataHas?: keyof FlightFormData;
}

/**
 * Declarative entity-to-memory mapping.
 * Add one entry here to support any new entity from classify_intent.
 */
const ENTITY_PERSISTERS: Record<string, EntityPersistAction> = {
  // --- Travelers -------------------------------------------------------
  adults: {
    onlyWithoutFlightData: true,
    toMemory: (v, cur) => ({
      passengers: {
        adults: Number(v) || 1,
        children: cur.passengers?.children ?? 0,
        infants: cur.passengers?.infants ?? 0,
      },
    }),
    toFormEvent: (v) => ({ adults: v }),
  },
  children: {
    onlyWithoutFlightData: true,
    toMemory: (v, cur) => ({
      passengers: {
        adults: cur.passengers?.adults ?? 1,
        children: Number(v) || 0,
        infants: cur.passengers?.infants ?? 0,
      },
    }),
    toFormEvent: (v) => ({ children: v }),
  },
  infants: {
    onlyWithoutFlightData: true,
    toMemory: (v, cur) => ({
      passengers: {
        adults: cur.passengers?.adults ?? 1,
        children: cur.passengers?.children ?? 0,
        infants: Number(v) || 0,
      },
    }),
    toFormEvent: (v) => ({ infants: v }),
  },
  travelStyle: {
    onlyWithoutFlightData: true,
    toMemory: (v, cur) => {
      const style = v as string;
      const currentAdults = cur.passengers?.adults ?? 1;
      // Only derive adults from style when not explicitly set
      if (currentAdults <= 1) {
        const adultsMap: Record<string, number> = { couple: 2, family: 2, friends: 2, group: 3 };
        const derived = adultsMap[style];
        if (derived) {
          return {
            passengers: {
              adults: derived,
              children: cur.passengers?.children ?? 0,
              infants: cur.passengers?.infants ?? 0,
            },
          };
        }
      }
      return {};
    },
  },

  // --- Location (departure) --------------------------------------------
  // B1: Use skipWhenFlightDataHas instead of onlyWithoutFlightData — only skip
  // when flightData.from is already set, not when any flightData field exists.
  departureCity: {
    skipWhenFlightDataHas: "from",
    toMemory: (v, cur) => ({ departure: { ...cur.departure, city: v as string } }),
    toFormEvent: (v) => ({ from: v }),
  },
  departureCountryCode: {
    skipWhenFlightDataHas: "from",
    toMemory: (v, cur) => ({ departure: { ...cur.departure, countryCode: v as string } }),
  },

  // --- Location (destination) ------------------------------------------
  destinationCountry: {
    onlyWithoutFlightData: true,
    toMemory: (v, cur) => ({ arrival: { ...cur.arrival, country: v as string } }),
  },
  destinationCountryCode: {
    onlyWithoutFlightData: true,
    toMemory: (v, cur) => ({ arrival: { ...cur.arrival, countryCode: v as string } }),
  },

  // --- Dates (widget refs — consumed by date picker widgets) -----------
  tripDuration: { toWidgetRef: "tripDuration" },
  preferredMonth: { toWidgetRef: "preferredMonth" },

  // --- Dates (exact — direct memory persistence) -----------------------
  exactDepartureDate: {
    onlyWithoutFlightData: true,
    toMemory: (v) => {
      const d = new Date(v as string);
      return isNaN(d.getTime()) ? {} : { departureDate: d };
    },
    toFormEvent: (v) => ({ departureDate: v }),
    // FIX-B3: Auto-compute return date handled in pipeline executor below
  },
  exactReturnDate: {
    onlyWithoutFlightData: true,
    toMemory: (v) => {
      const d = new Date(v as string);
      return isNaN(d.getTime()) ? {} : { returnDate: d };
    },
    toFormEvent: (v) => ({ returnDate: v }),
  },
};

// ---------------------------------------------------------------------------
// Pipeline executor
// ---------------------------------------------------------------------------

export function persistExtractedEntities(
  intentEntities: Record<string, unknown> | undefined,
  flightData: FlightFormData | null,
  widgetFlow: {
    setPendingTripDuration: (d: string) => void;
    setPendingPreferredMonth: (m: string) => void;
    getPendingTripDuration?: () => string | null;
  },
  updateMemory?: (partial: Partial<FlightMemory>) => void,
  currentMemory?: Partial<FlightMemory>,
): Partial<FlightMemory> {
  if (!intentEntities && !flightData?.legs) return {};

  const hasFlightData = flightData != null && Object.keys(flightData).length > 0;
  const baseMem: Partial<FlightMemory> = currentMemory ?? {};
  let memoryBatch: Partial<FlightMemory> = {};
  let formBatch: Record<string, unknown> = {};

  // --- Process intent entities through the declarative table -----------
  if (intentEntities) {
    for (const [key, value] of Object.entries(intentEntities)) {
      if (value === undefined || value === null) continue;

      const persister = ENTITY_PERSISTERS[key];
      if (!persister) continue;
      if (persister.onlyWithoutFlightData && hasFlightData) continue;
      // B1: Field-specific guard — skip only when flightData already has that field
      if (persister.skipWhenFlightDataHas && flightData?.[persister.skipWhenFlightDataHas]) continue;

      // Widget ref path
      if (persister.toWidgetRef === "tripDuration" && typeof value === "string") {
        widgetFlow.setPendingTripDuration(value);
      } else if (persister.toWidgetRef === "preferredMonth" && typeof value === "string") {
        widgetFlow.setPendingPreferredMonth(value);
      }

      // Memory path — batch updates, each persister sees accumulated state
      if (persister.toMemory) {
        const partial = persister.toMemory(value, { ...baseMem, ...memoryBatch });
        memoryBatch = { ...memoryBatch, ...partial };
      }

      // Form event path — batch for single emit
      if (persister.toFormEvent) {
        formBatch = { ...formBatch, ...persister.toFormEvent(value) };
      }
    }
  }

  // --- Also read tripDuration/preferredMonth from flightData (higher priority) ---
  if (flightData?.tripDuration && typeof flightData.tripDuration === "string") {
    widgetFlow.setPendingTripDuration(flightData.tripDuration);
  }
  if (flightData?.preferredMonth && typeof flightData.preferredMonth === "string") {
    widgetFlow.setPendingPreferredMonth(flightData.preferredMonth);
  }

  // --- Multi-destination legs (special case from flightData only) ------
  if (flightData?.legs && flightData.legs.length > 0) {
    const legMemories = flightData.legs.map((leg, i) => ({
      departure: leg.from ? { city: leg.from } : null,
      arrival: leg.to ? { city: leg.to } : null,
      date: leg.date ? new Date(leg.date) : null,
      id: `leg-${i}-${Date.now()}`,
    }));
    memoryBatch = { ...memoryBatch, legs: legMemories, tripType: "multi" as const };
  }

  // --- FIX-B3: Auto-compute return date from departure + pending duration ---
  const effectiveMem = { ...baseMem, ...memoryBatch };
  if (effectiveMem.departureDate && !effectiveMem.returnDate) {
    // Check tripDuration from intent entities or from widgetFlow ref
    const durationStr =
      (intentEntities?.tripDuration as string) ||
      widgetFlow.getPendingTripDuration?.() ||
      null;
    if (durationStr) {
      const days = parseDurationToDays(durationStr);
      if (days) {
        const computedReturn = addDays(effectiveMem.departureDate, days);
        memoryBatch = { ...memoryBatch, returnDate: computedReturn };
        formBatch = { ...formBatch, returnDate: computedReturn.toISOString().split("T")[0] };
      }
    }
  }

  // --- Apply batched updates -------------------------------------------
  if (updateMemory && Object.keys(memoryBatch).length > 0) {
    updateMemory(memoryBatch);
  }
  if (Object.keys(formBatch).length > 0) {
    eventBus.emit("flight:updateFormData", formBatch as import("@/types/flight").FlightFormData);
  }

  return memoryBatch;
}
