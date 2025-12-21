import { useState } from "react";
import { Plus, X, CalendarDays, ChevronDown } from "lucide-react";
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
  departure: { city: string; date?: Date };
  arrival: { city: string; date?: Date };
  stops: FlightLeg[];
  onDepartureChange: (data: { city: string; date?: Date }) => void;
  onArrivalChange: (data: { city: string; date?: Date }) => void;
  onStopsChange: (stops: FlightLeg[]) => void;
  maxStops?: number;
}

export default function FlightRouteBuilder({
  departure,
  arrival,
  stops,
  onDepartureChange,
  onArrivalChange,
  onStopsChange,
  maxStops = 2,
}: FlightRouteBuilderProps) {
  const [showDepartureCalendar, setShowDepartureCalendar] = useState(false);
  const [showArrivalCalendar, setShowArrivalCalendar] = useState(false);
  const [activeStopCalendar, setActiveStopCalendar] = useState<string | null>(null);

  const addStop = () => {
    if (stops.length >= maxStops) return;
    onStopsChange([
      ...stops,
      { id: crypto.randomUUID(), city: "", date: undefined },
    ]);
  };

  const removeStop = (id: string) => {
    onStopsChange(stops.filter((s) => s.id !== id));
  };

  const updateStop = (id: string, updates: Partial<FlightLeg>) => {
    onStopsChange(
      stops.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  return (
    <div className="space-y-3">
      {/* Departure */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={departure.city}
            onChange={(e) => onDepartureChange({ ...departure, city: e.target.value })}
            placeholder="Ville de départ"
            className="flex-1 px-2.5 py-2 rounded-lg border border-border/40 bg-muted/20 text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
          />
          <button
            onClick={() => {
              setShowDepartureCalendar(!showDepartureCalendar);
              setShowArrivalCalendar(false);
              setActiveStopCalendar(null);
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs transition-all shrink-0",
              showDepartureCalendar
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/40 bg-muted/20 hover:bg-muted/40"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className={departure.date ? "text-foreground font-medium" : "text-muted-foreground"}>
              {departure.date ? format(departure.date, "d MMM", { locale: fr }) : "Aller"}
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", showDepartureCalendar && "rotate-180")} />
          </button>
        </div>
        {showDepartureCalendar && (
          <div className="p-2 rounded-lg border border-border/40 bg-card">
            <PlannerCalendar
              dateRange={{ from: departure.date, to: departure.date }}
              onDateRangeChange={(range) => {
                if (range.from) {
                  onDepartureChange({ ...departure, date: range.from });
                  setShowDepartureCalendar(false);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Intermediate stops */}
      {stops.map((stop) => (
        <div key={stop.id} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stop.city}
              onChange={(e) => updateStop(stop.id, { city: e.target.value })}
              placeholder="Destination intermédiaire"
              className="flex-1 px-2.5 py-2 rounded-lg border border-border/40 bg-muted/20 text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
            />
            <button
              onClick={() => {
                setActiveStopCalendar(activeStopCalendar === stop.id ? null : stop.id);
                setShowDepartureCalendar(false);
                setShowArrivalCalendar(false);
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs transition-all shrink-0",
                activeStopCalendar === stop.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/40 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className={stop.date ? "text-foreground font-medium" : "text-muted-foreground"}>
                {stop.date ? format(stop.date, "d MMM", { locale: fr }) : "Date"}
              </span>
            </button>
            <button
              onClick={() => removeStop(stop.id)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {activeStopCalendar === stop.id && (
            <div className="p-2 rounded-lg border border-border/40 bg-card">
              <PlannerCalendar
                dateRange={{ from: stop.date, to: stop.date }}
                onDateRangeChange={(range) => {
                  if (range.from) {
                    updateStop(stop.id, { date: range.from });
                    setActiveStopCalendar(null);
                  }
                }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Add stop button */}
      {stops.length < maxStops && (
        <button
          onClick={addStop}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="h-3 w-3" />
          <span>Ajouter une destination</span>
        </button>
      )}

      {/* Arrival */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={arrival.city}
            onChange={(e) => onArrivalChange({ ...arrival, city: e.target.value })}
            placeholder="Ville d'arrivée"
            className="flex-1 px-2.5 py-2 rounded-lg border border-border/40 bg-muted/20 text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
          />
          <button
            onClick={() => {
              setShowArrivalCalendar(!showArrivalCalendar);
              setShowDepartureCalendar(false);
              setActiveStopCalendar(null);
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs transition-all shrink-0",
              showArrivalCalendar
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/40 bg-muted/20 hover:bg-muted/40"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className={arrival.date ? "text-foreground font-medium" : "text-muted-foreground"}>
              {arrival.date ? format(arrival.date, "d MMM", { locale: fr }) : "Retour"}
            </span>
            <ChevronDown className={cn("h-3 w-3 transition-transform", showArrivalCalendar && "rotate-180")} />
          </button>
        </div>
        {showArrivalCalendar && (
          <div className="p-2 rounded-lg border border-border/40 bg-card">
            <PlannerCalendar
              dateRange={{ from: arrival.date, to: arrival.date }}
              onDateRangeChange={(range) => {
                if (range.from) {
                  onArrivalChange({ ...arrival, date: range.from });
                  setShowArrivalCalendar(false);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
