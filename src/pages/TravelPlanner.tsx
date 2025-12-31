import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import PlannerMap, { DestinationClickEvent } from "@/components/planner/PlannerMap";
import PlannerPanel, { FlightRoutePoint, CountrySelectionEvent } from "@/components/planner/PlannerPanel";
import PlannerCard from "@/components/planner/PlannerCard";
import PlannerChat, { FlightFormData, PlannerChatRef, AirportChoice, DualAirportChoice, AirportConfirmationData, ConfirmedAirports } from "@/components/planner/PlannerChat";
import PlannerTopBar from "@/components/planner/PlannerTopBar";
import DestinationPopup from "@/components/planner/DestinationPopup";
import YouTubeShortsPanel from "@/components/planner/YouTubeShortsPanel";
import OnboardingTour from "@/components/planner/OnboardingTour";
import type { Airport } from "@/hooks/useNearestAirports";
import { FlightMemoryProvider } from "@/contexts/FlightMemoryContext";
import { TravelMemoryProvider } from "@/contexts/TravelMemoryContext";
import { AccommodationMemoryProvider } from "@/contexts/AccommodationMemoryContext";
import { usePlannerState } from "@/hooks/usePlannerState";
import { useMapState } from "@/hooks/useMapState";
import { useFlightState } from "@/hooks/useFlightState";
import { useDestinationPopup } from "@/hooks/useDestinationPopup";
import { useChatIntegration } from "@/hooks/useChatIntegration";

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
  // Custom hooks for state management
  const {
    activeTab,
    setActiveTab,
    isPanelVisible,
    setIsPanelVisible,
    selectedPin,
    handleTabChange,
    handlePinClick,
    handleCloseCard,
    handleAddToTrip,
  } = usePlannerState();

  const {
    mapCenter,
    setMapCenter,
    mapZoom,
    setMapZoom,
    initialAnimationDone,
    setInitialAnimationDone,
    handleAnimationComplete,
  } = useMapState();

  const {
    flightFormData,
    setFlightFormData,
    selectedAirport,
    setSelectedAirport,
    triggerFlightSearch,
    setTriggerFlightSearch,
    confirmedMultiAirports,
    setConfirmedMultiAirports,
  } = useFlightState(setActiveTab, setIsPanelVisible);

  const {
    destinationPopup,
    setDestinationPopup,
    youtubePanel,
    setYoutubePanel,
    handleDestinationClick,
    handleOpenYouTube,
    handleClosePopup,
    handleCloseYouTube,
  } = useDestinationPopup(setIsPanelVisible);

  const { chatRef, userLocation, searchMessageSentRef, setUserLocation } = useChatIntegration();

  // Remaining local state
  const [flightRoutes, setFlightRoutes] = useState<FlightRoutePoint[]>([]);

  // Panel-related handlers (chat integration)
  const handleCountrySelected = useCallback((event: CountrySelectionEvent) => {
    chatRef.current?.injectSystemMessage(event);
  }, []);

  const handleAskAirportChoice = useCallback((choice: AirportChoice) => {
    chatRef.current?.askAirportChoice(choice);
  }, []);

  const handleAskDualAirportChoice = useCallback((choices: DualAirportChoice) => {
    chatRef.current?.askDualAirportChoice(choices);
  }, []);

  const handleAskAirportConfirmation = useCallback((data: AirportConfirmationData) => {
    chatRef.current?.askAirportConfirmation(data);
  }, []);

  const handleSearchReady = useCallback((from: string, to: string) => {
    if (!searchMessageSentRef.current) {
      searchMessageSentRef.current = true;
      chatRef.current?.offerFlightSearch(from, to);
    }
  }, []);

  return (
    <TravelMemoryProvider>
      <FlightMemoryProvider>
        <AccommodationMemoryProvider>
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
            <div data-tour="chat-panel" className="h-full">
              <PlannerChat ref={chatRef} />
            </div>
          </ResizablePanel>

          {/* Resize handle */}
          <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/30 transition-colors" />

          {/* Right: Map workspace - resizable */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <main className="relative h-full overflow-hidden pt-12" data-tour="map-area">
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
                  // Open panel with the restored/active tab (don't force flights)
                  setIsPanelVisible(true);
                }}
                isPanelOpen={isPanelVisible}
                userLocation={initialAnimationDone ? userLocation : null}
                onDestinationClick={handleDestinationClick}
              />

              {/* Overlay tabs */}
              <div data-tour="tabs-bar">
                <PlannerTopBar activeTab={activeTab} onTabChange={handleTabChange} />
              </div>

              {/* YouTube Shorts Panel (takes over the regular panel) */}
              {youtubePanel ? (
                <aside className="pointer-events-none absolute top-16 left-4 bottom-4 w-[320px] sm:w-[360px] md:w-[400px] lg:w-[420px] xl:w-[480px] 2xl:w-[540px] z-10">
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
                <div data-tour="flights-panel">
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
                    onAskAirportConfirmation={handleAskAirportConfirmation}
                    selectedAirport={selectedAirport}
                    onSelectedAirportConsumed={() => setSelectedAirport(null)}
                    onUserLocationDetected={setUserLocation}
                    onSearchReady={handleSearchReady}
                    triggerSearch={triggerFlightSearch}
                    onSearchTriggered={() => setTriggerFlightSearch(false)}
                    confirmedMultiAirports={confirmedMultiAirports}
                    onConfirmedMultiAirportsConsumed={() => setConfirmedMultiAirports(null)}
                  />
                </div>
              )}

              {/* Destination popup on map marker click */}
              <DestinationPopup
                cityName={destinationPopup?.cityName || ""}
                countryName={destinationPopup?.countryName}
                isOpen={!!destinationPopup}
                onClose={() => {
                  window.dispatchEvent(new Event("destination-popup-close"));
                  setDestinationPopup(null);
                }}
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

        {/* Onboarding Tour */}
        <OnboardingTour />
          </div>
        </AccommodationMemoryProvider>
      </FlightMemoryProvider>
    </TravelMemoryProvider>
  );
};

export default TravelPlanner;
