import { useState, useRef, useEffect, memo, useCallback } from "react";
import {
  Star, MapPin, ChevronDown,
  Search, Hotel, Plus, X, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toastInfo, toastError } from "@/lib/toast";
import { logger, LogCategory } from "@/utils/logger";
import { STORAGE_KEYS } from "@/config/storageKeys";

const HOTELS_DEBUG_KEY = STORAGE_KEYS.HOTELS_DEBUG;
import { useTravelMemoryStore, useFlightMemoryStore, useAccommodationMemoryStore, BUDGET_PRESETS, type BudgetPreset, type AccommodationType, type EssentialAmenity } from "@/stores/hooks";
import type { MealPlan } from "@/stores/slices/accommodationTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocationAutocomplete, LocationResult } from "@/hooks/useLocationAutocomplete";
import { differenceInDays, format } from "date-fns";
import { STAYS_ZOOM } from "@/constants/mapSettings";
import HotelSearchResults, { type HotelResult } from "./HotelSearchResults";
import HotelDetailView from "./HotelDetailView";
import { eventBus } from "@/lib/eventBus";
import type { RoomOccupancy, HotelResult as ApiHotelResult, HotelDetails } from "@/services/hotels/hotelService";
import { getHotelDetails } from "@/services/hotels/hotelService";
import { searchHotelsWithRetry } from "@/services/hotels/searchHotelsWithRetry";
import { buildHotelFilters } from "./hotels/buildHotelFilters";
import { supabase } from "@/integrations/supabase/client";
import { SyncBadgeInline } from "@/components/ui/SyncBadge";
import { useTranslation } from "react-i18next";
import {
  DestinationInput,
  TravelersSelector,
  RoomsSelector,
  CompactDateRange,
  ChipButton,
  useAccommodationTypes,
  useEssentialAmenities,
  useRatingOptions,
  useMealPlans,
  useViewOptions,
  useServiceOptions,
  useAccessibilityOptions,
} from "./accommodation";

interface AccommodationPanelProps {
  onMapMove?: (center: [number, number], zoom: number) => void;
  mapCenter?: [number, number];
}

