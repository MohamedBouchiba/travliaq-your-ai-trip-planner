/**
 * Trip Basket Panel
 * Displays the user's trip selections in a collapsible summary
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  Plane, 
  Building2, 
  MapPin, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Check,
  AlertCircle,
  Train,
  Car,
  Ship,
  Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTripBasketStore } from '@/stores/hooks';
import type { BasketItem, BasketItemType } from '@/stores/slices/tripBasketTypes';

/**
 * Get icon for basket item type
 */
function getItemIcon(type: BasketItemType) {
  switch (type) {
    case 'flight':
      return Plane;
    case 'hotel':
      return Building2;
    case 'activity':
      return Ticket;
    case 'train':
      return Train;
    case 'car-rental':
      return Car;
    case 'cruise':
      return Ship;
    case 'transfer':
      return Car;
    default:
      return MapPin;
  }
}

/**
 * Get label for basket item type
 */
const BASKET_TYPE_KEYS: Record<BasketItemType, string> = {
  flight: "planner.basket.type.flight",
  hotel: "planner.basket.type.hotel",
  activity: "planner.basket.type.activity",
  transfer: "planner.basket.type.transfer",
  train: "planner.basket.type.train",
  'car-rental': "planner.basket.type.carRental",
  cruise: "planner.basket.type.cruise",
};

function getItemTypeLabel(type: BasketItemType, t: (key: string) => string): string {
  return BASKET_TYPE_KEYS[type] ? t(BASKET_TYPE_KEYS[type]) : type;
}

/**
 * Single basket item component
 */
function BasketItemCard({ 
  item, 
  onRemove 
}: { 
  item: BasketItem; 
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const Icon = getItemIcon(item.type);
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group"
    >
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {item.price}€
        </span>
        <button
          onClick={() => onRemove(item.id)}
          className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
          aria-label={t("planner.basket.remove")}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Empty basket state
 */
function EmptyBasket() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        {t("planner.basket.emptyTitle")}
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {t("planner.basket.emptyDescription")}
      </p>
    </div>
  );
}

/**
 * Trip Basket Panel Component
 */
export function TripBasketPanel() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const {
    basketItems,
    flexibleTripType,
    basketCurrency,
    getTotalPrice,
    getCompletedSteps,
    getMissingSteps,
    isBasketComplete,
    removeBasketItem,
  } = useTripBasketStore();
  
  const totalPrice = useMemo(() => getTotalPrice(), [basketItems]);
  const completedSteps = useMemo(() => getCompletedSteps(), [basketItems]);
  const missingSteps = useMemo(() => getMissingSteps(), [basketItems, flexibleTripType]);
  const isComplete = useMemo(() => isBasketComplete(), [basketItems, flexibleTripType]);
  
  // Group items by type
  const groupedItems = useMemo(() => {
    const groups: Record<BasketItemType, BasketItem[]> = {
      flight: [],
      hotel: [],
      activity: [],
      transfer: [],
      train: [],
      'car-rental': [],
      cruise: [],
    };
    
    basketItems.forEach((item) => {
      if (groups[item.type]) {
        groups[item.type].push(item);
      }
    });
    
    return groups;
  }, [basketItems]);
  
  const itemCount = basketItems.length;
  
  if (itemCount === 0) {
    return null; // Don't show panel if empty
  }
  
  return (
    <div className="border border-border/50 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{t("planner.basket.myTrip")}</span>
              <Badge variant="secondary" className="text-xs">
                {t("planner.basket.item", { count: itemCount })}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">
                {totalPrice}€
              </span>
              {isComplete ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  {t("planner.basket.complete")}
                </span>
              ) : missingSteps.length > 0 ? (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  {t("planner.basket.stepsRemaining", { count: missingSteps.length })}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50"
          >
            <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto themed-scroll">
              {basketItems.length === 0 ? (
                <EmptyBasket />
              ) : (
                <AnimatePresence mode="popLayout">
                  {basketItems.map((item) => (
                    <BasketItemCard
                      key={item.id}
                      item={item}
                      onRemove={removeBasketItem}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
            
            {/* Footer with actions */}
            {basketItems.length > 0 && (
              <div className="border-t border-border/50 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t("planner.basket.estimatedTotal")}</p>
                  <p className="text-lg font-bold text-foreground">{totalPrice}€</p>
                </div>
                
                <Button
                  size="sm"
                  disabled={!isComplete}
                  className={cn(
                    "transition-all",
                    isComplete 
                      ? "bg-primary hover:bg-primary/90" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? t("planner.basket.book") : t("planner.basket.completeTrip")}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TripBasketPanel;
