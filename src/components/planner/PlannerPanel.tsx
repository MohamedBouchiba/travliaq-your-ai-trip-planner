import { useState } from "react";
import { Calendar as CalendarIcon, Users, Plane, MapPin, Building2, Star, Clock, Wifi, Car, Coffee, Wind, X, Heart, Utensils, TreePine, Palette, Waves, Dumbbell, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabType } from "@/pages/TravelPlanner";
import { Slider } from "@/components/ui/slider";
import PlannerCalendar from "./PlannerCalendar";
import FlightRouteBuilder, { FlightLeg } from "./FlightRouteBuilder";

interface PlannerPanelProps {
  activeTab: TabType;
  onMapMove: (center: [number, number], zoom: number) => void;
  layout?: "sidebar" | "overlay";
  onClose?: () => void;
  isVisible?: boolean;
}

const tabLabels: Record<TabType, string> = {
  flights: "Vols",
  activities: "Activités",
  stays: "Hébergements",
  preferences: "Préférences",
};

const PlannerPanel = ({ activeTab, onMapMove, layout = "sidebar", onClose, isVisible = true }: PlannerPanelProps) => {
  if (!isVisible && layout === "overlay") return null;

  const wrapperClass =
    layout === "overlay"
      ? "pointer-events-none absolute top-16 left-4 bottom-4 w-[380px] z-10"
      : "w-80 lg:w-96 border-l border-border bg-card overflow-y-auto themed-scroll shrink-0";

  const innerClass = layout === "overlay" ? "pointer-events-auto h-full overflow-y-auto themed-scroll" : "";

  return (
    <aside className={wrapperClass} aria-label="Panneau de filtres">
      <div className={cn(innerClass, layout === "overlay" && "rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg overflow-hidden")}>
        {/* Header with close button */}
        {layout === "overlay" && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <h2 className="font-medium text-foreground text-sm">{tabLabels[activeTab]}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Fermer le panneau"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <div className="p-4">
          {activeTab === "flights" && <FlightsPanel onMapMove={onMapMove} />}
          {activeTab === "activities" && <ActivitiesPanel />}
          {activeTab === "stays" && <StaysPanel />}
          {activeTab === "preferences" && <PreferencesPanel />}
        </div>
      </div>
    </aside>
  );
};

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
  onClick 
}: { 
  children: React.ReactNode; 
  selected?: boolean; 
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
      selected
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    {children}
  </button>
);

// Passenger type
interface Passenger {
  id: string;
  type: "adult" | "child";
  baggage: "personal" | "cabin" | "checked";
}

