import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CityInfo {
  name: string;
  country: string;
  population: number;
  description?: string;
  highlights?: string[];
}

interface ApiResponse {
  cities: CityInfo[];
  country_name: string;
  country_code: string;
}

// Fallback city descriptions when API doesn't provide them
const cityDescriptions: Record<string, string> = {
  // Qatar
  "doha": "Capitale moderne du Qatar, mêlant gratte-ciels futuristes et souks traditionnels. Parfait pour le luxe et la culture.",
  "al wakrah": "Ville côtière authentique avec un charmant souk et des plages paisibles, à proximité de Doha.",
  // France
  "paris": "Ville lumière emblématique, capitale de l'art, de la gastronomie et de la mode. Incontournable !",
  "marseille": "Port méditerranéen vibrant avec le Vieux-Port, les calanques et une cuisine provençale exceptionnelle.",
  "lyon": "Capitale mondiale de la gastronomie, riche en histoire et patrimoine architectural Renaissance.",
  "toulouse": "La ville rose, capitale de l'aéronautique européenne avec un charme méridional unique.",
  "nice": "Perle de la Côte d'Azur avec sa promenade des Anglais et son ensoleillement légendaire.",
  // USA
  "new york": "La ville qui ne dort jamais : Times Square, Central Park, Broadway et une énergie incomparable.",
  "los angeles": "Capitale du divertissement, plages mythiques et le glamour d'Hollywood.",
  "chicago": "Architecture spectaculaire, scène jazz légendaire et deep-dish pizza authentique.",
  "miami": "Art déco, plages de sable blanc et vie nocturne latine vibrante.",
  "las vegas": "Capitale mondiale du divertissement avec ses casinos, shows et hôtels démesurés.",
  // Japan
  "tokyo": "Mégapole fascinante entre tradition et ultra-modernité, temples et quartiers branchés.",
  "osaka": "Capitale culinaire du Japon avec un caractère plus décontracté que Tokyo.",
  "kyoto": "Ancienne capitale impériale aux milliers de temples et jardins zen.",
  // Spain
  "madrid": "Capitale espagnole avec le Prado, la vie nocturne et la passion du football.",
  "barcelona": "Gaudí, plages urbaines, tapas et une atmosphère catalane unique.",
  "valencia": "Cité des Arts et Sciences, paella authentique et fallas spectaculaires.",
  "seville": "Berceau du flamenco avec une architecture mudéjare à couper le souffle.",
  // Italy
  "rome": "Ville éternelle avec le Colisée, le Vatican et 3000 ans d'histoire.",
  "milan": "Capitale de la mode et du design, avec la Cène de Vinci et le Duomo.",
  "florence": "Berceau de la Renaissance avec des trésors artistiques inestimables.",
  "venice": "Cité unique sur l'eau avec ses canaux, gondoles et palais romantiques.",
  "naples": "Berceau de la pizza, Pompéi à proximité et une authenticité brute.",
  // UK
  "london": "Capitale mondiale de la culture, du théâtre et de l'histoire royale.",
  "manchester": "Ville industrielle reconvertie, berceau du football et de la musique indie.",
  "edinburgh": "Capitale écossaise majestueuse avec son château et ses festivals légendaires.",
  // Germany
  "berlin": "Capitale créative et historique, vie nocturne intense et street art omniprésent.",
  "munich": "Capitale bavaroise avec Oktoberfest, châteaux et jardins à la bière.",
  "frankfurt": "Hub financier européen avec un skyline impressionnant.",
  // Thailand
  "bangkok": "Temples dorés, street food légendaire et vie nocturne électrisante.",
  "chiang mai": "Capitale du Nord avec temples anciens et nature luxuriante.",
  "phuket": "Île paradisiaque avec plages de rêve et vie nocturne animée.",
  // UAE
  "dubai": "Ville des superlatifs : gratte-ciels records, shopping luxueux et désert.",
  "abu dhabi": "Capitale culturelle avec le Louvre Abu Dhabi et la Grande Mosquée.",
  // Morocco
  "marrakech": "Ville rouge avec la place Jemaa el-Fna, riads et souks envoûtants.",
  "casablanca": "Métropole moderne avec la mosquée Hassan II face à l'océan.",
  "fes": "Plus ancienne médina du monde, artisanat et spiritualité.",
  // Egypt
  "cairo": "Les pyramides de Gizeh, le Nil et le musée égyptien.",
  "alexandria": "Perle de la Méditerranée avec histoire antique et plages.",
  "luxor": "Musée à ciel ouvert avec Karnak et la Vallée des Rois.",
  // Greece
  "athens": "Berceau de la démocratie avec l'Acropole et une vie nocturne animée.",
  "thessaloniki": "Deuxième ville grecque avec Byzantine, gastronomie et bord de mer.",
  // Portugal
  "lisbon": "Capitale aux sept collines, pastéis de nata et fado mélancolique.",
  "porto": "Ville du vin de Porto avec architecture azulejo et ambiance authentique.",
  // Netherlands
  "amsterdam": "Canaux pittoresques, vélos, musées de maître et esprit libre.",
  "rotterdam": "Architecture avant-gardiste et plus grand port d'Europe.",
  // Belgium
  "brussels": "Capitale de l'Europe avec gaufres, bières et Grand-Place sublime.",
  "bruges": "Venise du Nord avec canaux médiévaux et chocolat artisanal.",
  // Austria
  "vienna": "Capitale impériale avec opéra, cafés et pâtisseries légendaires.",
  "salzburg": "Ville de Mozart avec baroque et paysages alpins.",
  // Czech Republic
  "prague": "Ville aux cent clochers avec pont Charles et bière artisanale.",
  // Hungary
  "budapest": "Perle du Danube avec bains thermaux et architecture Art Nouveau.",
  // Poland
  "warsaw": "Capitale renaissante avec vieille ville reconstruite et scène culturelle vibrante.",
  "krakow": "Ancienne capitale royale avec une des plus belles places d'Europe.",
  // Singapore
  "singapore": "Cité-État futuriste avec Gardens by the Bay et street food d'exception.",
  // Australia
  "sydney": "Opéra emblématique, Harbour Bridge et plages urbaines comme Bondi.",
  "melbourne": "Capitale culturelle avec street art, cafés et scène culinaire.",
  // Brazil
  "rio de janeiro": "Christ Rédempteur, Copacabana et carnaval légendaire.",
  "são paulo": "Mégapole culturelle avec la meilleure scène gastronomique d'Amérique du Sud.",
  // Mexico
  "mexico city": "Capitale aztèque et coloniale avec musées et cuisine de rue exceptionnelle.",
  "cancun": "Plages des Caraïbes, ruines mayas et vie nocturne intense.",
  // Argentina
  "buenos aires": "Paris de l'Amérique du Sud avec tango, steaks et passion.",
  // South Korea
  "seoul": "Mégapole high-tech avec palais anciens et K-pop culture.",
  "busan": "Deuxième ville avec plages, temples de montagne et fruits de mer.",
  // India
  "delhi": "Capitale historique avec forts moghols et street food légendaire.",
  "mumbai": "Bollywood, Gateway of India et la plus grande ville d'Inde.",
  "jaipur": "Ville rose du Rajasthan avec palais et forts majestueux.",
  // Turkey
  "istanbul": "Pont entre Orient et Occident avec Sainte-Sophie et Grand Bazar.",
  // Russia
  "moscow": "Kremlin, Place Rouge et grandeur impériale russe.",
  "saint petersburg": "Venise du Nord avec Ermitage et nuits blanches.",
  // South Africa
  "cape town": "Table Mountain, vignobles et cap de Bonne-Espérance.",
  "johannesburg": "Plus grande ville d'Afrique du Sud avec histoire de l'apartheid.",
  // Indonesia
  "bali": "Île des dieux avec temples, rizières et plages paradisiaques.",
  "jakarta": "Mégapole indonésienne avec culture diverse et cuisine de rue.",
  // Vietnam
  "ho chi minh city": "Ancienne Saigon avec énergie vibrante et histoire de guerre.",
  "hanoi": "Capitale millénaire avec vieille ville et cuisine du Nord.",
  // China
  "beijing": "Cité Interdite, Grande Muraille et histoire impériale.",
  "shanghai": "Mégapole futuriste avec le Bund et gastronomie raffinée.",
  "hong kong": "Skyline spectaculaire, dim sum et shopping paradis.",
};

function getCityDescription(cityName: string, countryName: string): string {
  const normalizedCity = cityName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (cityDescriptions[normalizedCity]) {
    return cityDescriptions[normalizedCity];
  }
  
  // Fallback generic description
  return `Ville importante de ${countryName} offrant une expérience authentique et des découvertes uniques.`;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const countryCode = url.searchParams.get("country_code");
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);

    if (!countryCode) {
      return new Response(
        JSON.stringify({ error: "country_code parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching top cities for country: ${countryCode}, limit: ${limit}`);

    // Call the external API
    const apiUrl = `https://travliaq-api-production.up.railway.app/cities/top-by-country/${countryCode.toUpperCase()}?limit=${Math.min(limit, 10)}`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch cities", cities: [] }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: ApiResponse = await response.json();
    console.log(`Received ${data.cities?.length || 0} cities for ${data.country_name}`);

    // Enrich cities with descriptions
    const enrichedCities = (data.cities || []).map((city) => ({
      ...city,
      description: city.description || getCityDescription(city.name, data.country_name),
    }));

    return new Response(
      JSON.stringify({
        cities: enrichedCities,
        country_name: data.country_name,
        country_code: data.country_code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("top-cities-by-country error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", cities: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
