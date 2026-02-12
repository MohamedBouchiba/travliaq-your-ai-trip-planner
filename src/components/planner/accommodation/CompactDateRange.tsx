import { useState } from "react";
import { CalendarDays, X, Link2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { differenceInDays, format } from "date-fns";
import { useLocale } from "@/hooks/useLocale";
import RangeCalendar from "@/components/RangeCalendar";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";

// Compact date range with inline style matching destination input
export function CompactDateRange({
  checkIn,
  checkOut,
  onChange,
  isSyncedWithFlight = false,
}: {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
  isSyncedWithFlight?: boolean;
}) {
  const { t } = useTranslation();
  const { dateFnsLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const handleRangeChange = (range: DateRange | undefined) => {
    onChange(range?.from || null, range?.to || null);
    // Auto-close when complete range selected
    if (range?.from && range.to && range.from.getTime() !== range.to.getTime()) {
      setTimeout(() => setIsOpen(false), 300);
    }
  };

  const value: DateRange | undefined = checkIn ? { from: checkIn, to: checkOut || undefined } : undefined;

  const formatDateCompact = (date: Date) => {
    return format(date, "dd MMM", { locale: dateFnsLocale });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 text-sm min-w-0" title={isSyncedWithFlight ? t("planner.accommodation.dates.syncedWithFlight") : undefined}>
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          {checkIn && checkOut ? (
            <span className="truncate text-foreground flex items-center gap-1">
              {formatDateCompact(checkIn)} → {formatDateCompact(checkOut)}
              <span className="text-muted-foreground">({nights}n)</span>
              {isSyncedWithFlight && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link2 className="h-3 w-3 text-primary/70 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{t("planner.accommodation.dates.syncedWithFlight")}</p>
                      <p className="text-muted-foreground">{t("planner.accommodation.dates.canModify")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
          ) : checkIn ? (
            <span className="truncate text-foreground flex items-center gap-1">
              {formatDateCompact(checkIn)} → <span className="text-muted-foreground">{t("planner.accommodation.dates.return")}</span>
              {isSyncedWithFlight && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link2 className="h-3 w-3 text-primary/70 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>{t("planner.accommodation.dates.arrivalSynced")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{t("planner.accommodation.dates.stayDates")}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" side="bottom" sideOffset={8}>
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/50">
          <span className="text-sm font-medium">
            {!checkIn && t("planner.accommodation.dates.selectDates")}
            {checkIn && !checkOut && t("planner.accommodation.dates.selectReturn")}
            {checkIn && checkOut && (nights > 1
              ? t("planner.accommodation.dates.nightsSelectedPlural", { count: nights })
              : t("planner.accommodation.dates.nightsSelected", { count: nights })
            )}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-3">
          <RangeCalendar
            value={value}
            onChange={handleRangeChange}
            disabled={(date) => date < new Date()}
            locale={dateFnsLocale}
            weekStartsOn={1}
            className="pointer-events-auto"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
