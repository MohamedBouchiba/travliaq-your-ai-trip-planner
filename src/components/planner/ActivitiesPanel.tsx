/**
 * Activities Panel - Complete rewrite with memory integration
 * Features: Multi-destination support, CRUD operations, localStorage persistence
 */

import { useState, useEffect } from "react";
import { MapPin, Clock, Star, Palette, TreePine, Utensils, Sparkles, Heart, ShoppingBag, Music, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useActivityMemory, ActivityEntry } from "@/contexts/ActivityMemoryContext";
import { useAccommodationMemory } from "@/contexts/AccommodationMemoryContext";
import { toastSuccess, toastInfo } from "@/lib/toast";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <span className="text-sm font-medium text-foreground">{title}</span>
  </div>
);

const ChipButton = ({
  children,
  selected,
  onClick
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
      selected
        ? "bg-primary/10 text-primary border border-primary/30"
        : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
    )}
  >
    {children}
  </button>
);

// ============================================================================
// ACTIVITY CARD COMPONENT
// ============================================================================

interface ActivityCardProps {
  activity: ActivityEntry;
  onUpdate: (updates: Partial<ActivityEntry>) => void;
  onDelete: () => void;
}

const getCategoryEmoji = (category: ActivityEntry["category"]): string => {
  const emojiMap = {
    culture: "🎨",
    outdoor: "🌲",
    food: "🍽️",
    wellness: "💆",
    shopping: "🛍️",
    nightlife: "🎵",
  };
  return emojiMap[category] || "🎭";
};

const getDurationLabel = (duration: ActivityEntry["duration"]): string => {
  const labels = {
    short: "< 2h",
    medium: "2-4h",
    long: "> 4h",
  };
  return labels[duration] || duration;
};

