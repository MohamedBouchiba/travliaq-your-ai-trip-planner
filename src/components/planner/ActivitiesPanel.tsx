/**
 * Activities Panel - V2 with Travliaq API integration
 * Features: API search, visual cards, date sync, map integration
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { MapPin, Clock, Star, Search, Plane, Heart, RefreshCw, ChevronDown, ChevronUp, Calendar, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActivityMemory, TravliaqActivity, ActivityEntry } from "@/contexts/ActivityMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";
import { useActivitiesSearch } from "@/hooks/useActivitiesSearch";
import { ActivityCard } from "@/components/planner/ActivityCard";
import { ActivityCardSkeleton, ActivityCardSkeletonGrid } from "@/components/skeletons/ActivityCardSkeleton";
import { eventBus } from "@/lib/eventBus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ============================================================================
// FILTER CHIPS COMPONENT
// ============================================================================

interface FilterChipsProps {
  categories: string[];
  selected: string[];
  onToggle: (cat: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  museum: "Musées",
  food: "Gastronomie",
  outdoor: "Plein air",
  tours: "Visites guidées",
  attraction: "Attractions",
  shows: "Spectacles",
  adventure: "Aventure",
  wellness: "Bien-être",
  nightlife: "Vie nocturne",
  shopping: "Shopping",
};

const FilterChips = ({ categories, selected, onToggle }: FilterChipsProps) => (
  <div className="flex flex-wrap gap-1.5">
    {categories.map(cat => (
      <button
        key={cat}
        onClick={() => onToggle(cat)}
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
          selected.includes(cat)
            ? "bg-primary text-primary-foreground"
            : "bg-muted/50 text-muted-foreground hover:bg-muted"
        )}
      >
        {CATEGORY_LABELS[cat] || cat}
      </button>
    ))}
  </div>
);

// ============================================================================
// SAVED ACTIVITIES SECTION
// ============================================================================

interface SavedActivitiesSectionProps {
  activities: ActivityEntry[];
  onUnsave: (id: string) => void;
}

const SavedActivitiesSection = ({ activities, onUnsave }: SavedActivitiesSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (activities.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary fill-primary" />
          <span className="text-sm font-medium">Mes activités sauvegardées</span>
          <span className="text-xs text-muted-foreground">({activities.length})</span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        {activities.map(activity => (
          <div 
            key={activity.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
          >
            {activity.imageUrl && (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={activity.imageUrl}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{activity.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{activity.durationFormatted}</span>
                <span>•</span>
                <span className="text-primary font-medium">
                  {activity.fromPrice}€
                </span>
              </div>
            </div>
            <button
              onClick={() => onUnsave(activity.id)}
              className="p-1.5 rounded-full text-red-500 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Heart className="h-4 w-4 fill-current" />
            </button>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

const ActivitiesPanel = () => {
  const { 
    memory: activityMemory, 
    saveActivity, 
    unsaveActivity,
    getSavedActivitiesByDestination,
    isActivitySaved,
    setActiveDestination,
  } = useActivityMemory();
  
  const { memory: accommodationMemory } = useAccommodationMemory();
  const { results, loading, error, totalCount, search, reset } = useActivitiesSearch();

  // UI State
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterBudget, setFilterBudget] = useState<[number, number]>([0, 300]);
  const [filterRating, setFilterRating] = useState<number>(0);

  // Available filter categories
  const availableCategories = useMemo(() => [
    "museum", "food", "outdoor", "tours", "attraction", "shows", "adventure"
  ], []);

  // Get current destination
  const currentDestination = useMemo(() => {
    if (!selectedDestinationId) return null;
    return accommodationMemory.accommodations.find(a => a.id === selectedDestinationId) || null;
  }, [selectedDestinationId, accommodationMemory.accommodations]);

  // Get saved activities for current destination
  const savedActivities = useMemo(() => {
    if (!selectedDestinationId) return [];
    return getSavedActivitiesByDestination(selectedDestinationId);
  }, [selectedDestinationId, getSavedActivitiesByDestination]);

  // Auto-select first destination with city on mount
  useEffect(() => {
    if (!selectedDestinationId && accommodationMemory.accommodations.length > 0) {
      const firstWithCity = accommodationMemory.accommodations.find(a => a.city);
      if (firstWithCity) {
        setSelectedDestinationId(firstWithCity.id);
        setActiveDestination(firstWithCity.id);
      }
    }
  }, [selectedDestinationId, accommodationMemory.accommodations, setActiveDestination]);

  // Auto-search when destination has city + dates
  useEffect(() => {
    if (!currentDestination?.city || !currentDestination?.countryCode || !currentDestination?.checkIn) {
      reset();
      return;
    }

    search({
      city: currentDestination.city,
      countryCode: currentDestination.countryCode,
      startDate: format(currentDestination.checkIn, "yyyy-MM-dd"),
      endDate: currentDestination.checkOut ? format(currentDestination.checkOut, "yyyy-MM-dd") : undefined,
      categories: filterCategories.length > 0 ? filterCategories : undefined,
      priceRange: filterBudget[0] > 0 || filterBudget[1] < 300 
        ? { min: filterBudget[0], max: filterBudget[1] } 
        : undefined,
      ratingMin: filterRating > 0 ? filterRating : undefined,
      page: 1,
      limit: 20,
    });
  }, [
    currentDestination?.city,
    currentDestination?.countryCode,
    currentDestination?.checkIn,
    currentDestination?.checkOut,
    filterCategories,
    filterBudget,
    filterRating,
    search,
    reset,
  ]);

  // Handlers
  const handleDestinationChange = useCallback((id: string) => {
    setSelectedDestinationId(id);
    setActiveDestination(id);
    reset();
  }, [setActiveDestination, reset]);

  const handleCategoryToggle = useCallback((cat: string) => {
    setFilterCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleSaveActivity = useCallback((activity: TravliaqActivity) => {
    if (!currentDestination) return;
    
    saveActivity(activity, currentDestination.id, {
      city: currentDestination.city || "",
      country: currentDestination.country || "",
      countryCode: currentDestination.countryCode || "",
      checkIn: currentDestination.checkIn,
      checkOut: currentDestination.checkOut,
    });
  }, [currentDestination, saveActivity]);

  const handleUnsaveActivity = useCallback((viatorId: string) => {
    const saved = savedActivities.find(a => a.viatorId === viatorId);
    if (saved) {
      unsaveActivity(saved.id);
    }
  }, [savedActivities, unsaveActivity]);

  const handleRefresh = useCallback(() => {
    if (!currentDestination?.city || !currentDestination?.countryCode || !currentDestination?.checkIn) return;
    
    search({
      city: currentDestination.city,
      countryCode: currentDestination.countryCode,
      startDate: format(currentDestination.checkIn, "yyyy-MM-dd"),
      categories: filterCategories.length > 0 ? filterCategories : undefined,
      page: 1,
      limit: 20,
    });
  }, [currentDestination, filterCategories, search]);

  // Date display
  const dateDisplay = useMemo(() => {
    if (!currentDestination?.checkIn) return null;
    const start = format(currentDestination.checkIn, "d MMM", { locale: fr });
    const end = currentDestination.checkOut 
      ? format(currentDestination.checkOut, "d MMM", { locale: fr })
      : null;
    return end ? `${start} - ${end}` : start;
  }, [currentDestination]);

  // Filter results by search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const query = searchQuery.toLowerCase();
    return results.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query)
    );
  }, [results, searchQuery]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // No destinations configured
  if (accommodationMemory.accommodations.length === 0 || !accommodationMemory.accommodations.some(a => a.city)) {
    return (
      <div className="py-12 text-center space-y-4" data-tour="activities-panel">
        <span className="text-5xl mb-4 block">🗺️</span>
        <div>
          <p className="text-sm text-muted-foreground">
            Aucune destination configurée
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez d'abord une destination dans l'onglet vols
          </p>
        </div>
        <Button
          onClick={() => eventBus.emit("tab:change", { tab: "flights" })}
          variant="outline"
          size="sm"
          className="mx-auto"
        >
          <Plane className="h-3.5 w-3.5 mr-2" />
          Aller aux vols
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-tour="activities-panel">
      {/* Destination Tabs */}
      {accommodationMemory.accommodations.filter(a => a.city).length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {accommodationMemory.accommodations.filter(a => a.city).map(dest => (
            <button
              key={dest.id}
              onClick={() => handleDestinationChange(dest.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                selectedDestinationId === dest.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {dest.city}
              <span className="text-[10px] opacity-60">
                ({getSavedActivitiesByDestination(dest.id).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Current destination header with dates */}
      {currentDestination?.city && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{currentDestination.city}</span>
            {dateDisplay && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {dateDisplay}
                </div>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-7 px-2"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      )}

      {/* Missing dates warning */}
      {currentDestination?.city && !currentDestination?.checkIn && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Ajoutez des dates dans l'onglet Hébergements pour rechercher des activités
          </p>
        </div>
      )}

      {/* Search & Filters */}
      {currentDestination?.checkIn && (
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une activité..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Category filters */}
          <FilterChips
            categories={availableCategories}
            selected={filterCategories}
            onToggle={handleCategoryToggle}
          />

          {/* Budget filter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Budget</span>
              <span className="text-xs font-medium text-primary">
                {filterBudget[0]}€ - {filterBudget[1]}€
              </span>
            </div>
            <Slider
              value={filterBudget}
              onValueChange={(value) => setFilterBudget(value as [number, number])}
              min={0}
              max={300}
              step={10}
            />
          </div>

          {/* Rating filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Note min.</span>
            <div className="flex gap-1">
              {[0, 3, 3.5, 4, 4.5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setFilterRating(rating)}
                  className={cn(
                    "px-2 py-1 rounded text-xs transition-colors",
                    filterRating === rating
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {rating === 0 ? "Tous" : (
                    <span className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current" />
                      {rating}+
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved activities section */}
      <SavedActivitiesSection
        activities={savedActivities}
        onUnsave={unsaveActivity}
      />

      {/* Results */}
      <div className="space-y-3">
        {/* Results header */}
        {totalCount > 0 && !loading && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {totalCount} activité{totalCount > 1 ? "s" : ""} trouvée{totalCount > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && <ActivityCardSkeletonGrid count={4} />}

        {/* Error state */}
        {error && !loading && (
          <div className="py-8 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Réessayer
            </Button>
          </div>
        )}

        {/* No results */}
        {!loading && !error && filteredResults.length === 0 && currentDestination?.checkIn && (
          <div className="py-8 text-center space-y-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm text-muted-foreground">
              {results.length === 0
                ? "Aucune activité trouvée pour cette destination"
                : "Aucune activité ne correspond à votre recherche"}
            </p>
            {filterCategories.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterCategories([])}
              >
                Effacer les filtres
              </Button>
            )}
          </div>
        )}

        {/* Results grid */}
        {!loading && !error && filteredResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredResults.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isSaved={isActivitySaved(activity.id)}
                onSave={() => handleSaveActivity(activity)}
                onUnsave={() => handleUnsaveActivity(activity.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesPanel;
