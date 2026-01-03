/**
 * Activities Panel - Matching AccommodationPanel UX exactly
 *
 * Features:
 * - City tabs like AccommodationPanel (with "+" button to add directly)
 * - Inline city input when adding (not popup)
 * - Zoom to city on map when switching tabs (no flight routes shown)
 * - Two-view system: filters + results
 * - Activity cards in 2-column grid
 * - Detail modal on click
 */

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { 
  Search, Sparkles, Loader2, Plus, X,
  ChevronLeft, AlertCircle, CalendarDays, Compass, MapPin,
  ArrowUpDown, TrendingDown, TrendingUp, Star, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActivityMemory } from "@/contexts/ActivityMemoryContext";
import { useTravelMemory } from "@/contexts/TravelMemoryContext";
import { useLocationAutocomplete, type LocationResult } from "@/hooks/useLocationAutocomplete";

import { ActivityCard } from "./ActivityCard";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityDetailModal } from "./ActivityDetailModal";
import { toast } from "sonner";
import { eventBus } from "@/lib/eventBus";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { ViatorActivity } from "@/types/activity";
import RangeCalendar from "@/components/RangeCalendar";
import type { DateRange } from "react-day-picker";

// ============================================================================
// TYPES
// ============================================================================

type ViewType = "filters" | "results";

