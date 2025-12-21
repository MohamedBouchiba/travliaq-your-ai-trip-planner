import { useState } from "react";
import { Plus, X, CalendarDays } from "lucide-react";
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
  const [showCalendar, setShowCalendar] = useState(false);
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

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from) {
      onDepartureChange({ ...departure, date: range.from });
    }
    if (range.to) {
      onArrivalChange({ ...arrival, date: range.to });
      setShowCalendar(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Departure */}
      <input
        type="text"
        value={departure.city}
        onChange={(e) => onDepartureChange({ ...departure, city: e.target.value })}
        placeholder="Départ"
        className="w-full px-2.5 py-2 rounded-lg border border-border/40 bg-muted/20 text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
      />

      {/* Arrival */}
      <input
        type="text"
        value={arrival.city}
        onChange={(e) => onArrivalChange({ ...arrival, city: e.target.value })}
        placeholder="Arrivée"
        className="w-full px-2.5 py-2 rounded-lg border border-border/40 bg-muted/20 text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
      />

      {/* Date range selector */}
      <button
        onClick={() => {
          setShowCalendar(!showCalendar);
          setActiveStopCalendar(null);
        }}
        className={cn(
          "w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs transition-all",
          showCalendar
            ? "border-primary bg-primary/10"
            : "border-border/40 bg-muted/20 hover:bg-muted/40"
        )}
      >
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={departure.date ? "text-foreground" : "text-muted-foreground"}>
            {departure.date ? format(departure.date, "d MMM", { locale: fr }) : "Aller"}
          </span>
        </div>
        <span className="text-muted-foreground">→</span>
        <span className={arrival.date ? "text-foreground" : "text-muted-foreground"}>
          {arrival.date ? format(arrival.date, "d MMM", { locale: fr }) : "Retour"}
        </span>
      </button>

      {showCalendar && (
        <div className="p-2 rounded-lg border border-border/40 bg-card">
          <PlannerCalendar
            dateRange={{ from: departure.date, to: arrival.date }}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      )}

      {/* Additional stops */}
      {stops.map((stop) => (
        <div key={stop.id} className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={stop.city}
              onChange={(e) => updateStop(stop.id, { city: e.target.value })}
              placeholder="Destination"
              className="flex-1 px-2.5 py-2 rounded-lg border border-border/40 bg-muted/20 text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-primary/5 focus:outline-none transition-all"
            />
            <button
              onClick={() => {
                setActiveStopCalendar(activeStopCalendar === stop.id ? null : stop.id);
                setShowCalendar(false);
              }}
              className={cn(
                "px-2.5 py-2 rounded-lg border text-xs transition-all shrink-0",
                activeStopCalendar === stop.id
                  ? "border-primary bg-primary/10"
                  : "border-border/40 bg-muted/20 hover:bg-muted/40"
              )}
            >
              <span className={stop.date ? "text-foreground" : "text-muted-foreground"}>
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

      {/* Add stop - subtle plus button */}
      {stops.length < maxStops && (
        <button
          onClick={addStop}
          className="h-6 w-6 rounded-full border border-dashed border-border/50 flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all mx-auto"
          title="Ajouter une destination"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
