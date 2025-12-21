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
      ? "pointer-events-none absolute top-16 left-4 bottom-4 w-[320px] z-10"
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

// Flights Panel
const FlightsPanel = ({ onMapMove }: { onMapMove: (center: [number, number], zoom: number) => void }) => {
  const [departure, setDeparture] = useState<{ city: string; date?: Date }>({ city: "" });
  const [arrival, setArrival] = useState<{ city: string; date?: Date }>({ city: "" });
  const [stops, setStops] = useState<FlightLeg[]>([]);
  const [passengers, setPassengers] = useState(2);
  const [travelClass, setTravelClass] = useState<"economy" | "business" | "first">("economy");
  const [directOnly, setDirectOnly] = useState(false);
  const [departureTime, setDepartureTime] = useState<"morning" | "afternoon" | "evening" | null>(null);

  return (
    <div className="space-y-5">
      {/* Route Builder */}
      <div>
        <SectionHeader icon={Plane} title="Itinéraire" />
        <FlightRouteBuilder
          departure={departure}
          arrival={arrival}
          stops={stops}
          onDepartureChange={setDeparture}
          onArrivalChange={setArrival}
          onStopsChange={setStops}
          maxStops={2}
        />
      </div>

      {/* Passengers */}
      <div>
        <SectionHeader icon={Users} title="Voyageurs" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
          <span className="text-sm text-foreground">Passagers</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPassengers(Math.max(1, passengers - 1))}
              className="h-7 w-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors"
            >
              −
            </button>
            <span className="text-sm font-semibold w-4 text-center">{passengers}</span>
            <button
              onClick={() => setPassengers(passengers + 1)}
              className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Class */}
      <div>
        <SectionHeader icon={Plane} title="Classe" />
        <div className="flex gap-1.5">
          {[
            { id: "economy", label: "Économique" },
            { id: "business", label: "Affaires" },
            { id: "first", label: "Première" },
          ].map((c) => (
            <ChipButton
              key={c.id}
              selected={travelClass === c.id}
              onClick={() => setTravelClass(c.id as typeof travelClass)}
            >
              {c.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div>
        <SectionHeader icon={Clock} title="Horaires" />
        <div className="space-y-2">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: "morning", label: "Matin", time: "6h-12h" },
              { id: "afternoon", label: "Après-midi", time: "12h-18h" },
              { id: "evening", label: "Soir", time: "18h-00h" },
            ].map((t) => (
              <ChipButton
                key={t.id}
                selected={departureTime === t.id}
                onClick={() => setDepartureTime(departureTime === t.id ? null : t.id as typeof departureTime)}
              >
                {t.label}
              </ChipButton>
            ))}
          </div>
          <button
            onClick={() => setDirectOnly(!directOnly)}
            className={cn(
              "w-full p-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2",
              directOnly
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
            )}
          >
            <Plane className="h-3.5 w-3.5" />
            Vols directs uniquement
          </button>
        </div>
      </div>
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
