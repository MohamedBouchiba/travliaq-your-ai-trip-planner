/**
 * Activities Panel - V3
 * - Add custom cities (not just from accommodation)
 * - User-friendly filters (rating stars, budget slider)
 * - Auto-zoom on city when selected
 * - AI recommendations button
 * - Saved activities display
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  MapPin, Heart, Sparkles, Plus, X, Hotel, Calendar, ExternalLink, 
  Star, Clock, Search, SlidersHorizontal, ChevronDown, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActivityMemory, ActivityEntry } from "@/contexts/ActivityMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";
import { useTravelMemory } from "@/contexts/TravelMemoryContext";
import { useActivitiesSearch } from "@/hooks/useActivitiesSearch";
import { useLocationAutocomplete, LocationResult } from "@/hooks/useLocationAutocomplete";
import { eventBus } from "@/lib/eventBus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toastSuccess, toastInfo } from "@/lib/toast";

// ============================================================================
// TYPES
// ============================================================================

interface ActivityCity {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  lat?: number;
  lng?: number;
  checkIn: Date | null;
  checkOut: Date | null;
  source: "accommodation" | "manual";
}

// ============================================================================
// CITY SEARCH INPUT
// ============================================================================

function CitySearchInput({
  onSelect,
  placeholder = "Ajouter une ville...",
}: {
  onSelect: (location: LocationResult) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: locations = [], isLoading } = useLocationAutocomplete(
    search,
    isOpen && search.length >= 2,
    ["city"]
  );

  const handleSelect = (location: LocationResult) => {
    onSelect(location);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.length >= 2) setIsOpen(true);
            }}
            onFocus={() => search.length >= 2 && setIsOpen(true)}
            placeholder={placeholder}
            className="pl-9 h-10 text-sm bg-muted/30 border-border/40 focus:bg-background"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0 max-h-60 overflow-y-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isLoading ? (
          <div className="p-3 text-xs text-muted-foreground text-center">Recherche...</div>
        ) : locations.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">
            {search.length < 2 ? "Tapez au moins 2 caractères" : "Aucun résultat"}
          </div>
        ) : (
          <div className="py-1">
            {locations.slice(0, 8).map((location) => (
              <button
                key={`${location.type}-${location.id}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(location)}
                className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center gap-2"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{location.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {location.country_name}
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

// ============================================================================
// STAR RATING FILTER
// ============================================================================

function StarRatingFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Note minimum</span>
        <span className="text-xs text-muted-foreground">
          {value > 0 ? `${value}+ étoiles` : "Toutes"}
        </span>
      </div>
      <div className="flex gap-1">
        {[0, 3, 3.5, 4, 4.5].map((rating) => (
          <button
            key={rating}
            onClick={() => onChange(rating)}
            className={cn(
              "flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
              value === rating
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            )}
          >
            {rating === 0 ? (
              "Tous"
            ) : (
              <>
                <Star className="h-3 w-3 fill-current" />
                {rating}+
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// BUDGET FILTER
// ============================================================================

function BudgetFilter({
  value,
  onChange,
}: {
  value: [number, number];
  onChange: (range: [number, number]) => void;
}) {
  const presets = [
    { label: "€", range: [0, 30] as [number, number], desc: "Économique" },
    { label: "€€", range: [30, 80] as [number, number], desc: "Modéré" },
    { label: "€€€", range: [80, 200] as [number, number], desc: "Confort" },
    { label: "€€€€", range: [200, 1000] as [number, number], desc: "Premium" },
  ];

  const currentPreset = presets.find(
    (p) => p.range[0] === value[0] && p.range[1] === value[1]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Budget par activité</span>
        <span className="text-xs text-muted-foreground">
          {value[0]}€ - {value[1] >= 1000 ? "1000€+" : `${value[1]}€`}
        </span>
      </div>
      
      {/* Preset buttons */}
      <div className="flex gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.range)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center",
              currentPreset?.label === preset.label
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            )}
          >
            <span>{preset.label}</span>
            <span className="text-[10px] opacity-70">{preset.desc}</span>
          </button>
        ))}
      </div>

      {/* Custom slider */}
      <div className="pt-1">
        <Slider
          value={value}
          onValueChange={(v) => onChange(v as [number, number])}
          min={0}
          max={500}
          step={10}
          className="py-2"
        />
      </div>
    </div>
  );
}

// ============================================================================
// SAVED ACTIVITY CARD
// ============================================================================

interface SavedActivityCardProps {
  activity: ActivityEntry;
  onRemove: () => void;
}