interface CityEntry {
  id: string;
  city: string;
  countryCode: string;
  checkIn: Date | null;
  checkOut: Date | null;
  lat?: number;
  lng?: number;
  isInherited?: boolean; // true if from accommodations, false if locally added
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="py-12 text-center space-y-4">
    <div className="flex justify-center">
      <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">{description}</p>
    </div>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

// Format date range display (like AccommodationPanel)
const formatDateRange = (checkIn: Date | null, checkOut: Date | null) => {
  if (!checkIn) return null;
  const start = format(checkIn, "d MMM.", { locale: fr });
  if (checkOut) {
    const end = format(checkOut, "d MMM.", { locale: fr });
    const nights = differenceInDays(checkOut, checkIn);
    return `${start} → ${end} (${nights}n)`;
  }
  return start;
};

// Destination input with autocomplete (cities only, 3 chars min)
function DestinationInput({ 
  value, 
  onChange,
  placeholder = "Ville ou destination",
  onLocationSelect,
}: { 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
  onLocationSelect?: (location: LocationResult) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const justSelectedRef = useRef(false);
  const { data: locations = [], isLoading } = useLocationAutocomplete(search, isOpen && search.length >= 3, ["city"]);

  useEffect(() => {
    if (!justSelectedRef.current) {
      setSearch(value);
    }
    justSelectedRef.current = false;
  }, [value]);

  const handleSelect = (location: LocationResult) => {
    justSelectedRef.current = true;
    setSearch(location.name);
    onChange(location.name);
    onLocationSelect?.(location);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    onChange(newValue);
    if (!isOpen && newValue.length >= 3) {
      setIsOpen(true);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 flex-1">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={handleInputChange}
            onFocus={() => search.length >= 3 && setIsOpen(true)}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
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
            {search.length < 3 ? "Tapez au moins 3 caractères" : "Aucun résultat"}
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

// Compact date range picker
function CompactDateRange({
  checkIn,
  checkOut,
  onChange,
}: {
  checkIn: Date | null;
  checkOut: Date | null;
  onChange: (checkIn: Date | null, checkOut: Date | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRangeChange = (range: DateRange | undefined) => {
    onChange(range?.from || null, range?.to || null);
    if (range?.from && range.to && range.from.getTime() !== range.to.getTime()) {
      setTimeout(() => setIsOpen(false), 300);
    }
  };

  const value: DateRange | undefined = checkIn ? { from: checkIn, to: checkOut || undefined } : undefined;

  const formatDateCompact = (date: Date) => {
    return format(date, "dd MMM", { locale: fr });
  };

  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 text-sm min-w-0">
          <CalendarDays className="h-4 w-4 text-primary shrink-0" />
          {checkIn && checkOut ? (
            <span className="truncate text-foreground">
              {formatDateCompact(checkIn)} → {formatDateCompact(checkOut)}
              <span className="text-muted-foreground ml-1">({nights}n)</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Dates</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <RangeCalendar value={value} onChange={handleRangeChange} />
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ActivitiesPanel = () => {
  const {
    state: activityState,
    allDestinations, // Computed: inherited from accommodations + local
    searchActivities,
    searchActivitiesByBounds,
    clearSearch,
    loadRecommendations,
    addActivityFromSearch,
    removeActivity,
    selectActivity,
    getActivitiesByDestination,
    updateFilters,
    getTotalBudget,
    addLocalDestination,
    removeLocalDestination,
  } = useActivityMemory();

  // Get travelers from travel context
  const { memory: travelMemory } = useTravelMemory();
  const travelers = useMemo(() => ({
    adults: travelMemory.travelers.adults,
    children: travelMemory.travelers.children,
  }), [travelMemory.travelers.adults, travelMemory.travelers.children]);

  // UI State
  const [currentView, setCurrentView] = useState<ViewType>("filters");
  const [activeCityIndex, setActiveCityIndex] = useState(0);
  const [detailModalActivity, setDetailModalActivity] = useState<ViatorActivity | null>(null);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "rating" | "duration">("default");

  // Use search results from context (includes attractions for map pins)
  const searchResults = activityState.search.activities;
  const isSearching = activityState.search.isSearching;
  const searchError = activityState.search.error;
  
  // Adding city state
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCityInput, setNewCityInput] = useState("");
  const [newCityData, setNewCityData] = useState<{
    city: string;
    countryCode: string;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [newCityCheckIn, setNewCityCheckIn] = useState<Date | null>(null);
  const [newCityCheckOut, setNewCityCheckOut] = useState<Date | null>(null);

  // Use allDestinations (inherited from accommodations + locally added)
  const cities = useMemo<CityEntry[]>(() => {
    return allDestinations
      .filter((dest) => dest.city && dest.city.length > 0)
      .map((dest) => ({
        id: dest.id,
        city: dest.city,
        countryCode: dest.countryCode || "",
        checkIn: dest.checkIn,
        checkOut: dest.checkOut,
        lat: dest.lat,
        lng: dest.lng,
        isInherited: dest.isInherited,
      }));
  }, [allDestinations]);

  // Active city
  const activeCity = cities[activeCityIndex] || null;

  // Get planned activities for current city
  const plannedActivities = activeCity ? getActivitiesByDestination(activeCity.id) : [];

  // Sort search results
  const sortedSearchResults = useMemo(() => {
    if (sortBy === "default" || searchResults.length === 0) return searchResults;
    
    const sorted = [...searchResults];
    switch (sortBy) {
      case "price_asc":
        return sorted.sort((a, b) => (a.pricing?.from_price || 0) - (b.pricing?.from_price || 0));
      case "price_desc":
        return sorted.sort((a, b) => (b.pricing?.from_price || 0) - (a.pricing?.from_price || 0));
      case "rating":
        return sorted.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
      case "duration":
        return sorted.sort((a, b) => (b.duration?.minutes || 0) - (a.duration?.minutes || 0));
      default:
        return sorted;
    }
  }, [searchResults, sortBy]);

  // Calculate type breakdown for unified search results
  const typeBreakdown = useMemo(() => {
    const breakdown = { activity: 0, attraction: 0 };
    sortedSearchResults.forEach((item) => {
      const type = item.type || "activity";
      if (type === "activity" || type === "attraction") {
        breakdown[type]++;
      }
    });
    return breakdown;
  }, [sortedSearchResults]);

  // Handle search using context method
  const handleSearch = useCallback(async () => {
    if (!activeCity) {
      toast.error("Veuillez sélectionner une ville");
      return;
    }

    try {
      await searchActivities({
        city: activeCity.city,
        countryCode: activeCity.countryCode,
        startDate: activeCity.checkIn?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
        endDate: activeCity.checkOut?.toISOString().split("T")[0],
        categories: activityState.activeFilters.categories,
        priceRange: {
          min: activityState.activeFilters.priceRange[0],
          max: activityState.activeFilters.priceRange[1],
        },
        ratingMin: activityState.activeFilters.ratingMin,
        currency: "EUR",
        language: "fr",
        page: 1,
        limit: 40,
      });

      setCurrentView("results");
      console.log(
        `[Activities] Search completed for ${activeCity.city}`
      );
    } catch (error: any) {
      console.error("[Activities] Search error:", error);
      setCurrentView("results");
    }
  }, [activeCity, activityState.activeFilters, searchActivities]);

  // Handle map bounds search (search in visible map area)
  const handleMapBoundsSearch = useCallback(async () => {
    if (!activeCity) {
      toast.error("Veuillez sélectionner une ville");
      return;
    }

    eventBus.emit("map:searchInAreaStatus", { isSearching: true });

    try {
      // Get map bounds via event bus
      const mapBounds = await new Promise<{
        north: number;
        south: number;
        east: number;
        west: number;
      } | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 1000);

        const handleBounds = (data: any) => {
          clearTimeout(timeout);
          eventBus.off("map:bounds", handleBounds);
          resolve(data.bounds);
        };

        eventBus.on("map:bounds", handleBounds);
        eventBus.emit("map:getBounds");
      });

      if (!mapBounds) {
        toast.error("Impossible de récupérer la zone visible");
        return;
      }

      // Use context method to search by bounds
      const result = await searchActivitiesByBounds({
        bounds: mapBounds,
        startDate: activeCity.checkIn?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
        endDate: activeCity.checkOut?.toISOString().split("T")[0],
        categories: activityState.activeFilters.categories,
        priceRange: {
          min: activityState.activeFilters.priceRange[0],
          max: activityState.activeFilters.priceRange[1],
        },
        ratingMin: activityState.activeFilters.ratingMin,
        currency: "EUR",
        language: "fr",
      });

      if (result.activities.length > 0 || result.attractions.length > 0) {
        setCurrentView("results");
        toast.success(`${result.attractions.length} attractions et ${result.activities.length} activités trouvées dans cette zone`);
        console.log(
          `[Activities] Map bounds search: ${result.activities.length} activities + ${result.attractions.length} attractions`
        );
      } else {
        setCurrentView("results");
        toast.info("Aucune activité trouvée dans cette zone");
      }
    } catch (error: any) {
      console.error("[Activities] Map bounds search error:", error);
      toast.error("Erreur lors de la recherche dans cette zone");
      setCurrentView("results");
    } finally {
      eventBus.emit("map:searchInAreaStatus", { isSearching: false });
    }
  }, [activeCity, activityState.activeFilters, searchActivitiesByBounds]);

  // Handle add activity
  const handleAddActivity = useCallback(
    (viatorActivity: ViatorActivity) => {
      if (!activeCity) {
        toast.error("Veuillez sélectionner une destination");
        return;
      }
      addActivityFromSearch(viatorActivity, activeCity.id);
      toast.success("Activité ajoutée !");
    },
    [activeCity, addActivityFromSearch]
  );

  // Handle remove activity
  const handleRemoveActivity = useCallback(
    (activityId: string) => {
      removeActivity(activityId);
      toast.success("Activité retirée");
    },
    [removeActivity]
  );

  // Handle activity click - open detail modal
  const handleActivityClick = useCallback(
    (activity: ViatorActivity) => {
      setDetailModalActivity(activity);
      selectActivity(activity.id);
      
      // If activity has coordinates, emit map event
      if (activity.coordinates) {
        eventBus.emit("map:zoom", {
          center: [activity.coordinates.lng, activity.coordinates.lat] as [number, number],
          zoom: 15,
        });
      }
    },
    [selectActivity]
  );

  // Handle click to start adding city
  const handleStartAddCity = useCallback(() => {
    setIsAddingCity(true);
    setNewCityInput("");
    setNewCityData(null);
    setNewCityCheckIn(null);
    setNewCityCheckOut(null);
  }, []);

  // Handle cancel adding city
  const handleCancelAddCity = useCallback(() => {
    setIsAddingCity(false);
    setNewCityInput("");
    setNewCityData(null);
    setNewCityCheckIn(null);
    setNewCityCheckOut(null);
  }, []);

  // Handle confirm adding city - adds as LOCAL destination (not affecting accommodations)
  const handleConfirmAddCity = useCallback(() => {
    if (!newCityData?.city) {
      toast.error("Veuillez sélectionner une ville");
      return;
    }

    // Add as LOCAL destination (only in Activities, not affecting Accommodations)
    addLocalDestination({
      city: newCityData.city,
      countryCode: newCityData.countryCode,
      checkIn: newCityCheckIn,
      checkOut: newCityCheckOut,
      lat: newCityData.lat,
      lng: newCityData.lng,
    });

    // Reset state
    setIsAddingCity(false);
    setNewCityInput("");
    setNewCityData(null);
    setNewCityCheckIn(null);
    setNewCityCheckOut(null);
    
    toast.success(`${newCityData.city} ajoutée !`);
    
    // Zoom to new city
    if (newCityData.lat && newCityData.lng) {
      eventBus.emit("map:zoom", {
        center: [newCityData.lng, newCityData.lat] as [number, number],
        zoom: 10,
      });
    }
  }, [newCityData, newCityCheckIn, newCityCheckOut, addLocalDestination]);

  // Handle location select for new city
  const handleNewCityLocationSelect = useCallback((location: LocationResult) => {
    setNewCityData({
      city: location.name,
      countryCode: location.country_code || "",
      lat: location.lat,
      lng: location.lng,
    });
  }, []);

  // Handle remove city - only local destinations can be removed
  const handleRemoveCity = useCallback((cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (!city) return;
    
    // Check if it's an inherited destination
    if (city.isInherited) {
      toast.error("Cette destination provient des hébergements. Modifiez-la dans l'onglet Hébergements.");
      return;
    }
    
    if (cities.filter((c) => !c.isInherited).length <= 0 && cities.length <= 1) {
      toast.error("Vous devez avoir au moins une destination");
      return;
    }
    
    removeLocalDestination(cityId);
    toast.success("Destination retirée");

    // If we removed the active city, switch to first city
    if (activeCityIndex >= cities.length - 1) {
      setActiveCityIndex(Math.max(0, cities.length - 2));
    }
  }, [cities, activeCityIndex, removeLocalDestination]);

  // Back to filters
  const handleBackToFilters = useCallback(() => {
    setCurrentView("filters");
    clearSearch();
  }, [clearSearch]);

  // Load recommendations
  const handleLoadRecommendations = useCallback(() => {
    if (activeCity) {
      loadRecommendations(activeCity.id);
      setCurrentView("results");
    }
  }, [activeCity, loadRecommendations]);

  // Handle city tab click with map zoom (same speed as hotels)
  const handleCityClick = useCallback((index: number) => {
    setActiveCityIndex(index);
    const city = cities[index];
    if (city?.lat && city?.lng) {
      eventBus.emit("map:zoom", {
        center: [city.lng, city.lat] as [number, number],
        zoom: 10,
      });
    }
  }, [cities]);

  // Listen to map:searchInArea event from map button
  useEffect(() => {
    const handleSearchInArea = () => {
      handleMapBoundsSearch();
    };

    eventBus.on("map:searchInArea", handleSearchInArea);

    return () => {
      eventBus.off("map:searchInArea", handleSearchInArea);
    };
  }, [handleMapBoundsSearch]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-3" data-tour="activities-panel">
      {/* City Tabs + Add button */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {cities.map((city, index) => (
          <div
            key={city.id}
            onClick={() => handleCityClick(index)}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 group cursor-pointer",
              index === activeCityIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
            )}
          >
            <Compass className="h-3 w-3" />
            <span
              className="max-w-24 truncate"
              title={`${city.city}${city.countryCode ? `, ${city.countryCode}` : ""}`}
            >
              {city.city}
            </span>
            {/* Delete button - visible on hover */}
            {cities.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCity(city.id);
                }}
                className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                  index === activeCityIndex
                    ? "hover:bg-primary-foreground/20"
                    : "hover:bg-destructive/20"
                )}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
        
        {/* Add button - compact */}
        {!isAddingCity && (
          <button
            onClick={handleStartAddCity}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30 hover:border-primary/50"
            title="Ajouter une destination"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Inline Add City Form */}
      {isAddingCity && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Nouvelle destination</span>
            <button
              onClick={handleCancelAddCity}
              className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
          
          {/* City Input */}
          <div className="rounded-lg border border-border/40 bg-card/50 p-2">
            <DestinationInput
              value={newCityInput}
              onChange={setNewCityInput}
              placeholder="Rechercher une ville..."
              onLocationSelect={handleNewCityLocationSelect}
            />
          </div>
          
          {/* Dates */}
          <div className="rounded-lg border border-border/40 bg-card/50 p-2">
            <CompactDateRange
              checkIn={newCityCheckIn}
              checkOut={newCityCheckOut}
              onChange={(checkIn, checkOut) => {
                setNewCityCheckIn(checkIn);
                setNewCityCheckOut(checkOut);
              }}
            />
          </div>
          
          {/* Confirm Button */}
          <Button
            onClick={handleConfirmAddCity}
            disabled={!newCityData?.city}
            size="sm"
            className="w-full"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter {newCityData?.city || "cette ville"}
          </Button>
        </div>
      )}

      {/* No Cities Message */}
      {cities.length === 0 && !isAddingCity && (
        <EmptyState
          icon={Compass}
          title="Aucune destination"
          description="Ajoutez une destination pour explorer les activités"
          action={
            <Button
              onClick={handleStartAddCity}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une destination
            </Button>
          }
        />
      )}

      {/* City Details Card */}
      {activeCity && !isAddingCity && (
        <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
          {/* City info line */}
          <div className="flex items-center gap-2.5 p-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Compass className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{activeCity.city}</span>
            </div>
            <div className="w-px h-6 bg-border/40" />
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              {activeCity.checkIn && activeCity.checkOut ? (
                <span className="text-foreground">
                  {formatDateRange(activeCity.checkIn, activeCity.checkOut)}
                </span>
              ) : (
                <span className="text-muted-foreground">Dates à définir</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Only show when we have an active city */}
      {activeCity && !isAddingCity && (
        <>
          {/* FILTERS VIEW */}
          {currentView === "filters" && (
            <div className="space-y-4">
              {/* Filters Card */}
              <div className="rounded-xl border border-border/40 bg-card/50 p-3">
                <ActivityFilters
                  filters={activityState.activeFilters}
                  onFiltersChange={updateFilters}
                  compact={false}
                  travelers={travelers}
                />
              </div>

              {/* City Search Button */}
              <Button
                onClick={handleSearch}
                disabled={!activeCity || isSearching}
                className="w-full gap-2"
                size="lg"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Rechercher des activités
                  </>
                )}
              </Button>

              {/* Recommendations Button */}
              <Button
                onClick={handleLoadRecommendations}
                variant="outline"
                disabled={!activeCity || activityState.isLoadingRecommendations}
                className="w-full gap-2"
              >
                {activityState.isLoadingRecommendations ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Suggestions IA
                  </>
                )}
              </Button>

              {/* Planned Activities Preview */}
              {plannedActivities.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">
                      Activités sélectionnées ({plannedActivities.length})
                    </p>
                    <p className="text-xs text-primary font-semibold">{getTotalBudget()}€</p>
                  </div>
                  <div className="space-y-2">
                    {plannedActivities.slice(0, 3).map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        mode="planned"
                        compact
                        onRemove={() => handleRemoveActivity(activity.id)}
                      />
                    ))}
                    {plannedActivities.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{plannedActivities.length - 3} autres
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESULTS VIEW */}
          {currentView === "results" && (
            <div className="space-y-4">
              {/* Header with Back + Sort */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBackToFilters}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </button>

                {/* Sort options */}
                {!searchError && sortedSearchResults.length > 0 && (
                  <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="text-xs bg-transparent border-none text-muted-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="default">Par défaut</option>
                      <option value="price_asc">Prix ↑</option>
                      <option value="price_desc">Prix ↓</option>
                      <option value="rating">Meilleures notes</option>
                      <option value="duration">Plus longue durée</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Results count with type breakdown */}
              {!searchError && sortedSearchResults.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-foreground">
                    {sortedSearchResults.length} résultat{sortedSearchResults.length > 1 ? "s" : ""} trouvé{sortedSearchResults.length > 1 ? "s" : ""}
                  </p>
                  {/* Breakdown if both types present (unified search) */}
                  {typeBreakdown.activity > 0 && typeBreakdown.attraction > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {typeBreakdown.activity} activité{typeBreakdown.activity > 1 ? "s" : ""} · {typeBreakdown.attraction} attraction{typeBreakdown.attraction > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Error State */}
              {searchError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{searchError}</p>
                </div>
              )}

              {/* Results - 1 card per row for better image visibility */}
              {!searchError && sortedSearchResults.length > 0 && (
                <div className="space-y-3">
                  {sortedSearchResults.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      mode="search"
                      onClick={() => handleActivityClick(activity)}
                      onAdd={() => handleAddActivity(activity)}
                    />
                  ))}
                </div>
              )}

              {/* Empty Results */}
              {!searchError && sortedSearchResults.length === 0 && !isSearching && (
                <EmptyState
                  icon={Search}
                  title="Aucune activité trouvée"
                  description="Essayez de modifier vos critères de recherche"
                />
              )}

              {/* Loading */}
              {isSearching && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <ActivityDetailModal
        activity={detailModalActivity}
        open={!!detailModalActivity}
        onClose={() => setDetailModalActivity(null)}
        onAdd={detailModalActivity ? () => handleAddActivity(detailModalActivity) : undefined}
      />
    </div>
  );
};

export default memo(ActivitiesPanel);
