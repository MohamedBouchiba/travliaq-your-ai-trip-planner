/**
 * Airport Selection Widgets
 */

import { useState } from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Airport } from "@/hooks/useNearestAirports";
import type { AirportChoice, DualAirportChoice, AirportConfirmationData, ConfirmedAirports } from "@/types/flight";

/**
 * AirportButton - Compact inline airport selection button
 */
export function AirportButton({
  airport,
  onClick,
  disabled,
}: {
  airport: Airport;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-left",
        "bg-card hover:bg-primary/10 hover:border-primary/50",
        "border-border/50 text-xs w-full",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="font-bold text-primary text-sm">{airport.iata}</span>
      <span className="flex-1 truncate text-foreground">{airport.city_name || airport.name.split(" ")[0]}</span>
      <span className="text-muted-foreground text-[10px] shrink-0">{airport.distance_km.toFixed(0)}km</span>
    </button>
  );
}

/**
 * DualAirportSelection - Side-by-side departure/arrival airport selection
 */
export function DualAirportSelection({
  choices,
  onSelect,
  disabled,
}: {
  choices: DualAirportChoice;
  onSelect: (field: "from" | "to", airport: Airport) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {choices.from && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="text-primary">✈</span> Départ · {choices.from.cityName}
          </div>
          <div className="space-y-1">
            {choices.from.airports.map((airport) => (
              <AirportButton
                key={airport.iata}
                airport={airport}
                onClick={() => onSelect("from", airport)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
      {choices.to && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="text-primary">🛬</span> Arrivée · {choices.to.cityName}
          </div>
          <div className="space-y-1">
            {choices.to.airports.map((airport) => (
              <AirportButton
                key={airport.iata}
                airport={airport}
                onClick={() => onSelect("to", airport)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * AirportConfirmationWidget - Multi-destination airport selection with dropdowns
 */
export function AirportConfirmationWidget({
  data,
  onConfirm,
  isLoading = false,
}: {
  data: AirportConfirmationData;
  onConfirm: (confirmed: ConfirmedAirports) => void;
  isLoading?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);

  // Track selected airports for each leg (from and to)
  const [selectedAirports, setSelectedAirports] = useState<Record<number, { from: Airport; to: Airport }>>(() => {
    const initial: Record<number, { from: Airport; to: Airport }> = {};
    data.legs.forEach(leg => {
      initial[leg.legIndex] = {
        from: leg.from.suggestedAirport,
        to: leg.to.suggestedAirport,
      };
    });
    return initial;
  });

  const handleAirportChange = (legIndex: number, field: "from" | "to", airport: Airport) => {
    setSelectedAirports(prev => ({
      ...prev,
      [legIndex]: {
        ...prev[legIndex],
        [field]: airport,
      },
    }));
  };

  const handleConfirm = () => {
    setConfirmed(true);
    const confirmedLegs = data.legs.map(leg => {
      const selected = selectedAirports[leg.legIndex];
      return {
        legIndex: leg.legIndex,
        fromIata: selected.from.iata,
        fromDisplay: `${selected.from.name} (${selected.from.iata})`,
        toIata: selected.to.iata,
        toDisplay: `${selected.to.name} (${selected.to.iata})`,
        date: leg.date,
      };
    });
    onConfirm({ legs: confirmedLegs });
  };

  if (confirmed) {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-primary/10 border border-primary/30 max-w-md">
        <div className="flex items-center gap-2 text-primary font-medium text-sm mb-2">
          <span>✓</span>
          <span>Aéroports confirmés</span>
        </div>
        <div className="space-y-1.5">
          {data.legs.map(leg => {
            const selected = selectedAirports[leg.legIndex];
            return (
              <div key={leg.legIndex} className="flex items-center gap-2 text-sm text-foreground">
                <span className="font-mono font-bold text-primary">{selected.from.iata}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono font-bold text-primary">{selected.to.iata}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-lg space-y-4">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Confirmer les aéroports
      </div>

      {/* Legs */}
      <div className="space-y-3">
        {data.legs.map((leg, idx) => {
          const selected = selectedAirports[leg.legIndex];
          const allFromAirports = [leg.from.suggestedAirport, ...leg.from.alternativeAirports];
          const allToAirports = [leg.to.suggestedAirport, ...leg.to.alternativeAirports];

          return (
            <div key={leg.legIndex} className="p-3 rounded-xl bg-card border border-border/50 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span>{leg.from.city} → {leg.to.city}</span>
                {leg.date && (
                  <span className="ml-auto text-[10px]">
                    {leg.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* From airport dropdown */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">
                    Départ
                  </label>
                  <select
                    value={selected.from.iata}
                    onChange={(e) => {
                      const airport = allFromAirports.find(a => a.iata === e.target.value);
                      if (airport) handleAirportChange(leg.legIndex, "from", airport);
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  >
                    {allFromAirports.map(airport => (
                      <option key={airport.iata} value={airport.iata}>
                        {airport.iata} - {airport.city_name || airport.name.split(" ")[0]} ({airport.distance_km.toFixed(0)}km)
                      </option>
                    ))}
                  </select>
                </div>

                {/* To airport dropdown */}
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1 block">
                    Arrivée
                  </label>
                  <select
                    value={selected.to.iata}
                    onChange={(e) => {
                      const airport = allToAirports.find(a => a.iata === e.target.value);
                      if (airport) handleAirportChange(leg.legIndex, "to", airport);
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  >
                    {allToAirports.map(airport => (
                      <option key={airport.iata} value={airport.iata}>
                        {airport.iata} - {airport.city_name || airport.name.split(" ")[0]} ({airport.distance_km.toFixed(0)}km)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            Recherche en cours...
          </>
        ) : (
          <>
            <Plane className="h-4 w-4" />
            Rechercher {data.legs.length} vol{data.legs.length > 1 ? "s" : ""}
          </>
        )}
      </button>
    </div>
  );
}
