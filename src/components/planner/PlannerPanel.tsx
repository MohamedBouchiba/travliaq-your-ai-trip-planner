import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Users, Plane, MapPin, Building2, Star, Clock, Wifi, Car, Coffee, Wind, X, Heart, Utensils, TreePine, Palette, Waves, Dumbbell, Sparkles, Loader2, Search, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabType, SelectedAirport } from "@/pages/TravelPlanner";
import { Slider } from "@/components/ui/slider";
import PlannerCalendar from "./PlannerCalendar";
import FlightRouteBuilder, { FlightLeg } from "./FlightRouteBuilder";
import type { LocationResult } from "@/hooks/useLocationAutocomplete";
import { findNearestAirports, Airport } from "@/hooks/useNearestAirports";
import type { AirportChoice, DualAirportChoice } from "./PlannerChat";
import FlightResults, { FlightOffer, generateMockFlights } from "./FlightResults";
import { useFlightMemory, type AirportInfo } from "@/contexts/FlightMemoryContext";

export interface FlightRoutePoint {
  city: string;
  lat: number;
  lng: number;
}

export interface FlightFormData {
  from?: string;
  to?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  tripType?: "roundtrip" | "oneway" | "multi";
}

export interface CountrySelectionEvent {
  field: "from" | "to";
  country: LocationResult;
}

export interface UserLocation {
  lat: number;
  lng: number;
  city: string;
}

interface PlannerPanelProps {
  activeTab: TabType;
  onMapMove: (center: [number, number], zoom: number) => void;
  layout?: "sidebar" | "overlay";
  onClose?: () => void;
  isVisible?: boolean;
  onFlightRoutesChange?: (routes: FlightRoutePoint[]) => void;
  flightFormData?: FlightFormData | null;
  onFlightFormDataConsumed?: () => void;
  onCountrySelected?: (event: CountrySelectionEvent) => void;
  onAskAirportChoice?: (choice: AirportChoice) => void;
  onAskDualAirportChoice?: (choices: DualAirportChoice) => void;
  selectedAirport?: SelectedAirport | null;
  onSelectedAirportConsumed?: () => void;
  onUserLocationDetected?: (location: UserLocation) => void;
  onSearchReady?: (from: string, to: string) => void;
  triggerSearch?: boolean;
  onSearchTriggered?: () => void;
}

const tabLabels: Record<TabType, string> = {
  flights: "Vols",
  activities: "Activités",
  stays: "Hébergements",
  preferences: "Préférences",
};

