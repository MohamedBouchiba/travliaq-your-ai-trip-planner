import { useState, useRef, useEffect } from "react";
import { Plus, X, ArrowLeftRight, MapPin, PlaneTakeoff, PlaneLanding, Globe, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import PlannerCalendar from "./PlannerCalendar";
import { useLocationAutocomplete, LocationResult, LocationType } from "@/hooks/useLocationAutocomplete";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface FlightLeg {
  id: string;
  from: string;
  to: string;
  date?: Date;
  returnDate?: Date;
  // Location metadata for when we need to handle country selection
  fromLocation?: LocationResult;
  toLocation?: LocationResult;
}

interface FlightRouteBuilderProps {
  legs: FlightLeg[];
  onLegsChange: (legs: FlightLeg[]) => void;
  maxLegs?: number;
  tripType?: "roundtrip" | "oneway" | "multi";
  onCountrySelected?: (field: "from" | "to", country: LocationResult) => void;
}

interface CityInputProps {
  value: string;
  onChange: (value: string, location?: LocationResult) => void;
  placeholder: string;
  icon?: "from" | "to";
  onCountrySelected?: (country: LocationResult) => void;
}

// Icon for location type
function LocationTypeIcon({ type }: { type: LocationType }) {
  switch (type) {
    case "airport":
      return <Building2 className="h-3 w-3 text-primary shrink-0" />;
    case "country":
      return <Globe className="h-3 w-3 text-amber-500 shrink-0" />;
    default:
      return <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />;
  }
}

function CityInput({ value, onChange, placeholder, icon, onCountrySelected }: CityInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const justSelectedRef = useRef(false);
  const { data: locations = [], isLoading } = useLocationAutocomplete(search, isOpen);

  // Keep input text in sync with external value (except right after a selection)
  useEffect(() => {
    if (!justSelectedRef.current) {
      setSearch(value);
    }
    justSelectedRef.current = false;
  }, [value]);

  const handleSelect = (location: LocationResult) => {
    justSelectedRef.current = true;
    
    if (location.type === "country") {
      // If a country is selected, notify parent and keep the search open
      setSearch(location.name);
      onChange(location.name, location);
      setIsOpen(false);
      inputRef.current?.blur();
      
      // Trigger the country selection callback
      onCountrySelected?.(location);
    } else {
      // For cities and airports, use the display name
      setSearch(location.display_name);
      onChange(location.display_name, location);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue);
    if (!isOpen && newValue.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleFocus = () => {
    setSearch("");
    setIsOpen(true);
  };

  const handleBlur = () => {
    if (justSelectedRef.current) return;
    if (search.trim() === "" && value) {
      setSearch(value);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {icon === "from" && (
            <PlaneTakeoff className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          {icon === "to" && (
            <PlaneLanding className="h-3 w-3 text-primary shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0 max-h-60 overflow-y-auto" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="p-3 text-xs text-muted-foreground text-center">
            Recherche...
          </div>
        ) : locations.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">
            {search.length < 2 ? "Tapez au moins 2 caractères" : "Aucun résultat trouvé"}
          </div>
        ) : (
          <div className="py-1">
            {locations.slice(0, 10).map((location) => (
              <button
                key={`${location.type}-${location.id}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(location)}
                className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center gap-2"
              >
                <LocationTypeIcon type={location.type} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                    {location.name}
                    {location.iata && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                        {location.iata}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                    <span className="capitalize">{
                      location.type === "airport" ? "Aéroport" :
                      location.type === "country" ? "Pays" : "Ville"
                    }</span>
                    {location.type !== "country" && (
                      <>
                        <span>•</span>
                        <span>{location.country_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function FlightRouteBuilder({
  legs,
  onLegsChange,
  maxLegs = 4,
  tripType = "roundtrip",
  onCountrySelected,
}: FlightRouteBuilderProps) {
  const [activeLegCalendar, setActiveLegCalendar] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(false);
  const [showWeather, setShowWeather] = useState(false);

  const updateLeg = (id: string, updates: Partial<FlightLeg>) => {
    onLegsChange(
      legs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg))
    );
  };

  const swapCities = (id: string) => {
    onLegsChange(
      legs.map((leg) =>
        leg.id === id ? { 
          ...leg, 
          from: leg.to, 
          to: leg.from,
          fromLocation: leg.toLocation,
          toLocation: leg.fromLocation
        } : leg
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
        fromLocation: lastLeg?.toLocation,
      },
    ]);
  };

  const removeLeg = (id: string) => {
    if (legs.length <= 1) return;
    onLegsChange(legs.filter((leg) => leg.id !== id));
    if (activeLegCalendar === id) {
      setActiveLegCalendar(null);
    }
  };

  const handleDateSelect = (legId: string, range: { from?: Date; to?: Date }) => {
    if (tripType === "roundtrip") {
      updateLeg(legId, { date: range.from, returnDate: range.to });
      if (range.from && range.to) {
        setActiveLegCalendar(null);
      }
    } else {
      if (range.from) {
        updateLeg(legId, { date: range.from });
        setActiveLegCalendar(null);
      }
    }
  };

  const handleFromChange = (legId: string, value: string, location?: LocationResult) => {
    updateLeg(legId, { from: value, fromLocation: location });
    
    if (location?.type === "country") {
      onCountrySelected?.("from", location);
    }
  };

  const handleToChange = (legId: string, value: string, location?: LocationResult) => {
    updateLeg(legId, { to: value, toLocation: location });
    
    if (location?.type === "country") {
      onCountrySelected?.("to", location);
    }
  };

  return (
    <div className="space-y-2">
      {legs.map((leg, index) => (
        <div key={leg.id} className="space-y-2">
          <div className="flex items-center gap-1.5 p-2.5 rounded-xl border border-border/40 bg-muted/20">
            {/* From city */}
            <CityInput
              value={leg.from}
              onChange={(value, location) => handleFromChange(leg.id, value, location)}
              placeholder="Départ"
              icon="from"
              onCountrySelected={(country) => onCountrySelected?.("from", country)}
            />

            {/* Swap button */}
            <button
              onClick={() => swapCities(leg.id)}
              className="p-1.5 rounded-full border border-border/40 hover:bg-muted/40 transition-colors shrink-0"
              aria-label="Inverser départ et destination"
            >
              <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
            </button>

            {/* To city */}
            <CityInput
              value={leg.to}
              onChange={(value, location) => handleToChange(leg.id, value, location)}
              placeholder="Destination"
              icon="to"
              onCountrySelected={(country) => onCountrySelected?.("to", country)}
            />

            {/* Date picker trigger(s) */}
            {tripType === "roundtrip" ? (
              <button
                onClick={() => setActiveLegCalendar(activeLegCalendar === leg.id ? null : leg.id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-colors shrink-0 text-xs",
                  activeLegCalendar === leg.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/40 hover:bg-muted/40",
                  leg.date || leg.returnDate ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="whitespace-nowrap">
                  {leg.date ? format(leg.date, "d MMM", { locale: fr }) : "Aller"}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="whitespace-nowrap">
                  {leg.returnDate ? format(leg.returnDate, "d MMM", { locale: fr }) : "Retour"}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setActiveLegCalendar(activeLegCalendar === leg.id ? null : leg.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors shrink-0 text-xs",
                  activeLegCalendar === leg.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/40 hover:bg-muted/40",
                  leg.date ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="whitespace-nowrap">
                  {leg.date
                    ? format(leg.date, "EEE d MMM", { locale: fr })
                    : "Date"}
                </span>
              </button>
            )}

            {/* Remove button */}
            {legs.length > 1 && (
              <button
                onClick={() => removeLeg(leg.id)}
                className="p-1.5 hover:text-destructive transition-colors shrink-0"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>

          {/* Calendar for this leg */}
          {activeLegCalendar === leg.id && (
            <div className="p-3 rounded-xl border border-border/40 bg-card relative">
              <button
                onClick={() => setActiveLegCalendar(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-muted/50 transition-colors z-10"
                aria-label="Fermer le calendrier"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              <PlannerCalendar
                dateRange={tripType === "roundtrip" 
                  ? { from: leg.date, to: leg.returnDate } 
                  : { from: leg.date, to: leg.date }}
                onDateRangeChange={(range) => handleDateSelect(leg.id, range)}
                showPrices={showPrices}
                showWeather={showWeather}
                onShowPricesChange={setShowPrices}
                onShowWeatherChange={setShowWeather}
              />
            </div>
          )}
        </div>
      ))}

      {/* Add flight button - only for multi-destinations */}
      {tripType === "multi" && legs.length < maxLegs && (
        <div className="flex justify-center">
          <button
            onClick={addLeg}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une destination
          </button>
        </div>
      )}
    </div>
  );
}
