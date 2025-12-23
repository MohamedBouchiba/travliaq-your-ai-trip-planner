import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types from the external API response
interface ExternalFlightSegment {
  departure_airport: {
    airport_name: string;
    airport_code: string;
    time: string; // "2026-1-12 15:00"
  };
  arrival_airport: {
    airport_name: string;
    airport_code: string;
    time: string;
  };
  duration: {
    raw: number; // minutes
    text: string;
  };
  airline: string;
  airline_logo: string;
  flight_number: string;
  aircraft: string;
  seat: string;
  legroom: string;
  extensions: string[];
  travel_class: string | null;
  overnight: boolean | null;
}

interface ExternalLayover {
  duration: number; // minutes
  airport_name: string;
  airport_code: string;
  duration_label: string;
  city: string;
  overnight: boolean | null;
}

interface ExternalItinerary {
  flights: ExternalFlightSegment[];
  layovers: ExternalLayover[] | null;
  total_duration: number; // minutes
  price: number;
  booking_token: string | null;
  carbon_emissions: {
    CO2e: number;
    typical_for_this_route: number;
    difference_percent: number;
    higher: number;
  };
  bags: {
    carry_on: number | null;
    checked: number | null;
  };
  airline_logo: string;
  delay: number;
  self_transfer: boolean;
  departure_time: string;
  arrival_time: string;
  stops: number;
  airline: string | null;
}

interface ExternalApiResponse {
  itineraries: ExternalItinerary[];
  next_token: string | null;
}

// Internal types we return to the frontend
interface FlightSegment {
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  departureAirportName: string;
  arrivalAirport: string;
  arrivalAirportName: string;
  duration: string;
  durationMinutes: number;
  airline: string;
  airlineLogo: string;
  flightNumber: string;
  aircraft: string;
  legroom: string;
  seatInfo: string;
  extensions: string[];
}

interface Layover {
  duration: number;
  durationLabel: string;
  airportCode: string;
  airportName: string;
  city: string;
  overnight: boolean;
}

interface CarbonEmissions {
  co2e: number;
  typicalForRoute: number;
  differencePercent: number;
  isLower: boolean;
}

interface Baggage {
  carryOn: number;
  checked: number;
}

interface FlightOffer {
  id: string;
  price: number;
  currency: string;
  outbound: FlightSegment[];
  inbound?: FlightSegment[];
  layovers: Layover[];
  stops: number;
  totalDuration: string;
  totalDurationMinutes: number;
  cabinClass: string;
  airlineLogo: string;
  airline: string;
  carbonEmissions: CarbonEmissions;
  baggage: Baggage;
  selfTransfer: boolean;
  isBestPrice?: boolean;
  isFastest?: boolean;
  isLowestEmissions?: boolean;
  hasNightLayover?: boolean;
}

// Parse time from "2026-1-12 15:00" format
function parseTime(timeStr: string): string {
  const parts = timeStr.split(' ');
  if (parts.length === 2) {
    return parts[1]; // Return just "15:00"
  }
  return timeStr;
}

// Format duration from minutes
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

// Transform external segment to internal format
function transformSegment(segment: ExternalFlightSegment): FlightSegment {
  return {
    departureTime: parseTime(segment.departure_airport.time),
    arrivalTime: parseTime(segment.arrival_airport.time),
    departureAirport: segment.departure_airport.airport_code,
    departureAirportName: segment.departure_airport.airport_name,
    arrivalAirport: segment.arrival_airport.airport_code,
    arrivalAirportName: segment.arrival_airport.airport_name,
    duration: segment.duration.text,
    durationMinutes: segment.duration.raw,
    airline: segment.airline,
    airlineLogo: segment.airline_logo,
    flightNumber: segment.flight_number,
    aircraft: segment.aircraft,
    legroom: segment.legroom || "",
    seatInfo: segment.seat || "",
    extensions: segment.extensions || [],
  };
}

// Transform external layover to internal format
function transformLayover(layover: ExternalLayover): Layover {
  return {
    duration: layover.duration,
    durationLabel: layover.duration_label,
    airportCode: layover.airport_code,
    airportName: layover.airport_name,
    city: layover.city,
    overnight: layover.overnight || false,
  };
}