const PlannerPanel = ({ activeTab, onMapMove, layout = "sidebar", onClose, isVisible = true, onFlightRoutesChange, flightFormData, onFlightFormDataConsumed, onCountrySelected, onAskAirportChoice, onAskDualAirportChoice, selectedAirport, onSelectedAirportConsumed, onUserLocationDetected, onSearchReady, triggerSearch, onSearchTriggered }: PlannerPanelProps) => {
  if (!isVisible && layout === "overlay") return null;

  const wrapperClass =
    layout === "overlay"
      ? "pointer-events-none absolute top-16 left-4 bottom-4 w-[380px] z-10"
      : "w-80 lg:w-96 border-l border-border bg-card overflow-y-auto themed-scroll shrink-0";

  const innerClass = layout === "overlay" ? "pointer-events-auto h-full overflow-y-auto themed-scroll" : "";

  return (
    <aside className={wrapperClass} aria-label="Panneau de filtres">
      <div className={cn(innerClass, layout === "overlay" && "rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg overflow-hidden")}>
        {/* Header with close button */}
        {layout === "overlay" && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <h2 className="font-medium text-foreground text-sm">{tabLabels[activeTab]}</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Fermer le panneau"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto themed-scroll p-4 max-h-[calc(100vh-8rem)]">
          {activeTab === "flights" && <FlightsPanel onMapMove={onMapMove} onFlightRoutesChange={onFlightRoutesChange} flightFormData={flightFormData} onFlightFormDataConsumed={onFlightFormDataConsumed} onCountrySelected={onCountrySelected} onAskAirportChoice={onAskAirportChoice} onAskDualAirportChoice={onAskDualAirportChoice} selectedAirport={selectedAirport} onSelectedAirportConsumed={onSelectedAirportConsumed} onUserLocationDetected={onUserLocationDetected} onSearchReady={onSearchReady} triggerSearch={triggerSearch} onSearchTriggered={onSearchTriggered} />}
          {activeTab === "activities" && <ActivitiesPanel />}
          {activeTab === "stays" && <StaysPanel />}
          {activeTab === "preferences" && <PreferencesPanel />}
        </div>
      </div>
    </aside>
  );
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <span className="text-sm font-medium text-foreground">{title}</span>
  </div>
);

// Chip Button Component
const ChipButton = ({ 
  children, 
  selected, 
  onClick 
}: { 
  children: React.ReactNode; 
  selected?: boolean; 
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
      selected
        ? "bg-primary text-primary-foreground shadow-sm"
        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    {children}
  </button>
);

// Passenger type
interface Passenger {
  id: string;
  type: "adult" | "child";
  personalItems: number;
  cabinBags: number;
  checkedBags: number;
}

// Flight options
interface FlightOptions {
  directOnly: boolean;
  flexibleDates: boolean;
  includeNearbyAirports: boolean;
  noEveningFlights: boolean;
}

// Flights Panel
const FlightsPanel = ({ onMapMove, onFlightRoutesChange, flightFormData, onFlightFormDataConsumed, onCountrySelected, onAskAirportChoice, onAskDualAirportChoice, selectedAirport, onSelectedAirportConsumed, onUserLocationDetected, onSearchReady, triggerSearch, onSearchTriggered }: { 
  onMapMove: (center: [number, number], zoom: number) => void;
  onFlightRoutesChange?: (routes: FlightRoutePoint[]) => void;
  flightFormData?: FlightFormData | null;
  onFlightFormDataConsumed?: () => void;
  onCountrySelected?: (event: CountrySelectionEvent) => void;
  onAskAirportChoice?: (choice: AirportChoice) => void;
  onAskDualAirportChoice?: (choices: DualAirportChoice) => void;
  selectedAirport?: SelectedAirport | null;
  onSelectedAirportConsumed?: () => void;
  onUserLocationDetected?: (location: UserLocation) => void;
  onSearchReady?: (from: string, to: string) => void;
  triggerSearch?: boolean;
  onSearchTriggered?: () => void;
}) => {
  const [tripType, setTripType] = useState<"roundtrip" | "oneway" | "multi">("roundtrip");
  const [isSearchingAirports, setIsSearchingAirports] = useState(false);
  const [isSearchingFlights, setIsSearchingFlights] = useState(false);
  const [flightResults, setFlightResults] = useState<FlightOffer[] | null>(null);
  const [legs, setLegs] = useState<FlightLeg[]>([
    { id: crypto.randomUUID(), from: "", to: "", date: undefined, returnDate: undefined },
  ]);
  const [passengers, setPassengers] = useState<Passenger[]>([
    { id: crypto.randomUUID(), type: "adult", personalItems: 1, cabinBags: 0, checkedBags: 0 },
  ]);
  const [travelClass, setTravelClass] = useState<"economy" | "business" | "first">("economy");
  const [options, setOptions] = useState<FlightOptions>({
    directOnly: false,
    flexibleDates: false,
    includeNearbyAirports: false,
    noEveningFlights: false,
  });

  // Access flight memory for synchronization
  const { updateMemory } = useFlightMemory();

  // Apply flight form data from chat AI
  useEffect(() => {
    if (!flightFormData) return;

    // Update trip type if specified
    if (flightFormData.tripType) {
      setTripType(flightFormData.tripType);
    } else if (flightFormData.returnDate) {
      setTripType("roundtrip");
    } else if (flightFormData.departureDate && !flightFormData.returnDate) {
      setTripType("oneway");
    }

    // Update legs with the extracted data
    setLegs((prev) => {
      const newLeg = { ...prev[0] };
      if (flightFormData.from) newLeg.from = flightFormData.from;
      if (flightFormData.to) newLeg.to = flightFormData.to;
      if (flightFormData.departureDate) newLeg.date = new Date(flightFormData.departureDate);
      if (flightFormData.returnDate) newLeg.returnDate = new Date(flightFormData.returnDate);
      return [newLeg];
    });

    // Update passengers if specified
    if (flightFormData.passengers && flightFormData.passengers > 0) {
      const newPassengers: Passenger[] = [];
      for (let i = 0; i < flightFormData.passengers; i++) {
        newPassengers.push({
          id: crypto.randomUUID(),
          type: "adult",
          personalItems: 1,
          cabinBags: 1,
          checkedBags: 0,
        });
      }
      setPassengers(newPassengers);
    }

    // Mark as consumed
    onFlightFormDataConsumed?.();
  }, [flightFormData, onFlightFormDataConsumed]);

  // Handle airport selection from chat
  useEffect(() => {
    if (!selectedAirport) return;
    
    const { field, airport } = selectedAirport;
    const airportDisplay = `${airport.name} (${airport.iata})`;
    
    setLegs((prev) => {
      const newLegs = [...prev];
      if (newLegs.length > 0) {
        if (field === "from") {
          newLegs[0] = { ...newLegs[0], from: airportDisplay };
        } else {
          newLegs[0] = { ...newLegs[0], to: airportDisplay };
        }
        
        // Check if both airports are now set after this update
        const newFrom = field === "from" ? airportDisplay : newLegs[0].from;
        const newTo = field === "to" ? airportDisplay : newLegs[0].to;
        const fromHasAirport = /\([A-Z]{3}\)/.test(newFrom || '');
        const toHasAirport = /\([A-Z]{3}\)/.test(newTo || '');
        
        if (fromHasAirport && toHasAirport) {
          // Defer to next tick to ensure state is updated
          setTimeout(() => onSearchReady?.(newFrom, newTo), 0);
        }
      }
      return newLegs;
    });
    
    onSelectedAirportConsumed?.();
  }, [selectedAirport, onSelectedAirportConsumed, onSearchReady]);

  // Detect user's city from IP on mount
  useEffect(() => {
    const detectUserCity = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.city && data.country_name && data.latitude && data.longitude) {
            const userCity = `${data.city}, ${data.country_name}`;
            
            // Create a location object with coordinates
            const userLocationData = {
              id: "user-location",
              name: data.city,
              type: "city" as const,
              country_code: data.country_code || "",
              country_name: data.country_name,
              lat: data.latitude,
              lng: data.longitude,
              display_name: userCity,
            };
            
            setLegs((prev) => {
              if (prev.length > 0 && !prev[0].from) {
                return prev.map((leg, idx) =>
                  idx === 0 ? { ...leg, from: userCity, fromLocation: userLocationData } : leg
                );
              }
              return prev;
            });
            
            // Notify parent with location coordinates for map marker
            onUserLocationDetected?.({
              lat: data.latitude,
              lng: data.longitude,
              city: userCity,
            });
          }
        }
      } catch {
        // Silently fail - user can enter city manually
      }
    };
    detectUserCity();
  }, [onUserLocationDetected]);

  // Search for airports for a city - returns airports list or null if only one (auto-selected)
  const getAirportsForCity = async (cityName: string): Promise<{ airports: Airport[]; cityName: string } | null> => {
    try {
      const result = await findNearestAirports(cityName, 3);
      if (!result || result.airports.length === 0) return null;
      
      return { airports: result.airports, cityName };
    } catch (error) {
      console.warn(`[FlightsPanel] Could not resolve airports for "${cityName}":`, error);
      return null;
    }
  };

  // Handle search button click - check for airports first
  const handleSearchClick = async () => {
    const firstLeg = legs[0];
    if (!firstLeg?.from?.trim() || !firstLeg?.to?.trim() || !firstLeg?.date) return;
    
    setIsSearchingAirports(true);
    
    try {
      // Check if "from" is a city (no IATA code in parentheses)
      const fromHasAirport = /\([A-Z]{3}\)/.test(firstLeg.from);
      const toHasAirport = /\([A-Z]{3}\)/.test(firstLeg.to);
      
      let updatedFrom = firstLeg.from;
      let updatedTo = firstLeg.to;
      
      // Collect airport choices needed
      let fromChoice: AirportChoice | undefined;
      let toChoice: AirportChoice | undefined;
      
      // Check both cities in parallel
      const [fromResult, toResult] = await Promise.all([
        !fromHasAirport ? getAirportsForCity(firstLeg.from.split(",")[0].trim()) : null,
        !toHasAirport ? getAirportsForCity(firstLeg.to.split(",")[0].trim()) : null,
      ]);
      
      // Process "from" result
      if (fromResult) {
        if (fromResult.airports.length === 1) {
          // Only one airport, auto-select it
          const airport = fromResult.airports[0];
          updatedFrom = `${airport.name} (${airport.iata})`;
          setLegs((prev) => prev.map((leg, idx) => 
            idx === 0 ? { ...leg, from: updatedFrom } : leg
          ));
        } else if (fromResult.airports.length > 1) {
          // Multiple airports, need user choice
          fromChoice = { field: "from", cityName: fromResult.cityName, airports: fromResult.airports };
        }
      }
      
      // Process "to" result
      if (toResult) {
        if (toResult.airports.length === 1) {
          // Only one airport, auto-select it
          const airport = toResult.airports[0];
          updatedTo = `${airport.name} (${airport.iata})`;
          setLegs((prev) => prev.map((leg, idx) => 
            idx === 0 ? { ...leg, to: updatedTo } : leg
          ));
        } else if (toResult.airports.length > 1) {
          // Multiple airports, need user choice
          toChoice = { field: "to", cityName: toResult.cityName, airports: toResult.airports };
        }
      }
      
      // If both need choices, use dual selection (one message)
      if (fromChoice && toChoice) {
        onAskDualAirportChoice?.({ from: fromChoice, to: toChoice });
        return; // Wait for user selection before searching
      }
      
      // If only one needs choice, use single selection
      if (fromChoice) {
        onAskAirportChoice?.(fromChoice);
        return;
      }
      if (toChoice) {
        onAskAirportChoice?.(toChoice);
        return;
      }
      
      // Proceed with search - both airports confirmed
      performFlightSearch(updatedFrom, updatedTo);
    } finally {
      setIsSearchingAirports(false);
    }
  };

  // Perform the actual flight search
  const performFlightSearch = (from: string, to: string) => {
    setIsSearchingFlights(true);
    
    // Simulate API call with mock data
    setTimeout(() => {
      const mockFlights = generateMockFlights(from, to);
      setFlightResults(mockFlights);
      setIsSearchingFlights(false);
    }, 1500);
  };

  // Handle triggered search from chat
  useEffect(() => {
    if (!triggerSearch) return;
    
    const firstLeg = legs[0];
    const fromHasAirport = /\([A-Z]{3}\)/.test(firstLeg?.from || '');
    const toHasAirport = /\([A-Z]{3}\)/.test(firstLeg?.to || '');
    
    if (fromHasAirport && toHasAirport) {
      performFlightSearch(firstLeg.from, firstLeg.to);
    }
    
    onSearchTriggered?.();
  }, [triggerSearch, legs, onSearchTriggered]);

  // Notify parent of route changes when legs change AND sync with memory
  const handleLegsChange = (newLegs: FlightLeg[]) => {
    setLegs(newLegs);

    // Sync with flight memory for map display
    const firstLeg = newLegs[0];
    if (firstLeg) {
      const memoryUpdate: Parameters<typeof updateMemory>[0] = {};
      
      // Sync departure
      if (firstLeg.fromLocation) {
        const loc = firstLeg.fromLocation;
        memoryUpdate.departure = {
          city: loc.type === 'airport' ? undefined : loc.name,
          airport: loc.type === 'airport' ? loc.name : undefined,
          iata: loc.iata,
          lat: loc.lat,
          lng: loc.lng,
          country: loc.country_name,
          countryCode: loc.country_code,
        };
      }
      
      // Sync arrival
      if (firstLeg.toLocation) {
        const loc = firstLeg.toLocation;
        memoryUpdate.arrival = {
          city: loc.type === 'airport' ? undefined : loc.name,
          airport: loc.type === 'airport' ? loc.name : undefined,
          iata: loc.iata,
          lat: loc.lat,
          lng: loc.lng,
          country: loc.country_name,
          countryCode: loc.country_code,
        };
      }
      
      // Sync dates
      if (firstLeg.date) {
        memoryUpdate.departureDate = firstLeg.date;
      }
      if (firstLeg.returnDate) {
        memoryUpdate.returnDate = firstLeg.returnDate;
      }
      
      // Only update if we have changes
      if (Object.keys(memoryUpdate).length > 0) {
        updateMemory(memoryUpdate);
      }
    }

    if (!onFlightRoutesChange) return;

    // Build route points using coordinates from location metadata
    const sequence: FlightRoutePoint[] = [];

    newLegs.forEach((leg, idx) => {
      const fromLoc = leg.fromLocation;
      const toLoc = leg.toLocation;

      // Add origin (only for first leg)
      if (idx === 0 && fromLoc && fromLoc.lat && fromLoc.lng) {
        sequence.push({ 
          city: leg.from || fromLoc.display_name, 
          lat: fromLoc.lat, 
          lng: fromLoc.lng 
        });
      }

      // Add destination
      if (toLoc && toLoc.lat && toLoc.lng) {
        sequence.push({ 
          city: leg.to || toLoc.display_name, 
          lat: toLoc.lat, 
          lng: toLoc.lng 
        });
      }
    });

    // Remove consecutive duplicates (same coordinates)
    const cleaned = sequence.filter((p, idx, arr) => {
      const prev = arr[idx - 1];
      return !prev || prev.lat !== p.lat || prev.lng !== p.lng;
    });

    onFlightRoutesChange(cleaned);
  };

  const addPassenger = () => {
    setPassengers([...passengers, { id: crypto.randomUUID(), type: "adult", personalItems: 1, cabinBags: 0, checkedBags: 0 }]);
  };

  const removePassenger = (id: string) => {
    if (passengers.length > 1) {
      setPassengers(passengers.filter(p => p.id !== id));
    }
  };

  const updatePassenger = (id: string, updates: Partial<Passenger>) => {
    setPassengers(passengers.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const toggleOption = (key: keyof FlightOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Determine max legs based on trip type
  const getMaxLegs = () => {
    if (tripType === "oneway") return 1;
    if (tripType === "roundtrip") return 1; // Only 1 leg for roundtrip (dates handle both ways)
    return 4; // multi-destinations (max 4)
  };

  // Count totals for display
  const totalAdults = passengers.filter(p => p.type === "adult").length;
  const totalChildren = passengers.filter(p => p.type === "child").length;

  // Reset legs when trip type changes
  const handleTripTypeChange = (newType: "roundtrip" | "oneway" | "multi") => {
    setTripType(newType);
    // Reset to single leg when switching from multi to other types
    if (newType !== "multi" && legs.length > 1) {
      setLegs([{ id: crypto.randomUUID(), from: legs[0]?.from || "", to: legs[0]?.to || "", date: legs[0]?.date, returnDate: legs[0]?.returnDate }]);
    }
  };

  // Show results view if we have results
  if (flightResults !== null || isSearchingFlights) {
    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setFlightResults(null)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Modifier la recherche
        </button>
        
        {/* Route summary */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{legs[0]?.from?.match(/\(([A-Z]{3})\)/)?.[1] || legs[0]?.from}</span>
            <ArrowLeft className="h-3 w-3 rotate-180 text-muted-foreground" />
            <span className="font-medium">{legs[0]?.to?.match(/\(([A-Z]{3})\)/)?.[1] || legs[0]?.to}</span>
          </div>
        </div>
        
        {/* Results */}
        <FlightResults 
          flights={flightResults || []} 
          isLoading={isSearchingFlights}
          onSelect={(flight) => console.log("Selected flight:", flight)}
          travelers={passengers.length}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Trip Type Toggle - Centered */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/30">
          <button
            onClick={() => handleTripTypeChange("roundtrip")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tripType === "roundtrip"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Aller-retour
          </button>
          <button
            onClick={() => handleTripTypeChange("oneway")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tripType === "oneway"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Aller simple
          </button>
          <button
            onClick={() => handleTripTypeChange("multi")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tripType === "multi"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            Multi-destinations
          </button>
        </div>
      </div>

      {/* Route Builder */}
      <FlightRouteBuilder
        legs={legs}
        onLegsChange={handleLegsChange}
        maxLegs={getMaxLegs()}
        tripType={tripType}
        onCountrySelected={(field, country) => onCountrySelected?.({ field, country })}
      />

      {/* Passengers & Baggage Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Passagers & Bagages</span>
          <button
            onClick={addPassenger}
            className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
          >
            + Ajouter
          </button>
        </div>
        
        {/* Passenger rows */}
        <div className="space-y-1.5">
          {passengers.map((passenger, index) => (
            <div 
              key={passenger.id}
              className="flex items-center px-2 py-1.5 rounded-xl bg-muted/20 border border-border/30 hover:border-border/50 transition-colors"
            >
              {/* Type selector */}
              <div className="flex items-center gap-1.5 shrink-0 mr-3">
                <span className="text-sm">{passenger.type === "adult" ? "👤" : "👶"}</span>
                <select
                  value={passenger.type}
                  onChange={(e) => updatePassenger(passenger.id, { type: e.target.value as "adult" | "child" })}
                  className="text-[11px] bg-transparent border-none text-foreground focus:outline-none cursor-pointer font-medium"
                >
                  <option value="adult">Adulte</option>
                  <option value="child">Enfant</option>
                </select>
              </div>

              {/* Baggage controls */}
              <div className="flex items-center gap-1.5 flex-1">
                {/* Cabin bags */}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-[10px]">🧳</span>
                  <span className="text-[9px] text-muted-foreground">Cabine</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { cabinBags: Math.max(0, passenger.cabinBags - 1) })}
                    className="w-4 h-4 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-[10px] font-medium transition-colors ml-0.5"
                  >
                    −
                  </button>
                  <span className="text-[10px] w-3 text-center font-medium">{passenger.cabinBags}</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { cabinBags: Math.min(2, passenger.cabinBags + 1) })}
                    className="w-4 h-4 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-[10px] font-medium transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Checked bags */}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-[10px]">🛄</span>
                  <span className="text-[9px] text-muted-foreground">Soute</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { checkedBags: Math.max(0, passenger.checkedBags - 1) })}
                    className="w-4 h-4 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-[10px] font-medium transition-colors ml-0.5"
                  >
                    −
                  </button>
                  <span className="text-[10px] w-3 text-center font-medium">{passenger.checkedBags}</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { checkedBags: passenger.checkedBags + 1 })}
                    className="w-4 h-4 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-[10px] font-medium transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Remove button - always visible when multiple passengers */}
              {passengers.length > 1 && (
                <button
                  onClick={() => removePassenger(passenger.id)}
                  className="ml-1 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Class Selection */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground">Classe</span>
        <div className="flex gap-2">
          {[
            { id: "economy", label: "Économique" },
            { id: "business", label: "Affaires" },
            { id: "first", label: "Première" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setTravelClass(c.id as typeof travelClass)}
              className={cn(
                "flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all text-center",
                travelClass === c.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options Section */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground">Options</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: "directOnly" as const, label: "Vols directs", icon: "✈️" },
            { key: "flexibleDates" as const, label: "Dates flexibles", icon: "📅" },
            { key: "includeNearbyAirports" as const, label: "Aéroports proches", icon: "📍" },
            { key: "noEveningFlights" as const, label: "Pas de vol le soir", icon: "🌙" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleOption(opt.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all",
                options[opt.key]
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/20 text-muted-foreground border border-border/30 hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <span>{opt.icon}</span>
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Button */}
      <div className="pt-3">
        {(() => {
          const firstLeg = legs[0];
          const hasFrom = firstLeg?.from?.trim();
          const hasTo = firstLeg?.to?.trim();
          const hasDate = firstLeg?.date;
          const isComplete = hasFrom && hasTo && hasDate;
          const missingFields: string[] = [];
          if (!hasFrom) missingFields.push("départ");
          if (!hasTo) missingFields.push("destination");
          if (!hasDate) missingFields.push("date");

          return (
            <>
              <button
                onClick={handleSearchClick}
                disabled={!isComplete || isSearchingAirports}
                className={cn(
                  "w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2",
                  isComplete && !isSearchingAirports
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSearchingAirports ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Vérification des aéroports...
                  </>
                ) : (
                  <>
                    <Plane className="h-4 w-4" />
                    Rechercher des vols
                  </>
                )}
              </button>
              {!isComplete && missingFields.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Complète : {missingFields.join(", ")}
                </p>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

// Activities Panel
const ActivitiesPanel = () => {
  const [budgetRange, setBudgetRange] = useState([0, 150]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["culture"]);
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);

  const types = [
    { id: "culture", label: "Culture", icon: Palette },
    { id: "outdoor", label: "Nature", icon: TreePine },
    { id: "food", label: "Gastronomie", icon: Utensils },
    { id: "wellness", label: "Bien-être", icon: Sparkles },
  ];

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const suggestions = [
    { title: "Tour Eiffel", duration: "2h", price: 28, rating: 4.8, image: "🗼" },
    { title: "Croisière Seine", duration: "1h30", price: 15, rating: 4.6, image: "🚢" },
    { title: "Montmartre", duration: "3h", price: 0, rating: 4.7, image: "🎨" },
  ];

  return (
    <div className="space-y-5">
      {/* Types */}
      <div>
        <SectionHeader icon={MapPin} title="Type d'activité" />
        <div className="grid grid-cols-2 gap-2">
          {types.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={cn(
                  "p-3 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div>
        <SectionHeader icon={Clock} title="Durée" />
        <div className="flex gap-1.5">
          {[
            { id: "short", label: "< 2h" },
            { id: "medium", label: "2-4h" },
            { id: "long", label: "> 4h" },
          ].map((d) => (
            <ChipButton
              key={d.id}
              selected={selectedDuration === d.id}
              onClick={() => setSelectedDuration(selectedDuration === d.id ? null : d.id)}
            >
              {d.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Star} title="Budget" />
          <span className="text-xs text-primary font-medium">
            {budgetRange[0]}€ - {budgetRange[1]}€
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={budgetRange}
            onValueChange={setBudgetRange}
            max={200}
            step={10}
            className="w-full"
          />
        </div>
      </div>

      {/* Suggestions */}
      <div className="pt-3 border-t border-border/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suggestions</span>
        <div className="mt-3 space-y-2">
          {suggestions.map((item) => (
            <div
              key={item.title}
              className="p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer border border-border/20 group"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground">{item.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.duration}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium text-primary">
                      {item.price === 0 ? "Gratuit" : `${item.price}€`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {item.rating}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Stays Panel
const StaysPanel = () => {
  const [priceRange, setPriceRange] = useState([50, 250]);
  const [rating, setRating] = useState<number | null>(4);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["hotel"]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const stayTypes = [
    { id: "hotel", label: "Hôtel", icon: Building2 },
    { id: "apartment", label: "Appartement", icon: Building2 },
    { id: "hostel", label: "Auberge", icon: Building2 },
  ];

  const amenities = [
    { id: "wifi", label: "WiFi", icon: Wifi },
    { id: "parking", label: "Parking", icon: Car },
    { id: "breakfast", label: "Petit-déj", icon: Coffee },
    { id: "ac", label: "Clim", icon: Wind },
  ];

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Building2} title="Budget / nuit" />
          <span className="text-xs text-primary font-medium">
            {priceRange[0]}€ - {priceRange[1]}€
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            max={500}
            step={25}
            className="w-full"
          />
        </div>
      </div>

      {/* Rating */}
      <div>
        <SectionHeader icon={Star} title="Note minimum" />
        <div className="flex gap-1.5">
          {[3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setRating(rating === r ? null : r)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1",
                rating === r
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
              )}
            >
              <Star className={cn("h-3 w-3", rating === r ? "fill-primary" : "")} />
              {r}+
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <SectionHeader icon={Building2} title="Type" />
        <div className="flex gap-1.5 flex-wrap">
          {stayTypes.map((type) => (
            <ChipButton
              key={type.id}
              selected={selectedTypes.includes(type.id)}
              onClick={() => toggleType(type.id)}
            >
              {type.label}
            </ChipButton>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <SectionHeader icon={Sparkles} title="Équipements" />
        <div className="grid grid-cols-2 gap-2">
          {amenities.map((amenity) => {
            const Icon = amenity.icon;
            const isSelected = selectedAmenities.includes(amenity.id);
            return (
              <button
                key={amenity.id}
                onClick={() => toggleAmenity(amenity.id)}
                className={cn(
                  "p-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {amenity.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Preferences Panel
const PreferencesPanel = () => {
  const [pace, setPace] = useState<"relaxed" | "moderate" | "intense">("moderate");
  const [budgetLevel, setBudgetLevel] = useState(50);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["culture", "food"]);
  const [travelStyle, setTravelStyle] = useState<string>("couple");

  const interests = [
    { id: "culture", label: "Culture", icon: Palette },
    { id: "nature", label: "Nature", icon: TreePine },
    { id: "food", label: "Gastronomie", icon: Utensils },
    { id: "beach", label: "Plage", icon: Waves },
    { id: "wellness", label: "Bien-être", icon: Heart },
    { id: "sport", label: "Sport", icon: Dumbbell },
  ];

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-5">
      {/* Pace */}
      <div>
        <SectionHeader icon={Clock} title="Rythme de voyage" />
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "relaxed", label: "Détente", emoji: "🧘" },
            { id: "moderate", label: "Modéré", emoji: "🚶" },
            { id: "intense", label: "Intensif", emoji: "🏃" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPace(p.id as typeof pace)}
              className={cn(
                "py-3 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1.5",
                pace === p.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
              )}
            >
              <span className="text-lg">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget Sensitivity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeader icon={Star} title="Niveau de confort" />
          <span className="text-xs text-muted-foreground">
            {budgetLevel < 33 ? "Économique" : budgetLevel < 66 ? "Confort" : "Premium"}
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={[budgetLevel]}
            onValueChange={([v]) => setBudgetLevel(v)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {/* Interests */}
      <div>
        <SectionHeader icon={Heart} title="Centres d'intérêt" />
        <div className="grid grid-cols-3 gap-2">
          {interests.map((interest) => {
            const Icon = interest.icon;
            const isSelected = selectedInterests.includes(interest.id);
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-1.5",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {interest.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Travel Style */}
      <div>
        <SectionHeader icon={Users} title="Style de voyage" />
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "solo", label: "Solo", emoji: "🧑" },
            { id: "couple", label: "Couple", emoji: "💑" },
            { id: "family", label: "Famille", emoji: "👨‍👩‍👧" },
            { id: "friends", label: "Amis", emoji: "👯" },
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => setTravelStyle(style.id)}
              className={cn(
                "py-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2",
                travelStyle === style.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
              )}
            >
              <span>{style.emoji}</span>
              {style.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlannerPanel;
