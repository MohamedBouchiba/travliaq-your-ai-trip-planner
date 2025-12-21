import { Plane, MapPin, Building2, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { TabType } from "@/pages/TravelPlanner";

interface PlannerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "flights", label: "Vols", icon: Plane },
  { id: "activities", label: "Activités", icon: MapPin },
  { id: "stays", label: "Hébergements", icon: Building2 },
  { id: "preferences", label: "Préférences", icon: User },
];

const PlannerTabs = ({ activeTab, onTabChange }: PlannerTabsProps) => {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-2 shrink-0">
      {/* Back Button */}
      <Link
        to="/"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mr-4"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">Retour</span>
      </Link>

      {/* Logo/Title */}
      <div className="flex items-center gap-2 mr-6">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Plane className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-montserrat font-bold text-foreground hidden md:inline">
          Planificateur
        </span>
      </div>

      {/* Tab Navigation */}
      <nav className="flex items-center gap-1 flex-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-adventure"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Mon Voyage
        </button>
      </div>
    </header>
  );
};

export default PlannerTabs;
