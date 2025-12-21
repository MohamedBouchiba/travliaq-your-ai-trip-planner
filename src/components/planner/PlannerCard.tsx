import { X, Star, Clock, MapPin as MapPinIcon, Plus } from "lucide-react";
import type { MapPin } from "@/pages/TravelPlanner";
import { cn } from "@/lib/utils";

interface PlannerCardProps {
  pin: MapPin;
  onClose: () => void;
  onAddToTrip: (pin: MapPin) => void;
}

const PlannerCard = ({ pin, onClose, onAddToTrip }: PlannerCardProps) => {
  return (
    <div className="pointer-events-auto absolute top-20 right-6 w-80 bg-card rounded-2xl shadow-deep overflow-hidden animate-scale-up z-30">
      {/* Image */}
      {pin.image ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={pin.image}
            alt={pin.title}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-hero flex items-center justify-center">
          <span className="text-4xl">
            {pin.type === "flights" ? "✈️" : pin.type === "stays" ? "🏨" : "📍"}
          </span>
          <button
            onClick={onClose}
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-montserrat font-bold text-foreground text-lg mb-1">
          {pin.title}
        </h3>

        {pin.subtitle && (
          <p className="text-sm text-muted-foreground mb-3">{pin.subtitle}</p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          {pin.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-accent fill-accent" />
              <span className="font-medium text-foreground">{pin.rating}</span>
            </div>
          )}

          {pin.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{pin.duration}</span>
            </div>
          )}

          {pin.price !== undefined && pin.price > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="font-bold text-lg text-primary">{pin.price}€</span>
              {pin.type === "stays" && (
                <span className="text-xs text-muted-foreground">/nuit</span>
              )}
            </div>
          )}
        </div>

        {/* Flight specific info */}
        {pin.type === "flights" && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-muted-foreground">Depuis Paris</div>
                <div className="font-semibold">CDG → {pin.title.slice(0, 3).toUpperCase()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Durée</div>
                <div className="font-semibold">
                  {pin.id === "jfk" ? "8h 30m" : pin.id === "lhr" ? "1h 15m" : "2h"}
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => onAddToTrip(pin)}
          className={cn(
            "w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
            "bg-accent text-accent-foreground hover:opacity-90"
          )}
        >
          <Plus className="h-4 w-4" />
          Ajouter à mon voyage
        </button>
      </div>
    </div>
  );
};

export default PlannerCard;
