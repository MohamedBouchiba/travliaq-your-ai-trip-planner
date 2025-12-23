import { useState, useEffect } from "react";
import { Plane, ChevronDown, ChevronUp, Luggage, Star, Zap, Moon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlightSegment {
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  aircraft?: string;
}

export interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  outbound: FlightSegment[];
  inbound?: FlightSegment[];
  stops: number;
  totalDuration: string;
  cabinClass: string;
  isBestPrice?: boolean;
  isFastest?: boolean;
  hasNightLayover?: boolean;
  layoverDuration?: string;
}

interface FlightResultsProps {
  flights: FlightOffer[];
  isLoading?: boolean;
  onSelect?: (flight: FlightOffer) => void;
  travelers?: number;
  routeLabel?: string; // e.g. "BRU → CPH" for header
  tripType?: "roundtrip" | "oneway" | "multi";
}

// Airline logos
const getAirlineLogo = (code: string) => {
  return `https://images.kiwi.com/airlines/64/${code}.png`;
};

// Flight card - COMPACT VERTICAL LAYOUT
const FlightCard = ({ 
  flight, 
  onSelect,
  isExpanded,
  onToggleExpand,
  isRevealed,
  travelers = 1,
  isFirst = false
}: { 
  flight: FlightOffer; 
  onSelect?: (flight: FlightOffer) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isRevealed: boolean;
  travelers?: number;
  isFirst?: boolean;
}) => {
  const mainSegment = flight.outbound[0];
  const lastOutbound = flight.outbound[flight.outbound.length - 1];
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    if (isExpanded) {
      setShowDetails(true);
    } else {
      const timer = setTimeout(() => setShowDetails(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);
  
  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden transition-all duration-300",
        "hover:border-primary/40 hover:shadow-lg",
        isExpanded && "border-primary/50 shadow-lg",
        !isRevealed && "opacity-0 translate-y-4",
        isRevealed && "opacity-100 translate-y-0"
      )}
      style={{ 
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out, border-color 0.2s, box-shadow 0.2s" 
      }}
    >
      {/* Badges row */}
      {(isFirst || flight.isFastest || flight.hasNightLayover) && (
        <div className="px-3 pt-2 pb-0 flex gap-1.5 flex-wrap">
          {isFirst && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
              <Star className="h-2.5 w-2.5" /> Recommandé
            </span>
          )}
          {flight.isFastest && !isFirst && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold dark:bg-amber-900/30 dark:text-amber-400">
              <Zap className="h-2.5 w-2.5" /> Plus rapide
            </span>
          )}
          {flight.hasNightLayover && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold dark:bg-indigo-900/30 dark:text-indigo-400">
              <Moon className="h-2.5 w-2.5" /> Escale de nuit
            </span>
          )}
        </div>
      )}
      
      {/* Main content */}
      <div className="p-3">
        {/* Airline + Flight info row */}
        <div className="flex items-center gap-3">
          {/* Airline logo */}
          <div className="shrink-0">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center border border-border">
              <img 
                src={getAirlineLogo(mainSegment.airlineCode)} 
                alt={mainSegment.airline}
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-xs font-bold text-muted-foreground">{mainSegment.airlineCode}</span>
            </div>
          </div>
          
          {/* Flight times - center block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              {/* Departure */}
              <div className="text-left">
                <div className="text-lg font-bold text-foreground leading-tight">{mainSegment.departureTime}</div>
                <div className="text-xs text-muted-foreground">{mainSegment.departureAirport}</div>
              </div>
              
              {/* Flight path visualization */}
              <div className="flex-1 px-2 min-w-[60px]">
                <div className="text-center text-[10px] text-muted-foreground mb-0.5">{flight.totalDuration}</div>
                <div className="relative flex items-center">
                  <div className="h-px flex-1 bg-border" />
                  {flight.stops > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-500 border-2 border-card" />
                  )}
                  <Plane className="h-3 w-3 text-primary mx-0.5 shrink-0" />
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="text-center mt-0.5">
                  <span className={cn(
                    "text-[10px] font-medium",
                    flight.stops === 0 ? "text-green-600" : "text-amber-600"
                  )}>
                    {flight.stops === 0 ? "Direct" : `${flight.stops} escale`}
                  </span>
                  {flight.stops > 0 && flight.layoverDuration && (
                    <span className="text-[9px] text-muted-foreground block leading-tight">{flight.layoverDuration}</span>
                  )}
                </div>
              </div>
              
              {/* Arrival */}
              <div className="text-right">
                <div className="text-lg font-bold text-foreground leading-tight">{lastOutbound.arrivalTime}</div>
                <div className="text-xs text-muted-foreground">{lastOutbound.arrivalAirport}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Price + Button - Compact inline */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">{flight.price * travelers}</span>
            <span className="text-sm text-muted-foreground">{flight.currency}</span>
            {travelers > 1 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                ({flight.price} {flight.currency}/pers.)
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(flight);
            }}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Sélectionner
          </button>
        </div>
      </div>
      
      {/* Expand/Collapse button */}
      <button
        onClick={onToggleExpand}
        className="w-full py-2 border-t border-border flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" /> Masquer
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" /> Détails
          </>
        )}
      </button>
      
      {/* Expanded details */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {showDetails && (
          <div className="border-t border-border bg-muted/30 p-4 space-y-5">
            {/* Outbound */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                <Plane className="h-4 w-4" /> Vol aller
              </div>
              <div className="space-y-3">
                {flight.outbound.map((segment, idx) => (
                  <div key={idx}>
                    <div className="bg-card rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-border shrink-0">
                          <img 
                            src={getAirlineLogo(segment.airlineCode)} 
                            alt={segment.airline}
                            className="w-5 h-5 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold">{segment.departureTime}</span>
                            <span className="text-xs text-muted-foreground">{segment.departureAirport}</span>
                            <Plane className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
                            <span className="text-base font-bold">{segment.arrivalTime}</span>
                            <span className="text-xs text-muted-foreground">{segment.arrivalAirport}</span>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {segment.duration}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{segment.flightNumber}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Layover between segments */}
                    {idx < flight.outbound.length - 1 && (
                      <div className="flex items-center gap-3 py-3 px-4">
                        <div className="w-1 h-8 bg-amber-400 rounded-full ml-5" />
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <Moon className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Escale {flight.layoverDuration ? `· ${flight.layoverDuration}` : ''}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Inbound */}
            {flight.inbound && flight.inbound.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Plane className="h-4 w-4 rotate-180" /> Vol retour
                </div>
                <div className="space-y-3">
                  {flight.inbound.map((segment, idx) => (
                    <div key={idx}>
                      <div className="bg-card rounded-xl p-3 border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-border shrink-0">
                            <img 
                              src={getAirlineLogo(segment.airlineCode)} 
                              alt={segment.airline}
                              className="w-5 h-5 object-contain"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold">{segment.departureTime}</span>
                              <span className="text-xs text-muted-foreground">{segment.departureAirport}</span>
                              <Plane className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
                              <span className="text-base font-bold">{segment.arrivalTime}</span>
                              <span className="text-xs text-muted-foreground">{segment.arrivalAirport}</span>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {segment.duration}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{segment.flightNumber}</div>
                          </div>
                        </div>
                      </div>
                      
                      {idx < flight.inbound!.length - 1 && (
                        <div className="flex items-center gap-3 py-3 px-4">
                          <div className="w-1 h-8 bg-amber-400 rounded-full ml-5" />
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Moon className="h-4 w-4" />
                            <span className="text-sm font-medium">Escale</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Baggage info */}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <Luggage className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Bagage cabine inclus</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Loading skeleton
const FlightSkeleton = ({ delay = 0 }: { delay?: number }) => (
  <div 
    className="bg-card border border-border rounded-xl p-4 overflow-hidden relative"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
        <div className="mt-2 space-y-1">
          <div className="h-3 bg-muted rounded w-14 mx-auto animate-pulse" />
          <div className="h-2 bg-muted rounded w-10 mx-auto animate-pulse" />
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="h-7 bg-muted rounded w-16 animate-pulse" />
            <div className="h-4 bg-muted rounded w-10 animate-pulse" />
          </div>
          <div className="flex-1 px-4 space-y-2">
            <div className="h-3 bg-muted rounded w-12 mx-auto animate-pulse" />
            <div className="h-px bg-muted animate-pulse" />
            <div className="h-3 bg-muted rounded w-10 mx-auto animate-pulse" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="h-7 bg-muted rounded w-16 animate-pulse ml-auto" />
            <div className="h-4 bg-muted rounded w-10 animate-pulse ml-auto" />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-8 bg-muted rounded w-20 animate-pulse" />
            <div className="h-3 bg-muted rounded w-14 animate-pulse" />
          </div>
          <div className="h-12 bg-muted rounded w-28 animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);

// Main component
const FlightResults = ({ flights, isLoading, onSelect, travelers = 1, routeLabel, tripType = "roundtrip" }: FlightResultsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (!isLoading && flights.length > 0) {
      setRevealedIds(new Set());
      flights.forEach((flight, index) => {
        setTimeout(() => {
          setRevealedIds(prev => new Set([...prev, flight.id]));
        }, index * 80);
      });
    }
  }, [flights, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Recherche des meilleurs vols...</p>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <FlightSkeleton delay={0} />
        <FlightSkeleton delay={100} />
        <FlightSkeleton delay={200} />
      </div>
    );
  }
  
  if (flights.length === 0) {
    return (
      <div className="text-center py-12">
        <Plane className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground">Aucun vol trouvé pour ces critères</p>
      </div>
    );
  }

  // Build route header from first flight if not provided
  const displayRoute = routeLabel || (() => {
    const first = flights[0];
    const from = first.outbound[0]?.departureAirport || "?";
    const to = first.outbound[first.outbound.length - 1]?.arrivalAirport || "?";
    return `${from} → ${to}`;
  })();

  const tripLabel = tripType === "roundtrip" ? "Aller-retour" : tripType === "oneway" ? "Aller simple" : "Multi-destinations";
  
  return (
    <div className="space-y-4">
      {/* Route header - clearly visible */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border pb-3 -mx-4 px-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Plane className="h-5 w-5 text-primary" />
            <span>{displayRoute}</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
            {tripLabel}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{flights.length}</span> vol{flights.length > 1 ? "s" : ""} trouvé{flights.length > 1 ? "s" : ""}
          </p>
          {flights.length > 3 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ChevronDown className="h-3 w-3 animate-bounce" />
              Scroll pour plus
            </p>
          )}
        </div>
      </div>
      
      {flights.map((flight, index) => (
        <FlightCard
          key={flight.id}
          flight={flight}
          onSelect={onSelect}
          isExpanded={expandedId === flight.id}
          onToggleExpand={() => setExpandedId(expandedId === flight.id ? null : flight.id)}
          isRevealed={revealedIds.has(flight.id)}
          travelers={travelers}
          isFirst={index === 0}
        />
      ))}
    </div>
  );
};

export default FlightResults;

// Mock flight data generator
export const generateMockFlights = (from: string, to: string): FlightOffer[] => {
  const airlines = [
    { name: "Air France", code: "AF" },
    { name: "Lufthansa", code: "LH" },
    { name: "British Airways", code: "BA" },
    { name: "KLM", code: "KL" },
    { name: "Vueling", code: "VY" },
    { name: "Ryanair", code: "FR" },
  ];
  
  const layoverAirports = ["CDG", "AMS", "FRA", "LHR", "MAD"];
  const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from.substring(0, 3).toUpperCase();
  const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to.substring(0, 3).toUpperCase();
  
  const flights: FlightOffer[] = [];
  
  for (let i = 0; i < 5; i++) {
    const airline = airlines[i % airlines.length];
    const price = Math.floor(Math.random() * 300) + 80;
    const departHour = 6 + Math.floor(Math.random() * 14);
    const durationHours = 1 + Math.floor(Math.random() * 4);
    const durationMins = Math.floor(Math.random() * 50);
    const hasReturn = Math.random() > 0.3;
    const stops = Math.random() > 0.6 ? 1 : 0;
    const hasNightLayover = stops > 0 && Math.random() > 0.5;
    const layoverMins = stops > 0 ? 45 + Math.floor(Math.random() * 120) : 0;
    const layoverAirport = stops > 0 ? layoverAirports[Math.floor(Math.random() * layoverAirports.length)] : null;
    
    const formatTime = (h: number, m: number) => {
      const hour = h % 24;
      return `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    
    const depMins = Math.floor(Math.random() * 6) * 10;
    const arrMins = Math.floor(Math.random() * 6) * 10;
    
    const outboundSegments: FlightSegment[] = [];
    if (stops > 0 && layoverAirport) {
      const firstDuration = Math.floor(durationHours / 2);
      outboundSegments.push({
        departureTime: formatTime(departHour, depMins),
        arrivalTime: formatTime(departHour + firstDuration, arrMins),
        departureAirport: fromCode,
        arrivalAirport: layoverAirport,
        duration: `${firstDuration}h${Math.floor(Math.random() * 30)}`,
        airline: airline.name,
        airlineCode: airline.code,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
      });
      const secondDepartHour = departHour + firstDuration + Math.floor(layoverMins / 60);
      outboundSegments.push({
        departureTime: formatTime(secondDepartHour, (arrMins + layoverMins) % 60),
        arrivalTime: formatTime(departHour + durationHours + Math.floor(layoverMins / 60), arrMins),
        departureAirport: layoverAirport,
        arrivalAirport: toCode,
        duration: `${durationHours - firstDuration}h${Math.floor(Math.random() * 30)}`,
        airline: airline.name,
        airlineCode: airline.code,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
      });
    } else {
      outboundSegments.push({
        departureTime: formatTime(departHour, depMins),
        arrivalTime: formatTime(departHour + durationHours, arrMins),
        departureAirport: fromCode,
        arrivalAirport: toCode,
        duration: `${durationHours}h${durationMins > 0 ? durationMins : ''}`,
        airline: airline.name,
        airlineCode: airline.code,
        flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
      });
    }
    
    flights.push({
      id: `flight-${i}`,
      price,
      currency: "€",
      stops,
      totalDuration: `${durationHours + Math.floor(layoverMins / 60)}h${((durationMins + layoverMins) % 60) || ''}`,
      cabinClass: "Économique",
      isBestPrice: i === 0,
      isFastest: i === 1,
      hasNightLayover,
      layoverDuration: stops > 0 ? `${Math.floor(layoverMins / 60)}h${layoverMins % 60} à ${layoverAirport}` : undefined,
      outbound: outboundSegments,
      inbound: hasReturn ? [
        {
          departureTime: formatTime(departHour + 6, depMins),
          arrivalTime: formatTime(departHour + 6 + durationHours, arrMins),
          departureAirport: toCode,
          arrivalAirport: fromCode,
          duration: `${durationHours}h${durationMins > 0 ? durationMins : ''}`,
          airline: airline.name,
          airlineCode: airline.code,
          flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
        },
      ] : undefined,
    });
  }
  
  return flights.sort((a, b) => a.price - b.price);
};