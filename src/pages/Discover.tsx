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
  Calendar, 
  TrendingUp, 
  Search, 
  Share2, 
  Sparkles,
  Globe2,
  Clock,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = trips.filter(
        (trip) =>
          trip.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.travel_style?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTrips(filtered);
    } else {
      setFilteredTrips(trips);
    }
  }, [searchTerm, trips]);

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

  const handleShare = async (trip: Trip, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/recommendations/${trip.code}`;
    
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Lien copié ! 🎉",
        description: "Le lien du voyage a été copié dans votre presse-papier",
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
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
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <Globe2 className="w-12 h-12 text-travliaq-turquoise animate-pulse mr-4" />
            <h1 className="text-5xl md:text-7xl font-montserrat font-bold bg-gradient-to-r from-travliaq-turquoise via-travliaq-golden-sand to-travliaq-turquoise bg-clip-text text-transparent animate-gradient">
              DÉCOUVREZ LES VOYAGES
            </h1>
            <Sparkles className="w-12 h-12 text-travliaq-golden-sand animate-pulse ml-4" />
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Explorez notre collection de voyages uniques, conçus sur mesure pour des expériences inoubliables
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-travliaq-turquoise group-hover:text-travliaq-golden-sand transition-colors" />
            <Input
              type="text"
              placeholder="Rechercher une destination, un style de voyage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 bg-white/5 border-2 border-travliaq-turquoise/30 rounded-2xl text-white placeholder:text-gray-400 focus:border-travliaq-golden-sand focus:ring-2 focus:ring-travliaq-golden-sand/50 backdrop-blur-sm hover:bg-white/10 transition-all"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
          <Card className="bg-white/5 border-travliaq-turquoise/30 backdrop-blur-sm p-6 hover:bg-white/10 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-travliaq-turquoise/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Destinations</p>
                <p className="text-3xl font-bold text-travliaq-turquoise">{trips.length}</p>
              </div>
              <MapPin className="w-10 h-10 text-travliaq-turquoise/50" />
            </div>
          </Card>
          <Card className="bg-white/5 border-travliaq-golden-sand/30 backdrop-blur-sm p-6 hover:bg-white/10 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-travliaq-golden-sand/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Nouveaux cette semaine</p>
                <p className="text-3xl font-bold text-travliaq-golden-sand">
                  {trips.filter(t => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(t.created_at) > weekAgo;
                  }).length}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-travliaq-golden-sand/50" />
            </div>
          </Card>
          <Card className="bg-white/5 border-purple-500/30 backdrop-blur-sm p-6 hover:bg-white/10 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Styles de voyage</p>
                <p className="text-3xl font-bold text-purple-400">
                  {new Set(trips.map(t => t.travel_style).filter(Boolean)).size}
                </p>
              </div>
              <Sparkles className="w-10 h-10 text-purple-400/50" />
            </div>
          </Card>
        </div>

        {/* Trips Grid */}
        {filteredTrips.length === 0 ? (
          <div className="text-center py-20">
            <Globe2 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-xl">Aucun voyage trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTrips.map((trip, index) => (
              <Card
                key={trip.id}
                onClick={() => handleTripClick(trip.code)}
                className="group relative bg-white/5 border-2 border-white/10 backdrop-blur-sm overflow-hidden cursor-pointer hover:border-travliaq-turquoise hover:shadow-2xl hover:shadow-travliaq-turquoise/20 transition-all duration-500 hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleShare(trip, e)}
                    className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white border border-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>

                  {/* Destination */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                      {trip.destination}
                    </h3>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 space-y-4">
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
                    className="w-full bg-gradient-to-r from-travliaq-turquoise to-travliaq-deep-blue hover:from-travliaq-golden-sand hover:to-travliaq-turquoise text-white font-semibold py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-travliaq-turquoise/50"
                    onClick={() => handleTripClick(trip.code)}
                  >
                    Découvrir ce voyage
                    <Sparkles className="w-4 h-4 ml-2" />
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
