import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Users, 
  Mountain, 
  Search, 
  Sparkles,
  Globe2,
  Clock,
  DollarSign,
  Compass,
  Palmtree,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Trip {
  id: string;
  code: string;
  destination: string;
  total_days: number;
  main_image: string;
  start_date: string | null;
  total_price: string | null;
  total_budget: string | null;
  travel_style: string | null;
  average_weather: string | null;
  created_at: string;
}

const Discover = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = [
    { id: "budget", label: "< 800€", icon: DollarSign, filter: (t: Trip) => {
      const price = parseFloat(t.total_price || t.total_budget || "9999");
      return price < 800;
    }},
    { id: "group", label: "En groupe", icon: Users, filter: (t: Trip) => 
      t.travel_style?.toLowerCase().includes("groupe") || t.travel_style?.toLowerCase().includes("group")
    },
    { id: "adventure", label: "Aventure", icon: Mountain, filter: (t: Trip) => 
      t.travel_style?.toLowerCase().includes("aventure") || t.travel_style?.toLowerCase().includes("adventure")
    },
    { id: "nature", label: "Nature", icon: Palmtree, filter: (t: Trip) => 
      t.travel_style?.toLowerCase().includes("nature") || t.destination.toLowerCase().includes("montagne")
    },
    { id: "culture", label: "Culture", icon: Building2, filter: (t: Trip) => 
      t.travel_style?.toLowerCase().includes("culture") || t.travel_style?.toLowerCase().includes("découverte")
    },
    { id: "exploration", label: "Exploration", icon: Compass, filter: (t: Trip) => 
      t.travel_style?.toLowerCase().includes("exploration") || t.travel_style?.toLowerCase().includes("découverte")
    }
  ];

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    let filtered = trips;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(
        (trip) =>
          trip.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.travel_style?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply active filter
    if (activeFilter) {
      const filterObj = filters.find(f => f.id === activeFilter);
      if (filterObj) {
        filtered = filtered.filter(filterObj.filter);
      }
    }

    setFilteredTrips(filtered);
  }, [searchTerm, trips, activeFilter]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
      setFilteredTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les voyages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTripClick = (code: string) => {
    navigate(`/recommendations/${code}`);
  };

  const handleShare = (trip: Trip, platform: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/recommendations/${trip.code}`;
    const text = `Découvrez ce voyage incroyable : ${trip.destination}`;
    
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      copy: url
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast({
        title: "Lien copié ! 🎉",
        description: "Le lien du voyage a été copié dans votre presse-papier",
      });
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-travliaq-deep-blue via-black to-travliaq-deep-blue">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-travliaq-turquoise border-t-transparent rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-travliaq-golden-sand animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-travliaq-deep-blue via-black to-travliaq-deep-blue relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-travliaq-turquoise/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-travliaq-golden-sand/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Navigation />

      <div className="relative z-10 container mx-auto px-4 pt-32 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-4">
            <Globe2 className="w-8 h-8 text-travliaq-turquoise animate-pulse mr-3" />
            <h1 className="text-3xl md:text-5xl font-montserrat font-bold bg-gradient-to-r from-travliaq-turquoise via-travliaq-golden-sand to-travliaq-turquoise bg-clip-text text-transparent animate-gradient">
              DÉCOUVREZ LES VOYAGES
            </h1>
            <Sparkles className="w-8 h-8 text-travliaq-golden-sand animate-pulse ml-3" />
          </div>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Explorez notre collection de voyages uniques, conçus sur mesure pour des expériences inoubliables
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-travliaq-turquoise group-hover:text-travliaq-golden-sand transition-colors" />
            <Input
              type="text"
              placeholder="Rechercher une destination, un style de voyage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-5 bg-white/5 border-2 border-travliaq-turquoise/30 rounded-2xl text-white placeholder:text-gray-400 focus:border-travliaq-golden-sand focus:ring-2 focus:ring-travliaq-golden-sand/50 backdrop-blur-sm hover:bg-white/10 transition-all"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 justify-center mb-12 max-w-4xl mx-auto">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <Button
                key={filter.id}
                onClick={() => setActiveFilter(isActive ? null : filter.id)}
                className={`
                  ${isActive 
                    ? 'bg-gradient-to-r from-travliaq-turquoise to-travliaq-golden-sand text-white' 
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }
                  border-2 ${isActive ? 'border-travliaq-turquoise' : 'border-white/20'}
                  backdrop-blur-sm transition-all hover:scale-105 px-4 py-2 rounded-xl
                `}
              >
                <Icon className="w-4 h-4 mr-2" />
                {filter.label}
              </Button>
            );
          })}
        </div>

        {/* Trips Grid */}
        {filteredTrips.length === 0 ? (
          <div className="text-center py-20">
            <Globe2 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">Aucun voyage trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTrips.map((trip, index) => (
              <Card
                key={trip.id}
                onClick={() => handleTripClick(trip.code)}
                className="group relative bg-white/5 border-2 border-white/10 backdrop-blur-sm overflow-hidden cursor-pointer hover:border-travliaq-turquoise hover:shadow-2xl hover:shadow-travliaq-turquoise/20 transition-all duration-500 hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={trip.main_image}
                    alt={trip.destination}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                  
                  {/* Badge NEW */}
                  {(() => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(trip.created_at) > weekAgo;
                  })() && (
                    <Badge className="absolute top-4 left-4 bg-travliaq-golden-sand text-black font-bold px-3 py-1 animate-pulse">
                      <Sparkles className="w-3 h-3 mr-1" />
                      NOUVEAU
                    </Badge>
                  )}

                  {/* Share Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white border border-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-black/90 border-travliaq-turquoise/30 backdrop-blur-sm">
                      <DropdownMenuItem onClick={(e) => handleShare(trip, 'facebook', e)} className="text-white hover:text-travliaq-turquoise cursor-pointer">
                        Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleShare(trip, 'twitter', e)} className="text-white hover:text-travliaq-turquoise cursor-pointer">
                        X (Twitter)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleShare(trip, 'whatsapp', e)} className="text-white hover:text-travliaq-turquoise cursor-pointer">
                        WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleShare(trip, 'telegram', e)} className="text-white hover:text-travliaq-turquoise cursor-pointer">
                        Telegram
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleShare(trip, 'copy', e)} className="text-white hover:text-travliaq-turquoise cursor-pointer">
                        Copier le lien
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Destination */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-bold text-white drop-shadow-lg">
                      {trip.destination}
                    </h3>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-travliaq-turquoise">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{trip.total_days} jours</span>
                    </div>
                    {trip.average_weather && (
                      <div className="flex items-center text-travliaq-golden-sand">
                        <span>🌡️ {trip.average_weather}</span>
                      </div>
                    )}
                  </div>

                  {trip.travel_style && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-travliaq-turquoise/50 text-travliaq-turquoise bg-travliaq-turquoise/10">
                        {trip.travel_style}
                      </Badge>
                    </div>
                  )}

                  {(trip.total_price || trip.total_budget) && (
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-gray-400 text-sm">À partir de</span>
                      <span className="text-xl font-bold text-travliaq-golden-sand flex items-center">
                        <DollarSign className="w-5 h-5 mr-1" />
                        {trip.total_price || trip.total_budget}
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full bg-gradient-to-r from-travliaq-turquoise to-travliaq-deep-blue hover:from-travliaq-golden-sand hover:to-travliaq-turquoise text-white font-semibold py-2 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-travliaq-turquoise/50 text-sm"
                    onClick={() => handleTripClick(trip.code)}
                  >
                    Découvrir
                    <Sparkles className="w-3 h-3 ml-2" />
                  </Button>
                </div>

                {/* Holographic Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-travliaq-turquoise/10 via-transparent to-travliaq-golden-sand/10"></div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Discover;