const AccommodationPanel = ({ onMapMove, mapCenter }: AccommodationPanelProps) => {
  const { 
    memory: travelMemory, 
    updateTravelers,
  } = useTravelMemoryStore();
  
  const { memory: flightMemory } = useFlightMemoryStore();
  
  const {
    memory,
    getActiveAccommodation,
    setActiveAccommodation,
    addAccommodation,
    removeAccommodation,
    updateAccommodation,
    setBudgetPreset,
    setCustomBudget,
    toggleType,
    toggleAmenity,
    setMinRating,
    getSuggestedRooms,
    setCustomRooms,
    toggleAutoRooms,
    updateAdvancedFilters,
    setDates,
    setDestination,
    updateMemoryBatch,
    setHotelSearchResults,
    setShowHotelResults,
    setSelectedHotelForDetailId,
    clearHotelSearch,
    setHotelDetails,
    getHotelDetailsFromCache,
    setIsLoadingHotelDetails,
  } = useAccommodationMemoryStore();

  const { t } = useTranslation();
  
  // Translated option arrays
  const ACCOMMODATION_TYPES = useAccommodationTypes();
  const ESSENTIAL_AMENITIES = useEssentialAmenities();
  const RATING_OPTIONS = useRatingOptions();
  const MEAL_PLANS = useMealPlans();
  const VIEW_OPTIONS = useViewOptions();
  const SERVICE_OPTIONS = useServiceOptions();
  const ACCESSIBILITY_OPTIONS = useAccessibilityOptions();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingInArea, setIsSearchingInArea] = useState(false);
  const [hoveredHotel, setHoveredHotel] = useState<HotelResult | null>(null);
  
  // Use persisted hotel search state from context
  const searchResults = memory.hotelSearchResults as HotelResult[];
  const showResults = memory.showHotelResults;
  const selectedHotelForDetailId = memory.selectedHotelForDetailId;
  const selectedHotelForDetail = searchResults.find(h => h.id === selectedHotelForDetailId) || null;
  
  // Local state for highlighted card (separate from detail selection)
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  // Listen for hotel selection from map pins (highlight only — NEVER open detail)
  useEffect(() => {
    const handleMapHotelSelect = (data: { hotel: { id: string } }) => {
      const hotel = searchResults.find((h) => h.id === data.hotel.id);
      if (!hotel) return;
      setSelectedHotelId(hotel.id);
      // Do NOT open detail here; detail is only via the "Voir détails" button.
    };

    eventBus.on("hotels:select", handleMapHotelSelect);
    return () => {
      eventBus.off("hotels:select", handleMapHotelSelect);
    };
  }, [searchResults]);

  // Listen for hotel detail open from map pin clicks
  // This handler also triggers the API call for hotel details (same as "Voir détails" button)
  useEffect(() => {
    const handleOpenDetail = async (data: { hotel: { id: string } }) => {
      const hotel = searchResults.find((h) => h.id === data.hotel.id);
      if (!hotel) return;
      
      setSelectedHotelId(hotel.id);
      setSelectedHotelForDetailId(hotel.id);

      // Check if details are already cached
      const cachedDetails = getHotelDetailsFromCache(hotel.id);
      if (cachedDetails) {
        console.log('[AccommodationPanel] Using cached hotel details for map click:', hotel.id);
        return;
      }

      // Get active accommodation for dates
      const currentAccommodation = getActiveAccommodation();
      
      // Load details from API (same logic as handleHotelSelect)
      if (!currentAccommodation?.checkIn || !currentAccommodation?.checkOut) {
        console.warn('[AccommodationPanel] Cannot load hotel details from map click: missing dates');
        return;
      }

      setIsLoadingHotelDetails(true);

      try {
        // Build rooms config for API
        const roomsConfig = memory.customRooms.length > 0
          ? memory.customRooms.map(r => ({
              adults: r.adults,
              childrenAges: r.childrenAges.length > 0 ? r.childrenAges : undefined,
            }))
          : [{ adults: 2 }];

        const response = await getHotelDetails(
          hotel.id,
          format(currentAccommodation.checkIn, 'yyyy-MM-dd'),
          format(currentAccommodation.checkOut, 'yyyy-MM-dd'),
          roomsConfig,
          'EUR',
          'fr'
        );

        if (response.success && response.hotel) {
          console.log('[AccommodationPanel] Hotel details loaded from map click:', {
            id: response.hotel.id,
            imagesCount: response.hotel.images?.length || 0,
            roomsCount: response.hotel.rooms?.length || 0,
            hasDescription: !!response.hotel.description,
          });
          setHotelDetails(hotel.id, response.hotel);
        } else {
          console.warn('[AccommodationPanel] Failed to load hotel details from map click:', response);
        }
      } catch (error) {
        console.error('[AccommodationPanel] Error loading hotel details from map click:', error);
      } finally {
        setIsLoadingHotelDetails(false);
      }
    };

    eventBus.on("hotels:openDetail", handleOpenDetail);
    return () => {
      eventBus.off("hotels:openDetail", handleOpenDetail);
    };
  }, [searchResults, setSelectedHotelForDetailId, getHotelDetailsFromCache, getActiveAccommodation, memory.customRooms, setIsLoadingHotelDetails, setHotelDetails]);

  // When hovering map pins, we want ONLY the hovered pin highlighted.
  // So we clear any prior selection as soon as the user starts hovering on the map.
  useEffect(() => {
    const clearSelection = () => setSelectedHotelId(null);
    eventBus.on("hotels:clearSelection", clearSelection);
    return () => eventBus.off("hotels:clearSelection", clearSelection);
  }, []);
  const activeAccommodation = getActiveAccommodation();
  const hasMultipleAccommodations = memory.accommodations.length > 1;
  const rooms = memory.useAutoRooms ? getSuggestedRooms() : memory.customRooms;

  // Local state for custom budget inputs
  const [customMin, setCustomMin] = useState(activeAccommodation?.priceMin.toString() || "80");
  const [customMax, setCustomMax] = useState(activeAccommodation?.priceMax.toString() || "180");

  // Sync custom budget inputs when active accommodation changes
  useEffect(() => {
    if (activeAccommodation) {
      setCustomMin(activeAccommodation.priceMin.toString());
      setCustomMax(activeAccommodation.priceMax.toString());
    }
  }, [activeAccommodation]);

  // Track if user is typing vs selected from autocomplete
  const [destinationInput, setDestinationInput] = useState(activeAccommodation?.city || "");

  // Store onMapMove in a ref to avoid infinite loops
  const onMapMoveRef = useRef(onMapMove);
  onMapMoveRef.current = onMapMove;
  
  // Sync input when switching accommodations
  useEffect(() => {
    setDestinationInput(activeAccommodation?.city || "");
  }, [activeAccommodation?.id, activeAccommodation?.city]);

  // Zoom on map when switching between accommodations (only on EXPLICIT index change, not on component mount)
  const prevIndexRef = useRef<number | null>(null);
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    // Skip zoom on first mount (when panel reopens)
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevIndexRef.current = memory.activeAccommodationIndex;
      return;
    }
    // Only zoom when we actually switch tabs, not on every render
    if (prevIndexRef.current !== memory.activeAccommodationIndex) {
      prevIndexRef.current = memory.activeAccommodationIndex;
      if (activeAccommodation?.lat && activeAccommodation?.lng && onMapMoveRef.current) {
        onMapMoveRef.current([activeAccommodation.lng, activeAccommodation.lat], 12);
      }
    }
  }, [memory.activeAccommodationIndex, activeAccommodation?.lat, activeAccommodation?.lng]);

  // Re-emit hotel results to map when component mounts (if we have persisted results)
  useEffect(() => {
    if (searchResults.length > 0) {
      eventBus.emit("hotels:results", { hotels: searchResults });
    }
  }, []); // Only on mount

  // Sync accommodations with flight data (multi-destination OR round-trip/one-way)
  const prevFlightSyncRef = useRef<string>("");
  useEffect(() => {
    // For multi-destination: sync cities + dates from legs
    if (flightMemory.tripType === "multi") {
      const legs = flightMemory.legs;

      // Get first departure city to detect "return home" legs
      const firstDepartureCity = legs[0]?.departure?.city?.toLowerCase();

      // Build destination info from legs, filtering out "return home" destinations
      const destinationInfos = legs
        .filter((leg) => {
          if (!leg.arrival?.city || !leg.arrival?.lat || !leg.arrival?.lng) return false;
          // Skip if arrival city is the same as the first departure city (returning home)
          if (firstDepartureCity && leg.arrival.city.toLowerCase() === firstDepartureCity) return false;
          return true;
        })
        .map((leg, i, filteredLegs) => {
          const arrivalDate = leg.date;
          // Find the next leg's date for checkout
          const legIndex = legs.findIndex(l => l === leg);
          const nextLeg = legs[legIndex + 1];
          const departureDate = nextLeg?.date || null;

          return {
            city: leg.arrival!.city!,
            country: leg.arrival?.country || "",
            countryCode: leg.arrival?.countryCode || "",
            lat: leg.arrival!.lat!,
            lng: leg.arrival!.lng!,
            checkIn: arrivalDate,
            checkOut: departureDate,
          };
        });

      // Improved signature: use timestamp instead of JSON.stringify for better stability
      const legsSignature = destinationInfos.map(d =>
        `${d.city}|${d.checkIn?.getTime() || ''}|${d.checkOut?.getTime() || ''}`
      ).join('::');
      if (legsSignature === prevFlightSyncRef.current) return;
      prevFlightSyncRef.current = legsSignature;

      if (destinationInfos.length === 0) return;

      // Collect valid destination cities (not including first departure city)
      const validCitiesSet = new Set(destinationInfos.map(d => d.city.toLowerCase()));

      // Find all accommodations that should be removed:
      // 1. Empty accommodations (no city set)
      // 2. Accommodations matching the first departure city (return home - user lives there)
      // 3. Accommodations for cities not in the valid destinations list
      const accommodationIdsToRemove = new Set(memory.accommodations
        .filter(a => {
          // Remove empty accommodations
          if (!a.city) return true;
          const cityLower = a.city.toLowerCase();
          // Remove accommodations matching first departure city (return home)
          if (firstDepartureCity && cityLower === firstDepartureCity) return true;
          // Remove accommodations not in valid destinations
          if (!validCitiesSet.has(cityLower)) return true;
          return false;
        })
        .map(a => a.id)
      );

      // CRITICAL FIX: Perform a single atomic update instead of multiple async calls
      // This prevents race conditions where memory.accommodations is stale
      updateMemoryBatch(prev => {
        // 1. Remove obsolete accommodations (using fresh state)
        let newAccommodations = prev.accommodations.filter(
          a => !accommodationIdsToRemove.has(a.id)
        );

        // 2. Update or add destinations (on the FRESH array)
        destinationInfos.forEach(dest => {
          const existingIndex = newAccommodations.findIndex(
            a => a.city?.toLowerCase() === dest.city.toLowerCase()
          );

          if (existingIndex >= 0) {
            // Update existing accommodation
            const existing = newAccommodations[existingIndex];
            // IMPORTANT: Only sync dates if user hasn't manually modified them
            if (!existing.userModifiedDates && (dest.checkIn || dest.checkOut)) {
              newAccommodations[existingIndex] = {
                ...existing,
                checkIn: dest.checkIn || existing.checkIn,
                checkOut: dest.checkOut || existing.checkOut,
                syncedFromFlight: true,
              };
            }
          } else {
            // Add new accommodation
            newAccommodations.push({
              id: crypto.randomUUID(),
              city: dest.city,
              country: dest.country,
              countryCode: dest.countryCode,
              lat: dest.lat,
              lng: dest.lng,
              checkIn: dest.checkIn,
              checkOut: dest.checkOut,
              syncedFromFlight: true,
              userModifiedDates: false,
              // Default values (inherited from memory defaults)
              budgetPreset: prev.defaultBudgetPreset,
              priceMin: prev.defaultPriceMin,
              priceMax: prev.defaultPriceMax,
              types: [] as AccommodationType[],
              minRating: null,
              amenities: [] as EssentialAmenity[],
              advancedFilters: {
                mealPlan: null as MealPlan | null,
                views: [],
                services: [],
                accessibility: [],
              },
            });
          }
        });

        // Ensure at least one accommodation exists
        if (newAccommodations.length === 0) {
          newAccommodations = [{
            id: crypto.randomUUID(),
            city: "",
            country: "",
            countryCode: "",
            checkIn: null,
            checkOut: null,
            budgetPreset: "comfort" as BudgetPreset,
            priceMin: 80,
            priceMax: 180,
            types: [] as AccommodationType[],
            minRating: null,
            amenities: [] as EssentialAmenity[],
            advancedFilters: {
              mealPlan: null as MealPlan | null,
              views: [],
              services: [],
              accessibility: [],
            },
          }];
        }

        // Adjust active index if needed
        const newActiveIndex = Math.min(prev.activeAccommodationIndex, newAccommodations.length - 1);

        return {
          ...prev,
          accommodations: newAccommodations,
          activeAccommodationIndex: newActiveIndex,
        };
      });

      // Notify user that sync occurred
      const changedCount = accommodationIdsToRemove.size + destinationInfos.filter(d =>
        !memory.accommodations.some(a => a.city?.toLowerCase() === d.city.toLowerCase())
      ).length;

      if (changedCount > 0) {
        toastInfo(
          t("planner.accommodation.toast.synced"),
          t("planner.accommodation.toast.syncedDesc", { count: destinationInfos.length })
        );
      }
    } else {
      // For round-trip and one-way: sync dates from departure/return
      const departure = flightMemory.arrival; // Destination city
      const departureDate = flightMemory.departureDate;
      const returnDate = flightMemory.returnDate;
      
      // Create a signature to detect changes
      const syncSignature = JSON.stringify({
        city: departure?.city,
        departureDate: departureDate?.toISOString(),
        returnDate: returnDate?.toISOString(),
      });
      if (syncSignature === prevFlightSyncRef.current) return;
      prevFlightSyncRef.current = syncSignature;
      
      // Only sync if we have destination and at least departure date
      if (!departure?.city || !departureDate) return;
      
      // Find if we have an accommodation for this destination
      const existingIndex = memory.accommodations.findIndex(
        a => a.city?.toLowerCase() === departure.city!.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update dates for existing accommodation - ONLY if user hasn't manually modified
        const existing = memory.accommodations[existingIndex];
        if (!existing.userModifiedDates) {
          updateAccommodation(existing.id, {
            checkIn: departureDate,
            checkOut: returnDate || existing.checkOut,
            syncedFromFlight: true,
          });
        }
      } else if (departure.lat && departure.lng) {
        // Update first accommodation with destination info + dates
        const first = memory.accommodations[0];
        if (first && !first.city) {
          updateAccommodation(first.id, {
            city: departure.city,
            country: departure.country || "",
            countryCode: departure.countryCode || "",
            lat: departure.lat,
            lng: departure.lng,
            checkIn: departureDate,
            checkOut: returnDate || null,
            syncedFromFlight: true,
            userModifiedDates: false,
          });
        }
      }
    }
  }, [
    flightMemory.tripType, 
    flightMemory.legs, 
    flightMemory.arrival, 
    flightMemory.departureDate, 
    flightMemory.returnDate, 
    memory.accommodations, 
    addAccommodation, 
    updateAccommodation,
    removeAccommodation
  ]);

  // Handle destination selection from autocomplete - ONLY here we update the real city
  const handleLocationSelect = (location: LocationResult) => {
    if (location.lat && location.lng) {
      setDestinationInput(location.name);
      setDestination(
        location.name,
        location.country_name || "",
        location.country_code || "",
        location.lat,
        location.lng
      );
      if (onMapMove) {
        onMapMove([location.lng, location.lat], STAYS_ZOOM);
      }
    }
  };
  
  // Handle input change - only updates local state, not the real destination
  const handleDestinationInputChange = (value: string) => {
    setDestinationInput(value);
  };

  // Handle adding new accommodation
  const handleAddAccommodation = () => {
    addAccommodation();
  };

  // Handle removing accommodation
  const handleRemoveAccommodation = (id: string) => {
    removeAccommodation(id);
  };

  // Handle travelers change - syncs with TravelMemory (transversal)
  const handleTravelersChange = (adults: number, children: number, ages: number[]) => {
    updateTravelers({ adults, children, childrenAges: ages });
  };

  // Handle budget preset change
  const handleBudgetPreset = (preset: BudgetPreset) => {
    setBudgetPreset(preset);
    const { min, max } = BUDGET_PRESETS[preset];
    setCustomMin(min.toString());
    setCustomMax(max.toString());
  };

  // Handle custom budget change
  const handleCustomBudgetBlur = () => {
    const min = parseInt(customMin) || 0;
    const max = parseInt(customMax) || 500;
    setCustomBudget(Math.min(min, max), Math.max(min, max));
  };

  // Handle meal plan toggle
  const handleMealPlanToggle = (mealId: MealPlan) => {
    if (!activeAccommodation) return;
    updateAdvancedFilters({
      mealPlan: activeAccommodation.advancedFilters.mealPlan === mealId ? null : mealId,
    });
  };

  // Handle array toggle for views/services/accessibility
  const handleArrayToggle = (field: "views" | "services" | "accessibility", value: string) => {
    if (!activeAccommodation) return;
    const current = activeAccommodation.advancedFilters[field];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateAdvancedFilters({ [field]: updated });
  };

  // Handle dates change
  const handleDatesChange = (checkIn: Date | null, checkOut: Date | null) => {
    setDates(checkIn, checkOut);
  };

  // Check if ready to search
  const canSearch = activeAccommodation && activeAccommodation.city.length > 0;

  // Calculate nights for display
  const searchNights = activeAccommodation?.checkIn && activeAccommodation?.checkOut 
    ? differenceInDays(activeAccommodation.checkOut, activeAccommodation.checkIn)
    : 1;

  // Convert API results to HotelResult format
  const mapApiToHotelResult = useCallback((hotel: ApiHotelResult): HotelResult => ({
    id: hotel.id,
    name: hotel.name,
    imageUrl: hotel.imageUrl,
    rating: hotel.rating,
    reviewCount: hotel.reviewCount,
    pricePerNight: hotel.pricePerNight,
    totalPrice: hotel.totalPrice,
    currency: hotel.currency,
    address: hotel.address,
    lat: hotel.lat,
    lng: hotel.lng,
    amenities: hotel.amenities,
    stars: hotel.stars,
    distanceFromCenter: hotel.distanceFromCenter != null ? `${hotel.distanceFromCenter} km` : undefined,
    bookingUrl: hotel.bookingUrl,
  }), []);

  // Handle search with real API
  const handleSearch = async () => {
    if (!canSearch || !activeAccommodation) return;

    const debugHotels =
      import.meta.env.DEV ||
      (typeof window !== "undefined" && window.localStorage.getItem(HOTELS_DEBUG_KEY) === "1");

    if (debugHotels) {
      console.groupCollapsed("[HotelsUI] Search requested");
      console.log("activeAccommodation", {
        city: activeAccommodation.city,
        countryCode: activeAccommodation.countryCode,
        lat: activeAccommodation.lat,
        lng: activeAccommodation.lng,
        checkIn: activeAccommodation.checkIn,
        checkOut: activeAccommodation.checkOut,
        priceMin: activeAccommodation.priceMin,
        priceMax: activeAccommodation.priceMax,
        minRating: activeAccommodation.minRating,
        amenities: activeAccommodation.amenities,
        types: activeAccommodation.types,
      });
      console.log("rooms (memory.customRooms)", memory.customRooms);
      console.groupEnd();
    }

    // Validate required params (show actionable messages)
    if (!activeAccommodation.countryCode || !activeAccommodation.lat || !activeAccommodation.lng) {
      toastError(
        t("planner.accommodation.toast.incompleteDestination"),
        t("planner.accommodation.toast.incompleteDestinationDesc")
      );

      logger.warn("Hotels search blocked: destination incomplete", {
        category: LogCategory.VALIDATION,
        metadata: {
          city: activeAccommodation.city,
          countryCode: activeAccommodation.countryCode,
          hasLat: Boolean(activeAccommodation.lat),
          hasLng: Boolean(activeAccommodation.lng),
        },
      });

      if (debugHotels) {
        console.warn("[HotelsUI] Blocked: destination incomplete", {
          city: activeAccommodation.city,
          countryCode: activeAccommodation.countryCode,
          lat: activeAccommodation.lat,
          lng: activeAccommodation.lng,
        });
      }

      return;
    }

    if (!activeAccommodation.checkIn || !activeAccommodation.checkOut) {
      toastError(
        t("planner.accommodation.toast.missingDates"),
        t("planner.accommodation.toast.missingDatesDesc")
      );

      logger.warn("Hotels search blocked: dates missing", {
        category: LogCategory.VALIDATION,
        metadata: {
          city: activeAccommodation.city,
          countryCode: activeAccommodation.countryCode,
          checkIn: activeAccommodation.checkIn ? format(activeAccommodation.checkIn, "yyyy-MM-dd") : null,
          checkOut: activeAccommodation.checkOut ? format(activeAccommodation.checkOut, "yyyy-MM-dd") : null,
        },
      });

      if (debugHotels) {
        console.warn("[HotelsUI] Blocked: dates missing", {
          city: activeAccommodation.city,
          checkIn: activeAccommodation.checkIn,
          checkOut: activeAccommodation.checkOut,
        });
      }

      return;
    }

    setIsSearching(true);
    setShowHotelResults(true);

    try {
      // Build rooms config for API - use customRooms from memory context
      const roomsConfig =
        memory.customRooms.length > 0
          ? memory.customRooms
          : [{ adults: 2, children: 0, childrenAges: [] as number[], id: "default" }];

      const apiRooms: RoomOccupancy[] = roomsConfig.map((r) => ({
        adults: r.adults,
        childrenAges: r.childrenAges.length > 0 ? r.childrenAges : undefined,
      }));

      // Build filters
      // IMPORTANT: do not send budget filters by default (they can wipe results).
      // Budget filters must ONLY be applied when the user explicitly changed the budget.
      const filters = buildHotelFilters(activeAccommodation);


      const requestParams = {
        city: activeAccommodation.city,
        countryCode: activeAccommodation.countryCode,
        checkIn: format(activeAccommodation.checkIn, "yyyy-MM-dd"),
        checkOut: format(activeAccommodation.checkOut, "yyyy-MM-dd"),
        rooms: apiRooms,
        currency: "EUR" as const,
        locale: "fr" as const,
        filters,
        // Important: backend behaves reliably with popularity; price_asc was yielding 0 results for many combos.
        sort: "popularity" as const,
        limit: 50,
      };

      logger.info("Hotels search: start", {
        category: LogCategory.API,
        metadata: requestParams,
      });

      if (debugHotels) {
        console.groupCollapsed("[HotelsUI] Request params (sent to API)");
        console.log(requestParams);
        console.groupEnd();
      }

      const response = await searchHotelsWithRetry(requestParams);

      logger.info("Hotels search: done", {
        category: LogCategory.API,
        metadata: {
          success: response.success,
          total: response.results?.total,
          count: response.results?.hotels?.length,
          cached: response.cache_info?.cached,
        },
      });

      if (debugHotels) {
        console.groupCollapsed("[HotelsUI] Raw API response");
        console.log(response);
        console.groupEnd();
      }

      if (response.success && response.results.hotels.length > 0) {
        const results = response.results.hotels.map(mapApiToHotelResult);

        if (debugHotels) {
          console.groupCollapsed("[HotelsUI] Mapped results (used by UI/map)");
          console.log({ count: results.length, first: results[0] });
          console.groupEnd();
        }

        setHotelSearchResults(results);
        eventBus.emit("hotels:results", { hotels: results });
      } else {
        setHotelSearchResults([]);
        eventBus.emit("hotels:results", { hotels: [] });
        if (response.results.hotels.length === 0) {
          toastInfo(t("planner.accommodation.toast.noResults"), t("planner.accommodation.toast.noResultsDesc"));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("planner.accommodation.toast.searchError");

      logger.error("Hotels search: failed", {
        category: LogCategory.API,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          city: activeAccommodation.city,
          countryCode: activeAccommodation.countryCode,
        },
      });

      console.error("[HotelsUI] Search failed", error);
      toastError(t("planner.accommodation.toast.searchErrorTitle"), message);
      setHotelSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle back from results - clear results and prices from map
  const handleBackFromResults = () => {
    clearHotelSearch();
    setSelectedHotelId(null);
    setHoveredHotel(null);
    // Clear hotel markers from map
    eventBus.emit("hotels:results", { hotels: [] });
  };

  // Handle search in area - uses reverse geocode to get city from map center
  const handleSearchInArea = async (lat: number, lng: number) => {
    if (!activeAccommodation?.checkIn || !activeAccommodation?.checkOut) {
      toastError(t("planner.accommodation.toast.missingDates"), t("planner.accommodation.toast.selectDatesFirst"));
      return;
    }

    setIsSearchingInArea(true);

    try {
      // Step 1: Reverse geocode to get city name
      const { data: geoData, error: geoError } = await supabase.functions.invoke('reverse-geocode', {
        body: { lat, lon: lng }
      });

      if (geoError || !geoData?.city) {
        console.warn('[AccommodationPanel] Reverse geocode failed:', geoError);
        toastError(t("planner.accommodation.toast.locationError"), t("planner.accommodation.toast.locationErrorDesc"));
        return;
      }

      const { city, countryCode } = geoData;
      
      logger.info("Search in area: geocoded", {
        category: LogCategory.API,
        metadata: { lat, lng, city, countryCode },
      });

      // Step 2: Update destination in memory
      const country = geoData.country || "";
      setDestination(city, country, countryCode?.toUpperCase() || activeAccommodation.countryCode, lat, lng);

      // Step 3: Search hotels in this new city
      const roomsConfig =
        memory.customRooms.length > 0
          ? memory.customRooms
          : [{ adults: 2, children: 0, childrenAges: [] as number[], id: "default" }];

      const apiRooms: RoomOccupancy[] = roomsConfig.map((r) => ({
        adults: r.adults,
        childrenAges: r.childrenAges.length > 0 ? r.childrenAges : undefined,
      }));

      const filters = buildHotelFilters(activeAccommodation);

      const requestParams = {
        city,
        countryCode: countryCode?.toUpperCase() || activeAccommodation.countryCode,
        checkIn: format(activeAccommodation.checkIn, "yyyy-MM-dd"),
        checkOut: format(activeAccommodation.checkOut, "yyyy-MM-dd"),
        rooms: apiRooms,
        currency: "EUR" as const,
        locale: "fr" as const,
        filters,
        sort: "popularity" as const,
        limit: 50,
      };

      const response = await searchHotelsWithRetry(requestParams);

      if (response.success && response.results.hotels.length > 0) {
        const results = response.results.hotels.map(mapApiToHotelResult);
        setHotelSearchResults(results);
        eventBus.emit("hotels:results", { hotels: results });
        toastInfo(t("planner.accommodation.toast.newArea"), t("planner.accommodation.toast.newAreaFound", { count: results.length, city }));
      } else {
        setHotelSearchResults([]);
        eventBus.emit("hotels:results", { hotels: [] });
        toastInfo(t("planner.accommodation.toast.noResults"), t("planner.accommodation.toast.noHotelInCity", { city }));
      }
    } catch (error) {
      console.error('[AccommodationPanel] Search in area failed:', error);
      toastError(t("planner.accommodation.toast.error"), t("planner.accommodation.toast.areaSearchError"));
    } finally {
      setIsSearchingInArea(false);
    }
  };

  // Handle hotel selection - show detail view and load full details from API
  const handleHotelSelect = async (hotel: HotelResult) => {
    setSelectedHotelId(hotel.id);
    setSelectedHotelForDetailId(hotel.id);

    // Check if details are already cached
    const cachedDetails = getHotelDetailsFromCache(hotel.id);
    if (cachedDetails) {
      console.log('[AccommodationPanel] Using cached hotel details for:', hotel.id);
      return;
    }

    // Load details from API
    if (!activeAccommodation?.checkIn || !activeAccommodation?.checkOut) {
      console.warn('[AccommodationPanel] Cannot load hotel details: missing dates');
      return;
    }

    setIsLoadingHotelDetails(true);

    try {
      // Build rooms config for API
      const roomsConfig = memory.customRooms.length > 0
        ? memory.customRooms.map(r => ({
            adults: r.adults,
            childrenAges: r.childrenAges.length > 0 ? r.childrenAges : undefined,
          }))
        : [{ adults: 2 }];

      const response = await getHotelDetails(
        hotel.id,
        format(activeAccommodation.checkIn, 'yyyy-MM-dd'),
        format(activeAccommodation.checkOut, 'yyyy-MM-dd'),
        roomsConfig,
        'EUR',
        'fr'
      );

      if (response.success && response.hotel) {
        console.log('[AccommodationPanel] Hotel details loaded:', {
          id: response.hotel.id,
          imagesCount: response.hotel.images?.length || 0,
          roomsCount: response.hotel.rooms?.length || 0,
          hasDescription: !!response.hotel.description,
        });
        setHotelDetails(hotel.id, response.hotel);
      } else {
        console.warn('[AccommodationPanel] Failed to load hotel details:', response);
      }
    } catch (error) {
      console.error('[AccommodationPanel] Error loading hotel details:', error);
      // Don't show error toast - we'll fallback to search result data
    } finally {
      setIsLoadingHotelDetails(false);
    }
  };
  
  // Handle back from detail view - return to results list, clear selection + map highlight
  const handleBackFromDetail = () => {
    setSelectedHotelForDetailId(null);
    setSelectedHotelId(null);
    eventBus.emit("hotels:clearSelection");
    eventBus.emit("hotels:hover", { hotel: null, source: "map" });
  };

  // Handle hotel hover
  const handleHotelHover = (hotel: HotelResult | null) => {
    setHoveredHotel(hotel);
    eventBus.emit("hotels:hover", { hotel });
  };

  if (!activeAccommodation) return null;

  // State for inline add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCitySearch, setNewCitySearch] = useState("");
  const [newCityDates, setNewCityDates] = useState<{ checkIn: Date | null; checkOut: Date | null }>({ checkIn: null, checkOut: null });
  const { data: newCityResults = [], isLoading: isSearchingNewCity } = useLocationAutocomplete(newCitySearch, newCitySearch.length >= 3, ["city"]);

  const handleAddNewCity = (location: LocationResult) => {
    if (location.lat && location.lng) {
      // Add new accommodation with the selected city
      addAccommodation();
      // Get the newly added accommodation (last one)
      setTimeout(() => {
        const newIndex = memory.accommodations.length;
        setActiveAccommodation(newIndex);
        setDestination(
          location.name,
          location.country_name || "",
          location.country_code || "",
          location.lat!,
          location.lng!
        );
        if (newCityDates.checkIn) {
          setDates(newCityDates.checkIn, newCityDates.checkOut);
        }
        if (onMapMove && location.lat && location.lng) {
          onMapMove([location.lng, location.lat], STAYS_ZOOM);
        }
      }, 50);
      
      // Reset form
      setNewCitySearch("");
      setNewCityDates({ checkIn: null, checkOut: null });
      setShowAddForm(false);
      toastInfo(t("planner.accommodation.toast.destinationAdded"), t("planner.accommodation.toast.destinationAddedDesc", { name: location.name }));
    }
  };

  const handleCancelAddCity = () => {
    setShowAddForm(false);
    setNewCitySearch("");
    setNewCityDates({ checkIn: null, checkOut: null });
  };

  // If showing hotel detail, render the detail view
  if (selectedHotelForDetail) {
    // Get loaded details from cache (may be null if still loading or API failed)
    const loadedHotelDetails = getHotelDetailsFromCache(selectedHotelForDetail.id);

    return (
      <HotelDetailView
        hotel={selectedHotelForDetail}
        hotelDetails={loadedHotelDetails}
        isLoading={memory.isLoadingHotelDetails}
        nights={searchNights}
        onBack={handleBackFromDetail}
        onBook={() => {
          // Open booking URL or handle booking
          const bookingUrl = loadedHotelDetails?.bookingUrl || selectedHotelForDetail.bookingUrl;
          if (bookingUrl) {
            window.open(bookingUrl, '_blank');
          } else {
            toastInfo(t("planner.accommodation.toast.booking"), t("planner.accommodation.toast.bookingSoon"));
          }
        }}
      />
    );
  }

  // If showing results, render the results view instead
  if (showResults) {
    return (
      <HotelSearchResults
        results={searchResults}
        isLoading={isSearching}
        destination={activeAccommodation.city}
        nights={searchNights}
        onBack={handleBackFromResults}
        onHotelSelect={handleHotelSelect}
        onHotelHover={handleHotelHover}
        selectedHotelId={selectedHotelId}
        onMapMove={onMapMove}
        mapCenter={mapCenter}
        onSearchInArea={handleSearchInArea}
        isSearchingInArea={isSearchingInArea}
      />
    );
  }

  return (
    <div className="space-y-3" data-tour="stays-panel">
      {/* Accommodation tabs + Add button - always visible */}
      <div className="flex gap-1.5 flex-wrap items-center">
        {memory.accommodations.map((acc, index) => (
          <div
            key={acc.id}
            onClick={() => {
              setActiveAccommodation(index);
              // Zoom on city when clicking tab
              if (acc.lat && acc.lng && onMapMove) {
                onMapMove([acc.lng, acc.lat], STAYS_ZOOM);
              }
            }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 group cursor-pointer",
              index === memory.activeAccommodationIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
            )}
          >
            <Hotel className="h-3 w-3" />
            <span
              className="max-w-24 truncate"
              title={acc.city || t("planner.accommodation.accommodationIndex", { index: index + 1 })}
            >
              {acc.city || t("planner.accommodation.accommodationShort", { index: index + 1 })}
            </span>
            {acc.syncedFromFlight && (
              <SyncBadgeInline source="flight" className="ml-0.5" />
            )}
            {memory.accommodations.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAccommodation(acc.id);
                }}
                className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                  index === memory.activeAccommodationIndex
                    ? "hover:bg-primary-foreground/20"
                    : "hover:bg-destructive/20"
                )}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
        {/* Small + button to add new destination */}
        {flightMemory.tripType !== "multi" && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors border border-dashed border-primary/30 hover:border-primary/50"
            title={t("planner.accommodation.addDestination")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        {flightMemory.tripType === "multi" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground/70 rounded-lg border border-dashed border-border/30">
            <Link2 className="h-3 w-3" />
            <span>{t("planner.accommodation.syncedWithFlights")}</span>
          </div>
        )}
      </div>

      {/* Inline add form */}
      {showAddForm && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">{t("planner.accommodation.addDestination")}</span>
            <button
              onClick={handleCancelAddCity}
              className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
          
          {/* City search */}
          <Popover open={newCitySearch.length >= 3 && newCityResults.length > 0}>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border/50">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <input
                  type="text"
                  value={newCitySearch}
                  onChange={(e) => setNewCitySearch(e.target.value)}
                  placeholder={t("planner.accommodation.searchCity")}
                  className="flex-1 min-w-0 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
                {isSearchingNewCity && (
                  <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-72 p-0 max-h-48 overflow-y-auto" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="py-1">
                {newCityResults.slice(0, 6).map((location) => (
                  <button
                    key={`${location.type}-${location.id}`}
                    onClick={() => handleAddNewCity(location)}
                    className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{location.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {location.country_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* BLOC 1: Essentiel - Destination, Dates, Voyageurs, Budget */}
      <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        {/* Ligne 1: Destination + Dates */}
        <div className="flex items-center gap-2.5 p-2.5 border-b border-border/30">
          <div className="flex-1 min-w-0">
            <DestinationInput
              value={destinationInput}
              onChange={handleDestinationInputChange}
              placeholder={t("planner.accommodation.whereTo")}
              onLocationSelect={handleLocationSelect}
            />
          </div>
          <div className="w-px h-6 bg-border/40" />
          <CompactDateRange
            checkIn={activeAccommodation.checkIn}
            checkOut={activeAccommodation.checkOut}
            onChange={handleDatesChange}
            isSyncedWithFlight={activeAccommodation.syncedFromFlight && !activeAccommodation.userModifiedDates}
          />
        </div>
        
        {/* Ligne 2: Voyageurs + Chambres + Budget */}
        <div className="p-2.5 space-y-2.5">
          {/* Voyageurs et chambres sur une seule ligne */}
          <div className="flex items-center gap-2">
            <TravelersSelector
              adults={travelMemory.travelers.adults}
              children={travelMemory.travelers.children}
              childrenAges={travelMemory.travelers.childrenAges}
              onChange={handleTravelersChange}
            />
            <RoomsSelector
              rooms={rooms}
              travelers={travelMemory.travelers}
              useAuto={memory.useAutoRooms}
              onChange={setCustomRooms}
              onToggleAuto={toggleAutoRooms}
            />
          </div>
          
          {/* Budget - sur 2 lignes */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">{t("planner.accommodation.budgetPerNight")}</span>
            <div className="flex gap-1.5">
              {(["eco", "comfort", "premium"] as BudgetPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleBudgetPreset(preset)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                    activeAccommodation.budgetPreset === preset
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/30"
                  )}
                >
                  {BUDGET_PRESETS[preset].label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                onBlur={handleCustomBudgetBlur}
                placeholder="Min"
                className="text-center text-xs h-8 flex-1"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="number"
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                onBlur={handleCustomBudgetBlur}
                placeholder="Max"
                className="text-center text-xs h-8 flex-1"
              />
              <span className="text-muted-foreground text-xs">€</span>
            </div>
          </div>
        </div>

      </div>

      {/* BLOC 2: Préférences - Type, Note, Équipements */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-2.5 space-y-2.5">
        {/* Type d'hébergement */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">{t("planner.accommodation.type.label")}</span>
          <div className="flex gap-1.5 flex-wrap">
            {ACCOMMODATION_TYPES.map((type) => (
              <ChipButton
                key={type.id}
                icon={type.icon}
                selected={activeAccommodation.types.includes(type.id)}
                onClick={() => toggleType(type.id)}
                compact
              >
                {type.label}
              </ChipButton>
            ))}
          </div>
        </div>

        {/* Note minimum */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">{t("planner.accommodation.rating.min")}</span>
          <div className="flex gap-1.5">
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value ?? "any"}
                onClick={() => setMinRating(option.value)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1",
                  activeAccommodation.minRating === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                {option.value && <Star className="h-3 w-3" />}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Équipements */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">{t("planner.accommodation.amenities.label")}</span>
          <div className="flex gap-1.5 flex-wrap">
            {ESSENTIAL_AMENITIES.map((amenity) => (
              <ChipButton
                key={amenity.id}
                icon={amenity.icon}
                selected={activeAccommodation.amenities.includes(amenity.id)}
                onClick={() => toggleAmenity(amenity.id)}
                compact
              >
                {amenity.label}
              </ChipButton>
            ))}
          </div>
        </div>
      </div>

      {/* Filtres avancés (repliable) */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isAdvancedOpen && "rotate-180")} />
            <span>{t("planner.accommodation.filters.advanced")}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="rounded-xl border border-border/40 bg-card/50 p-3 space-y-3">
            {/* Formule repas */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">{t("planner.accommodation.filters.mealPlan")}</span>
              <div className="flex gap-1.5 flex-wrap">
                {MEAL_PLANS.map((meal) => (
                  <ChipButton
                    key={meal.id}
                    icon={meal.icon}
                    selected={activeAccommodation.advancedFilters.mealPlan === meal.id}
                    onClick={() => handleMealPlanToggle(meal.id)}
                    compact
                  >
                    {meal.label}
                  </ChipButton>
                ))}
              </div>
            </div>

            {/* Vue */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">{t("planner.accommodation.filters.views")}</span>
              <div className="flex gap-1.5 flex-wrap">
                {VIEW_OPTIONS.map((view) => (
                  <ChipButton
                    key={view.id}
                    icon={view.icon}
                    selected={activeAccommodation.advancedFilters.views.includes(view.id)}
                    onClick={() => handleArrayToggle("views", view.id)}
                    compact
                  >
                    {view.label}
                  </ChipButton>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">{t("planner.accommodation.filters.services")}</span>
              <div className="flex gap-1.5 flex-wrap">
                {SERVICE_OPTIONS.map((service) => (
                  <ChipButton
                    key={service.id}
                    icon={service.icon}
                    selected={activeAccommodation.advancedFilters.services.includes(service.id)}
                    onClick={() => handleArrayToggle("services", service.id)}
                    compact
                  >
                    {service.label}
                  </ChipButton>
                ))}
              </div>
            </div>

            {/* Accessibilité */}
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">{t("planner.accommodation.filters.accessibility")}</span>
              <div className="flex gap-1.5 flex-wrap">
                {ACCESSIBILITY_OPTIONS.map((access) => (
                  <ChipButton
                    key={access.id}
                    icon={access.icon}
                    selected={activeAccommodation.advancedFilters.accessibility.includes(access.id)}
                    onClick={() => handleArrayToggle("accessibility", access.id)}
                    compact
                  >
                    {access.label}
                  </ChipButton>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Search Buttons */}
      <div className="flex gap-2">
        <Button
          data-testid="hotels-search-button"
          onClick={handleSearch}
          disabled={!canSearch || isSearching}
          className="flex-1 h-9 text-xs font-medium"
        >
          {isSearching ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
              {t("planner.accommodation.searching")}
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5 mr-1.5" />
              {t("planner.accommodation.search")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default memo(AccommodationPanel);
