import { useState, useRef, useEffect } from "react";
import { 
  Building2, Star, Wifi, Car, Coffee, Wind, MapPin, Users, ChevronDown, ChevronUp, 
  Search, Waves, UtensilsCrossed, BedDouble, Home, Hotel, Castle, Tent, Plus, Minus,
  Eye, Dumbbell, Sparkles, Accessibility, Baby, Dog, Mountain, Palmtree, Building, Trees,
  ConciergeBell, Plane
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTravelMemory } from "@/contexts/TravelMemoryContext";
import { useAccommodationMemory, BUDGET_PRESETS, type BudgetPreset, type AccommodationType, type EssentialAmenity, type RoomConfig, type MealPlan } from "@/contexts/AccommodationMemoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocationAutocomplete, LocationResult } from "@/hooks/useLocationAutocomplete";

interface AccommodationPanelProps {
  onMapMove?: (center: [number, number], zoom: number) => void;
}

// Destination input with autocomplete
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
  const { data: locations = [], isLoading } = useLocationAutocomplete(search, isOpen);

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
    if (!isOpen && newValue.length >= 2) {
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
            onFocus={() => setIsOpen(true)}
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
            {search.length < 2 ? "Tapez au moins 2 caractères" : "Aucun résultat"}
          </div>
        ) : (
          <div className="py-1">
            {locations.filter(l => l.type === "city" || l.type === "country").slice(0, 8).map((location) => (
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
                    {location.type === "country" ? "Pays" : location.country_name}
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

// Travelers selector (inspired by flight widget)
function TravelersSelector({ 
  adults, 
  children, 
  childrenAges,
  onChange 
}: { 
  adults: number; 
  children: number; 
  childrenAges: number[];
  onChange: (adults: number, children: number, ages: number[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleAdultsChange = (delta: number) => {
    const newAdults = Math.max(1, Math.min(10, adults + delta));
    onChange(newAdults, children, childrenAges);
  };

  const handleChildrenChange = (delta: number) => {
    const newChildren = Math.max(0, Math.min(6, children + delta));
    const newAges = [...childrenAges];
    if (newChildren > childrenAges.length) {
      newAges.push(8); // Default age
    } else if (newChildren < childrenAges.length) {
      newAges.pop();
    }
    onChange(adults, newChildren, newAges);
  };

  const handleAgeChange = (index: number, age: number) => {
    const newAges = [...childrenAges];
    newAges[index] = age;
    onChange(adults, children, newAges);
  };

  const total = adults + children;
  const summary = children > 0 
    ? `${adults} ad. · ${children} enf.` 
    : `${adults} adulte${adults > 1 ? "s" : ""}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span>{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Adults */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Adultes</p>
              <p className="text-xs text-muted-foreground">18 ans et plus</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleAdultsChange(-1)} 
                disabled={adults <= 1}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{adults}</span>
              <button 
                onClick={() => handleAdultsChange(1)} 
                disabled={adults >= 10}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Children */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enfants</p>
              <p className="text-xs text-muted-foreground">0 - 17 ans</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleChildrenChange(-1)} 
                disabled={children <= 0}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-medium">{children}</span>
              <button 
                onClick={() => handleChildrenChange(1)} 
                disabled={children >= 6}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Children ages */}
          {children > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Âge des enfants</p>
              <div className="flex flex-wrap gap-2">
                {childrenAges.map((age, index) => (
                  <select
                    key={index}
                    value={age}
                    onChange={(e) => handleAgeChange(index, parseInt(e.target.value))}
                    className="h-8 px-2 rounded-lg border border-border bg-background text-xs"
                  >
                    {Array.from({ length: 18 }, (_, i) => (
                      <option key={i} value={i}>{i} an{i > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Rooms configuration
function RoomsSelector({
  rooms,
  travelers,
  useAuto,
  onChange,
  onToggleAuto,
}: {
  rooms: RoomConfig[];
  travelers: { adults: number; children: number; childrenAges: number[] };
  useAuto: boolean;
  onChange: (rooms: RoomConfig[]) => void;
  onToggleAuto: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const addRoom = () => {
    const newRoom: RoomConfig = {
      id: crypto.randomUUID(),
      adults: 2,
      children: 0,
      childrenAges: [],
    };
    onChange([...rooms, newRoom]);
  };

  const removeRoom = (id: string) => {
    if (rooms.length <= 1) return;
    onChange(rooms.filter(r => r.id !== id));
  };

  const updateRoom = (id: string, updates: Partial<RoomConfig>) => {
    onChange(rooms.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const totalInRooms = rooms.reduce((acc, r) => acc + r.adults + r.children, 0);
  const totalTravelers = travelers.adults + travelers.children;

  const summary = rooms.length === 1 
    ? (rooms[0].children > 0 ? "1 chambre familiale" : rooms[0].adults === 1 ? "1 chambre simple" : "1 chambre double")
    : `${rooms.length} chambres`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 text-sm">
          <BedDouble className="h-4 w-4 text-primary" />
          <span>{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          {/* Auto toggle */}
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground">Configuration auto</span>
            <button
              onClick={onToggleAuto}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                useAuto ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {useAuto ? "Activé" : "Désactivé"}
            </button>
          </div>

          {/* Rooms list */}
          {rooms.map((room, index) => (
            <div key={room.id} className="p-2 rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Chambre {index + 1}</span>
                {rooms.length > 1 && (
                  <button 
                    onClick={() => removeRoom(room.id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Supprimer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Ad.</span>
                  <select
                    value={room.adults}
                    onChange={(e) => updateRoom(room.id, { adults: parseInt(e.target.value) })}
                    className="h-7 px-1.5 rounded border border-border bg-background text-xs"
                    disabled={useAuto}
                  >
                    {[1, 2, 3, 4].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Enf.</span>
                  <select
                    value={room.children}
                    onChange={(e) => updateRoom(room.id, { children: parseInt(e.target.value) })}
                    className="h-7 px-1.5 rounded border border-border bg-background text-xs"
                    disabled={useAuto}
                  >
                    {[0, 1, 2, 3].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {/* Add room button */}
          {!useAuto && rooms.length < 4 && (
            <button
              onClick={addRoom}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted/30"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une chambre
            </button>
          )}

          {/* Warning if mismatch */}
          {!useAuto && totalInRooms !== totalTravelers && (
            <p className="text-xs text-amber-500 text-center">
              {totalInRooms} personnes en chambres / {totalTravelers} voyageurs
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Chip Button Component
const ChipButton = ({
  children,
  selected,
  onClick,
  icon: Icon,
  compact = false,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ElementType;
  compact?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "rounded-xl text-xs font-medium transition-all flex items-center gap-1.5",
      compact ? "px-2 py-1.5" : "px-3 py-2",
      selected
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
    )}
  >
    {Icon && <Icon className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />}
    {children}
  </button>
);

// Accommodation type config
const ACCOMMODATION_TYPES: { id: AccommodationType; label: string; icon: React.ElementType }[] = [
  { id: "hotel", label: "Hôtel", icon: Hotel },
  { id: "apartment", label: "Appart", icon: Home },
  { id: "villa", label: "Villa", icon: Castle },
  { id: "hostel", label: "Auberge", icon: Tent },
  { id: "guesthouse", label: "Maison", icon: BedDouble },
  { id: "any", label: "Tous", icon: Building2 },
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

// Rating options (1-10 scale)
const RATING_OPTIONS = [
  { value: null, label: "Tous" },
  { value: 7, label: "7+" },
  { value: 8, label: "8+" },
  { value: 9, label: "9+" },
];

// Meal plan options with icons
const MEAL_PLANS: { id: MealPlan; label: string; icon: React.ElementType }[] = [
  { id: "breakfast", label: "Petit-déj", icon: Coffee },
  { id: "half", label: "Demi-pension", icon: UtensilsCrossed },
  { id: "full", label: "Pension complète", icon: UtensilsCrossed },
  { id: "all-inclusive", label: "All-inclusive", icon: Sparkles },
];

// Views options with icons
const VIEW_OPTIONS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "Mer", label: "Mer", icon: Waves },
  { id: "Montagne", label: "Montagne", icon: Mountain },
  { id: "Ville", label: "Ville", icon: Building },
  { id: "Jardin", label: "Jardin", icon: Trees },
  { id: "Piscine", label: "Piscine", icon: Palmtree },
];

// Services options with icons
const SERVICE_OPTIONS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "Room service", label: "Room service", icon: ConciergeBell },
  { id: "Spa", label: "Spa", icon: Sparkles },
  { id: "Salle de sport", label: "Gym", icon: Dumbbell },
  { id: "Navette aéroport", label: "Navette", icon: Plane },
];

// Accessibility options with icons
const ACCESSIBILITY_OPTIONS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "PMR", label: "PMR", icon: Accessibility },
  { id: "Lit bébé", label: "Bébé", icon: Baby },
  { id: "Animaux acceptés", label: "Animaux", icon: Dog },
];

const AccommodationPanel = ({ onMapMove }: AccommodationPanelProps) => {
  const { 
    memory: travelMemory, 
    updateTravelers,
    addDestination,
    setActiveDestination, 
    getActiveDestination,
  } = useTravelMemory();
  
  const {
    memory,
    setBudgetPreset,
    setCustomBudget,
    toggleType,
    toggleAmenity,
    setMinRating,
    getSuggestedRooms,
    setCustomRooms,
    toggleAutoRooms,
    updateAdvancedFilters,
  } = useAccommodationMemory();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [customMin, setCustomMin] = useState(memory.priceMin.toString());
  const [customMax, setCustomMax] = useState(memory.priceMax.toString());
  const [isSearching, setIsSearching] = useState(false);
  const [localDestination, setLocalDestination] = useState("");

  const activeDestination = getActiveDestination();
  const hasMultipleDestinations = travelMemory.destinations.length > 1;
  const rooms = memory.useAutoRooms ? getSuggestedRooms() : memory.customRooms;

  // Sync local destination with active destination
  useEffect(() => {
    if (activeDestination) {
      setLocalDestination(activeDestination.city);
    }
  }, [activeDestination]);

  // Handle destination change from chips
  const handleDestinationChipClick = (index: number) => {
    setActiveDestination(index);
    const dest = travelMemory.destinations[index];
    if (dest && onMapMove) {
      onMapMove([dest.lng, dest.lat], 12);
    }
  };

  // Handle destination selection from autocomplete
  const handleLocationSelect = (location: LocationResult) => {
    if (location.lat && location.lng) {
      addDestination({
        city: location.name,
        country: location.country_name || "",
        countryCode: location.country_code || "",
        lat: location.lat,
        lng: location.lng,
      });
      if (onMapMove) {
        onMapMove([location.lng, location.lat], 12);
      }
    }
  };

  // Handle travelers change
  const handleTravelersChange = (adults: number, children: number, ages: number[]) => {
    updateTravelers({ adults, children, childrenAges: ages });
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

  // Handle meal plan toggle
  const handleMealPlanToggle = (mealId: MealPlan) => {
    updateAdvancedFilters({
      mealPlan: memory.advancedFilters.mealPlan === mealId ? null : mealId,
    });
  };

  // Handle array toggle for views/services/accessibility
  const handleArrayToggle = (field: "views" | "services" | "accessibility", value: string) => {
    const current = memory.advancedFilters[field];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateAdvancedFilters({ [field]: updated });
  };

  // Check if ready to search
  const canSearch = travelMemory.destinations.length > 0 || localDestination.length > 0;

  // Handle search
  const handleSearch = async () => {
    if (!canSearch) return;
    setIsSearching(true);
    // TODO: Implement actual search
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSearching(false);
  };

  return (
    <div className="space-y-4">
      {/* Destination + Travelers row */}
      <div className="space-y-2">
        {/* Destination chips if multi-destination from flights */}
        {hasMultipleDestinations && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {travelMemory.destinations.map((dest, index) => (
              <button
                key={dest.id}
                onClick={() => handleDestinationChipClick(index)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                  index === travelMemory.activeDestinationIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
                )}
              >
                <MapPin className="h-3 w-3" />
                {dest.city}
              </button>
            ))}
          </div>
        )}

        {/* Destination input (manual entry) */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/20">
          <DestinationInput
            value={localDestination}
            onChange={setLocalDestination}
            placeholder={activeDestination ? activeDestination.city : "Où allez-vous ?"}
            onLocationSelect={handleLocationSelect}
          />
        </div>

        {/* Travelers + Rooms row */}
        <div className="flex gap-2">
          <TravelersSelector
            adults={travelMemory.travelers.adults}
            children={travelMemory.travelers.children}
            childrenAges={travelMemory.travelers.childrenAges}
            onChange={handleTravelersChange}
          />
          <RoomsSelector
            rooms={rooms}
            travelers={travelMemory.travelers}
            useAuto={memory.useAutoRooms}
            onChange={setCustomRooms}
            onToggleAuto={toggleAutoRooms}
          />
        </div>
      </div>

      {/* Budget per night - compact */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Budget / nuit</span>
        </div>
        <div className="flex gap-1.5">
          {(["eco", "comfort", "premium"] as BudgetPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => handleBudgetPreset(preset)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                memory.budgetPreset === preset
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
              )}
            >
              {BUDGET_PRESETS[preset].label}
            </button>
          ))}
        </div>
        {/* Custom inputs inline */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            onBlur={handleCustomBudgetBlur}
            placeholder="Min"
            className="text-center text-xs h-8 flex-1"
          />
          <span className="text-muted-foreground text-xs">-</span>
          <Input
            type="number"
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            onBlur={handleCustomBudgetBlur}
            placeholder="Max"
            className="text-center text-xs h-8 flex-1"
          />
          <span className="text-muted-foreground text-xs">€</span>
        </div>
      </div>

      {/* Type + Rating in compact row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Accommodation Type */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <div className="flex gap-1 flex-wrap">
            {ACCOMMODATION_TYPES.slice(0, 3).map((type) => (
              <ChipButton
                key={type.id}
                icon={type.icon}
                selected={memory.types.includes(type.id)}
                onClick={() => toggleType(type.id)}
                compact
              >
                {type.label}
              </ChipButton>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {ACCOMMODATION_TYPES.slice(3).map((type) => (
              <ChipButton
                key={type.id}
                icon={type.icon}
                selected={memory.types.includes(type.id)}
                onClick={() => toggleType(type.id)}
                compact
              >
                {type.label}
              </ChipButton>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Note min</span>
          <div className="flex gap-1">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value ?? "any"}
                onClick={() => setMinRating(option.value)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-0.5",
                  memory.minRating === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
                )}
              >
                {option.value && <Star className="h-2.5 w-2.5" />}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Essential Amenities - compact grid */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Équipements</span>
        <div className="flex gap-1.5 flex-wrap">
          {ESSENTIAL_AMENITIES.map((amenity) => (
            <ChipButton
              key={amenity.id}
              icon={amenity.icon}
              selected={memory.amenities.includes(amenity.id)}
              onClick={() => toggleAmenity(amenity.id)}
              compact
            >
              {amenity.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground">
            <span>Filtres avancés</span>
            {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          {/* Meal Plan */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Formule repas</span>
            <div className="flex gap-1.5 flex-wrap">
              {MEAL_PLANS.map((meal) => (
                <ChipButton
                  key={meal.id}
                  icon={meal.icon}
                  selected={memory.advancedFilters.mealPlan === meal.id}
                  onClick={() => handleMealPlanToggle(meal.id)}
                  compact
                >
                  {meal.label}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Views */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Vue</span>
            <div className="flex gap-1.5 flex-wrap">
              {VIEW_OPTIONS.map((view) => (
                <ChipButton
                  key={view.id}
                  icon={view.icon}
                  selected={memory.advancedFilters.views.includes(view.id)}
                  onClick={() => handleArrayToggle("views", view.id)}
                  compact
                >
                  {view.label}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Services</span>
            <div className="flex gap-1.5 flex-wrap">
              {SERVICE_OPTIONS.map((service) => (
                <ChipButton
                  key={service.id}
                  icon={service.icon}
                  selected={memory.advancedFilters.services.includes(service.id)}
                  onClick={() => handleArrayToggle("services", service.id)}
                  compact
                >
                  {service.label}
                </ChipButton>
              ))}
            </div>
          </div>

          {/* Accessibility */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Accessibilité</span>
            <div className="flex gap-1.5 flex-wrap">
              {ACCESSIBILITY_OPTIONS.map((access) => (
                <ChipButton
                  key={access.id}
                  icon={access.icon}
                  selected={memory.advancedFilters.accessibility.includes(access.id)}
                  onClick={() => handleArrayToggle("accessibility", access.id)}
                  compact
                >
                  {access.label}
                </ChipButton>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={!canSearch || isSearching}
        className="w-full h-10 text-sm font-medium"
      >
        {isSearching ? (
          <>
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
            Recherche...
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            Rechercher
          </>
        )}
      </Button>
    </div>
  );
};

export default AccommodationPanel;
