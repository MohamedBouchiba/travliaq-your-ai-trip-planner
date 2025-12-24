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

// Country code to country name mapping for fallback
const countryNames: Record<string, string> = {
  "FR": "France", "QA": "Qatar", "US": "États-Unis", "JP": "Japon", "ES": "Espagne",
  "IT": "Italie", "GB": "Royaume-Uni", "DE": "Allemagne", "TH": "Thaïlande", "AE": "Émirats",
  "MA": "Maroc", "EG": "Égypte", "GR": "Grèce", "PT": "Portugal", "NL": "Pays-Bas",
  "BE": "Belgique", "AT": "Autriche", "CZ": "Tchéquie", "HU": "Hongrie", "PL": "Pologne",
  "SG": "Singapour", "AU": "Australie", "BR": "Brésil", "MX": "Mexique", "AR": "Argentine",
  "KR": "Corée du Sud", "IN": "Inde", "TR": "Turquie", "RU": "Russie", "ZA": "Afrique du Sud",
  "ID": "Indonésie", "VN": "Vietnam", "CN": "Chine", "CA": "Canada",
};

// Fallback cities for common countries when API is unavailable
const fallbackCities: Record<string, CityInfo[]> = {
  "FR": [
    { name: "Paris", country: "France", population: 2161000 },
    { name: "Marseille", country: "France", population: 861635 },
    { name: "Lyon", country: "France", population: 513275 },
    { name: "Toulouse", country: "France", population: 471941 },
    { name: "Nice", country: "France", population: 343064 },
  ],
  "ES": [
    { name: "Madrid", country: "Espagne", population: 3223334 },
    { name: "Barcelone", country: "Espagne", population: 1620343 },
    { name: "Valence", country: "Espagne", population: 791413 },
    { name: "Séville", country: "Espagne", population: 688711 },
    { name: "Malaga", country: "Espagne", population: 571026 },
  ],
  "IT": [
    { name: "Rome", country: "Italie", population: 2872800 },
    { name: "Milan", country: "Italie", population: 1352000 },
    { name: "Naples", country: "Italie", population: 967069 },
    { name: "Turin", country: "Italie", population: 886837 },
    { name: "Florence", country: "Italie", population: 382258 },
  ],
  "GB": [
    { name: "Londres", country: "Royaume-Uni", population: 8982000 },
    { name: "Birmingham", country: "Royaume-Uni", population: 1141816 },
    { name: "Manchester", country: "Royaume-Uni", population: 547627 },
    { name: "Glasgow", country: "Royaume-Uni", population: 626410 },
    { name: "Liverpool", country: "Royaume-Uni", population: 494814 },
  ],
  "DE": [
    { name: "Berlin", country: "Allemagne", population: 3644826 },
    { name: "Hambourg", country: "Allemagne", population: 1841179 },
    { name: "Munich", country: "Allemagne", population: 1471508 },
    { name: "Cologne", country: "Allemagne", population: 1085664 },
    { name: "Francfort", country: "Allemagne", population: 753056 },
  ],
  "US": [
    { name: "New York", country: "États-Unis", population: 8336817 },
    { name: "Los Angeles", country: "États-Unis", population: 3979576 },
    { name: "Chicago", country: "États-Unis", population: 2693976 },
    { name: "Miami", country: "États-Unis", population: 442241 },
    { name: "Las Vegas", country: "États-Unis", population: 641903 },
  ],
  "JP": [
    { name: "Tokyo", country: "Japon", population: 13960000 },
    { name: "Osaka", country: "Japon", population: 2691000 },
    { name: "Kyoto", country: "Japon", population: 1475000 },
    { name: "Yokohama", country: "Japon", population: 3749000 },
    { name: "Nagoya", country: "Japon", population: 2296000 },
  ],
  "QA": [
    { name: "Doha", country: "Qatar", population: 587055 },
    { name: "Al Wakrah", country: "Qatar", population: 80000 },
    { name: "Al Khor", country: "Qatar", population: 31000 },
  ],
  "AE": [
    { name: "Dubaï", country: "Émirats", population: 3137000 },
    { name: "Abu Dhabi", country: "Émirats", population: 1483000 },
    { name: "Sharjah", country: "Émirats", population: 1405000 },
  ],
  "TH": [
    { name: "Bangkok", country: "Thaïlande", population: 10539000 },
    { name: "Phuket", country: "Thaïlande", population: 416582 },
    { name: "Chiang Mai", country: "Thaïlande", population: 127240 },
    { name: "Pattaya", country: "Thaïlande", population: 119532 },
  ],
  "PT": [
    { name: "Lisbonne", country: "Portugal", population: 544851 },
    { name: "Porto", country: "Portugal", population: 237591 },
    { name: "Faro", country: "Portugal", population: 64560 },
  ],
  "GR": [
    { name: "Athènes", country: "Grèce", population: 664046 },
    { name: "Thessalonique", country: "Grèce", population: 315196 },
    { name: "Héraklion", country: "Grèce", population: 173993 },
  ],
  "MA": [
    { name: "Marrakech", country: "Maroc", population: 928850 },
    { name: "Casablanca", country: "Maroc", population: 3359818 },
    { name: "Fès", country: "Maroc", population: 1112072 },
    { name: "Tanger", country: "Maroc", population: 947952 },
  ],
  "NL": [
    { name: "Amsterdam", country: "Pays-Bas", population: 872680 },
    { name: "Rotterdam", country: "Pays-Bas", population: 651446 },
    { name: "La Haye", country: "Pays-Bas", population: 545163 },
  ],
  "BE": [
    { name: "Bruxelles", country: "Belgique", population: 1208542 },
    { name: "Anvers", country: "Belgique", population: 529247 },
    { name: "Gand", country: "Belgique", population: 262219 },
    { name: "Bruges", country: "Belgique", population: 118284 },
  ],
};

