import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Users, Plane, MapPin, Building2, Star, Clock, Wifi, Car, Coffee, Wind, X, Heart, Utensils, TreePine, Palette, Waves, Dumbbell, Sparkles, Loader2, Search, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabType, SelectedAirport } from "@/pages/TravelPlanner";
import { Slider } from "@/components/ui/slider";
import PlannerCalendar from "./PlannerCalendar";
import FlightRouteBuilder, { FlightLeg } from "./FlightRouteBuilder";
import type { LocationResult } from "@/hooks/useLocationAutocomplete";
import { findNearestAirports, Airport } from "@/hooks/useNearestAirports";
import type { AirportChoice, DualAirportChoice, AirportConfirmationData, ConfirmedAirports } from "./PlannerChat";
import FlightResults, { FlightOffer, generateMockFlights } from "./FlightResults";
import { useFlightMemory, type AirportInfo } from "@/contexts/FlightMemoryContext";
import AccommodationPanel from "./AccommodationPanel";

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
  onAskAirportConfirmation?: (data: AirportConfirmationData) => void;
  selectedAirport?: SelectedAirport | null;
  onSelectedAirportConsumed?: () => void;
  onUserLocationDetected?: (location: UserLocation) => void;
  onSearchReady?: (from: string, to: string) => void;
  triggerSearch?: boolean;
  onSearchTriggered?: () => void;
  confirmedMultiAirports?: ConfirmedAirports | null;
  onConfirmedMultiAirportsConsumed?: () => void;
}

const tabLabels: Record<TabType, string> = {
  flights: "Vols",
  activities: "Activités",
  stays: "Hébergements",
  preferences: "Préférences",
};

