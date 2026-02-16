import { useTripBasketStore } from '@/stores/tripBasketStore';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Plane } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const totalPrice = useTripBasketStore((s) => s.getTotalPrice());
  const currency = useTripBasketStore((s) => s.basketCurrency);
  const isComplete = useTripBasketStore((s) => s.isBasketComplete());
  const missingSteps = useTripBasketStore((s) => s.getMissingSteps());
  const itemCount = useTripBasketStore((s) => s.basketItems.length);

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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
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
            </TooltipTrigger>
            {!isComplete && missingSteps.length > 0 && (
              <TooltipContent side="top">
                <p className="text-xs">
                  Il manque : {missingSteps.join(', ')}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default TripPriceBar;
