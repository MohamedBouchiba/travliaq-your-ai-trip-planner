import { useState } from "react";
import { Plane, ChevronDown, ChevronUp, Luggage, Star, Zap, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  seatsLeft?: number;
  isBestPrice?: boolean;
  isFastest?: boolean;
  hasNightLayover?: boolean;
}

interface FlightResultsProps {
  flights: FlightOffer[];
  isLoading?: boolean;
  onSelect?: (flight: FlightOffer) => void;
}

// Airline logos mapping
const getAirlineLogo = (code: string) => {
  return `https://images.kiwi.com/airlines/64/${code}.png`;
};

// Single flight segment display (compact)
const FlightSegmentCard = ({ segment }: { segment: FlightSegment }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm border border-border/20">
      <img 
        src={getAirlineLogo(segment.airlineCode)} 
        alt={segment.airline}
        className="w-5 h-5 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling?.classList.remove('hidden');
        }}
      />
      <span className="hidden text-[10px] font-bold text-muted-foreground">{segment.airlineCode}</span>
    </div>
    
    <div className="flex items-center gap-2 flex-1">
      <span className="text-sm font-semibold">{segment.departureTime}</span>
      <span className="text-xs text-muted-foreground">{segment.departureAirport}</span>
    </div>
    
    <Plane className="h-3 w-3 text-primary shrink-0" />
    
    <div className="flex items-center gap-2 flex-1 justify-end">
      <span className="text-xs text-muted-foreground">{segment.arrivalAirport}</span>
      <span className="text-sm font-semibold">{segment.arrivalTime}</span>
    </div>
    
    <div className="text-right min-w-[60px]">
      <span className="text-xs text-muted-foreground">{segment.duration}</span>
      <span className="block text-[10px] text-muted-foreground/70">{segment.flightNumber}</span>
    </div>
  </div>
);

