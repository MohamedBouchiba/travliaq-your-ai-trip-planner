import { useEffect, useRef, useState } from "react";
import { MapPin, Lightbulb, Car, Utensils, Clock, Euro, Tag } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface DaySectionProps {
  day: {
    id: number;
    title: string;
    subtitle: string;
    image: string;
    isSummary?: boolean;
    why: string;
    tips: string;
    transfer: string;
    suggestion: string;
    weather: {
      icon: string;
      temp: string;
      description: string;
    };
    images?: string[]; // Optional slider images
    price?: number; // Optional price in euros
    duration?: string; // Duration of the step
    step_type?: string; // Type of step (activity, restaurant, transport, etc.)
  };
  index: number;
  isActive: boolean;
}

const DaySection = ({ day, index, isActive }: DaySectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const offset = (window.innerHeight - rect.top) * 0.15;
        setParallaxOffset(offset);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      data-day-id={day.id}
      className={`relative h-screen w-full flex items-center transition-all duration-700 snap-start snap-always pb-24 lg:pb-0 ${
        isActive ? 'opacity-100' : 'opacity-90'
      }`}
    >
      {/* Image avec parallax */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-300"
          style={{
            backgroundImage: `url(${day.image})`,
            transform: `scale(1.08)`,
            filter: 'blur(3px)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-travliaq-deep-blue/90 via-travliaq-deep-blue/70 to-transparent" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 container mx-auto px-4 lg:px-80 py-12 lg:py-16">
        <div className="max-w-3xl">
          {/* Header du jour - Layout optimisé */}
          <div className="mb-3 animate-fade-in">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                {/* Première ligne: Badge/Checkbox + Type + Prix + Durée */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  {day.isSummary ? (
                    <div className="inline-flex items-center justify-center bg-travliaq-turquoise text-white w-6 h-6 rounded-full font-montserrat font-bold text-sm">
                      ✓
                    </div>
                  ) : (
                    <div className="inline-block bg-travliaq-turquoise text-white px-2 py-0.5 rounded-full font-montserrat font-semibold text-[10px]">
                      Étape {day.id}
                    </div>
                  )}
                  {day.step_type && (
                    <div className="flex items-center gap-0.5 bg-white/20 backdrop-blur-md rounded px-1.5 py-0.5 text-white border border-white/30">
                      <Tag className="h-2.5 w-2.5" />
                      <span className="font-inter text-[10px] capitalize">{day.step_type}</span>
                    </div>
                  )}
                  {day.duration && (
                    <div className="flex items-center gap-0.5 bg-white/15 backdrop-blur-md rounded px-1.5 py-0.5 text-white">
                      <Clock className="h-2.5 w-2.5" />
                      <span className="font-inter text-[10px]">{day.duration}</span>
                    </div>
                  )}
                  {day.price !== undefined && (
                    <div className="flex items-center gap-0.5 bg-travliaq-golden-sand/80 backdrop-blur-md rounded px-1.5 py-0.5 text-white">
                      <Euro className="h-2.5 w-2.5" />
                      <span className="font-inter text-[10px] font-semibold">{day.price > 0 ? `${day.price}€` : 'Gratuit'}</span>
                    </div>
                  )}
                </div>
                {/* Titre et sous-titre sur même ligne */}
                <h2 className="font-montserrat text-lg md:text-xl font-bold text-white leading-tight">
                  {day.title} <span className="text-white/60 font-normal text-sm md:text-base">— {day.subtitle}</span>
                </h2>
              </div>
              
              {/* Météo à droite */}
              <div className="flex-shrink-0">
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-lg px-2 py-0.5 text-white">
                  <span className="text-sm">{day.weather.icon}</span>
                  <span className="font-inter font-semibold text-[10px]">{day.weather.temp}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Image Slider (si présent) */}
          {day.images && day.images.length > 0 && (
            <div 
              className="mb-3"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
            >
              <Carousel className="w-full">
                <CarouselContent>
                  {day.images.map((img, idx) => (
                    <CarouselItem key={idx}>
                      <div className="relative h-32 md:h-40 rounded-lg overflow-hidden">
                        <img 
                          src={img} 
                          alt={`${day.title} - Image ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {day.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-1 h-6 w-6" />
                    <CarouselNext className="right-1 h-6 w-6" />
                  </>
                )}
              </Carousel>
            </div>
          )}

          {/* Informations détaillées - cachées si isSummary */}
          {!day.isSummary && (
            <div className="space-y-2.5 backdrop-blur-md bg-travliaq-deep-blue/80 rounded-xl p-4 border border-white/10">
              {/* Pourquoi cette étape - conditionnel */}
              {day.why && day.why.trim() && (
              <div className="flex gap-2">
                <MapPin className="h-3.5 w-3.5 text-travliaq-turquoise flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-montserrat font-semibold text-white text-xs mb-0.5">Pourquoi cette étape</h3>
                  <p className="font-inter text-white/90 text-xs leading-relaxed">{day.why}</p>
                </div>
              </div>
            )}

            {/* Tips IA - conditionnel */}
            {day.tips && day.tips.trim() && (
              <div className="flex gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-travliaq-golden-sand flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-montserrat font-semibold text-white text-xs mb-0.5">Tips IA</h3>
                  <p className="font-inter text-white/90 text-xs leading-relaxed">{day.tips}</p>
                </div>
              </div>
            )}

            {/* Transfert - conditionnel */}
            {day.transfer && day.transfer.trim() && (
              <div className="flex gap-2">
                <Car className="h-3.5 w-3.5 text-travliaq-turquoise flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-montserrat font-semibold text-white text-xs mb-0.5">Transfert</h3>
                  <p className="font-inter text-white/90 text-xs leading-relaxed">{day.transfer}</p>
                </div>
              </div>
            )}

            {/* Suggestion - conditionnel */}
            {day.suggestion && day.suggestion.trim() && (
              <div className="flex gap-2">
                <Utensils className="h-3.5 w-3.5 text-travliaq-golden-sand flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h3 className="font-montserrat font-semibold text-white text-xs mb-0.5">Suggestion</h3>
                  <p className="font-inter text-white/90 text-xs leading-relaxed">{day.suggestion}</p>
                </div>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DaySection;
