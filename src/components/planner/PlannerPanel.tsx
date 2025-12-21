import { useState } from "react";
import { Calendar, Users, Armchair, Filter, Clock, Sun, Moon, DollarSign, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabType } from "@/pages/TravelPlanner";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface PlannerPanelProps {
  activeTab: TabType;
  onMapMove: (center: [number, number], zoom: number) => void;
  layout?: "sidebar" | "overlay";
}

const PlannerPanel = ({ activeTab, onMapMove, layout = "sidebar" }: PlannerPanelProps) => {
  const wrapperClass =
    layout === "overlay"
      ? "pointer-events-none absolute top-20 right-4 bottom-4 w-[320px] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-deep overflow-hidden z-10"
      : "w-80 lg:w-96 border-l border-border bg-card overflow-y-auto themed-scroll shrink-0";

  const innerClass = layout === "overlay" ? "pointer-events-auto h-full overflow-y-auto themed-scroll p-4" : "p-4";

  return (
    <aside className={wrapperClass} aria-label="Panneau de filtres">
      <div className={innerClass}>
        {activeTab === "flights" && <FlightsPanel onMapMove={onMapMove} />}
        {activeTab === "activities" && <ActivitiesPanel />}
        {activeTab === "stays" && <StaysPanel />}
        {activeTab === "preferences" && <PreferencesPanel />}
      </div>
    </aside>
  );
};

