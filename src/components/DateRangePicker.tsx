import * as React from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import RangeCalendar from "@/components/RangeCalendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  disabled?: (date: Date) => boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  disabled,
  open,
  onOpenChange,
  className,
}: DateRangePickerProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? fr : enUS;
  const hasFrom = !!value?.from;
  const hasTo = !!value?.to;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full h-14 justify-start text-left font-normal text-base",
            !hasFrom && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          {hasFrom && hasTo ? (
            <span className="truncate">
              {format(value!.from!, "dd MMM yyyy", { locale })} → {format(value!.to!, "dd MMM yyyy", { locale })}
            </span>
          ) : hasFrom ? (
            <span className="truncate">{format(value!.from!, "dd MMMM yyyy", { locale })} - {t('questionnaire.dates.pickReturn')}</span>
          ) : (
            <span className="truncate">{t('questionnaire.dates.selectDates')}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 md:p-6 max-w-[95vw]" align="center" side="top" sideOffset={10}>
        <div className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4 px-2">
          {!hasFrom && t('questionnaire.dates.pickDeparture')}
          {hasFrom && !hasTo && t('questionnaire.dates.pickReturn')}
          {hasFrom && hasTo && t('questionnaire.dates.selectedMsg')}
        </div>
        <RangeCalendar
          value={value}
          onChange={(range) => {
            onChange?.(range);
            if (range?.from && range.to && range.from.getTime() !== range.to.getTime()) {
              setTimeout(() => onOpenChange?.(false), 300);
            }
          }}
          disabled={disabled}
          locale={locale}
          weekStartsOn={1}
          className={cn("pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
