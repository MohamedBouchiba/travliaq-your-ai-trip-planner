import { useState } from "react";
import { Plus, X, CalendarDays, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

export default function FlightRouteBuilder({
  legs,
  onLegsChange,
  maxLegs = 4,
}: FlightRouteBuilderProps) {
  const updateLeg = (id: string, updates: Partial<FlightLeg>) => {
    onLegsChange(
      legs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg))
    );
  };

  const swapCities = (id: string) => {
    onLegsChange(
      legs.map((leg) =>
        leg.id === id ? { ...leg, from: leg.to, to: leg.from } : leg
      )
    );
  };

  const addLeg = () => {
    if (legs.length >= maxLegs) return;
    const lastLeg = legs[legs.length - 1];
    onLegsChange([
      ...legs,
      {
        id: crypto.randomUUID(),
        from: lastLeg?.to || "",
        to: "",
        date: undefined,
      },
    ]);
  };

  const removeLeg = (id: string) => {
    if (legs.length <= 1) return;
    onLegsChange(legs.filter((leg) => leg.id !== id));
  };

  return (
    <div className="space-y-2">
      {legs.map((leg, index) => (
        <div
          key={leg.id}
          className="flex items-center gap-1.5 p-2 rounded-lg border border-border/40 bg-muted/20"
        >
          {/* From city */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <input
              type="text"
              value={leg.from}
              onChange={(e) => updateLeg(leg.id, { from: e.target.value })}
              placeholder={index === 0 ? "D'où partez-vous ?" : "Départ"}
              className="flex-1 min-w-0 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Swap button */}
          <button
            onClick={() => swapCities(leg.id)}
            className="p-1 rounded-full border border-border/40 hover:bg-muted/40 transition-colors shrink-0"
          >
            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
          </button>

          {/* To city */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
            <input
              type="text"
              value={leg.to}
              onChange={(e) => updateLeg(leg.id, { to: e.target.value })}
              placeholder="Où allez-vous ?"
              className="flex-1 min-w-0 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Date picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded border border-border/40 hover:bg-muted/40 transition-colors shrink-0 text-xs",
                  leg.date ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <CalendarDays className="h-3 w-3" />
                <span className="whitespace-nowrap">
                  {leg.date
                    ? format(leg.date, "EEE d MMM", { locale: fr })
                    : "Date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={leg.date}
                onSelect={(date) => updateLeg(leg.id, { date: date || undefined })}
                locale={fr}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Remove button */}
          {legs.length > 1 && (
            <button
              onClick={() => removeLeg(leg.id)}
              className="p-1 hover:text-destructive transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      ))}

      {/* Add flight button */}
      {legs.length < maxLegs && (
        <button
          onClick={addLeg}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Ajouter un vol
        </button>
      )}
    </div>
  );
}
