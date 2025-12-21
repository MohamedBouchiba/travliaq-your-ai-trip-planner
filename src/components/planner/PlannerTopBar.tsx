import { Building2, MapPin, Plane, Settings2, Sparkles, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabType } from "@/pages/TravelPlanner";

interface PlannerTopBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "activities", label: "Activities", icon: MapPin },
  { id: "stays", label: "Stays", icon: Building2 },
  { id: "preferences", label: "Preferences", icon: Settings2 },
];

export default function PlannerTopBar({ activeTab, onTabChange }: PlannerTopBarProps) {
  return (
    <div className="pointer-events-none absolute top-3 left-3 right-3 z-20">
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Main tabs */}
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-deep px-2 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;

            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "h-9 px-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Actions chips (inspiration screenshot) */}
        <div className="hidden md:flex items-center gap-2 ml-2">
          <button className="pointer-events-auto h-10 px-4 rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-deep text-sm font-medium hover:bg-muted transition-colors">
            Make custom update
          </button>
          <button className="pointer-events-auto h-10 px-4 rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-deep text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Add Restaurant Recs
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="ml-auto flex items-center gap-1 rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-deep p-2">
          <button className="h-9 w-9 rounded-xl hover:bg-muted transition-colors" aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
          <button className="h-9 w-9 rounded-xl hover:bg-muted transition-colors" aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
