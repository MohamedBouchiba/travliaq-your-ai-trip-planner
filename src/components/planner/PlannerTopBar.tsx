import { Building2, MapPin, Plane, Settings2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { TabType } from "@/pages/TravelPlanner";

interface PlannerTopBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "flights", label: "Vols", icon: Plane },
  { id: "activities", label: "Activités", icon: MapPin },
  { id: "stays", label: "Hébergements", icon: Building2 },
  { id: "preferences", label: "Préférences", icon: Settings2 },
];

export default function PlannerTopBar({ activeTab, onTabChange }: PlannerTopBarProps) {
  return (
    <div className="pointer-events-none absolute top-4 left-4 right-4 z-20 flex items-start justify-between">
      {/* Back button */}
      <Link
        to="/"
        className="pointer-events-auto flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-card/95 backdrop-blur-lg shadow-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Retour</span>
      </Link>

      {/* Tabs - centered */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/95 backdrop-blur-lg shadow-lg px-1.5 py-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "h-9 px-4 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-adventure"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Spacer for balance */}
      <div className="w-24" />
    </div>
  );
}
