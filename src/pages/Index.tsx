import { Button } from "@/components/ui/button";
import { MapPin, Clock, Sparkles, Users, Star, Mail } from "lucide-react";
import heroImage from "@/assets/hero-travliaq.jpg";
import logo from "@/assets/logo-travliaq.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-20 p-6">
        <div className="container mx-auto">
          <img 
            src={logo} 
            alt="Logo Travliaq" 
            className="h-12 w-auto"
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
          <h2 className="text-4xl md:text-5xl font-montserrat font-bold text-center mb-6 text-travliaq-deep-blue">
            Comment ça marche ?
          </h2>
          <p className="text-xl text-center mb-16 text-muted-foreground max-w-2xl mx-auto">
            Travliaq organise votre voyage personnalisé en 4 étapes simples…
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <div className="text-center group hover:transform hover:scale-105 transition-adventure">
              <div className="bg-travliaq-turquoise w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-adventure group-hover:shadow-deep">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-montserrat font-bold mb-4 text-travliaq-deep-blue">
                1. Vos envies
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Indique destination, dates, budget, style de voyage.
              </p>
            </div>

            <div className="text-center group hover:transform hover:scale-105 transition-adventure">
              <div className="bg-travliaq-golden-sand w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-golden group-hover:shadow-deep">
                <Sparkles className="w-10 h-10 text-travliaq-deep-blue" />
              </div>
              <h3 className="text-xl font-montserrat font-bold mb-4 text-travliaq-deep-blue">
                2. Recherche intelligente
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Scan vols, hôtels, météo, activités en temps réel.
              </p>
            </div>

            <div className="text-center group hover:transform hover:scale-105 transition-adventure">
              <div className="bg-travliaq-light-blue w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-deep group-hover:shadow-adventure">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-montserrat font-bold mb-4 text-travliaq-deep-blue">
                3. Itinéraire optimisé
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Jour par jour, budget maîtrisé, astuces locales.
              </p>
            </div>

            <div className="text-center group hover:transform hover:scale-105 transition-adventure">
              <div className="bg-travliaq-turquoise w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-adventure group-hover:shadow-deep">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-montserrat font-bold mb-4 text-travliaq-deep-blue">
                4. Voyage prêt à réserver
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Itinéraire envoyé par email + liens directs.
              </p>
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
    </div>
  );
};

export default Index;