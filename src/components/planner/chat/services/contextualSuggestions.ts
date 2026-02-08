/**
 * ContextualSuggestions - Proactive tips and suggestions
 */

import type { PlanningStep, WorkflowContext } from "../machines/workflowMachine";
import i18n from "@/i18n/config";

export type SuggestionType = "tip" | "savings" | "timing" | "seasonal" | "location" | "warning" | "insight" | "recommendation";
export type SuggestionPriority = "high" | "medium" | "low";

export interface ContextualSuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  message: string;
  action?: { label: string; type: "navigate" | "apply" | "dismiss" | "learn_more"; data?: any };
  trigger: { step?: PlanningStep; condition?: string };
  dismissible?: boolean;
  expiresAt?: Date;
}

interface SeasonalInfo {
  month: number;
  season: "low" | "shoulder" | "high" | "peak";
  weather: string; // Now uses translation keys
  avgTemp: number;
  priceMultiplier: number;
  events?: string[];
  crowdLevel: "low" | "moderate" | "high" | "very_high";
}

// Weather keys for i18n
const WEATHER_KEYS = {
  cold: "planner.weather.cold",
  cool: "planner.weather.cool",
  mild: "planner.weather.mild",
  pleasant: "planner.weather.pleasant",
  warm: "planner.weather.warm",
  hot: "planner.weather.hot",
  veryHot: "planner.weather.veryHot",
};

const SEASONAL_DATA: Record<string, SeasonalInfo[]> = {
  ES: [
    { month: 1, season: "low", weather: "cool", avgTemp: 12, priceMultiplier: 0.8, crowdLevel: "low" },
    { month: 2, season: "low", weather: "cool", avgTemp: 13, priceMultiplier: 0.8, crowdLevel: "low" },
    { month: 3, season: "shoulder", weather: "mild", avgTemp: 16, priceMultiplier: 0.9, crowdLevel: "moderate" },
    { month: 4, season: "shoulder", weather: "pleasant", avgTemp: 18, priceMultiplier: 0.95, crowdLevel: "moderate", events: ["Semana Santa"] },
    { month: 5, season: "shoulder", weather: "warm", avgTemp: 22, priceMultiplier: 1.0, crowdLevel: "moderate" },
    { month: 6, season: "high", weather: "warm", avgTemp: 26, priceMultiplier: 1.2, crowdLevel: "high" },
    { month: 7, season: "peak", weather: "veryHot", avgTemp: 30, priceMultiplier: 1.4, crowdLevel: "very_high" },
    { month: 8, season: "peak", weather: "veryHot", avgTemp: 30, priceMultiplier: 1.5, crowdLevel: "very_high" },
    { month: 9, season: "shoulder", weather: "warm", avgTemp: 26, priceMultiplier: 1.1, crowdLevel: "high" },
    { month: 10, season: "shoulder", weather: "pleasant", avgTemp: 22, priceMultiplier: 0.95, crowdLevel: "moderate" },
    { month: 11, season: "low", weather: "mild", avgTemp: 16, priceMultiplier: 0.85, crowdLevel: "low" },
    { month: 12, season: "shoulder", weather: "cool", avgTemp: 13, priceMultiplier: 0.9, crowdLevel: "moderate", events: ["Noël", "Nouvel An"] },
  ],
  IT: [
    { month: 1, season: "low", weather: "cold", avgTemp: 8, priceMultiplier: 0.75, crowdLevel: "low" },
    { month: 2, season: "low", weather: "cold", avgTemp: 10, priceMultiplier: 0.75, crowdLevel: "low", events: ["Carnaval de Venise"] },
    { month: 3, season: "shoulder", weather: "mild", avgTemp: 14, priceMultiplier: 0.9, crowdLevel: "moderate" },
    { month: 4, season: "shoulder", weather: "pleasant", avgTemp: 17, priceMultiplier: 1.0, crowdLevel: "high", events: ["Pâques"] },
    { month: 5, season: "high", weather: "warm", avgTemp: 22, priceMultiplier: 1.1, crowdLevel: "high" },
    { month: 6, season: "high", weather: "warm", avgTemp: 26, priceMultiplier: 1.3, crowdLevel: "very_high" },
    { month: 7, season: "peak", weather: "veryHot", avgTemp: 30, priceMultiplier: 1.4, crowdLevel: "very_high" },
    { month: 8, season: "peak", weather: "veryHot", avgTemp: 30, priceMultiplier: 1.5, crowdLevel: "very_high", events: ["Ferragosto"] },
    { month: 9, season: "shoulder", weather: "warm", avgTemp: 25, priceMultiplier: 1.1, crowdLevel: "high" },
    { month: 10, season: "shoulder", weather: "pleasant", avgTemp: 20, priceMultiplier: 0.95, crowdLevel: "moderate" },
    { month: 11, season: "low", weather: "cool", avgTemp: 14, priceMultiplier: 0.8, crowdLevel: "low" },
    { month: 12, season: "shoulder", weather: "cold", avgTemp: 10, priceMultiplier: 0.85, crowdLevel: "moderate", events: ["Noël"] },
  ],
  PT: [
    { month: 1, season: "low", weather: "mild", avgTemp: 12, priceMultiplier: 0.75, crowdLevel: "low" },
    { month: 2, season: "low", weather: "mild", avgTemp: 13, priceMultiplier: 0.75, crowdLevel: "low" },
    { month: 3, season: "shoulder", weather: "pleasant", avgTemp: 16, priceMultiplier: 0.85, crowdLevel: "moderate" },
    { month: 4, season: "shoulder", weather: "pleasant", avgTemp: 18, priceMultiplier: 0.95, crowdLevel: "moderate" },
    { month: 5, season: "shoulder", weather: "warm", avgTemp: 21, priceMultiplier: 1.0, crowdLevel: "moderate" },
    { month: 6, season: "high", weather: "warm", avgTemp: 25, priceMultiplier: 1.2, crowdLevel: "high", events: ["Fêtes de Lisbonne"] },
    { month: 7, season: "peak", weather: "veryHot", avgTemp: 28, priceMultiplier: 1.4, crowdLevel: "very_high" },
    { month: 8, season: "peak", weather: "veryHot", avgTemp: 28, priceMultiplier: 1.5, crowdLevel: "very_high" },
    { month: 9, season: "shoulder", weather: "warm", avgTemp: 25, priceMultiplier: 1.1, crowdLevel: "high" },
    { month: 10, season: "shoulder", weather: "pleasant", avgTemp: 21, priceMultiplier: 0.9, crowdLevel: "moderate" },
    { month: 11, season: "low", weather: "mild", avgTemp: 16, priceMultiplier: 0.8, crowdLevel: "low" },
    { month: 12, season: "shoulder", weather: "mild", avgTemp: 13, priceMultiplier: 0.85, crowdLevel: "moderate", events: ["Noël"] },
  ],
};

