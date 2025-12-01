import { Button } from "@/components/ui/button";
import { MapPin, Compass, Route, Plane, Camera, Globe, Star, Sparkles, Mail, Check, X, ChevronDown, ArrowRight, Clock, Users, Heart, Shield } from "lucide-react";
import heroImage from "@/assets/hero-travliaq.jpg";
import step1Image from "@/assets/step1-questionnaire.jpg";
import step2Image from "@/assets/step2-ai-analysis.jpg";
import step3Image from "@/assets/step3-itinerary.jpg";
import step4Image from "@/assets/step4-departure.jpg";
import beforeImage from "@/assets/before-travliaq.jpg";
import afterImage from "@/assets/after-travliaq.jpg";
import logo from "@/assets/logo-travliaq.png";
import Navigation from "@/components/Navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const IndexV2 = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    // Show a discrete toast notification if user is not logged in
    if (!user) {
      const timer = setTimeout(() => {
        toast.info(t('toast.login'), {
          duration: 8000,
          position: "bottom-right",
          action: {
            label: t('toast.loginButton'),
            onClick: async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/`,
                  queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                  }
                }
              });
              if (error) {
                toast.error(t('toast.loginError', { error: error.message }));
              }
            }
          }
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, t]);

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'comparison', 'how-it-works', 'examples', 'video', 'why-travliaq', 'faq'];
      const currentSection = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (currentSection) {
        setActiveSection(currentSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCTA = () => {
    if (user) {
      window.location.href = '/questionnaire';
    } else {
      window.location.href = '/auth';
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Sticky Section Navigation */}
      <nav className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center gap-2 py-3 overflow-x-auto">
            {[
              { id: 'hero', label: t('nav.home') },
              { id: 'comparison', label: t('nav.comparison') },
              { id: 'how-it-works', label: t('nav.howItWorks') },
              { id: 'examples', label: t('nav.examples') },
              { id: 'why-travliaq', label: t('nav.whyUs') },
              { id: 'faq', label: t('nav.faq') },
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  activeSection === section.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt="Backpacker au coucher du soleil" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-travliaq-deep-blue/70 via-travliaq-deep-blue/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-6 text-center text-white animate-fade-up">
          <h1 className="text-5xl md:text-7xl font-montserrat font-bold mb-6 leading-tight">
            {t('hero.title')}<br />
            <span className="bg-gradient-accent bg-clip-text text-transparent">
              {t('hero.title.ai')}
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto font-inter leading-relaxed opacity-90">
            {user && user.user_metadata?.full_name ? (
              <span className="animate-fade-in">
                <strong className="text-travliaq-golden-sand">{user.user_metadata.full_name.split(' ')[0]}</strong>{' '}
                {t('hero.subtitle.afterName')}
              </span>
            ) : t('hero.subtitle')}
          </p>
          <Button 
            variant="hero" 
            size="xl" 
            className="animate-adventure-float"
            onClick={handleCTA}
          >
            <Sparkles className="mr-2" />
            {t('hero.cta')}
          </Button>
        </div>

        {/* Scroll indicator */}
        <button 
          onClick={() => scrollToSection('comparison')}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white animate-bounce cursor-pointer"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </button>
      </section>

      {/* Comparison Section - Avant/Après */}
      <section id="comparison" className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-montserrat font-bold mb-6 text-foreground">
              {t('comparison.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('comparison.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Avant Travliaq */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-xl border-2 border-destructive/20">
              <div className="relative h-64">
                <img src={beforeImage} alt="Planification traditionnelle" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-bold flex items-center gap-2">
                  <X className="w-5 h-5" />
                  {t('comparison.before.badge')}
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-montserrat font-bold mb-6 text-foreground">
                  {t('comparison.before.title')}
                </h3>
                <ul className="space-y-4">
                  {[
                    t('comparison.before.point1'),
                    t('comparison.before.point2'),
                    t('comparison.before.point3'),
                    t('comparison.before.point4'),
                  ].map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-destructive mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Après Travliaq */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-xl border-2 border-primary/20">
              <div className="relative h-64">
                <img src={afterImage} alt="Avec Travliaq" className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  {t('comparison.after.badge')}
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-montserrat font-bold mb-6 text-foreground">
                  {t('comparison.after.title')}
                </h3>
                <ul className="space-y-4">
                  {[
                    t('comparison.after.point1'),
                    t('comparison.after.point2'),
                    t('comparison.after.point3'),
                    t('comparison.after.point4'),
                  ].map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche Section - Version Visuelle */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-6xl font-montserrat font-bold text-center mb-8 text-foreground">
            {t('howItWorks.title')}
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-16 max-w-3xl mx-auto">
            {t('howItWorks.description')}
          </p>

          <div className="space-y-24 max-w-6xl mx-auto">
            {/* Étape 1 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
                    1
                  </div>
                  <h3 className="text-3xl font-montserrat font-bold text-foreground">
                    {t('step1.title')}
                  </h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  {t('step1.description')}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step1.dest')}</strong> {t('step1.dest.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step1.dates')}</strong> {t('step1.dates.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step1.budget')}</strong> {t('step1.budget.desc')}</span>
                  </li>
                </ul>
              </div>
              <div className="order-1 md:order-2">
                <img src={step1Image} alt="Questionnaire" className="w-full rounded-2xl shadow-2xl" />
              </div>
            </div>

            {/* Étape 2 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <img src={step2Image} alt="Analyse IA" className="w-full rounded-2xl shadow-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
                    2
                  </div>
                  <h3 className="text-3xl font-montserrat font-bold text-foreground">
                    {t('step2.title')}
                  </h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  {t('step2.description')}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Compass className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step2.scan')}</strong> {t('step2.scan.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Globe className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step2.cross')}</strong> {t('step2.cross.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step2.filter')}</strong> {t('step2.filter.desc')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
                    3
                  </div>
                  <h3 className="text-3xl font-montserrat font-bold text-foreground">
                    {t('step3.title')}
                  </h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  {t('step3.description')}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Route className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step3.program')}</strong> {t('step3.program.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step3.budget')}</strong> {t('step3.budget.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Heart className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step3.tips')}</strong> {t('step3.tips.desc')}</span>
                  </li>
                </ul>
              </div>
              <div className="order-1 md:order-2">
                <img src={step3Image} alt="Itinéraire" className="w-full rounded-2xl shadow-2xl" />
              </div>
            </div>

            {/* Étape 4 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <img src={step4Image} alt="Départ" className="w-full rounded-2xl shadow-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold">
                    4
                  </div>
                  <h3 className="text-3xl font-montserrat font-bold text-foreground">
                    {t('step4.title')}
                  </h3>
                </div>
                <p className="text-lg text-muted-foreground mb-6">
                  {t('step4.description')}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Mail className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step4.email')}</strong> {t('step4.email.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Plane className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step4.links')}</strong> {t('step4.links.desc')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                    <span className="text-foreground"><strong>{t('step4.modular')}</strong> {t('step4.modular.desc')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Button 
              variant="hero" 
              size="xl" 
              onClick={handleCTA}
            >
              <Sparkles className="mr-2" />
              {t('cta.start')}
            </Button>
          </div>
        </div>
      </section>

      {/* Exemples de Voyages Section */}
      <section id="examples" className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-montserrat font-bold mb-6 text-foreground">
              {t('examples.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('examples.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Example 1 - Tokyo */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-xl group hover:shadow-2xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-travliaq-deep-blue to-travliaq-turquoise"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="w-16 h-16 text-white opacity-50" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-montserrat font-bold mb-3 text-foreground">
                  {t('examples.tokyo.title')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('examples.tokyo.description')}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t('examples.tokyo.duration')}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t('examples.tokyo.travelers')}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  onClick={() => window.location.href = '/recommendations/TOKYO2025'}
                >
                  {t('examples.viewTrip')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Example 2 - Sidi Bel Abbès */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-xl group hover:shadow-2xl transition-all">
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-travliaq-golden-sand to-travliaq-light-blue"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-white opacity-50" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-montserrat font-bold mb-3 text-foreground">
                  {t('examples.algeria.title')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('examples.algeria.description')}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t('examples.algeria.duration')}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t('examples.algeria.travelers')}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  onClick={() => window.location.href = '/recommendations/SIDIBEL2025'}
                >
                  {t('examples.viewTrip')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Example 3 - Custom Trip */}
            <div className="bg-card rounded-2xl overflow-hidden shadow-xl group hover:shadow-2xl transition-all border-2 border-primary">
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-accent"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-white opacity-80 animate-pulse" />
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-montserrat font-bold mb-3 text-foreground">
                  {t('examples.custom.title')}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {t('examples.custom.description')}
                </p>
                <div className="flex items-center justify-center text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {t('examples.custom.anywhere')}
                  </span>
                </div>
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={handleCTA}
                >
                  <Sparkles className="mr-2 w-4 h-4" />
                  {t('examples.createYours')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section id="video" className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-montserrat font-bold mb-6 text-foreground">
              {t('video.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('video.subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl bg-muted">
              {/* Placeholder - Replace with actual video URL */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Plane className="w-24 h-24 text-muted-foreground mx-auto mb-4 animate-pulse" />
                  <p className="text-xl font-montserrat font-bold text-foreground mb-2">
                    {t('video.coming')}
                  </p>
                  <p className="text-muted-foreground">
                    {t('video.demo')}
                  </p>
                </div>
              </div>
              {/* Example iframe for when video is ready:
              <iframe 
                className="w-full h-full"
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                title="Travliaq Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              */}
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi Travliaq Section */}
      <section id="why-travliaq" className="py-20 bg-gradient-to-br from-travliaq-deep-blue via-travliaq-deep-blue/95 to-travliaq-light-blue">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-montserrat font-bold mb-6 text-white">
              {t('whyTravliaq.title')}
            </h2>
            <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed">
              {t('whyTravliaq.subtitle')}
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto mb-16">
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="flex items-start gap-6">
                  <div className="bg-travliaq-golden-sand rounded-xl p-4 group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-8 h-8 text-travliaq-deep-blue" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-montserrat font-bold mb-3 text-white">
                      {t('whyTravliaq.noPlan.title')}
                    </h3>
                    <p className="text-white/80 leading-relaxed text-lg">
                      {t('whyTravliaq.noPlan.desc')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <div className="flex items-start gap-6">
                  <div className="bg-travliaq-turquoise rounded-xl p-4 group-hover:scale-110 transition-transform duration-300">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-montserrat font-bold mb-3 text-white">
                      {t('whyTravliaq.local.title')}
                    </h3>
                    <p className="text-white/80 leading-relaxed text-lg">
                      {t('whyTravliaq.local.desc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-travliaq-golden-sand to-travliaq-golden-sand/80 rounded-2xl p-8 text-travliaq-deep-blue">
                <div className="text-center">
                  <div className="text-5xl font-montserrat font-bold mb-2">92%</div>
                  <p className="text-lg font-medium mb-4">{t('whyTravliaq.stat')}</p>
                  <div className="flex justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-montserrat font-bold mb-6 text-white text-center">
                  {t('whyTravliaq.guarantees')}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Shield className="w-6 h-6 text-travliaq-golden-sand flex-shrink-0" />
                    <span className="text-white/90">{t('whyTravliaq.guarantee1')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Heart className="w-6 h-6 text-travliaq-turquoise flex-shrink-0" />
                    <span className="text-white/90">{t('whyTravliaq.guarantee2')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Star className="w-6 h-6 text-travliaq-light-blue flex-shrink-0" />
                    <span className="text-white/90">{t('whyTravliaq.guarantee3')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Check className="w-6 h-6 text-travliaq-golden-sand flex-shrink-0" />
                    <span className="text-white/90">{t('whyTravliaq.guarantee4')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/10 max-w-5xl mx-auto mb-12">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-8 h-8 text-travliaq-golden-sand fill-current" />)}
              </div>
              <blockquote className="text-2xl md:text-3xl font-montserrat font-bold text-white mb-6 leading-relaxed">
                {t('whyTravliaq.testimonial')}
              </blockquote>
              <p className="text-xl text-white/70 font-inter">
                {t('whyTravliaq.testimonial.author')}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <Button 
              variant="hero" 
              size="xl" 
              className="bg-travliaq-golden-sand text-travliaq-deep-blue hover:bg-travliaq-golden-sand/90 font-bold px-8 py-4"
              onClick={handleCTA}
            >
              <Sparkles className="mr-2" />
              {t('cta.create')}
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-montserrat font-bold mb-6 text-foreground">
              {t('faq.title')}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('faq.subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-card rounded-lg px-6 border">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  {t('faq.q1')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a1')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-card rounded-lg px-6 border">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  {t('faq.q2')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a2')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-card rounded-lg px-6 border">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  {t('faq.q3')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a3')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-card rounded-lg px-6 border">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  {t('faq.q4')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a4')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-card rounded-lg px-6 border">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  {t('faq.q5')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a5')}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="bg-card rounded-lg px-6 border">
                <AccordionTrigger className="text-lg font-semibold text-foreground hover:no-underline">
                  {t('faq.q6')}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t('faq.a6')}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-6">
              {t('faq.more')}
            </p>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.location.href = '/discover'}
            >
              <Mail className="mr-2" />
              {t('faq.contact')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-travliaq-deep-blue text-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <img src={logo} alt="Travliaq" className="w-32 mb-4" />
              <p className="text-white/70 text-sm leading-relaxed">
                {t('footer.tagline')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-montserrat font-bold mb-4">{t('footer.navigation')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/" className="text-white/70 hover:text-white transition-colors">{t('nav.home')}</a></li>
                <li><a href="/blog" className="text-white/70 hover:text-white transition-colors">{t('nav.blog')}</a></li>
                <li><a href="/discover" className="text-white/70 hover:text-white transition-colors">{t('nav.discover')}</a></li>
                <li><a href="/questionnaire" className="text-white/70 hover:text-white transition-colors">{t('nav.questionnaire')}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-montserrat font-bold mb-4">{t('footer.legal')}</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/cgv" className="text-white/70 hover:text-white transition-colors">{t('footer.terms')}</a></li>
                <li><a href="/cgv" className="text-white/70 hover:text-white transition-colors">{t('footer.privacy')}</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-montserrat font-bold mb-4">{t('footer.contact')}</h3>
              <ul className="space-y-2 text-sm">
                <li className="text-white/70">contact@travliaq.com</li>
                <li className="flex gap-4 mt-4">
                  <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Facebook">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                  <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Instagram">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </a>
                  <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Twitter">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-sm text-white/60">
            <p>&copy; {new Date().getFullYear()} Travliaq. {t('footer.rights')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexV2;
