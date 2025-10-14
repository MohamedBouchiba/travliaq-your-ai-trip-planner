import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import HeroHeader from "@/components/travel/HeroHeader";
import DaySection from "@/components/travel/DaySection";
import TimelineSync from "@/components/travel/TimelineSync";
import FooterSummary from "@/components/travel/FooterSummary";
import MapView from "@/components/travel/MapView";
import TravelCalendar from "@/components/travel/TravelCalendar";
import TravelDayCalendar from "@/components/travel/TravelDayCalendar";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Calendar as CalendarIcon } from "lucide-react";
import { useTripData } from "@/hooks/useTripData";

// Mock data - sera remplacé par les vraies données IA
const mockTravelData = {
  destination: "Tokyo & Kyoto",
  mainImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
  flight: {
    from: "Paris",
    to: "Tokyo",
    duration: "16h30",
    type: "Vol direct"
  },
  hotel: {
    name: "Mitsui Garden Hotel Ginza",
    rating: 4.6
  },
  totalPrice: "2 500 € TTC",
  days: [
    // Jour 1 - 3 étapes
    {
      id: 1,
      day: 1,
      title: "Arrivée à Tokyo",
      subtitle: "Aéroport Narita",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
      coordinates: [139.7006, 35.6938] as [number, number],
      why: "Arrivée en après-midi à l'aéroport international de Narita, récupération des bagages et transfert vers l'hôtel. Cette première étape vous permet de vous acclimater doucement au décalage horaire tout en profitant du trajet pour admirer les premiers paysages japonais.",
      tips: "Prends une Suica Card à l'aéroport, c'est indispensable pour tous les transports en commun. Tu peux la recharger partout et elle fonctionne même dans les distributeurs automatiques.",
      transfer: "75 min en Narita Express (train rapide et confortable avec espace bagages)",
      suggestion: "Installation à l'hôtel et repos avant d'explorer les environs",
      weather: { icon: "🌤️", temp: "18°C", description: "Nuageux" },
      duration: "3h environ"
    },
    {
      id: 2,
      day: 1,
      title: "Shinjuku",
      subtitle: "Quartier animé",
      image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      coordinates: [139.7006, 35.6938] as [number, number],
      why: "Découverte du quartier le plus animé de Tokyo.",
      tips: "Visite de l'observatoire gratuit du Tokyo Metropolitan Government.",
      transfer: "À pied depuis l'hôtel",
      suggestion: "Dîner à Omoide Yokocho",
      weather: { icon: "🌤️", temp: "18°C", description: "Nuageux" }
    },
    {
      id: 3,
      day: 1,
      title: "Golden Gai",
      subtitle: "Soirée dans les bars traditionnels",
      image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      coordinates: [139.7046, 35.6945] as [number, number],
      why: "Ambiance unique dans les petits bars de Golden Gai.",
      tips: "Attention, certains bars refusent les touristes.",
      transfer: "10 min à pied",
      suggestion: "Bar hopping dans Golden Gai",
      weather: { icon: "🌤️", temp: "16°C", description: "Nuit claire" }
    },
    // Jour 2 - 2 étapes
    {
      id: 4,
      day: 2,
      title: "Senso-ji Temple",
      subtitle: "Temple historique d'Asakusa",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80",
      coordinates: [139.7967, 35.7148] as [number, number],
      why: "Le plus ancien temple de Tokyo, quartier traditionnel.",
      tips: "Arrive tôt pour éviter la foule.",
      transfer: "30 min en métro",
      suggestion: "Déjeuner dans les environs",
      weather: { icon: "☀️", temp: "20°C", description: "Ensoleillé" },
      images: ["https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80"]
    },
    {
      id: 5,
      day: 2,
      title: "TeamLab Borderless",
      subtitle: "Musée d'art numérique",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
      coordinates: [139.7753, 35.6264] as [number, number],
      why: "Expérience immersive unique au monde dans ce musée d'art numérique interactif. Les installations lumineuses réagissent à votre présence et créent une expérience magique inoubliable. C'est l'une des attractions les plus populaires de Tokyo.",
      tips: "Réserve à l'avance, le créneau de 16h est recommandé pour éviter la foule du week-end. Porte des vêtements confortables car tu marcheras beaucoup dans le noir.",
      transfer: "45 min en métro depuis Asakusa via la ligne Yurikamome",
      suggestion: "Dîner à Odaiba en profitant de la vue sur Rainbow Bridge illuminé",
      weather: { icon: "☀️", temp: "20°C", description: "Ensoleillé" },
      images: [
        "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80",
        "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800&q=80",
        "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80"
      ],
      price: 35,
      duration: "2h30"
    },
    // Jour 3 - 3 étapes
    {
      id: 6,
      day: 3,
      title: "Marché aux poissons Tsukiji",
      subtitle: "Petit-déjeuner de sushis frais",
      image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      coordinates: [139.7707, 35.6654] as [number, number],
      why: "Meilleurs sushis du matin à Tokyo.",
      tips: "Arrive avant 7h pour éviter la queue.",
      transfer: "25 min en métro",
      suggestion: "Visite du marché extérieur",
      weather: { icon: "🌤️", temp: "19°C", description: "Partiellement nuageux" }
    },
    {
      id: 7,
      day: 3,
      title: "Shibuya Crossing",
      subtitle: "Le carrefour le plus célèbre",
      image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      coordinates: [139.7016, 35.6595] as [number, number],
      why: "Expérience iconique de Tokyo.",
      tips: "Monte au Starbucks pour la vue d'en haut.",
      transfer: "15 min en métro",
      suggestion: "Shopping à Shibuya 109",
      weather: { icon: "🌤️", temp: "21°C", description: "Partiellement nuageux" }
    },
    {
      id: 8,
      day: 3,
      title: "Harajuku",
      subtitle: "Mode et culture pop",
      image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      coordinates: [139.7024, 35.6702] as [number, number],
      why: "Quartier de la mode alternative et des crêpes.",
      tips: "Takeshita Street le week-end est bondée.",
      transfer: "10 min à pied",
      suggestion: "Visite du Meiji Shrine",
      weather: { icon: "🌤️", temp: "21°C", description: "Partiellement nuageux" }
    },
    // Jour 4 - 2 étapes
    {
      id: 9,
      day: 4,
      title: "Trajet vers Kyoto",
      subtitle: "Shinkansen",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80",
      coordinates: [135.7681, 35.0116] as [number, number],
      why: "Transfert vers Kyoto en train à grande vitesse Shinkansen. C'est une expérience emblématique du Japon, voyager à 320 km/h dans un confort absolu. Le trajet offre des vues magnifiques sur le Mont Fuji si le temps est dégagé.",
      tips: "Réserve côté gauche (fenêtres E) pour voir le Mont Fuji. Arrive 20 minutes avant le départ pour ne pas manquer ton train, les Shinkansen sont extrêmement ponctuels.",
      transfer: "2h15 en Shinkansen Nozomi ou Hikari depuis Tokyo Station",
      suggestion: "Achète un Ekiben (bento du train) pour le déjeuner, c'est une tradition japonaise savoureuse",
      weather: { icon: "☀️", temp: "22°C", description: "Ensoleillé" },
      price: 140,
      duration: "2h15"
    },
    {
      id: 10,
      day: 4,
      title: "Fushimi Inari",
      subtitle: "Les 10 000 torii",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80",
      coordinates: [135.7726, 34.9671] as [number, number],
      why: "Le sanctuaire aux mille portes rouges (torii) iconiques de Kyoto. C'est l'un des sites les plus photographiés du Japon et une randonnée spirituelle inoubliable à travers les tunnels orange vif qui serpentent sur la montagne. L'ascension complète prend environ 2-3 heures.",
      tips: "Monte jusqu'au sommet pour moins de monde et des vues magnifiques sur Kyoto. Évite les heures de pointe (10h-14h). Porte des chaussures confortables pour la montée.",
      transfer: "20 min en train JR depuis Kyoto Station (ligne Nara)",
      suggestion: "Dîner dans le quartier traditionnel de Gion, avec un peu de chance tu verras des geishas",
      weather: { icon: "☀️", temp: "22°C", description: "Ensoleillé" },
      images: [
        "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80"
      ],
      duration: "3h environ",
      price: 0
    },
    // Jour 5 - 2 étapes
    {
      id: 11,
      day: 5,
      title: "Arashiyama",
      subtitle: "Forêt de bambous",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80",
      coordinates: [135.6728, 35.0094] as [number, number],
      why: "La célèbre bambouseraie de Kyoto.",
      tips: "Arrive avant 8h pour une expérience magique.",
      transfer: "30 min en train",
      suggestion: "Visite du temple Tenryu-ji",
      weather: { icon: "☀️", temp: "23°C", description: "Ensoleillé" }
    },
    {
      id: 12,
      day: 5,
      title: "Kinkaku-ji",
      subtitle: "Pavillon d'Or",
      image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80",
      coordinates: [135.7292, 35.0394] as [number, number],
      why: "Le temple doré emblématique de Kyoto, recouvert de feuilles d'or et reflété dans un étang zen. C'est l'un des monuments les plus photographiés du Japon et un chef-d'œuvre de l'architecture zen. Les jardins environnants sont magnifiques en toute saison.",
      tips: "Meilleure lumière en fin d'après-midi pour les photos. Le matin est moins fréquenté mais la lumière est moins flatteuse. Prends ton temps pour explorer les jardins après le pavillon principal.",
      transfer: "25 min en bus 205 ou 101 depuis Arashiyama",
      suggestion: "Déjeuner végétarien shojin ryori (cuisine bouddhiste) dans un restaurant traditionnel à proximité",
      weather: { icon: "☀️", temp: "23°C", description: "Ensoleillé" },
      images: [
        "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80",
        "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
        "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80"
      ],
      price: 5,
      duration: "1h30"
    },
    // Jour 6 - 2 étapes
    {
      id: 13,
      day: 6,
      title: "Nara",
      subtitle: "Les cerfs sacrés",
      image: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1920&q=80",
      coordinates: [135.8048, 34.6851] as [number, number],
      why: "Excursion d'une journée pour voir les cerfs.",
      tips: "Achète les crackers dès l'entrée du parc.",
      transfer: "45 min en train JR",
      suggestion: "Déjeuner local: mochis Nakatanidou",
      weather: { icon: "🌤️", temp: "20°C", description: "Partiellement nuageux" }
    },
    {
      id: 14,
      day: 6,
      title: "Todai-ji",
      subtitle: "Le grand Bouddha",
      image: "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=1920&q=80",
      coordinates: [135.8398, 34.6890] as [number, number],
      why: "Temple abritant un Bouddha géant en bronze.",
      tips: "Passe par les portes en bois pour la photo.",
      transfer: "15 min à pied dans le parc",
      suggestion: "Retour à Kyoto en soirée",
      weather: { icon: "🌤️", temp: "20°C", description: "Partiellement nuageux" }
    },
    // Jour 7 - 2 étapes
    {
      id: 15,
      day: 7,
      title: "Osaka - Dotonbori",
      subtitle: "Street food capitale",
      image: "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?w=1920&q=80",
      coordinates: [135.5022, 34.6937] as [number, number],
      why: "Le meilleur de la street food japonaise se trouve ici ! Dotonbori est le quartier emblématique d'Osaka, connu pour ses enseignes lumineuses extravagantes et sa nourriture de rue incroyable. L'ambiance y est électrique, surtout le soir. C'est le paradis des gourmands avec takoyaki, okonomiyaki, kushikatsu et bien plus.",
      tips: "Prévois de la place dans ton estomac et viens avec un appétit d'ogre ! Les portions sont généreuses. Ne manque pas les enseignes du coureur Glico et du crabe géant pour tes photos souvenirs.",
      transfer: "30 min en train depuis Kyoto (JR ou Hankyu)",
      suggestion: "Takoyaki chez Kukuru, okonomiyaki chez Chibo, et kushikatsu chez Daruma sont des incontournables",
      weather: { icon: "☀️", temp: "23°C", description: "Clair et chaud" },
      images: [
        "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?w=800&q=80",
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80"
      ],
      price: 0,
      duration: "3h minimum"
    },
    {
      id: 16,
      day: 7,
      title: "Osaka Castle",
      subtitle: "Château historique",
      image: "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?w=1920&q=80",
      coordinates: [135.5258, 34.6873] as [number, number],
      why: "Un des châteaux les plus célèbres du Japon.",
      tips: "Monte au sommet pour la vue panoramique.",
      transfer: "20 min en métro",
      suggestion: "Dernière soirée shopping à Umeda",
      weather: { icon: "☀️", temp: "23°C", description: "Clair et chaud" }
    }
  ],
  summary: {
    totalDays: 7,
    totalBudget: "3 200 €",
    averageWeather: "21°C",
    travelStyle: "Culture & Gastronomie"
  }
};

