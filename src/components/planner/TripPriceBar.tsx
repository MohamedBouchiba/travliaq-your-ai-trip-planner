import { useTripBasketStore } from '@/stores/tripBasketStore';
import { useFlightMemoryStore } from '@/stores/hooks/useFlightMemoryStore';
import { useUserPreferences } from '@/contexts/UserPreferencesContext';
import { Button } from '@/components/ui/button';
import { Plane, Hotel, Compass, Check, SkipForward, MapPin, Calendar, Users } from 'lucide-react';
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

function formatShortDate(date: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

const TripPriceBar = ({ onPlanTrip }: TripPriceBarProps) => {
  const basketItems = useTripBasketStore((s) => s.basketItems);
  const flexibleTripType = useTripBasketStore((s) => s.flexibleTripType);
  const explicitRequirements = useTripBasketStore((s) => s.explicitRequirements);
  const setExplicitRequirement = useTripBasketStore((s) => s.setExplicitRequirement);
  const { preferences } = useUserPreferences();

  // Read trip memory directly from store — no prop drilling needed
  const { memory } = useFlightMemoryStore();

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
    const activitiesDone = completed.includes('activities') || explicitRequirements.wantsActivities === false;
    const isComplete = flightsDone && hotelsDone && activitiesDone;

    return { completedSteps: completed, requiredSteps: required, flightsDone, hotelsDone, activitiesDone, isComplete };
  }, [basketItems, flexibleTripType, explicitRequirements.wantsActivities]);

  const visibleSteps = STEP_CONFIG.filter((s) => requiredSteps.includes(s.key));

  // Find the active (next incomplete) step index
  const activeStepIndex = visibleSteps.findIndex((s) => {
    if (s.key === 'activities') return !activitiesDone;
    return !completedSteps.includes(s.key);
  });

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

  // Build trip memory chips from FlightMemory
  const destination = memory.arrival?.city || memory.arrival?.country;
  const depDate = formatShortDate(memory.departureDate);
  const retDate = formatShortDate(memory.returnDate);
  const totalTravelers = memory.passengers.adults + memory.passengers.children + memory.passengers.infants;
  const hasNonDefaultTravelers = totalTravelers !== 1 || memory.passengers.children > 0 || memory.passengers.infants > 0;

  const memoryChips = [
    destination && { icon: <MapPin className="h-3 w-3" />, label: destination },
    depDate && { icon: <Calendar className="h-3 w-3" />, label: retDate ? `${depDate} → ${retDate}` : depDate },
    hasNonDefaultTravelers && { icon: <Users className="h-3 w-3" />, label: `${totalTravelers} voy.` },
  ].filter(Boolean) as { icon: React.ReactNode; label: string }[];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-xl border-t border-border/40">

      {/* Trip memory row — only shown when there's data */}
      {memoryChips.length > 0 && (
        <div className="flex items-center gap-2 px-5 pt-2.5 pb-0">
          {memoryChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
            >
              {chip.icon}
              {chip.label}
            </span>
          ))}
          {totalPrice > 0 && (
            <span className="ml-auto text-[10px] font-semibold text-foreground tabular-nums">
              {formattedPrice} {symbol}
            </span>
          )}
        </div>
      )}

      {/* Main row: steps + price + plan button */}
      <div className="flex items-center justify-between px-5 py-3 gap-4">
        {/* Step tracker */}
        <div className="flex items-center gap-0 flex-1 min-w-0">
          {visibleSteps.map(({ key, label, tab }, idx) => {
            const isActivities = key === 'activities';
            const done = isActivities ? activitiesDone : completedSteps.includes(key);
            const skipped = isActivities && explicitRequirements.wantsActivities === false && !completedSteps.includes('activities');
            const isActive = idx === activeStepIndex;
            const prevDone = idx === 0 || (() => {
              const prevKey = visibleSteps[idx - 1].key;
              return prevKey === 'activities' ? activitiesDone : completedSteps.includes(prevKey);
            })();
            const showSkip = isActivities && flightsDone && hotelsDone && !activitiesDone;

            return (
              <div key={key} className="flex items-center">
                {/* Connector line between steps */}
                {idx > 0 && (
                  <div className={cn(
                    'h-[1.5px] w-8 transition-colors duration-500',
                    prevDone && done
                      ? 'bg-green-500'
                      : prevDone
                        ? 'bg-border'
                        : 'bg-border/40'
                  )} />
                )}

                {/* Step node */}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => !done && eventBus.emit('tab:change', { tab })}
                    aria-label={label}
                    className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 border-2 text-[11px] font-semibold',
                      done
                        ? 'bg-green-500 border-green-500 text-white shadow-sm'
                        : isActive
                          ? 'border-primary text-primary bg-primary/5 shadow-sm ring-2 ring-primary/20 ring-offset-1 ring-offset-card'
                          : 'border-border/40 text-muted-foreground/40 bg-transparent cursor-pointer hover:border-border/70 hover:text-muted-foreground/60'
                    )}
                  >
                    {skipped ? (
                      <SkipForward className="h-3 w-3" />
                    ) : done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>

                  {/* Label + optional "Passer" */}
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className={cn(
                      'text-[10px] font-medium transition-colors duration-300 whitespace-nowrap',
                      done
                        ? 'text-green-600 dark:text-green-400'
                        : isActive
                          ? 'text-primary'
                          : 'text-muted-foreground/40'
                    )}>
                      {label}
                    </span>
                    {showSkip && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSkipActivities(); }}
                        className="text-[9px] text-primary/60 underline hover:text-primary transition-colors leading-none"
                      >
                        Passer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Price — only shown when memory chips are absent (otherwise shown in memory row) */}
        {totalPrice > 0 && memoryChips.length === 0 && (
          <div className="flex items-baseline gap-0.5 shrink-0">
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formattedPrice}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
              {symbol}
            </span>
          </div>
        )}

        {/* Plan button */}
        <Button
          variant={isComplete ? 'hero' : 'secondary'}
          size="sm"
          onClick={isComplete ? onPlanTrip : handleBlockedClick}
          className={cn(
            "gap-1.5 text-xs h-8 px-4 transition-all duration-300 shrink-0",
            !isComplete && "opacity-50"
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
