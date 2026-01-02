/**
 * Activities Panel - Simplified version
 * - Shows only saved activities
 * - Button to trigger AI recommendations (results appear on map)
 * - Synchronized with flights & accommodation destinations
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { MapPin, Heart, Sparkles, ChevronDown, ChevronUp, Plane, X, Hotel, Calendar, ExternalLink, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useActivityMemory, ActivityEntry } from "@/contexts/ActivityMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";
import { useTravelMemory } from "@/contexts/TravelMemoryContext";
import { useActivitiesSearch } from "@/hooks/useActivitiesSearch";
import { eventBus } from "@/lib/eventBus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toastSuccess, toastInfo } from "@/lib/toast";

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
      {/* Thumbnail */}
      {activity.imageUrl && (
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Info */}
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
        <div className="flex items-center gap-2 mt-2">
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

      {/* Remove button */}
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
  } = useActivityMemory();
  
  const { memory: accommodationMemory } = useAccommodationMemory();
  const { memory: travelMemory } = useTravelMemory();
  const { loading, search, reset } = useActivitiesSearch();

  // UI State
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [isSearchingAI, setIsSearchingAI] = useState(false);

  // Get destinations from accommodation (synced with flights)
  const destinations = useMemo(() => {
    return accommodationMemory.accommodations.filter(a => a.city);
  }, [accommodationMemory.accommodations]);

  // Get current destination
  const currentDestination = useMemo(() => {
    if (!selectedDestinationId) return null;
    return destinations.find(a => a.id === selectedDestinationId) || null;
  }, [selectedDestinationId, destinations]);

  // Get saved activities for current destination
  const savedActivities = useMemo(() => {
    if (!selectedDestinationId) return [];
    return getSavedActivitiesByDestination(selectedDestinationId);
  }, [selectedDestinationId, getSavedActivitiesByDestination]);

  // Auto-select first destination on mount
  useEffect(() => {
    if (!selectedDestinationId && destinations.length > 0) {
      setSelectedDestinationId(destinations[0].id);
      setActiveDestination(destinations[0].id);
    }
  }, [selectedDestinationId, destinations, setActiveDestination]);

  // Handle destination change
  const handleDestinationChange = useCallback((id: string) => {
    setSelectedDestinationId(id);
    setActiveDestination(id);
  }, [setActiveDestination]);

  // Handle AI search - triggers search and emits event for map
  const handleAIRecommendations = useCallback(async () => {
    if (!currentDestination?.city || !currentDestination?.countryCode) {
      toastInfo("Sélectionnez une destination avec une ville");
      return;
    }

    setIsSearchingAI(true);

    // Notify parent/map to show activities
    if (onSearchActivities) {
      onSearchActivities(
        currentDestination.city,
        currentDestination.countryCode,
        currentDestination.checkIn,
        currentDestination.checkOut
      );
    }

    // Emit event for map to show activities
    eventBus.emit("activities:search", {
      city: currentDestination.city,
      countryCode: currentDestination.countryCode,
      checkIn: currentDestination.checkIn,
      checkOut: currentDestination.checkOut,
      destinationId: currentDestination.id,
    });

    // Actually perform the search
    try {
      await search({
        city: currentDestination.city,
        countryCode: currentDestination.countryCode,
        startDate: currentDestination.checkIn 
          ? format(currentDestination.checkIn, "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        endDate: currentDestination.checkOut
          ? format(currentDestination.checkOut, "yyyy-MM-dd")
          : undefined,
        page: 1,
        limit: 30,
      });
      
      toastSuccess(`Activités trouvées pour ${currentDestination.city} - regardez la carte !`);
    } catch (error) {
      console.error("Activity search error:", error);
    } finally {
      setIsSearchingAI(false);
    }
  }, [currentDestination, onSearchActivities, search]);

  // Handle remove activity
  const handleRemoveActivity = useCallback((id: string) => {
    unsaveActivity(id);
  }, [unsaveActivity]);

  // Date display for current destination
  const dateDisplay = useMemo(() => {
    if (!currentDestination?.checkIn) return null;
    const start = format(currentDestination.checkIn, "d MMM", { locale: fr });
    const end = currentDestination.checkOut 
      ? format(currentDestination.checkOut, "d MMM", { locale: fr })
      : null;
    return end ? `${start} - ${end}` : start;
  }, [currentDestination]);

  // ============================================================================
  // RENDER - No destinations
  // ============================================================================

  if (destinations.length === 0) {
    return (
      <div className="py-12 text-center space-y-4" data-tour="activities-panel">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Aucune destination</p>
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

  // ============================================================================
  // RENDER - Main panel
  // ============================================================================

  return (
    <div className="space-y-4" data-tour="activities-panel">
      {/* Destination Tabs */}
      {destinations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {destinations.map(dest => (
            <button
              key={dest.id}
              onClick={() => handleDestinationChange(dest.id)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2",
                selectedDestinationId === dest.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-border/30"
              )}
            >
              <Hotel className="h-3.5 w-3.5" />
              <span>{dest.city}</span>
              {getSavedActivitiesByDestination(dest.id).length > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  selectedDestinationId === dest.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}>
                  {getSavedActivitiesByDestination(dest.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Current destination info */}
      {currentDestination && (
        <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{currentDestination.city}</span>
              {currentDestination.country && (
                <span className="text-xs text-muted-foreground">
                  {currentDestination.country}
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

      {/* AI Recommendations Button */}
      <Button
        onClick={handleAIRecommendations}
        disabled={isSearchingAI || loading || !currentDestination?.city}
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
            Recommander des activités par l'IA
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Les résultats s'afficheront sur la carte
      </p>

      {/* Saved Activities Section */}
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
            {savedActivities.map(activity => (
              <SavedActivityCard
                key={activity.id}
                activity={activity}
                onRemove={() => handleRemoveActivity(activity.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Heart className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Aucune activité sauvegardée
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Cliquez sur le bouton ci-dessus pour découvrir des activités
          </p>
        </div>
      )}

      {/* Total saved across all destinations */}
      {totalSavedCount > 0 && destinations.length > 1 && (
        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            {totalSavedCount} activité{totalSavedCount > 1 ? "s" : ""} sauvegardée{totalSavedCount > 1 ? "s" : ""} au total
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPanel;
