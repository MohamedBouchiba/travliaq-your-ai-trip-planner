/**
 * TripTypeConfirmWidget - Trip type selection
 * 
 * Quick chip buttons for selecting roundtrip, oneway, or multi-destination.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";

type TripType = "roundtrip" | "oneway" | "multi";

interface TripTypeConfirmWidgetProps {
  currentType?: TripType;
  onConfirm: (tripType: TripType) => void;
}

export const TripTypeConfirmWidget = ({
  currentType = "roundtrip",
  onConfirm,
}: TripTypeConfirmWidgetProps) => {
  const [confirmed, setConfirmed] = useState(false);
  const [selected, setSelected] = useState<TripType>(currentType);

  const handleSelect = (type: TripType) => {
    setSelected(type);
    setConfirmed(true);
    onConfirm(type);
  };

  if (confirmed) {
    const label =
      selected === "roundtrip"
        ? "Aller-retour"
        : selected === "oneway"
        ? "Aller simple"
        : "Multi-destinations";
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>✓</span>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={() => handleSelect("roundtrip")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
          selected === "roundtrip"
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
      >
        ↔ Aller-retour
      </button>
      <button
        onClick={() => handleSelect("oneway")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
          selected === "oneway"
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
      >
        → Aller simple
      </button>
      <button
        onClick={() => handleSelect("multi")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
          selected === "multi"
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
      >
        🔀 Multi-destinations
      </button>
    </div>
  );
};
