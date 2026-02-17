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

  const visibleSteps = STEP_CONFIG.filter((s) => requiredSteps.includes(s.key));
  const doneCount = visibleSteps.filter((s) => completedSteps.includes(s.key)).length;
  const progressPercent = visibleSteps.length > 0 ? Math.round((doneCount / visibleSteps.length) * 100) : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/90 backdrop-blur-xl border-t border-border/30">
      {/* Thin progress bar */}
      <div className="h-[2px] w-full bg-muted/20">
        <div
          className={cn(
            "h-full transition-all duration-700 ease-out",
            isComplete ? "bg-green-500" : "bg-primary/70"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 gap-3">
        {/* Step pills */}
        <div className="flex items-center gap-0">
          {visibleSteps.map(({ key, icon: Icon, label }, idx) => {
            const done = completedSteps.includes(key);
            const prevDone = idx > 0 && completedSteps.includes(visibleSteps[idx - 1].key);
            return (
              <div key={key} className="flex items-center">
                {idx > 0 && (
                  <div className={cn(
                    'w-3 h-[1px] transition-all duration-500',
                    prevDone && done
                      ? 'bg-green-500/50'
                      : prevDone
                        ? 'bg-primary/30'
                        : 'border-t border-dashed border-border/40 bg-transparent'
                  )} />
                )}
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300",
                  done
                    ? "bg-green-500/10"
                    : "bg-muted/30"
                )}>
                  <div className={cn(
                    'flex items-center justify-center h-4 w-4 rounded-full transition-all duration-300',
                    done
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground/40'
                  )}>
                    {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium leading-none transition-colors duration-300',
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
        <div className="flex items-baseline gap-0.5 min-w-0">
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
          disabled={false}
          onClick={onPlanTrip}
          className="gap-1.5 text-xs h-8 px-4"
        >
          <Plane className="h-3.5 w-3.5" />
          Planifier
        </Button>
      </div>
    </div>
  );
};

export default TripPriceBar;
