import { useCallback, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import PlannerMap from "@/components/planner/PlannerMap";
import PlannerPanel from "@/components/planner/PlannerPanel";
import PlannerCard from "@/components/planner/PlannerCard";
import PlannerChat from "@/components/planner/PlannerChat";
import PlannerTopBar from "@/components/planner/PlannerTopBar";

export type TabType = "flights" | "activities" | "stays" | "preferences";

export interface MapPin {
  id: string;
  type: TabType;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  price?: number;
  rating?: number;
  image?: string;
  duration?: string;
}

const TravelPlanner = () => {
  const [activeTab, setActiveTab] = useState<TabType>("flights");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([2.3522, 48.8566]); // Paris
  const [mapZoom, setMapZoom] = useState(5);

  const pageTitle = useMemo(() => {
    const byTab: Record<TabType, string> = {
      flights: "Flights",
      activities: "Activities",
      stays: "Stays",
      preferences: "Preferences",
    };
    return `Travel Co-Pilot | ${byTab[activeTab]}`;
  }, [activeTab]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSelectedPin(null);
  }, []);

  const handlePinClick = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedPin(null);
  }, []);

  const handleAddToTrip = useCallback((pin: MapPin) => {
    // TODO: Add to trip logic
    console.log("Added to trip:", pin);
    setSelectedPin(null);
  }, []);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="Workspace de planification: chat + carte interactive + onglets. Comparez vols, activités et hébergements et construisez votre voyage." 
        />
        <link rel="canonical" href="/planner" />
      </Helmet>

      <div className="h-[100svh] w-full grid grid-cols-[360px_1fr] overflow-hidden bg-background">
        {/* Left: Chat */}
        <PlannerChat
          onAction={(action) => {
            if (action.type === "tab") setActiveTab(action.tab);
            if (action.type === "zoom") {
              setMapCenter(action.center);
              setMapZoom(action.zoom);
            }
            if (action.type === "tabAndZoom") {
              setActiveTab(action.tab);
              setMapCenter(action.center);
              setMapZoom(action.zoom);
            }
            setSelectedPin(null);
          }}
        />

        {/* Right: Map workspace */}
        <main className="relative overflow-hidden">
          <PlannerMap
            activeTab={activeTab}
            center={mapCenter}
            zoom={mapZoom}
            onPinClick={handlePinClick}
            selectedPinId={selectedPin?.id}
          />

          {/* Overlay tabs + actions */}
          <PlannerTopBar activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Overlay right panel (contextual) */}
          <PlannerPanel
            activeTab={activeTab}
            layout="overlay"
            onMapMove={(center, zoom) => {
              setMapCenter(center);
              setMapZoom(zoom);
            }}
          />

          {/* Floating card on map */}
          {selectedPin && (
            <PlannerCard pin={selectedPin} onClose={handleCloseCard} onAddToTrip={handleAddToTrip} />
          )}
        </main>
      </div>
    </>
  );
};

export default TravelPlanner;

