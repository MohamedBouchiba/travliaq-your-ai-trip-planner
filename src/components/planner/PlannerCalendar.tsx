import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Cloud, Sun, CloudRain, ChevronDown, CalendarDays, Plane, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";

interface DayData {
  price?: number;
  weather?: "sunny" | "cloudy" | "rainy";
  temp?: number;
}

interface DateRange {
  from?: Date;
  to?: Date;
}

interface PlannerCalendarProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  dayData?: Record<string, DayData>;
}

// Mock data for demo
const generateMockData = (month: Date): Record<string, DayData> => {
  const data: Record<string, DayData> = {};
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  let current = start;

  while (current <= end) {
    const key = format(current, "yyyy-MM-dd");
    const dayOfMonth = current.getDate();
    
    const priceBase = 80 + (dayOfMonth % 7) * 15 + (dayOfMonth % 3) * 10;
    const weatherOptions: ("sunny" | "cloudy" | "rainy")[] = ["sunny", "cloudy", "rainy"];
    const weatherIndex = (dayOfMonth + current.getMonth()) % 3;
    
    data[key] = {
      price: priceBase,
      weather: weatherOptions[weatherIndex],
      temp: 15 + (dayOfMonth % 10),
    };
    
    current = addDays(current, 1);
  }
  
  return data;
};

const WeatherIcon = ({ weather, className }: { weather: "sunny" | "cloudy" | "rainy"; className?: string }) => {
  switch (weather) {
    case "sunny":
      return <Sun className={cn("text-amber-500", className)} />;
    case "cloudy":
      return <Cloud className={cn("text-slate-400", className)} />;
    case "rainy":
      return <CloudRain className={cn("text-blue-400", className)} />;
  }
};

export default function PlannerCalendar({
  dateRange,
  onDateRangeChange,
  dayData: externalDayData,
}: PlannerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPrices, setShowPrices] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectingReturn, setSelectingReturn] = useState(false);

  const dayData = useMemo(() => {
    return externalDayData || generateMockData(currentMonth);
  }, [currentMonth, externalDayData]);

  const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const getCheapestDay = () => {
    let cheapest: { date: string; price: number } | null = null;
    Object.entries(dayData).forEach(([date, data]) => {
      if (data.price && (!cheapest || data.price < cheapest.price)) {
        cheapest = { date, price: data.price };
      }
    });
    return cheapest?.date;
  };

  const cheapestDay = showPrices ? getCheapestDay() : null;

  const handleDateClick = (day: Date) => {
    if (!dateRange?.from || selectingReturn) {
      // Selecting return date
      if (dateRange?.from && isAfter(day, dateRange.from)) {
        onDateRangeChange({ from: dateRange.from, to: day });
        setSelectingReturn(false);
        setIsExpanded(false);
      } else {
        // Reset and start new selection
        onDateRangeChange({ from: day, to: undefined });
        setSelectingReturn(true);
      }
    } else {
      // Selecting departure date
      onDateRangeChange({ from: day, to: undefined });
      setSelectingReturn(true);
    }
  };

  const isInRange = (day: Date) => {
    if (!dateRange?.from || !dateRange?.to) return false;
    return isWithinInterval(day, { start: dateRange.from, end: dateRange.to });
  };

  const hasSelection = dateRange?.from && dateRange?.to;

  // Collapsed view
  if (!isExpanded && hasSelection) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full p-3 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plane className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-xs text-muted-foreground">Aller</div>
                <div className="text-sm font-medium text-foreground">
                  {format(dateRange.from!, "d MMM", { locale: fr })}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plane className="h-4 w-4 text-primary rotate-180" />
              </div>
              <div className="text-left">
                <div className="text-xs text-muted-foreground">Retour</div>
                <div className="text-sm font-medium text-foreground">
                  {format(dateRange.to!, "d MMM", { locale: fr })}
                </div>
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Selection indicator */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
        <CalendarDays className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">
          {!dateRange?.from
            ? "Sélectionnez une date de départ"
            : !dateRange?.to
            ? "Sélectionnez une date de retour"
            : "Dates sélectionnées"}
        </span>
      </div>

      {/* Display options - Checkboxes */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setShowPrices(!showPrices)}
            className={cn(
              "h-4 w-4 rounded border transition-all flex items-center justify-center",
              showPrices
                ? "bg-primary border-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            {showPrices && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          <span className="text-xs text-foreground">Prix</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setShowWeather(!showWeather)}
            className={cn(
              "h-4 w-4 rounded border transition-all flex items-center justify-center",
              showWeather
                ? "bg-primary border-primary"
                : "border-border hover:border-primary/50"
            )}
          >
            {showWeather && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          <span className="text-xs text-foreground">Météo</span>
        </label>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <button
          onClick={goToNextMonth}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const data = dayData[dateKey];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isStart = dateRange?.from && isSameDay(day, dateRange.from);
          const isEnd = dateRange?.to && isSameDay(day, dateRange.to);
          const inRange = isInRange(day);
          const isDayToday = isToday(day);
          const isPast = isBefore(day, new Date()) && !isDayToday;
          const isCheapest = dateKey === cheapestDay;

          return (
            <button
              key={dateKey}
              onClick={() => !isPast && isCurrentMonth && handleDateClick(day)}
              disabled={isPast || !isCurrentMonth}
              className={cn(
                "relative flex flex-col items-center justify-center py-1 rounded-md transition-all",
                (showPrices || showWeather) ? "min-h-[44px]" : "min-h-[36px]",
                !isCurrentMonth && "opacity-0 pointer-events-none",
                isPast && "opacity-30 cursor-not-allowed",
                isCurrentMonth && !isPast && "hover:bg-muted/50 cursor-pointer",
                inRange && !isStart && !isEnd && "bg-primary/10",
                (isStart || isEnd) && "bg-primary text-primary-foreground",
                isStart && "rounded-l-lg",
                isEnd && "rounded-r-lg",
                isDayToday && !isStart && !isEnd && "ring-1 ring-primary/50",
                isCheapest && !isStart && !isEnd && "bg-emerald-500/10"
              )}
            >
              {/* Date */}
              <span
                className={cn(
                  "text-xs font-medium",
                  (isStart || isEnd) ? "text-primary-foreground" : "text-foreground",
                  isCheapest && !isStart && !isEnd && "text-emerald-600"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Price and/or Weather */}
              {isCurrentMonth && data && (showPrices || showWeather) && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {showPrices && data.price && (
                    <span
                      className={cn(
                        "text-[8px] font-medium",
                        (isStart || isEnd)
                          ? "text-primary-foreground/80"
                          : isCheapest
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {data.price}€
                    </span>
                  )}
                  {showWeather && data.weather && (
                    <WeatherIcon weather={data.weather} className="h-2.5 w-2.5" />
                  )}
                </div>
              )}

              {/* Cheapest indicator */}
              {isCheapest && !isStart && !isEnd && showPrices && (
                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {(showPrices || showWeather) && (
        <div className="flex items-center justify-center gap-3 pt-2 border-t border-border/30">
          {showPrices && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Meilleur prix</span>
            </div>
          )}
          {showWeather && (
            <>
              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Sun className="h-2.5 w-2.5 text-amber-500" />
              </div>
              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <Cloud className="h-2.5 w-2.5 text-slate-400" />
              </div>
              <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <CloudRain className="h-2.5 w-2.5 text-blue-400" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Confirm button when dates selected */}
      {hasSelection && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          Confirmer les dates
        </button>
      )}
    </div>
  );
}
