import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { Send, User, Plane, CalendarIcon, History } from "lucide-react";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { useChatSessions, type StoredMessage } from "@/hooks/useChatSessions";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-travliaq.png";
import ReactMarkdown from "react-markdown";
import type { CountrySelectionEvent } from "./PlannerPanel";
import { findNearestAirports, type Airport } from "@/hooks/useNearestAirports";
import { useFlightMemory, type AirportInfo, type MissingField } from "@/contexts/FlightMemoryContext";
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

export type ChatQuickAction =
  | { type: "tab"; tab: "flights" | "activities" | "stays" | "preferences" }
  | { type: "zoom"; center: [number, number]; zoom: number }
  | { type: "tabAndZoom"; tab: "flights" | "activities" | "stays" | "preferences"; center: [number, number]; zoom: number }
  | { type: "updateFlight"; flightData: FlightFormData }
  | { type: "selectAirport"; field: "from" | "to"; airport: Airport }
  | { type: "triggerFlightSearch" };

export interface FlightFormData {
  from?: string;
  fromCountryCode?: string;
  fromCountryName?: string;
  to?: string;
  toCountryCode?: string;
  toCountryName?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  adults?: number;
  children?: number;
  infants?: number;
  needsTravelersWidget?: boolean;
  needsDateWidget?: boolean;
  needsCitySelection?: boolean;
  tripDuration?: string;
  preferredMonth?: string;
  budgetHint?: string;
  tripType?: "roundtrip" | "oneway" | "multi";
}

// Airport selection for chat buttons
export interface AirportChoice {
  field: "from" | "to";
  cityName: string;
  airports: Airport[];
}

// Dual airport selection (both departure and destination in one message)
export interface DualAirportChoice {
  from?: AirportChoice;
  to?: AirportChoice;
}

// Widget types for inline interactions
type WidgetType = "datePicker" | "returnDatePicker" | "dateRangePicker" | "travelersSelector" | "tripTypeConfirm" | "citySelector";

// City choice for country selection
export interface CityChoice {
  name: string;
  description: string;
  population?: number;
}

export interface CitySelectionData {
  countryCode: string;
  countryName: string;
  cities: CityChoice[];
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
  isTyping?: boolean;
  isStreaming?: boolean;
  isHidden?: boolean;
  airportChoices?: AirportChoice;
  dualAirportChoices?: DualAirportChoice;
  hasSearchButton?: boolean;
  widget?: WidgetType;
  widgetData?: {
    preferredMonth?: string; // e.g. "février", "march", "summer"
    tripDuration?: string;
    citySelection?: CitySelectionData;
    isDeparture?: boolean; // true if selecting departure city
  };
}

interface PlannerChatProps {
  onAction: (action: ChatQuickAction) => void;
}

export interface PlannerChatRef {
  injectSystemMessage: (event: CountrySelectionEvent) => void;
  askAirportChoice: (choice: AirportChoice) => void;
  askDualAirportChoice: (choices: DualAirportChoice) => void;
  offerFlightSearch: (from: string, to: string) => void;
}

// City coordinates for map actions
const cityCoordinates: Record<string, [number, number]> = {
  "paris": [2.3522, 48.8566],
  "new york": [-74.0060, 40.7128],
  "nyc": [-74.0060, 40.7128],
  "barcelone": [2.1734, 41.3851],
  "barcelona": [2.1734, 41.3851],
  "rome": [12.4964, 41.9028],
  "tokyo": [139.6503, 35.6762],
  "londres": [-0.1278, 51.5074],
  "london": [-0.1278, 51.5074],
  "berlin": [13.4050, 52.5200],
  "amsterdam": [4.9041, 52.3676],
  "lisbonne": [-9.1393, 38.7223],
  "lisbon": [-9.1393, 38.7223],
  "bruxelles": [4.3517, 50.8503],
  "brussels": [4.3517, 50.8503],
  "madrid": [-3.7038, 40.4168],
  "vienne": [16.3738, 48.2082],
  "vienna": [16.3738, 48.2082],
  "prague": [14.4378, 50.0755],
  "budapest": [19.0402, 47.4979],
  "dubai": [55.2708, 25.2048],
  "singapour": [103.8198, 1.3521],
  "singapore": [103.8198, 1.3521],
  "sydney": [151.2093, -33.8688],
  "bangkok": [100.5018, 13.7563],
  "marrakech": [-7.9811, 31.6295],
  "le caire": [31.2357, 30.0444],
  "cairo": [31.2357, 30.0444],
};

function getCityCoords(cityName: string): [number, number] | null {
  const normalized = cityName.toLowerCase().trim();
  return cityCoordinates[normalized] || null;
}

function parseAction(content: string): { cleanContent: string; action: ChatQuickAction | null } {
  const actionMatch = content.match(/<action>(.*?)<\/action>/s);
  let cleanContent = content.replace(/<action>.*?<\/action>/gs, "").trim();
  
  if (!actionMatch) return { cleanContent, action: null };

  try {
    const actionData = JSON.parse(actionMatch[1]);
    
    if (actionData.type === "zoom" && actionData.city) {
      const coords = getCityCoords(actionData.city);
      if (coords) {
        return { cleanContent, action: { type: "zoom", center: coords, zoom: 12 } };
      }
    }
    
    if (actionData.type === "tab" && actionData.tab) {
      return { cleanContent, action: { type: "tab", tab: actionData.tab } };
    }
    
    if (actionData.type === "tabAndZoom" && actionData.tab && actionData.city) {
      const coords = getCityCoords(actionData.city);
      if (coords) {
        return { cleanContent, action: { type: "tabAndZoom", tab: actionData.tab, center: coords, zoom: 12 } };
      }
    }
  } catch (e) {
    console.error("Failed to parse action:", e);
  }

  return { cleanContent, action: null };
}

