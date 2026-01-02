/**
 * Hook for searching activities via Travliaq API
 * Auto-fetches when destination + dates are available
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { TravliaqActivity, ActivityEntry } from "@/contexts/ActivityMemoryContext";
import { format } from "date-fns";

const API_BASE_URL = "https://travliaq-api-production.up.railway.app";

export interface ActivitySearchParams {
  city: string;
  countryCode: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  categories?: string[];
  priceRange?: { min?: number; max?: number };
  ratingMin?: number;
  page?: number;
  limit?: number;
}

export interface ActivitySearchResult {
  activities: TravliaqActivity[];
  totalCount: number;
  page: number;
  hasMore: boolean;
  cached: boolean;
}

export interface UseActivitiesSearchReturn {
  results: TravliaqActivity[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  search: (params: ActivitySearchParams) => Promise<ActivitySearchResult | null>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

export function useActivitiesSearch(): UseActivitiesSearchReturn {
  const [results, setResults] = useState<TravliaqActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const lastParamsRef = useRef<ActivitySearchParams | null>(null);

  const search = useCallback(async (params: ActivitySearchParams): Promise<ActivitySearchResult | null> => {
    setLoading(true);
    setError(null);
    lastParamsRef.current = params;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/activities/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: {
            city: params.city,
            country_code: params.countryCode,
          },
          dates: {
            start: params.startDate,
            end: params.endDate,
          },
          filters: {
            categories: params.categories || [],
            price_range: params.priceRange,
            rating_min: params.ratingMin,
          },
          currency: "EUR",
          language: "fr",
          pagination: {
            page: params.page || 1,
            limit: params.limit || 20,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
          case 400:
            throw new Error(`Paramètres invalides: ${errorData.detail || "Vérifiez votre requête"}`);
          case 404:
            throw new Error("Destination non trouvée. Vérifiez le nom de la ville.");
          case 503:
            throw new Error("Service temporairement indisponible.");
          default:
            throw new Error(`Erreur serveur (${response.status})`);
        }
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "La recherche a échoué");
      }

      const activities = data.results.activities || [];
      
      if (params.page === 1) {
        setResults(activities);
      } else {
        setResults(prev => [...prev, ...activities]);
      }
      
      setTotalCount(data.results.total_count || 0);
      setHasMore(data.results.has_more || false);
      setCurrentPage(params.page || 1);

      return {
        activities,
        totalCount: data.results.total_count,
        page: data.results.page,
        hasMore: data.results.has_more,
        cached: data.cache_info?.cached || false,
      };
    } catch (err: any) {
      const errorMessage = err.message || "Une erreur est survenue";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!lastParamsRef.current || loading || !hasMore) return;

    await search({
      ...lastParamsRef.current,
      page: currentPage + 1,
    });
  }, [search, loading, hasMore, currentPage]);

  const reset = useCallback(() => {
    setResults([]);
    setLoading(false);
    setError(null);
    setTotalCount(0);
    setHasMore(false);
    setCurrentPage(1);
    lastParamsRef.current = null;
  }, []);

  return {
    results,
    loading,
    error,
    totalCount,
    hasMore,
    search,
    loadMore,
    reset,
  };
}

/**
 * Hook to auto-search activities when accommodation dates are set
 */
export function useAutoActivitiesSearch(
  city: string | undefined,
  countryCode: string | undefined,
  checkIn: Date | null,
  checkOut: Date | null,
  enabled: boolean = true
) {
  const searchHook = useActivitiesSearch();
  const hasSearchedRef = useRef<string>("");

  useEffect(() => {
    if (!enabled || !city || !countryCode || !checkIn) {
      return;
    }

    const searchKey = `${city}-${countryCode}-${checkIn.toISOString()}`;
    
    // Avoid duplicate searches
    if (hasSearchedRef.current === searchKey) {
      return;
    }

    hasSearchedRef.current = searchKey;

    searchHook.search({
      city,
      countryCode,
      startDate: format(checkIn, "yyyy-MM-dd"),
      endDate: checkOut ? format(checkOut, "yyyy-MM-dd") : undefined,
      page: 1,
      limit: 20,
    });
  }, [city, countryCode, checkIn, checkOut, enabled, searchHook.search]);

  return searchHook;
}
