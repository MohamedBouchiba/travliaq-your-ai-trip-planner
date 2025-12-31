import { useState } from "react";
import { MapPin, Clock, Star, Palette, TreePine, Utensils, Sparkles } from "lucide-react";
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

// Chip Button Component
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

export default ActivitiesPanel;
