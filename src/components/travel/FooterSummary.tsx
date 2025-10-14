import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, CloudSun, Sparkles, MapPin, Users, Activity, Plane } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { TripShareButtons } from "./TripShareButtons";
import { useNavigate } from "react-router-dom";

export interface SummaryStat {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: 'turquoise' | 'golden';
}

interface FooterSummaryProps {
  stats?: SummaryStat[];
  // Fallback to old format for backward compatibility
  summary?: {
    totalDays: number;
    totalBudget: string;
    averageWeather: string;
    travelStyle: string;
  };
  // New detailed stats
  travelers?: number;
  activities?: number;
  cities?: number;
  stopovers?: number;
  // For sharing
  destination?: string;
  tripTitle?: string;
  // Trip code for booking
  tripCode?: string | null;
}

const FooterSummary = ({ 
  stats, 
  summary, 
  travelers = 2, 
  activities = 0, 
  cities = 0, 
  stopovers = 0,
  destination = "votre destination",
  tripTitle = "Votre voyage",
  tripCode
}: FooterSummaryProps) => {
  const navigate = useNavigate();

  const handleBooking = () => {
    if (tripCode) {
      navigate(`/booking?code=${encodeURIComponent(tripCode)}`);
    }
  };

  // Generate 8 comprehensive stats
  const displayStats: SummaryStat[] = stats || (summary ? [
    { icon: Calendar, value: summary.totalDays, label: "JOURS", color: 'turquoise' },
    { icon: DollarSign, value: summary.totalBudget, label: "BUDGET", color: 'golden' },
    { icon: CloudSun, value: summary.averageWeather, label: "MÉTÉO", color: 'turquoise' },
    { icon: Sparkles, value: summary.travelStyle.split(' ')[0], label: "STYLE", color: 'golden' }, // Premier mot uniquement
    { icon: Users, value: travelers, label: "VOYAGEURS", color: 'turquoise' },
    { icon: Activity, value: activities > 0 ? activities : summary.totalDays * 2, label: "ACTIVITÉS", color: 'golden' },
    { icon: MapPin, value: cities > 0 ? cities : 3, label: "VILLES", color: 'turquoise' },
    { icon: Plane, value: stopovers === 0 ? "Direct" : `${stopovers}`, label: "ESCALES", color: 'golden' },
  ] : []);

  return (
    <section data-day-id="summary" className="relative h-screen bg-gradient-to-b from-travliaq-deep-blue to-travliaq-deep-blue/95 text-white snap-start flex items-center py-12 md:py-20 pb-24 lg:pb-20">
      <div className="container mx-auto px-3 md:px-4">
        <div className="max-w-6xl mx-auto">
          {/* Titre */}
          <h2 className="font-montserrat text-3xl md:text-5xl font-bold text-center mb-6 md:mb-12">
            Récapitulatif de votre voyage
          </h2>

          {/* Statistiques - 8 cards en 4 colonnes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-16">
            {displayStats.map((stat, idx) => {
              const IconComponent = stat.icon;
              const colorClass = stat.color === 'turquoise' ? 'text-travliaq-turquoise' : 'text-travliaq-golden-sand';
              
              // Tronquer les valeurs trop longues sur mobile
              const displayValue = typeof stat.value === 'string' && stat.value.length > 15
                ? stat.value.split(' ')[0] 
                : stat.value;
              
              return (
                <div 
                  key={idx}
                  className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 md:p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5 md:gap-3">
                    {/* Icon */}
                    <IconComponent className={`h-5 w-5 md:h-8 md:w-8 ${colorClass}`} />
                    
                    {/* Value - responsive sizing */}
                    <div className="font-montserrat text-lg sm:text-2xl md:text-4xl font-bold text-white text-center break-words hyphens-auto max-w-full px-1" lang="fr">
                      {displayValue}
                    </div>
                    
                    {/* Label - responsive sizing */}
                    <div className="font-inter text-[8px] sm:text-[9px] md:text-xs tracking-wider text-white/70 uppercase text-center break-words hyphens-auto max-w-full px-0.5" lang="fr">
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="hero"
              size="xl"
              onClick={handleBooking}
              className="w-full sm:w-auto shadow-glow"
            >
              Réserver ce voyage en un clic
            </Button>

            <TripShareButtons
              title={tripTitle}
              destination={destination}
              totalDays={summary?.totalDays || 7}
            />
          </div>

          {/* Signature */}
          <div className="text-center mt-12">
            <p className="font-montserrat text-lg italic text-white/70">
              L'aventure à portée de clic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FooterSummary;
