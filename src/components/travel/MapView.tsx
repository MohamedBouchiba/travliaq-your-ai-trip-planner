import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@/styles/mapbox-overrides.css";
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface MapViewProps {
  days: Array<{
    id: number;
    title: string;
    coordinates: [number, number];
  }>;
  activeDay: number;
  onScrollToDay?: (dayId: number) => void;
  activeDayData?: {
    title: string;
    subtitle?: string;
    why?: string;
    tips?: string;
    transfer?: string;
    weather?: { icon: string; temp: string; description: string };
    duration?: string;
    price?: string | number;
  };
}

const MapView = ({ days, activeDay, onScrollToDay, activeDayData }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: number]: mapboxgl.Marker }>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();
  const isMobileFullscreen = isMobile && isFullscreen;
  const originalParentRef = useRef<HTMLElement | null>(null);
  const originalNextSiblingRef = useRef<Node | null>(null);
  const overlayRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Ne pas réinitialiser la map si elle existe déjà
    if (map.current) return;

    // Public token fourni par l'utilisateur
    mapboxgl.accessToken = "pk.eyJ1IjoibW9oYW1lZGJvdWNoaWJhIiwiYSI6ImNtZ2t3dHZ0MzAyaDAya3NldXJ1dTkxdTAifQ.vYCeVngdG4_B0Zpms0dQNA";

    try {
      // Find first valid coordinate or use default
      const firstValidCoordinate = days.find(d => 
        d.coordinates && !(d.coordinates[0] === 0 && d.coordinates[1] === 0)
      )?.coordinates || [139.6917, 35.6895]; // Default to Tokyo

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: firstValidCoordinate,
        zoom: 11,
        attributionControl: false,
      });

      map.current.on('load', () => {
        setIsLoaded(true);
        // Force resize to ensure proper rendering
        setTimeout(() => {
          map.current?.resize();
        }, 100);
      });

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      // Désactiver le scroll zoom pour ne pas gêner le snap-scroll
      map.current.scrollZoom.disable();

      // Wait for map style to load before adding route line
      map.current.on('style.load', () => {
        if (!map.current) return;

        // Create route line connecting all points in order (only valid coordinates)
        const coordinates = days
          .filter(day => day.coordinates && !(day.coordinates[0] === 0 && day.coordinates[1] === 0))
          .map(day => day.coordinates);
        
        // Only create route if we have at least 2 valid points
        if (coordinates.length < 2) return;
        
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
        });

        // Add the line layer with styling
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': 'hsl(172, 66%, 50%)',
            'line-width': 3,
            'line-opacity': 0.8,
            'line-dasharray': [2, 2]
          }
        });

        // Add a glow effect layer underneath
        map.current.addLayer({
          id: 'route-glow',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': 'hsl(172, 66%, 50%)',
            'line-width': 8,
            'line-opacity': 0.3,
            'line-blur': 4
          }
        }, 'route');
      });

      // Add markers for each step (only if valid coordinates)
      days.forEach((day) => {
        // Skip steps with invalid coordinates (0,0 or missing)
        if (!day.coordinates || (day.coordinates[0] === 0 && day.coordinates[1] === 0)) {
          return;
        }

        const el = document.createElement("div");
        el.className = "marker-pin";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.borderRadius = "50%";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.transition = "all 0.3s";
        el.style.cursor = "pointer";
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

        // Add click handler to navigate to step
        el.addEventListener('click', () => {
          if (onScrollToDay) {
            onScrollToDay(day.id);
          }
        });

        if (map.current) {
          const marker = new mapboxgl.Marker(el).setLngLat(day.coordinates).addTo(map.current);
          markers.current[day.id] = marker;
        }
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      // Cleanup markers
      Object.values(markers.current).forEach(marker => marker.remove());
      markers.current = {};
      
      // Remove map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const activeLocation = days.find((day) => day.id === activeDay);
    // Only fly to location if it has valid coordinates
    if (activeLocation && activeLocation.coordinates && 
        !(activeLocation.coordinates[0] === 0 && activeLocation.coordinates[1] === 0)) {
      map.current.flyTo({
        center: activeLocation.coordinates, 
        zoom: 12.5, 
        duration: 1200, 
        essential: true 
      });
    }

    // Color palette for different activities
    const getActivityColor = (id: number, isActive: boolean) => {
      const colors = [
        'hsl(172, 66%, 50%)',  // Turquoise
        'hsl(45, 93%, 58%)',   // Golden
        'hsl(262, 83%, 58%)',  // Purple
        'hsl(142, 71%, 45%)',  // Green
        'hsl(24, 95%, 53%)',   // Orange
        'hsl(221, 83%, 53%)',  // Blue
      ];
      
      const colorIndex = (id - 1) % colors.length;
      return isActive ? colors[colorIndex] : 'rgba(255, 255, 255, 0.3)';
    };

    // Update marker styles
    days.forEach((day) => {
      const markerEl = markers.current[day.id]?.getElement();
      if (markerEl) {
        const isActive = day.id === activeDay;
        const color = getActivityColor(day.id, isActive);
        
        if (isActive) {
          markerEl.style.backgroundColor = color;
          markerEl.style.color = "white";
          markerEl.style.transform = "scale(1.3)";
          markerEl.style.boxShadow = `0 0 20px ${color}99`;
          markerEl.style.border = "none";
          markerEl.style.zIndex = "1000";
        } else {
          markerEl.style.backgroundColor = "rgba(15, 23, 42, 0.9)";
          markerEl.style.color = color;
          markerEl.style.transform = "scale(0.9)";
          markerEl.style.boxShadow = "none";
          markerEl.style.border = `2px solid ${color}`;
          markerEl.style.zIndex = "1";
        }
      }
    });
  }, [activeDay, days, isLoaded]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Force map resize when fullscreen changes
  useEffect(() => {
    if (!map.current) return;
    const doResize = () => map.current?.resize();
    // Immediate and delayed resizes to handle mobile layout shifts
    doResize();
    const r1 = requestAnimationFrame(doResize);
    const t1 = setTimeout(doResize, 250);
    const t2 = setTimeout(doResize, 600);
    const t3 = setTimeout(doResize, 1000);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen, isMobileFullscreen]);

  // Keep map sized correctly on viewport/orientation changes
  useEffect(() => {
    const onResize = () => {
      map.current?.resize();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);


  // Lock body scroll in mobile split view to prevent layout jumps when steps scroll
  useEffect(() => {
    if (!isMobileFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = (document.body.style as any).touchAction;
    document.body.style.overflow = 'hidden';
    (document.body.style as any).touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).touchAction = prevTouchAction || '';
    };
  }, [isMobileFullscreen]);

   return (
    <div className="relative w-full">
      {/* Single persistent map container */}
      <div
        ref={mapContainer}
        className={isMobileFullscreen
          ? "fixed left-0 right-0 top-0 z-[1000] h-[35vh] w-screen pointer-events-auto"
          : isFullscreen
            ? "fixed inset-x-0 top-0 h-1/2 z-50 pointer-events-auto"
            : "w-full h-56 rounded-lg overflow-hidden border border-travliaq-turquoise/20 shadow-[0_0_15px_rgba(56,189,248,0.1)] bg-gradient-to-br from-travliaq-deep-blue/70 to-travliaq-deep-blue/50 backdrop-blur-md"}
        style={isMobileFullscreen ? { height: '35svh' } : !isFullscreen ? { minHeight: '224px' } : undefined}
      />

      {/* Controls and footer in normal view */}
      {!isFullscreen && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm hover:bg-background"
            onClick={toggleFullscreen}
            title="Agrandir"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="bg-gradient-to-r from-travliaq-deep-blue/90 to-travliaq-deep-blue/80 backdrop-blur-md p-2 border-t border-travliaq-turquoise/20 rounded-b-lg">
            <p className="font-montserrat text-white text-xs font-semibold truncate">
              {days.find((d) => d.id === activeDay)?.title || ""}
            </p>
            <p className="font-inter text-travliaq-turquoise/80 text-[10px]">Étape {activeDay}</p>
          </div>
        </>
      )}

      {/* Split-screen overlay when fullscreen */}
      {isFullscreen && (
        <>
          {isMobile ? (
            <>
              {/* Close button floating at the very top */}
              <Button
                variant="outline"
                size="icon"
                className="fixed top-3 right-3 z-[1010] bg-background/90 backdrop-blur-sm hover:bg-background shadow-xl"
                onClick={toggleFullscreen}
                title="Réduire"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>

              {/* Bottom details panel positioned explicitly from 35svh */}
              <div 
                className="fixed left-0 right-0 z-[990] overflow-y-auto bg-gradient-to-b from-travliaq-deep-blue/95 to-travliaq-deep-blue backdrop-blur-sm border-t-2 border-travliaq-turquoise/30 shadow-2xl" 
                style={{ top: 'calc(35svh)', bottom: 0 }}
              >
                <div className="p-6 space-y-5">
                  {/* Title */}
                  <div className="space-y-1">
                    <h3 className="font-montserrat text-3xl font-bold text-white">
                      {activeDayData?.title}
                    </h3>
                    {activeDayData?.subtitle && (
                      <p className="font-inter text-travliaq-turquoise text-base">
                        {activeDayData.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Weather and Duration */}
                  <div className="flex gap-3 flex-wrap">
                    {activeDayData?.weather && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-travliaq-turquoise/20">
                        <span className="text-2xl">{activeDayData.weather.icon}</span>
                        <div>
                          <p className="font-inter text-white text-base font-semibold">
                            {activeDayData.weather.temp}
                          </p>
                          <p className="font-inter text-travliaq-turquoise/70 text-sm">
                            {activeDayData.weather.description}
                          </p>
                        </div>
                      </div>
                    )}
                    {activeDayData?.duration && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-travliaq-turquoise/20">
                        <span className="text-xl">⏱️</span>
                        <p className="font-inter text-white text-base">
                          {activeDayData.duration}
                        </p>
                      </div>
                    )}
                    {activeDayData?.price && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-travliaq-turquoise/20">
                        <span className="text-xl">💰</span>
                        <p className="font-inter text-white text-base">
                          {activeDayData.price}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Why */}
                  {activeDayData?.why && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">✨</span>
                        <h4 className="font-montserrat text-white font-semibold text-lg">
                          Pourquoi cette étape
                        </h4>
                      </div>
                      <p className="font-inter text-gray-300 text-base leading-relaxed pl-7">
                        {activeDayData.why}
                      </p>
                    </div>
                  )}

                  {/* Tips */}
                  {activeDayData?.tips && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💡</span>
                        <h4 className="font-montserrat text-white font-semibold text-lg">
                          Tips IA
                        </h4>
                      </div>
                      <p className="font-inter text-gray-300 text-base leading-relaxed pl-7">
                        {activeDayData.tips}
                      </p>
                    </div>
                  )}

                  {/* Transfer */}
                  {activeDayData?.transfer && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🚇</span>
                        <h4 className="font-montserrat text-white font-semibold text-lg">
                          Transfert
                        </h4>
                      </div>
                      <p className="font-inter text-gray-300 text-base leading-relaxed pl-7">
                        {activeDayData.transfer}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 mt-2">
                    <h4 className="font-montserrat text-white font-semibold text-lg">Toutes les étapes</h4>
                    <ol className="space-y-2">
                      {days.map((d) => (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => onScrollToDay?.(d.id)}
                            className="w-full text-left flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors rounded-lg px-3 py-2 border border-travliaq-turquoise/20"
                          >
                            <span className="font-montserrat text-white/90 text-sm">Étape {d.id}</span>
                            <span className="font-inter text-travliaq-turquoise/80 text-sm truncate">{d.title}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Dimmed backdrop + header on desktop/tablet */}
              <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
              <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between p-4 border-b border-travliaq-turquoise/20 bg-gradient-to-r from-travliaq-deep-blue/90 to-travliaq-deep-blue/80">
                <h2 className="font-montserrat text-white text-lg font-bold">Étape {activeDay}</h2>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-background/90 backdrop-blur-sm hover:bg-background"
                  onClick={toggleFullscreen}
                  title="Réduire"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Bottom details panel (50% height desktop/tablet) */}
              <div className="fixed inset-x-0 bottom-0 z-50 h-1/2 overflow-y-auto bg-gradient-to-b from-travliaq-deep-blue/80 to-travliaq-deep-blue/95 backdrop-blur-sm border-t-2 border-travliaq-turquoise/30">
                <div className="p-6 space-y-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <h3 className="font-montserrat text-2xl font-bold text-white">
                      {activeDayData?.title}
                    </h3>
                    {activeDayData?.subtitle && (
                      <p className="font-inter text-travliaq-turquoise text-sm">
                        {activeDayData.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Weather and Duration */}
                  <div className="flex gap-4 flex-wrap">
                    {activeDayData?.weather && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-travliaq-turquoise/20">
                        <span className="text-2xl">{activeDayData.weather.icon}</span>
                        <div>
                          <p className="font-inter text-white text-sm font-semibold">
                            {activeDayData.weather.temp}
                          </p>
                          <p className="font-inter text-travliaq-turquoise/70 text-xs">
                            {activeDayData.weather.description}
                          </p>
                        </div>
                      </div>
                    )}
                    {activeDayData?.duration && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-travliaq-turquoise/20">
                        <span className="text-xl">⏱️</span>
                        <p className="font-inter text-white text-sm">
                          {activeDayData.duration}
                        </p>
                      </div>
                    )}
                    {activeDayData?.price && (
                      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-travliaq-turquoise/20">
                        <span className="text-xl">💰</span>
                        <p className="font-inter text-white text-sm">
                          {activeDayData.price}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Why */}
                  {activeDayData?.why && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        <h4 className="font-montserrat text-white font-semibold">
                          Pourquoi cette étape
                        </h4>
                      </div>
                      <p className="font-inter text-gray-300 text-sm leading-relaxed pl-7">
                        {activeDayData.why}
                      </p>
                    </div>
                  )}

                  {/* Tips */}
                  {activeDayData?.tips && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">💡</span>
                        <h4 className="font-montserrat text-white font-semibold">
                          Tips IA
                        </h4>
                      </div>
                      <p className="font-inter text-gray-300 text-sm leading-relaxed pl-7">
                        {activeDayData.tips}
                      </p>
                    </div>
                  )}

                  {/* Transfer */}
                  {activeDayData?.transfer && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚇</span>
                        <h4 className="font-montserrat text-white font-semibold">
                          Transfert
                        </h4>
                      </div>
                      <p className="font-inter text-gray-300 text-sm leading-relaxed pl-7">
                        {activeDayData.transfer}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
export default MapView;
