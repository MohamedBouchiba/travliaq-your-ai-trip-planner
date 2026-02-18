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

  // Trip memory — derive contextual chips
  const destination = memory.arrival?.city || memory.arrival?.country;
  const depDate = formatShortDate(memory.departureDate);
  const retDate = formatShortDate(memory.returnDate);
  const totalTravelers = memory.passengers.adults + memory.passengers.children + memory.passengers.infants;
  const hasNonDefaultTravelers = totalTravelers !== 1 || memory.passengers.children > 0 || memory.passengers.infants > 0;

  // Build a compact single-line trip summary
  const tripSummaryParts: string[] = [];
  if (destination) tripSummaryParts.push(destination);
  if (depDate) tripSummaryParts.push(retDate ? `${depDate}→${retDate}` : depDate);
  if (hasNonDefaultTravelers) tripSummaryParts.push(`${totalTravelers} voy.`);
  const hasTripMemory = tripSummaryParts.length > 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-xl border-t border-border/40">
      <div className="flex items-center px-4 py-2.5 gap-3 min-h-[56px]">

        {/* ── LEFT: Trip context (destination, dates, travelers) ── */}
        {hasTripMemory && (
          <>
            <div className="flex flex-col justify-center gap-0.5 shrink-0 min-w-0 max-w-[120px]">
              {destination && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                  <span className="text-[10px] font-semibold text-foreground truncate">{destination}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {depDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {retDate ? `${depDate}→${retDate}` : depDate}
                    </span>
                  </div>
                )}
                {hasNonDefaultTravelers && (
                  <div className="flex items-center gap-1">
                    <Users className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[9px] text-muted-foreground">{totalTravelers}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thin separator */}
            <div className="w-px h-8 bg-border/50 shrink-0" />
          </>
        )}

        {/* ── CENTER: Step tracker ── */}
        <div className="flex items-center gap-0 flex-1 min-w-0 justify-center">
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
                {idx > 0 && (
                  <div className={cn(
                    'h-[1.5px] w-6 transition-colors duration-500',
                    prevDone && done ? 'bg-green-500' : prevDone ? 'bg-border' : 'bg-border/40'
                  )} />
                )}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => !done && eventBus.emit('tab:change', { tab })}
                    aria-label={label}
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 border-2 text-[10px] font-semibold',
                      done
                        ? 'bg-green-500 border-green-500 text-white shadow-sm'
                        : isActive
                          ? 'border-primary text-primary bg-primary/5 shadow-sm ring-2 ring-primary/20 ring-offset-1 ring-offset-card'
                          : 'border-border/40 text-muted-foreground/40 bg-transparent cursor-pointer hover:border-border/70'
                    )}
                  >
                    {skipped ? (
                      <SkipForward className="h-2.5 w-2.5" />
                    ) : done ? (
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span className={cn(
                      'text-[9px] font-medium transition-colors duration-300 whitespace-nowrap',
                      done ? 'text-green-600 dark:text-green-400'
                        : isActive ? 'text-primary'
                        : 'text-muted-foreground/40'
                    )}>
                      {label}
                    </span>
                    {showSkip && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSkipActivities(); }}
                        className="text-[8px] text-primary/60 underline hover:text-primary transition-colors leading-none"
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

        {/* ── RIGHT: Price + Plan button ── */}
        <div className="flex items-center gap-2 shrink-0">
          {totalPrice > 0 && (
            <div className="flex flex-col items-end leading-none">
              <span className="text-xs font-bold text-foreground tabular-nums">
                {formattedPrice} {symbol}
              </span>
              <span className="text-[9px] text-muted-foreground">Total</span>
            </div>
          )}
          <Button
            variant={isComplete ? 'hero' : 'secondary'}
            size="sm"
            onClick={isComplete ? onPlanTrip : handleBlockedClick}
            className={cn(
              "gap-1.5 text-xs h-8 px-3 transition-all duration-300 shrink-0",
              !isComplete && "opacity-50"
            )}
          >
            <Plane className="h-3 w-3" />
            Planifier
          </Button>
        </div>

      </div>
    </div>
  );
};

export default TripPriceBar;
