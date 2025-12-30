import { useState, useRef, useEffect } from "react";
import { 
  Building2, Star, Wifi, Car, Coffee, Wind, MapPin, Users, ChevronDown, ChevronUp, 
  Search, Waves, BedDouble, Home, Hotel, Castle, Tent, Plus, Minus, X, CalendarDays,
  Dumbbell, Accessibility, Baby, Dog, Mountain, Building, Flower2, Bus,
  ConciergeBell, Droplets, Utensils, ChefHat, Soup, House
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTravelMemory } from "@/contexts/TravelMemoryContext";
import { useAccommodationMemory, BUDGET_PRESETS, type BudgetPreset, type AccommodationType, type EssentialAmenity, type RoomConfig, type MealPlan } from "@/contexts/AccommodationMemoryContext";
import { useFlightMemory } from "@/contexts/FlightMemoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocationAutocomplete, LocationResult } from "@/hooks/useLocationAutocomplete";
import { differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import RangeCalendar from "@/components/RangeCalendar";
import type { DateRange } from "react-day-picker";

interface AccommodationPanelProps {
  onMapMove?: (center: [number, number], zoom: number) => void;
}

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
  // Cities only, enabled when 3+ chars
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

// Travelers selector (inspired by flight widget) - Syncs with TravelMemory
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

  const summary = children > 0 
    ? `${adults} adulte${adults > 1 ? "s" : ""} · ${children} enfant${children > 1 ? "s" : ""}` 
    : `${adults} adulte${adults > 1 ? "s" : ""}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/30 text-sm">
          <Users className="h-4 w-4 text-primary" />
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                  <span className="text-xs text-muted-foreground">Adultes</span>
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
                  <span className="text-xs text-muted-foreground">Enfants</span>
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

// Compact date range with inline style matching destination input
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
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const handleRangeChange = (range: DateRange | undefined) => {
    onChange(range?.from || null, range?.to || null);
    // Auto-close when complete range selected
    if (range?.from && range.to && range.from.getTime() !== range.to.getTime()) {
      setTimeout(() => setIsOpen(false), 300);
    }
  };

  const value: DateRange | undefined = checkIn ? { from: checkIn, to: checkOut || undefined } : undefined;

  const formatDateCompact = (date: Date) => {
    return format(date, "dd MMM", { locale: fr });
  };

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
          ) : checkIn ? (
            <span className="truncate text-foreground">
              {formatDateCompact(checkIn)} → <span className="text-muted-foreground">Retour ?</span>
            </span>
          ) : (
            <span className="text-muted-foreground truncate">Dates du séjour</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" side="bottom" sideOffset={8}>
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/50">
          <span className="text-sm font-medium">
            {!checkIn && "Sélectionnez vos dates"}
            {checkIn && !checkOut && "Choisissez la date de départ"}
            {checkIn && checkOut && `${nights} nuit${nights > 1 ? "s" : ""} sélectionnée${nights > 1 ? "s" : ""}`}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-3">
          <RangeCalendar
            value={value}
            onChange={handleRangeChange}
            disabled={(date) => date < new Date()}
            locale={fr}
            weekStartsOn={1}
            className="pointer-events-auto"
          />
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

// Accommodation type config - DISTINCT icons
const ACCOMMODATION_TYPES: { id: AccommodationType; label: string; icon: React.ElementType }[] = [
  { id: "hotel", label: "Hôtel", icon: Hotel },
  { id: "apartment", label: "Appart", icon: Home },
  { id: "villa", label: "Villa", icon: Castle },
  { id: "hostel", label: "Auberge", icon: Tent },
  { id: "guesthouse", label: "Maison", icon: House },
  { id: "any", label: "Tous", icon: Building2 },
];

// Essential amenities config
const ESSENTIAL_AMENITIES: { id: EssentialAmenity; label: string; icon: React.ElementType }[] = [
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "parking", label: "Parking", icon: Car },
  { id: "breakfast", label: "Petit-déj", icon: Coffee },
  { id: "ac", label: "Clim", icon: Wind },
  { id: "pool", label: "Piscine", icon: Waves },
  { id: "kitchen", label: "Cuisine", icon: Utensils },
];

// Rating options (1-10 scale)
const RATING_OPTIONS = [
  { value: null, label: "Tous" },
  { value: 7, label: "7+" },
  { value: 8, label: "8+" },
  { value: 9, label: "9+" },
];

// Meal plan options with DISTINCT icons
const MEAL_PLANS: { id: MealPlan; label: string; icon: React.ElementType }[] = [
  { id: "breakfast", label: "Petit-déj", icon: Coffee },
  { id: "half", label: "Demi-pension", icon: Soup },
  { id: "full", label: "Pension complète", icon: ChefHat },
  { id: "all-inclusive", label: "All-inclusive", icon: Utensils },
];

// Views options with DISTINCT icons
const VIEW_OPTIONS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "Mer", label: "Mer", icon: Waves },
  { id: "Montagne", label: "Montagne", icon: Mountain },
  { id: "Ville", label: "Ville", icon: Building },
  { id: "Jardin", label: "Jardin", icon: Flower2 },
  { id: "Piscine", label: "Piscine", icon: Droplets },
];

// Services options with DISTINCT icons
const SERVICE_OPTIONS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "Room service", label: "Room service", icon: ConciergeBell },
  { id: "Spa", label: "Spa", icon: Droplets },
  { id: "Salle de sport", label: "Gym", icon: Dumbbell },
  { id: "Navette aéroport", label: "Navette", icon: Bus },
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
  } = useTravelMemory();
  
  const { memory: flightMemory } = useFlightMemory();
  
  const {
    memory,
    getActiveAccommodation,
    setActiveAccommodation,
    addAccommodation,
    removeAccommodation,
    setBudgetPreset,
    setCustomBudget,
    toggleType,
    toggleAmenity,
    setMinRating,
    getSuggestedRooms,
    setCustomRooms,
    toggleAutoRooms,
    updateAdvancedFilters,
    setDates,
    setDestination,
  } = useAccommodationMemory();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const activeAccommodation = getActiveAccommodation();
  const hasMultipleAccommodations = memory.accommodations.length > 1;
  const rooms = memory.useAutoRooms ? getSuggestedRooms() : memory.customRooms;

  // Local state for custom budget inputs
  const [customMin, setCustomMin] = useState(activeAccommodation?.priceMin.toString() || "80");
  const [customMax, setCustomMax] = useState(activeAccommodation?.priceMax.toString() || "180");

  // Sync custom budget inputs when active accommodation changes
  useEffect(() => {
    if (activeAccommodation) {
      setCustomMin(activeAccommodation.priceMin.toString());
      setCustomMax(activeAccommodation.priceMax.toString());
    }
  }, [activeAccommodation]);

  // Track if user is typing vs selected from autocomplete
  const [destinationInput, setDestinationInput] = useState(activeAccommodation?.city || "");
  
  // Sync input when switching accommodations
  useEffect(() => {
    setDestinationInput(activeAccommodation?.city || "");
  }, [activeAccommodation?.id, activeAccommodation?.city]);

  // Handle destination selection from autocomplete - ONLY here we update the real city
  const handleLocationSelect = (location: LocationResult) => {
    if (location.lat && location.lng) {
      setDestinationInput(location.name);
      setDestination(
        location.name,
        location.country_name || "",
        location.country_code || "",
        location.lat,
        location.lng
      );
      if (onMapMove) {
        onMapMove([location.lng, location.lat], 12);
      }
    }
  };
  
  // Handle input change - only updates local state, not the real destination
  const handleDestinationInputChange = (value: string) => {
    setDestinationInput(value);
  };

  // Handle adding new accommodation
  const handleAddAccommodation = () => {
    addAccommodation();
  };

  // Handle removing accommodation
  const handleRemoveAccommodation = (id: string) => {
    removeAccommodation(id);
  };

  // Handle travelers change - syncs with TravelMemory (transversal)
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
    if (!activeAccommodation) return;
    updateAdvancedFilters({
      mealPlan: activeAccommodation.advancedFilters.mealPlan === mealId ? null : mealId,
    });
  };

  // Handle array toggle for views/services/accessibility
  const handleArrayToggle = (field: "views" | "services" | "accessibility", value: string) => {
    if (!activeAccommodation) return;
    const current = activeAccommodation.advancedFilters[field];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateAdvancedFilters({ [field]: updated });
  };

  // Handle dates change
  const handleDatesChange = (checkIn: Date | null, checkOut: Date | null) => {
    setDates(checkIn, checkOut);
  };

  // Check if ready to search
  const canSearch = activeAccommodation && activeAccommodation.city.length > 0;

  // Handle search
  const handleSearch = async () => {
    if (!canSearch) return;
    setIsSearching(true);
    // TODO: Implement actual search
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSearching(false);
  };

  if (!activeAccommodation) return null;

  return (
    <div className="space-y-3">
      {/* Accommodation tabs - only show when multiple */}
      {hasMultipleAccommodations && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {memory.accommodations.map((acc, index) => (
            <button
              key={acc.id}
              onClick={() => setActiveAccommodation(index)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 group",
                index === memory.activeAccommodationIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
              )}
            >
              <Hotel className="h-3 w-3" />
              <span className="max-w-20 truncate">
                {acc.city || `Hébgt ${index + 1}`}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAccommodation(acc.id);
                }}
                className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                  index === memory.activeAccommodationIndex
                    ? "hover:bg-primary-foreground/20"
                    : "hover:bg-destructive/20"
                )}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </button>
          ))}
          <button
            onClick={handleAddAccommodation}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Destination + Dates on same row - clean design */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/50">
        {/* Destination */}
        <div className="flex-1 min-w-0">
          <DestinationInput
            value={destinationInput}
            onChange={handleDestinationInputChange}
            placeholder="Où allez-vous ?"
            onLocationSelect={handleLocationSelect}
          />
        </div>
        {/* Separator */}
        <div className="w-px h-6 bg-border/50" />
        {/* Dates */}
        <CompactDateRange
          checkIn={activeAccommodation.checkIn}
          checkOut={activeAccommodation.checkOut}
          onChange={handleDatesChange}
        />
      </div>

      {/* Add button when single accommodation */}
      {!hasMultipleAccommodations && (
        <button
          onClick={handleAddAccommodation}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un hébergement
        </button>
      )}

      {/* Travelers + Rooms row */}
      <div className="flex gap-2 flex-wrap">
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
                activeAccommodation.budgetPreset === preset
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

      {/* Accommodation Type - SEPARATE LINE */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Type d'hébergement</span>
        <div className="flex gap-1.5 flex-wrap">
          {ACCOMMODATION_TYPES.map((type) => (
            <ChipButton
              key={type.id}
              icon={type.icon}
              selected={activeAccommodation.types.includes(type.id)}
              onClick={() => toggleType(type.id)}
              compact
            >
              {type.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Rating - SEPARATE LINE */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Note minimum</span>
        <div className="flex gap-1.5">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.value ?? "any"}
              onClick={() => setMinRating(option.value)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
                activeAccommodation.minRating === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
              )}
            >
              {option.value && <Star className="h-3 w-3" />}
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Essential Amenities */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Équipements</span>
        <div className="flex gap-1.5 flex-wrap">
          {ESSENTIAL_AMENITIES.map((amenity) => (
            <ChipButton
              key={amenity.id}
              icon={amenity.icon}
              selected={activeAccommodation.amenities.includes(amenity.id)}
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
                  selected={activeAccommodation.advancedFilters.mealPlan === meal.id}
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
                  selected={activeAccommodation.advancedFilters.views.includes(view.id)}
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
                  selected={activeAccommodation.advancedFilters.services.includes(service.id)}
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
                  selected={activeAccommodation.advancedFilters.accessibility.includes(access.id)}
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
