import { useState } from "react";
import { Plus, X, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PlannerCalendar from "./PlannerCalendar";

export interface FlightLeg {
  id: string;
  city: string;
  date?: Date;
}

interface FlightRouteBuilderProps {
  legs: FlightLeg[];
  onLegsChange: (legs: FlightLeg[]) => void;
  maxLegs?: number;
}

const popularCities = [
  { code: "PAR", name: "Paris" },
  { code: "NYC", name: "New York" },
  { code: "LON", name: "Londres" },
  { code: "BCN", name: "Barcelone" },
  { code: "ROM", name: "Rome" },
  { code: "TYO", name: "Tokyo" },
  { code: "DXB", name: "Dubaï" },
  { code: "BKK", name: "Bangkok" },
];

export default function FlightRouteBuilder({
  legs,
  onLegsChange,
  maxLegs = 4,
}: FlightRouteBuilderProps) {
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const addLeg = () => {
    if (legs.length >= maxLegs) return;
    const newLeg: FlightLeg = {
      id: crypto.randomUUID(),
      city: "",
      date: undefined,
    };
    // Insert before last leg (arrival)
    const newLegs = [...legs];
    newLegs.splice(legs.length - 1, 0, newLeg);
    onLegsChange(newLegs);
  };

  const removeLeg = (id: string) => {
    if (legs.length <= 2) return;
    onLegsChange(legs.filter((leg) => leg.id !== id));
  };

  const updateLeg = (id: string, updates: Partial<FlightLeg>) => {
    onLegsChange(
      legs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg))
    );
  };

  const handleCitySelect = (legId: string, cityName: string) => {
    updateLeg(legId, { city: cityName });
    setEditingLegId(null);
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    if (legs.length >= 2) {
      const updatedLegs = [...legs];
      if (range.from) updatedLegs[0] = { ...updatedLegs[0], date: range.from };
      if (range.to) updatedLegs[updatedLegs.length - 1] = { ...updatedLegs[updatedLegs.length - 1], date: range.to };
      onLegsChange(updatedLegs);
    }
  };

  const getPlaceholder = (index: number) => {
    if (index === 0) return "Départ";
    if (index === legs.length - 1) return "Arrivée";
    return `Escale ${index}`;
  };

  const isMiddleLeg = (index: number) => index > 0 && index < legs.length - 1;

  return (
    <div className="space-y-2">
      {/* Legs */}
      {legs.map((leg, index) => (
        <div key={leg.id} className="relative flex items-center gap-1.5">
          {/* Timeline dot */}
          <div
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              index === 0
                ? "bg-primary"
                : index === legs.length - 1
                ? "bg-primary"
                : "bg-muted-foreground/50"
            )}
          />

          {/* City input */}
          <div className="relative flex-1">
            <button
              onClick={() => setEditingLegId(editingLegId === leg.id ? null : leg.id)}
              className={cn(
                "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-left text-xs transition-all",
                editingLegId === leg.id
                  ? "border-primary bg-primary/5"
                  : "border-border/40 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className={cn(
                "truncate",
                leg.city ? "text-foreground" : "text-muted-foreground"
              )}>
                {leg.city || getPlaceholder(index)}
              </span>
            </button>

            {/* City dropdown */}
            {editingLegId === leg.id && (
              <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-md bg-card border border-border shadow-lg z-20 max-h-[140px] overflow-y-auto">
                {popularCities.map((city) => (
                  <button
                    key={city.code}
                    onClick={() => handleCitySelect(leg.id, city.name)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="text-foreground">{city.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remove button for middle legs */}
          {isMiddleLeg(index) && (
            <button
              onClick={() => removeLeg(leg.id)}
              className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {/* Add destination */}
      {legs.length < maxLegs && (
        <button
          onClick={addLeg}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all text-xs"
        >
          <Plus className="h-3 w-3" />
          <span>Ajouter une escale</span>
        </button>
      )}

      {/* Date range selector */}
      <div className="pt-2 border-t border-border/30">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={cn(
            "w-full flex items-center justify-between px-2 py-1.5 rounded-md border text-xs transition-all",
            showCalendar
              ? "border-primary bg-primary/5"
              : "border-border/40 bg-muted/20 hover:bg-muted/40"
          )}
        >
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3 text-muted-foreground" />
            <span className={cn(
              dateRange.from ? "text-foreground" : "text-muted-foreground"
            )}>
              {dateRange.from
                ? format(dateRange.from, "d MMM", { locale: fr })
                : "Aller"}
            </span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              dateRange.to ? "text-foreground" : "text-muted-foreground"
            )}>
              {dateRange.to
                ? format(dateRange.to, "d MMM", { locale: fr })
                : "Retour"}
            </span>
            <CalendarDays className="h-3 w-3 text-muted-foreground" />
          </div>
        </button>

        {showCalendar && (
          <div className="mt-2">
            <PlannerCalendar
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
