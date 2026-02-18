/**
 * TripStatusBar - Compact bar showing confirmed trip parameters as chips
 *
 * Displayed above the chat input when at least one field is confirmed.
 * Chips: destination, dates, travelers, trip type.
 */

import { memo } from "react";
import { MapPin, Calendar, Users, Plane } from "lucide-react";
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

  // Only render chips that have REAL data — no placeholders
  const chips = [];
  if (hasDestination) chips.push(
    <Chip key="dest" icon={<MapPin className="h-3 w-3" />}>{destination}</Chip>
  );
  if (hasDates) chips.push(
    <Chip key="dates" icon={<Calendar className="h-3 w-3" />}>
      {retDate ? `${depDate} → ${retDate}` : depDate}
    </Chip>
  );
  if (hasTravelers) chips.push(
    <Chip key="travelers" icon={<Users className="h-3 w-3" />}>
      {`${totalTravelers} ${t("planner.status.travelers", "voyageur")}${totalTravelers > 1 ? "s" : ""}`}
    </Chip>
  );
  if (hasTripType) chips.push(
    <Chip key="triptype" icon={<Plane className="h-3 w-3" />}>{tripTypeLabel}</Chip>
  );

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 max-w-3xl mx-auto">
      {chips}
    </div>
  );
});

function Chip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
    >
      {icon}
      {children}
    </span>
  );
}
