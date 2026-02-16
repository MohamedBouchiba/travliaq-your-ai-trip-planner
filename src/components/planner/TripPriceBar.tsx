import { useTripBasketStore } from '@/stores/tripBasketStore';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { Button } from '@/components/ui/button';
import { Plane } from 'lucide-react';
import { useMemo } from 'react';

interface TripPriceBarProps {
  onPlanTrip: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
  CAD: 'CA$',
  MAD: 'MAD',
  XOF: 'CFA',
  TND: 'DT',
};

const TripPriceBar = ({ onPlanTrip }: TripPriceBarProps) => {
  const basketItems = useTripBasketStore((s) => s.basketItems);
  const flexibleTripType = useTripBasketStore((s) => s.flexibleTripType);
  const { preferences } = useUserPreferences();

  const currency = preferences.currency || 'EUR';
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const totalPrice = useMemo(
    () => basketItems.reduce((total, item) => total + item.price, 0),
    [basketItems]
  );

  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(totalPrice);
  }, [totalPrice]);

  const isComplete = useMemo(() => {
    if (basketItems.length === 0) return false;
    const completedTypes = new Set(basketItems.map((i) => i.type));
    const completed: string[] = [];
    if (completedTypes.has('flight')) completed.push('flights');
    if (completedTypes.has('hotel')) completed.push('hotels');
    if (completedTypes.has('activity')) completed.push('activities');
    if (completedTypes.has('transfer')) completed.push('transfers');
    if (completedTypes.has('train')) completed.push('train');
    if (completedTypes.has('car-rental')) completed.push('car-rental');
    if (completedTypes.has('cruise')) completed.push('cruise');

    const requiredMap: Record<string, string[]> = {
      'flight-hotel': ['flights', 'hotels', 'activities'],
      'hotel-only': ['hotels', 'activities'],
      'day-trip': ['activities'],
      'train-journey': ['train', 'hotels', 'activities'],
      'road-trip': ['car-rental', 'hotels', 'activities'],
      'cruise': ['cruise', 'activities'],
      'custom': ['flights'],
    };
    const required = requiredMap[flexibleTripType] || ['flights', 'hotels', 'activities'];
    const bookableSteps = ['flights', 'hotels', 'activities', 'transfers', 'train', 'car-rental', 'cruise'];
    const missing = required.filter((s) => bookableSteps.includes(s) && !completed.includes(s));
    return missing.length === 0;
  }, [basketItems, flexibleTripType]);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      <div className="mx-3 mb-3 rounded-xl bg-card/90 backdrop-blur-xl border border-border/40 shadow-lg">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          {/* Price display */}
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-lg font-bold text-foreground tabular-nums">
              {formattedPrice}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {symbol}
            </span>
          </div>

          {/* Plan button */}
          <Button
            variant={isComplete ? 'hero' : 'secondary'}
            size="sm"
            disabled={!isComplete}
            onClick={onPlanTrip}
            className="gap-1.5 text-xs h-8 px-3"
          >
            <Plane className="h-3.5 w-3.5" />
            Planifier mon voyage
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TripPriceBar;
