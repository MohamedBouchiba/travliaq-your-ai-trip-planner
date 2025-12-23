import * as React from "react";
import { addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, isWithinInterval, format, isBefore, type Locale, type Day } from "date-fns";
import type { DateRange } from "react-day-picker";
import { fr as frLocale, enUS as enLocale } from "date-fns/locale";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export interface RangeCalendarProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
  disabled?: (date: Date) => boolean;
  locale?: Locale;
  weekStartsOn?: Day;
  className?: string;
}

function getMonthDays(monthDate: Date, weekStartsOn: Day) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

export const RangeCalendar: React.FC<RangeCalendarProps> = ({
  value,
  onChange,
  numberOfMonths,
  disabled,
  locale: customLocale,
  weekStartsOn = 1,
  className,
}) => {
  const { i18n } = useTranslation();
  const locale = customLocale || (i18n.language === 'fr' ? frLocale : enLocale);
  const [baseMonth, setBaseMonth] = React.useState<Date>(startOfMonth(new Date()));
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const displayMonths = numberOfMonths ?? (isMobile ? 1 : 2);

  const handleDayClick = (day: Date) => {
    if (disabled?.(day)) return;
    if (!value?.from || (value?.from && value?.to)) {
      onChange?.({ from: day, to: undefined });
    } else if (value.from && !value.to) {
      if (isBefore(day, value.from)) {
        onChange?.({ from: day, to: value.from });
      } else {
        onChange?.({ from: value.from, to: day });
      }
    }
  };

  const monthBlocks = Array.from({ length: displayMonths }).map((_, i) => {
    const month = addMonths(baseMonth, i);
    const days = getMonthDays(month, weekStartsOn);
    const weekDayLabels = Array.from({ length: 7 }).map((__, idx) => {
      const d = addDays(startOfWeek(new Date(), { weekStartsOn }), idx);
      return format(d, "EE", { locale }).slice(0, 2); // ex: lu, ma
    });

    return (
      <div key={i} className="space-y-3">
        <div className="text-center font-medium">{format(month, "MMMM yyyy", { locale })}</div>
        <div className="grid grid-cols-7 gap-2 text-center text-muted-foreground text-sm">
          {weekDayLabels.map((lbl, idx) => (
            <div key={idx}>{lbl}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const inMonth = isSameMonth(day, month);
            const isStart = value?.from && isSameDay(day, value.from);
            const isEnd = value?.to && isSameDay(day, value.to);
            const inRange = value?.from && value?.to && isWithinInterval(day, { start: value.from, end: value.to });
            const today = isSameDay(day, new Date());
            const isDisabled = disabled?.(day);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={isDisabled}
                className={cn(
                  "aspect-square w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg text-sm sm:text-base transition",
                  "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary",
                  !inMonth && "text-muted-foreground/40",
                  inRange && "bg-primary/20",
                  (isStart || isEnd) && "bg-primary text-primary-foreground font-semibold",
                  today && !isStart && !isEnd && "text-primary/60 bg-primary/5",
                  isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
                )}
              >
                {format(day, "d", { locale })}
              </button>
            );
          })}
        </div>
      </div>
    );
  });

  return (
    <div className={cn("p-3 pointer-events-auto", className)}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="h-8 w-8 rounded-md border border-border hover:bg-accent flex items-center justify-center"
          onClick={() => setBaseMonth(addMonths(baseMonth, -1))}
          aria-label={i18n.language === 'fr' ? "Mois précédent" : "Previous month"}
        >
          ‹
        </button>
        <button
          type="button"
          className="h-8 w-8 rounded-md border border-border hover:bg-accent flex items-center justify-center"
          onClick={() => setBaseMonth(addMonths(baseMonth, 1))}
          aria-label={i18n.language === 'fr' ? "Mois suivant" : "Next month"}
        >
          ›
        </button>
      </div>
      <div className={cn("grid gap-4 md:gap-6", displayMonths === 2 && "sm:grid-cols-2")}>{monthBlocks}</div>
    </div>
  );
};

export default RangeCalendar;
