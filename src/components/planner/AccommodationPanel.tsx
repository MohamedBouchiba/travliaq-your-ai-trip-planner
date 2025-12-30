import { useState } from "react";
import { Building2, Star, Wifi, Car, Coffee, Wind, MapPin, Users, ChevronDown, ChevronUp, Search, Waves, UtensilsCrossed, BedDouble, Home, Hotel, Castle, Tent } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTravelMemory } from "@/contexts/TravelMemoryContext";
import { useAccommodationMemory, BUDGET_PRESETS, type BudgetPreset, type AccommodationType, type EssentialAmenity } from "@/contexts/AccommodationMemoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AccommodationPanelProps {
  onMapMove?: (center: [number, number], zoom: number) => void;
}

// Section Header Component
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <span className="text-sm font-medium text-foreground">{title}</span>
  </div>
);

// Chip Button Component
const ChipButton = ({
  children,
  selected,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ElementType;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5",
      selected
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
    )}
  >
    {Icon && <Icon className="h-3.5 w-3.5" />}
    {children}
  </button>
);

// Accommodation type config
const ACCOMMODATION_TYPES: { id: AccommodationType; label: string; icon: React.ElementType }[] = [
  { id: "hotel", label: "Hôtel", icon: Hotel },
  { id: "apartment", label: "Appartement", icon: Home },
  { id: "villa", label: "Villa", icon: Castle },
  { id: "hostel", label: "Auberge", icon: Tent },
  { id: "guesthouse", label: "Maison d'hôtes", icon: BedDouble },
  { id: "any", label: "Peu importe", icon: Building2 },
];

// Essential amenities config
const ESSENTIAL_AMENITIES: { id: EssentialAmenity; label: string; icon: React.ElementType }[] = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "parking", label: "Parking", icon: Car },
  { id: "breakfast", label: "Petit-déj", icon: Coffee },
  { id: "ac", label: "Clim", icon: Wind },
  { id: "pool", label: "Piscine", icon: Waves },
  { id: "kitchen", label: "Cuisine", icon: UtensilsCrossed },
];

// Rating options (1-10 scale as per booking standards)
const RATING_OPTIONS = [
  { value: null, label: "Peu importe" },
  { value: 7, label: "7+" },
  { value: 8, label: "8+" },
  { value: 9, label: "9+" },
];