// Flights Panel
const FlightsPanel = ({ onMapMove }: { onMapMove: (center: [number, number], zoom: number) => void }) => {
  const [passengers, setPassengers] = useState(2);
  const [travelClass, setTravelClass] = useState<"economy" | "business" | "first">("economy");
  const [directOnly, setDirectOnly] = useState(false);

  const priceCalendar = [
    { day: 15, price: 120, cheapest: false },
    { day: 16, price: 95, cheapest: true },
    { day: 17, price: 110, cheapest: false },
    { day: 18, price: 145, cheapest: false },
    { day: 19, price: 98, cheapest: true },
    { day: 20, price: 130, cheapest: false },
    { day: 21, price: 140, cheapest: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Calendrier des prix
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground py-1">
              {d}
            </div>
          ))}
          {priceCalendar.map((item) => (
            <button
              key={item.day}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all",
                item.cheapest
                  ? "bg-primary/10 border-2 border-primary text-primary font-semibold"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              <span>{item.day}</span>
              <span className="text-[10px]">{item.price}€</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-montserrat font-bold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Voyageurs
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPassengers(Math.max(1, passengers - 1))}
            className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            -
          </button>
          <span className="text-lg font-semibold w-8 text-center">{passengers}</span>
          <button
            onClick={() => setPassengers(passengers + 1)}
            className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-montserrat font-bold text-foreground flex items-center gap-2">
          <Armchair className="h-5 w-5 text-primary" />
          Classe
        </h3>
        <div className="flex gap-2">
          {[
            { id: "economy", label: "Éco" },
            { id: "business", label: "Affaires" },
            { id: "first", label: "Première" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setTravelClass(c.id as typeof travelClass)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                travelClass === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-montserrat font-bold text-foreground flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Filtres
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="direct"
              checked={directOnly}
              onCheckedChange={(c) => setDirectOnly(!!c)}
            />
            <Label htmlFor="direct" className="text-sm">Vols directs uniquement</Label>
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Heure de départ</Label>
            <div className="flex gap-2">
              <button className="flex-1 py-2 px-3 rounded-lg bg-muted text-sm flex items-center justify-center gap-1 hover:bg-muted/80">
                <Sun className="h-4 w-4" /> Matin
              </button>
              <button className="flex-1 py-2 px-3 rounded-lg bg-muted text-sm flex items-center justify-center gap-1 hover:bg-muted/80">
                <Moon className="h-4 w-4" /> Soir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Activities Panel
const ActivitiesPanel = () => {
  const [budgetRange, setBudgetRange] = useState([0, 100]);
  const [activityTypes, setActivityTypes] = useState<string[]>(["culture", "outdoor"]);

  const types = [
    { id: "culture", label: "Culture", emoji: "🏛️" },
    { id: "outdoor", label: "Plein air", emoji: "🌲" },
    { id: "food", label: "Gastronomie", emoji: "🍽️" },
    { id: "nightlife", label: "Vie nocturne", emoji: "🌙" },
    { id: "shopping", label: "Shopping", emoji: "🛍️" },
  ];

  const toggleType = (id: string) => {
    setActivityTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Type d'activité
        </h3>
        <div className="flex flex-wrap gap-2">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => toggleType(type.id)}
              className={cn(
                "py-2 px-4 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                activityTypes.includes(type.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{type.emoji}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Durée
        </h3>
        <div className="flex gap-2">
          {["< 2h", "2-4h", "> 4h"].map((d) => (
            <button
              key={d}
              className="flex-1 py-2 px-3 rounded-lg bg-muted text-sm hover:bg-muted/80 transition-colors"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Budget
        </h3>
        <Slider
          value={budgetRange}
          onValueChange={setBudgetRange}
          max={200}
          step={10}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{budgetRange[0]}€</span>
          <span>{budgetRange[1]}€</span>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <h4 className="font-semibold text-foreground mb-3">Suggestions</h4>
        <div className="space-y-3">
          {[
            { title: "Tour Eiffel", duration: "2h", price: "28€" },
            { title: "Croisière Seine", duration: "1h30", price: "15€" },
            { title: "Montmartre", duration: "3h", price: "Gratuit" },
          ].map((item) => (
            <div
              key={item.title}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            >
              <div className="font-medium text-foreground">{item.title}</div>
              <div className="text-sm text-muted-foreground flex gap-3">
                <span>{item.duration}</span>
                <span>{item.price}</span>
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
  const [priceRange, setPriceRange] = useState([50, 300]);
  const [rating, setRating] = useState(3);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Budget par nuit
        </h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={1000}
          step={25}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{priceRange[0]}€</span>
          <span>{priceRange[1]}€</span>
        </div>
      </div>

      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4">Note minimum</h3>
        <div className="flex gap-2">
          {[3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setRating(r)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                rating === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {r}+ ⭐
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4">Type d'hébergement</h3>
        <div className="space-y-2">
          {["Hôtel", "Appartement", "Auberge", "Villa"].map((type) => (
            <div key={type} className="flex items-center space-x-3">
              <Checkbox id={type} />
              <Label htmlFor={type}>{type}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-4">Équipements</h3>
        <div className="flex flex-wrap gap-2">
          {["WiFi", "Piscine", "Parking", "Petit-déj", "Climatisation"].map((eq) => (
            <button
              key={eq}
              className="py-1.5 px-3 rounded-full bg-muted text-sm text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              {eq}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Preferences Panel
const PreferencesPanel = () => {
  const [pace, setPace] = useState<"relaxed" | "moderate" | "intense">("moderate");
  const [budgetSensitivity, setBudgetSensitivity] = useState(50);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-montserrat font-bold text-foreground mb-2 flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" />
          Vos préférences
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ces réglages affectent les recommandations sur la carte.
        </p>
      </div>

      <div>
        <Label className="font-semibold">Rythme de voyage</Label>
        <div className="flex gap-2 mt-2">
          {[
            { id: "relaxed", label: "Détente", emoji: "🧘" },
            { id: "moderate", label: "Modéré", emoji: "🚶" },
            { id: "intense", label: "Intensif", emoji: "🏃" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPace(p.id as typeof pace)}
              className={cn(
                "flex-1 py-3 px-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center gap-1",
                pace === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-lg">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="font-semibold">Sensibilité au budget</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Économique ← → Premium
        </p>
        <Slider
          value={[budgetSensitivity]}
          onValueChange={([v]) => setBudgetSensitivity(v)}
          max={100}
          step={10}
          className="w-full"
        />
      </div>

      <div>
        <Label className="font-semibold">Centres d'intérêt</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {[
            { label: "Histoire", emoji: "🏛️" },
            { label: "Nature", emoji: "🌿" },
            { label: "Art", emoji: "🎨" },
            { label: "Gastronomie", emoji: "🍷" },
            { label: "Sport", emoji: "⚽" },
            { label: "Plage", emoji: "🏖️" },
          ].map((interest) => (
            <button
              key={interest.label}
              className="py-2 px-4 rounded-full bg-muted text-sm hover:bg-primary hover:text-primary-foreground transition-all"
            >
              {interest.emoji} {interest.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="font-semibold">Style de voyage</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {["Solo", "Couple", "Famille", "Amis"].map((style) => (
            <button
              key={style}
              className="py-3 rounded-lg bg-muted text-sm hover:bg-primary hover:text-primary-foreground transition-all"
            >
              {style}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlannerPanel;