export function getSeasonalInfo(countryCode: string, date: Date): SeasonalInfo | null {
  const data = SEASONAL_DATA[countryCode.toUpperCase()];
  if (!data) return null;
  const month = date.getMonth() + 1;
  return data.find((s) => s.month === month) || null;
}

function generateSeasonalSuggestion(countryCode: string, date: Date, destination: string): ContextualSuggestion | null {
  const t = i18n.t.bind(i18n);
  const seasonal = getSeasonalInfo(countryCode, date);
  if (!seasonal) return null;

  const percent = Math.round((1 - seasonal.priceMultiplier) * 100);
  const percentHigh = Math.round((seasonal.priceMultiplier - 1) * 100);

  const messages: Record<SeasonalInfo["season"], string> = {
    low: t("planner.suggestion.lowSeason", { destination, percent: Math.abs(percent) }),
    shoulder: t("planner.suggestion.shoulderSeason", { destination }),
    high: t("planner.suggestion.highSeasonMessage", { destination, percent: percentHigh }),
    peak: t("planner.suggestion.peakSeasonMessage", { destination, percent: percentHigh }),
  };

  const titles: Record<SeasonalInfo["season"], string> = {
    low: t("planner.suggestion.lowSeasonTitle"),
    shoulder: t("planner.suggestion.shoulderSeasonTitle"),
    high: t("planner.suggestion.highSeasonTitle"),
    peak: t("planner.suggestion.peakSeasonTitle"),
  };

  return {
    id: `seasonal-${countryCode}-${date.getMonth()}`,
    type: "seasonal",
    priority: seasonal.season === "peak" ? "high" : "medium",
    title: titles[seasonal.season],
    message: messages[seasonal.season],
    trigger: { step: "dates" },
    dismissible: true,
    action: seasonal.season === "peak" ? { label: t("planner.suggestion.viewOtherDates"), type: "navigate", data: { step: "dates" } } : undefined,
  };
}

function generateSavingsSuggestions(context: WorkflowContext): ContextualSuggestion[] {
  const t = i18n.t.bind(i18n);
  const suggestions: ContextualSuggestion[] = [];
  const { selections } = context;

  if (selections.dates?.departure) {
    const day = selections.dates.departure.getDay();
    if (day === 0 || day === 6 || day === 5) {
      suggestions.push({
        id: "savings-midweek",
        type: "savings",
        priority: "medium",
        title: t("planner.suggestion.savingsFlights"),
        message: t("planner.suggestion.savingsFlightsMessage"),
        trigger: { step: "dates" },
        dismissible: true,
        action: { label: t("planner.suggestion.modifyDates"), type: "navigate", data: { step: "dates" } },
      });
    }
  }

  if (selections.hotels?.price && selections.hotels.price > 200) {
    suggestions.push({
      id: "savings-hotels",
      type: "savings",
      priority: "low",
      title: t("planner.suggestion.alternativeAccommodation"),
      message: t("planner.suggestion.alternativeAccommodationMessage"),
      trigger: { step: "hotels" },
      dismissible: true,
    });
  }

  return suggestions;
}

