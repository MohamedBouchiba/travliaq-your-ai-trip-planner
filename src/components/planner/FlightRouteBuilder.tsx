import { useState } from "react";
import { Plus, X, MapPin, CalendarDays, ChevronDown } from "lucide-react";
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

export default function FlightRouteBuilder({
  legs,
  onLegsChange,
  maxLegs = 4,
}: FlightRouteBuilderProps) {
  const [activeCalendarIndex, setActiveCalendarIndex] = useState<number | null>(null);

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

  const handleDateSelect = (index: number, date: Date) => {
    const leg = legs[index];
    if (leg) {
      updateLeg(leg.id, { date });
      setActiveCalendarIndex(null);
    }
  };

  const getPlaceholder = (index: number) => {
    if (index === 0) return "Départ";
    if (index === legs.length - 1) return "Arrivée";
    return `Destination ${index}`;
  };

  const getDateLabel = (index: number) => {
    if (index === 0) return "Aller";
    if (index === legs.length - 1) return "Retour";
    return "Départ";
  };

  const isMiddleLeg = (index: number) => index > 0 && index < legs.length - 1;
  const needsDate = (index: number) => index === 0 || index === legs.length - 1 || isMiddleLeg(index);

  return (
    <div className="space-y-2">
      {/* Legs */}
      {legs.map((leg, index) => (
        <div key={leg.id} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            {/* Timeline dot */}
            <div
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                index === 0
                  ? "bg-primary"
                  : index === legs.length - 1
                  ? "bg-primary"
                  : "bg-muted-foreground/50 ring-2 ring-muted-foreground/20"
              )}
            />

            {/* City input */}
            <input
              type="text"
              value={leg.city}
              onChange={(e) => updateLeg(leg.id, { city: e.target.value })}
              placeholder={getPlaceholder(index)}
              className={cn(
                "flex-1 px-2 py-1.5 rounded-md border text-xs transition-all bg-muted/20 placeholder:text-muted-foreground",
                "border-border/40 focus:border-primary focus:bg-primary/5 focus:outline-none"
              )}
            />

            {/* Date button - for departure, arrival, and intermediate stops */}
            {needsDate(index) && (
              <button
                onClick={() => setActiveCalendarIndex(activeCalendarIndex === index ? null : index)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs transition-all shrink-0",
                  activeCalendarIndex === index
                    ? "border-primary bg-primary/5"
                    : "border-border/40 bg-muted/20 hover:bg-muted/40"
                )}
              >
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <span className={cn(
                  leg.date ? "text-foreground" : "text-muted-foreground"
                )}>
                  {leg.date ? format(leg.date, "d MMM", { locale: fr }) : getDateLabel(index)}
                </span>
                <ChevronDown className={cn(
                  "h-2.5 w-2.5 text-muted-foreground transition-transform",
                  activeCalendarIndex === index && "rotate-180"
                )} />
              </button>
            )}

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

          {/* Inline calendar for this leg */}
          {activeCalendarIndex === index && (
            <div className="ml-3.5 p-2 rounded-md border border-border/40 bg-card">
              <PlannerCalendar
                dateRange={{ from: leg.date, to: leg.date }}
                onDateRangeChange={(range) => {
                  if (range.from) {
                    handleDateSelect(index, range.from);
                  }
                }}
              />
            </div>
          )}

          {/* Connection line */}
          {index < legs.length - 1 && activeCalendarIndex !== index && (
            <div className="ml-[3px] h-2 w-px bg-border/60" />
          )}
        </div>
      ))}

      {/* Add destination */}
      {legs.length < maxLegs && (
        <button
          onClick={addLeg}
          className="ml-3.5 flex items-center gap-1 py-1 text-muted-foreground hover:text-primary transition-colors text-[10px]"
        >
          <Plus className="h-2.5 w-2.5" />
          <span>Ajouter une destination</span>
        </button>
      )}
    </div>
  );
}
