/**
 * Preferences Panel - Complete rewrite with memory integration
 * Features: AI detection, dietary restrictions, accessibility, localStorage persistence
 */

import { useState } from "react";
import { Clock, Star, Heart, Users, Palette, TreePine, Utensils, Waves, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { usePreferenceMemory } from "@/contexts/PreferenceMemoryContext";
import { toastSuccess } from "@/lib/toast";

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

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

const PreferencesPanel = () => {
  const {
    memory: { preferences },
    setPace,
    toggleInterest,
    setTravelStyle,
    setComfortLevel,
    toggleDietaryRestriction,
    toggleAccessibilityNeed,
    getPreferenceSummary,
    getComfortLabel,
  } = usePreferenceMemory();

  // UI State pour sections collapsibles
  const [showDietary, setShowDietary] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);

  const interests = [
    { id: "culture", label: "Culture", icon: Palette, emoji: "🎨" },
    { id: "nature", label: "Nature", icon: TreePine, emoji: "🌲" },
    { id: "food", label: "Gastronomie", icon: Utensils, emoji: "🍽️" },
    { id: "beach", label: "Plage", icon: Waves, emoji: "🏖️" },
    { id: "wellness", label: "Bien-être", icon: Heart, emoji: "💆" },
    { id: "sport", label: "Sport", icon: Dumbbell, emoji: "🏃" },
  ];

  return (
    <div className="space-y-5" data-tour="preferences-panel">
      {/* AI Detection Badge */}
      {preferences.detectedFromChat && (
        <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2">
          <span className="text-sm">🤖</span>
          <span className="text-xs text-blue-700 dark:text-blue-400">
            Préférences détectées par l'assistant IA
          </span>
        </div>
      )}

      {/* Travel Pace */}
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
              onClick={() => {
                setPace(p.id as typeof preferences.pace);
                toastSuccess("Rythme modifié", `Voyage ${p.label.toLowerCase()}`);
              }}
              className={cn(
                "py-3 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1.5",
                preferences.pace === p.id
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

      {/* Comfort Level */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Star} title="Niveau de confort" />
          <span className="text-xs font-medium text-primary">
            {getComfortLabel()}
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={[preferences.comfortLevel]}
            onValueChange={([v]) => setComfortLevel(v)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">Économique</span>
          <span className="text-[10px] text-muted-foreground">Confort</span>
          <span className="text-[10px] text-muted-foreground">Premium</span>
          <span className="text-[10px] text-muted-foreground">Luxe</span>
        </div>
      </div>

      {/* Interests */}
      <div>
        <SectionHeader icon={Heart} title="Centres d'intérêt" />
        <div className="grid grid-cols-3 gap-2">
          {interests.map((interest) => {
            const Icon = interest.icon;
            const isSelected = preferences.interests.includes(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => {
                  toggleInterest(interest.id);
                  toastSuccess(
                    isSelected ? "Intérêt retiré" : "Intérêt ajouté",
                    interest.label
                  );
                }}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1.5",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                )}
              >
                <span className="text-lg">{interest.emoji}</span>
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
              onClick={() => {
                setTravelStyle(style.id as typeof preferences.travelStyle);
                toastSuccess("Style modifié", `Voyage en ${style.label.toLowerCase()}`);
              }}
              className={cn(
                "py-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2",
                preferences.travelStyle === style.id
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

      {/* Dietary Restrictions (Collapsible) */}
      <div className="border-t border-border/30 pt-3">
        <button
          onClick={() => setShowDietary(!showDietary)}
          className="w-full flex items-center justify-between py-2 text-xs font-medium text-foreground hover:text-primary transition-colors"
        >
          <span>Restrictions alimentaires</span>
          {showDietary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showDietary && (
          <div className="mt-2 space-y-2">
            {[
              { id: "vegetarian", label: "Végétarien" },
              { id: "vegan", label: "Végan" },
              { id: "halal", label: "Halal" },
              { id: "kosher", label: "Kosher" },
              { id: "gluten-free", label: "Sans gluten" },
            ].map((diet) => (
              <label
                key={diet.id}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={preferences.dietaryRestrictions.includes(diet.id)}
                  onChange={() => toggleDietaryRestriction(diet.id)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {diet.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Accessibility Needs (Collapsible) */}
      <div className="border-t border-border/30 pt-3">
        <button
          onClick={() => setShowAccessibility(!showAccessibility)}
          className="w-full flex items-center justify-between py-2 text-xs font-medium text-foreground hover:text-primary transition-colors"
        >
          <span>Besoins d'accessibilité</span>
          {showAccessibility ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAccessibility && (
          <div className="mt-2 space-y-2">
            {[
              { id: "wheelchair", label: "Accès fauteuil roulant" },
              { id: "elevator", label: "Ascenseur obligatoire" },
              { id: "visual-impairment", label: "Malvoyant" },
              { id: "hearing-impairment", label: "Malentendant" },
            ].map((need) => (
              <label
                key={need.id}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={preferences.accessibilityNeeds.includes(need.id)}
                  onChange={() => toggleAccessibilityNeed(need.id)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {need.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Summary Card */}
      <div className="pt-3 border-t border-border/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Résumé
        </span>
        <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs text-foreground leading-relaxed">
            {getPreferenceSummary()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Dernière mise à jour : {new Date(preferences.lastUpdated).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreferencesPanel;
