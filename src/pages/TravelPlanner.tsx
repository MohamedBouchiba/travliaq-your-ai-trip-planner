import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import PlannerMap from "@/components/planner/PlannerMap";
import PlannerTabs from "@/components/planner/PlannerTabs";
import PlannerPanel from "@/components/planner/PlannerPanel";
import PlannerCard from "@/components/planner/PlannerCard";

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
        <title>Planificateur de Voyage | Travliaq</title>
        <meta name="description" content="Planifiez votre voyage avec notre interface interactive. Trouvez des vols, hébergements et activités sur une carte interactive." />
      </Helmet>

      <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
        {/* Top Navigation Bar with Tabs */}
        <PlannerTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Main Content: Map + Side Panel */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Interactive Map */}
          <div className="flex-1 relative">
            <PlannerMap
              activeTab={activeTab}
              center={mapCenter}
              zoom={mapZoom}
              onPinClick={handlePinClick}
              selectedPinId={selectedPin?.id}
            />

            {/* Floating Card on Map */}
            {selectedPin && (
              <PlannerCard
                pin={selectedPin}
                onClose={handleCloseCard}
                onAddToTrip={handleAddToTrip}
              />
            )}
          </div>

          {/* Right Side Panel */}
          <PlannerPanel
            activeTab={activeTab}
            onMapMove={(center, zoom) => {
              setMapCenter(center);
              setMapZoom(zoom);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default TravelPlanner;
