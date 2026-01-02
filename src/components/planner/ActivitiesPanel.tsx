/**
 * Activities Panel - Matching AccommodationPanel UX exactly
 *
 * Features:
 * - City tabs identical to AccommodationPanel (with "+" button)
 * - Inline city input when adding (not popup)
 * - Zoom to city on map when switching tabs
 * - Two-view system: filters + results
 * - Activity cards in 2-column grid
 * - Detail modal on click
 */

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { 
  Search, Sparkles, Loader2, Plus, Hotel, X,
  ChevronLeft, AlertCircle, CalendarDays, Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useActivityMemory } from "@/contexts/ActivityMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";

import { ActivityCard } from "./ActivityCard";
import { ActivityFilters } from "./ActivityFilters";
import { ActivityDetailModal } from "./ActivityDetailModal";
import { toast } from "sonner";
import { eventBus } from "@/lib/eventBus";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { ViatorActivity } from "@/types/activity";

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ActivitiesPanel = () => {
  const {
    state: activityState,
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
        lat: acc.lat,
        lng: acc.lng,
      }));
  }, [accommodationMemory.accommodations]);

  // Active city
  const activeCity = cities[activeCityIndex] || null;

  // Get planned activities for current city
  const plannedActivities = activeCity ? getActivitiesByDestination(activeCity.id) : [];

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
        eventBus.emit("map:zoom", {
          center: [activity.coordinates.lng, activity.coordinates.lat] as [number, number],
          zoom: 15,
        });
      }
    },
    [selectActivity]
  );

  // Handle click to add city - redirect to Accommodation
  const handleAddCityClick = useCallback(() => {
    toast.info("Ajoutez une destination dans l'onglet Hébergements", {
      action: {
        label: "Aller",
        onClick: () => eventBus.emit("tab:change", { tab: "stays" }),
      },
    });
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

  // Handle city tab click with map zoom (same speed as hotels)
  const handleCityClick = useCallback((index: number) => {
    setActiveCityIndex(index);
    const city = cities[index];
    if (city?.lat && city?.lng) {
      eventBus.emit("map:zoom", {
        center: [city.lng, city.lat] as [number, number],
        zoom: 12,
      });
    }
  }, [cities]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-3" data-tour="activities-panel">
      {/* No Cities Message */}
      {cities.length === 0 && (
        <EmptyState
          icon={Compass}
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

      {/* City Tabs - Like AccommodationPanel with delete button */}
      {cities.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {cities.map((city, index) => (
            <button
              key={city.id}
              onClick={() => handleCityClick(index)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 group",
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
              {/* Delete button - visible on hover like AccommodationPanel */}
              {cities.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.info("Pour supprimer cette ville, allez dans Hébergements");
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
            </button>
          ))}
          
          {/* Add button - always visible */}
          <button
            onClick={handleAddCityClick}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-primary hover:text-primary/80 transition-colors rounded-lg border border-dashed border-primary/30 hover:border-primary/50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter</span>
          </button>
        </div>
      )}

      {/* City Details Card */}
      {activeCity && (
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
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{searchError}</p>
                </div>
              )}

              {/* Results Grid - 2 columns */}
              {!searchError && searchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {searchResults.map((activity) => (
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
              {!searchError && searchResults.length === 0 && !isSearching && (
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
