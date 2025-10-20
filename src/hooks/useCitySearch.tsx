import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export interface City {
  id: string;
  name: string;
  country: string;
  country_code: string;
  search_text: string;
}

/**
 * Hook pour rechercher des villes en temps réel dans la base de données avec debounce
 * Utilise la recherche trigram (pg_trgm) pour une recherche floue et performante
 */
export const useCitySearch = (searchTerm: string, enabled: boolean = true) => {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Debounce de 300ms pour éviter trop de requêtes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return useQuery({
    queryKey: ["city-search", debouncedSearch],
    queryFn: async () => {
      // Si pas de recherche, retourner les villes populaires par défaut
      if (!debouncedSearch || debouncedSearch.trim() === '') {
        const { data, error } = await supabase
          .from("cities")
          .select("*")
          .in("name", [
            'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Bordeaux',
            'Madrid', 'Barcelone', 'London', 'New York', 'Berlin', 'Rome'
          ])
          .order("name")
          .limit(50);

        if (error) throw error;
        return data as City[];
      }

      // Normaliser le terme de recherche
      const normalizedSearch = debouncedSearch.toLowerCase().trim();

      // Recherche avec ILIKE pour correspondance partielle
      // On recherche dans name, country et search_text
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .or(`name.ilike.%${normalizedSearch}%,country.ilike.%${normalizedSearch}%,search_text.ilike.%${normalizedSearch}%`)
        .order("name")
        .limit(50);

      if (error) throw error;

      // Tri côté client pour prioriser les correspondances exactes et les débuts de mots
      const sorted = (data as City[]).sort((a, b) => {
        const normalizedNameA = a.name.toLowerCase();
        const normalizedNameB = b.name.toLowerCase();
        
        // Priorité 1 : correspondance exacte
        const aExact = normalizedNameA === normalizedSearch;
        const bExact = normalizedNameB === normalizedSearch;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Priorité 2 : commence par le terme de recherche
        const aStarts = normalizedNameA.startsWith(normalizedSearch);
        const bStarts = normalizedNameB.startsWith(normalizedSearch);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Priorité 3 : villes populaires (Paris en tête)
        const topPriority = new Set(['paris']);
        const highPriority = new Set([
          'marseille', 'lyon', 'toulouse', 'nice', 'bordeaux', 'lille',
          'madrid', 'barcelone', 'london', 'new york', 'berlin', 'rome'
        ]);
        
        const aTop = topPriority.has(normalizedNameA);
        const bTop = topPriority.has(normalizedNameB);
        if (aTop && !bTop) return -1;
        if (!aTop && bTop) return 1;
        
        const aHigh = highPriority.has(normalizedNameA);
        const bHigh = highPriority.has(normalizedNameB);
        if (aHigh && !bHigh) return -1;
        if (!aHigh && bHigh) return 1;
        
        // Par défaut : ordre alphabétique
        return a.name.localeCompare(b.name);
      });

      return sorted;
    },
    staleTime: 1000 * 60 * 5, // Cache pendant 5 minutes
    enabled: enabled, // Ne rechercher que quand activé (dropdown ouvert)
  });
};
