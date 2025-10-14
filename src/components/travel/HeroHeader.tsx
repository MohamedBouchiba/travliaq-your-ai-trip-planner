import { Button } from "@/components/ui/button";
import { Plane, Hotel, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeroHeaderProps {
  destination: string;
  mainImage: string;
  flight: {
    from: string;
    to: string;
    duration: string;
    type: string;
  };
  hotel: {
    name: string;
    rating: number;
  };
  totalPrice: string;
  tripCode?: string | null;
}

const HeroHeader = ({ destination, mainImage, flight, hotel, totalPrice, tripCode }: HeroHeaderProps) => {
  const navigate = useNavigate();

  const handleBooking = () => {
    if (tripCode) {
      navigate(`/booking?code=${encodeURIComponent(tripCode)}`);
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden snap-start">
      {/* Image de fond avec effet parallax */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 ease-out"
        style={{
          backgroundImage: `url(${mainImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80'})`
        }}
      />

      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-travliaq-deep-blue/60 via-travliaq-deep-blue/40 to-travliaq-deep-blue/80" />

      {/* Contenu */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
        <h1 className="font-montserrat text-5xl font-bold text-white md:text-7xl mb-8 animate-fade-in">
          {destination}
        </h1>

        {/* Résumé du voyage */}
        <div className="max-w-4xl space-y-4 mb-12">
          {/* Vol - conditionnel */}
          {(flight.from || flight.to || flight.duration || flight.type) && (
            <div className="flex items-center justify-center gap-3 text-white/90 backdrop-blur-sm bg-white/10 rounded-lg px-6 py-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <Plane className="h-5 w-5 text-travliaq-turquoise" />
              <span className="font-inter text-lg">
                <strong>Vol :</strong> {[
                  flight.from && `De ${flight.from}`,
                  flight.to && `à ${flight.to}`,
                  flight.duration,
                  flight.type
                ].filter(Boolean).join(' – ')}
              </span>
            </div>
          )}

          {/* Hôtel - conditionnel */}
          {(hotel.name || hotel.rating) && (
            <div className="flex items-center justify-center gap-3 text-white/90 backdrop-blur-sm bg-white/10 rounded-lg px-6 py-3 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <Hotel className="h-5 w-5 text-travliaq-turquoise" />
              <span className="font-inter text-lg">
                <strong>Hôtel :</strong> {[
                  hotel.name,
                  hotel.rating && `${hotel.rating} ★`
                ].filter(Boolean).join(' – ')}
              </span>
            </div>
          )}

          {/* Prix - conditionnel */}
          {totalPrice && totalPrice.trim() && (
            <div className="flex items-center justify-center gap-3 text-white/90 backdrop-blur-sm bg-white/10 rounded-lg px-6 py-3 animate-fade-in" style={{ animationDelay: "0.6s" }}>
              <DollarSign className="h-5 w-5 text-travliaq-golden-sand" />
              <span className="font-inter text-lg">
                <strong>Prix total estimé :</strong> {totalPrice}
              </span>
            </div>
          )}
        </div>

        {/* CTA principal */}
        <Button
          variant="hero"
          size="xl"
          onClick={handleBooking}
          className="animate-fade-in shadow-glow"
          style={{ animationDelay: "0.8s" }}
        >
          Réserver tout en un clic
        </Button>

        {/* Indicateur de scroll vers le bas */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-12 w-8 rounded-full border-2 border-white/50 flex items-start justify-center p-2">
            <div className="h-2 w-2 rounded-full bg-white/50 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroHeader;