// Transform full itinerary to FlightOffer
function transformItinerary(itinerary: ExternalItinerary, index: number, currency: string): FlightOffer {
  const segments = itinerary.flights.map(transformSegment);
  const layovers = itinerary.layovers?.map(transformLayover) || [];
  const hasNightLayover = layovers.some(l => l.overnight);
  
  // Get main airline from first segment or itinerary
  const mainAirline = itinerary.airline || segments[0]?.airline || "Unknown";
  const mainAirlineLogo = itinerary.airline_logo || segments[0]?.airlineLogo || "";
  
  return {
    id: `flight-${index}-${Date.now()}`,
    price: itinerary.price,
    currency,
    outbound: segments,
    layovers,
    stops: layovers.length,
    totalDuration: formatDuration(itinerary.total_duration),
    totalDurationMinutes: itinerary.total_duration,
    cabinClass: segments[0]?.extensions?.find(e => e.includes("class"))?.split(" ")[0] || "Économique",
    airlineLogo: mainAirlineLogo,
    airline: mainAirline,
    carbonEmissions: {
      co2e: itinerary.carbon_emissions.CO2e,
      typicalForRoute: itinerary.carbon_emissions.typical_for_this_route,
      differencePercent: itinerary.carbon_emissions.difference_percent,
      isLower: itinerary.carbon_emissions.difference_percent < 0,
    },
    baggage: {
      carryOn: itinerary.bags.carry_on || 0,
      checked: itinerary.bags.checked || 0,
    },
    selfTransfer: itinerary.self_transfer,
    hasNightLayover,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const {
      origin,           // IATA code
      destination,      // IATA code
      departureDate,    // YYYY-MM-DD
      returnDate,       // YYYY-MM-DD (optional)
      adults = 1,
      children = 0,
      cabinClass = "ECONOMY",
      currency = "EUR",
      languageCode = "fr",
      countryCode = "FR",
    } = body;

    console.log(`[flight-search] Searching flights ${origin} → ${destination} on ${departureDate}${returnDate ? ` (return: ${returnDate})` : ''}`);

    // Build request to external API
    const apiRequest = {
      departure_id: origin,
      arrival_id: destination,
      outbound_date: departureDate,
      return_date: returnDate || undefined,
      adults,
      children,
      travel_class: cabinClass.toUpperCase(),
      currency,
      language_code: languageCode,
      country_code: countryCode,
    };

    // Remove undefined values
    const cleanRequest = Object.fromEntries(
      Object.entries(apiRequest).filter(([_, v]) => v !== undefined)
    );

    console.log(`[flight-search] Calling external API:`, JSON.stringify(cleanRequest));

    const response = await fetch('https://travliaq-api-production.up.railway.app/flight-search', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[flight-search] API error: ${response.status} - ${errorText}`);
      throw new Error(`External API returned ${response.status}`);
    }

    const data: ExternalApiResponse = await response.json();
    console.log(`[flight-search] Received ${data.itineraries?.length || 0} itineraries`);

    if (!data.itineraries || data.itineraries.length === 0) {
      return new Response(
        JSON.stringify({ flights: [], count: 0, searchId: crypto.randomUUID() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform itineraries to our format
    const flights = data.itineraries.map((it, idx) => transformItinerary(it, idx, currency));

    // Sort by price by default
    flights.sort((a, b) => a.price - b.price);

    // Mark best price (first one after sorting)
    if (flights.length > 0) {
      flights[0].isBestPrice = true;
    }

    // Find fastest flight
    const fastestIndex = flights.reduce((minIdx, flight, idx, arr) => 
      flight.totalDurationMinutes < arr[minIdx].totalDurationMinutes ? idx : minIdx
    , 0);
    if (fastestIndex !== 0) {
      flights[fastestIndex].isFastest = true;
    }

    // Find lowest emissions
    const lowestEmissionsIndex = flights.reduce((minIdx, flight, idx, arr) => 
      flight.carbonEmissions.co2e < arr[minIdx].carbonEmissions.co2e ? idx : minIdx
    , 0);
    if (lowestEmissionsIndex !== 0 && lowestEmissionsIndex !== fastestIndex) {
      flights[lowestEmissionsIndex].isLowestEmissions = true;
    }

    const result = {
      flights,
      count: flights.length,
      searchId: crypto.randomUUID(),
    };

    console.log(`[flight-search] Returning ${flights.length} flights`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[flight-search] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error', flights: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
