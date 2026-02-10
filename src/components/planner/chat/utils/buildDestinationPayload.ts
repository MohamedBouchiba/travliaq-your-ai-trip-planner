/**
 * buildDestinationPayload - Shared utility to construct DestinationSuggestRequest
 * 
 * DRY fix: This payload was previously built identically in two places
 * (handleFetchDestinations and handleSubmit in PlannerChat.tsx).
 */

import type { DestinationSuggestRequest } from "@/types/destinations";

interface PreferencesInput {
  styleAxes: {
    chillVsIntense: number;
    cityVsNature: number;
    ecoVsLuxury: number;
    touristVsLocal: number;
  };
  interests: string[];
  mustHaves: {
    accessibilityRequired?: boolean;
    petFriendly?: boolean;
    familyFriendly?: boolean;
    highSpeedWifi?: boolean;
  };
  dietaryRestrictions: string[];
  travelStyle?: string;
  tripContext?: {
    occasion?: string;
  };
}

interface DepartureInfo {
  city?: string | null;
  country?: string | null;
}

interface BuildDestinationPayloadOptions {
  preferences: PreferencesInput;
  departure?: DepartureInfo;
  departureDateMs?: number | null;
}

export function buildDestinationPayload({
  preferences: prefs,
  departure,
  departureDateMs,
}: BuildDestinationPayloadOptions): DestinationSuggestRequest {
  return {
    userLocation: departure?.city
      ? { city: departure.city, country: departure.country ?? undefined }
      : undefined,

    styleAxes: {
      chillVsIntense: prefs.styleAxes.chillVsIntense ?? 50,
      cityVsNature: prefs.styleAxes.cityVsNature ?? 50,
      ecoVsLuxury: prefs.styleAxes.ecoVsLuxury ?? 50,
      touristVsLocal: prefs.styleAxes.touristVsLocal ?? 50,
    },

    interests: prefs.interests.slice(0, 5) as DestinationSuggestRequest["interests"],

    mustHaves: {
      accessibilityRequired: prefs.mustHaves.accessibilityRequired || false,
      petFriendly: prefs.mustHaves.petFriendly || false,
      familyFriendly: prefs.mustHaves.familyFriendly || false,
      highSpeedWifi: prefs.mustHaves.highSpeedWifi || false,
    },

    dietaryRestrictions:
      prefs.dietaryRestrictions.length > 0
        ? prefs.dietaryRestrictions
        : undefined,

    travelStyle: prefs.travelStyle as DestinationSuggestRequest["travelStyle"],

    occasion: prefs.tripContext?.occasion as DestinationSuggestRequest["occasion"],

    budgetLevel:
      prefs.styleAxes.ecoVsLuxury < 25
        ? "budget"
        : prefs.styleAxes.ecoVsLuxury < 50
          ? "comfort"
          : prefs.styleAxes.ecoVsLuxury < 75
            ? "premium"
            : "luxury",

    travelMonth: departureDateMs
      ? new Date(departureDateMs).getMonth() + 1
      : new Date().getMonth() + 1,
  };
}
