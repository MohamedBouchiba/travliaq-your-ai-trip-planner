/**
 * TripStatusBar - Compact bar showing confirmed trip parameters as chips
 *
 * Displayed above the chat input when at least one field is confirmed.
 * Chips: destination, dates, travelers, trip type.
 */

import { memo } from "react";
import { MapPin, Calendar, Users, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlightMemory } from "@/stores/hooks/useFlightMemoryStore";
import type { TFunction } from "i18next";

interface TripStatusBarProps {
  memory: FlightMemory;
  t: TFunction;
}

function formatDate(date: Date | null, t: TFunction): string | null {
  if (!date) return null;
  const d = new Date(date);
  const day = d.getDate();
  const monthKey = [
    "jan", "feb", "mar", "apr", "may", "jun",
    "jul", "aug", "sep", "oct", "nov", "dec",
  ][d.getMonth()];
  return `${day} ${t(`planner.months.${monthKey}`, monthKey)}`;
}

export const TripStatusBar = memo(function TripStatusBar({ memory, t }: TripStatusBarProps) {
  const destination = memory.arrival?.city || memory.arrival?.country;
  const depDate = formatDate(memory.departureDate, t);
  const retDate = formatDate(memory.returnDate, t);
  const totalTravelers = memory.passengers.adults + memory.passengers.children + memory.passengers.infants;
  const hasNonDefaultTravelers = totalTravelers !== 1 || memory.passengers.children > 0 || memory.passengers.infants > 0;
  const tripTypeLabel = memory.tripType === "roundtrip"
    ? t("planner.tripType.roundtrip", "A/R")
    : memory.tripType === "oneway"
      ? t("planner.tripType.oneway", "Aller simple")
      : t("planner.tripType.multi", "Multi");

  // Only show when at least one field has been filled
  const hasDestination = !!destination;
  const hasDates = !!depDate;
  const hasTravelers = hasNonDefaultTravelers;
  const hasTripType = memory.tripType !== "roundtrip"; // default is roundtrip, only show when changed

  if (!hasDestination && !hasDates && !hasTravelers && !hasTripType) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 max-w-3xl mx-auto">
      <Chip active={hasDestination} icon={<MapPin className="h-3 w-3" />}>
        {destination || t("planner.status.destination", "Destination")}
      </Chip>
      <Chip active={hasDates} icon={<Calendar className="h-3 w-3" />}>
        {depDate
          ? retDate
            ? `${depDate} → ${retDate}`
            : depDate
          : t("planner.status.dates", "Dates")}
      </Chip>
      {hasTravelers && (
        <Chip active icon={<Users className="h-3 w-3" />}>
          {`${totalTravelers} ${t("planner.status.travelers", "voyageur")}${totalTravelers > 1 ? "s" : ""}`}
        </Chip>
      )}
      {hasTripType && (
        <Chip active icon={<Plane className="h-3 w-3" />}>
          {tripTypeLabel}
        </Chip>
      )}
    </div>
  );
});

function Chip({
  active,
  icon,
  children,
}: {
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-muted/50 text-muted-foreground border border-transparent"
      )}
    >
      {icon}
      {children}
    </span>
  );
}
