import { useTripBasketStore } from '@/stores/tripBasketStore';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { Button } from '@/components/ui/button';
import { Plane, Hotel, Compass, Check, SkipForward } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { eventBus } from '@/lib/eventBus';

interface TripPriceBarProps {
  onPlanTrip: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', CHF: 'CHF', CAD: 'CA$', MAD: 'MAD', XOF: 'CFA', TND: 'DT',
};

const STEP_CONFIG = [
  { key: 'flights', icon: Plane, label: 'Vols', tab: 'flights' as const },
  { key: 'hotels', icon: Hotel, label: 'Hôtels', tab: 'stays' as const },
  { key: 'activities', icon: Compass, label: 'Activités', tab: 'activities' as const },
] as const;

const TripPriceBar = ({ onPlanTrip }: TripPriceBarProps) => {
  const basketItems = useTripBasketStore((s) => s.basketItems);
  const flexibleTripType = useTripBasketStore((s) => s.flexibleTripType);
  const explicitRequirements = useTripBasketStore((s) => s.explicitRequirements);
  const setExplicitRequirement = useTripBasketStore((s) => s.setExplicitRequirement);
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

  const { completedSteps, requiredSteps, flightsDone, hotelsDone, activitiesDone, isComplete } = useMemo(() => {
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

    const flightsDone = completed.includes('flights');
    const hotelsDone = completed.includes('hotels');
    // Activities are done if: items selected OR user explicitly said no
    const activitiesDone = completed.includes('activities') || explicitRequirements.wantsActivities === false;
    const isComplete = flightsDone && hotelsDone && activitiesDone;

    return {
      completedSteps: completed,
      requiredSteps: required,
      flightsDone,
      hotelsDone,
      activitiesDone,
      isComplete,
    };
  }, [basketItems, flexibleTripType, explicitRequirements.wantsActivities]);

  const visibleSteps = STEP_CONFIG.filter((s) => requiredSteps.includes(s.key));
  const doneCount = visibleSteps.filter((s) => {
    if (s.key === 'activities') return activitiesDone;
    return completedSteps.includes(s.key);
  }).length;
  const progressPercent = visibleSteps.length > 0 ? Math.round((doneCount / visibleSteps.length) * 100) : 0;

  // Find active (next incomplete) step
  const activeStepKey = visibleSteps.find((s) => {
    if (s.key === 'activities') return !activitiesDone;
    return !completedSteps.includes(s.key);
  })?.key;

  const handleBlockedClick = () => {
    const missingSteps: string[] = [];
    if (!flightsDone) missingSteps.push('flights');
    if (!hotelsDone) missingSteps.push('hotels');
    if (!activitiesDone) missingSteps.push('activities');
    eventBus.emit('planifier:blocked', { completedSteps, missingSteps });
  };

  const handleSkipActivities = () => {
    setExplicitRequirement('wantsActivities', false);
  };

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
          {visibleSteps.map(({ key, icon: Icon, label, tab }, idx) => {
            const isActivities = key === 'activities';
            const done = isActivities ? activitiesDone : completedSteps.includes(key);
            const skipped = isActivities && explicitRequirements.wantsActivities === false && !completedSteps.includes('activities');
            const isActive = key === activeStepKey;
            const prevDone = idx > 0 && (() => {
              const prevKey = visibleSteps[idx - 1].key;
              return prevKey === 'activities' ? activitiesDone : completedSteps.includes(prevKey);
            })();

            // Show skip button for activities when flights+hotels done but activities not done
            const showSkip = isActivities && flightsDone && hotelsDone && !activitiesDone;

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
                <button
                  onClick={() => !done && eventBus.emit('tab:change', { tab })}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300",
                    done
                      ? "bg-green-500/10"
                      : isActive
                        ? "bg-primary/10 ring-1 ring-primary/40 animate-pulse"
                        : "bg-muted/30 hover:bg-muted/50 cursor-pointer"
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center h-4 w-4 rounded-full transition-all duration-300',
                    done
                      ? 'text-green-600 dark:text-green-400'
                      : isActive
                        ? 'text-primary'
                        : 'text-muted-foreground/40'
                  )}>
                    {skipped ? <SkipForward className="h-3 w-3" /> : done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium leading-none transition-colors duration-300',
                    done ? 'text-green-600 dark:text-green-400' : isActive ? 'text-primary' : 'text-muted-foreground/50'
                  )}>
                    {label}
                  </span>
                  {showSkip && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSkipActivities(); }}
                      className="text-[9px] text-muted-foreground/60 hover:text-primary transition-colors leading-none ml-0.5"
                    >
                      Passer
                    </button>
                  )}
                </button>
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
          onClick={isComplete ? onPlanTrip : handleBlockedClick}
          className={cn(
            "gap-1.5 text-xs h-8 px-4 transition-all duration-300",
            !isComplete && "opacity-60"
          )}
        >
          <Plane className="h-3.5 w-3.5" />
          Planifier
        </Button>
      </div>
    </div>
  );
};

export default TripPriceBar;