function generateTimingSuggestions(context: WorkflowContext): ContextualSuggestion[] {
  const t = i18n.t.bind(i18n);
  const suggestions: ContextualSuggestion[] = [];
  const { selections } = context;

  if (selections.dates?.departure) {
    const daysUntil = Math.ceil((selections.dates.departure.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntil > 60) {
      suggestions.push({
        id: "timing-early",
        type: "timing",
        priority: "low",
        title: t("planner.suggestion.earlyBooking"),
        message: t("planner.suggestion.earlyBookingMessage"),
        trigger: { step: "flights" },
        dismissible: true,
      });
    } else if (daysUntil < 14) {
      suggestions.push({
        id: "timing-late",
        type: "timing",
        priority: "high",
        title: t("planner.suggestion.lateBooking"),
        message: t("planner.suggestion.lateBookingMessage"),
        trigger: { step: "flights" },
        dismissible: true,
      });
    }
  }

  return suggestions;
}

function generateStepTips(step: PlanningStep): ContextualSuggestion[] {
  const t = i18n.t.bind(i18n);
  const tips: Record<PlanningStep, ContextualSuggestion[]> = {
    welcome: [],
    destination: [{ id: "tip-destination-1", type: "tip", priority: "low", title: t("planner.tip.destination"), message: t("planner.tip.destinationMessage"), trigger: { step: "destination" }, dismissible: true }],
    dates: [{ id: "tip-dates-1", type: "tip", priority: "low", title: t("planner.tip.datesFlexible"), message: t("planner.tip.datesFlexibleMessage"), trigger: { step: "dates" }, dismissible: true }],
    travelers: [{ id: "tip-travelers-1", type: "tip", priority: "low", title: t("planner.tip.familyTravel"), message: t("planner.tip.familyTravelMessage"), trigger: { step: "travelers" }, dismissible: true }],
    flights: [{ id: "tip-flights-1", type: "insight", priority: "medium", title: t("planner.tip.compareOptions"), message: t("planner.tip.compareOptionsMessage"), trigger: { step: "flights" }, dismissible: true }],
    hotels: [{ id: "tip-hotels-1", type: "insight", priority: "medium", title: t("planner.tip.locationKey"), message: t("planner.tip.locationKeyMessage"), trigger: { step: "hotels" }, dismissible: true }],
    activities: [{ id: "tip-activities-1", type: "recommendation", priority: "medium", title: t("planner.tip.localExperiences"), message: t("planner.tip.localExperiencesMessage"), trigger: { step: "activities" }, dismissible: true }],
    transfers: [{ id: "tip-transfers-1", type: "tip", priority: "low", title: t("planner.tip.airportTransfers"), message: t("planner.tip.airportTransfersMessage"), trigger: { step: "transfers" }, dismissible: true }],
    recap: [],
    booking: [],
    complete: [],
  };
  return tips[step] || [];
}

export function getSuggestionsForContext(context: WorkflowContext): ContextualSuggestion[] {
  const suggestions: ContextualSuggestion[] = [];
  const { currentStep, selections } = context;

  suggestions.push(...generateStepTips(currentStep));

  if (selections.destination?.countryCode && selections.dates?.departure) {
    const seasonal = generateSeasonalSuggestion(selections.destination.countryCode, selections.dates.departure, selections.destination.city || selections.destination.country || "");
    if (seasonal) suggestions.push(seasonal);
  }

  suggestions.push(...generateSavingsSuggestions(context));
  suggestions.push(...generateTimingSuggestions(context));

  const priorityOrder: Record<SuggestionPriority, number> = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

export interface QuickReply {
  id: string;
  label: string;
  action: string;
  data?: any;
}

export function getQuickRepliesForStep(step: PlanningStep, context: WorkflowContext): QuickReply[] {
  const t = i18n.t.bind(i18n);
  const replies: Record<PlanningStep, QuickReply[]> = {
    welcome: [
      { id: "qr-start", label: t("planner.quickReply.planTrip"), action: "start_planning" },
      { id: "qr-inspire", label: t("planner.quickReply.getInspired"), action: "get_inspiration" },
      { id: "qr-resume", label: t("planner.quickReply.resumeTrip"), action: "resume_trip" },
    ],
    destination: [
      { id: "qr-beach", label: t("planner.quickReply.beach"), action: "suggest_destination", data: { type: "beach" } },
      { id: "qr-city", label: t("planner.quickReply.cityBreak"), action: "suggest_destination", data: { type: "city" } },
      { id: "qr-nature", label: t("planner.quickReply.nature"), action: "suggest_destination", data: { type: "nature" } },
      { id: "qr-culture", label: t("planner.quickReply.culture"), action: "suggest_destination", data: { type: "culture" } },
    ],
    dates: [
      { id: "qr-flexible", label: t("planner.quickReply.flexibleDates"), action: "set_flexible_dates" },
      { id: "qr-weekend", label: t("planner.quickReply.nextWeekend"), action: "set_next_weekend" },
      { id: "qr-week", label: t("planner.quickReply.oneWeek"), action: "set_one_week" },
    ],
    travelers: [
      { id: "qr-solo", label: t("planner.quickReply.solo"), action: "set_travelers", data: { adults: 1 } },
      { id: "qr-couple", label: t("planner.quickReply.couple"), action: "set_travelers", data: { adults: 2 } },
      { id: "qr-family", label: t("planner.quickReply.family"), action: "show_travelers_widget" },
      { id: "qr-group", label: t("planner.quickReply.group"), action: "show_travelers_widget" },
    ],
    flights: [
      { id: "qr-cheapest", label: t("planner.quickReply.cheapest"), action: "filter_flights", data: { sort: "price" } },
      { id: "qr-direct", label: t("planner.quickReply.directFlights"), action: "filter_flights", data: { direct: true } },
      { id: "qr-morning", label: t("planner.quickReply.morningDeparture"), action: "filter_flights", data: { time: "morning" } },
    ],
    hotels: [
      { id: "qr-budget", label: t("planner.quickReply.budget"), action: "filter_hotels", data: { priceRange: "budget" } },
      { id: "qr-center", label: t("planner.quickReply.center"), action: "filter_hotels", data: { location: "center" } },
      { id: "qr-4star", label: t("planner.quickReply.fourStar"), action: "filter_hotels", data: { minStars: 4 } },
    ],
    activities: [
      { id: "qr-popular", label: t("planner.quickReply.popular"), action: "filter_activities", data: { sort: "popularity" } },
      { id: "qr-free", label: t("planner.quickReply.freeActivities"), action: "filter_activities", data: { free: true } },
      { id: "qr-skip", label: t("planner.quickReply.skipStep"), action: "skip_step" },
    ],
    transfers: [
      { id: "qr-private", label: t("planner.quickReply.privateTransfer"), action: "search_transfers", data: { type: "private" } },
      { id: "qr-shared", label: t("planner.quickReply.sharedShuttle"), action: "search_transfers", data: { type: "shared" } },
      { id: "qr-skip-transfer", label: t("planner.quickReply.noNeed"), action: "skip_step" },
    ],
    recap: [
      { id: "qr-modify", label: t("planner.quickReply.modifySomething"), action: "edit_trip" },
      { id: "qr-confirm", label: t("planner.quickReply.perfect"), action: "confirm_trip" },
    ],
    booking: [
      { id: "qr-book-all", label: t("planner.quickReply.bookAll"), action: "book_all" },
      { id: "qr-book-later", label: t("planner.quickReply.bookLater"), action: "save_for_later" },
    ],
    complete: [],
  };
  return replies[step] || [];
}

export const SUGGESTION_PRESETS = {
  flexibleDates: { 
    id: "preset-flexible", 
    type: "tip" as SuggestionType, 
    priority: "medium" as SuggestionPriority, 
    get title() { return i18n.t("planner.suggestionPreset.flexibleDatesTitle"); },
    get message() { return i18n.t("planner.suggestionPreset.flexibleDatesMessage"); },
    trigger: { step: "dates" as PlanningStep }, 
    dismissible: true 
  },
  earlyBooking: { 
    id: "preset-early", 
    type: "timing" as SuggestionType, 
    priority: "medium" as SuggestionPriority, 
    get title() { return i18n.t("planner.suggestionPreset.earlyBookingTitle"); },
    get message() { return i18n.t("planner.suggestionPreset.earlyBookingMessage"); },
    trigger: { step: "flights" as PlanningStep }, 
    dismissible: true 
  },
  compareHotels: { 
    id: "preset-compare", 
    type: "insight" as SuggestionType, 
    priority: "low" as SuggestionPriority, 
    get title() { return i18n.t("planner.suggestionPreset.compareHotelsTitle"); },
    get message() { return i18n.t("planner.suggestionPreset.compareHotelsMessage"); },
    trigger: { step: "hotels" as PlanningStep }, 
    dismissible: true 
  },
};