const TravelRecommendations = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const rawCode = searchParams.get("code") ?? (params as any).code ?? null;
  const code = rawCode ? decodeURIComponent(rawCode).replace(/^=+/, '').trim() : null;
  const { trip, steps, loading } = useTripData(code);
  
  const [activeDay, setActiveDay] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [widgetTab, setWidgetTab] = useState<'map' | 'calendar'>('map');
  const scrollRef = useRef<HTMLDivElement>(null);
  const offsetsRef = useRef<Array<{ id: number; top: number }>>([]);

  // Départ du planning fixé au lundi de la semaine courante
  const getMonday = (d: Date = new Date()) => {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // 0 = lundi
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const startMonday = getMonday();

  // Transform database data to component format
  const travelData = trip && steps.length > 0 ? {
    destination: trip.destination,
    mainImage: trip.main_image || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80",
    flight: {
      from: trip.flight_from || "",
      to: trip.flight_to || "",
      duration: trip.flight_duration || "",
      type: trip.flight_type || ""
    },
    hotel: {
      name: trip.hotel_name || "",
      rating: trip.hotel_rating || 0
    },
    totalPrice: trip.total_price || "",
    days: steps.map(step => ({
      id: step.step_number,
      day: step.day_number,
      title: step.title,
      subtitle: step.subtitle || "",
      image: step.main_image || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80",
      isSummary: step.is_summary || false,
      coordinates: (step.latitude && step.longitude) 
        ? [step.longitude, step.latitude] as [number, number]
        : [0, 0] as [number, number],
      why: step.why || "",
      tips: step.tips || "",
      transfer: step.transfer || "",
      suggestion: step.suggestion || "",
      weather: {
        icon: step.weather_icon || "🌤️",
        temp: step.weather_temp || "",
        description: step.weather_description || ""
      },
      price: step.price !== null ? Number(step.price) : undefined,
      duration: step.duration || undefined,
      images: (step.images && Array.isArray(step.images) && step.images.length > 0) ? step.images : undefined
    })),
    summary: {
      totalDays: trip.total_days,
      totalBudget: trip.total_budget || "",
      averageWeather: trip.average_weather || "",
      travelStyle: trip.travel_style || ""
    }
  } : mockTravelData;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const recomputeOffsets = () => {
      const getTop = (node: HTMLElement) => node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
      const arr: Array<{ id: number; top: number }> = [];
      for (let i = 1; i <= travelData.days.length; i++) {
        const s = el.querySelector(`[data-day-id="${i}"]`) as HTMLElement | null;
        if (s) arr.push({ id: i, top: getTop(s) });
      }
      // Removed phantom summary tracking to avoid blank extra step

      arr.sort((a, b) => a.top - b.top);
      offsetsRef.current = arr;
    };

    const handleScroll = () => {
      const scrollTop = el.scrollTop + 1; // petite tolérance
      const documentHeight = el.scrollHeight - el.clientHeight;
      const progress = (scrollTop / documentHeight) * 100;
      setScrollProgress(progress);

      if (!offsetsRef.current.length) recomputeOffsets();

      // Avant l'étape 1 -> pas de widgets
      const first = offsetsRef.current.find(o => o.id === 1)?.top ?? 0;
      if (scrollTop < first) {
        setActiveDay(0);
        return;
      }

      // Trouver la dernière section dont le top est passé
      let currentId = 1;
      for (const o of offsetsRef.current) {
        if (scrollTop >= o.top) currentId = o.id; else break;
      }
      
      // Si on est au footer summary, currentId = summaryId
      const summaryElement = el.querySelector(`[data-day-id="summary"]`) as HTMLElement | null;
      if (summaryElement) {
        const summaryTop = summaryElement.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
        if (scrollTop >= summaryTop - 100) { // 100px de tolérance
          const maxStepId = Math.max(...travelData.days.filter(d => !(d as any).isSummary).map(d => d.id), 0);
          currentId = maxStepId + 1; // summaryId
        }
      }
      
      setActiveDay(currentId);
    };

    recomputeOffsets();
    const onResize = () => recomputeOffsets();

    el.addEventListener('scroll', handleScroll, { passive: true } as AddEventListenerOptions);
    window.addEventListener('resize', onResize, { passive: true } as AddEventListenerOptions);

    handleScroll();

    return () => {
      el.removeEventListener('scroll', handleScroll as any);
      window.removeEventListener('resize', onResize as any);
    };
  }, [travelData.days.length]);

  // Show loading or error states AFTER all hooks
  if (loading && code) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-travliaq-turquoise mx-auto mb-4"></div>
          <p className="text-white font-montserrat">Chargement du voyage...</p>
        </div>
      </div>
    );
  }

  if (code && !trip && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-montserrat font-bold text-white mb-4">Voyage introuvable</h1>
          <p className="text-white/80 font-inter mb-6">
            Le code "{code}" ne correspond à aucun voyage.
          </p>
          <Button onClick={() => window.location.href = '/'}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  if (code && travelData.days.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-travliaq-turquoise mx-auto mb-4"></div>
          <p className="text-white font-montserrat">Chargement du voyage...</p>
        </div>
      </div>
    );
  }

  // Separate summary step from regular steps
  const regularSteps = travelData.days.filter(d => !(d as any).isSummary);
  const summaryStep = travelData.days.find(d => (d as any).isSummary);
  
  // ID spécial pour le footer summary (après toutes les étapes régulières)
  const summaryId = Math.max(...regularSteps.map(d => d.id), 0) + 1;
  
  const allSteps = [
    ...regularSteps.map(d => ({ id: d.id, title: d.title, isSummary: false })),
    { id: summaryId, title: 'Validation', isSummary: true }
  ];


  const scrollToDay = (dayId: number | string) => {
    const el = scrollRef.current;
    if (!el) return;

    // Si c'est le summaryId, scroller vers la section summary
    const targetSelector = dayId === summaryId ? '[data-day-id="summary"]' : `[data-day-id="${dayId}"]`;
    const target = el.querySelector(targetSelector) as HTMLElement | null;
    if (!target) return;

    const getTop = (node: HTMLElement) => node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
    const targetTop = getTop(target);
    
    el.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* Fixed sidebar with Timeline (mobile bottom, desktop left) */}
      {activeDay >= 1 && (
        <TimelineSync
          days={allSteps}
          activeDay={activeDay}
          scrollProgress={scrollProgress}
          onScrollToDay={scrollToDay}
        />
      )}

      {/* Fixed step tracker (top, visible only from step 1) */}
      {activeDay >= 1 && (
        <div className="hidden lg:flex fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <TravelCalendar
            days={allSteps}
            activeDay={activeDay}
            onScrollToDay={scrollToDay}
          />
        </div>

      )}

      {/* Fixed planning widget (left side, visible only on regular steps, hidden on summary) */}
      {activeDay >= 1 && activeDay <= regularSteps.length && (
        <div className="hidden lg:block fixed left-4 top-32 z-40 w-64">
          <TravelDayCalendar
            days={regularSteps.map(d => ({
              id: d.id,
              title: d.title,
              day: d.day,
            }))}
            activeDay={activeDay}
            startDate={startMonday}
            onScrollToDay={scrollToDay}
          />
        </div>
      )}

      {/* Fixed map widget (right side, visible only on regular steps, hidden on summary) */}
      {activeDay >= 1 && activeDay <= regularSteps.length && (
        <div className="hidden lg:block fixed right-4 top-32 z-40 w-72">
          <MapView
            days={regularSteps.map(d => ({
              id: d.id,
              title: d.title,
              coordinates: d.coordinates,
            }))}
            activeDay={activeDay}
            onScrollToDay={scrollToDay}
          />
        </div>
      )}

      {/* Mobile/tablet bottom bar with steps - au plus bas */}
      {activeDay >= 1 && activeDay <= regularSteps.length && (
        <div className="lg:hidden fixed bottom-2 left-0 right-0 z-50 pointer-events-none">
          <div className="mx-auto max-w-screen-md px-4 space-y-1.5">
            {/* Action buttons en premier */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <Button
                variant="default"
                size="sm"
                className="flex-1 justify-center gap-2 bg-travliaq-turquoise hover:bg-travliaq-turquoise/90 active:bg-travliaq-turquoise text-white font-montserrat font-semibold shadow-[0_4px_12px_rgba(56,189,248,0.3)]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWidgetTab('map');
                  setDrawerOpen(true);
                }}
                aria-label="Ouvrir la carte"
              >
                <MapIcon className="h-4 w-4" />
                <span>Carte</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="flex-1 justify-center gap-2 bg-travliaq-turquoise hover:bg-travliaq-turquoise/90 active:bg-travliaq-turquoise text-white font-montserrat font-semibold shadow-[0_4px_12px_rgba(56,189,248,0.3)]"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWidgetTab('calendar');
                  setDrawerOpen(true);
                }}
                aria-label="Ouvrir le planning"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Planning</span>
              </Button>
            </div>
            
            {/* Step indicator ultra compact EN DESSOUS */}
            <div className="pointer-events-auto bg-gradient-to-br from-travliaq-deep-blue/50 to-travliaq-deep-blue/30 backdrop-blur-sm rounded-md border border-travliaq-turquoise/10 shadow-sm p-1">
              <div className="flex flex-wrap gap-0.5 justify-center">
                {allSteps.map((day) => (
                  <button
                    type="button"
                    key={day.id}
                    onClick={() => scrollToDay(day.id)}

                    className={`relative transition-all duration-200 ${
                      activeDay === day.id ? 'scale-110' : 'scale-100'
                    } focus:outline-none rounded-full`}
                    aria-label={`Aller à l'étape ${(day as any).isSummary ? 'Validation' : day.id}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center font-montserrat text-[7px] font-semibold transition-all duration-200 ${
                        activeDay === day.id
                          ? 'bg-travliaq-turquoise text-white shadow-[0_0_4px_rgba(56,189,248,0.6)]'
                          : 'bg-white/10 text-white/40 border border-white/10'
                      }`}
                    >
                      {(day as any).isSummary ? '✓' : day.id}
                    </div>

                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawer for widgets on mobile/tablet */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="border-t border-primary/20">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="text-base">
              {widgetTab === 'map' ? 'Carte' : 'Planning'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="p-3">
            {widgetTab === 'map' ? (
              <MapView
                days={travelData.days.map(d => ({ id: d.id, title: d.title, coordinates: d.coordinates }))}
                activeDay={activeDay >= 1 && activeDay <= travelData.days.length ? activeDay : 1}
                onScrollToDay={(dayId) => {
                  scrollToDay(dayId);
                  setDrawerOpen(false);
                }}
              />
            ) : (
              <TravelDayCalendar
                days={travelData.days.map(d => ({ id: d.id, title: d.title, day: d.day }))}
                activeDay={activeDay >= 1 && activeDay <= travelData.days.length ? activeDay : 1}
                startDate={startMonday}
                onScrollToDay={(dayId) => {
                  scrollToDay(dayId);
                  setDrawerOpen(false);
                }}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <div ref={scrollRef} className="h-screen overflow-y-auto scroll-smooth snap-y snap-mandatory themed-scroll pb-24 md:pb-28 lg:pb-0">
        <section data-day-id="0" className="h-screen snap-start">
          <HeroHeader
            destination={travelData.destination}
            mainImage={travelData.mainImage}
            flight={travelData.flight}
            hotel={travelData.hotel}
            totalPrice={travelData.totalPrice}
          />
        </section>

        <div className="relative">
          {travelData.days.map((day, index) => (
            <DaySection
              key={day.id}
              day={day}
              index={index}
              isActive={activeDay === day.id}
            />
          ))}
        </div>

        <FooterSummary 
          summary={travelData.summary}
          travelers={2}
          activities={regularSteps.length}
          cities={new Set(regularSteps.map(d => d.title.split(' ')[0])).size}
          stopovers={travelData.flight?.type?.toLowerCase().includes('direct') ? 0 : 1}
          destination={travelData.destination}
          tripTitle={`Voyage à ${travelData.destination} - ${travelData.summary.totalDays} jours`}
          tripCode={code}
        />
      </div>
    </div>
  );
};

export default TravelRecommendations;
