import {
  Hotel, Home, Castle, Tent, House, Building2,
  Wifi, Car, Coffee, Wind, Waves, Utensils,
  Soup, ChefHat,
  Mountain, Building, Flower2, Droplets,
  ConciergeBell, Dumbbell, Bus,
  Accessibility, Baby, Dog,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AccommodationType, EssentialAmenity } from "@/stores/hooks";
import type { MealPlan } from "@/stores/slices/accommodationTypes";

// Accommodation type icons (labels are translated via i18n)
export const ACCOMMODATION_TYPE_ICONS: Record<AccommodationType, React.ElementType> = {
  hotel: Hotel,
  apartment: Home,
  villa: Castle,
  hostel: Tent,
  guesthouse: House,
  any: Building2,
};

// Essential amenity icons (labels are translated via i18n)
export const AMENITY_ICONS: Record<EssentialAmenity, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  ac: Wind,
  pool: Waves,
  kitchen: Utensils,
};

// Meal plan icons
export const MEAL_PLAN_ICONS: Record<MealPlan, React.ElementType> = {
  none: Coffee, // fallback icon for "none"
  breakfast: Coffee,
  half: Soup,
  full: ChefHat,
  "all-inclusive": Utensils,
};

// View icons
export const VIEW_ICONS: Record<string, React.ElementType> = {
  sea: Waves,
  mountain: Mountain,
  city: Building,
  garden: Flower2,
  pool: Droplets,
};

// Service icons
export const SERVICE_ICONS: Record<string, React.ElementType> = {
  roomService: ConciergeBell,
  spa: Droplets,
  gym: Dumbbell,
  shuttle: Bus,
};

// Accessibility icons
export const ACCESSIBILITY_ICONS: Record<string, React.ElementType> = {
  pmr: Accessibility,
  baby: Baby,
  pets: Dog,
};

// Hook for translated accommodation types
export function useAccommodationTypes() {
  const { t } = useTranslation();
  return [
    { id: "hotel" as AccommodationType, label: t("planner.accommodation.type.hotel"), icon: ACCOMMODATION_TYPE_ICONS.hotel },
    { id: "apartment" as AccommodationType, label: t("planner.accommodation.type.apartment"), icon: ACCOMMODATION_TYPE_ICONS.apartment },
    { id: "villa" as AccommodationType, label: t("planner.accommodation.type.villa"), icon: ACCOMMODATION_TYPE_ICONS.villa },
    { id: "hostel" as AccommodationType, label: t("planner.accommodation.type.hostel"), icon: ACCOMMODATION_TYPE_ICONS.hostel },
    { id: "guesthouse" as AccommodationType, label: t("planner.accommodation.type.guesthouse"), icon: ACCOMMODATION_TYPE_ICONS.guesthouse },
    { id: "any" as AccommodationType, label: t("planner.accommodation.type.any"), icon: ACCOMMODATION_TYPE_ICONS.any },
  ];
}

// Hook for translated amenities
export function useEssentialAmenities() {
  const { t } = useTranslation();
  return [
    { id: "wifi" as EssentialAmenity, label: t("planner.accommodation.amenities.wifi"), icon: AMENITY_ICONS.wifi },
    { id: "parking" as EssentialAmenity, label: t("planner.accommodation.amenities.parking"), icon: AMENITY_ICONS.parking },
    { id: "breakfast" as EssentialAmenity, label: t("planner.accommodation.amenities.breakfast"), icon: AMENITY_ICONS.breakfast },
    { id: "ac" as EssentialAmenity, label: t("planner.accommodation.amenities.ac"), icon: AMENITY_ICONS.ac },
    { id: "pool" as EssentialAmenity, label: t("planner.accommodation.amenities.pool"), icon: AMENITY_ICONS.pool },
    { id: "kitchen" as EssentialAmenity, label: t("planner.accommodation.amenities.kitchen"), icon: AMENITY_ICONS.kitchen },
  ];
}

// Hook for translated rating options
export function useRatingOptions() {
  const { t } = useTranslation();
  return [
    { value: null, label: t("planner.accommodation.rating.all") },
    { value: 7, label: "7+" },
    { value: 8, label: "8+" },
    { value: 9, label: "9+" },
  ];
}

// Hook for translated meal plans
export function useMealPlans() {
  const { t } = useTranslation();
  return [
    { id: "breakfast" as MealPlan, label: t("planner.accommodation.amenities.breakfast"), icon: MEAL_PLAN_ICONS.breakfast },
    { id: "half" as MealPlan, label: t("planner.accommodation.filters.halfBoard"), icon: MEAL_PLAN_ICONS.half },
    { id: "full" as MealPlan, label: t("planner.accommodation.filters.fullBoard"), icon: MEAL_PLAN_ICONS.full },
    { id: "all-inclusive" as MealPlan, label: t("planner.accommodation.filters.allInclusive"), icon: MEAL_PLAN_ICONS["all-inclusive"] },
  ];
}

// Hook for translated view options
export function useViewOptions() {
  const { t } = useTranslation();
  return [
    { id: "sea", label: t("planner.accommodation.filters.sea"), icon: VIEW_ICONS.sea },
    { id: "mountain", label: t("planner.accommodation.filters.mountain"), icon: VIEW_ICONS.mountain },
    { id: "city", label: t("planner.accommodation.filters.city"), icon: VIEW_ICONS.city },
    { id: "garden", label: t("planner.accommodation.filters.garden"), icon: VIEW_ICONS.garden },
    { id: "pool", label: t("planner.accommodation.filters.poolView"), icon: VIEW_ICONS.pool },
  ];
}

// Hook for translated service options
export function useServiceOptions() {
  const { t } = useTranslation();
  return [
    { id: "roomService", label: t("planner.accommodation.filters.roomService"), icon: SERVICE_ICONS.roomService },
    { id: "spa", label: t("planner.accommodation.filters.spa"), icon: SERVICE_ICONS.spa },
    { id: "gym", label: t("planner.accommodation.filters.gym"), icon: SERVICE_ICONS.gym },
    { id: "shuttle", label: t("planner.accommodation.filters.shuttle"), icon: SERVICE_ICONS.shuttle },
  ];
}

// Hook for translated accessibility options
export function useAccessibilityOptions() {
  const { t } = useTranslation();
  return [
    { id: "pmr", label: t("planner.accommodation.filters.pmr"), icon: ACCESSIBILITY_ICONS.pmr },
    { id: "baby", label: t("planner.accommodation.filters.baby"), icon: ACCESSIBILITY_ICONS.baby },
    { id: "pets", label: t("planner.accommodation.filters.pets"), icon: ACCESSIBILITY_ICONS.pets },
  ];
}
