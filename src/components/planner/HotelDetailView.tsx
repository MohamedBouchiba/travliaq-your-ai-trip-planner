import { memo, useState, useCallback, useRef, useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Star, MapPin, Wifi, Car, Coffee, Waves, ExternalLink, ChevronLeft, ChevronRight, Bed, Users, Clock, Check, Shield, Heart, Utensils, Dumbbell, Bath, Tv, Phone, Snowflake, Loader2, Award, Flame, ThumbsUp, MapPinned, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { HotelResult } from "./HotelSearchResults";
import type { HotelDetails, RoomOption, PropertyBadge, AmenityCategory, AmenityDetail, CategorizedAmenities } from "@/services/hotels/hotelService";

interface HotelDetailViewProps {
  hotel: HotelResult;
  hotelDetails?: HotelDetails | null;
  isLoading?: boolean;
  nights: number;
  onBack: () => void;
  onSelect?: () => void;
  onBook?: () => void;
}

// Get hotel images - use real images from hotel data if available, fallback to main image only
const getHotelImages = (hotel: HotelResult): string[] => {
  // If hotel has additional images property (from API details), use them
  const hotelWithImages = hotel as HotelResult & { images?: string[] };
  if (hotelWithImages.images && hotelWithImages.images.length > 0) {
    return hotelWithImages.images;
  }
  // Otherwise just return the main image
  return hotel.imageUrl ? [hotel.imageUrl] : [];
};

// Extended amenity icons mapping with many more options
const amenityIcons: Record<string, typeof Wifi> = {
  // Connectivity
  wifi: Wifi,
  "free wifi": Wifi,
  "free_wifi": Wifi,
  internet: Wifi,
  // Parking
  parking: Car,
  "free parking": Car,
  "free_parking": Car,
  // Food & Drinks
  breakfast: Coffee,
  "free breakfast": Coffee,
  "free_breakfast": Coffee,
  restaurant: Utensils,
  bar: Coffee,
  roomservice: Phone,
  "room service": Phone,
  "room_service": Phone,
  minibar: Coffee,
  // Wellness & Fitness
  pool: Waves,
  "swimming pool": Waves,
  "swimming_pool": Waves,
  "indoor pool": Waves,
  "outdoor pool": Waves,
  gym: Dumbbell,
  fitness: Dumbbell,
  "fitness center": Dumbbell,
  "fitness_center": Dumbbell,
  spa: Bath,
  sauna: Bath,
  hammam: Bath,
  massage: Bath,
  wellness: Bath,
  jacuzzi: Waves,
  // Room amenities
  "air conditioning": Snowflake,
  "air_conditioning": Snowflake,
  ac: Snowflake,
  aircon: Snowflake,
  tv: Tv,
  "flat-screen tv": Tv,
  "flat_screen_tv": Tv,
  // Services
  concierge: Phone,
  reception: Clock,
  "24h reception": Clock,
  "24h_reception": Clock,
  laundry: Check,
  cleaning: Check,
};

// Badge icon mapping based on icon hint from API
const getBadgeIcon = (iconHint?: string) => {
  const iconClass = "h-3 w-3";
  switch (iconHint) {
    case "coffee": return <Coffee className={iconClass} />;
    case "wifi": return <Wifi className={iconClass} />;
    case "waves": return <Waves className={iconClass} />;
    case "shield": return <Shield className={iconClass} />;
    case "car": return <Car className={iconClass} />;
    case "sparkles": return <Sparkles className={iconClass} />;
    case "dumbbell": return <Dumbbell className={iconClass} />;
    case "utensils": return <Utensils className={iconClass} />;
    case "snowflake": return <Snowflake className={iconClass} />;
    default: return <Check className={iconClass} />;
  }
};

// Category configuration for amenities - using i18n keys
const CATEGORY_CONFIG_KEYS: Record<AmenityCategory, { icon: typeof Wifi; labelKey: string; color: string }> = {
  connectivity: { icon: Wifi, labelKey: "planner.hotels.amenities.connectivity", color: "text-blue-600" },
  food: { icon: Utensils, labelKey: "planner.hotels.amenities.food", color: "text-orange-600" },
  wellness: { icon: Bath, labelKey: "planner.hotels.amenities.wellness", color: "text-teal-600" },
  room: { icon: Bed, labelKey: "planner.hotels.amenities.room", color: "text-purple-600" },
  services: { icon: Phone, labelKey: "planner.hotels.amenities.services", color: "text-green-600" },
  general: { icon: Check, labelKey: "planner.hotels.amenities.general", color: "text-gray-600" },
};

const CATEGORY_ORDER: AmenityCategory[] = ['connectivity', 'food', 'wellness', 'room', 'services', 'general'];

// Free/Paid status badge component
const FreeStatusBadge = ({ isFree, t }: { isFree?: boolean | null; t: (key: string) => string }) => {
  if (isFree === null || isFree === undefined) return null;
  return isFree ? (
    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/30">{t("planner.hotels.free")}</Badge>
  ) : (
    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/30">{t("planner.hotels.paid")}</Badge>
  );
};

// Top amenities for quick scan
const TOP_AMENITIES = ['wifi', 'parking', 'breakfast', 'pool', 'spa', 'gym', 'restaurant', 'ac'];

// Amenity label keys for quick scan display
const AMENITY_LABEL_KEYS: Record<string, string> = {
  wifi: 'planner.hotels.amenities.wifi',
  parking: 'planner.hotels.amenities.parking',
  breakfast: 'planner.hotels.amenities.breakfast',
  pool: 'planner.hotels.pool',
  spa: 'planner.hotels.spa',
  gym: 'planner.hotels.amenities.fitness',
  restaurant: 'planner.hotels.amenities.restaurant',
  ac: 'planner.hotels.amenities.ac',
};

// RoomCard component with expandable details
const RoomCard = ({
  room,
  nights,
  isExpanded,
  onToggle,
  t
}: {
  room: RoomOption;
  nights: number;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) => (
  <div className="rounded-xl border bg-card overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{room.name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {room.maxOccupancy} {t("planner.hotels.persons")}
          </span>
          {room.bedType && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bed className="h-3 w-3" />
              {room.bedType}
            </span>
          )}
          {room.cancellationFree && (
            <Badge className="bg-green-500/10 text-green-600 text-[10px] px-1.5 py-0 h-4 border-green-500/30">
              <Shield className="h-2.5 w-2.5 mr-0.5" />
              {t("planner.hotels.freeCancellation")}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <div className="text-primary font-bold">
          {room.pricePerNight}€
          <span className="text-xs font-normal text-muted-foreground">{t("planner.hotels.perNightShort")}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {room.totalPrice || Math.round(room.pricePerNight * nights)}€ total
        </div>
      </div>
      <ChevronDown className={cn("h-4 w-4 ml-2 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
    </button>

    {isExpanded && (
      <div className="px-4 pb-4 border-t space-y-3 pt-3">
        {room.description && (
          <p className="text-sm text-muted-foreground">{room.description}</p>
        )}
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.map((amenity, idx) => {
              const Icon = amenityIcons[amenity.toLowerCase()] || Check;
              return (
                <Badge key={idx} variant="outline" className="text-xs gap-1">
                  <Icon className="h-3 w-3" />
                  {amenity}
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    )}
  </div>
);

// Collapsible amenity category section
const AmenityCategorySection = ({
  category,
  amenities,
  defaultOpen = false,
  t
}: {
  category: AmenityCategory;
  amenities: AmenityDetail[];
  defaultOpen?: boolean;
  t: (key: string) => string;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const config = CATEGORY_CONFIG_KEYS[category];

  if (amenities.length === 0) return null;

  const Icon = config.icon;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", config.color)} />
          <span className="font-medium text-sm">{t(config.labelKey)}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{amenities.length}</Badge>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="p-3 pt-0 grid gap-1.5">
          {amenities.map((amenity, idx) => {
            const AmenityIcon = amenityIcons[amenity.code] || Check;
            return (
              <div
                key={`${amenity.code}-${idx}`}
                className="flex items-center justify-between p-2 rounded bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <AmenityIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{amenity.label}</span>
                </div>
                <FreeStatusBadge isFree={amenity.isFree} t={t} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Get hotel description - use real description if available
const getHotelDescription = (hotel: HotelResult): string => {
  // Use real description from API if available
  const hotelWithDesc = hotel as HotelResult & { description?: string };
  if (hotelWithDesc.description) {
    return hotelWithDesc.description;
  }
  // No fallback description - return empty if no real data
  return "";
};

// Get rating label based on score - using i18n keys
const getRatingLabel = (rating: number, t: (key: string) => string): { label: string; color: string } => {
  if (rating >= 9) return { label: t("planner.hotels.rating.exceptional"), color: "text-green-600 bg-green-500/10 border-green-500/30" };
  if (rating >= 8) return { label: t("planner.hotels.rating.veryGood"), color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" };
  if (rating >= 7) return { label: t("planner.hotels.rating.good"), color: "text-blue-600 bg-blue-500/10 border-blue-500/30" };
  if (rating >= 6) return { label: t("planner.hotels.rating.correct"), color: "text-amber-600 bg-amber-500/10 border-amber-500/30" };
  return { label: t("planner.hotels.rating.fair"), color: "text-muted-foreground bg-muted border-border" };
};

// Get key selling points based on hotel features
const getKeyBadges = (hotel: HotelResult, hotelDetails: HotelDetails | null | undefined, t: (key: string) => string): { icon: typeof Wifi; label: string; variant: "highlight" | "feature" | "location" }[] => {
  const badges: { icon: typeof Wifi; label: string; variant: "highlight" | "feature" | "location" }[] = [];
  
  // Rating based badge
  if (hotel.rating && hotel.rating >= 9) {
    badges.push({ icon: Award, label: t("planner.hotels.excellentChoice"), variant: "highlight" });
  } else if (hotel.rating && hotel.rating >= 8.5) {
    badges.push({ icon: ThumbsUp, label: t("planner.hotels.veryAppreciated"), variant: "highlight" });
  }
  
  // Location badge
  if (hotel.distanceFromCenter) {
    const distance = typeof hotel.distanceFromCenter === 'string' 
      ? parseFloat(hotel.distanceFromCenter) 
      : hotel.distanceFromCenter;
    if (distance < 0.5) {
      badges.push({ icon: MapPinned, label: t("planner.hotels.cityCenter"), variant: "location" });
    } else if (distance < 1.5) {
      badges.push({ icon: MapPin, label: t("planner.hotels.nearCenter"), variant: "location" });
    }
  }
  
  // Breakfast included
  const hasBreakfast = hotel.amenities.some(a => a.toLowerCase().includes("breakfast")) ||
    hotelDetails?.amenities?.some(a => a.code?.toLowerCase().includes("breakfast"));
  if (hasBreakfast) {
    badges.push({ icon: Coffee, label: t("planner.hotels.breakfastIncluded"), variant: "feature" });
  }
  
  // Pool
  const hasPool = hotel.amenities.some(a => a.toLowerCase().includes("pool")) ||
    hotelDetails?.amenities?.some(a => a.code?.toLowerCase().includes("pool"));
  if (hasPool) {
    badges.push({ icon: Waves, label: t("planner.hotels.pool"), variant: "feature" });
  }
  
  // Spa
  const hasSpa = hotel.amenities.some(a => a.toLowerCase().includes("spa")) ||
    hotelDetails?.amenities?.some(a => a.code?.toLowerCase().includes("spa"));
  if (hasSpa) {
    badges.push({ icon: Bath, label: t("planner.hotels.spa"), variant: "feature" });
  }
  
  // Free cancellation from rooms
  const hasFreeCancellation = hotelDetails?.rooms?.some(r => r.cancellationFree);
  if (hasFreeCancellation) {
    badges.push({ icon: Shield, label: t("planner.hotels.freeCancellation"), variant: "highlight" });
  }
  
  // Popular/trending
  if (hotel.reviewCount && hotel.reviewCount > 500) {
    badges.push({ icon: Flame, label: t("planner.hotels.popular"), variant: "highlight" });
  }
  
  return badges.slice(0, 5);
};

const HotelDetailView = ({
  hotel,
  hotelDetails,
  isLoading = false,
  nights,
  onBack,
  onSelect,
  onBook,
}: HotelDetailViewProps) => {
  const { t } = useTranslation();
  // Use hotelDetails when available, fallback to hotel (search result)
  const images = hotelDetails?.images?.length
    ? hotelDetails.images
    : getHotelImages(hotel);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isRatingBreakdownOpen, setIsRatingBreakdownOpen] = useState(false);
  const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Use hotelDetails description if available
  const description = hotelDetails?.description || getHotelDescription(hotel);

  // Get smart badges based on real data
  const keyBadges = getKeyBadges(hotel, hotelDetails, t);
  const ratingInfo = hotel.rating ? getRatingLabel(hotel.rating, t) : null;

  // Get rooms from details API
  const rooms = hotelDetails?.rooms || [];

  // Get policies from details API
  const policies = hotelDetails?.policies;

  // Check-in/Check-out with fallback defaults
  const checkInTime = policies?.checkIn || "15:00";
  const checkOutTime = policies?.checkOut || "11:00";

  // Get amenities - prefer detailed amenities with labels
  const amenitiesForDisplay = hotelDetails?.amenities?.length
    ? hotelDetails.amenities
    : hotel.amenities.map(a => ({ code: a.toLowerCase(), label: a }));

  // Force scroll to top immediately when hotel changes
  useLayoutEffect(() => {
    setCurrentImageIndex(0);
    setShowAllRooms(false);
    setExpandedRoomId(null);
    setIsDescExpanded(false);
    setIsRatingBreakdownOpen(false);
    setIsAmenitiesOpen(false);

    // 1) Ensure the surrounding panel scrolls back to the top
    rootRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    
    // 2) Reset Radix ScrollArea viewport scroll
    const resetInnerScroll = () => {
      if (!scrollAreaRef.current) return;
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement | null;
      if (viewport) viewport.scrollTop = 0;
    };

    // 3) Also scroll the panel container directly
    const scrollPanel = () => {
      // Find parent scrollable container
      let parent = rootRef.current?.parentElement;
      while (parent) {
        if (parent.scrollTop > 0 || parent.scrollHeight > parent.clientHeight) {
          parent.scrollTop = 0;
        }
        // Also check for data-radix-scroll-area-viewport in parent chain
        const viewport = parent.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (viewport) viewport.scrollTop = 0;
        parent = parent.parentElement;
      }
    };

    resetInnerScroll();
    scrollPanel();
    
    // Multiple attempts to ensure scroll reset (handles async rendering)
    requestAnimationFrame(() => {
      resetInnerScroll();
      scrollPanel();
    });
    setTimeout(() => {
      resetInnerScroll();
      scrollPanel();
    }, 0);
    setTimeout(() => {
      resetInnerScroll();
      scrollPanel();
    }, 50);
  }, [hotel.id]);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const totalPrice = hotel.totalPrice ?? hotel.pricePerNight * nights;
  const pricePerNightPerPerson = Math.round(hotel.pricePerNight / 2);

  // Show loading skeleton while fetching details
  if (isLoading) {
    return (
      <div ref={rootRef} className="flex flex-col h-full bg-background animate-enter">
        {/* Header with back button */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3 border-b flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        {/* Image skeleton */}
        <Skeleton className="aspect-[16/10] w-full" />
        {/* Content skeletons */}
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("planner.common.loadingDetails")}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex flex-col h-full bg-background animate-enter">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 py-3 border-b flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{hotel.name}</h2>
          {hotel.stars && hotel.stars > 0 && (
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {/* Image Carousel */}
          <div className="relative aspect-[16/10] bg-muted">
            <img
              src={images[currentImageIndex]}
              alt={`${hotel.name} - Photo ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop";
              }}
            />

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  aria-label={t("planner.common.previousPhoto")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  aria-label={t("planner.common.nextPhoto")}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
              {currentImageIndex + 1} / {images.length}
            </div>

            {/* Thumbnail dots */}
            <div className="absolute bottom-3 right-3 flex gap-1.5">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentImageIndex
                      ? "bg-white scale-110"
                      : "bg-white/50 hover:bg-white/75"
                  )}
                  aria-label={t("planner.hotels.goToPhoto", { index: idx + 1 })}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* HERO CARD - Rating + Prix + Check-in/out en un coup d'œil */}
            <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4 space-y-3">
              {/* Ligne 1: Rating + Prix */}
              <div className="flex items-center justify-between">
                {/* Rating */}
                {ratingInfo ? (
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-semibold", ratingInfo.color)}>
                    <span className="text-base">{hotel.rating.toFixed(1)}</span>
                    <span className="text-xs">{ratingInfo.label}</span>
                    <span className="text-xs text-muted-foreground">({hotel.reviewCount.toLocaleString()})</span>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{t("planner.hotels.notYetRated")}</div>
                )}
                {/* Prix */}
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{hotel.pricePerNight}€</span>
                  <span className="text-xs text-muted-foreground">/{t("planner.hotels.perNight")}</span>
                </div>
              </div>

              {/* Ligne 2: Check-in / Check-out */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">{t("planner.hotels.checkIn")}:</span>
                    <span className="font-medium">{checkInTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-muted-foreground">{t("planner.hotels.checkOut")}:</span>
                    <span className="font-medium">{checkOutTime}</span>
                  </div>
                </div>
                {/* Prix total */}
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">{nights > 1 ? t("planner.hotels.nightsPlural", { count: nights }) : t("planner.hotels.nights", { count: nights })}: </span>
                  <span className="font-semibold">{totalPrice}€</span>
                </div>
              </div>

              {/* Ligne 3: Key badges (fusionnés) */}
              {(keyBadges.length > 0 || (hotelDetails?.highlights && hotelDetails.highlights.length > 0)) && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                  {keyBadges.slice(0, 4).map((badge, idx) => {
                    const Icon = badge.icon;
                    const variantStyles = {
                      highlight: "bg-primary/10 border-primary/30 text-primary",
                      feature: "bg-blue-500/10 border-blue-500/30 text-blue-600",
                      location: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
                    };
                    return (
                      <Badge
                        key={idx}
                        variant="outline"
                        className={cn("text-[10px] gap-1 px-1.5 py-0 h-5", variantStyles[badge.variant])}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {badge.label}
                      </Badge>
                    );
                  })}
                  {hotelDetails?.highlights?.slice(0, 2).map((highlight, idx) => (
                    <Badge
                      key={`hl-${idx}`}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    >
                      {highlight}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Amenities Scan - Top amenities for quick overview */}
            {amenitiesForDisplay.length > 0 && (
              <section className="flex flex-wrap gap-3 py-2 border-y">
                {TOP_AMENITIES.map(code => {
                  const hasAmenity = amenitiesForDisplay.some(
                    a => a.code === code || a.code?.includes(code) || a.label?.toLowerCase().includes(code)
                  );
                  if (!hasAmenity) return null;
                  const Icon = amenityIcons[code] || Check;
                  return (
                    <div key={code} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{AMENITY_LABEL_KEYS[code] ? t(AMENITY_LABEL_KEYS[code]) : code}</span>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Location - Unified section with address and distance */}
            {(hotelDetails?.address || hotel.distanceFromCenter) && (
              <section className="rounded-xl border bg-card p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t("planner.hotels.location")}
                </h3>
                {hotelDetails?.address && (
                  <p className="text-sm text-muted-foreground">{hotelDetails.address}</p>
                )}
                {hotel.distanceFromCenter && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs gap-1">
                      <MapPinned className="h-3 w-3" />
                      {hotel.distanceFromCenter} {t("planner.hotels.fromCenter")}
                    </Badge>
                  </div>
                )}
              </section>
            )}

            {/* Room options - Moved up for better UX (decision info first) */}
            {rooms.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Bed className="h-4 w-4 text-primary" />
                    {t("planner.common.availableRooms")} ({rooms.length})
                  </h3>
                  {rooms.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-xs"
                      onClick={() => setShowAllRooms(!showAllRooms)}
                    >
                      {showAllRooms ? t("planner.common.showLess") : t("planner.common.showAllRooms", { count: rooms.length })}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {(showAllRooms ? rooms : rooms.slice(0, 3)).map((room, index) => (
                    <RoomCard
                      key={room.id || index}
                      room={room}
                      nights={nights}
                      isExpanded={expandedRoomId === (room.id || String(index))}
                      onToggle={() => setExpandedRoomId(
                        expandedRoomId === (room.id || String(index)) ? null : (room.id || String(index))
                      )}
                      t={t}
                    />
                  ))}
                </div>
                {!showAllRooms && rooms.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAllRooms(true)}
                  >
                    {t("planner.common.showOtherRooms", { count: rooms.length - 3 })}
                  </Button>
                )}
              </section>
            )}

            {/* Description - Collapsible for long text */}
            {description && (
              <section className="space-y-2">
                <h3 className="font-semibold text-sm">{t("planner.common.aboutHotel")}</h3>
                <p className={cn(
                  "text-sm text-muted-foreground leading-relaxed",
                  !isDescExpanded && description.length > 300 && "line-clamp-4"
                )}>
                  {description}
                </p>
                {description.length > 300 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                  >
                    {isDescExpanded ? t("planner.common.showLess") : t("planner.common.showMore")}
                  </Button>
                )}
              </section>
            )}

            {/* Rating breakdown - Collapsible */}
            {hotelDetails?.ratingBreakdown && (
              <section className="rounded-xl border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsRatingBreakdownOpen(!isRatingBreakdownOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary fill-primary" />
                    {t("planner.hotels.detailedRatings")}
                  </h3>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isRatingBreakdownOpen && "rotate-180")} />
                </button>
                {isRatingBreakdownOpen && (
                  <div className="px-4 pb-4 grid gap-2">
                    {[
                      { key: 'cleanliness', labelKey: 'planner.hotels.ratingBreakdown.cleanliness', value: hotelDetails.ratingBreakdown.cleanliness },
                      { key: 'staff', labelKey: 'planner.hotels.ratingBreakdown.staff', value: hotelDetails.ratingBreakdown.staff },
                      { key: 'location', labelKey: 'planner.hotels.ratingBreakdown.location', value: hotelDetails.ratingBreakdown.location },
                      { key: 'facilities', labelKey: 'planner.hotels.ratingBreakdown.facilities', value: hotelDetails.ratingBreakdown.facilities },
                      { key: 'comfort', labelKey: 'planner.hotels.ratingBreakdown.comfort', value: hotelDetails.ratingBreakdown.comfort },
                      { key: 'valueForMoney', labelKey: 'planner.hotels.ratingBreakdown.valueForMoney', value: hotelDetails.ratingBreakdown.valueForMoney },
                    ].filter(item => item.value != null).map((item) => (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-32 shrink-0">{t(item.labelKey)}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(item.value! / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{item.value!.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Amenities - Collapsible section */}
            {(hotelDetails?.amenitiesByCategory || amenitiesForDisplay.length > 0) && (
              <section className="rounded-xl border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsAmenitiesOpen(!isAmenitiesOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    {t("planner.hotels.whatThisOffers")}
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 ml-1">
                      {amenitiesForDisplay.length}
                    </Badge>
                  </h3>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isAmenitiesOpen && "rotate-180")} />
                </button>

                {isAmenitiesOpen && (
                  <div className="px-4 pb-4">
                    {hotelDetails?.amenitiesByCategory ? (
                      /* Categorized view with collapsible sections */
                      <div className="space-y-2">
                        {CATEGORY_ORDER.map(category => (
                          <AmenityCategorySection
                            key={category}
                            category={category}
                            amenities={hotelDetails.amenitiesByCategory![category]}
                            defaultOpen={category === 'connectivity' || category === 'food'}
                            t={t}
                          />
                        ))}
                      </div>
                    ) : (
                      /* Fallback: flat grid for legacy data */
                      <div className="grid grid-cols-2 gap-2">
                        {amenitiesForDisplay.map((amenity) => {
                          const Icon = amenityIcons[amenity.code] || Check;
                          return (
                            <div
                              key={amenity.code}
                              className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-sm"
                            >
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <span>{amenity.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Cancellation policy - Only shown if available (check-in/out in Hero Card) */}
            {policies?.cancellation && (
              <section className="rounded-lg bg-muted/50 p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {t("planner.hotels.cancellationPolicy")}
                </h3>
                <p className="text-sm text-muted-foreground">{policies.cancellation}</p>
              </section>
            )}

            {/* Why book here */}
            <section className="rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
                <Heart className="h-4 w-4" />
                {t("planner.hotels.whyBookHere")}
              </h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{t("planner.hotels.bestPriceGuarantee")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{t("planner.hotels.instantConfirmation")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{t("planner.hotels.support24h")}</span>
                </li>
              </ul>
            </section>

            {/* Extra spacing for scroll comfort */}
            <div className="h-4" />
          </div>
        </ScrollArea>
      </div>

      {/* Sticky booking footer with 2 buttons */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{nights > 1 ? t("planner.hotels.nightsPlural", { count: nights }) : t("planner.hotels.nights", { count: nights })}</span>
          <span className="text-xl font-bold text-primary">{totalPrice}€</span>
        </div>
        <div className="flex gap-2">
          {onSelect && (
            <Button
              variant="default"
              className="flex-1 h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
              onClick={onSelect}
            >
              <Check className="h-4 w-4 mr-2" />
              {t("planner.hotels.chooseThisHotel") || "Choisir cet hôtel"}
            </Button>
          )}
          <Button
            className={cn("h-12 text-base font-semibold", onSelect ? "flex-none px-4" : "flex-1")}
            variant={onSelect ? "outline" : "default"}
            onClick={onBook}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("planner.common.book")}
          </Button>
          {hotelDetails?.bookingUrl && (
            <Button
              variant="outline"
              className="h-12 px-4"
              onClick={() => window.open(hotelDetails.bookingUrl, '_blank')}
            >
              {t("planner.common.viewOnBooking")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(HotelDetailView);