// Flights Panel
const FlightsPanel = ({ onMapMove }: { onMapMove: (center: [number, number], zoom: number) => void }) => {
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [legs, setLegs] = useState<FlightLeg[]>([
    { id: crypto.randomUUID(), from: "", to: "", date: undefined },
  ]);
  const [passengers, setPassengers] = useState<Passenger[]>([
    { id: crypto.randomUUID(), type: "adult", baggage: "cabin" },
  ]);
  const [travelClass, setTravelClass] = useState<"economy" | "business" | "first">("economy");
  const [directOnly, setDirectOnly] = useState(false);
  const [departureTime, setDepartureTime] = useState<"morning" | "afternoon" | "evening" | null>(null);

  const addPassenger = () => {
    setPassengers([...passengers, { id: crypto.randomUUID(), type: "adult", baggage: "cabin" }]);
  };

  const removePassenger = (id: string) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter(p => p.id !== id));
    }
  };

  const updatePassenger = (id: string, updates: Partial<Passenger>) => {
    setPassengers(passengers.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  return (
    <div className="space-y-4">
      {/* Trip Type Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-muted/30 w-fit">
        <button
          onClick={() => setTripType("roundtrip")}
          className={cn(
            "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
            tripType === "roundtrip"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Aller-retour
        </button>
        <button
          onClick={() => setTripType("oneway")}
          className={cn(
            "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
            tripType === "oneway"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Aller simple
        </button>
      </div>

      {/* Route Builder */}
      <div>
        <FlightRouteBuilder
          legs={legs}
          onLegsChange={setLegs}
          maxLegs={tripType === "oneway" ? 1 : 4}
          tripType={tripType}
        />
      </div>

      {/* Passengers - Compact */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Passagers</span>
          <button
            onClick={addPassenger}
            className="text-[10px] text-primary hover:text-primary/80 font-medium"
          >
            + Ajouter
          </button>
        </div>
        <div className="space-y-1">
          {passengers.map((passenger, index) => (
            <div key={passenger.id} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-muted/20 border border-border/20">
              <span className="text-[10px] text-muted-foreground w-4">{index + 1}.</span>
              
              {/* Type toggle */}
              <div className="flex items-center gap-0.5 p-0.5 rounded bg-muted/40">
                <button
                  onClick={() => updatePassenger(passenger.id, { type: "adult" })}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium transition-all",
                    passenger.type === "adult" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Adulte
                </button>
                <button
                  onClick={() => updatePassenger(passenger.id, { type: "child" })}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-medium transition-all",
                    passenger.type === "child" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  Enfant
                </button>
              </div>

              {/* Baggage select */}
              <select
                value={passenger.baggage}
                onChange={(e) => updatePassenger(passenger.id, { baggage: e.target.value as Passenger["baggage"] })}
                className="flex-1 bg-transparent text-[9px] text-foreground focus:outline-none cursor-pointer"
              >
                <option value="personal">🎒 Personnel</option>
                <option value="cabin">🧳 Cabine</option>
                <option value="checked">🛄 Soute</option>
              </select>

              {/* Remove */}
              {passengers.length > 1 && (
                <button
                  onClick={() => removePassenger(passenger.id)}
                  className="text-muted-foreground hover:text-destructive p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Class + Time on one line */}
      <div className="flex items-center gap-2">
        {/* Class compact */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/30 border border-border/20">
          {[
            { id: "economy", label: "Éco" },
            { id: "business", label: "Aff." },
            { id: "first", label: "1ère" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setTravelClass(c.id as typeof travelClass)}
              className={cn(
                "px-2 py-1 rounded text-[9px] font-medium transition-all",
                travelClass === c.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Time compact */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/30 border border-border/20 flex-1">
          {[
            { id: "morning", label: "🌅" },
            { id: "afternoon", label: "☀️" },
            { id: "evening", label: "🌙" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setDepartureTime(departureTime === t.id ? null : t.id as typeof departureTime)}
              className={cn(
                "flex-1 px-2 py-1 rounded text-[10px] transition-all",
                departureTime === t.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Direct flights toggle */}
      <button
        onClick={() => setDirectOnly(!directOnly)}
        className={cn(
          "w-full py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5",
          directOnly
            ? "bg-primary/10 text-primary border border-primary/30"
            : "bg-muted/20 text-muted-foreground border border-border/20 hover:bg-muted/40"
        )}
      >
        <Plane className="h-3 w-3" />
        Vols directs uniquement
      </button>
    </div>
  );
};

// Activities Panel
const ActivitiesPanel = () => {
  const [budgetRange, setBudgetRange] = useState([0, 150]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["culture"]);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);

  const types = [
    { id: "culture", label: "Culture", icon: Palette },
    { id: "outdoor", label: "Nature", icon: TreePine },
    { id: "food", label: "Gastronomie", icon: Utensils },
    { id: "wellness", label: "Bien-être", icon: Sparkles },
  ];

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const suggestions = [
    { title: "Tour Eiffel", duration: "2h", price: 28, rating: 4.8, image: "🗼" },
    { title: "Croisière Seine", duration: "1h30", price: 15, rating: 4.6, image: "🚢" },
    { title: "Montmartre", duration: "3h", price: 0, rating: 4.7, image: "🎨" },
  ];

  return (
    <div className="space-y-5">
      {/* Types */}
      <div>
        <SectionHeader icon={MapPin} title="Type d'activité" />
        <div className="grid grid-cols-2 gap-2">
          {types.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={cn(
                  "p-3 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div>
        <SectionHeader icon={Clock} title="Durée" />
        <div className="flex gap-1.5">
          {[
            { id: "short", label: "< 2h" },
            { id: "medium", label: "2-4h" },
            { id: "long", label: "> 4h" },
          ].map((d) => (
            <ChipButton
              key={d.id}
              selected={selectedDuration === d.id}
              onClick={() => setSelectedDuration(selectedDuration === d.id ? null : d.id)}
            >
              {d.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Star} title="Budget" />
          <span className="text-xs text-primary font-medium">
            {budgetRange[0]}€ - {budgetRange[1]}€
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={budgetRange}
            onValueChange={setBudgetRange}
            max={200}
            step={10}
            className="w-full"
          />
        </div>
      </div>

      {/* Suggestions */}
      <div className="pt-3 border-t border-border/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggestions</span>
        <div className="mt-3 space-y-2">
          {suggestions.map((item) => (
            <div
              key={item.title}
              className="p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer border border-border/20 group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.duration}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium text-primary">
                      {item.price === 0 ? "Gratuit" : `${item.price}€`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {item.rating}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Stays Panel
const StaysPanel = () => {
  const [priceRange, setPriceRange] = useState([50, 250]);
  const [rating, setRating] = useState<number | null>(4);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["hotel"]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const stayTypes = [
    { id: "hotel", label: "Hôtel", icon: Building2 },
    { id: "apartment", label: "Appartement", icon: Building2 },
    { id: "hostel", label: "Auberge", icon: Building2 },
  ];

  const amenities = [
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "parking", label: "Parking", icon: Car },
    { id: "breakfast", label: "Petit-déj", icon: Coffee },
    { id: "ac", label: "Clim", icon: Wind },
  ];

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Building2} title="Budget / nuit" />
          <span className="text-xs text-primary font-medium">
            {priceRange[0]}€ - {priceRange[1]}€
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={500}
            step={25}
            className="w-full"
          />
        </div>
      </div>

      {/* Rating */}
      <div>
        <SectionHeader icon={Star} title="Note minimum" />
        <div className="flex gap-1.5">
          {[3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setRating(rating === r ? null : r)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1",
                rating === r
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
              )}
            >
              <Star className={cn("h-3 w-3", rating === r ? "fill-primary" : "")} />
              {r}+
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <SectionHeader icon={Building2} title="Type" />
        <div className="flex gap-1.5 flex-wrap">
          {stayTypes.map((type) => (
            <ChipButton
              key={type.id}
              selected={selectedTypes.includes(type.id)}
              onClick={() => toggleType(type.id)}
            >
              {type.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <SectionHeader icon={Sparkles} title="Équipements" />
        <div className="grid grid-cols-2 gap-2">
          {amenities.map((amenity) => {
            const Icon = amenity.icon;
            const isSelected = selectedAmenities.includes(amenity.id);
            return (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                className={cn(
                  "p-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {amenity.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Preferences Panel
const PreferencesPanel = () => {
  const [pace, setPace] = useState<"relaxed" | "moderate" | "intense">("moderate");
  const [budgetLevel, setBudgetLevel] = useState(50);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["culture", "food"]);
  const [travelStyle, setTravelStyle] = useState<string>("couple");

  const interests = [
    { id: "culture", label: "Culture", icon: Palette },
    { id: "nature", label: "Nature", icon: TreePine },
    { id: "food", label: "Gastronomie", icon: Utensils },
    { id: "beach", label: "Plage", icon: Waves },
    { id: "wellness", label: "Bien-être", icon: Heart },
    { id: "sport", label: "Sport", icon: Dumbbell },
  ];

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      {/* Pace */}
      <div>
        <SectionHeader icon={Clock} title="Rythme de voyage" />
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "relaxed", label: "Détente", emoji: "🧘" },
            { id: "moderate", label: "Modéré", emoji: "🚶" },
            { id: "intense", label: "Intensif", emoji: "🏃" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPace(p.id as typeof pace)}
              className={cn(
                "py-3 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1.5",
                pace === p.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
              )}
            >
              <span className="text-lg">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Sensitivity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Star} title="Niveau de confort" />
          <span className="text-xs text-muted-foreground">
            {budgetLevel < 33 ? "Économique" : budgetLevel < 66 ? "Confort" : "Premium"}
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={[budgetLevel]}
            onValueChange={([v]) => setBudgetLevel(v)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {/* Interests */}
      <div>
        <SectionHeader icon={Heart} title="Centres d'intérêt" />
        <div className="grid grid-cols-3 gap-2">
          {interests.map((interest) => {
            const Icon = interest.icon;
            const isSelected = selectedInterests.includes(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1.5",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {interest.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Travel Style */}
      <div>
        <SectionHeader icon={Users} title="Style de voyage" />
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "solo", label: "Solo", emoji: "🧑" },
            { id: "couple", label: "Couple", emoji: "💑" },
            { id: "family", label: "Famille", emoji: "👨‍👩‍👧" },
            { id: "friends", label: "Amis", emoji: "👯" },
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => setTravelStyle(style.id)}
              className={cn(
                "py-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2",
                travelStyle === style.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
              )}
            >
              <span>{style.emoji}</span>
              {style.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlannerPanel;
