/**
 * DatePickerWidget - Inline calendar for date selection
 * Now syncs with Zustand store on confirmation
 * Fully i18n-enabled with locale-aware formatting
 */

import { useState, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarIcon } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { parsePreferredMonth } from "../types";
import { usePlannerStoreV2 } from "@/stores/plannerStoreV2";
import { useLocale } from "@/hooks/useLocale";

interface DatePickerWidgetProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  preferredMonth?: string;
  /** Which date field to sync: 'departure' or 'return' */
  dateField?: "departure" | "return";
  /** If true, skip syncing to Zustand */
  skipStoreSync?: boolean;
}

export const DatePickerWidget = memo(function DatePickerWidget({
  label,
  value,
  onChange,
  minDate,
  preferredMonth,
  dateField,
  skipStoreSync = false,
}: DatePickerWidgetProps) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const setDepartureDate = usePlannerStoreV2((s) => s.setDepartureDate);
  const setReturnDate = usePlannerStoreV2((s) => s.setReturnDate);
  
  // Determine initial month: preferredMonth > value > minDate > today
  const getInitialMonth = () => {
    const parsed = parsePreferredMonth(preferredMonth);
    if (parsed) return startOfMonth(parsed);
    if (value) return startOfMonth(value);
    if (minDate) return startOfMonth(minDate);
    return startOfMonth(new Date());
  };

  const [baseMonth, setBaseMonth] = useState<Date>(getInitialMonth());
  const [confirmed, setConfirmed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value);

  const weekStartsOn = 1; // Monday
  
  // Get weekday labels from i18n
  const weekDayLabels = useMemo(() => {
    return t("planner.datePicker.weekdays").split(",");
  }, [t]);

  // Get days for the current month
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDayClick = (day: Date) => {
    const minCheck = minDate ? startOfDay(minDate) : startOfDay(addDays(today, 1)); // Tomorrow minimum
    const isDisabled = isBefore(day, minCheck);
    if (isDisabled) return;
    setSelectedDate(day);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      setConfirmed(true);
      // Sync to Zustand store
      if (!skipStoreSync && dateField) {
        if (dateField === "departure") {
          setDepartureDate(selectedDate);
        } else if (dateField === "return") {
          setReturnDate(selectedDate);
        }
      }
      onChange(selectedDate);
    }
  };

  if (confirmed && selectedDate) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <CalendarIcon className="h-4 w-4" />
        <span>{format(selectedDate, "d MMMM yyyy", { locale: dateFnsLocale })}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-xs">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {label}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, -1))}
          aria-label={t("planner.datePicker.previousMonth")}
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {format(baseMonth, "MMMM yyyy", { locale: dateFnsLocale })}
        </span>
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, 1))}
          aria-label={t("planner.datePicker.nextMonth")}
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
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const minCheck = minDate ? startOfDay(minDate) : startOfDay(addDays(today, 1));
          const isDisabled = isBefore(day, minCheck);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              aria-label={format(day, "d MMMM yyyy", { locale: dateFnsLocale })}
              aria-selected={!!isSelected}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "aspect-square w-9 h-9 flex items-center justify-center rounded-lg text-xs transition-all",
                "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
                !inMonth && "text-muted-foreground/30",
                isSelected && "bg-primary text-primary-foreground font-semibold shadow-md",
                isToday && !isSelected && "text-primary/60 bg-primary/5",
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
        disabled={!selectedDate}
        className={cn(
          "w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-all",
          selectedDate
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {selectedDate 
          ? t("planner.datePicker.confirmDate", { date: format(selectedDate, "d MMMM", { locale: dateFnsLocale }) })
          : t("planner.datePicker.selectDate")
        }
      </button>
    </div>
  );
});