const AccommodationPanel = ({ onMapMove }: AccommodationPanelProps) => {
  const { memory: travelMemory, setActiveDestination, getActiveDestination, getTotalTravelers } = useTravelMemory();
  const {
    memory,
    setBudgetPreset,
    setCustomBudget,
    toggleType,
    toggleAmenity,
    setMinRating,
    getRoomsSummary,
    isReadyToSearch,
  } = useAccommodationMemory();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [customMin, setCustomMin] = useState(memory.priceMin.toString());
  const [customMax, setCustomMax] = useState(memory.priceMax.toString());
  const [isSearching, setIsSearching] = useState(false);

  const activeDestination = getActiveDestination();
  const hasMultipleDestinations = travelMemory.destinations.length > 1;

  // Handle destination change
  const handleDestinationChange = (index: number) => {
    setActiveDestination(index);
    const dest = travelMemory.destinations[index];
    if (dest && onMapMove) {
      onMapMove([dest.lng, dest.lat], 12);
    }
  };

  // Handle budget preset change
  const handleBudgetPreset = (preset: BudgetPreset) => {
    setBudgetPreset(preset);
    const { min, max } = BUDGET_PRESETS[preset];
    setCustomMin(min.toString());
    setCustomMax(max.toString());
  };

  // Handle custom budget change
  const handleCustomBudgetBlur = () => {
    const min = parseInt(customMin) || 0;
    const max = parseInt(customMax) || 500;
    setCustomBudget(Math.min(min, max), Math.max(min, max));
  };

  // Handle search
  const handleSearch = async () => {
    if (!isReadyToSearch) return;
    setIsSearching(true);
    // TODO: Implement actual search
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSearching(false);
  };

  return (
    <div className="space-y-5">
      {/* Destination Selector (if multi-destination) */}
      {hasMultipleDestinations && (
        <div>
          <SectionHeader icon={MapPin} title="Destination" />
          <div className="flex gap-2 flex-wrap">
            {travelMemory.destinations.map((dest, index) => (
              <button
                key={dest.id}
                onClick={() => handleDestinationChange(index)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5",
                  index === travelMemory.activeDestinationIndex
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
                )}
              >
                <MapPin className="h-3 w-3" />
                {dest.city}
                {dest.nights && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-background/20 text-[10px]">
                    {dest.nights}n
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Single destination display */}
      {!hasMultipleDestinations && activeDestination && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{activeDestination.city}</span>
          <span className="text-xs text-muted-foreground">{activeDestination.country}</span>
        </div>
      )}

      {/* No destination message */}
      {travelMemory.destinations.length === 0 && (
        <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-center">
          <MapPin className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Définissez d'abord votre destination dans l'onglet Vols
          </p>
        </div>
      )}

      {/* Room Configuration (auto-calculated) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={BedDouble} title="Chambres" />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {getTotalTravelers()} voyageur{getTotalTravelers() > 1 ? "s" : ""}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-sm font-medium text-foreground">{getRoomsSummary()}</p>
          <p className="text-xs text-muted-foreground mt-1">Basé sur vos informations de voyage</p>
        </div>
      </div>

      {/* Budget per night */}
      <div>
        <SectionHeader icon={Building2} title="Budget par nuit" />
        
        {/* Presets */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(["eco", "comfort", "premium"] as BudgetPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => handleBudgetPreset(preset)}
              className={cn(
                "py-2.5 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-0.5",
                memory.budgetPreset === preset
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
              )}
            >
              <span>{BUDGET_PRESETS[preset].label}</span>
              <span className="text-[10px] opacity-80">
                {preset === "eco" ? "<80€" : preset === "comfort" ? "80-180€" : ">180€"}
              </span>
            </button>
          ))}
        </div>

        {/* Custom inputs */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              type="number"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              onBlur={handleCustomBudgetBlur}
              placeholder="Min"
              className="text-center text-sm h-9"
            />
          </div>
          <span className="text-muted-foreground text-sm">-</span>
          <div className="flex-1">
            <Input
              type="number"
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              onBlur={handleCustomBudgetBlur}
              placeholder="Max"
              className="text-center text-sm h-9"
            />
          </div>
          <span className="text-muted-foreground text-sm">€</span>
        </div>
      </div>

      {/* Accommodation Type */}
      <div>
        <SectionHeader icon={Building2} title="Type d'hébergement" />
        <div className="flex gap-2 flex-wrap">
          {ACCOMMODATION_TYPES.map((type) => (
            <ChipButton
              key={type.id}
              icon={type.icon}
              selected={memory.types.includes(type.id)}
              onClick={() => toggleType(type.id)}
            >
              {type.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <SectionHeader icon={Star} title="Note minimum" />
        <div className="flex gap-2">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.value ?? "any"}
              onClick={() => setMinRating(option.value)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1",
                memory.minRating === option.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
              )}
            >
              {option.value && <Star className="h-3 w-3" />}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Essential Amenities */}
      <div>
        <SectionHeader icon={Wifi} title="Équipements" />
        <div className="grid grid-cols-3 gap-2">
          {ESSENTIAL_AMENITIES.map((amenity) => (
            <ChipButton
              key={amenity.id}
              icon={amenity.icon}
              selected={memory.amenities.includes(amenity.id)}
              onClick={() => toggleAmenity(amenity.id)}
            >
              {amenity.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground">
            <span>Filtres avancés</span>
            {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {/* Meal Plan */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Formule repas</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { id: "breakfast", label: "Petit-déj inclus" },
                { id: "half", label: "Demi-pension" },
                { id: "full", label: "Pension complète" },
                { id: "all-inclusive", label: "All-inclusive" },
              ].map((meal) => (
                <ChipButton
                  key={meal.id}
                  selected={memory.advancedFilters.mealPlan === meal.id}
                  onClick={() => {
                    // Toggle meal plan
                  }}
                >
                  {meal.label}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Views */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Vue</p>
            <div className="flex gap-2 flex-wrap">
              {["Mer", "Montagne", "Ville", "Jardin", "Piscine"].map((view) => (
                <ChipButton
                  key={view}
                  selected={memory.advancedFilters.views.includes(view)}
                  onClick={() => {
                    // Toggle view
                  }}
                >
                  {view}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Services</p>
            <div className="flex gap-2 flex-wrap">
              {["Room service", "Spa", "Salle de sport", "Conciergerie", "Navette aéroport"].map((service) => (
                <ChipButton
                  key={service}
                  selected={memory.advancedFilters.services.includes(service)}
                  onClick={() => {
                    // Toggle service
                  }}
                >
                  {service}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Accessibility */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Accessibilité</p>
            <div className="flex gap-2 flex-wrap">
              {["PMR", "Ascenseur", "Lit bébé", "Animaux acceptés"].map((access) => (
                <ChipButton
                  key={access}
                  selected={memory.advancedFilters.accessibility.includes(access)}
                  onClick={() => {
                    // Toggle accessibility
                  }}
                >
                  {access}
                </ChipButton>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={!isReadyToSearch || isSearching}
        className="w-full h-11 text-sm font-medium"
      >
        {isSearching ? (
          <>
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
            Recherche...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Rechercher des hébergements
          </>
        )}
      </Button>

      {/* Help text if not ready */}
      {!isReadyToSearch && (
        <p className="text-xs text-muted-foreground text-center">
          Définissez votre destination et vos dates pour rechercher
        </p>
      )}
    </div>
  );
};

export default AccommodationPanel;
