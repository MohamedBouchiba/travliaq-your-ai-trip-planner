import { Building2, MapPin, Plane, Settings2 } from "lucide-react";
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
    <div className="pointer-events-none absolute top-4 left-6 z-20 flex items-center gap-2">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = activeTab === t.id;

        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "pointer-events-auto h-10 px-4 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-300 backdrop-blur-md border",
              isActive
                ? "bg-primary/90 text-primary-foreground border-primary/50 shadow-lg"
                : "bg-background/60 text-foreground/80 border-border/50 hover:bg-background/80 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden md:inline">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
