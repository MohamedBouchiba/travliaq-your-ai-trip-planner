import { useState } from "react";
import { Plus, X, Plane, GripVertical, MapPin, CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PlannerCalendar from "./PlannerCalendar";

export interface FlightLeg {
  id: string;
  from: string;
  to: string;
  date?: Date;
}

interface FlightRouteBuilderProps {
  legs: FlightLeg[];
  onLegsChange: (legs: FlightLeg[]) => void;
  maxLegs?: number;
}

const popularCities = [
  { code: "PAR", name: "Paris", country: "France" },
  { code: "NYC", name: "New York", country: "États-Unis" },
  { code: "LON", name: "Londres", country: "Royaume-Uni" },
  { code: "BCN", name: "Barcelone", country: "Espagne" },
  { code: "ROM", name: "Rome", country: "Italie" },
  { code: "TYO", name: "Tokyo", country: "Japon" },
  { code: "DXB", name: "Dubaï", country: "Émirats" },
  { code: "BKK", name: "Bangkok", country: "Thaïlande" },
];

export default function FlightRouteBuilder({
  legs,
  onLegsChange,
  maxLegs = 4,
}: FlightRouteBuilderProps) {
  const [activeCalendarLegId, setActiveCalendarLegId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{ legId: string; field: "from" | "to" } | null>(null);

  const addLeg = () => {
    if (legs.length >= maxLegs) return;
    
    const lastLeg = legs[legs.length - 1];
    const newLeg: FlightLeg = {
      id: crypto.randomUUID(),
      from: lastLeg?.to || "",
      to: "",
      date: undefined,
    };
    onLegsChange([...legs, newLeg]);
  };

  const removeLeg = (id: string) => {
    if (legs.length <= 1) return;
    onLegsChange(legs.filter((leg) => leg.id !== id));
  };

  const updateLeg = (id: string, updates: Partial<FlightLeg>) => {
    onLegsChange(
      legs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg))
    );
  };

  const handleCitySelect = (legId: string, field: "from" | "to", cityName: string) => {
    updateLeg(legId, { [field]: cityName });
    setEditingField(null);
  };

  const handleDateSelect = (legId: string, date: Date) => {
    updateLeg(legId, { date });
    setActiveCalendarLegId(null);
  };

  const isFirstLeg = (index: number) => index === 0;
  const isLastLeg = (index: number) => index === legs.length - 1;

  return (
    <div className="space-y-3">
      {/* Route legs */}
      <div className="space-y-2">
        {legs.map((leg, index) => (
          <div key={leg.id} className="relative">
            {/* Connection line */}
            {index > 0 && (
              <div className="absolute left-[18px] -top-2 w-px h-2 bg-border" />
            )}
            
            <div className="flex items-stretch gap-2">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center pt-3">
                <div
                  className={cn(
                    "h-[10px] w-[10px] rounded-full border-2 z-10",
                    isFirstLeg(index)
                      ? "border-primary bg-primary"
                      : isLastLeg(index)
                      ? "border-primary bg-primary"
                      : "border-muted-foreground bg-background"
                  )}
                />
                {!isLastLeg(index) && (
                  <div className="flex-1 w-px bg-border mt-1" />
                )}
              </div>

              {/* Leg content */}
              <div className="flex-1 space-y-2">
                {/* Label */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    {isFirstLeg(index) ? "Départ" : isLastLeg(index) ? "Arrivée" : `Escale ${index}`}
                  </span>
                  {!isFirstLeg(index) && legs.length > 2 && (
                    <button
                      onClick={() => removeLeg(leg.id)}
                      className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* City and Date row */}
                <div className="flex items-center gap-2">
                  {/* City selector */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setEditingField({ legId: leg.id, field: isFirstLeg(index) ? "from" : "to" })}
                      className={cn(
                        "w-full flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left",
                        editingField?.legId === leg.id
                          ? "border-primary bg-primary/5"
                          : "border-border/50 bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className={cn(
                        "text-sm truncate",
                        (isFirstLeg(index) ? leg.from : leg.to)
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}>
                        {(isFirstLeg(index) ? leg.from : leg.to) || "Choisir une ville"}
                      </span>
                    </button>

                    {/* City dropdown */}
                    {editingField?.legId === leg.id && (
                      <div className="absolute top-full left-0 right-0 mt-1 p-1.5 rounded-lg bg-card border border-border shadow-lg z-20 max-h-[200px] overflow-y-auto">
                        {popularCities.map((city) => (
                          <button
                            key={city.code}
                            onClick={() => handleCitySelect(leg.id, editingField.field, city.name)}
                            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                          >
                            <span className="text-sm font-medium text-foreground">{city.name}</span>
                            <span className="text-xs text-muted-foreground">{city.country}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date selector */}
                  <button
                    onClick={() => setActiveCalendarLegId(activeCalendarLegId === leg.id ? null : leg.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all shrink-0",
                      activeCalendarLegId === leg.id
                        ? "border-primary bg-primary/5"
                        : "border-border/50 bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className={cn(
                      "text-sm",
                      leg.date ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {leg.date ? format(leg.date, "d MMM", { locale: fr }) : "Date"}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-muted-foreground transition-transform",
                      activeCalendarLegId === leg.id && "rotate-180"
                    )} />
                  </button>
                </div>

                {/* Inline calendar */}
                {activeCalendarLegId === leg.id && (
                  <div className="p-3 rounded-lg border border-border/50 bg-card/50">
                    <PlannerCalendar
                      dateRange={{ from: leg.date, to: leg.date }}
                      onDateRangeChange={(range) => {
                        if (range.from) {
                          handleDateSelect(leg.id, range.from);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add leg button */}
      {legs.length < maxLegs && (
        <button
          onClick={addLeg}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs font-medium">Ajouter une destination</span>
        </button>
      )}

      {/* Max legs indicator */}
      {legs.length >= 2 && (
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground">
            {legs.length}/{maxLegs} destinations
          </span>
        </div>
      )}
    </div>
  );
}
