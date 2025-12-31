import { useState } from "react";
import { Clock, Star, Heart, Users, Palette, TreePine, Utensils, Waves, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

// Section Header Component
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <span className="text-sm font-medium text-foreground">{title}</span>
  </div>
);

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

export default PreferencesPanel;
