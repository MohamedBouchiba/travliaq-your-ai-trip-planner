import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface City {
  id: string;
  name: string;
  country: string;
  country_code: string;
  search_text: string;
}

export const useCities = () => {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as City[];
    },
    staleTime: Infinity, // Cities don't change often, cache forever in this session
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });
};

export const useFilteredCities = (searchTerm: string, cities: City[] | undefined) => {
  if (!cities || cities.length === 0) return [];

  // Prioritize popular cities with Paris as highest priority
  const topPriority = new Set(['Paris']);
  const highPriority = new Set([
    'Marseille','Lyon','Toulouse','Nice','Bordeaux','Lille','Nantes','Strasbourg','Montpellier','Rennes',
    'Madrid','Barcelone','Séville','Valence','Malaga','Bilbao','Grenade','Saragosse','Palma de Majorque',
    'London','Manchester','Birmingham','Edinburgh','Glasgow','Cardiff','Belfast',
    'New York','Los Angeles','Chicago','San Francisco','Miami','Boston','Seattle','Washington',
    'Berlin','Munich','Hamburg','Cologne','Frankfurt','Stuttgart','Düsseldorf'
  ]);

  // If no search term, show top priority cities first
  if (!searchTerm || searchTerm.trim() === '') {
    return cities
      .slice(0, 100)
      .sort((a, b) => {
        const aTop = topPriority.has(a.name);
        const bTop = topPriority.has(b.name);
        if (aTop && !bTop) return -1;
        if (!aTop && bTop) return 1;
        
        const aHigh = highPriority.has(a.name);
        const bHigh = highPriority.has(b.name);
        if (aHigh && !bHigh) return -1;
        if (!aHigh && bHigh) return 1;
        
        return a.name.localeCompare(b.name);
      });
  }

  // Normalize search term (remove accents and lowercase)
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const normalizedSearch = normalizeString(searchTerm);
  
  // Filter cities by search term
  const filtered = cities.filter((city) => {
    const normalizedName = normalizeString(city.name);
    const normalizedCountry = normalizeString(city.country);
    const normalizedSearchText = city.search_text ? normalizeString(city.search_text) : '';
    
    return (
      normalizedName.includes(normalizedSearch) ||
      normalizedCountry.includes(normalizedSearch) ||
      normalizedSearchText.includes(normalizedSearch)
    );
  });

  // Sort filtered results
  return filtered
    .sort((a, b) => {
      const normalizedNameA = normalizeString(a.name);
      const normalizedNameB = normalizeString(b.name);
      
      // Prioritize exact name matches
      const aExact = normalizedNameA === normalizedSearch;
      const bExact = normalizedNameB === normalizedSearch;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then prioritize name starts with search
      const aStarts = normalizedNameA.startsWith(normalizedSearch);
      const bStarts = normalizedNameB.startsWith(normalizedSearch);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Top priority cities (Paris first)
      const aTop = topPriority.has(a.name);
      const bTop = topPriority.has(b.name);
      if (aTop && !bTop) return -1;
      if (!aTop && bTop) return 1;
      
      // High priority cities
      const aHigh = highPriority.has(a.name);
      const bHigh = highPriority.has(b.name);
      if (aHigh && !bHigh) return -1;
      if (!aHigh && bHigh) return 1;
      
      // Finally sort alphabetically
      return a.name.localeCompare(b.name);
    })
    .slice(0, 50); // Limit to 50 results for better performance
};