const SavedActivityCard = ({ activity, onRemove }: SavedActivityCardProps) => {
  const handleBookClick = () => {
    if (activity.bookingUrl) {
      window.open(activity.bookingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition-all group">
      {activity.imageUrl && (
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-2 leading-tight">{activity.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {activity.rating && activity.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {activity.rating.toFixed(1)}
            </span>
          )}
          {activity.durationFormatted && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {activity.durationFormatted}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-bold text-primary">
            {activity.fromPrice}€
          </span>
          {activity.bookingUrl && (
            <button
              onClick={handleBookClick}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Réserver <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <button
        onClick={onRemove}
        className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

interface ActivitiesPanelProps {
  onSearchActivities?: (city: string, countryCode: string, checkIn: Date | null, checkOut: Date | null) => void;
}

const ActivitiesPanel = ({ onSearchActivities }: ActivitiesPanelProps) => {
  const {
    memory: activityMemory,
    unsaveActivity,
    getSavedActivitiesByDestination,
    setActiveDestination,
    totalSavedCount,
    setDefaultRatingMin,
    setDefaultBudgetRange,
  } = useActivityMemory();

  const { memory: accommodationMemory } = useAccommodationMemory();
  const { memory: travelMemory } = useTravelMemory();
  const { loading, search } = useActivitiesSearch();

  // Local state
  const [manualCities, setManualCities] = useState<ActivityCity[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [ratingFilter, setRatingFilter] = useState(0);
  const [budgetFilter, setBudgetFilter] = useState<[number, number]>([0, 500]);

  // Combine accommodation cities + manual cities
  const allCities = useMemo((): ActivityCity[] => {
    const fromAccommodation: ActivityCity[] = accommodationMemory.accommodations
      .filter((a) => a.city)
      .map((a) => ({
        id: a.id,
        city: a.city,
        country: a.country || "",
        countryCode: a.countryCode || "",
        lat: a.lat,
        lng: a.lng,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        source: "accommodation" as const,
      }));

    return [...fromAccommodation, ...manualCities];
  }, [accommodationMemory.accommodations, manualCities]);

  // Current city
  const currentCity = useMemo(() => {
    if (!selectedCityId) return null;
    return allCities.find((c) => c.id === selectedCityId) || null;
  }, [selectedCityId, allCities]);

  // Saved activities for current city
  const savedActivities = useMemo(() => {
    if (!selectedCityId) return [];
    return getSavedActivitiesByDestination(selectedCityId);
  }, [selectedCityId, getSavedActivitiesByDestination]);

  // Auto-select first city
  useEffect(() => {
    if (!selectedCityId && allCities.length > 0) {
      setSelectedCityId(allCities[0].id);
      setActiveDestination(allCities[0].id);
    }
  }, [selectedCityId, allCities, setActiveDestination]);

  // Handle city selection - zoom on map
  const handleCitySelect = useCallback(
    (cityId: string) => {
      setSelectedCityId(cityId);
      setActiveDestination(cityId);

      const city = allCities.find((c) => c.id === cityId);
      if (city) {
        // Emit event to zoom map on this city
        eventBus.emit("activities:cityFocus", {
          city: city.city,
          countryCode: city.countryCode,
          lat: city.lat,
          lng: city.lng,
        });
      }
    },
    [allCities, setActiveDestination]
  );

  // Add manual city
  const handleAddCity = useCallback((location: LocationResult) => {
    const newCity: ActivityCity = {
      id: crypto.randomUUID(),
      city: location.name,
      country: location.country_name || "",
      countryCode: location.country_code || "",
      lat: location.lat,
      lng: location.lng,
      checkIn: null,
      checkOut: null,
      source: "manual",
    };

    setManualCities((prev) => [...prev, newCity]);
    setSelectedCityId(newCity.id);
    setActiveDestination(newCity.id);

    // Zoom on new city
    eventBus.emit("activities:cityFocus", {
      city: newCity.city,
      countryCode: newCity.countryCode,
      lat: newCity.lat,
      lng: newCity.lng,
    });

    toastSuccess(`${newCity.city} ajoutée`);
  }, [setActiveDestination]);

  // Remove manual city
  const handleRemoveCity = useCallback(
    (cityId: string) => {
      setManualCities((prev) => prev.filter((c) => c.id !== cityId));
      if (selectedCityId === cityId) {
        const remaining = allCities.filter((c) => c.id !== cityId);
        setSelectedCityId(remaining[0]?.id || null);
      }
    },
    [selectedCityId, allCities]
  );

  // AI recommendations
  const handleAIRecommendations = useCallback(async () => {
    if (!currentCity) {
      toastInfo("Sélectionnez d'abord une ville");
      return;
    }

    setIsSearchingAI(true);

    // Emit event for map to show activities
    eventBus.emit("activities:search", {
      city: currentCity.city,
      countryCode: currentCity.countryCode,
      checkIn: currentCity.checkIn,
      checkOut: currentCity.checkOut,
      destinationId: currentCity.id,
      lat: currentCity.lat,
      lng: currentCity.lng,
      filters: {
        ratingMin: ratingFilter,
        budgetMin: budgetFilter[0],
        budgetMax: budgetFilter[1],
      },
    });

    // Perform search
    try {
      const results = await search({
        city: currentCity.city,
        countryCode: currentCity.countryCode,
        startDate: currentCity.checkIn
          ? format(currentCity.checkIn, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        endDate: currentCity.checkOut
          ? format(currentCity.checkOut, "yyyy-MM-dd")
          : undefined,
        page: 1,
        limit: 30,
      });

      // Emit results for map display
      if (results && results.activities) {
        eventBus.emit("activities:resultsReady", {
          destinationId: currentCity.id,
          city: currentCity.city,
          activities: results.activities,
          lat: currentCity.lat,
          lng: currentCity.lng,
        });
      }

      toastSuccess(`Activités trouvées pour ${currentCity.city} !`);
    } catch (error) {
      console.error("Activity search error:", error);
    } finally {
      setIsSearchingAI(false);
    }
  }, [currentCity, ratingFilter, budgetFilter, search]);

  // Remove activity
  const handleRemoveActivity = useCallback(
    (id: string) => {
      unsaveActivity(id);
    },
    [unsaveActivity]
  );

  // Date display
  const dateDisplay = useMemo(() => {
    if (!currentCity?.checkIn) return null;
    const start = format(currentCity.checkIn, "d MMM", { locale: fr });
    const end = currentCity.checkOut
      ? format(currentCity.checkOut, "d MMM", { locale: fr })
      : null;
    return end ? `${start} - ${end}` : start;
  }, [currentCity]);

  // ============================================================================
  // RENDER - No cities
  // ============================================================================

  if (allCities.length === 0) {
    return (
      <div className="space-y-4" data-tour="activities-panel">
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <MapPin className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Où voulez-vous des activités ?</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez une ville pour découvrir des activités
            </p>
          </div>
        </div>

        <CitySearchInput
          onSelect={handleAddCity}
          placeholder="Rechercher une ville..."
        />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Main panel
  // ============================================================================

  return (
    <div className="space-y-4" data-tour="activities-panel">
      {/* City tabs with add button */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {allCities.map((city) => (
            <div key={city.id} className="relative group">
              <button
                onClick={() => handleCitySelect(city.id)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
                  selectedCityId === city.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border/30"
                )}
              >
                {city.source === "accommodation" ? (
                  <Hotel className="h-3.5 w-3.5" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                <span>{city.city}</span>
                {getSavedActivitiesByDestination(city.id).length > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      selectedCityId === city.id
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {getSavedActivitiesByDestination(city.id).length}
                  </span>
                )}
              </button>

              {/* Remove button for manual cities */}
              {city.source === "manual" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCity(city.id);
                  }}
                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add city input */}
        <CitySearchInput
          onSelect={handleAddCity}
          placeholder="Ajouter une ville..."
        />
      </div>

      {/* Current city info + date */}
      {currentCity && (
        <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{currentCity.city}</span>
              {currentCity.country && (
                <span className="text-xs text-muted-foreground">
                  {currentCity.country}
                </span>
              )}
            </div>
            {dateDisplay && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {dateDisplay}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-sm",
          showFilters
            ? "bg-primary/5 border-primary/30 text-primary"
            : "bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50"
        )}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtres</span>
          {(ratingFilter > 0 || budgetFilter[0] > 0 || budgetFilter[1] < 500) && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              Actifs
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            showFilters && "rotate-180"
          )}
        />
      </button>

      {/* Filters content */}
      {showFilters && (
        <div className="space-y-4 p-3 rounded-xl bg-muted/20 border border-border/30">
          <StarRatingFilter value={ratingFilter} onChange={setRatingFilter} />
          <BudgetFilter value={budgetFilter} onChange={setBudgetFilter} />
        </div>
      )}

      {/* AI Recommendations Button */}
      <Button
        onClick={handleAIRecommendations}
        disabled={isSearchingAI || loading || !currentCity}
        className="w-full h-12 text-sm font-medium gap-2"
        variant="default"
      >
        {isSearchingAI || loading ? (
          <>
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Recherche en cours...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Recommander par l'IA
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Les résultats s'afficheront sur la carte
      </p>

      {/* Saved Activities */}
      {savedActivities.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary fill-primary" />
              <span className="text-sm font-medium">Mes activités</span>
              <span className="text-xs text-muted-foreground">
                ({savedActivities.length})
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {savedActivities.map((activity) => (
              <SavedActivityCard
                key={activity.id}
                activity={activity}
                onRemove={() => handleRemoveActivity(activity.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Aucune activité sauvegardée
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cliquez sur "Recommander par l'IA" pour découvrir des activités
          </p>
        </div>
      )}

      {/* Total saved count */}
      {totalSavedCount > 0 && allCities.length > 1 && (
        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            {totalSavedCount} activité{totalSavedCount > 1 ? "s" : ""} sauvegardée
            {totalSavedCount > 1 ? "s" : ""} au total
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPanel;