const ActivityCard = ({ activity, onUpdate, onDelete }: ActivityCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/20 group transition-colors">
      <div className="flex items-start gap-3">
        {/* Category Icon */}
        <span className="text-2xl">{getCategoryEmoji(activity.category)}</span>

        <div className="flex-1 min-w-0">
          {/* Title (editable) */}
          {isEditing ? (
            <input
              value={activity.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              onBlur={() => setIsEditing(false)}
              className="w-full text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-foreground"
              autoFocus
            />
          ) : (
            <div
              className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {activity.title}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{getDurationLabel(activity.duration)}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-medium text-primary">
              {activity.priceMin === activity.priceMax
                ? `${activity.priceMin}€`
                : `${activity.priceMin}-${activity.priceMax}€`}
            </span>
            {activity.rating && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs text-muted-foreground">{activity.rating}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-all"
          title="Supprimer l'activité"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

const ActivitiesPanel = () => {
  const { memory: activityMemory, addActivity, updateActivity, removeActivity, getActivitiesByDestination } = useActivityMemory();
  const { memory: accommodationMemory } = useAccommodationMemory();

  // UI State
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterDuration, setFilterDuration] = useState<string | null>(null);
  const [filterBudget, setFilterBudget] = useState<[number, number]>([0, 200]);

  // Category definitions
  const categories = [
    { id: "culture", label: "Culture", icon: Palette },
    { id: "outdoor", label: "Nature", icon: TreePine },
    { id: "food", label: "Gastronomie", icon: Utensils },
    { id: "wellness", label: "Bien-être", icon: Sparkles },
    { id: "shopping", label: "Shopping", icon: ShoppingBag },
    { id: "nightlife", label: "Soirées", icon: Music },
  ];

  const durations = [
    { id: "short", label: "< 2h" },
    { id: "medium", label: "2-4h" },
    { id: "long", label: "> 4h" },
  ];

  // Auto-select first destination on mount
  useEffect(() => {
    if (!selectedDestination && accommodationMemory.accommodations.length > 0) {
      setSelectedDestination(accommodationMemory.accommodations[0].id);
    }
  }, [selectedDestination, accommodationMemory.accommodations]);

  // Cleanup activities for removed destinations
  useEffect(() => {
    const validDestinationIds = new Set(
      accommodationMemory.accommodations.map(a => a.id)
    );

    const activitiesToRemove = activityMemory.activities.filter(
      activity => !validDestinationIds.has(activity.destinationId)
    );

    if (activitiesToRemove.length > 0) {
      // Batch remove
      activitiesToRemove.forEach(activity => {
        removeActivity(activity.id);
      });

      toastInfo(
        "Activités mises à jour",
        `${activitiesToRemove.length} activité(s) supprimée(s) car destination supprimée`
      );
    }
  }, [accommodationMemory.accommodations, activityMemory.activities, removeActivity]);

  // Get current destination
  const currentDestination = accommodationMemory.accommodations.find(
    a => a.id === selectedDestination
  );

  // Get activities for current destination
  const currentActivities = selectedDestination
    ? getActivitiesByDestination(selectedDestination)
    : [];

  // Apply filters
  const filteredActivities = currentActivities.filter(activity => {
    if (filterCategory.length > 0 && !filterCategory.includes(activity.category)) return false;
    if (filterDuration && activity.duration !== filterDuration) return false;
    if (activity.priceMax < filterBudget[0] || activity.priceMin > filterBudget[1]) return false;
    return true;
  });

  // Handlers
  const handleAddActivity = () => {
    if (!currentDestination) {
      toastInfo("Aucune destination", "Ajoutez d'abord une destination dans l'onglet vols");
      return;
    }

    addActivity({
      destinationId: currentDestination.id,
      city: currentDestination.city || "",
      country: currentDestination.country || "",
      title: "Nouvelle activité",
      category: "culture",
      duration: "medium",
      syncedFromDestination: true,
    });

    toastSuccess("Activité ajoutée", `Nouvelle activité pour ${currentDestination.city || "la destination"}`);
  };

  const handleDeleteActivity = (id: string) => {
    removeActivity(id);
    toastSuccess("Activité supprimée");
  };

  const handleToggleCategory = (categoryId: string) => {
    setFilterCategory(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="space-y-5" data-tour="activities-panel">
      {/* Destination Tabs (if multi-destination) */}
      {accommodationMemory.accommodations.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {accommodationMemory.accommodations.map(dest => (
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
              <span className="text-[10px] opacity-60">
                ({getActivitiesByDestination(dest.id).length})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No destination message */}
      {accommodationMemory.accommodations.length === 0 && (
        <div className="py-8 text-center">
          <span className="text-4xl mb-2 block">🗺️</span>
          <p className="text-sm text-muted-foreground">
            Aucune destination configurée
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez d'abord une destination dans l'onglet vols
          </p>
        </div>
      )}

      {/* Filters Section */}
      {accommodationMemory.accommodations.length > 0 && (
        <>
          {/* Category Filters */}
          <div>
            <SectionHeader icon={MapPin} title="Type d'activité" />
            <div className="grid grid-cols-2 gap-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = filterCategory.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleToggleCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-xl text-xs font-medium flex items-center gap-2 transition-all",
                      isSelected
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Filter */}
          <div>
            <SectionHeader icon={Clock} title="Durée" />
            <div className="flex gap-1.5">
              {durations.map(d => (
                <ChipButton
                  key={d.id}
                  selected={filterDuration === d.id}
                  onClick={() => setFilterDuration(filterDuration === d.id ? null : d.id)}
                >
                  {d.label}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Budget Slider */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={Star} title="Budget" />
              <span className="text-xs text-primary font-medium">
                {filterBudget[0]}€ - {filterBudget[1]}€
              </span>
            </div>
            <Slider
              value={filterBudget}
              onValueChange={(value) => setFilterBudget(value as [number, number])}
              max={200}
              step={10}
            />
          </div>

          {/* Activities List */}
          <div className="pt-3 border-t border-border/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Activités ({filteredActivities.length})
              </span>
              <button
                onClick={handleAddActivity}
                className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Ajouter
              </button>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="py-8 text-center">
                <span className="text-4xl mb-2 block">🎭</span>
                <p className="text-sm text-muted-foreground">
                  {currentActivities.length === 0
                    ? "Aucune activité planifiée"
                    : "Aucune activité ne correspond aux filtres"}
                </p>
                {currentActivities.length === 0 && currentDestination && (
                  <button
                    onClick={handleAddActivity}
                    className="mt-3 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    + Ajouter une activité
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredActivities.map(activity => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onUpdate={(updates) => updateActivity(activity.id, updates)}
                    onDelete={() => handleDeleteActivity(activity.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ActivitiesPanel;
