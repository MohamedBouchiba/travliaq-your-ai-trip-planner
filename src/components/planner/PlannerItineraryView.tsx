import { useTripBasketStore } from '@/stores/tripBasketStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Plane, Hotel, Activity, Train, Car, Ship } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BasketItemType } from '@/stores/slices/tripBasketTypes';

interface PlannerItineraryViewProps {
  onBackToMap: () => void;
}

const typeIcons: Record<BasketItemType, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
  transfer: <Car className="h-4 w-4" />,
  train: <Train className="h-4 w-4" />,
  'car-rental': <Car className="h-4 w-4" />,
  cruise: <Ship className="h-4 w-4" />,
};

const typeLabels: Record<BasketItemType, string> = {
  flight: 'Vol',
  hotel: 'Hébergement',
  activity: 'Activité',
  transfer: 'Transfert',
  train: 'Train',
  'car-rental': 'Location voiture',
  cruise: 'Croisière',
};

const PlannerItineraryView = ({ onBackToMap }: PlannerItineraryViewProps) => {
  const items = useTripBasketStore((s) => s.basketItems);
  const totalPrice = useTripBasketStore((s) => s.getTotalPrice());
  const currency = useTripBasketStore((s) => s.basketCurrency);

  // Group items by city for a placeholder day-by-day view
  const groupedByCity = items.reduce<Record<string, typeof items>>((acc, item) => {
    const city = item.destinationCity || 'Non défini';
    if (!acc[city]) acc[city] = [];
    acc[city].push(item);
    return acc;
  }, {});

  const cities = Object.keys(groupedByCity);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <Button variant="ghost" size="sm" onClick={onBackToMap} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour à la carte
        </Button>
        <div className="ml-auto text-sm font-semibold text-foreground">
          Total : {new Intl.NumberFormat('fr-FR').format(totalPrice)} {currency}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Placeholder hero */}
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/30 p-6 text-center">
            <Plane className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h2 className="text-lg font-bold text-foreground mb-1">Votre itinéraire</h2>
            <p className="text-sm text-muted-foreground">
              Aperçu basé sur vos sélections — la génération IA sera disponible prochainement.
            </p>
          </div>

          {/* Day-by-city sections */}
          {cities.map((city, idx) => (
            <div key={city} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {idx + 1}
                </div>
                <h3 className="font-semibold text-foreground">{city}</h3>
              </div>

              <div className="space-y-2 pl-9">
                {groupedByCity[city].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/60 p-3"
                  >
                    <div className="mt-0.5 text-muted-foreground">
                      {typeIcons[item.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {typeLabels[item.type]}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {new Intl.NumberFormat('fr-FR').format(item.price)} {currency}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Aucun élément dans le panier.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PlannerItineraryView;
