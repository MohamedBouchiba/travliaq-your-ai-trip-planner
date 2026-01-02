/**
 * Activities Panel - Complete Refactor with Viator API Integration
 *
 * Features:
 * - Tab-based navigation (Search, Recommendations, My Planning)
 * - Real-time activity search with Viator API
 * - AI-powered recommendations
 * - Activity filtering and sorting
 * - Multi-destination support
 * - Planned activities management
 */

import { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Calendar, Plane, Loader2, Grid3x3, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useActivityMemory } from "@/contexts/ActivityMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";
import { usePreferenceMemory } from "@/contexts/PreferenceMemoryContext";
import { ActivityCard } from "./ActivityCard";
import { ActivityFilters } from "./ActivityFilters";
import { ActivitySearchBar } from "./ActivitySearchBar";
import { ActivityDetailModal } from "./ActivityDetailModal";
import { toast } from "sonner";
import { eventBus } from "@/lib/eventBus";
import type { ActivitySearchParams, ViatorActivity } from "@/types/activity";

// ============================================================================
// TYPES
// ============================================================================

type TabType = "search" | "recommendations" | "planning";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  badge?: number;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span
        className={cn(
          "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
        )}
      >
        {badge}
      </span>
    )}
  </button>
);

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
    updateActivity,
    removeActivity,
    selectActivity,
    getActivitiesByDestination,
    updateFilters,
    getTotalBudget,
  } = useActivityMemory();

  const { memory: accommodationMemory } = useAccommodationMemory();
  const { memory: preferenceMemory } = usePreferenceMemory();

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("search");
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [detailModalActivity, setDetailModalActivity] = useState<ViatorActivity | null>(null);

  // Auto-select first destination
  useEffect(() => {
    if (!selectedDestination && accommodationMemory.accommodations.length > 0) {
      setSelectedDestination(accommodationMemory.accommodations[0].id);
    }
  }, [selectedDestination, accommodationMemory.accommodations]);

  // Get current destination
  const currentDestination = accommodationMemory.accommodations.find((a) => a.id === selectedDestination);

  // Get activities for current destination
  const plannedActivities = selectedDestination ? getActivitiesByDestination(selectedDestination) : [];

  // Handle search
  const handleSearch = useCallback(
    async (params: ActivitySearchParams) => {
      try {
        await searchActivities(params);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors de la recherche");
      }
    },
    [searchActivities]
  );

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    try {
      await loadMoreResults();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du chargement");
    }
  }, [loadMoreResults]);

  // Handle add activity
  const handleAddActivity = useCallback(
    (viatorActivity: any) => {
      if (!selectedDestination) {
        toast.error("Veuillez sélectionner une destination");
        return;
      }

      addActivityFromSearch(viatorActivity, selectedDestination);
    },
    [selectedDestination, addActivityFromSearch]
  );

  // Handle remove activity
  const handleRemoveActivity = useCallback(
    (activityId: string) => {
      removeActivity(activityId);
    },
    [removeActivity]
  );

  // Handle activity click
  const handleActivityClick = useCallback(
    (activity: ViatorActivity) => {
      setDetailModalActivity(activity);
      selectActivity(activity.id);
    },
    [selectActivity]
  );

  // Check if activity is in trip
  const isActivityInTrip = useCallback(
    (activityId: string) => {
      return activityState.activities.some((a) => a.viatorId === activityId);
    },
    [activityState.activities]
  );

  // Load recommendations when switching to recommendations tab
  useEffect(() => {
    if (activeTab === "recommendations" && selectedDestination && activityState.recommendations.length === 0) {
      loadRecommendations(selectedDestination);
    }
  }, [activeTab, selectedDestination, activityState.recommendations.length, loadRecommendations]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="h-full flex flex-col" data-tour="activities-panel">
      {/* No Destination Message */}
      {accommodationMemory.accommodations.length === 0 && (
        <EmptyState
          icon={Plane}
          title="Aucune destination configurée"
          description="Ajoutez d'abord une destination dans l'onglet vols pour découvrir des activités"
          action={
            <Button
              onClick={() => eventBus.emit("tab:change", { tab: "flights" })}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plane className="h-3.5 w-3.5" />
              Aller aux vols
            </Button>
          }
        />
      )}

      {/* Main Content */}
      {accommodationMemory.accommodations.length > 0 && (
        <>
          {/* Destination Selector (if multi-destination) */}
          {accommodationMemory.accommodations.length > 1 && (
            <div className="pb-3 border-b border-border/30">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {accommodationMemory.accommodations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => setSelectedDestination(dest.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                      selectedDestination === dest.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {dest.city || `Destination ${accommodationMemory.accommodations.indexOf(dest) + 1}`}
                    <span className="text-[10px] opacity-60">({getActivitiesByDestination(dest.id).length})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="py-3 flex gap-2">
            <TabButton
              active={activeTab === "search"}
              onClick={() => setActiveTab("search")}
              icon={Search}
              label="Recherche"
            />
            <TabButton
              active={activeTab === "recommendations"}
              onClick={() => setActiveTab("recommendations")}
              icon={Sparkles}
              label="Suggestions"
              badge={activityState.recommendations.length}
            />
            <TabButton
              active={activeTab === "planning"}
              onClick={() => setActiveTab("planning")}
              icon={Calendar}
              label="Mon Planning"
              badge={plannedActivities.length}
            />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {/* SEARCH TAB */}
            {activeTab === "search" && (
              <div className="space-y-4">
                {/* Search Bar */}
                <ActivitySearchBar
                  defaultCity={currentDestination?.city || ""}
                  defaultCountryCode={currentDestination?.country || ""}
                  defaultStartDate={currentDestination?.checkIn || ""}
                  onSearch={handleSearch}
                  isSearching={activityState.search.isSearching}
                />

                {/* Filters */}
                <ActivityFilters
                  filters={activityState.activeFilters}
                  onFiltersChange={updateFilters}
                  compact={false}
                />

                {/* Search Results */}
                {activityState.search.error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Erreur de recherche</p>
                      <p className="text-xs text-destructive/80 mt-1">{activityState.search.error}</p>
                    </div>
                  </div>
                )}

                {activityState.search.searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {activityState.search.totalResults} activité{activityState.search.totalResults > 1 ? "s" : ""}{" "}
                        trouvée{activityState.search.totalResults > 1 ? "s" : ""}
                      </p>
                      <button
                        onClick={clearSearch}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Effacer
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {activityState.search.searchResults.map((activity) => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          mode="search"
                          onAdd={() => handleAddActivity(activity)}
                          onClick={() => handleActivityClick(activity)}
                        />
                      ))}
                    </div>

                    {/* Load More */}
                    {activityState.search.hasMore && (
                      <Button
                        onClick={handleLoadMore}
                        disabled={activityState.search.isLoadingMore}
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                      >
                        {activityState.search.isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Chargement...
                          </>
                        ) : (
                          <>Voir plus</>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {!activityState.search.isSearching &&
                  activityState.search.searchResults.length === 0 &&
                  !activityState.search.error && (
                    <EmptyState
                      icon={Search}
                      title="Recherchez des activités"
                      description="Découvrez des milliers d'activités, visites guidées et expériences uniques"
                    />
                  )}
              </div>
            )}

            {/* RECOMMENDATIONS TAB */}
            {activeTab === "recommendations" && (
              <div className="space-y-4">
                {activityState.isLoadingRecommendations && (
                  <div className="py-12 flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Chargement des recommandations...</p>
                  </div>
                )}

                {!activityState.isLoadingRecommendations && activityState.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Recommandations pour vous</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
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

                {!activityState.isLoadingRecommendations && activityState.recommendations.length === 0 && (
                  <EmptyState
                    icon={Sparkles}
                    title="Aucune recommandation"
                    description="Nous n'avons pas trouvé de recommandations personnalisées pour le moment"
                    action={
                      <Button
                        onClick={() => selectedDestination && loadRecommendations(selectedDestination)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Recharger
                      </Button>
                    }
                  />
                )}
              </div>
            )}

            {/* PLANNING TAB */}
            {activeTab === "planning" && (
              <div className="space-y-4">
                {plannedActivities.length > 0 && (
                  <>
                    {/* Budget Summary */}
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Budget total activités</span>
                        <span className="text-lg font-bold text-primary">{getTotalBudget()}€</span>
                      </div>
                    </div>

                    {/* Planned Activities List */}
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        {plannedActivities.length} activité{plannedActivities.length > 1 ? "s" : ""} planifiée
                        {plannedActivities.length > 1 ? "s" : ""}
                      </p>

                      <div className="grid grid-cols-1 gap-3">
                        {plannedActivities.map((activity) => (
                          <ActivityCard
                            key={activity.id}
                            activity={activity}
                            mode="planned"
                            onClick={() => {
                              // For planned activities, we need to convert back to Viator format if available
                              if (activity.viatorId) {
                                // Find in search results or recommendations
                                const viatorActivity =
                                  activityState.search.searchResults.find((a) => a.id === activity.viatorId) ||
                                  activityState.recommendations.find((a) => a.id === activity.viatorId);
                                if (viatorActivity) {
                                  handleActivityClick(viatorActivity);
                                }
                              }
                            }}
                            onRemove={() => handleRemoveActivity(activity.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {plannedActivities.length === 0 && (
                  <EmptyState
                    icon={Calendar}
                    title="Aucune activité planifiée"
                    description="Recherchez et ajoutez des activités à votre itinéraire"
                    action={
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => setActiveTab("search")} size="sm" className="gap-2">
                          <Search className="h-3.5 w-3.5" />
                          Rechercher des activités
                        </Button>
                        <Button
                          onClick={() => setActiveTab("recommendations")}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Voir les suggestions
                        </Button>
                      </div>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={detailModalActivity}
        open={!!detailModalActivity}
        onClose={() => setDetailModalActivity(null)}
        onAdd={(activity) => handleAddActivity(activity)}
        onRemove={(activityId) => handleRemoveActivity(activityId)}
        isInTrip={detailModalActivity ? isActivityInTrip(detailModalActivity.id) : false}
      />
    </div>
  );
};

export default ActivitiesPanel;
