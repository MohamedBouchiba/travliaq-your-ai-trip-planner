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
}

// Airline logos
const getAirlineLogo = (code: string) => {
  return `https://images.kiwi.com/airlines/64/${code}.png`;
};

// Flight card - CLEAN VERTICAL LAYOUT - NO OVERLAP
const FlightCard = ({ 
  flight, 
  onSelect,
  isExpanded,
  onToggleExpand,
  isRevealed
}: { 
  flight: FlightOffer; 
  onSelect?: (flight: FlightOffer) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isRevealed: boolean;
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
      {(flight.isBestPrice || flight.isFastest || flight.hasNightLayover) && (
        <div className="px-4 pt-3 pb-0 flex gap-2 flex-wrap">
          {flight.isBestPrice && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold dark:bg-green-900/30 dark:text-green-400">
              <Star className="h-3 w-3" /> Meilleur prix
            </span>
          )}
          {flight.isFastest && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold dark:bg-amber-900/30 dark:text-amber-400">
              <Zap className="h-3 w-3" /> Plus rapide
            </span>
          )}
          {flight.hasNightLayover && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold dark:bg-indigo-900/30 dark:text-indigo-400">
              <Moon className="h-3 w-3" /> Escale de nuit
            </span>
          )}
        </div>
      )}
      
      {/* Main content */}
      <div className="p-4">
        {/* Airline + Flight info row */}
        <div className="flex items-start gap-4">
          {/* Airline logo and name */}
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-border">
              <img 
                src={getAirlineLogo(mainSegment.airlineCode)} 
                alt={mainSegment.airline}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <span className="hidden text-sm font-bold text-muted-foreground">{mainSegment.airlineCode}</span>
            </div>
            <div className="mt-1.5 text-center">
              <div className="text-xs font-medium text-foreground truncate max-w-[70px]">{mainSegment.airline}</div>
              <div className="text-[10px] text-muted-foreground">{flight.cabinClass}</div>
            </div>
          </div>
          
          {/* Flight times - center block */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              {/* Departure */}
              <div className="text-left">
                <div className="text-2xl font-bold text-foreground">{mainSegment.departureTime}</div>
                <div className="text-sm text-muted-foreground">{mainSegment.departureAirport}</div>
              </div>
              
              {/* Flight path visualization */}
              <div className="flex-1 px-3 min-w-[80px]">
                <div className="text-center text-xs text-muted-foreground mb-1">{flight.totalDuration}</div>
                <div className="relative flex items-center">
                  <div className="h-px flex-1 bg-border" />
                  {flight.stops > 0 && (
                    <div className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-card" />
                  )}
                  <Plane className="h-4 w-4 text-primary mx-1 shrink-0" />
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="text-center mt-1">
                  <span className={cn(
                    "text-xs font-medium",
                    flight.stops === 0 ? "text-green-600" : "text-amber-600"
                  )}>
                    {flight.stops === 0 ? "Direct" : `${flight.stops} escale`}
                  </span>
                  {flight.stops > 0 && flight.layoverDuration && (
                    <span className="text-[10px] text-muted-foreground block">{flight.layoverDuration}</span>
                  )}
                </div>
              </div>
              
              {/* Arrival */}
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{lastOutbound.arrivalTime}</div>
                <div className="text-sm text-muted-foreground">{lastOutbound.arrivalAirport}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Price + Button row - SEPARATE from flight info */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div>
            <span className="text-3xl font-bold text-foreground">{flight.price}</span>
            <span className="text-lg text-muted-foreground ml-1">{flight.currency}</span>
            <span className="text-xs text-muted-foreground block">par personne</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(flight);
            }}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Sélectionner
          </button>
        </div>
      </div>
      
      {/* Expand/Collapse button */}
      <button
        onClick={onToggleExpand}
        className="w-full py-2.5 border-t border-border flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4" /> Masquer les détails
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" /> Voir les détails
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
                    <div className="bg-card rounded-xl p-4 border border-border">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-border shrink-0">
                          <img 
                            src={getAirlineLogo(segment.airlineCode)} 
                            alt={segment.airline}
                            className="w-6 h-6 object-contain"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-lg font-bold">{segment.departureTime}</div>
                              <div className="text-xs text-muted-foreground">{segment.departureAirport}</div>
                            </div>
                            
                            <div className="flex-1 flex items-center px-2">
                              <div className="h-px flex-1 bg-border" />
                              <Plane className="h-3 w-3 text-muted-foreground mx-2" />
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            
                            <div className="text-right">
                              <div className="text-lg font-bold">{segment.arrivalTime}</div>
                              <div className="text-xs text-muted-foreground">{segment.arrivalAirport}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0 pl-4 border-l border-border">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {segment.duration}
                          </div>
                          <div className="text-xs text-muted-foreground">{segment.flightNumber}</div>
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
                      <div className="bg-card rounded-xl p-4 border border-border">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-border shrink-0">
                            <img 
                              src={getAirlineLogo(segment.airlineCode)} 
                              alt={segment.airline}
                              className="w-6 h-6 object-contain"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="text-lg font-bold">{segment.departureTime}</div>
                                <div className="text-xs text-muted-foreground">{segment.departureAirport}</div>
                              </div>
                              
                              <div className="flex-1 flex items-center px-2">
                                <div className="h-px flex-1 bg-border" />
                                <Plane className="h-3 w-3 text-muted-foreground mx-2" />
                                <div className="h-px flex-1 bg-border" />
                              </div>
                              
                              <div className="text-right">
                                <div className="text-lg font-bold">{segment.arrivalTime}</div>
                                <div className="text-xs text-muted-foreground">{segment.arrivalAirport}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 pl-4 border-l border-border">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              {segment.duration}
                            </div>
                            <div className="text-xs text-muted-foreground">{segment.flightNumber}</div>
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
const FlightResults = ({ flights, isLoading, onSelect }: FlightResultsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (!isLoading && flights.length > 0) {
      setRevealedIds(new Set());
      flights.forEach((flight, index) => {
        setTimeout(() => {
          setRevealedIds(prev => new Set([...prev, flight.id]));
        }, index * 100);
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
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{flights.length}</span> vol{flights.length > 1 ? "s" : ""} trouvé{flights.length > 1 ? "s" : ""}
        </p>
      </div>
      
      {flights.map((flight) => (
        <FlightCard
          key={flight.id}
          flight={flight}
          onSelect={onSelect}
          isExpanded={expandedId === flight.id}
          onToggleExpand={() => setExpandedId(expandedId === flight.id ? null : flight.id)}
          isRevealed={revealedIds.has(flight.id)}
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