const PlannerPanel = ({ activeTab, onMapMove, layout = "sidebar", onClose, isVisible = true, onFlightRoutesChange, flightFormData, onFlightFormDataConsumed, onCountrySelected, onAskAirportChoice, onAskDualAirportChoice, onAskAirportConfirmation, selectedAirport, onSelectedAirportConsumed, onUserLocationDetected, onSearchReady, triggerSearch, onSearchTriggered, confirmedMultiAirports, onConfirmedMultiAirportsConsumed }: PlannerPanelProps) => {
  if (!isVisible && layout === "overlay") return null;

  const wrapperClass =
    layout === "overlay"
      ? "pointer-events-none absolute top-16 left-4 bottom-4 w-[320px] sm:w-[360px] md:w-[400px] lg:w-[420px] xl:w-[480px] 2xl:w-[540px] z-10"
      : "w-80 sm:w-96 lg:w-[480px] xl:w-[520px] 2xl:w-[600px] border-l border-border bg-card overflow-y-auto themed-scroll shrink-0";

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
          <div style={{ display: activeTab === "flights" ? "block" : "none" }}>
            <FlightsPanel onMapMove={onMapMove} onFlightRoutesChange={onFlightRoutesChange} flightFormData={flightFormData} onFlightFormDataConsumed={onFlightFormDataConsumed} onCountrySelected={onCountrySelected} onAskAirportChoice={onAskAirportChoice} onAskDualAirportChoice={onAskDualAirportChoice} onAskAirportConfirmation={onAskAirportConfirmation} selectedAirport={selectedAirport} onSelectedAirportConsumed={onSelectedAirportConsumed} onUserLocationDetected={onUserLocationDetected} onSearchReady={onSearchReady} triggerSearch={triggerSearch} onSearchTriggered={onSearchTriggered} confirmedMultiAirports={confirmedMultiAirports} onConfirmedMultiAirportsConsumed={onConfirmedMultiAirportsConsumed} />
          </div>
          <div style={{ display: activeTab === "activities" ? "block" : "none" }}>
            <ActivitiesPanel />
          </div>
          <div style={{ display: activeTab === "stays" ? "block" : "none" }}>
            <AccommodationPanel onMapMove={onMapMove} />
          </div>
          <div style={{ display: activeTab === "preferences" ? "block" : "none" }}>
            <PreferencesPanel />
          </div>
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
const FlightsPanel = ({ onMapMove, onFlightRoutesChange, flightFormData, onFlightFormDataConsumed, onCountrySelected, onAskAirportChoice, onAskDualAirportChoice, onAskAirportConfirmation, selectedAirport, onSelectedAirportConsumed, onUserLocationDetected, onSearchReady, triggerSearch, onSearchTriggered, confirmedMultiAirports, onConfirmedMultiAirportsConsumed }: { 
  onMapMove: (center: [number, number], zoom: number) => void;
  onFlightRoutesChange?: (routes: FlightRoutePoint[]) => void;
  flightFormData?: FlightFormData | null;
  onFlightFormDataConsumed?: () => void;
  onCountrySelected?: (event: CountrySelectionEvent) => void;
  onAskAirportChoice?: (choice: AirportChoice) => void;
  onAskDualAirportChoice?: (choices: DualAirportChoice) => void;
  onAskAirportConfirmation?: (data: AirportConfirmationData) => void;
  selectedAirport?: SelectedAirport | null;
  onSelectedAirportConsumed?: () => void;
  onUserLocationDetected?: (location: UserLocation) => void;
  onSearchReady?: (from: string, to: string) => void;
  triggerSearch?: boolean;
  onSearchTriggered?: () => void;
  confirmedMultiAirports?: ConfirmedAirports | null;
  onConfirmedMultiAirportsConsumed?: () => void;
}) => {
  // Access flight memory for synchronization
  const { memory, updateMemory } = useFlightMemory();
  
  // Initialize tripType from memory
  const [tripType, setTripTypeLocal] = useState<"roundtrip" | "oneway" | "multi">(memory.tripType);
  const [isSearchingAirports, setIsSearchingAirports] = useState(false);
  const [isSearchingFlights, setIsSearchingFlights] = useState(false);
  const [flightResults, setFlightResults] = useState<FlightOffer[] | null>(null);
  
  // Multi-destination: store results for ALL legs, viewing state, and selected flights
  const [allLegResults, setAllLegResults] = useState<Record<number, FlightOffer[]>>({});
  const [viewingLegIndex, setViewingLegIndex] = useState<number>(0); // Which leg results to view in dropdown
  const [selectedFlights, setSelectedFlights] = useState<Record<number, FlightOffer>>({}); // User's chosen flights per leg
  const [isMultiSearching, setIsMultiSearching] = useState(false); // Searching all legs in parallel
  
  // Initialize legs from memory
  const [legs, setLegs] = useState<FlightLeg[]>(() => {
    if (memory.tripType === "multi" && memory.legs.length > 0) {
      return memory.legs.map(leg => ({
        id: leg.id,
        from: leg.departure?.airport 
          ? `${leg.departure.airport} (${leg.departure.iata})` 
          : leg.departure?.city || "",
        to: leg.arrival?.airport 
          ? `${leg.arrival.airport} (${leg.arrival.iata})` 
          : leg.arrival?.city || "",
        date: leg.date || undefined,
      }));
    }
    
    const fromDisplay = memory.departure?.airport 
      ? `${memory.departure.airport} (${memory.departure.iata})` 
      : memory.departure?.city || "";
    const toDisplay = memory.arrival?.airport 
      ? `${memory.arrival.airport} (${memory.arrival.iata})` 
      : memory.arrival?.city || "";
    
    return [{
      id: crypto.randomUUID(),
      from: fromDisplay,
      to: toDisplay,
      date: memory.departureDate || undefined,
      returnDate: memory.returnDate || undefined,
    }];
  });
  
  const [passengers, setPassengers] = useState<Passenger[]>(() => {
    const passengersArray: Passenger[] = [];
    for (let i = 0; i < memory.passengers.adults; i++) {
      passengersArray.push({ id: crypto.randomUUID(), type: "adult", personalItems: 1, cabinBags: 0, checkedBags: 0 });
    }
    for (let i = 0; i < memory.passengers.children; i++) {
      passengersArray.push({ id: crypto.randomUUID(), type: "child", personalItems: 1, cabinBags: 0, checkedBags: 0 });
    }
    return passengersArray.length > 0 ? passengersArray : [
      { id: crypto.randomUUID(), type: "adult", personalItems: 1, cabinBags: 0, checkedBags: 0 },
    ];
  });
  
  const [travelClass, setTravelClass] = useState<"economy" | "business" | "first">(
    memory.cabinClass === "premium_economy" ? "economy" : memory.cabinClass === "first" ? "first" : memory.cabinClass as "economy" | "business"
  );
  const [options, setOptions] = useState<FlightOptions>({
    directOnly: memory.directOnly,
    flexibleDates: memory.flexibleDates,
    includeNearbyAirports: false,
    noEveningFlights: false,
  });

  // Helpers to convert FlightMemory → widget legs
  const memoryLegsToWidgetLegs = (memLegs: typeof memory.legs): FlightLeg[] => {
    return memLegs.map((leg) => ({
      id: leg.id,
      from: leg.departure?.airport
        ? `${leg.departure.airport} (${leg.departure.iata})`
        : leg.departure?.city || "",
      to: leg.arrival?.airport
        ? `${leg.arrival.airport} (${leg.arrival.iata})`
        : leg.arrival?.city || "",
      date: leg.date || undefined,
      fromLocation: leg.departure
        ? {
            id: leg.departure.iata || leg.departure.city || "departure",
            name: leg.departure.airport || leg.departure.city || "",
            type: leg.departure.iata ? "airport" : "city",
            country_code: leg.departure.countryCode || "",
            country_name: leg.departure.country || "",
            iata: leg.departure.iata,
            lat: leg.departure.lat || 0,
            lng: leg.departure.lng || 0,
            display_name: leg.departure.iata
              ? `${leg.departure.airport || leg.departure.city} (${leg.departure.iata})`
              : leg.departure.city || "",
          }
        : undefined,
      toLocation: leg.arrival
        ? {
            id: leg.arrival.iata || leg.arrival.city || "arrival",
            name: leg.arrival.airport || leg.arrival.city || "",
            type: leg.arrival.iata ? "airport" : "city",
            country_code: leg.arrival.countryCode || "",
            country_name: leg.arrival.country || "",
            iata: leg.arrival.iata,
            lat: leg.arrival.lat || 0,
            lng: leg.arrival.lng || 0,
            display_name: leg.arrival.iata
              ? `${leg.arrival.airport || leg.arrival.city} (${leg.arrival.iata})`
              : leg.arrival.city || "",
          }
        : undefined,
    }));
  };

  // Sync tripType with memory when changing
  const setTripType = (newType: "roundtrip" | "oneway" | "multi") => {
    setTripTypeLocal(newType);
    updateMemory({ tripType: newType });
  };

  const prevTripTypeRef = useRef<typeof memory.tripType>(memory.tripType);

  // Sync with memory when it changes externally + rehydrate legs on trip type switch
  useEffect(() => {
    const prevTripType = prevTripTypeRef.current;
    if (memory.tripType !== tripType) {
      setTripTypeLocal(memory.tripType);
    }

    // Only rehydrate legs when the trip type actually changed
    if (prevTripType !== memory.tripType) {
      if (memory.tripType === "multi") {
        // Restore full multi legs from memory (this is what was missing)
        if (memory.legs.length > 0) {
          setLegs(memoryLegsToWidgetLegs(memory.legs));
        } else {
          // Empty multi: keep 2 placeholders
          setLegs([
            { id: crypto.randomUUID(), from: "", to: "", date: undefined },
            { id: crypto.randomUUID(), from: "", to: "", date: undefined },
          ]);
        }
      } else {
        // Restore single-leg UI from memory
        const fromDisplay = memory.departure?.airport
          ? `${memory.departure.airport} (${memory.departure.iata})`
          : memory.departure?.city || "";
        const toDisplay = memory.arrival?.airport
          ? `${memory.arrival.airport} (${memory.arrival.iata})`
          : memory.arrival?.city || "";

        setLegs([
          {
            id: crypto.randomUUID(),
            from: fromDisplay,
            to: toDisplay,
            date: memory.departureDate || undefined,
            returnDate: memory.tripType === "roundtrip" ? memory.returnDate || undefined : undefined,
          },
        ]);
      }

      prevTripTypeRef.current = memory.tripType;
    }
  }, [memory.tripType, memory.legs, memory.departure, memory.arrival, memory.departureDate, memory.returnDate, tripType]);
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

  // Detect user's city from IP on mount and add to memory
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
            
            // Add to flight memory as departure point
            updateMemory({
              departure: {
                city: data.city,
                country: data.country_name,
                countryCode: data.country_code,
                lat: data.latitude,
                lng: data.longitude,
              },
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
  }, [onUserLocationDetected, updateMemory]);

  // Track what we last wrote into the widget from memory, to avoid overriding manual typing
  const lastSyncedRef = useRef<{ from?: string; to?: string }>({});

  // Sync memory → widget legs when memory is updated from chat
  useEffect(() => {
    const firstLeg = legs[0];
    if (!firstLeg) return;

    const canOverwrite = (current: string | undefined, lastSynced?: string) => {
      // If field is empty, we can fill it.
      if (!current) return true;
      // If user hasn't changed it since we last synced, we can update it.
      return current === lastSynced;
    };

    let shouldUpdate = false;
    const newLeg = { ...firstLeg };

    // Sync departure from memory
    if (memory.departure) {
      const memDep = memory.departure;
      const displayFrom = memDep.iata
        ? `${memDep.airport || memDep.city} (${memDep.iata})`
        : memDep.city
          ? `${memDep.city}${memDep.country ? `, ${memDep.country}` : ""}`
          : null;

      const lastFrom = lastSyncedRef.current.from;
      if (displayFrom && displayFrom !== firstLeg.from && canOverwrite(firstLeg.from, lastFrom)) {
        newLeg.from = displayFrom;
        newLeg.fromLocation = {
          id: memDep.iata || memDep.city || "departure",
          name: memDep.airport || memDep.city || "",
          type: memDep.iata ? "airport" : "city",
          country_code: memDep.countryCode || "",
          country_name: memDep.country || "",
          iata: memDep.iata,
          lat: memDep.lat || 0,
          lng: memDep.lng || 0,
          display_name: displayFrom,
        };
        lastSyncedRef.current.from = displayFrom;
        shouldUpdate = true;
      }
    }

    // Sync arrival from memory
    if (memory.arrival) {
      const memArr = memory.arrival;
      const displayTo = memArr.iata
        ? `${memArr.airport || memArr.city} (${memArr.iata})`
        : memArr.city
          ? `${memArr.city}${memArr.country ? `, ${memArr.country}` : ""}`
          : null;

      const lastTo = lastSyncedRef.current.to;
      if (displayTo && displayTo !== firstLeg.to && canOverwrite(firstLeg.to, lastTo)) {
        newLeg.to = displayTo;
        newLeg.toLocation = {
          id: memArr.iata || memArr.city || "arrival",
          name: memArr.airport || memArr.city || "",
          type: memArr.iata ? "airport" : "city",
          country_code: memArr.countryCode || "",
          country_name: memArr.country || "",
          iata: memArr.iata,
          lat: memArr.lat || 0,
          lng: memArr.lng || 0,
          display_name: displayTo,
        };
        lastSyncedRef.current.to = displayTo;
        shouldUpdate = true;
      }
    }

    // Sync dates from memory (only if user hasn't edited since last sync)
    if (memory.departureDate && (!firstLeg.date || firstLeg.date.getTime() === memory.departureDate.getTime())) {
      // If empty, fill. If different, leave user choice (handled by widget).
      if (!firstLeg.date) {
        newLeg.date = memory.departureDate;
        shouldUpdate = true;
      }
    }

    if (memory.returnDate && (!firstLeg.returnDate || firstLeg.returnDate.getTime() === memory.returnDate.getTime())) {
      if (!firstLeg.returnDate) {
        newLeg.returnDate = memory.returnDate;
        shouldUpdate = true;
      }
    }

    // Sync trip type
    if (memory.tripType !== tripType) {
      setTripType(memory.tripType);
    }

    // Sync passengers count FROM memory only on initial mount or if memory has more passengers
    // Don't override if user manually added passengers
    const memTotalPassengers = memory.passengers.adults + memory.passengers.children + memory.passengers.infants;
    if (memTotalPassengers > passengers.length) {
      const newPassengers: Passenger[] = [];
      for (let i = 0; i < memory.passengers.adults; i++) {
        newPassengers.push({ id: crypto.randomUUID(), type: "adult", personalItems: 1, cabinBags: 0, checkedBags: 0 });
      }
      for (let i = 0; i < memory.passengers.children; i++) {
        newPassengers.push({ id: crypto.randomUUID(), type: "child", personalItems: 1, cabinBags: 0, checkedBags: 0 });
      }
      if (newPassengers.length > 0) setPassengers(newPassengers);
    }

    if (shouldUpdate) {
      setLegs([newLeg]);
    }
  }, [memory, legs, passengers.length, tripType]);

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

  // Check if a leg value is a country (no city, just a country name)
  const isCountryOnly = (value: string, location?: LocationResult): boolean => {
    // If we have location metadata and it's explicitly a country
    if (location?.type === "country") return true;
    
    // Check common country patterns (no comma = likely country)
    const hasComma = value.includes(",");
    const hasAirportCode = /\([A-Z]{3}\)/.test(value);
    
    // If no comma and no airport code, might be a country
    if (!hasComma && !hasAirportCode) {
      // Additional check: could be a simple city name, but countries are usually single words
      // For safety, we'll rely on the location metadata when available
      return false;
    }
    
    return false;
  };

  // Fetch cities for a country and ask user to choose
  const fetchCitiesForCountry = async (countryCode: string, countryName: string, field: "from" | "to"): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/top-cities-by-country?country_code=${countryCode}&limit=5`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.cities && data.cities.length > 0) {
          // We have cities - notify chat to show city selection
          // For now, return true to indicate we need city selection
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // Helper to get IATA code from location or find nearest airport
  const resolveAirportCode = async (
    value: string | undefined,
    location: LocationResult | undefined
  ): Promise<{ iata: string; displayName: string } | null> => {
    if (!value?.trim()) return null;
    
    // If already has IATA code in the string, use it
    const existingIata = value.match(/\(([A-Z]{3})\)/)?.[1];
    if (existingIata) {
      return { iata: existingIata, displayName: value };
    }
    
    // If location is an airport with IATA, use it
    if (location?.type === "airport" && location.iata) {
      return { iata: location.iata, displayName: `${location.name} (${location.iata})` };
    }
    
    // Otherwise, find nearest airport for the city
    const cityName = location?.name || value.split(",")[0]?.trim();
    const countryCode = location?.country_code;
    
    const result = await findNearestAirports(cityName, 1, countryCode);
    if (result?.airports?.[0]) {
      const airport = result.airports[0];
      return { iata: airport.iata, displayName: `${airport.name} (${airport.iata})` };
    }
    
    return null;
  };

  // Handle search button click - resolve airports and ask for confirmation in chat
  const handleSearchClick = async () => {
    // For multi-destination, collect all airport suggestions and ask for confirmation
    if (tripType === "multi") {
      // Find all complete legs
      const validLegs = legs.map((leg, idx) => ({
        leg,
        index: idx,
        isComplete: Boolean(leg.from?.trim() && leg.to?.trim() && leg.date),
      })).filter(l => l.isComplete);

      if (validLegs.length === 0) return;

      setIsSearchingAirports(true);

      try {
        // Resolve all airports for cities that don't have IATA codes
        const legSuggestions = await Promise.all(
          validLegs.map(async ({ leg, index }) => {
            const fromCityName = leg.fromLocation?.name || leg.from?.split(",")[0]?.trim() || "";
            const toCityName = leg.toLocation?.name || leg.to?.split(",")[0]?.trim() || "";
            
            // Get airports for both origin and destination
            const [fromAirports, toAirports] = await Promise.all([
              findNearestAirports(fromCityName, 3, leg.fromLocation?.country_code),
              findNearestAirports(toCityName, 3, leg.toLocation?.country_code),
            ]);
            
            // If we have airports, create suggestion data
            if (fromAirports?.airports?.length && toAirports?.airports?.length) {
              return {
                legIndex: index,
                from: {
                  city: fromCityName,
                  suggestedAirport: fromAirports.airports[0],
                  alternativeAirports: fromAirports.airports.slice(1),
                },
                to: {
                  city: toCityName,
                  suggestedAirport: toAirports.airports[0],
                  alternativeAirports: toAirports.airports.slice(1),
                },
                date: leg.date,
              };
            }
            return null;
          })
        );

        setIsSearchingAirports(false);
        
        // Filter out null results
        const validSuggestions = legSuggestions.filter((s): s is NonNullable<typeof s> => s !== null);
        
        if (validSuggestions.length === 0) {
          console.warn("[FlightsPanel] No valid airport suggestions found");
          return;
        }

        // Ask for confirmation in chat
        onAskAirportConfirmation?.({ legs: validSuggestions });
        
      } catch (error) {
        console.error("[FlightsPanel] Error resolving airports:", error);
        setIsSearchingAirports(false);
      }
      return;
    }

    // For simple trips (roundtrip/oneway), same logic but with confirmation widget
    const targetLeg = legs[0];
    if (!targetLeg?.from?.trim() || !targetLeg?.to?.trim() || !targetLeg?.date) return;
    
    setIsSearchingAirports(true);
    
    try {
      // First check if either location is a COUNTRY (not a city)
      const fromIsCountry = targetLeg.fromLocation?.type === "country";
      const toIsCountry = targetLeg.toLocation?.type === "country";
      
      // If either is a country, we need to ask user to select a city first
      if (fromIsCountry || toIsCountry) {
        const countriesNeedingSelection = [];
        if (fromIsCountry && targetLeg.fromLocation) {
          countriesNeedingSelection.push({
            field: "from" as const,
            countryCode: targetLeg.fromLocation.country_code,
            countryName: targetLeg.fromLocation.name,
          });
        }
        if (toIsCountry && targetLeg.toLocation) {
          countriesNeedingSelection.push({
            field: "to" as const,
            countryCode: targetLeg.toLocation.country_code,
            countryName: targetLeg.toLocation.name,
          });
        }
        
        if (countriesNeedingSelection.length > 0) {
          const first = countriesNeedingSelection[0];
          onCountrySelected?.({
            field: first.field,
            country: {
              id: first.countryCode,
              name: first.countryName,
              type: "country",
              country_code: first.countryCode,
              country_name: first.countryName,
              lat: 0,
              lng: 0,
              display_name: first.countryName,
            },
          });
          setIsSearchingAirports(false);
          return;
        }
      }
      
      // Check if both already have IATA codes
      const fromHasAirport = /\([A-Z]{3}\)/.test(targetLeg.from);
      const toHasAirport = /\([A-Z]{3}\)/.test(targetLeg.to);
      
      // If both already have airport codes, search directly
      if (fromHasAirport && toHasAirport) {
        setIsSearchingAirports(false);
        performFlightSearch(targetLeg.from, targetLeg.to, 0);
        return;
      }
      
      // Otherwise, get airports and ask for confirmation
      const fromCityName = targetLeg.fromLocation?.name || targetLeg.from.split(",")[0].trim();
      const toCityName = targetLeg.toLocation?.name || targetLeg.to.split(",")[0].trim();
      
      const [fromAirports, toAirports] = await Promise.all([
        !fromHasAirport ? findNearestAirports(fromCityName, 3, targetLeg.fromLocation?.country_code) : null,
        !toHasAirport ? findNearestAirports(toCityName, 3, targetLeg.toLocation?.country_code) : null,
      ]);
      
      // Build suggestion for single trip
      const fromData = fromAirports?.airports?.length 
        ? { city: fromCityName, suggestedAirport: fromAirports.airports[0], alternativeAirports: fromAirports.airports.slice(1) }
        : null;
      const toData = toAirports?.airports?.length 
        ? { city: toCityName, suggestedAirport: toAirports.airports[0], alternativeAirports: toAirports.airports.slice(1) }
        : null;
      
      // If we found airports, check if there are multiple choices
      const fromHasMultiple = (fromAirports?.airports?.length || 0) > 1;
      const toHasMultiple = (toAirports?.airports?.length || 0) > 1;
      
      if (fromData && toData && (fromHasMultiple || toHasMultiple)) {
        // Show confirmation widget with dropdowns
        onAskAirportConfirmation?.({
          legs: [{
            legIndex: 0,
            from: fromData,
            to: toData,
            date: targetLeg.date,
          }],
        });
        setIsSearchingAirports(false);
        return;
      }
      
      // If only one airport each, auto-select and search
      let updatedFrom = targetLeg.from;
      let updatedTo = targetLeg.to;
      
      if (fromData) {
        const airport = fromData.suggestedAirport;
        updatedFrom = `${airport.name} (${airport.iata})`;
        setLegs((prev) => prev.map((leg, idx) => 
          idx === 0 ? { ...leg, from: updatedFrom } : leg
        ));
      }
      
      if (toData) {
        const airport = toData.suggestedAirport;
        updatedTo = `${airport.name} (${airport.iata})`;
        setLegs((prev) => prev.map((leg, idx) => 
          idx === 0 ? { ...leg, to: updatedTo } : leg
        ));
      }
      
      setIsSearchingAirports(false);
      performFlightSearch(updatedFrom, updatedTo, 0);
    } catch (error) {
      console.error("[FlightsPanel] Error in handleSearchClick:", error);
      setIsSearchingAirports(false);
    }
  };

  // Handle confirmed airports from chat widget - execute the actual search
  useEffect(() => {
    if (!confirmedMultiAirports) return;
    
    const executeSearch = async () => {
      setIsMultiSearching(true);
      setIsSearchingFlights(true);
      
      try {
        // For multi-destination
        if (tripType === "multi" && confirmedMultiAirports.legs.length > 1) {
          // Update legs display with confirmed airports
          confirmedMultiAirports.legs.forEach(confirmed => {
            setLegs(prev => prev.map((leg, idx) => 
              idx === confirmed.legIndex 
                ? { ...leg, from: confirmed.fromDisplay, to: confirmed.toDisplay }
                : leg
            ));
          });
          
          // Search all legs in parallel
          const searchPromises = confirmedMultiAirports.legs.map(async (confirmed) => {
            const adults = passengers.filter(p => p.type === "adult").length;
            const children = passengers.filter(p => p.type === "child").length;
            const cabinClassMap = { economy: "ECONOMY", business: "BUSINESS", first: "FIRST" };

            const requestBody = {
              origin: confirmed.fromIata,
              destination: confirmed.toIata,
              departureDate: confirmed.date ? confirmed.date.toISOString().split('T')[0] : undefined,
              adults,
              children,
              cabinClass: cabinClassMap[travelClass],
              currency: "EUR",
              languageCode: "fr",
              countryCode: "FR",
            };

            console.log(`[FlightsPanel] Searching confirmed leg ${confirmed.legIndex + 1}:`, requestBody);

            try {
              const response = await fetch(
                "https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/flight-search",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(requestBody),
                }
              );

              if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
              }

              const data = await response.json();
              console.log(`[FlightsPanel] Confirmed leg ${confirmed.legIndex + 1}: received ${data.count} flights`);
              
              return {
                index: confirmed.legIndex,
                flights: data.flights && data.flights.length > 0 
                  ? data.flights 
                  : generateMockFlights(confirmed.fromDisplay, confirmed.toDisplay),
              };
            } catch (error) {
              console.error(`[FlightsPanel] Confirmed leg ${confirmed.legIndex + 1} search error:`, error);
              return {
                index: confirmed.legIndex,
                flights: generateMockFlights(confirmed.fromDisplay, confirmed.toDisplay),
              };
            }
          });

          const results = await Promise.all(searchPromises);
          
          // Store all results
          const resultsMap: Record<number, FlightOffer[]> = {};
          results.forEach(r => {
            resultsMap[r.index] = r.flights;
          });
          setAllLegResults(resultsMap);
          
          // Show results for first leg
          const firstIndex = confirmedMultiAirports.legs[0].legIndex;
          setViewingLegIndex(firstIndex);
          setFlightResults(resultsMap[firstIndex] || []);
          
        } else {
          // For simple trips with confirmed airports
          const confirmed = confirmedMultiAirports.legs[0];
          if (confirmed) {
            setLegs(prev => prev.map((leg, idx) => 
              idx === 0 ? { ...leg, from: confirmed.fromDisplay, to: confirmed.toDisplay } : leg
            ));
            performFlightSearch(confirmed.fromDisplay, confirmed.toDisplay, 0);
          }
        }
      } finally {
        setIsMultiSearching(false);
        setIsSearchingFlights(false);
      }
    };
    
    executeSearch();
    onConfirmedMultiAirportsConsumed?.();
  }, [confirmedMultiAirports]);

  // Perform the actual flight search via edge function (for simple trips only)
  const performFlightSearch = async (from: string, to: string, legIndex: number = 0) => {
    setIsSearchingFlights(true);
    
    try {
      const targetLeg = legs[legIndex];
      const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from.substring(0, 3).toUpperCase();
      const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to.substring(0, 3).toUpperCase();
      
      const adults = passengers.filter(p => p.type === "adult").length;
      const children = passengers.filter(p => p.type === "child").length;
      
      const cabinClassMap = { economy: "ECONOMY", business: "BUSINESS", first: "FIRST" };
      
      const requestBody = {
        origin: fromCode,
        destination: toCode,
        departureDate: targetLeg?.date ? targetLeg.date.toISOString().split('T')[0] : undefined,
        returnDate: tripType === "roundtrip" && targetLeg?.returnDate 
          ? targetLeg.returnDate.toISOString().split('T')[0] 
          : undefined,
        adults,
        children,
        cabinClass: cabinClassMap[travelClass],
        currency: "EUR",
        languageCode: "fr",
        countryCode: "FR",
      };

      console.log("[FlightsPanel] Searching flights:", requestBody);

      const response = await fetch(
        "https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/flight-search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("[FlightsPanel] Received", data.count, "flights");
      
      if (data.flights && data.flights.length > 0) {
        setFlightResults(data.flights);
      } else {
        setFlightResults(generateMockFlights(from, to));
      }
    } catch (error) {
      console.error("[FlightsPanel] Flight search error:", error);
      setFlightResults(generateMockFlights(from, to));
    } finally {
      setIsSearchingFlights(false);
    }
  };

  // Handle triggered search from chat
  useEffect(() => {
    if (!triggerSearch) return;
    
    const firstLeg = legs[0];
    
    // First check if either location is a COUNTRY (needs city selection first)
    const fromIsCountry = firstLeg?.fromLocation?.type === "country";
    const toIsCountry = firstLeg?.toLocation?.type === "country";
    
    if (fromIsCountry && firstLeg.fromLocation) {
      // Trigger city selection in chat for departure country
      onCountrySelected?.({
        field: "from",
        country: firstLeg.fromLocation,
      });
      onSearchTriggered?.();
      return;
    }
    
    if (toIsCountry && firstLeg.toLocation) {
      // Trigger city selection in chat for destination country
      onCountrySelected?.({
        field: "to",
        country: firstLeg.toLocation,
      });
      onSearchTriggered?.();
      return;
    }
    
    const fromHasAirport = /\([A-Z]{3}\)/.test(firstLeg?.from || '');
    const toHasAirport = /\([A-Z]{3}\)/.test(firstLeg?.to || '');
    
    if (fromHasAirport && toHasAirport) {
      performFlightSearch(firstLeg.from, firstLeg.to);
    } else {
      // Need to find airports for cities - call handleSearchClick instead
      handleSearchClick();
    }
    
    onSearchTriggered?.();
  }, [triggerSearch, legs, onSearchTriggered, onCountrySelected]);

  // Notify parent of route changes when legs change AND sync with memory
  const handleLegsChange = (newLegs: FlightLeg[]) => {
    setLegs(newLegs);

    // Sync with flight memory for map display
    if (tripType === "multi") {
      // For multi-destination, sync all legs to memory
      const memoryLegs = newLegs.map((leg) => ({
        id: leg.id,
        departure: leg.fromLocation ? {
          city: leg.fromLocation.type === 'airport' ? (leg.fromLocation.name?.split(' ')[0] || undefined) : leg.fromLocation.name,
          airport: leg.fromLocation.type === 'airport' ? leg.fromLocation.name : undefined,
          iata: leg.fromLocation.iata,
          lat: leg.fromLocation.lat,
          lng: leg.fromLocation.lng,
          country: leg.fromLocation.country_name,
          countryCode: leg.fromLocation.country_code,
        } : null,
        arrival: leg.toLocation ? {
          city: leg.toLocation.type === 'airport' ? (leg.toLocation.name?.split(' ')[0] || undefined) : leg.toLocation.name,
          airport: leg.toLocation.type === 'airport' ? leg.toLocation.name : undefined,
          iata: leg.toLocation.iata,
          lat: leg.toLocation.lat,
          lng: leg.toLocation.lng,
          country: leg.toLocation.country_name,
          countryCode: leg.toLocation.country_code,
        } : null,
        date: leg.date || null,
      }));
      
      updateMemory({ 
        tripType: "multi",
        legs: memoryLegs,
      });
    } else {
      // For roundtrip/oneway, sync first leg to departure/arrival
      const firstLeg = newLegs[0];
      if (firstLeg) {
        const memoryUpdate: Parameters<typeof updateMemory>[0] = {
          tripType,
        };

        // If user cleared the fields, keep them empty by clearing memory too
        if ((firstLeg.from || "").trim() === "") {
          memoryUpdate.departure = null;
        }
        if ((firstLeg.to || "").trim() === "") {
          memoryUpdate.arrival = null;
        }

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

        updateMemory(memoryUpdate);
      }
    }

    if (!onFlightRoutesChange) return;

    // Build route points using coordinates from location metadata
    const sequence: FlightRoutePoint[] = [];

    newLegs.forEach((leg, idx) => {
      const fromLoc = leg.fromLocation;
      const toLoc = leg.toLocation;

      // Add origin (only for first leg or if different from previous destination)
      if (idx === 0 && fromLoc && fromLoc.lat && fromLoc.lng) {
        sequence.push({ 
          city: leg.from || fromLoc.display_name, 
          lat: fromLoc.lat, 
          lng: fromLoc.lng 
        });
      }

      // Add destination for each leg
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
    const newPassengers = [...passengers, { id: crypto.randomUUID(), type: "adult" as const, personalItems: 1, cabinBags: 0, checkedBags: 0 }];
    setPassengers(newPassengers);
    // Sync with memory
    const adults = newPassengers.filter(p => p.type === "adult").length;
    const children = newPassengers.filter(p => p.type === "child").length;
    updateMemory({ passengers: { adults, children, infants: 0 } });
  };

  const removePassenger = (id: string) => {
    if (passengers.length > 1) {
      const newPassengers = passengers.filter(p => p.id !== id);
      setPassengers(newPassengers);
      // Sync with memory
      const adults = newPassengers.filter(p => p.type === "adult").length;
      const children = newPassengers.filter(p => p.type === "child").length;
      updateMemory({ passengers: { adults, children, infants: 0 } });
    }
  };

  const updatePassenger = (id: string, updates: Partial<Passenger>) => {
    const newPassengers = passengers.map(p => p.id === id ? { ...p, ...updates } : p);
    setPassengers(newPassengers);
    // Sync with memory when type changes
    if (updates.type !== undefined) {
      const adults = newPassengers.filter(p => p.type === "adult").length;
      const children = newPassengers.filter(p => p.type === "child").length;
      updateMemory({ passengers: { adults, children, infants: 0 } });
    }
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
    // Source of truth is FlightMemory; legs UI will be rehydrated by the effect above.
    setTripType(newType);
  };

  // Handle flight selection for multi-destination
  const handleFlightSelect = (flight: FlightOffer) => {
    if (tripType === "multi") {
      // Save selected flight for this leg
      setSelectedFlights(prev => ({ ...prev, [viewingLegIndex]: flight }));
      
      // Find next leg without a selection
      const legIndices = Object.keys(allLegResults).map(Number).sort((a, b) => a - b);
      const currentIdx = legIndices.indexOf(viewingLegIndex);
      const nextUnselected = legIndices.find((idx, i) => i > currentIdx && !selectedFlights[idx]);
      
      if (nextUnselected !== undefined) {
        // Move to next leg
        setViewingLegIndex(nextUnselected);
        setFlightResults(allLegResults[nextUnselected] || []);
      }
      // If all selected, stay on current view showing the recap
    } else {
      // For simple trips, just log
      console.log("Selected flight:", flight);
    }
  };

  // Calculate total price for multi-destination
  const getTotalSelectedPrice = () => {
    return Object.values(selectedFlights).reduce((sum, flight) => sum + flight.price * passengers.length, 0);
  };

  // Check if all multi-destination flights are selected
  const allFlightsSelected = tripType === "multi" && 
    Object.keys(allLegResults).length > 0 &&
    Object.keys(allLegResults).every(idx => selectedFlights[Number(idx)]);

  // Show results view if we have results
  if (flightResults !== null || isSearchingFlights || Object.keys(allLegResults).length > 0) {
    // Get valid leg indices for dropdown
    const validLegIndices = Object.keys(allLegResults).map(Number).sort((a, b) => a - b);
    
    // For multi-destination, use the viewing leg; otherwise use first leg
    const resultLeg = tripType === "multi" ? legs[viewingLegIndex] : legs[0];
    
    // Extract IATA codes for display
    const getIataCode = (value: string | undefined) => {
      if (!value) return "?";
      const match = value.match(/\(([A-Z]{3})\)/);
      return match ? match[1] : value.split(",")[0]?.trim()?.substring(0, 3)?.toUpperCase() || "?";
    };
    
    return (
      <div className="space-y-4">
        {/* Header with back button and segment selector */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setFlightResults(null);
              setAllLegResults({});
              setSelectedFlights({});
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Modifier
          </button>
          
          {/* Multi-destination: Compact segment tabs */}
          {tripType === "multi" && validLegIndices.length > 1 ? (
            <div className="flex items-center gap-1 flex-1 justify-end overflow-x-auto">
              {validLegIndices.map(idx => {
                const leg = legs[idx];
                const fromIata = getIataCode(leg?.from);
                const toIata = getIataCode(leg?.to);
                const isActive = viewingLegIndex === idx;
                const isSelected = selectedFlights[idx] !== undefined;
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setViewingLegIndex(idx);
                      setFlightResults(allLegResults[idx] || []);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isSelected
                          ? "bg-green-500/10 text-green-700 border border-green-500/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{fromIata}</span>
                    <Plane className="h-2.5 w-2.5 rotate-90" />
                    <span>{toIata}</span>
                    {isSelected && !isActive && <span className="text-green-600">✓</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Simple trip: show route directly */
            <div className="flex items-center gap-2 text-sm font-medium">
              <span>{getIataCode(resultLeg?.from)}</span>
              <Plane className="h-3 w-3 rotate-90 text-primary" />
              <span>{getIataCode(resultLeg?.to)}</span>
              {tripType === "roundtrip" && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-1">A/R</span>
              )}
            </div>
          )}
        </div>

        {/* Multi-destination: Recap of selected flights */}
        {tripType === "multi" && Object.keys(selectedFlights).length > 0 && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                {Object.keys(selectedFlights).length}/{validLegIndices.length} vols sélectionnés
              </span>
              <span className="text-sm font-bold text-green-700 dark:text-green-400">
                {getTotalSelectedPrice().toFixed(0)} €
              </span>
            </div>
            {allFlightsSelected && (
              <button className="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
                Réserver l'itinéraire complet
              </button>
            )}
          </div>
        )}
        
        {/* Results - no duplicate header */}
        <FlightResults 
          flights={flightResults || []} 
          isLoading={isSearchingFlights || isMultiSearching}
          onSelect={handleFlightSelect}
          travelers={passengers.length}
          tripType={tripType === "multi" ? "oneway" : tripType}
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
        <div className="space-y-2">
          {passengers.map((passenger, index) => (
            <div 
              key={passenger.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/20 border border-border/30 hover:border-border/50 transition-colors"
            >
              {/* Type selector */}
              <div className="flex items-center gap-2 shrink-0">
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
              <div className="flex items-center justify-center gap-3 flex-1">
                {/* Cabin bags */}
                <div className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-xs">🧳</span>
                  <span className="text-[10px] text-muted-foreground">Cabine</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { cabinBags: Math.max(0, passenger.cabinBags - 1) })}
                    className="w-5 h-5 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-xs font-medium transition-colors ml-1"
                  >
                    −
                  </button>
                  <span className="text-xs w-4 text-center font-medium">{passenger.cabinBags}</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { cabinBags: Math.min(2, passenger.cabinBags + 1) })}
                    className="w-5 h-5 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-xs font-medium transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Checked bags */}
                <div className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-xs">🛄</span>
                  <span className="text-[10px] text-muted-foreground">Soute</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { checkedBags: Math.max(0, passenger.checkedBags - 1) })}
                    className="w-5 h-5 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-xs font-medium transition-colors ml-1"
                  >
                    −
                  </button>
                  <span className="text-xs w-4 text-center font-medium">{passenger.checkedBags}</span>
                  <button
                    onClick={() => updatePassenger(passenger.id, { checkedBags: passenger.checkedBags + 1 })}
                    className="w-5 h-5 rounded bg-background/50 hover:bg-primary/20 hover:text-primary text-foreground flex items-center justify-center text-xs font-medium transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Remove button - always visible when multiple passengers */}
              {passengers.length > 1 && (
                <button
                  onClick={() => removePassenger(passenger.id)}
                  className="ml-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
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

      {/* Search Button Section */}
      <div className="pt-3 space-y-3">
        {/* Multi-destination: Summary of legs */}
        {tripType === "multi" && legs.length > 1 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground">Segments à rechercher</span>
            <div className="grid gap-1.5">
              {legs.map((leg, index) => {
                const hasFrom = leg.from?.trim();
                const hasTo = leg.to?.trim();
                const hasDate = leg.date;
                const isComplete = hasFrom && hasTo && hasDate;
                const fromCode = leg.from?.match(/\(([A-Z]{3})\)/)?.[1] || leg.from?.split(",")[0]?.trim() || "?";
                const toCode = leg.to?.match(/\(([A-Z]{3})\)/)?.[1] || leg.to?.split(",")[0]?.trim() || "?";
                const dateStr = leg.date ? leg.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Date ?";
                
                return (
                  <div
                    key={leg.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs",
                      isComplete 
                        ? "bg-muted/20 text-foreground border border-border/30" 
                        : "bg-amber-500/10 text-amber-700 border border-amber-500/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="font-medium">{fromCode}</span>
                      <Plane className="h-2.5 w-2.5 rotate-90" />
                      <span className="font-medium">{toCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]">{dateStr}</span>
                      {isComplete ? (
                        <span className="text-green-500 text-[10px]">✓</span>
                      ) : (
                        <span className="text-amber-500 text-[10px]">⚠</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search button */}
        {(() => {
          // For multi-destination, check if at least one leg is complete
          // For simple trips, check first leg
          let isComplete = false;
          let missingInfo: string[] = [];
          
          if (tripType === "multi") {
            const completeLegs = legs.filter(leg => 
              leg.from?.trim() && leg.to?.trim() && leg.date
            );
            isComplete = completeLegs.length >= 2; // At least 2 complete legs for multi
            if (!isComplete) {
              missingInfo.push(`${2 - completeLegs.length} segment(s) incomplet(s)`);
            }
          } else {
            const firstLeg = legs[0];
            const hasFrom = firstLeg?.from?.trim();
            const hasTo = firstLeg?.to?.trim();
            const hasDate = firstLeg?.date;
            isComplete = Boolean(hasFrom && hasTo && hasDate);
            if (!hasFrom) missingInfo.push("départ");
            if (!hasTo) missingInfo.push("destination");
            if (!hasDate) missingInfo.push("date");
          }

          const searchLabel = tripType === "multi" 
            ? `Rechercher ${legs.filter(l => l.from?.trim() && l.to?.trim() && l.date).length} vols`
            : "Rechercher des vols";

          return (
            <>
              <button
                onClick={handleSearchClick}
                disabled={!isComplete || isSearchingAirports || isMultiSearching}
                className={cn(
                  "w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2",
                  isComplete && !isSearchingAirports && !isMultiSearching
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSearchingAirports || isMultiSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isMultiSearching ? "Recherche en cours..." : "Vérification..."}
                  </>
                ) : (
                  <>
                    <Plane className="h-4 w-4" />
                    {searchLabel}
                  </>
                )}
              </button>
              {!isComplete && missingInfo.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  {missingInfo.join(", ")}
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

// Note: StaysPanel has been replaced by AccommodationPanel component

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