// Flight card component - COMPACT
const FlightCard = ({ 
  flight, 
  onSelect,
  isExpanded,
  onToggleExpand,
  index
}: { 
  flight: FlightOffer; 
  onSelect?: (flight: FlightOffer) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  index: number;
}) => {
  const mainSegment = flight.outbound[0];
  const lastOutbound = flight.outbound[flight.outbound.length - 1];
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className={cn(
        "relative bg-card border border-border/50 rounded-xl overflow-hidden transition-all duration-200",
        "hover:border-primary/30 hover:shadow-md",
        isExpanded && "border-primary/50 shadow-md"
      )}
    >
      {/* Badges - top left */}
      <div className="absolute top-2 left-2 flex gap-1 z-10">
        {flight.isBestPrice && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-600 text-[10px] font-semibold">
            <Star className="h-2.5 w-2.5" /> Meilleur prix
          </span>
        )}
        {flight.isFastest && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 text-[10px] font-semibold">
            <Zap className="h-2.5 w-2.5" /> Plus rapide
          </span>
        )}
        {flight.hasNightLayover && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 text-[10px] font-semibold">
            <Moon className="h-2.5 w-2.5" /> Escale de nuit
          </span>
        )}
      </div>
      
      {/* Main content - compact layout */}
      <div className="p-3 pt-8">
        <div className="flex items-center gap-3">
          {/* Airline logo + name */}
          <div className="flex items-center gap-2 min-w-[90px]">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm border border-border/20 shrink-0">
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
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{mainSegment.airline}</div>
              <div className="text-[10px] text-muted-foreground">{flight.cabinClass}</div>
            </div>
          </div>
          
          {/* Flight times - compact */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {/* Departure */}
            <div className="text-center">
              <div className="text-base font-bold text-foreground leading-tight">{mainSegment.departureTime}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{mainSegment.departureAirport}</div>
            </div>
            
            {/* Flight line */}
            <div className="flex-1 max-w-[120px] flex flex-col items-center">
              <div className="text-[10px] text-muted-foreground">{flight.totalDuration}</div>
              <div className="w-full h-px bg-gradient-to-r from-muted-foreground/20 via-primary/60 to-muted-foreground/20 my-0.5" />
              <div className={cn(
                "text-[10px] font-medium",
                flight.stops === 0 ? "text-green-600" : "text-muted-foreground"
              )}>
                {flight.stops === 0 ? "Direct" : `${flight.stops} escale`}
              </div>
            </div>
            
            {/* Arrival */}
            <div className="text-center">
              <div className="text-base font-bold text-foreground leading-tight">{lastOutbound.arrivalTime}</div>
              <div className="text-[10px] text-muted-foreground font-medium">{lastOutbound.arrivalAirport}</div>
            </div>
          </div>
          
          {/* Price + Select button */}
          <div className="flex items-center gap-3 min-w-[140px] justify-end">
            <div className="text-right">
              <div className="text-xl font-bold text-foreground leading-tight">
                {flight.price}<span className="text-sm ml-0.5">{flight.currency}</span>
              </div>
              {flight.seatsLeft && flight.seatsLeft <= 5 && (
                <span className="text-[9px] text-destructive font-medium">
                  {flight.seatsLeft} place{flight.seatsLeft > 1 ? "s" : ""} restante{flight.seatsLeft > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              onClick={() => onSelect?.(flight)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
            >
              Sélectionner
            </button>
          </div>
        </div>
        
        {/* Expand button */}
        <button
          onClick={onToggleExpand}
          className="mt-2 flex items-center justify-center gap-1 w-full py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Masquer les détails
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Voir les détails
            </>
          )}
        </button>
      </div>
      
      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 bg-muted/30 px-3 py-2.5 space-y-3">
              {/* Outbound */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                  <Plane className="h-3 w-3" /> Vol aller
                </div>
                <div className="space-y-0.5 divide-y divide-border/30">
                  {flight.outbound.map((segment, idx) => (
                    <FlightSegmentCard key={idx} segment={segment} />
                  ))}
                </div>
              </div>
              
              {/* Inbound */}
              {flight.inbound && flight.inbound.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                    <Plane className="h-3 w-3 rotate-180" /> Vol retour
                  </div>
                  <div className="space-y-0.5 divide-y divide-border/30">
                    {flight.inbound.map((segment, idx) => (
                      <FlightSegmentCard key={idx} segment={segment} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Baggage info */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-border/30">
                <Luggage className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Bagage cabine inclus</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Loading skeleton
const FlightSkeleton = () => (
  <div className="bg-card border border-border/50 rounded-xl p-3 pt-8 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted" />
      <div className="space-y-1.5 min-w-[70px]">
        <div className="h-3 bg-muted rounded w-16" />
        <div className="h-2 bg-muted rounded w-12" />
      </div>
      <div className="flex-1 flex justify-center gap-3">
        <div className="h-5 bg-muted rounded w-12" />
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-5 bg-muted rounded w-12" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 bg-muted rounded w-14" />
        <div className="h-7 bg-muted rounded w-20" />
      </div>
    </div>
  </div>
);

// Main component
const FlightResults = ({ flights, isLoading, onSelect }: FlightResultsProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <FlightSkeleton />
        <FlightSkeleton />
        <FlightSkeleton />
      </div>
    );
  }
  
  if (flights.length === 0) {
    return (
      <div className="text-center py-8">
        <Plane className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Aucun vol trouvé pour ces critères</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {/* Results header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{flights.length}</span> vol{flights.length > 1 ? "s" : ""} trouvé{flights.length > 1 ? "s" : ""}
        </p>
      </div>
      
      {/* Flight cards */}
      {flights.map((flight, index) => (
        <FlightCard
          key={flight.id}
          flight={flight}
          onSelect={onSelect}
          isExpanded={expandedId === flight.id}
          onToggleExpand={() => setExpandedId(expandedId === flight.id ? null : flight.id)}
          index={index}
        />
      ))}
    </div>
  );
};

export default FlightResults;

// Mock flight data generator for testing
export const generateMockFlights = (from: string, to: string): FlightOffer[] => {
  const airlines = [
    { name: "Air France", code: "AF" },
    { name: "Lufthansa", code: "LH" },
    { name: "British Airways", code: "BA" },
    { name: "KLM", code: "KL" },
    { name: "Vueling", code: "VY" },
    { name: "Ryanair", code: "FR" },
  ];
  
  const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from.substring(0, 3).toUpperCase();
  const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to.substring(0, 3).toUpperCase();
  
  const flights: FlightOffer[] = [];
  
  // Generate 5 mock flights
  for (let i = 0; i < 5; i++) {
    const airline = airlines[i % airlines.length];
    const price = Math.floor(Math.random() * 300) + 80;
    const departHour = 6 + Math.floor(Math.random() * 14);
    const durationHours = 1 + Math.floor(Math.random() * 4);
    const durationMins = Math.floor(Math.random() * 50);
    const hasReturn = Math.random() > 0.3;
    const stops = Math.random() > 0.6 ? 1 : 0;
    const hasNightLayover = stops > 0 && Math.random() > 0.5;
    
    const formatTime = (h: number, m: number) => {
      const hour = h % 24;
      return `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    
    const depMins = Math.floor(Math.random() * 6) * 10;
    const arrMins = Math.floor(Math.random() * 6) * 10;
    
    flights.push({
      id: `flight-${i}`,
      price,
      currency: "€",
      stops,
      totalDuration: `${durationHours}h${durationMins > 0 ? durationMins : ''}`,
      cabinClass: "Économique",
      seatsLeft: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : undefined,
      isBestPrice: i === 0,
      isFastest: i === 1,
      hasNightLayover,
      outbound: [
        {
          departureTime: formatTime(departHour, depMins),
          arrivalTime: formatTime(departHour + durationHours, arrMins),
          departureAirport: fromCode,
          arrivalAirport: toCode,
          duration: `${durationHours}h${durationMins > 0 ? durationMins : ''}`,
          airline: airline.name,
          airlineCode: airline.code,
          flightNumber: `${airline.code}${Math.floor(Math.random() * 9000) + 1000}`,
        },
      ],
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
  
  // Sort by price
  return flights.sort((a, b) => a.price - b.price);
};
