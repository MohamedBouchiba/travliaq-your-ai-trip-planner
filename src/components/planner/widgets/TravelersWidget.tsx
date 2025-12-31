/**
 * TravelersWidget - Passenger selection for flights
 * 
 * Simple counter-based widget for selecting adults, children, and infants.
 * Enforces business rules (min 1 adult, infants ≤ adults).
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TravelersWidgetProps {
  initialValues?: { adults: number; children: number; infants: number };
  onConfirm: (travelers: { adults: number; children: number; infants: number }) => void;
}

export const TravelersWidget = ({ 
  initialValues = { adults: 1, children: 0, infants: 0 },
  onConfirm 
}: TravelersWidgetProps) => {
  const [adults, setAdults] = useState(Math.max(1, initialValues.adults));
  const [children, setChildren] = useState(initialValues.children);
  const [infants, setInfants] = useState(Math.min(initialValues.infants, Math.max(1, initialValues.adults)));
  const [confirmed, setConfirmed] = useState(false);

  // Ensure infants don't exceed adults when adults change
  const handleAdultsChange = (newAdults: number) => {
    setAdults(newAdults);
    if (infants > newAdults) {
      setInfants(newAdults);
    }
  };

  const handleConfirm = () => {
    if (adults < 1) return;
    setConfirmed(true);
    onConfirm({ adults, children, infants });
  };

  const CounterButton = ({ 
    value, 
    onChange, 
    min = 0, 
    max = 9 
  }: { 
    value: number; 
    onChange: (v: number) => void; 
    min?: number; 
    max?: number;
  }) => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min || confirmed}
        className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        −
      </button>
      <span className="w-6 text-center font-semibold text-lg">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max || confirmed}
        className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        +
      </button>
    </div>
  );

  if (confirmed) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>✓</span>
        <span>
          {adults} adulte{adults > 1 ? "s" : ""}
          {children > 0 && `, ${children} enfant${children > 1 ? "s" : ""}`}
          {infants > 0 && `, ${infants} bébé${infants > 1 ? "s" : ""}`}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-4 max-w-xs">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Nombre de voyageurs
      </div>
      
      {/* Adults */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Adultes</div>
          <div className="text-xs text-muted-foreground">12 ans et +</div>
        </div>
        <CounterButton value={adults} onChange={handleAdultsChange} min={1} />
      </div>
      
      {/* Children */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Enfants</div>
          <div className="text-xs text-muted-foreground">2-11 ans</div>
        </div>
        <CounterButton value={children} onChange={setChildren} />
      </div>
      
      {/* Infants */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Bébés</div>
          <div className="text-xs text-muted-foreground">Moins de 2 ans</div>
        </div>
        <CounterButton value={infants} onChange={setInfants} max={adults} />
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
      >
        Confirmer ({adults + children + infants} voyageur{adults + children + infants > 1 ? "s" : ""})
      </button>
    </div>
  );
};
