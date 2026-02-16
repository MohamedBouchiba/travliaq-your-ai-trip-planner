import { useTripBasketStore } from '@/stores/tripBasketStore';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { Button } from '@/components/ui/button';
import { Plane, Hotel, Compass, Check } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TripPriceBarProps {
  onPlanTrip: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: 'CA$', MAD: 'MAD', XOF: 'CFA', TND: 'DT',
};

const STEP_CONFIG = [
  { key: 'flights', icon: Plane, label: 'Vols' },
  { key: 'hotels', icon: Hotel, label: 'Hôtels' },
  { key: 'activities', icon: Compass, label: 'Activités' },
] as const;

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

  const { completedSteps, requiredSteps, isComplete } = useMemo(() => {
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

    return {
      completedSteps: completed,
      requiredSteps: required,
      isComplete: missing.length === 0 && basketItems.length > 0,
    };
  }, [basketItems, flexibleTripType]);

  // Only show steps that are required for this trip type
  const visibleSteps = STEP_CONFIG.filter((s) => requiredSteps.includes(s.key));

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/90 backdrop-blur-xl border-t border-border/30">
      <div className="flex items-center justify-between px-3 py-1.5 gap-2">
        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {visibleSteps.map(({ key, icon: Icon, label }, idx) => {
            const done = completedSteps.includes(key);
            return (
              <div key={key} className="flex items-center gap-1">
                {idx > 0 && (
                  <div className={cn(
                    'h-px w-3',
                    completedSteps.includes(visibleSteps[idx - 1].key) ? 'bg-green-500/50' : 'bg-border/50'
                  )} />
                )}
                <div className="flex items-center gap-1">
                  <div className={cn(
                    'flex items-center justify-center h-5 w-5 rounded-full transition-colors',
                    done
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-muted/40 text-muted-foreground/40'
                  )}>
                    {done ? <Check className="h-3 w-3" /> : <Icon className="h-2.5 w-2.5" />}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium hidden sm:inline',
                    done ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'
                  )}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formattedPrice}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {symbol}
          </span>
        </div>

        {/* Plan button */}
        <Button
          variant={isComplete ? 'hero' : 'secondary'}
          size="sm"
          disabled={!isComplete}
          onClick={onPlanTrip}
          className="gap-1.5 text-xs h-7 px-3"
        >
          <Plane className="h-3 w-3" />
          Planifier
        </Button>
      </div>
    </div>
  );
};

export default TripPriceBar;