function getCityDescription(cityName: string, countryName: string | undefined, countryCode: string): string {
  const normalizedCity = cityName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (cityDescriptions[normalizedCity]) {
    return cityDescriptions[normalizedCity];
  }
  
  // Use countryName if available, otherwise lookup by code, fallback to "ce pays"
  const displayCountry = countryName || countryNames[countryCode.toUpperCase()] || "ce pays";
  
  // Fallback generic description
  return `Ville importante de ${displayCountry} offrant une expérience authentique et des découvertes uniques.`;
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

    const upperCode = countryCode.toUpperCase();
    let cities: CityInfo[] = [];
    let countryDisplayName = countryNames[upperCode] || countryCode;

    try {
      // Call the external API
      const apiUrl = `https://travliaq-api-production.up.railway.app/cities/top-by-country/${upperCode}?limit=${Math.min(limit, 10)}`;
      
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data: ApiResponse = await response.json();
        console.log(`Received ${data.cities?.length || 0} cities from API for ${data.country_name || countryCode}`);
        cities = data.cities || [];
        countryDisplayName = data.country_name || countryDisplayName;
      } else {
        console.warn(`API returned ${response.status}, using fallback cities`);
      }
    } catch (apiError) {
      console.warn("External API call failed, using fallback:", apiError);
    }

    // Use fallback if API returned nothing
    if (cities.length === 0 && fallbackCities[upperCode]) {
      console.log(`Using fallback cities for ${upperCode}`);
      cities = fallbackCities[upperCode].slice(0, limit);
    }

    // Enrich cities with descriptions
    const enrichedCities = cities.map((city) => ({
      ...city,
      description: city.description || getCityDescription(city.name, countryDisplayName, countryCode),
    }));

    return new Response(
      JSON.stringify({
        cities: enrichedCities,
        country_name: countryDisplayName,
        country_code: upperCode,
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
