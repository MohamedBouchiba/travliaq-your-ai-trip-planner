/**
 * DateRangePickerWidget - Inline calendar for departure + return date selection
 */

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parsePreferredMonth } from "../types";

interface DateRangePickerWidgetProps {
  onConfirm: (departure: Date, returnDate: Date) => void;
  tripDuration?: string; // e.g. "une semaine", "3 jours"
  preferredMonth?: string; // e.g. "février", "summer"
}

export function DateRangePickerWidget({
  onConfirm,
  tripDuration,
  preferredMonth,
}: DateRangePickerWidgetProps) {
  // Determine initial month from preferredMonth
  const getInitialMonth = () => {
    const parsed = parsePreferredMonth(preferredMonth);
    if (parsed) return startOfMonth(parsed);
    return startOfMonth(new Date());
  };

  const [baseMonth, setBaseMonth] = useState<Date>(getInitialMonth());
  const [confirmed, setConfirmed] = useState(false);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [selectingReturn, setSelectingReturn] = useState(false);

  const weekStartsOn = 1;
  const weekDayLabels = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);

  const getMonthDays = () => {
    const start = startOfWeek(startOfMonth(baseMonth), { weekStartsOn });
    const end = endOfWeek(endOfMonth(baseMonth), { weekStartsOn });
    const days: Date[] = [];
    let cur = start;
    while (cur <= end) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  };

  const days = getMonthDays();

  // Calculate suggested return date from trip duration
  const getSuggestedReturnDate = (departure: Date): Date | null => {
    if (!tripDuration) return null;
    const match = tripDuration.match(/(\d+)\s*(semaine|jour|week|day)/i);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let daysToAdd = num;
      if (unit.includes("semaine") || unit.includes("week")) {
        daysToAdd = num * 7;
      }
      return addDays(departure, daysToAdd);
    }
    // Handle "une semaine" without number
    if (tripDuration.toLowerCase().includes("semaine") || tripDuration.toLowerCase().includes("week")) {
      return addDays(departure, 7);
    }
    return null;
  };

  const handleDayClick = (day: Date) => {
    const isDisabled = isBefore(day, tomorrow);
    if (isDisabled) return;

    if (!departureDate || (departureDate && returnDate)) {
      // Start fresh selection
      setDepartureDate(day);
      setReturnDate(null);
      setSelectingReturn(true);

      // Auto-suggest return date if we have trip duration
      const suggested = getSuggestedReturnDate(day);
      if (suggested) {
        setReturnDate(suggested);
        setSelectingReturn(false);
      }
    } else if (selectingReturn) {
      // Selecting return date
      if (isBefore(day, departureDate)) {
        // User clicked before departure, swap
        setReturnDate(departureDate);
        setDepartureDate(day);
      } else {
        setReturnDate(day);
      }
      setSelectingReturn(false);
    }
  };

  const handleConfirm = () => {
    if (departureDate && returnDate) {
      setConfirmed(true);
      onConfirm(departureDate, returnDate);
    }
  };

  const isInRange = (day: Date) => {
    if (!departureDate || !returnDate) return false;
    return day > departureDate && day < returnDate;
  };

  if (confirmed && departureDate && returnDate) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <CalendarIcon className="h-4 w-4" />
        <span>{format(departureDate, "d MMM", { locale: fr })} → {format(returnDate, "d MMM yyyy", { locale: fr })}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-xs">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {selectingReturn ? "Sélectionnez le retour" : "Sélectionnez le départ"}
      </div>

      {/* Selected dates indicator */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <div className={cn(
          "flex-1 px-3 py-1.5 rounded-lg border text-center transition-all",
          departureDate ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"
        )}>
          {departureDate ? format(departureDate, "d MMM", { locale: fr }) : "Départ"}
        </div>
        <span className="text-muted-foreground">→</span>
        <div className={cn(
          "flex-1 px-3 py-1.5 rounded-lg border text-center transition-all",
          returnDate ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"
        )}>
          {returnDate ? format(returnDate, "d MMM", { locale: fr }) : "Retour"}
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, -1))}
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {format(baseMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, 1))}
        >
          ›
        </button>
      </div>

      {/* Week day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((lbl, idx) => (
          <div key={idx} className="text-center text-[10px] text-muted-foreground font-medium">
            {lbl}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, baseMonth);
          const isDeparture = departureDate && isSameDay(day, departureDate);
          const isReturn = returnDate && isSameDay(day, returnDate);
          const inRange = isInRange(day);
          const isToday = isSameDay(day, today);
          const isDisabled = isBefore(day, tomorrow);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={cn(
                "aspect-square w-9 h-9 flex items-center justify-center rounded-lg text-xs transition-all",
                "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
                !inMonth && "text-muted-foreground/30",
                inRange && "bg-primary/15",
                isDeparture && "bg-primary text-primary-foreground font-semibold shadow-md",
                isReturn && "bg-primary text-primary-foreground font-semibold shadow-md",
                isToday && !isDeparture && !isReturn && "text-primary/60 bg-primary/5",
                isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!departureDate || !returnDate}
        className={cn(
          "w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-all",
          departureDate && returnDate
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {departureDate && returnDate
          ? `Confirmer : ${format(departureDate, "d MMM", { locale: fr })} → ${format(returnDate, "d MMM", { locale: fr })}`
          : selectingReturn
            ? "Sélectionnez la date de retour"
            : "Sélectionnez la date de départ"
        }
      </button>
    </div>
  );
}
