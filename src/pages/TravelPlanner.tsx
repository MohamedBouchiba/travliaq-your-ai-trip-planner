import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import PlannerMap, { DestinationClickEvent } from "@/components/planner/PlannerMap";
import TripPriceBar from "@/components/planner/TripPriceBar";
import PlannerItineraryView from "@/components/planner/PlannerItineraryView";
import PlannerPanel, { FlightRoutePoint, CountrySelectionEvent } from "@/components/planner/PlannerPanel";
import PlannerCard from "@/components/planner/PlannerCard";
import PlannerChat, { FlightFormData, PlannerChatRef, AirportChoice, DualAirportChoice, AirportConfirmationData, ConfirmedAirports } from "@/components/planner/PlannerChat";
import PlannerTopBar from "@/components/planner/PlannerTopBar";
import PlannerMobileTopBar, { MobileView } from "@/components/planner/PlannerMobileTopBar";
import PlannerMobileBottomBar from "@/components/planner/PlannerMobileBottomBar";
import MobileLocationButton from "@/components/planner/MobileLocationButton";
import DestinationPopup from "@/components/planner/DestinationPopup";
import YouTubeShortsPanel from "@/components/planner/YouTubeShortsPanel";
import OnboardingTour from "@/components/planner/OnboardingTour";
import { PlannerErrorBoundary } from "@/components/planner/PlannerErrorBoundary";
import { AutoDetectDeparture } from "@/components/planner/AutoDetectDeparture";
import type { Airport } from "@/hooks/useNearestAirports";
import { STORAGE_KEYS } from "@/config/storageKeys";
import { WidgetHistoryProvider } from "@/contexts/WidgetHistoryContext";
import { NegativePreferencesProvider } from "@/contexts/NegativePreferencesContext";
import { usePlannerState } from "@/hooks/usePlannerState";
import { useMapState } from "@/hooks/useMapState";
import { useFlightState } from "@/hooks/useFlightState";
import { useDestinationPopup } from "@/hooks/useDestinationPopup";
import { useChatIntegration } from "@/hooks/useChatIntegration";
import { usePreferencesToHotels } from "@/hooks/usePreferencesToHotels";
import { useIsMobile } from "@/hooks/use-mobile";
import eventBus from "@/lib/eventBus";

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
  const { t } = useTranslation();
  const location = useLocation();
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [shouldConfirmLeave, setShouldConfirmLeave] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'itinerary'>('map');
  // Ref mirrors viewMode so event handlers can read it without stale closure
  const viewModeRef = useRef<'map' | 'itinerary'>('map');
  
  // Mobile responsiveness
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<MobileView>("chat");

  // Debug/ops: allow disabling onboarding via a dedicated route (/planner-notour)
  // or a query param (?noTour=1) in normal browsing.
  const searchParams = new URLSearchParams(location.search);
  const disableTour =
    location.pathname === "/planner-notour" || searchParams.has("noTour");
  
  // Check if coming from home page (new=1 query param) - forces a new session
  const forceNewSession = searchParams.has("new");
  // Get the initial query message from home page
  const initialQuery = searchParams.get("q");

  // Check if user has already completed onboarding in a previous session
  const hasSeenOnboarding = localStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED) === "true";
  
  // Track if we should show onboarding (new user + tour not disabled)
  const shouldShowOnboarding = !disableTour && !hasSeenOnboarding;

  // onboardingComplete tracks whether to allow map animation
  // ALWAYS animate the map immediately to center on user - don't wait for onboarding
  // The onboarding can run in parallel with the map animation
  const [onboardingComplete, setOnboardingComplete] = useState(true);

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
  
  // Track if we've already triggered new session for this navigation
  const newSessionTriggeredRef = useRef(false);
  
  // Force new session when coming from home page (new=1 query param)
  // Then send the initial query as the first message
  useEffect(() => {
    if (forceNewSession && !newSessionTriggeredRef.current) {
      newSessionTriggeredRef.current = true;
      
      // Small delay to ensure chatRef is ready
      const timer = setTimeout(() => {
        if (chatRef.current?.startNewSession) {
          chatRef.current.startNewSession();
          console.log("[TravelPlanner] Created new session from home page navigation");
          
          // Send the initial query as the first message if provided
          if (initialQuery) {
            // Additional delay to ensure session is fully initialized
            setTimeout(() => {
              if (chatRef.current?.sendInitialMessage) {
                chatRef.current.sendInitialMessage(initialQuery);
                console.log("[TravelPlanner] Sent initial message:", initialQuery);
              }
            }, 500);
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [forceNewSession, initialQuery]);

  // When switching between widgets OR closing the panel, default the map to the user's position.
  // IMPORTANT: Don't trigger during initial animation - only on subsequent tab/panel changes
  const [userDefaultFocusNonce, setUserDefaultFocusNonce] = useState(0);
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!userLocation) return;
    
    // Skip the first trigger (initial load) - let the main animation handle positioning
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    
    // Trigger refocus on tab change or panel close (after initial load)
    if (activeTab === "flights" || activeTab === "stays" || activeTab === "activities" || !isPanelVisible) {
      setUserDefaultFocusNonce((n) => n + 1);
    }
  }, [activeTab, isPanelVisible, userLocation?.lat, userLocation?.lng]);
  
  // Callback when onboarding ends
  const handleOnboardingComplete = useCallback(() => {
    setOnboardingComplete(true);
  }, []);

  // Callback to start animation after onboarding (kept for manual re-run)
  const handleRequestAnimation = useCallback(() => {
    setInitialAnimationDone(false);
  }, [setInitialAnimationDone]);

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

  // On mobile: when a tab:change fires (e.g. from TripPriceBar step buttons),
  // automatically switch to the maps view so the widget panel is visible.
  useEffect(() => {
    if (!isMobile) return;
    const handler = () => setMobileView("maps");
    eventBus.on("tab:change", handler);
    return () => eventBus.off("tab:change", handler);
  }, [isMobile]);

  // Keep the viewModeRef in sync so event handlers never read stale closures
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  // When a tab change fires from an external source (TripPriceBar step buttons) OR
  // the user clicks a tab while in itinerary view, reset back to map.
  // CRITICAL: only call setViewMode when we're actually in itinerary mode.
  // Calling setViewMode('map') when already in map causes an unnecessary re-render
  // that unmounts/remounts PlannerPanel — making widgets disappear.
  useEffect(() => {
    const handler = () => {
      if (viewModeRef.current === 'itinerary') {
        setViewMode('map');
      }
    };
    eventBus.on("viewMode:reset", handler);
    eventBus.on("tab:change", handler);
    return () => {
      eventBus.off("viewMode:reset", handler);
      eventBus.off("tab:change", handler);
    };
  }, []);

  // Leave confirmation if a conversation is in progress
  useEffect(() => {
    const handler = ({ dirty }: { dirty: boolean }) => setShouldConfirmLeave(dirty);
    eventBus.on("chat:dirty", handler);

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldConfirmLeave) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      eventBus.off("chat:dirty", handler as any);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [shouldConfirmLeave]);

  return (
    <>
      {/* Auto-detect departure airport from user's location */}
      <AutoDetectDeparture />
      <WidgetHistoryProvider>
            <NegativePreferencesProvider>
              <Helmet>
                <title>{t("planner.meta.title")}</title>
                <meta
                  name="description"
                  content={t("planner.meta.description")}
                />
                <link rel="canonical" href="/planner" />
              </Helmet>

              <div className="h-[100svh] w-full overflow-hidden bg-background">
                {/* Mobile Layout */}
                {isMobile ? (
                  <div className="h-full flex flex-col">
                    {/* Mobile Top Bar - Logo + TabBar (maps view) + Settings */}
                    <PlannerMobileTopBar
                      mobileView={mobileView}
                      activeTab={activeTab}
                      onTabChange={handleTabChange}
                      confirmLeave={shouldConfirmLeave}
                      confirmLeaveMessage={t("planner.leaveConfirmation")}
                    />

                    {/* Mobile Content - flex-1 */}
                    <div className="flex-1 overflow-hidden relative">
                      {mobileView === "chat" ? (
                        /* Full-screen Chat */
                        <PlannerErrorBoundary componentName="PlannerChat">
                          <PlannerChat
                            ref={chatRef}
                            isCollapsed={false}
                            onToggleCollapse={() => setMobileView("maps")}
                          />
                        </PlannerErrorBoundary>
                      ) : (
                        /* Maps View with Widgets at top */
                        <div className="h-full relative">
                          {viewMode === 'itinerary' ? (
                            <PlannerItineraryView onBackToMap={() => setViewMode('map')} />
                          ) : (
                            <>
                              {/* Map - full height behind everything */}
                              <PlannerErrorBoundary componentName="PlannerMap">
                                <PlannerMap
                                  activeTab={activeTab}
                                  center={mapCenter}
                                  zoom={mapZoom}
                                  onPinClick={handlePinClick}
                                  selectedPinId={selectedPin?.id}
                                  flightRoutes={flightRoutes}
                                  animateToUserLocation={onboardingComplete && !initialAnimationDone}
                                  onAnimationComplete={() => {
                                    setInitialAnimationDone(true);
                                    setIsPanelVisible(true);
                                  }}
                                  isPanelOpen={isPanelVisible}
                                  userLocation={userLocation}
                                  userDefaultFocusNonce={userDefaultFocusNonce}
                                  onDestinationClick={handleDestinationClick}
                                  isMobile={true}
                                  mobileWidgetOpen={isPanelVisible}
                                />
                              </PlannerErrorBoundary>

                              {/* Widget Panel - positioned at top on mobile (max 35vh) */}
                              {youtubePanel ? (
                                <div className="absolute top-0 left-0 right-0 z-10 max-h-[35vh] overflow-hidden animate-fade-in">
                                  <div className="h-full overflow-hidden rounded-b-2xl bg-card/95 backdrop-blur-xl border-b border-x border-border/50 shadow-lg">
                                    <YouTubeShortsPanel
                                      city={youtubePanel.city}
                                      countryName={youtubePanel.countryName}
                                      isOpen={true}
                                      onClose={() => setYoutubePanel(null)}
                                    />
                                  </div>
                                </div>
                              ) : isPanelVisible && (
                                <PlannerErrorBoundary componentName="PlannerPanel">
                                  <PlannerPanel
                                    activeTab={activeTab}
                                    layout="mobile-top"
                                    isVisible={isPanelVisible}
                                    onClose={() => {
                                      setIsPanelVisible(false);
                                      if (activeTab === "stays") {
                                        setTimeout(() => {
                                          eventBus.emit("hotels:fitToPrices", undefined);
                                        }, 350);
                                      }
                                    }}
                                    mapCenter={mapCenter}
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
                                </PlannerErrorBoundary>
                              )}

                              {/* GPS Location Button */}
                              <MobileLocationButton
                                onLocate={async () => {
                                  if (userLocation) {
                                    setMapCenter([userLocation.lng, userLocation.lat]);
                                    setMapZoom(12);
                                  }
                                }}
                                widgetOpen={isPanelVisible}
                              />

                              {/* Destination popup */}
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

                              {/* Floating card */}
                              {selectedPin && (
                                <PlannerCard pin={selectedPin} onClose={handleCloseCard} onAddToTrip={handleAddToTrip} />
                              )}

                              <TripPriceBar onPlanTrip={() => setViewMode('itinerary')} />
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Bar with Chat/Maps toggle */}
                    <PlannerMobileBottomBar
                      mobileView={mobileView}
                      onMobileViewChange={setMobileView}
                    />
                  </div>
                ) : (
                  /* Desktop Layout - Original ResizablePanelGroup */
                  <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Left: Chat - resizable with smooth animation */}
                    <ResizablePanel
                      ref={chatPanelRef}
                      defaultSize={35}
                      minSize={0}
                      maxSize={50}
                      collapsible
                      collapsedSize={0}
                      onCollapse={() => setIsChatCollapsed(true)}
                      onExpand={() => setIsChatCollapsed(false)}
                      onResize={(size) => {
                        // Auto-collapse when user drags below 12%
                        if (size > 0 && size < 12) {
                          chatPanelRef.current?.collapse();
                          setIsChatCollapsed(true);
                        }
                      }}
                      className="transition-all duration-300 ease-out"
                    >
                      <div data-tour="chat-panel" className="h-full relative">
                        <PlannerErrorBoundary componentName="PlannerChat">
                          <PlannerChat
                            ref={chatRef}
                            isCollapsed={isChatCollapsed}
                            onToggleCollapse={() => {
                              if (chatPanelRef.current?.isCollapsed()) {
                                chatPanelRef.current.expand();
                              } else {
                                chatPanelRef.current?.collapse();
                              }
                            }}
                          />
                        </PlannerErrorBoundary>
                      </div>
                    </ResizablePanel>

                    {/* Resize handle */}
                    <ResizableHandle
                      withHandle
                      className={
                        isChatCollapsed
                          ? "hidden"
                          : "bg-border/50 hover:bg-primary/30 transition-colors"
                      }
                    />

                    {/* Right: Map workspace - resizable */}
                    <ResizablePanel defaultSize={65} minSize={40}>
                      <main className="relative h-full overflow-hidden pt-12">
                        {viewMode === 'itinerary' ? (
                          <PlannerItineraryView onBackToMap={() => setViewMode('map')} />
                        ) : (
                          <>
                            <PlannerErrorBoundary componentName="PlannerMap">
                              <PlannerMap
                                activeTab={activeTab}
                                center={mapCenter}
                                zoom={mapZoom}
                                onPinClick={handlePinClick}
                                selectedPinId={selectedPin?.id}
                                flightRoutes={flightRoutes}
                                animateToUserLocation={onboardingComplete && !initialAnimationDone}
                                onAnimationComplete={() => {
                                  setInitialAnimationDone(true);
                                  setIsPanelVisible(true);
                                }}
                                isPanelOpen={isPanelVisible}
                                userLocation={userLocation}
                                userDefaultFocusNonce={userDefaultFocusNonce}
                                onDestinationClick={handleDestinationClick}
                              />
                            </PlannerErrorBoundary>

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
                              <div>
                                <PlannerErrorBoundary componentName="PlannerPanel">
                                  <PlannerPanel
                                    activeTab={activeTab}
                                    layout="overlay"
                                    isVisible={isPanelVisible}
                                    onClose={() => {
                                      setIsPanelVisible(false);
                                      if (activeTab === "stays") {
                                        setTimeout(() => {
                                          eventBus.emit("hotels:fitToPrices", undefined);
                                        }, 350);
                                      }
                                    }}
                                    mapCenter={mapCenter}
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
                                </PlannerErrorBoundary>
                              </div>
                            )}

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

                            {selectedPin && (
                              <PlannerCard pin={selectedPin} onClose={handleCloseCard} onAddToTrip={handleAddToTrip} />
                            )}

                            <TripPriceBar onPlanTrip={() => setViewMode('itinerary')} />
                          </>
                        )}

                        <PlannerTopBar
                          activeTab={activeTab}
                          onTabChange={handleTabChange}
                          isChatCollapsed={isChatCollapsed}
                          onOpenChat={() => chatPanelRef.current?.expand()}
                          confirmLeave={shouldConfirmLeave}
                          confirmLeaveMessage={t("planner.leaveConfirmation")}
                        />
                      </main>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                )}

                {/* Onboarding Tour - only for new users who haven't seen it (desktop only) */}
                {!isMobile && shouldShowOnboarding && (
                  <>
                    {/* Anchor div for onboarding modal steps (intro/outro) */}
                    <div
                      id="onboarding-anchor"
                      className="fixed inset-0 pointer-events-none z-[9999]"
                      aria-hidden="true"
                    />
                    <OnboardingTour
                      onPanelVisibilityChange={setIsPanelVisible}
                      onComplete={handleOnboardingComplete}
                      onRequestAnimation={handleRequestAnimation}
                    />
                  </>
                )}
              </div>
            </NegativePreferencesProvider>
          </WidgetHistoryProvider>
    </>
  );
};

export default TravelPlanner;
