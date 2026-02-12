/**
 * BookingStepTravelers - Traveler information step of the booking flow
 */

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import type { TravelerInfo } from "./BookingFlowWidget";

interface TravelersStepProps {
  travelers: TravelerInfo[];
  requiredCount: { adults: number; children: number; infants: number };
  onChange: (travelers: TravelerInfo[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function TravelersStep({
  travelers,
  requiredCount,
  onChange,
  onContinue,
  onBack,
}: TravelersStepProps) {
  const { t } = useTranslation();

  const updateTraveler = (index: number, updates: Partial<TravelerInfo>) => {
    const updated = [...travelers];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  // Initialize travelers if empty
  if (travelers.length === 0) {
    const initial: TravelerInfo[] = [];
    for (let i = 0; i < requiredCount.adults; i++) {
      initial.push({
        id: `adult-${i}`,
        type: "adult",
        firstName: "",
        lastName: "",
      });
    }
    for (let i = 0; i < requiredCount.children; i++) {
      initial.push({
        id: `child-${i}`,
        type: "child",
        firstName: "",
        lastName: "",
      });
    }
    for (let i = 0; i < requiredCount.infants; i++) {
      initial.push({
        id: `infant-${i}`,
        type: "infant",
        firstName: "",
        lastName: "",
      });
    }
    onChange(initial);
    return null;
  }

  const isValid = travelers.every((t) => t.firstName && t.lastName);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "adult": return t("planner.booking.adultLabel");
      case "child": return t("planner.booking.childLabel");
      case "infant": return t("planner.booking.infantLabel");
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        {t("planner.booking.travelerInfo")}
      </div>

      {travelers.map((traveler, index) => (
        <div key={traveler.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-muted-foreground" />
            <span className="font-medium">
              {t("planner.booking.traveler")} {index + 1} {getTypeLabel(traveler.type)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">{t("planner.booking.firstName")} *</label>
              <input
                type="text"
                value={traveler.firstName}
                onChange={(e) =>
                  updateTraveler(index, { firstName: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">{t("planner.booking.lastName")} *</label>
              <input
                type="text"
                value={traveler.lastName}
                onChange={(e) =>
                  updateTraveler(index, { lastName: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Dupont"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-lg font-medium border hover:bg-muted transition-colors"
        >
          {t("planner.booking.back")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!isValid}
          className={cn(
            "flex-1 py-3 rounded-lg font-medium transition-all",
            isValid
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {t("planner.booking.continue")}
        </button>
      </div>
    </div>
  );
}