// Compact inline Airport button component
const AirportButton = ({ 
  airport, 
  onClick,
  disabled 
}: { 
  airport: Airport; 
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-left",
      "bg-card hover:bg-primary/10 hover:border-primary/50",
      "border-border/50 text-xs w-full",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    <span className="font-bold text-primary text-sm">{airport.iata}</span>
    <span className="flex-1 truncate text-foreground">{airport.city_name || airport.name.split(" ")[0]}</span>
    <span className="text-muted-foreground text-[10px] shrink-0">{airport.distance_km.toFixed(0)}km</span>
  </button>
);

// Dual airport selection component
const DualAirportSelection = ({
  choices,
  onSelect,
  disabled,
}: {
  choices: DualAirportChoice;
  onSelect: (field: "from" | "to", airport: Airport) => void;
  disabled?: boolean;
}) => (
  <div className="mt-3 grid grid-cols-2 gap-3">
    {choices.from && (
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <span className="text-primary">✈</span> Départ · {choices.from.cityName}
        </div>
        <div className="space-y-1">
          {choices.from.airports.map((airport) => (
            <AirportButton
              key={airport.iata}
              airport={airport}
              onClick={() => onSelect("from", airport)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    )}
    {choices.to && (
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <span className="text-primary">🛬</span> Arrivée · {choices.to.cityName}
        </div>
        <div className="space-y-1">
          {choices.to.airports.map((airport) => (
            <AirportButton
              key={airport.iata}
              airport={airport}
              onClick={() => onSelect("to", airport)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    )}
  </div>
);

// Helper to parse month from string (French/English)
const parsePreferredMonth = (monthStr?: string): Date | null => {
  if (!monthStr) return null;
  
  const monthMap: Record<string, number> = {
    "janvier": 0, "january": 0, "jan": 0,
    "février": 1, "fevrier": 1, "february": 1, "feb": 1,
    "mars": 2, "march": 2, "mar": 2,
    "avril": 3, "april": 3, "apr": 3,
    "mai": 4, "may": 4,
    "juin": 5, "june": 5, "jun": 5,
    "juillet": 6, "july": 6, "jul": 6,
    "août": 7, "aout": 7, "august": 7, "aug": 7,
    "septembre": 8, "september": 8, "sep": 8, "sept": 8,
    "octobre": 9, "october": 9, "oct": 9,
    "novembre": 10, "november": 10, "nov": 10,
    "décembre": 11, "decembre": 11, "december": 11, "dec": 11,
    // Seasons
    "printemps": 3, "spring": 3,
    "été": 6, "ete": 6, "summer": 6,
    "automne": 9, "autumn": 9, "fall": 9,
    "hiver": 0, "winter": 0,
  };
  
  const normalized = monthStr.toLowerCase().trim();
  const monthIndex = monthMap[normalized];
  
  if (monthIndex !== undefined) {
    const now = new Date();
    let year = now.getFullYear();
    // If the month is in the past this year, use next year
    if (monthIndex < now.getMonth() || (monthIndex === now.getMonth() && now.getDate() > 15)) {
      year++;
    }
    return new Date(year, monthIndex, 1);
  }
  
  return null;
};

// Inline Date Picker Widget - Embedded calendar (not popover) for better chat UX
const DatePickerWidget = ({ 
  label, 
  value, 
  onChange,
  minDate,
  preferredMonth
}: { 
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
  preferredMonth?: string;
}) => {
  // Determine initial month: preferredMonth > value > minDate > today
  const getInitialMonth = () => {
    const parsed = parsePreferredMonth(preferredMonth);
    if (parsed) return startOfMonth(parsed);
    if (value) return startOfMonth(value);
    if (minDate) return startOfMonth(minDate);
    return startOfMonth(new Date());
  };
  
  const [baseMonth, setBaseMonth] = useState<Date>(getInitialMonth());
  const [confirmed, setConfirmed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value);

  const weekStartsOn = 1; // Monday
  const weekDayLabels = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
  
  // Get days for the current month
  const getMonthDays = () => {
    const start = startOfWeek(startOfMonth(baseMonth), { weekStartsOn });
    const end = endOfWeek(endOfMonth(baseMonth), { weekStartsOn });
    const days: Date[] = [];
    let cur = start;
    while (cur <= end) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  };

  const days = getMonthDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDayClick = (day: Date) => {
    const minCheck = minDate ? startOfDay(minDate) : startOfDay(addDays(today, 1)); // Tomorrow minimum
    const isDisabled = isBefore(day, minCheck);
    if (isDisabled) return;
    setSelectedDate(day);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      setConfirmed(true);
      onChange(selectedDate);
    }
  };

  if (confirmed && selectedDate) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <CalendarIcon className="h-4 w-4" />
        <span>{format(selectedDate, "d MMMM yyyy", { locale: fr })}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-xs">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        {label}
      </div>
      
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, -1))}
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {format(baseMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, 1))}
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>
      
      {/* Week day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((lbl, idx) => (
          <div key={idx} className="text-center text-[10px] text-muted-foreground font-medium">
            {lbl}
          </div>
        ))}
      </div>
      
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
      {days.map((day, idx) => {
          const inMonth = isSameMonth(day, baseMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const minCheck = minDate ? startOfDay(minDate) : startOfDay(addDays(today, 1)); // Tomorrow minimum
          const isDisabled = isBefore(day, minCheck);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={cn(
                "aspect-square w-9 h-9 flex items-center justify-center rounded-lg text-xs transition-all",
                "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
                !inMonth && "text-muted-foreground/30",
                isSelected && "bg-primary text-primary-foreground font-semibold shadow-md",
                isToday && !isSelected && "text-primary/60 bg-primary/5", // Subtle today indicator
                isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedDate}
        className={cn(
          "w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-all",
          selectedDate 
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20" 
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {selectedDate ? `Confirmer : ${format(selectedDate, "d MMMM", { locale: fr })}` : "Sélectionnez une date"}
      </button>
    </div>
  );
};

// Date Range Picker Widget - Sélection départ ET retour dans un seul widget
const DateRangePickerWidget = ({ 
  onConfirm,
  tripDuration,
  preferredMonth
}: { 
  onConfirm: (departure: Date, returnDate: Date) => void;
  tripDuration?: string; // e.g. "une semaine", "3 jours"
  preferredMonth?: string; // e.g. "février", "summer"
}) => {
  // Determine initial month from preferredMonth
  const getInitialMonth = () => {
    const parsed = parsePreferredMonth(preferredMonth);
    if (parsed) return startOfMonth(parsed);
    return startOfMonth(new Date());
  };
  
  const [baseMonth, setBaseMonth] = useState<Date>(getInitialMonth());
  const [confirmed, setConfirmed] = useState(false);
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [selectingReturn, setSelectingReturn] = useState(false);

  const weekStartsOn = 1;
  const weekDayLabels = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = addDays(today, 1);
  
  const getMonthDays = () => {
    const start = startOfWeek(startOfMonth(baseMonth), { weekStartsOn });
    const end = endOfWeek(endOfMonth(baseMonth), { weekStartsOn });
    const days: Date[] = [];
    let cur = start;
    while (cur <= end) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  };

  const days = getMonthDays();

  // Calculate suggested return date from trip duration
  const getSuggestedReturnDate = (departure: Date): Date | null => {
    if (!tripDuration) return null;
    const match = tripDuration.match(/(\d+)\s*(semaine|jour|week|day)/i);
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let daysToAdd = num;
      if (unit.includes("semaine") || unit.includes("week")) {
        daysToAdd = num * 7;
      }
      return addDays(departure, daysToAdd);
    }
    // Handle "une semaine" without number
    if (tripDuration.toLowerCase().includes("semaine") || tripDuration.toLowerCase().includes("week")) {
      return addDays(departure, 7);
    }
    return null;
  };

  const handleDayClick = (day: Date) => {
    const isDisabled = isBefore(day, tomorrow);
    if (isDisabled) return;

    if (!departureDate || (departureDate && returnDate)) {
      // Start fresh selection
      setDepartureDate(day);
      setReturnDate(null);
      setSelectingReturn(true);
      
      // Auto-suggest return date if we have trip duration
      const suggested = getSuggestedReturnDate(day);
      if (suggested) {
        setReturnDate(suggested);
        setSelectingReturn(false);
      }
    } else if (selectingReturn) {
      // Selecting return date
      if (isBefore(day, departureDate)) {
        // User clicked before departure, swap
        setReturnDate(departureDate);
        setDepartureDate(day);
      } else {
        setReturnDate(day);
      }
      setSelectingReturn(false);
    }
  };

  const handleConfirm = () => {
    if (departureDate && returnDate) {
      setConfirmed(true);
      onConfirm(departureDate, returnDate);
    }
  };

  const isInRange = (day: Date) => {
    if (!departureDate || !returnDate) return false;
    return day > departureDate && day < returnDate;
  };

  if (confirmed && departureDate && returnDate) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <CalendarIcon className="h-4 w-4" />
        <span>{format(departureDate, "d MMM", { locale: fr })} → {format(returnDate, "d MMM yyyy", { locale: fr })}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-xs">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {selectingReturn ? "Sélectionnez le retour" : "Sélectionnez le départ"}
      </div>
      
      {/* Selected dates indicator */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <div className={cn(
          "flex-1 px-3 py-1.5 rounded-lg border text-center transition-all",
          departureDate ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"
        )}>
          {departureDate ? format(departureDate, "d MMM", { locale: fr }) : "Départ"}
        </div>
        <span className="text-muted-foreground">→</span>
        <div className={cn(
          "flex-1 px-3 py-1.5 rounded-lg border text-center transition-all",
          returnDate ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"
        )}>
          {returnDate ? format(returnDate, "d MMM", { locale: fr }) : "Retour"}
        </div>
      </div>
      
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, -1))}
        >
          ‹
        </button>
        <span className="text-sm font-medium">
          {format(baseMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          onClick={() => setBaseMonth(addMonths(baseMonth, 1))}
        >
          ›
        </button>
      </div>
      
      {/* Week day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDayLabels.map((lbl, idx) => (
          <div key={idx} className="text-center text-[10px] text-muted-foreground font-medium">
            {lbl}
          </div>
        ))}
      </div>
      
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const inMonth = isSameMonth(day, baseMonth);
          const isDeparture = departureDate && isSameDay(day, departureDate);
          const isReturn = returnDate && isSameDay(day, returnDate);
          const inRange = isInRange(day);
          const isToday = isSameDay(day, today);
          const isDisabled = isBefore(day, tomorrow);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={cn(
                "aspect-square w-9 h-9 flex items-center justify-center rounded-lg text-xs transition-all",
                "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
                !inMonth && "text-muted-foreground/30",
                inRange && "bg-primary/15",
                isDeparture && "bg-primary text-primary-foreground font-semibold shadow-md",
                isReturn && "bg-primary text-primary-foreground font-semibold shadow-md",
                isToday && !isDeparture && !isReturn && "text-primary/60 bg-primary/5",
                isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!departureDate || !returnDate}
        className={cn(
          "w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-all",
          departureDate && returnDate 
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20" 
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {departureDate && returnDate 
          ? `Confirmer : ${format(departureDate, "d MMM", { locale: fr })} → ${format(returnDate, "d MMM", { locale: fr })}` 
          : selectingReturn 
            ? "Sélectionnez la date de retour"
            : "Sélectionnez la date de départ"
        }
      </button>
    </div>
  );
};

// Travelers Selector Widget - UX simplifié pour choisir adultes, enfants, bébés
const TravelersWidget = ({ 
  initialValues = { adults: 1, children: 0, infants: 0 },
  onConfirm 
}: { 
  initialValues?: { adults: number; children: number; infants: number };
  onConfirm: (travelers: { adults: number; children: number; infants: number }) => void;
}) => {
  const [adults, setAdults] = useState(Math.max(1, initialValues.adults)); // Ensure at least 1 adult
  const [children, setChildren] = useState(initialValues.children);
  const [infants, setInfants] = useState(Math.min(initialValues.infants, Math.max(1, initialValues.adults))); // Infants cannot exceed adults
  const [confirmed, setConfirmed] = useState(false);

  // Ensure infants don't exceed adults when adults change
  const handleAdultsChange = (newAdults: number) => {
    setAdults(newAdults);
    if (infants > newAdults) {
      setInfants(newAdults);
    }
  };

  const handleConfirm = () => {
    // Final validation: ensure at least 1 adult
    if (adults < 1) {
      return;
    }
    setConfirmed(true);
    onConfirm({ adults, children, infants });
  };

  const CounterButton = ({ 
    value, 
    onChange, 
    min = 0, 
    max = 9 
  }: { 
    value: number; 
    onChange: (v: number) => void; 
    min?: number; 
    max?: number;
  }) => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min || confirmed}
        className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        −
      </button>
      <span className="w-6 text-center font-semibold text-lg">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max || confirmed}
        className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-lg font-medium hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        +
      </button>
    </div>
  );

  if (confirmed) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>✓</span>
        <span>
          {adults} adulte{adults > 1 ? "s" : ""}
          {children > 0 && `, ${children} enfant${children > 1 ? "s" : ""}`}
          {infants > 0 && `, ${infants} bébé${infants > 1 ? "s" : ""}`}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-4 max-w-xs">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Nombre de voyageurs
      </div>
      
      {/* Adults */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Adultes</div>
          <div className="text-xs text-muted-foreground">12 ans et +</div>
        </div>
        <CounterButton value={adults} onChange={handleAdultsChange} min={1} />
      </div>
      
      {/* Children */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Enfants</div>
          <div className="text-xs text-muted-foreground">2-11 ans</div>
        </div>
        <CounterButton value={children} onChange={setChildren} />
      </div>
      
      {/* Infants */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Bébés</div>
          <div className="text-xs text-muted-foreground">Moins de 2 ans</div>
        </div>
        <CounterButton value={infants} onChange={setInfants} max={adults} />
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
      >
        Confirmer ({adults + children + infants} voyageur{adults + children + infants > 1 ? "s" : ""})
      </button>
    </div>
  );
};

// Trip Type Confirmation Widget - Quick chips for roundtrip / oneway / multi
const TripTypeConfirmWidget = ({
  currentType = "roundtrip",
  onConfirm,
}: {
  currentType?: "roundtrip" | "oneway" | "multi";
  onConfirm: (tripType: "roundtrip" | "oneway" | "multi") => void;
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [selected, setSelected] = useState(currentType);

  const handleSelect = (type: "roundtrip" | "oneway" | "multi") => {
    setSelected(type);
    setConfirmed(true);
    onConfirm(type);
  };

  if (confirmed) {
    const label =
      selected === "roundtrip"
        ? "Aller-retour"
        : selected === "oneway"
        ? "Aller simple"
        : "Multi-destinations";
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>✓</span>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={() => handleSelect("roundtrip")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
          selected === "roundtrip"
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
      >
        ↔ Aller-retour
      </button>
      <button
        onClick={() => handleSelect("oneway")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
          selected === "oneway"
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
      >
        → Aller simple
      </button>
      <button
        onClick={() => handleSelect("multi")}
        className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
          selected === "multi"
            ? "bg-primary text-primary-foreground shadow-md"
            : "bg-muted text-foreground hover:bg-muted/80"
        )}
      >
        🔀 Multi-destinations
      </button>
    </div>
  );
};

// City Selection Widget - Select a city from a country
const CitySelectionWidget = ({
  citySelection,
  onSelect,
  isLoading = false,
}: {
  citySelection: CitySelectionData;
  onSelect: (cityName: string) => void;
  isLoading?: boolean;
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleSelect = (cityName: string) => {
    setSelectedCity(cityName);
    setConfirmed(true);
    onSelect(cityName);
  };

  if (confirmed && selectedCity) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium">
        <span>📍</span>
        <span>{selectedCity}, {citySelection.countryName}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-md">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Chargement des villes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border/50 max-w-md">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Choisir une ville en {citySelection.countryName}
      </div>
      
      <div className="space-y-2">
        {citySelection.cities.map((city, idx) => (
          <button
            key={city.name}
            onClick={() => handleSelect(city.name)}
            className={cn(
              "w-full text-left p-3 rounded-xl border transition-all",
              "bg-card hover:bg-primary/10 hover:border-primary/50",
              "border-border/50 group"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {city.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {city.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};


const MarkdownMessage = ({ content }: { content: string }) => (
  <ReactMarkdown
    components={{
      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      ul: ({ children }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
      li: ({ children }) => <li className="text-sm">{children}</li>,
      code: ({ children }) => (
        <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs">{children}</code>
      ),
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
          {children}
        </a>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

// Helper to convert FlightFormData to memory updates
function flightDataToMemory(flightData: FlightFormData): Partial<{
  departure: AirportInfo | null;
  arrival: AirportInfo | null;
  departureDate: Date | null;
  returnDate: Date | null;
  passengers: { adults: number; children: number; infants: number };
  tripType: "roundtrip" | "oneway" | "multi";
}> {
  const updates: ReturnType<typeof flightDataToMemory> = {};
  
  if (flightData.from) {
    updates.departure = { city: flightData.from };
  }
  if (flightData.to) {
    updates.arrival = { city: flightData.to };
  }
  if (flightData.departureDate) {
    updates.departureDate = new Date(flightData.departureDate);
  }
  if (flightData.returnDate) {
    updates.returnDate = new Date(flightData.returnDate);
  }
  // Handle new adults/children/infants format
  if (flightData.adults !== undefined || flightData.children !== undefined || flightData.infants !== undefined) {
    updates.passengers = { 
      adults: flightData.adults || 1, 
      children: flightData.children || 0, 
      infants: flightData.infants || 0 
    };
  } else if (flightData.passengers) {
    updates.passengers = { adults: flightData.passengers, children: 0, infants: 0 };
  }
  if (flightData.tripType) {
    updates.tripType = flightData.tripType;
  }
  
  return updates;
}

// Get field label in French
function getMissingFieldLabel(field: MissingField): string {
  switch (field) {
    case "departure": return "ville de départ";
    case "arrival": return "destination";
    case "departureDate": return "date de départ";
    case "returnDate": return "date de retour";
    case "passengers": return "nombre de voyageurs";
    default: return field;
  }
}

const PlannerChatComponent = forwardRef<PlannerChatRef, PlannerChatProps>(({ onAction }, ref) => {
  // Chat sessions hook for multi-conversation management
  const {
    sessions,
    activeSessionId,
    messages: storedMessages,
    updateMessages: updateStoredMessages,
    selectSession,
    createNewSession,
    deleteSession,
  } = useChatSessions();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Convert stored messages to ChatMessage (with widgets/typing state)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Sync from storedMessages when switching sessions (avoid feedback loop)
  useEffect(() => {
    setMessages(
      storedMessages.map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        isHidden: m.isHidden,
        hasSearchButton: m.hasSearchButton,
      }))
    );
  }, [activeSessionId]);

  // Persist chat history when messages change (debounced via hook)
  const persistMessages = useCallback(
    (msgs: ChatMessage[]) => {
      const toStore: StoredMessage[] = msgs
        .filter((m) => !m.isTyping)
        .map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          hasSearchButton: m.hasSearchButton,
          isHidden: m.isHidden,
        }))
        .slice(-200);
      updateStoredMessages(toStore);
    },
    [updateStoredMessages]
  );

  // Persist on message changes (excluding typing indicators)
  useEffect(() => {
    const nonTyping = messages.filter((m) => !m.isTyping);
    if (nonTyping.length > 0) {
      persistMessages(messages);
    }
  }, [messages, persistMessages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchButtonShownRef = useRef(false);
  const pendingTravelersWidgetRef = useRef(false); // Track if we need to show travelers widget after date selection
  const pendingTripDurationRef = useRef<string | null>(null); // Store trip duration for calculating return date
  const pendingPreferredMonthRef = useRef<string | null>(null); // Store preferred month for calendar navigation
  const citySelectionShownForCountryRef = useRef<string | null>(null); // Prevent duplicate city selection messages
  const pendingFromCountryRef = useRef<{ code: string; name: string } | null>(null); // Track departure country selection

  // When switching conversations, reset transient refs so workflow can restart cleanly
  useEffect(() => {
    searchButtonShownRef.current = false;
    pendingTravelersWidgetRef.current = false;
    pendingTripDurationRef.current = null;
    pendingPreferredMonthRef.current = null;
    citySelectionShownForCountryRef.current = null;
    pendingFromCountryRef.current = null;
    setIsLoading(false);
    setInput("");
  }, [activeSessionId]);
  
  // Access flight memory
  const { memory, updateMemory, resetMemory, isReadyToSearch, hasCompleteInfo, needsAirportSelection, missingFields, getMemorySummary } = useFlightMemory();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show appropriate message when we have complete info
  useEffect(() => {
    if (!hasCompleteInfo || searchButtonShownRef.current) return;
    
    const departure = memory.departure?.city || "départ";
    const arrival = memory.arrival?.city || "destination";
    const depCode = memory.departure?.iata ? ` (${memory.departure.iata})` : "";
    const arrCode = memory.arrival?.iata ? ` (${memory.arrival.iata})` : "";
    
    // Format dates
    const depDate = memory.departureDate ? format(memory.departureDate, "d MMMM yyyy", { locale: fr }) : "-";
    const retDate = memory.returnDate ? format(memory.returnDate, "d MMMM yyyy", { locale: fr }) : null;
    const travelers = memory.passengers.adults + memory.passengers.children;
    
    // Check if we need airports
    const needsDepartureAirport = needsAirportSelection.departure;
    const needsArrivalAirport = needsAirportSelection.arrival;
    
    if (needsDepartureAirport || needsArrivalAirport) {
      // We have cities but need airport selection - search for airports and show them
      searchButtonShownRef.current = true;
      
      const messageId = `airport-selection-${Date.now()}`;
      
      // Add typing indicator
      setMessages((prev) => [
        ...prev,
        { id: messageId, role: "assistant", text: "", isTyping: true },
      ]);
      
      // Fetch destination fact and airports in parallel
      const fetchAirportsAndFact = async () => {
        try {
          // Fetch airports for both cities if needed
          const [fromAirportsResult, toAirportsResult, factResult] = await Promise.all([
            needsDepartureAirport && memory.departure?.city 
              ? findNearestAirports(memory.departure.city, 3, memory.departure.countryCode)
              : null,
            needsArrivalAirport && memory.arrival?.city
              ? findNearestAirports(memory.arrival.city, 3, memory.arrival.countryCode)
              : null,
            memory.arrival?.city
              ? supabase.functions.invoke("destination-fact", {
                  body: { city: memory.arrival.city, country: memory.arrival.country }
                }).then(r => r.data?.fact || null).catch(() => null)
              : null,
          ]);
          
          // Build airport choices
          let dualChoices: DualAirportChoice | undefined;
          
          if (fromAirportsResult?.airports?.length || toAirportsResult?.airports?.length) {
            dualChoices = {};
            if (fromAirportsResult?.airports?.length) {
              dualChoices.from = {
                field: "from",
                cityName: memory.departure?.city || departure,
                airports: fromAirportsResult.airports,
              };
            }
            if (toAirportsResult?.airports?.length) {
              dualChoices.to = {
                field: "to",
                cityName: memory.arrival?.city || arrival,
                airports: toAirportsResult.airports,
              };
            }
          }
          
          // Build the message
          const factLine = factResult ? `\n\n💡 **Le saviez-vous ?** ${factResult}` : "";
          
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `Super ! Votre voyage **${departure} → ${arrival}** est configuré :\n\n📅 Départ : ${depDate}${retDate ? `\n📅 Retour : ${retDate}` : ""}\n👥 ${travelers} voyageur${travelers > 1 ? "s" : ""}${factLine}\n\nSélectionnez vos aéroports ci-dessous :`,
                    isTyping: false,
                    dualAirportChoices: dualChoices,
                  }
                : m
            )
          );
        } catch (error) {
          console.error("Error fetching airports/fact:", error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    text: `Super ! Votre voyage **${departure} → ${arrival}** est configuré.\n\n📅 Départ : ${depDate}${retDate ? `\n📅 Retour : ${retDate}` : ""}\n👥 ${travelers} voyageur${travelers > 1 ? "s" : ""}\n\nVeuillez sélectionner vos aéroports dans le panneau de droite.`,
                    isTyping: false,
                  }
                : m
            )
          );
        }
      };
      
      fetchAirportsAndFact();
    } else {
      // All airports selected - ready to search!
      searchButtonShownRef.current = true;
      
      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-auto-${Date.now()}`,
          role: "assistant",
          text: `Parfait ! Votre itinéraire **${departure}${depCode} → ${arrival}${arrCode}** est prêt !\n\n📅 Départ : ${depDate}${retDate ? `\n📅 Retour : ${retDate}` : ""}\n👥 ${travelers} voyageur${travelers > 1 ? "s" : ""}\n\nCliquez ci-dessous pour lancer la recherche. 🚀`,
          hasSearchButton: true,
        },
      ]);
    }
  }, [hasCompleteInfo, isReadyToSearch, memory, needsAirportSelection]);

  // Reset search button shown when memory is reset
  useEffect(() => {
    if (!memory.departure && !memory.arrival) {
      searchButtonShownRef.current = false;
    }
  }, [memory.departure, memory.arrival]);

  // Handle airport selection from buttons (single or dual)
  const handleAirportSelect = (messageId: string, field: "from" | "to", airport: Airport, isDual?: boolean) => {
    if (isDual) {
      // For dual selection, update the message to remove the selected column
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.dualAirportChoices) return m;
          
          const updated = { ...m.dualAirportChoices };
          if (field === "from") delete updated.from;
          if (field === "to") delete updated.to;
          
          // If both are now selected, remove the whole choices block
          const stillHasChoices = updated.from || updated.to;
          return { 
            ...m, 
            dualAirportChoices: stillHasChoices ? updated : undefined 
          };
        })
      );
    } else {
      // For single selection, remove the airport choices
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, airportChoices: undefined } : m
        )
      );
    }

    // Update flight memory with full airport info (keep all data, preserve existing country info)
    const existingInfo = field === "from" ? memory.departure : memory.arrival;
    const airportInfo: AirportInfo = {
      airport: airport.name,
      iata: airport.iata,
      city: airport.city_name,
      // Preserve existing country/countryCode if we had them (from city selection), otherwise use airport's code
      country: existingInfo?.country,
      countryCode: airport.country_code || existingInfo?.countryCode,
      lat: airport.lat,
      lng: airport.lon, // Note: Airport type uses 'lon' not 'lng'
    };
    
    if (field === "from") {
      updateMemory({ departure: airportInfo });
    } else {
      updateMemory({ arrival: airportInfo });
    }

    // Add brief inline confirmation (no duplicate IATA code)
    const confirmText = field === "from" 
      ? `✓ Départ : **${airport.name}**`
      : `✓ Arrivée : **${airport.name}**`;

    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-${Date.now()}-${field}`,
        role: "assistant",
        text: confirmText,
      },
    ]);

    // Notify parent to update the flight form
    onAction({ type: "selectAirport", field, airport });
  };

  // Handle date selection from widget
  const handleDateSelect = (messageId: string, dateType: "departure" | "return", date: Date) => {
    // Compute updated memory snapshot to avoid stale reads
    let nextMem = {
      ...memory,
      passengers: { ...memory.passengers },
    };

    if (dateType === "departure") {
      nextMem = { ...nextMem, departureDate: date };
      updateMemory({ departureDate: date });

      // If we have a pending trip duration, calculate return date
      if (pendingTripDurationRef.current) {
        const duration = pendingTripDurationRef.current;
        const match = duration.match(/(\d+)\s*(semaine|jour|week|day)/i);
        let computedReturn: Date | null = null;

        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          let days = num;
          if (unit.includes("semaine") || unit.includes("week")) {
            days = num * 7;
          }
          computedReturn = addDays(date, days);
        } else if (duration.toLowerCase().includes("semaine") || duration.toLowerCase().includes("week")) {
          computedReturn = addDays(date, 7);
        }

        if (computedReturn) {
          nextMem = { ...nextMem, returnDate: computedReturn };
          updateMemory({ returnDate: computedReturn });
        }

        pendingTripDurationRef.current = null;
      }
    } else {
      nextMem = { ...nextMem, returnDate: date };
      updateMemory({ returnDate: date });
    }

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Add confirmation message
    const confirmText = dateType === "departure"
      ? `✓ Date de départ : **${format(date, "d MMMM yyyy", { locale: fr })}**`
      : `✓ Date de retour : **${format(date, "d MMMM yyyy", { locale: fr })}**`;

    // Check if we need to show travelers widget next
    if (dateType === "departure" && pendingTravelersWidgetRef.current) {
      pendingTravelersWidgetRef.current = false;

      const computedReturnInfo = nextMem.returnDate
        ? ` Retour prévu le ${format(nextMem.returnDate, "d MMMM", { locale: fr })}.`
        : "";

      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-date-${Date.now()}`,
          role: "assistant",
          text: `${confirmText}${computedReturnInfo} Maintenant, combien êtes-vous ? 🧳`,
          widget: "travelersSelector",
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-date-${Date.now()}`,
          role: "assistant",
          text: confirmText,
        },
      ]);

      // Ask for next missing field if any (based on updated snapshot)
      setTimeout(() => askNextMissingField(nextMem), 0);
    }
  };

  // Handle travelers selection from widget
  const handleTravelersSelect = (messageId: string, travelers: { adults: number; children: number; infants: number }) => {
    // Update memory
    updateMemory({ passengers: travelers });

    // Remove widget from message (already handled by the component showing confirmation)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Build confirmation text
    const parts = [`${travelers.adults} adulte${travelers.adults > 1 ? "s" : ""}`];
    if (travelers.children > 0) {
      parts.push(`${travelers.children} enfant${travelers.children > 1 ? "s" : ""}`);
    }
    if (travelers.infants > 0) {
      parts.push(`${travelers.infants} bébé${travelers.infants > 1 ? "s" : ""}`);
    }

    // Now ask trip type confirmation before search
    setMessages((prev) => [
      ...prev,
      {
        id: `confirm-travelers-${Date.now()}`,
        role: "assistant",
        text: `Parfait, ${parts.join(", ")} ! C'est bien un aller-retour ?`,
        widget: "tripTypeConfirm",
      },
    ]);
  };

  // Handle trip type confirmation
  const handleTripTypeConfirm = (messageId: string, tripType: "roundtrip" | "oneway" | "multi") => {
    // Update memory
    updateMemory({ tripType });

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    if (tripType === "multi") {
      // Multi-destinations: ask for all destinations
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-multi-${Date.now()}`,
          role: "assistant",
          text: `Super ! Pour un voyage multi-destinations, indiquez-moi toutes vos étapes (ex: "Paris → Rome → Barcelone → Paris" ou listez vos villes). 🗺️`,
        },
      ]);
    } else {
      // Roundtrip or oneway: ready to search
      const label = tripType === "roundtrip" ? "Aller-retour" : "Aller simple";
      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-${Date.now()}`,
          role: "assistant",
          text: `Parfait, **${label}** confirmé ! Cliquez ci-dessous pour lancer la recherche. 🚀`,
          hasSearchButton: true,
        },
      ]);
    }
  };

  // Handle city selection from widget
  const handleCitySelect = async (messageId: string, cityName: string, countryName: string, countryCode: string) => {
    // Reset country selection ref to allow re-selection later
    citySelectionShownForCountryRef.current = null;
    
    // Update memory with the selected city AND country code (important for API calls)
    updateMemory({ arrival: { city: cityName, country: countryName, countryCode } });

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Determine which date widget to show based on what we know
    // Logic:
    // - If tripDuration is known → show datePicker (we can calculate return)
    // - If tripType is oneway → show datePicker
    // - Otherwise → show dateRangePicker (need both dates)
    const hasTripDuration = !!pendingTripDurationRef.current;
    const isOneway = memory.tripType === "oneway";
    
    // Show date widget next if dates are not set
    if (!memory.departureDate) {
      let widgetType: WidgetType;
      let messageText: string;
      
      if (hasTripDuration) {
        // Duration known → just need departure date
        widgetType = "datePicker";
        messageText = `Excellent choix, **${cityName}** ! 😊 Tu as mentionné ${pendingTripDurationRef.current}. Choisis ta date de départ :`;
      } else if (isOneway) {
        // One-way trip → just need departure date
        widgetType = "datePicker";
        messageText = `Excellent choix, **${cityName}** ! 😊 Quand souhaites-tu partir ?`;
      } else {
        // Need both dates
        widgetType = "dateRangePicker";
        messageText = `Excellent choix, **${cityName}** ! 😊 Choisis tes dates de voyage :`;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-date-after-city-${Date.now()}`,
          role: "assistant",
          text: messageText,
          widget: widgetType,
          widgetData: {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          },
        },
      ]);
    } else if (!memory.returnDate && memory.tripType !== "oneway") {
      // Have departure but not return
      if (hasTripDuration) {
        // Calculate return from duration
        const duration = pendingTripDurationRef.current!;
        const match = duration.match(/(\d+)\s*(semaine|jour|week|day)/i);
        let computedReturn: Date | null = null;

        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          let days = num;
          if (unit.includes("semaine") || unit.includes("week")) {
            days = num * 7;
          }
          computedReturn = addDays(memory.departureDate!, days);
        } else if (duration.toLowerCase().includes("semaine") || duration.toLowerCase().includes("week")) {
          computedReturn = addDays(memory.departureDate!, 7);
        }

        if (computedReturn) {
          updateMemory({ returnDate: computedReturn });
          pendingTripDurationRef.current = null;
          
          // Ask for travelers next
          setMessages((prev) => [
            ...prev,
            {
              id: `ask-travelers-after-city-${Date.now()}`,
              role: "assistant",
              text: `Parfait, **${cityName}** du ${format(memory.departureDate!, "d MMMM", { locale: fr })} au ${format(computedReturn, "d MMMM", { locale: fr })} ! Combien êtes-vous ?`,
              widget: "travelersSelector",
            },
          ]);
        }
      } else {
        // Need return date
        setMessages((prev) => [
          ...prev,
          {
            id: `ask-return-after-city-${Date.now()}`,
            role: "assistant",
            text: `Excellent choix, **${cityName}** ! Quand souhaites-tu revenir ?`,
            widget: "returnDatePicker",
            widgetData: {
              preferredMonth: pendingPreferredMonthRef.current || undefined,
            },
          },
        ]);
      }
    } else {
      // Dates are complete, ask for travelers if needed
      if (memory.passengers.adults < 1) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ask-travelers-after-city-${Date.now()}`,
            role: "assistant",
            text: `Excellent choix, **${cityName}** ! Combien êtes-vous ?`,
            widget: "travelersSelector",
          },
        ]);
      }
    }
  };

  // Fetch cities for a country and show the widget
  const fetchAndShowCities = async (messageId: string, countryCode: string, countryName: string) => {
    try {
      // We must call this edge function with query params (GET) so it has `country_code`.
      // (Using `supabase.functions.invoke` here would POST without query params and return 400.)

      const fetchResponse = await fetch(
        `https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/top-cities-by-country?country_code=${countryCode}&limit=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmJubWxmcGZmbXlqbWt3YmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDQ2MTQsImV4cCI6MjA3MzUyMDYxNH0.yrju-Pv4OlfU9Et-mRWg0GRHTusL7ZpJevqKemJFbuA",
          },
        }
      );

      const data = await fetchResponse.json();
      
      if (data.cities && data.cities.length > 0) {
        const citySelection: CitySelectionData = {
          countryCode,
          countryName,
          cities: data.cities.map((c: any) => ({
            name: c.name,
            description: c.description || `Ville importante de ${countryName}`,
            population: c.population,
          })),
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isTyping: false,
                  widget: "citySelector",
                  widgetData: { ...m.widgetData, citySelection },
                }
              : m
          )
        );
      } else {
        // No cities found, ask manually
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  text: `${countryName} est une destination fascinante ! Dans quelle ville souhaites-tu aller ?`,
                  isTyping: false,
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                text: `${countryName} est une destination fascinante ! Dans quelle ville souhaites-tu aller ?`,
                isTyping: false,
              }
            : m
        )
      );
    }
  };

  // Fetch and show cities for departure country selection
  const fetchAndShowCitiesForDeparture = async (messageId: string, countryCode: string, countryName: string) => {
    try {
      const fetchResponse = await fetch(
        `https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/top-cities-by-country?country_code=${countryCode}&limit=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmJubWxmcGZmbXlqbWt3YmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDQ2MTQsImV4cCI6MjA3MzUyMDYxNH0.yrju-Pv4OlfU9Et-mRWg0GRHTusL7ZpJevqKemJFbuA",
          },
        }
      );

      const data = await fetchResponse.json();
      
      if (data.cities && data.cities.length > 0) {
        const citySelection: CitySelectionData = {
          countryCode,
          countryName,
          cities: data.cities.map((c: any) => ({
            name: c.name,
            description: c.description || `Ville importante de ${countryName}`,
            population: c.population,
          })),
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  isTyping: false,
                  widget: "citySelector",
                  widgetData: { 
                    ...m.widgetData, 
                    citySelection,
                    isDeparture: true, // Mark as departure city selection
                  },
                }
              : m
          )
        );
      } else {
        // No cities found, ask manually
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  text: `D'où partez-vous en ${countryName} ? Indiquez-moi la ville.`,
                  isTyping: false,
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Error fetching departure cities:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                text: `D'où partez-vous en ${countryName} ? Indiquez-moi la ville.`,
                isTyping: false,
              }
            : m
        )
      );
    }
  };

  // Handle departure city selection (from country)
  const handleDepartureCitySelect = async (messageId: string, cityName: string, countryName: string, countryCode: string) => {
    // Update memory with the selected departure city AND country code (important for API calls)
    updateMemory({ departure: { city: cityName, country: countryName, countryCode } });
    pendingFromCountryRef.current = null;

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Now check if we need to ask for destination or continue flow
    if (!memory.arrival?.city) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-destination-${Date.now()}`,
          role: "assistant",
          text: `Parfait, départ de **${cityName}** ! 😊 Où souhaitez-vous aller ?`,
        },
      ]);
    } else {
      // Destination already set, continue with dates
      askNextMissingField();
    }
  };

  // Handle date range selection (both departure AND return)
  const handleDateRangeSelect = (messageId: string, departure: Date, returnDate: Date) => {
    // Update memory with both dates
    updateMemory({ departureDate: departure, returnDate: returnDate });
    
    // Clear pending refs since dates are now set
    pendingTripDurationRef.current = null;
    pendingPreferredMonthRef.current = null;

    // Remove widget from message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, widget: undefined } : m
      )
    );

    // Get current passengers count (fresh read from memory after update)
    const currentPassengers = memory.passengers;
    const needsTravelersWidget = pendingTravelersWidgetRef.current || currentPassengers.adults < 1;
    
    // Reset ref
    pendingTravelersWidgetRef.current = false;
    
    if (needsTravelersWidget) {
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-dates-${Date.now()}`,
          role: "assistant",
          text: `✓ **${format(departure, "d MMMM", { locale: fr })}** → **${format(returnDate, "d MMMM yyyy", { locale: fr })}**. Combien êtes-vous ? 🧳`,
          widget: "travelersSelector",
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: `confirm-dates-${Date.now()}`,
          role: "assistant",
          text: `✓ Dates confirmées : **${format(departure, "d MMMM", { locale: fr })}** → **${format(returnDate, "d MMMM yyyy", { locale: fr })}**`,
        },
      ]);
      
      // Ask for next missing field if any
      setTimeout(() => askNextMissingField(), 300);
    }
  };

  // Ask for the next missing field
  const askNextMissingField = (memOverride?: typeof memory) => {
    const mem = memOverride ?? memory;

    // Compute missing fields from current memory snapshot (avoid stale state/race conditions)
    const computedMissing: MissingField[] = [];
    if (!mem.departure?.iata && !mem.departure?.city) computedMissing.push("departure");
    if (!mem.arrival?.iata && !mem.arrival?.city) computedMissing.push("arrival");
    if (!mem.departureDate) computedMissing.push("departureDate");
    if (mem.tripType === "roundtrip" && !mem.returnDate) computedMissing.push("returnDate");
    if (mem.passengers.adults < 1) computedMissing.push("passengers");

    if (computedMissing.length === 0) return;

    const nextField = computedMissing[0];

    if (nextField === "departureDate") {
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-date-${Date.now()}`,
          role: "assistant",
          text: "Quand souhaitez-vous partir ? 📅",
          // If roundtrip and no duration, prefer a range picker to minimize interactions
          widget: mem.tripType === "roundtrip" && !pendingTripDurationRef.current ? "dateRangePicker" : "datePicker",
          widgetData: {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          },
        },
      ]);
    } else if (nextField === "returnDate" && mem.tripType === "roundtrip") {
      setMessages((prev) => [
        ...prev,
        {
          id: `ask-return-date-${Date.now()}`,
          role: "assistant",
          text: "Et quand souhaitez-vous revenir ? 📅",
          widget: "returnDatePicker",
          widgetData: {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          },
        },
      ]);
    }
  };

  // Stream response from SSE
  const streamResponse = async (
    apiMessages: { role: string; content: string }[],
    messageId: string
  ): Promise<{ content: string; flightData: FlightFormData | null }> => {
    let fullContent = "";
    let flightData: FlightFormData | null = null;

    // Include memory context in the request
    const memoryContext = getMemorySummary();
    const contextMessage = memoryContext 
      ? `[CONTEXTE MÉMOIRE] ${memoryContext}\n[CHAMPS MANQUANTS] ${missingFields.map(getMissingFieldLabel).join(", ") || "Aucun - prêt à chercher"}`
      : "";

    const response = await fetch(
      `https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/planner-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpbmJubWxmcGZmbXlqbWt3YmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NDQ2MTQsImV4cCI6MjA3MzUyMDYxNH0.yrju-Pv4OlfU9Et-mRWg0GRHTusL7ZpJevqKemJFbuA",
        },
        body: JSON.stringify({ 
          messages: apiMessages, 
          stream: true,
          memoryContext: contextMessage,
          missingFields: missingFields,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Stream request failed");
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            
            if (parsed.type === "flightData" && parsed.flightData) {
              flightData = parsed.flightData;
            } else if (parsed.type === "content" && parsed.content) {
              fullContent += parsed.content;
              // Update message with new content
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === messageId
                    ? { ...m, text: fullContent, isStreaming: true, isTyping: false }
                    : m
                )
              );
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // Mark streaming as complete
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isStreaming: false } : m
      )
    );

    return { content: fullContent, flightData };
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    injectSystemMessage: async (event: CountrySelectionEvent) => {
      const countryCode = event.country.country_code;
      
      // Prevent duplicate messages for the same country
      if (citySelectionShownForCountryRef.current === countryCode) {
        console.log("[PlannerChat] Skipping duplicate city selection for", countryCode);
        return;
      }
      citySelectionShownForCountryRef.current = countryCode;
      
      const fieldName = event.field === "from" ? "départ" : "destination";
      const countryName = event.country.name;
      
      // Instead of calling the AI, directly show the city selection widget
      setIsLoading(true);
      const messageId = `city-select-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { 
          id: messageId, 
          role: "assistant", 
          text: `Je vois que vous avez sélectionné **${countryName}**. Dans quelle ville de ce pays souhaitez-vous ${event.field === "from" ? "partir" : "arriver"} ?`, 
          isTyping: true 
        },
      ]);

      // Fetch cities directly
      fetchAndShowCities(messageId, countryCode, countryName);
      setIsLoading(false);
    },

    askAirportChoice: (choice: AirportChoice) => {
      const fieldLabel = choice.field === "from" ? "départ" : "destination";
      const messageId = `airport-choice-${Date.now()}`;
      
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: `🛫 La ville de **${choice.cityName}** a plusieurs aéroports. Lequel souhaitez-vous utiliser comme ${fieldLabel} ?`,
          airportChoices: choice,
        },
      ]);
    },

    askDualAirportChoice: (choices: DualAirportChoice) => {
      const messageId = `dual-airport-choice-${Date.now()}`;
      
      // Build a message describing both selections needed
      const parts: string[] = [];
      if (choices.from) parts.push(`**${choices.from.cityName}** (départ)`);
      if (choices.to) parts.push(`**${choices.to.cityName}** (arrivée)`);
      
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          role: "assistant",
          text: `Plusieurs aéroports sont disponibles pour ${parts.join(" et ")}. Sélectionnez vos préférences :`,
          dualAirportChoices: choices,
        },
      ]);
    },

    offerFlightSearch: (from: string, to: string) => {
      const fromCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from;
      const toCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to;
      
      setMessages((prev) => [
        ...prev,
        {
          id: `search-ready-${Date.now()}`,
          role: "assistant",
          text: `Parfait ! Votre itinéraire **${fromCode} → ${toCode}** est prêt. Cliquez ci-dessous pour lancer la recherche de vols.`,
          hasSearchButton: true,
        },
      ]);
    },
  }));

  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: userText,
    };

    // Clear any active widgets when user sends a message (user chose to type instead of click)
    setMessages((prev) => [
      ...prev.map((m) => m.widget ? { ...m, widget: undefined } : m),
      userMessage,
    ]);
    setInput("");
    setIsLoading(true);
    
    // Reset city selection ref since user is typing (might be changing their mind)
    citySelectionShownForCountryRef.current = null;

    const messageId = `bot-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: "assistant", text: "", isTyping: true },
    ]);

    try {
      const apiMessages = messages
        .filter((m) => !m.isTyping && m.id !== "welcome")
        .map((m) => ({ role: m.role === "system" ? "user" : m.role, content: m.text }));
      apiMessages.push({ role: "user", content: userText });

      const { content, flightData } = await streamResponse(apiMessages, messageId);
      const { cleanContent, action } = parseAction(content || "Désolé, je n'ai pas pu répondre.");

      // Detect which widget to show (PRIORITY: only ONE widget at a time)
      let showDateWidget = false;
      let showTravelersWidget = false;

      // We'll build an up-to-date memory snapshot to avoid stale state in this tick
      let nextMem = {
        ...memory,
        passengers: { ...memory.passengers },
      };

      if (flightData && Object.keys(flightData).length > 0) {
        // Check for city selection (country instead of city) - handle BOTH from and to
        const needsDestinationCitySelection = flightData.needsCitySelection === true && flightData.toCountryCode;
        const needsDepartureCitySelection = flightData.fromCountryCode && !flightData.from;
        
        // Check widget flags - prioritize city selection first, then date widget
        const skipDateWidget = needsDestinationCitySelection || needsDepartureCitySelection;
        showDateWidget = flightData.needsDateWidget === true && !skipDateWidget;
        showTravelersWidget = flightData.needsTravelersWidget === true;

        // Store pending widgets for sequential display
        if (showDateWidget && showTravelersWidget) {
          pendingTravelersWidgetRef.current = true;
        }

        // Store trip duration for return date calculation
        if (flightData.tripDuration) {
          pendingTripDurationRef.current = flightData.tripDuration;
        }

        // Store preferred month for calendar navigation
        if (flightData.preferredMonth) {
          pendingPreferredMonthRef.current = flightData.preferredMonth;
        }

        // Update memory with extracted data (excluding widget flags)
        const memoryUpdates = flightDataToMemory(flightData);
        updateMemory(memoryUpdates);

        // Apply updates locally for immediate, consistent decisions
        nextMem = {
          ...nextMem,
          ...memoryUpdates,
          passengers: memoryUpdates.passengers
            ? { ...nextMem.passengers, ...memoryUpdates.passengers }
            : nextMem.passengers,
        };

        // Handle departure country (fromCountryCode) - store for later if destination also needs selection
        if (needsDepartureCitySelection && flightData.fromCountryCode && flightData.fromCountryName) {
          pendingFromCountryRef.current = { code: flightData.fromCountryCode, name: flightData.fromCountryName };
        }

        // If destination country detected, fetch cities and show widget (priority over departure)
        if (needsDestinationCitySelection && flightData.toCountryCode && flightData.toCountryName) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, text: cleanContent, isTyping: false, isStreaming: false }
                : m
            )
          );
          fetchAndShowCities(messageId, flightData.toCountryCode, flightData.toCountryName);
          setIsLoading(false);
          return;
        }
        
        // If only departure country needs selection (no destination country)
        if (needsDepartureCitySelection && !needsDestinationCitySelection && flightData.fromCountryCode && flightData.fromCountryName) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, text: cleanContent, isTyping: false, isStreaming: false }
                : m
            )
          );
          // Fetch cities for departure country
          fetchAndShowCitiesForDeparture(messageId, flightData.fromCountryCode, flightData.fromCountryName);
          setIsLoading(false);
          return;
        }

        const destCity = flightData.to;
        if (destCity) {
          const coords = getCityCoords(destCity.toLowerCase().split(",")[0].trim());
          if (coords) {
            onAction({ type: "tabAndZoom", tab: "flights", center: coords, zoom: 8 });
          } else {
            onAction({ type: "tab", tab: "flights" });
          }
        } else {
          onAction({ type: "tab", tab: "flights" });
        }

        onAction({ type: "updateFlight", flightData });
      } else if (action) {
        onAction(action);
      }

      // Determine widget to show - ONLY ONE at a time, with priority order:
      // - If user hasn't given any dates: prefer a single interaction
      //   - If duration is known: pick departure only (return will be computed)
      //   - Else (roundtrip): pick a range (departure + return)
      // - If departure is known but return is missing (roundtrip): ask return
      // - Else travelers if needed
      let widget: WidgetType | undefined;

      if (showDateWidget) {
        // Default tripType is "roundtrip" if not yet defined
        const effectiveTripType = nextMem.tripType || "roundtrip";
        
        if (!nextMem.departureDate) {
          if (pendingTripDurationRef.current) {
            // Duration known: just pick departure, return is calculated
            widget = "datePicker";
          } else if (effectiveTripType === "oneway") {
            // One-way: only departure needed
            widget = "datePicker";
          } else {
            // Roundtrip (default) or multi: show range picker for departure + return
            widget = "dateRangePicker";
          }
        } else if (effectiveTripType === "roundtrip" && !nextMem.returnDate) {
          widget = "returnDatePicker";
        }
      }

      if (!widget && showTravelersWidget) {
        widget = "travelersSelector";
      }

      // Build widget data
      const widgetData = widget
        ? {
            preferredMonth: pendingPreferredMonthRef.current || undefined,
            tripDuration: pendingTripDurationRef.current || undefined,
          }
        : undefined;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, text: cleanContent, isTyping: false, isStreaming: false, widget, widgetData }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to get chat response:", err);
      
      // Reset pending refs on error to avoid stale state
      pendingTravelersWidgetRef.current = false;
      pendingTripDurationRef.current = null;
      pendingPreferredMonthRef.current = null;
      pendingFromCountryRef.current = null;
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
                isTyping: false,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      // Always restore focus to the input to minimize clicks
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <aside className="h-full w-full bg-background flex flex-col relative overflow-hidden">
      {/* Chat History Sidebar */}
      <ChatHistorySidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={(sessionId) => {
          selectSession(sessionId);
        }}
        onNewSession={() => {
          createNewSession();
          resetMemory();
        }}
        onDeleteSession={deleteSession}
      />

      {/* Header with history button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-4 w-4" />
          <span className="text-sm font-medium">Historique</span>
        </button>
        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
          {sessions.find((s) => s.id === activeSessionId)?.title || "Nouvelle conversation"}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
          {messages.filter((m) => !m.isHidden).map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-4",
                m.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white"
                )}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <img src={logo} alt="Travliaq" className="h-6 w-6 object-contain" />
                )}
              </div>

              {/* Message content */}
              <div
                className={cn(
                  "flex-1 min-w-0",
                  m.role === "user" ? "text-right" : ""
                )}
              >
                <div
                  className={cn(
                    "inline-block text-sm leading-relaxed px-4 py-3 rounded-2xl max-w-[85%]",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground text-left"
                      : "bg-muted text-foreground text-left"
                  )}
                >
                  {m.isTyping ? (
                    <div className="flex gap-1 py-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    <>
                      <MarkdownMessage content={m.text} />
                      {m.isStreaming && (
                        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
                      )}
                    </>
                  )}
                </div>

                {/* Airport choice buttons - single */}
                {m.airportChoices && (
                  <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
                    {m.airportChoices.airports.map((airport) => (
                      <AirportButton
                        key={airport.iata}
                        airport={airport}
                        onClick={() => handleAirportSelect(m.id, m.airportChoices!.field, airport, false)}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                )}

                {/* Dual airport selection (from + to side by side) */}
                {m.dualAirportChoices && (
                  <DualAirportSelection
                    choices={m.dualAirportChoices}
                    onSelect={(field, airport) => handleAirportSelect(m.id, field, airport, true)}
                    disabled={isLoading}
                  />
                )}

                {/* Date Picker Widget */}
                {m.widget === "datePicker" && (
                  <DatePickerWidget
                    label="Choisir la date de départ"
                    value={memory.departureDate}
                    onChange={(date) => handleDateSelect(m.id, "departure", date)}
                    preferredMonth={m.widgetData?.preferredMonth}
                  />
                )}
                {m.widget === "returnDatePicker" && (
                  <DatePickerWidget
                    label="Choisir la date de retour"
                    value={memory.returnDate}
                    onChange={(date) => handleDateSelect(m.id, "return", date)}
                    minDate={memory.departureDate || undefined}
                    preferredMonth={m.widgetData?.preferredMonth}
                  />
                )}

                {/* Date Range Picker Widget (departure + return) */}
                {m.widget === "dateRangePicker" && (
                  <DateRangePickerWidget
                    tripDuration={m.widgetData?.tripDuration}
                    preferredMonth={m.widgetData?.preferredMonth}
                    onConfirm={(dep, ret) => handleDateRangeSelect(m.id, dep, ret)}
                  />
                )}

                {/* Travelers Selector Widget */}
                {m.widget === "travelersSelector" && (
                  <TravelersWidget
                    initialValues={memory.passengers}
                    onConfirm={(travelers) => handleTravelersSelect(m.id, travelers)}
                  />
                )}

                {/* Trip Type Confirmation Widget */}
                {m.widget === "tripTypeConfirm" && (
                  <TripTypeConfirmWidget
                    currentType={memory.tripType}
                    onConfirm={(tripType) => handleTripTypeConfirm(m.id, tripType)}
                  />
                )}

                {/* City Selection Widget */}
                {m.widget === "citySelector" && m.widgetData?.citySelection && (
                  <CitySelectionWidget
                    citySelection={m.widgetData.citySelection}
                    onSelect={(cityName) => {
                      const { countryCode, countryName } = m.widgetData!.citySelection!;
                      // Check if this is a departure or destination city selection
                      if (m.widgetData?.isDeparture) {
                        handleDepartureCitySelect(m.id, cityName, countryName, countryCode);
                      } else {
                        handleCitySelect(m.id, cityName, countryName, countryCode);
                      }
                    }}
                  />
                )}

                {/* Flight search button */}
                {m.hasSearchButton && (
                  <div className="mt-3">
                    <button
                      onClick={() => onAction({ type: "triggerFlightSearch" })}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                      <Plane className="h-4 w-4" />
                      Rechercher les vols maintenant
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-muted/30 p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              placeholder="Envoyer un message..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
              style={{ minHeight: "40px", maxHeight: "120px" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                  // Ensure focus stays on input (minimize clicks)
                  setTimeout(() => inputRef.current?.focus(), 0);
                }
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || isLoading}
              className={cn(
                "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
                input.trim() && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Envoyer"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Tapez une destination ou demandez des vols, activités, hébergements
          </p>
        </div>
      </div>
    </aside>
  );
});

PlannerChatComponent.displayName = "PlannerChat";

export default PlannerChatComponent;
