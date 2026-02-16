import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import HeroHeader from '@/components/travel/HeroHeader';
import DaySection from '@/components/travel/DaySection';
import PlannerFooterSummary from '@/components/planner/PlannerFooterSummary';
import TravelCalendar from '@/components/travel/TravelCalendar';

interface PlannerItineraryViewProps {
  onBackToMap: () => void;
}

// Mock data Tokyo (sera remplacé par les données du basket/IA)
const mockTravelData = {
  destination: "Tokyo & Kyoto",
  mainImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
  flight: { from: "Paris", to: "Tokyo", duration: "16h30", type: "Vol direct" },
  hotel: { name: "Mitsui Garden Hotel Ginza", rating: 4.6 },
  totalPrice: "2 500 € TTC",
  days: [
    { id: 1, day: 1, title: "Arrivée à Tokyo", subtitle: "Aéroport Narita", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80", coordinates: [139.7006, 35.6938] as [number, number], why: "Arrivée en après-midi à l'aéroport international de Narita.", tips: "Prends une Suica Card à l'aéroport.", transfer: "75 min en Narita Express", suggestion: "Installation à l'hôtel et repos", weather: { icon: "🌤️", temp: "18°C", description: "Nuageux" }, duration: "3h environ" },
    { id: 2, day: 1, title: "Shinjuku", subtitle: "Quartier animé", image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80", coordinates: [139.7006, 35.6938] as [number, number], why: "Découverte du quartier le plus animé de Tokyo.", tips: "Observatoire gratuit du Tokyo Metropolitan Government.", transfer: "À pied depuis l'hôtel", suggestion: "Dîner à Omoide Yokocho", weather: { icon: "🌤️", temp: "18°C", description: "Nuageux" } },
    { id: 3, day: 2, title: "Senso-ji Temple", subtitle: "Temple historique d'Asakusa", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80", coordinates: [139.7967, 35.7148] as [number, number], why: "Le plus ancien temple de Tokyo.", tips: "Arrive tôt pour éviter la foule.", transfer: "30 min en métro", suggestion: "Déjeuner dans les environs", weather: { icon: "☀️", temp: "20°C", description: "Ensoleillé" }, images: ["https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80"] },
    { id: 4, day: 2, title: "TeamLab Borderless", subtitle: "Musée d'art numérique", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80", coordinates: [139.7753, 35.6264] as [number, number], why: "Expérience immersive unique au monde.", tips: "Réserve à l'avance, créneau de 16h recommandé.", transfer: "45 min en métro depuis Asakusa", suggestion: "Dîner à Odaiba avec vue sur Rainbow Bridge", weather: { icon: "☀️", temp: "20°C", description: "Ensoleillé" }, images: ["https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80", "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800&q=80"], price: 35, duration: "2h30" },
    { id: 5, day: 3, title: "Shibuya Crossing", subtitle: "Le carrefour le plus célèbre", image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80", coordinates: [139.7016, 35.6595] as [number, number], why: "Expérience iconique de Tokyo.", tips: "Monte au Starbucks pour la vue d'en haut.", transfer: "15 min en métro", suggestion: "Shopping à Shibuya 109", weather: { icon: "🌤️", temp: "21°C", description: "Partiellement nuageux" } },
    { id: 6, day: 4, title: "Trajet vers Kyoto", subtitle: "Shinkansen", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80", coordinates: [135.7681, 35.0116] as [number, number], why: "Transfert vers Kyoto en Shinkansen à 320 km/h.", tips: "Réserve côté gauche pour voir le Mont Fuji.", transfer: "2h15 en Shinkansen Nozomi", suggestion: "Achète un Ekiben pour le déjeuner", weather: { icon: "☀️", temp: "22°C", description: "Ensoleillé" }, price: 140, duration: "2h15" },
    { id: 7, day: 4, title: "Fushimi Inari", subtitle: "Les 10 000 torii", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80", coordinates: [135.7726, 34.9671] as [number, number], why: "Le sanctuaire aux mille portes rouges.", tips: "Monte jusqu'au sommet pour moins de monde.", transfer: "20 min en train JR", suggestion: "Dîner dans le quartier de Gion", weather: { icon: "☀️", temp: "22°C", description: "Ensoleillé" }, images: ["https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80"], duration: "3h environ" },
    { id: 8, day: 5, title: "Arashiyama", subtitle: "Forêt de bambous", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80", coordinates: [135.6728, 35.0094] as [number, number], why: "La célèbre bambouseraie de Kyoto.", tips: "Arrive avant 8h pour une expérience magique.", transfer: "30 min en train", suggestion: "Visite du temple Tenryu-ji", weather: { icon: "☀️", temp: "23°C", description: "Ensoleillé" } },
  ],
  summary: { totalDays: 5, totalBudget: "2 500 €", averageWeather: "21°C", travelStyle: "Culture & Gastronomie" },
};

const PlannerItineraryView = ({ onBackToMap }: PlannerItineraryViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeDay, setActiveDay] = useState(0);
  const offsetsRef = useRef<Array<{ id: number; top: number }>>([]);

  const travelData = mockTravelData;
  const regularSteps = travelData.days;

  const summaryId = useMemo(
    () => Math.max(...regularSteps.map((d) => d.id), 0) + 1,
    [regularSteps]
  );

  const allSteps = useMemo(
    () => [
      ...regularSteps.map((d) => ({ id: d.id, title: d.title, isSummary: false })),
      { id: summaryId, title: 'Récap', isSummary: true },
    ],
    [regularSteps, summaryId]
  );

  // Scroll tracking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const recomputeOffsets = () => {
      const getTop = (node: HTMLElement) =>
        node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
      const arr: Array<{ id: number; top: number }> = [];
      const nodes = Array.from(el.querySelectorAll('[data-day-id]')) as HTMLElement[];
      for (const node of nodes) {
        const idAttr = node.getAttribute('data-day-id');
        if (!idAttr || idAttr === '0' || idAttr === 'summary') continue;
        const idNum = Number(idAttr);
        if (Number.isNaN(idNum)) continue;
        arr.push({ id: idNum, top: getTop(node) });
      }
      arr.sort((a, b) => a.top - b.top);
      offsetsRef.current = arr;
    };

    const handleScroll = () => {
      const scrollTop = el.scrollTop + 1;
      if (!offsetsRef.current.length) recomputeOffsets();

      const first = offsetsRef.current.find((o) => o.id === 1)?.top ?? 0;
      if (scrollTop < first - 200) {
        setActiveDay(0);
        return;
      }

      // Check if at summary
      const summaryElement = el.querySelector('[data-day-id="summary"]') as HTMLElement | null;
      if (summaryElement) {
        const summaryTop =
          summaryElement.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
        if (scrollTop >= summaryTop - 200) {
          setActiveDay(summaryId);
          return;
        }
      }

      let currentId = 1;
      for (const o of offsetsRef.current) {
        if (scrollTop >= o.top - 150) currentId = o.id;
        else break;
      }
      setActiveDay(currentId);
    };

    recomputeOffsets();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', recomputeOffsets, { passive: true });
    handleScroll();

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', recomputeOffsets);
    };
  }, [regularSteps.length, summaryId]);

  const scrollToDay = useCallback(
    (dayId: number | string) => {
      const el = scrollRef.current;
      if (!el) return;
      const selector =
        dayId === summaryId ? '[data-day-id="summary"]' : `[data-day-id="${dayId}"]`;
      const target = el.querySelector(selector) as HTMLElement | null;
      if (!target) return;
      const getTop = (node: HTMLElement) =>
        node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
      el.scrollTo({ top: getTop(target), behavior: 'smooth' });
    },
    [summaryId]
  );

  const showStepTracker = activeDay >= 1;

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Floating back button */}
      <div className="absolute top-3 left-3 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToMap}
          className="gap-2 bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 text-white shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Carte
        </Button>
      </div>

      {/* Fixed step tracker at top */}
      {showStepTracker && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
          <TravelCalendar
            days={allSteps}
            activeDay={activeDay}
            onScrollToDay={scrollToDay}
          />
        </div>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto scroll-smooth snap-y snap-mandatory themed-scroll"
      >
        {/* Hero */}
        <section data-day-id="0" className="h-full snap-start">
          <HeroHeader
            destination={travelData.destination}
            mainImage={travelData.mainImage}
            flight={travelData.flight}
            hotel={travelData.hotel}
            totalPrice={travelData.totalPrice}
          />
        </section>

        {/* Day-by-day steps */}
        <div className="relative">
          {regularSteps.map((day, index) => (
            <DaySection
              key={day.id}
              day={day}
              index={index}
              isActive={activeDay === day.id}
            />
          ))}
        </div>

        {/* Summary */}
        <PlannerFooterSummary
          summary={travelData.summary}
          travelers={2}
          activities={regularSteps.length}
          cities={new Set(regularSteps.map((d) => d.title.split(' ')[0])).size}
          destination={travelData.destination}
          mainImage={travelData.mainImage}
        />
      </div>
    </div>
  );
};

export default PlannerItineraryView;
