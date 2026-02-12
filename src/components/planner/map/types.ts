import type { TabType, MapPin } from "@/pages/TravelPlanner";
import type { FlightRoutePoint } from "../PlannerPanel";

// Destination click event for popup
export interface DestinationClickEvent {
  cityName: string;
  countryName?: string;
  lat: number;
  lng: number;
  screenPosition: { x: number; y: number };
}

export interface UserLocation {
  lat: number;
  lng: number;
  city: string;
}

export interface PlannerMapProps {
  activeTab: TabType;
  center: [number, number];
  zoom: number;
  onPinClick: (pin: MapPin) => void;
  selectedPinId?: string;
  flightRoutes?: FlightRoutePoint[];
  animateToUserLocation?: boolean;
  onAnimationComplete?: () => void;
  isPanelOpen?: boolean;
  userLocation?: UserLocation | null;
  onDestinationClick?: (event: DestinationClickEvent) => void;
  /**
   * Forces the map to re-focus on user location for a given tab switch.
   * Incrementing nonce triggers a new focus.
   */
  userDefaultFocusNonce?: number;
  /** Whether we're on a mobile device */
  isMobile?: boolean;
  /** Whether the mobile widget panel is open (affects map padding) */
  mobileWidgetOpen?: boolean;
}
