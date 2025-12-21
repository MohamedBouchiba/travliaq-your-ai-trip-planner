import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Cloud, Sun, CloudRain } from "lucide-react";
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
} from "date-fns";
import { fr } from "date-fns/locale";

type DisplayMode = "prices" | "weather";

interface DayData {
  price?: number;
  weather?: "sunny" | "cloudy" | "rainy";
  temp?: number;
}

interface PlannerCalendarProps {
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  displayMode?: DisplayMode;
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
    
    // Generate semi-random but consistent data
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
  selectedDate,
  onSelectDate,
  displayMode = "prices",
  dayData: externalDayData,
}: PlannerCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [mode, setMode] = useState<DisplayMode>(displayMode);

  const dayData = useMemo(() => {
    return externalDayData || generateMockData(currentMonth);
  }, [currentMonth, externalDayData]);

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

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

  const cheapestDay = getCheapestDay();

  return (
    <div className="w-full">
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 mb-3 p-1 bg-muted/40 rounded-lg">
        <button
          onClick={() => setMode("prices")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all",
            mode === "prices"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Prix
        </button>
        <button
          onClick={() => setMode("weather")}
          className={cn(
            "flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all",
            mode === "weather"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Météo
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <button
          onClick={goToNextMonth}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const data = dayData[dateKey];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isDayToday = isToday(day);
          const isPast = isBefore(day, new Date()) && !isDayToday;
          const isCheapest = dateKey === cheapestDay && mode === "prices";

          return (
            <button
              key={dateKey}
              onClick={() => !isPast && isCurrentMonth && onSelectDate(day)}
              disabled={isPast || !isCurrentMonth}
              className={cn(
                "relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-all min-h-[52px]",
                !isCurrentMonth && "opacity-0 pointer-events-none",
                isPast && "opacity-40 cursor-not-allowed",
                isCurrentMonth && !isPast && "hover:bg-muted/50 cursor-pointer",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                isDayToday && !isSelected && "ring-1 ring-primary/50",
                isCheapest && !isSelected && "bg-emerald-500/10 ring-1 ring-emerald-500/50"
              )}
            >
              {/* Date */}
              <span
                className={cn(
                  "text-sm font-medium",
                  !isCurrentMonth && "text-muted-foreground/30",
                  isSelected ? "text-primary-foreground" : "text-foreground",
                  isCheapest && !isSelected && "text-emerald-600"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Price or Weather */}
              {isCurrentMonth && data && (
                <div className="mt-0.5">
                  {mode === "prices" && data.price && (
                    <span
                      className={cn(
                        "text-[9px] font-medium",
                        isSelected
                          ? "text-primary-foreground/80"
                          : isCheapest
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      )}
                    >
                      {data.price}€
                    </span>
                  )}
                  {mode === "weather" && data.weather && (
                    <div className="flex items-center gap-0.5">
                      <WeatherIcon weather={data.weather} className="h-3 w-3" />
                      {data.temp && (
                        <span
                          className={cn(
                            "text-[9px]",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {data.temp}°
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cheapest indicator */}
              {isCheapest && !isSelected && (
                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-border/30">
        {mode === "prices" ? (
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Meilleur prix</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Sun className="h-3 w-3 text-amber-500" />
              <span>Ensoleillé</span>
            </div>
            <div className="flex items-center gap-1">
              <Cloud className="h-3 w-3 text-slate-400" />
              <span>Nuageux</span>
            </div>
            <div className="flex items-center gap-1">
              <CloudRain className="h-3 w-3 text-blue-400" />
              <span>Pluie</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
