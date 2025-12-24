import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarPriceDay {
  departure: string;
  price: number;
  return_date?: string;
}

interface ExternalApiResponse {
  prices: CalendarPriceDay[];
  currency: string;
  trip_type: string;
}

interface InternalPriceData {
  [date: string]: {
    price: number;
    returnDate?: string;
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
      startDate,        // YYYY-MM-DD (start of calendar range)
      endDate,          // YYYY-MM-DD (end of calendar range)
      adults = 1,
      children = 0,
      tripType = "ROUND", // ONE_WAY or ROUND
      tripDays = 7,       // Days between outbound/return for round trips
      cabinClass = "ECONOMY",
      currency = "EUR",
      countryCode = "FR",
    } = body;

    if (!origin || !destination || !startDate || !endDate) {
      console.log("[calendar-prices] Missing required parameters");
      return new Response(
        JSON.stringify({ prices: null, error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[calendar-prices] Fetching prices for ${origin} → ${destination} from ${startDate} to ${endDate}`);

    // Build request to external API
    const apiRequest = {
      departure_id: origin,
      arrival_id: destination,
      outbound_date: startDate,
      start_date: startDate,
      end_date: endDate,
      adults,
      children,
      trip_type: tripType.toUpperCase(),
      trip_days: tripDays,
      travel_class: cabinClass.toUpperCase(),
      currency,
      country_code: countryCode,
    };

    console.log(`[calendar-prices] Calling external API:`, JSON.stringify(apiRequest));

    const response = await fetch('https://travliaq-api-production.up.railway.app/calendar-prices', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[calendar-prices] API error: ${response.status} - ${errorText}`);
      
      // Return null prices instead of error for graceful degradation
      return new Response(
        JSON.stringify({ prices: null, currency }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: ExternalApiResponse = await response.json();
    console.log(`[calendar-prices] Received ${data.prices?.length || 0} price entries`);

    if (!data.prices || data.prices.length === 0) {
      return new Response(
        JSON.stringify({ prices: null, currency: data.currency || currency }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform to a map keyed by date for easy lookup
    const pricesByDate: InternalPriceData = {};
    let minPrice = Infinity;
    let minPriceDate = "";

    for (const day of data.prices) {
      pricesByDate[day.departure] = {
        price: day.price,
        returnDate: day.return_date,
      };
      
      if (day.price < minPrice) {
        minPrice = day.price;
        minPriceDate = day.departure;
      }
    }

    const result = {
      prices: pricesByDate,
      currency: data.currency || currency,
      tripType: data.trip_type || tripType,
      cheapestDate: minPriceDate,
      cheapestPrice: minPrice === Infinity ? null : minPrice,
    };

    console.log(`[calendar-prices] Returning ${Object.keys(pricesByDate).length} days, cheapest: ${minPriceDate} at ${minPrice}${currency}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[calendar-prices] Error:', error);
    return new Response(
      JSON.stringify({ prices: null, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
