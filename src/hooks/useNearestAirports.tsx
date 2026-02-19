import { supabase } from "@/integrations/supabase/client";

export interface Airport {
  iata: string;
  name: string;
  city_name: string;
  country_code: string;
  lat: number;
  lon: number;
  distance_km?: number;
}

export interface NearestAirportsResponse {
  city_query: string;
  matched_city: string;
  matched_city_id: string;
  match_score: number;
  city_location: {
    lat: number;
    lon: number;
  };
  airports: Airport[];
}

// List of known country names (French and English) to reject as city names
const COUNTRY_NAMES_LOWER = new Set([
  // French country names
  "emirats arabes unis", "émirats arabes unis", "etats-unis", "états-unis", "royaume-uni",
  "arabie saoudite", "nouvelle-zélande", "nouvelle zelande", "afrique du sud",
  "pays-bas", "republique tcheque", "république tchèque", "coree du sud", "corée du sud",
  "coree du nord", "corée du nord", "sri lanka", "costa rica", "porto rico",
  "france", "allemagne", "italie", "espagne", "portugal", "grece", "grèce",
  "belgique", "suisse", "autriche", "pays bas", "pologne", "russie", "ukraine",
  "royaume uni", "irlande", "ecosse", "écosse", "angleterre", "norvege", "norvège",
  "suede", "suède", "finlande", "danemark", "islande", "turquie", "egypte", "égypte",
  "maroc", "tunisie", "algerie", "algérie", "senegal", "sénégal", "cote d'ivoire", "côte d'ivoire",
  "afrique", "kenya", "tanzanie", "ethiopie", "éthiopie", "nigeria", "ghana",
  "inde", "chine", "japon", "thailande", "thaïlande", "vietnam", "indonesie", "indonésie",
  "malaisie", "philippines", "singapour", "taiwan", "taïwan", "hong kong",
  "australie", "canada", "mexique", "bresil", "brésil", "argentine", "chili",
  "colombie", "perou", "pérou", "venezuela", "cuba", "jamaique", "jamaïque",
  "qatar", "koweit", "koweït", "bahrein", "bahreïn", "oman", "jordanie", "liban",
  "israel", "israël", "iran", "irak", "syrie", "afghanistan", "pakistan",
  // English country names
  "united arab emirates", "uae", "united states", "usa", "united kingdom", "uk",
  "saudi arabia", "new zealand", "south africa", "netherlands", "czech republic",
  "south korea", "north korea", "costa rica", "puerto rico",
  "france", "germany", "italy", "spain", "portugal", "greece", "belgium",
  "switzerland", "austria", "poland", "russia", "ukraine", "ireland", "scotland",
  "england", "norway", "sweden", "finland", "denmark", "iceland", "turkey",
  "egypt", "morocco", "tunisia", "algeria", "senegal", "ivory coast", "kenya",
  "tanzania", "ethiopia", "nigeria", "ghana", "india", "china", "japan",
  "thailand", "vietnam", "indonesia", "malaysia", "philippines", "singapore",
  "taiwan", "australia", "canada", "mexico", "brazil", "argentina", "chile",
  "colombia", "peru", "venezuela", "cuba", "jamaica", "qatar", "kuwait",
  "bahrain", "oman", "jordan", "lebanon", "israel", "iran", "iraq", "syria",
  "afghanistan", "pakistan",
]);

/**
 * Check if a string looks like a country name rather than a city
 */
function isCountryName(name: string): boolean {
  if (!name || name.length < 2) return false;
  const normalized = name.toLowerCase().trim();
  return COUNTRY_NAMES_LOWER.has(normalized);
}

// Reject strings that are clearly not city names (sentences, placeholder text, etc.)
const NON_CITY_PHRASES = [
  "destination", "en tête", "souhaitez", "aller", "voyage",
  "où", "comment", "quand", "combien", "cherche", "inspire",
];

function looksLikeSentence(name: string): boolean {
  if (!name || name.length < 2) return false;
  const words = name.trim().split(/\s+/);
  // Real city names rarely exceed 4 words
  if (words.length > 4) return true;
  const lower = name.toLowerCase().trim();
  // Check if it contains known non-city phrases
  return NON_CITY_PHRASES.some((phrase) => lower.includes(phrase));
}

export async function findNearestAirports(
  city: string,
  limit: number = 3,
  countryCode?: string,
  coords?: { lat: number; lon: number },
  preferredRegion: string = "europe",
): Promise<NearestAirportsResponse | null> {
  // Guard: don't call API with country names (unless we have coords fallback)
  if (!coords && isCountryName(city)) {
    console.warn(`[useNearestAirports] Rejected country name as city: "${city}"`);
    return null;
  }

  // Guard: don't call API with sentences or placeholder text
  if (!coords && looksLikeSentence(city)) {
    console.warn(`[useNearestAirports] Rejected non-city string: "${city}"`);
    return null;
  }

  try {
    const body: { city?: string; lat?: number; lon?: number; limit: number; country_code?: string; preferred_region?: string } = { limit };
    
    // Prefer coords if provided (more reliable than city name lookup)
    if (coords) {
      body.lat = coords.lat;
      body.lon = coords.lon;
    }
    
    // Still send city if not a country name (for matched_city in response)
    if (city && !isCountryName(city)) {
      body.city = city;
    }
    
    if (countryCode) {
      body.country_code = countryCode;
    }

    // Bug 2: Pass preferred_region to disambiguate homonyms (Paris FR vs Paris CA)
    if (preferredRegion) {
      body.preferred_region = preferredRegion;
    }

    const { data, error } = await supabase.functions.invoke("nearest-airports", {
      body,
    });

    if (error) {
      console.error("[useNearestAirports] Error:", error);
      return null;
    }

    // Log if fuzzy match was applied
    if (data?.match_score && data.match_score < 100) {
      console.log(`[useNearestAirports] City corrected: "${data.city_query}" → "${data.matched_city}" (score: ${data.match_score})`);
    }

    return data as NearestAirportsResponse;
  } catch (err) {
    console.error("[useNearestAirports] Exception:", err);
    return null;
  }
}
