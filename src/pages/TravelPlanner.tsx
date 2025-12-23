import { useCallback, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import PlannerMap, { DestinationClickEvent } from "@/components/planner/PlannerMap";
import PlannerPanel, { FlightRoutePoint, CountrySelectionEvent } from "@/components/planner/PlannerPanel";
import PlannerCard from "@/components/planner/PlannerCard";
import PlannerChat, { FlightFormData, PlannerChatRef, AirportChoice, DualAirportChoice } from "@/components/planner/PlannerChat";
import PlannerTopBar from "@/components/planner/PlannerTopBar";
import DestinationPopup from "@/components/planner/DestinationPopup";
import YouTubeShortsPanel from "@/components/planner/YouTubeShortsPanel";
import type { Airport } from "@/hooks/useNearestAirports";
import { FlightMemoryProvider } from "@/contexts/FlightMemoryContext";

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

// Selected airport info to pass to FlightsPanel
export interface SelectedAirport {
  field: "from" | "to";
  airport: Airport;
}

// User detected location
export interface UserLocation {
  lat: number;
  lng: number;
  city: string;
}

const TravelPlanner = () => {
  const [activeTab, setActiveTab] = useState<TabType>("flights");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 20]); // Globe view
  const [mapZoom, setMapZoom] = useState(1.5); // Zoom out to see globe
  const [isPanelVisible, setIsPanelVisible] = useState(false); // No panel at start
  const [flightRoutes, setFlightRoutes] = useState<FlightRoutePoint[]>([]);
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);
  const [flightFormData, setFlightFormData] = useState<FlightFormData | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<SelectedAirport | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [triggerFlightSearch, setTriggerFlightSearch] = useState(false);
  const searchMessageSentRef = useRef(false);
  const chatRef = useRef<PlannerChatRef>(null);

  // Destination popup state
  const [destinationPopup, setDestinationPopup] = useState<{
    cityName: string;
    countryName?: string;
    position: { x: number; y: number };
  } | null>(null);

  // YouTube panel state
  const [youtubePanel, setYoutubePanel] = useState<{
    city: string;
    countryName?: string;
  } | null>(null);

  const handleTabChange = useCallback((tab: TabType) => {
    // Toggle: if clicking on the same tab and panel is visible, close it
    if (tab === activeTab && isPanelVisible) {
      setIsPanelVisible(false);
    } else {
      setActiveTab(tab);
      setSelectedPin(null);
      setIsPanelVisible(true);
    }
  }, [activeTab, isPanelVisible]);

  const handlePinClick = useCallback((pin: MapPin) => {
    setSelectedPin(pin);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedPin(null);
  }, []);

  const handleAddToTrip = useCallback((pin: MapPin) => {
    console.log("Added to trip:", pin);
    setSelectedPin(null);
  }, []);

  const handleCountrySelected = useCallback((event: CountrySelectionEvent) => {
    // Trigger the chat to ask about city in this country
    chatRef.current?.injectSystemMessage(event);
  }, []);

  const handleAskAirportChoice = useCallback((choice: AirportChoice) => {
    chatRef.current?.askAirportChoice(choice);
  }, []);

  const handleAskDualAirportChoice = useCallback((choices: DualAirportChoice) => {
    chatRef.current?.askDualAirportChoice(choices);
  }, []);

  const handleSearchReady = useCallback((from: string, to: string) => {
    // Use ref to prevent duplicate messages (immediate check, no race condition)
    if (!searchMessageSentRef.current) {
      searchMessageSentRef.current = true;
      chatRef.current?.offerFlightSearch(from, to);
    }
  }, []);

  // Handle destination marker click
  const handleDestinationClick = useCallback((event: DestinationClickEvent) => {
    setDestinationPopup({
      cityName: event.cityName,
      countryName: event.countryName,
      position: event.screenPosition,
    });
  }, []);

  // Open YouTube panel from popup
  const handleOpenYouTube = useCallback(() => {
    if (destinationPopup) {
      setYoutubePanel({
        city: destinationPopup.cityName,
        countryName: destinationPopup.countryName,
      });
      setDestinationPopup(null);
      setIsPanelVisible(true);
    }
  }, [destinationPopup]);

  return (
    <FlightMemoryProvider>
      <Helmet>
        <title>Planificateur | Travliaq</title>
        <meta
          name="description"
          content="Planifiez votre voyage avec notre assistant intelligent. Comparez vols, activités et hébergements sur une carte interactive."
        />
        <link rel="canonical" href="/planner" />
      </Helmet>

      <div className="h-[100svh] w-full overflow-hidden bg-background">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left: Chat - resizable */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <PlannerChat
              ref={chatRef}
              onAction={(action) => {
                if (action.type === "tab") {
                  setActiveTab(action.tab);
                  setIsPanelVisible(true);
                }
                if (action.type === "zoom") {
                  setMapCenter(action.center);
                  setMapZoom(action.zoom);
                }
                if (action.type === "tabAndZoom") {
                  setActiveTab(action.tab);
                  setMapCenter(action.center);
                  setMapZoom(action.zoom);
                  setIsPanelVisible(true);
                }
                if (action.type === "updateFlight") {
                  setFlightFormData(action.flightData);
                  setIsPanelVisible(true);
                  // Reset search message flag for new search
                  searchMessageSentRef.current = false;
                }
                if (action.type === "selectAirport") {
                  // Pass selected airport to the panel
                  setSelectedAirport({ field: action.field, airport: action.airport });
                }
                if (action.type === "triggerFlightSearch") {
                  // Open the flights panel and trigger search
                  setActiveTab("flights");
                  setIsPanelVisible(true);
                  setTriggerFlightSearch(true);
                }
                setSelectedPin(null);
              }}
            />
          </ResizablePanel>

          {/* Resize handle */}
          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/30 transition-colors" />

          {/* Right: Map workspace - resizable */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <main className="relative h-full overflow-hidden pt-12">
              <PlannerMap
                activeTab={activeTab}
                center={mapCenter}
                zoom={mapZoom}
                onPinClick={handlePinClick}
                selectedPinId={selectedPin?.id}
                flightRoutes={flightRoutes}
                animateToUserLocation={!initialAnimationDone}
                onAnimationComplete={() => {
                  setInitialAnimationDone(true);
                  // Open the flights panel after the animation to show user's location
                  setIsPanelVisible(true);
                  setActiveTab("flights");
                }}
                isPanelOpen={isPanelVisible}
                userLocation={initialAnimationDone ? userLocation : null}
                onDestinationClick={handleDestinationClick}
              />

              {/* Overlay tabs */}
              <PlannerTopBar activeTab={activeTab} onTabChange={handleTabChange} />

              {/* YouTube Shorts Panel (takes over the regular panel) */}
              {youtubePanel ? (
                <aside className="pointer-events-none absolute top-16 left-4 bottom-4 w-[380px] z-10">
                  <div className="pointer-events-auto h-full overflow-hidden rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg">
                    <YouTubeShortsPanel
                      city={youtubePanel.city}
                      countryName={youtubePanel.countryName}
                      isOpen={true}
                      onClose={() => setYoutubePanel(null)}
                    />
                  </div>
                </aside>
              ) : (
                /* Regular Overlay panel */
                <PlannerPanel
                  activeTab={activeTab}
                  layout="overlay"
                  isVisible={isPanelVisible}
                  onClose={() => setIsPanelVisible(false)}
                  onMapMove={(center, zoom) => {
                    setMapCenter(center);
                    setMapZoom(zoom);
                  }}
                  onFlightRoutesChange={setFlightRoutes}
                  flightFormData={flightFormData}
                  onFlightFormDataConsumed={() => setFlightFormData(null)}
                  onCountrySelected={handleCountrySelected}
                  onAskAirportChoice={handleAskAirportChoice}
                  onAskDualAirportChoice={handleAskDualAirportChoice}
                  selectedAirport={selectedAirport}
                  onSelectedAirportConsumed={() => setSelectedAirport(null)}
                  onUserLocationDetected={setUserLocation}
                  onSearchReady={handleSearchReady}
                  triggerSearch={triggerFlightSearch}
                  onSearchTriggered={() => setTriggerFlightSearch(false)}
                />
              )}

              {/* Destination popup on map marker click */}
              <DestinationPopup
                cityName={destinationPopup?.cityName || ""}
                countryName={destinationPopup?.countryName}
                isOpen={!!destinationPopup}
                onClose={() => setDestinationPopup(null)}
                onDiscoverClick={handleOpenYouTube}
                position={destinationPopup?.position}
              />

              {/* Floating card on map */}
              {selectedPin && (
                <PlannerCard pin={selectedPin} onClose={handleCloseCard} onAddToTrip={handleAddToTrip} />
              )}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </FlightMemoryProvider>
  );
};

export default TravelPlanner;
