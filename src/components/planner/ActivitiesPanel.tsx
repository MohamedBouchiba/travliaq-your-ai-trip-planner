/**
 * Activities Panel - Matching AccommodationPanel UX
 *
 * Features:
 * - City tabs like AccommodationPanel (with "+" button for adding)
 * - Inline city input when adding (not popup)
 * - Two-view system: filters + results
 * - Activity cards in 2-column grid
 * - Detail modal on click
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  Search, Sparkles, Loader2, Plus, X, MapPin, Hotel,
  ChevronLeft, AlertCircle, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActivityMemory } from "@/contexts/ActivityMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";
import { ActivityCard } from "./ActivityCard";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityDetailModal } from "./ActivityDetailModal";
import { toast } from "sonner";
import { eventBus } from "@/lib/eventBus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { ActivitySearchParams, ViatorActivity, ActivityFilters as ActivityFiltersType } from "@/types/activity";

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ActivitiesPanel = () => {
  const {
    state: activityState,
    searchActivities,
    loadMoreResults,
    clearSearch,
    loadRecommendations,
    addActivityFromSearch,
    removeActivity,
    selectActivity,
    getActivitiesByDestination,
    updateFilters,
    getTotalBudget,
  } = useActivityMemory();

  const { memory: accommodationMemory } = useAccommodationMemory();

  // UI State
  const [currentView, setCurrentView] = useState<ViewType>("filters");
  const [activeCityIndex, setActiveCityIndex] = useState(0);
  const [detailModalActivity, setDetailModalActivity] = useState<ViatorActivity | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ViatorActivity[]>([]);
  
  // Add city state
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityCountry, setNewCityCountry] = useState("");
  const [newCityDate, setNewCityDate] = useState("");
  const addCityInputRef = useRef<HTMLInputElement>(null);

  // Derive cities from accommodations (like AccommodationPanel)
  const cities = useMemo<CityEntry[]>(() => {
    return accommodationMemory.accommodations
      .filter((acc) => acc.city && acc.city.length > 0)
      .map((acc) => ({
        id: acc.id,
        city: acc.city,
        countryCode: acc.countryCode || "",
        checkIn: acc.checkIn,
        checkOut: acc.checkOut,
      }));
  }, [accommodationMemory.accommodations]);

  // Active city
  const activeCity = cities[activeCityIndex] || null;

  // Get planned activities for current city
  const plannedActivities = activeCity ? getActivitiesByDestination(activeCity.id) : [];

  // Format date for display
  const formatDateRange = (checkIn: Date | null, checkOut: Date | null) => {
    if (!checkIn) return "";
    const start = format(checkIn, "d MMM", { locale: fr });
    if (checkOut) {
      const end = format(checkOut, "d MMM", { locale: fr });
      return `${start} - ${end}`;
    }
    return start;
  };

  // Focus city on map when switching
  const prevCityIndexRef = useRef(activeCityIndex);
  useEffect(() => {
    if (prevCityIndexRef.current !== activeCityIndex && activeCity) {
      prevCityIndexRef.current = activeCityIndex;
      eventBus.emit("activities:cityFocus", {
        city: activeCity.city,
        countryCode: activeCity.countryCode,
      });
    }
  }, [activeCityIndex, activeCity]);

  // Focus input when adding city
  useEffect(() => {
    if (isAddingCity && addCityInputRef.current) {
      addCityInputRef.current.focus();
    }
  }, [isAddingCity]);

  // Handle search using Supabase edge function
  const handleSearch = useCallback(async () => {
    if (!activeCity) {
      toast.error("Veuillez sélectionner une ville");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const requestBody = {
        location: {
          city: activeCity.city,
          country_code: activeCity.countryCode,
        },
        dates: {
          start: activeCity.checkIn?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0],
          end: activeCity.checkOut?.toISOString().split("T")[0],
        },
        filters: {
          categories: activityState.activeFilters.categories,
          price_range: {
            min: activityState.activeFilters.priceRange[0],
            max: activityState.activeFilters.priceRange[1],
          },
          rating_min: activityState.activeFilters.ratingMin,
        },
        currency: "EUR",
        language: "fr",
        pagination: {
          page: 1,
          limit: 20,
        },
      };

      const { data, error } = await supabase.functions.invoke("activities-search", {
        body: requestBody,
      });

      if (error) {
        throw new Error(error.message || "Erreur lors de la recherche");
      }

      if (data?.activities) {
        setSearchResults(data.activities);
        setCurrentView("results");
      } else {
        setSearchResults([]);
        setCurrentView("results");
      }
    } catch (error: any) {
      console.error("Search error:", error);
      setSearchError(error.message || "Erreur lors de la recherche");
      setCurrentView("results");
    } finally {
      setIsSearching(false);
    }
  }, [activeCity, activityState.activeFilters]);

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
        eventBus.emit("map:moveToLocation", {
          lat: activity.coordinates.lat,
          lng: activity.coordinates.lng,
          zoom: 15,
        });
      }
    },
    [selectActivity]
  );

  // Handle add city submission
  const handleAddCity = useCallback(() => {
    if (!newCityName.trim()) {
      toast.error("Veuillez entrer un nom de ville");
      return;
    }
    // Notify user to add via accommodations tab
    toast.info(`Pour ajouter ${newCityName}, utilisez l'onglet Hébergements`);
    setIsAddingCity(false);
    setNewCityName("");
    setNewCityCountry("");
    setNewCityDate("");
  }, [newCityName]);

  // Cancel add city
  const handleCancelAddCity = useCallback(() => {
    setIsAddingCity(false);
    setNewCityName("");
    setNewCityCountry("");
    setNewCityDate("");
  }, []);

  // Back to filters
  const handleBackToFilters = useCallback(() => {
    setCurrentView("filters");
    setSearchResults([]);
    setSearchError(null);
  }, []);

  // Load recommendations
  const handleLoadRecommendations = useCallback(() => {
    if (activeCity) {
      loadRecommendations(activeCity.id);
      setCurrentView("results");
    }
  }, [activeCity, loadRecommendations]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-3" data-tour="activities-panel">
      {/* No Cities Message */}
      {cities.length === 0 && !isAddingCity && (
        <EmptyState
          icon={MapPin}
          title="Aucune destination"
          description="Ajoutez d'abord une destination dans l'onglet Hébergements"
          action={
            <Button
              onClick={() => eventBus.emit("tab:change", { tab: "stays" })}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Hotel className="h-3.5 w-3.5" />
              Aller aux hébergements
            </Button>
          }
        />
      )}

      {/* City Tabs - Like AccommodationPanel */}
      {(cities.length > 0 || isAddingCity) && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {cities.map((city, index) => (
            <button
              key={city.id}
              onClick={() => setActiveCityIndex(index)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 group",
                index === activeCityIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
              )}
            >
              <MapPin className="h-3 w-3" />
              <div className="flex flex-col items-start">
                <span className="max-w-24 truncate" title={`${city.city}${city.countryCode ? `, ${city.countryCode}` : ""}`}>
                  {city.city}{city.countryCode ? `, ${city.countryCode}` : ""}
                </span>
                {(city.checkIn || city.checkOut) && (
                  <span className={cn(
                    "text-[10px]",
                    index === activeCityIndex ? "text-primary-foreground/70" : "text-muted-foreground/70"
                  )}>
                    {formatDateRange(city.checkIn, city.checkOut)}
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* Add City Button / Input */}
          {isAddingCity ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-primary/30 bg-muted/30">
              <input
                ref={addCityInputRef}
                type="text"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="Ville..."
                className="w-20 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCity();
                  if (e.key === "Escape") handleCancelAddCity();
                }}
              />
              <input
                type="text"
                value={newCityCountry}
                onChange={(e) => setNewCityCountry(e.target.value.toUpperCase())}
                placeholder="FR"
                className="w-8 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none text-center"
                maxLength={2}
              />
              <input
                type="date"
                value={newCityDate}
                onChange={(e) => setNewCityDate(e.target.value)}
                className="w-28 bg-transparent text-xs focus:outline-none"
              />
              <button
                onClick={handleAddCity}
                className="p-0.5 rounded hover:bg-primary/20 text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleCancelAddCity}
                className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingCity(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-primary hover:text-primary/80 transition-colors rounded-lg border border-dashed border-primary/30 hover:border-primary/50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content - Only show when we have an active city */}
      {activeCity && (
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
                />
              </div>

              {/* Search Button */}
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
              {/* Back Button */}
              <button
                onClick={handleBackToFilters}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Retour aux filtres
              </button>

              {/* Error State */}
              {searchError && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Erreur de recherche</p>
                    <p className="text-xs text-destructive/80 mt-1">{searchError}</p>
                  </div>
                </div>
              )}

              {/* Results Header */}
              {searchResults.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={handleBackToFilters}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Nouvelle recherche
                  </button>
                </div>
              )}

              {/* Results Grid - 2 columns */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      mode="search"
                      onAdd={() => handleAddActivity(activity)}
                      onClick={() => handleActivityClick(activity)}
                    />
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {activityState.recommendations.length > 0 && searchResults.length === 0 && !searchError && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Recommandations pour vous</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {activityState.recommendations.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        mode="search"
                        onAdd={() => handleAddActivity(activity)}
                        onClick={() => handleActivityClick(activity)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isSearching && searchResults.length === 0 && activityState.recommendations.length === 0 && !searchError && (
                <EmptyState
                  icon={Search}
                  title="Aucun résultat"
                  description="Essayez de modifier vos filtres ou d'élargir votre recherche"
                  action={
                    <Button onClick={handleBackToFilters} variant="outline" size="sm">
                      Modifier les filtres
                    </Button>
                  }
                />
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
        onAdd={handleAddActivity}
        isInTrip={detailModalActivity ? activityState.activities.some((a) => a.viatorId === detailModalActivity.id) : false}
      />
    </div>
  );
};

export default ActivitiesPanel;
