import { Building2, MapPin, Plane, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabType } from "@/pages/TravelPlanner";
import logo from "@/assets/logo-travliaq.png";

interface PlannerTopBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; icon: React.ElementType }[] = [
  { id: "flights", icon: Plane },
  { id: "activities", icon: MapPin },
  { id: "stays", icon: Building2 },
  { id: "preferences", icon: Settings2 },
];

export default function PlannerTopBar({ activeTab, onTabChange }: PlannerTopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 h-12 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-4">
      {/* Tab icons - left side */}
      <div className="flex items-center gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={t.id}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {/* Logo - right side */}
      <img src={logo} alt="Travliaq" className="h-6 w-auto opacity-80" />
    </div>
  );
}
