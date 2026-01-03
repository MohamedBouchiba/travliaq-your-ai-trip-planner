/**
 * CitySelectionWidget - Select a city from a country
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CitySelectionData } from "@/types/flight";

interface CitySelectionWidgetProps {
  citySelection: CitySelectionData;
  onSelect: (cityName: string) => void;
  isLoading?: boolean;
}

export function CitySelectionWidget({
  citySelection,
  onSelect,
  isLoading = false,
}: CitySelectionWidgetProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleSelect = (cityName: string) => {
    setSelectedCity(cityName);
    setConfirmed(true);
    onSelect(cityName);
  };

  if (confirmed && selectedCity) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>📍</span>
        <span>{selectedCity}, {citySelection.countryName}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-md">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Chargement des villes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-md">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Choisir une ville en {citySelection.countryName}
      </div>

      <div className="space-y-2">
        {citySelection.cities.map((city, idx) => (
          <button
            key={city.name}
            onClick={() => handleSelect(city.name)}
            className={cn(
              "w-full text-left p-3 rounded-xl border transition-all",
              "bg-card hover:bg-primary/10 hover:border-primary/50",
              "border-border/50 group"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {city.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {city.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
