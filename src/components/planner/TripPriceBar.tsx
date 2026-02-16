import { useTripBasketStore } from '@/stores/tripBasketStore';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Plane } from 'lucide-react';
import { useMemo } from 'react';

interface TripPriceBarProps {
  onPlanTrip: () => void;
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + ' ' + currency;
};

const TripPriceBar = ({ onPlanTrip }: TripPriceBarProps) => {
  const basketItems = useTripBasketStore((s) => s.basketItems);
  const currency = useTripBasketStore((s) => s.basketCurrency);
  const flexibleTripType = useTripBasketStore((s) => s.flexibleTripType);

  const totalPrice = useMemo(
    () => basketItems.reduce((total, item) => total + item.price, 0),
    [basketItems]
  );

  const itemCount = basketItems.length;

  // Compute isComplete inline to avoid calling store methods as selectors
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

    // Import getRequiredSteps logic inline
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
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 gap-3">
        {/* Left: item count + total price */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ShoppingBag className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">{itemCount}</span>
          </div>
          <span className="text-base font-bold text-foreground truncate">
            {formatPrice(totalPrice, currency)}
          </span>
        </div>

        {/* Right: plan button */}
        <Button
          variant={isComplete ? 'hero' : 'secondary'}
          size="sm"
          disabled={!isComplete}
          onClick={onPlanTrip}
          className="gap-2 whitespace-nowrap"
        >
          <Plane className="h-4 w-4" />
          Planifier mon voyage
        </Button>
      </div>
    </div>
  );
};

export default TripPriceBar;
