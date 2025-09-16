import { Button } from "@/components/ui/button";
import { MapPin, Clock, Sparkles, Users, Star, Mail } from "lucide-react";
import heroImage from "@/assets/hero-travliaq.jpg";
import logo from "@/assets/logo-travliaq.png";
import GoogleLoginPopup from "@/components/GoogleLoginPopup";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Show popup only if user is not logged in
      if (!user) {
        // Show popup after 2 seconds
        const timer = setTimeout(() => {
          setShowLoginPopup(true);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowLoginPopup(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6">
        <div className="container mx-auto">
          <img 
            src={logo} 
            alt="Logo Travliaq" 
            className="h-20 w-auto"
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Backpacker au coucher du soleil" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-travliaq-deep-blue/70 via-travliaq-deep-blue/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-6 text-center text-white animate-fade-up">
          <h1 className="text-5xl md:text-7xl font-montserrat font-bold mb-6 leading-tight">
            Ton voyage,<br />
            <span className="bg-gradient-accent bg-clip-text text-transparent">
              optimisé par l'IA
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto font-inter leading-relaxed opacity-90">
            Découvre ton prochain itinéraire personnalisé — vols, hôtels, météo, activités, tout en un seul clic.
          </p>
          <Button 
            variant="hero" 
            size="xl" 
            className="animate-adventure-float"
            asChild
          >
            <a href="https://form.typeform.com/to/w3660YhR" target="_blank" rel="noopener noreferrer">
              <Sparkles className="mr-2" />
              Crée ton itinéraire
            </a>
          </Button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Comment ça marche Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-montserrat font-bold text-center mb-8 text-travliaq-deep-blue">
            Comment ça marche ?
          </h2>
          
          {/* Description encadrée */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="bg-gradient-to-r from-purple-100 to-blue-50 border-2 border-purple-300 rounded-lg p-6 text-center">
              <p className="text-lg text-travliaq-deep-blue leading-relaxed font-inter">
                Travliaq organise votre voyage personnalisé en 4 étapes simples : vous indiquez vos envies, nous comparons en temps réel vols, 
                hébergements et activités (prix, météo, distances), nous assemblons un itinéraire jour-par-jour logique et maîtrisé côté budget, puis vous 
                recevez le tout par e-mail avec des liens prêts à réserver. Moins d'onglets, plus d'aventure. Idéal pour backpackers et solo travelers : 
                rapide, flexible, sans carte bancaire.
              </p>
            </div>
          </div>
          
          {/* 4 étapes en flèches */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Étape 1 */}
            <div className="relative">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure relative">
                <div className="flex items-center mb-4">
                  <MapPin className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">
                    Vos envies
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Indique ta destination :</strong> que ce soit Lisbonne, Tokyo ou juste l'aéroport de départ, pour que Travliaq trouve les meilleures options.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Précise tes dates :</strong> fixes ou flexibles, pour optimiser prix et météo, et te garantir un timing parfait.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Partage ton budget et ton style de voyage :</strong> solo, sac à dos, confort ou premium, on adapte chaque étape à ton rythme et à tes envies.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="relative">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure relative">
                <div className="flex items-center mb-4">
                  <Sparkles className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">
                    Recherche intelligente
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>On scanne les meilleures options :</strong> vols, hébergements et activités, via des sources fiables et mises à jour en temps réel.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>On croise prix, météo et logistique :</strong> pour que chaque étape s'enchaîne naturellement, sans perte de temps ni de budget.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>On filtre selon ton profil :</strong> solo, backpacker, confort ou premium, chaque résultat est ajusté à tes priorités.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="relative">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure relative">
                <div className="flex items-center mb-4">
                  <Clock className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">
                    Itinéraire optimisé
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Programme jour par jour :</strong> activités, visites, pauses et repas organisés dans un ordre logique, pour profiter sans te presser.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Budget maîtrisé :</strong> chaque étape est chiffrée pour éviter les mauvaises surprises, du vol au café du coin.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Astuces locales intégrées :</strong> spots photo, restaurants cachés, transports malins... comme si un ami sur place te guidait.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étape 4 */}
            <div className="relative">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure relative">
                <div className="flex items-center mb-4">
                  <Mail className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">
                    Voyage prêt à réserver
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Itinéraire complet envoyé par e-mail :</strong> prêt à être consulté en ligne ou hors connexion.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Liens directs pour réserver :</strong> vols, hébergements, activités, tout est à portée de clic.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>100% modulable :</strong> tu peux ajuster les dates, changer une activité ou relancer une recherche en un instant.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-montserrat font-bold text-center mb-16 text-travliaq-deep-blue">
            Pourquoi Travliaq ?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-xl shadow-adventure hover:shadow-deep transition-adventure border border-border">
              <div className="bg-travliaq-turquoise/10 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                <Clock className="w-8 h-8 text-travliaq-turquoise" />
              </div>
              <h3 className="text-2xl font-montserrat font-bold mb-4 text-card-foreground">
                Gain de temps
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Plus besoin de passer des heures à comparer les prix et les options. L'IA fait tout le travail pour toi.
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-golden hover:shadow-deep transition-adventure border border-border">
              <div className="bg-travliaq-golden-sand/10 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-travliaq-golden-sand" />
              </div>
              <h3 className="text-2xl font-montserrat font-bold mb-4 text-card-foreground">
                Expérience authentique
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Recommandations locales et culturelles pour vivre ton voyage comme un habitant, pas comme un touriste.
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-deep hover:shadow-adventure transition-adventure border border-border">
              <div className="bg-travliaq-light-blue/10 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-travliaq-light-blue" />
              </div>
              <h3 className="text-2xl font-montserrat font-bold mb-4 text-card-foreground">
                Optimisation IA
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Meilleur prix, meilleure météo, meilleurs moments — l'algorithme trouve la combinaison gagnante.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-8 h-8 text-travliaq-golden-sand fill-current" />
              ))}
            </div>
            <blockquote className="text-3xl md:text-4xl font-montserrat font-bold text-white mb-8 leading-relaxed">
              « Voyage facile, fluide, et pas cher — enfin ! »
            </blockquote>
            <p className="text-xl text-white/80 font-inter">
              Marie, 28 ans — Barcelone & Lisbonne
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-travliaq-deep-blue text-white">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h3 className="text-3xl font-montserrat font-bold mb-8 text-travliaq-golden-sand">
              Travliaq
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
              <a 
                href="mailto:hello@travliaq.com" 
                className="flex items-center gap-2 text-lg hover:text-travliaq-turquoise transition-colors"
              >
                <Mail className="w-5 h-5" />
                hello@travliaq.com
              </a>
            </div>
            <div className="border-t border-travliaq-light-blue pt-8 mt-8">
              <p className="text-travliaq-light-blue/60">
                © 2024 Travliaq. Ton prochain voyage commence ici.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Google Login Popup */}
      {showLoginPopup && !user && (
        <GoogleLoginPopup onClose={() => setShowLoginPopup(false)} />
      )}
    </div>
  );
};

export default Index;