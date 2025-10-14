import { Button } from "@/components/ui/button";
import { MapPin, Compass, Route, Plane, Camera, Globe, Star, Sparkles, Mail } from "lucide-react";
import heroImage from "@/assets/hero-travliaq.jpg";
import logo from "@/assets/logo-travliaq.png";
import Navigation from "@/components/Navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    // Show a discrete toast notification if user is not logged in
    if (!user) {
      const timer = setTimeout(() => {
        toast.info(t('toast.login'), {
          duration: 8000,
          position: "top-right",
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
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
          <Button variant="hero" size="xl" className="animate-adventure-float" asChild>
            <a href="/questionnaire">
              <Sparkles className="mr-2" />
              {t('hero.cta')}
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
            {t('howItWorks.title')}
          </h2>
          
          {/* Description encadrée */}
          <div className="max-w-5xl mx-auto mb-16">
            <div className="bg-gradient-to-r from-purple-100 to-blue-50 border-2 border-purple-300 rounded-lg p-6 text-center">
              <p className="text-lg text-travliaq-deep-blue leading-relaxed font-inter">
                <strong>Travliaq</strong> {t('howItWorks.description')} <br />
                1️⃣ {t('howItWorks.step1')} <br />
                2️⃣ {t('howItWorks.step2')} <br />
                3️⃣ {t('howItWorks.step3')} <br />
                4️⃣ {t('howItWorks.step4')} <br />
                <em>{t('howItWorks.tagline')}</em> 🎒
              </p>
            </div>
          </div>
          
          {/* 4 étapes harmonisées */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Étape 1 */}
            <div className="relative h-full">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure h-full flex flex-col">
                <div className="flex items-center mb-4">
                  <MapPin className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">
                    {t('step1.title')}
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue flex-grow">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step1.dest')}</strong> {t('step1.dest.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step1.dates')}</strong> {t('step1.dates.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step1.budget')}</strong> {t('step1.budget.desc')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="relative h-full">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure h-full flex flex-col">
                <div className="flex items-center mb-4">
                  <Compass className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">{t('step2.title')}</h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue flex-grow">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step2.scan')}</strong> {t('step2.scan.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step2.cross')}</strong> {t('step2.cross.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step2.filter')}</strong> {t('step2.filter.desc')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="relative h-full">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure h-full flex flex-col">
                <div className="flex items-center mb-4">
                  <Route className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">
                    {t('step3.title')}
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue flex-grow">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step3.program')}</strong> {t('step3.program.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step3.budget')}</strong> {t('step3.budget.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step3.tips')}</strong> {t('step3.tips.desc')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Étape 4 */}
            <div className="relative h-full">
              <div className="bg-travliaq-golden-sand rounded-lg p-6 shadow-golden transform hover:scale-105 transition-adventure h-full flex flex-col">
                <div className="flex items-center mb-4">
                  <Plane className="w-8 h-8 text-travliaq-deep-blue mr-3" />
                  <h3 className="text-xl font-montserrat font-bold text-travliaq-deep-blue">
                    {t('step4.title')}
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-travliaq-deep-blue flex-grow">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step4.email')}</strong> {t('step4.email.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step4.links')}</strong> {t('step4.links.desc')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-travliaq-deep-blue rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>{t('step4.modular')}</strong> {t('step4.modular.desc')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Call-to-action après Comment ça marche */}
          <div className="text-center mt-16">
            <Button variant="hero" size="xl" className="animate-adventure-float" asChild>
              <a href="/questionnaire">
                <Sparkles className="mr-2" />
                {t('cta.start')}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Pourquoi Travliaq Section - Refactorisée */}
      <section className="py-20 bg-gradient-to-br from-travliaq-deep-blue via-travliaq-deep-blue/95 to-travliaq-light-blue">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-montserrat font-bold mb-6 text-white">
              {t('whyTravliaq.title')}
            </h2>
            <p className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed">
              {t('whyTravliaq.subtitle')}
            </p>
          </div>
          
          {/* Grid principal avec design moderne */}
          <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto mb-16">
            
            {/* Colonne gauche - Avantages principaux */}
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

            {/* Colonne droite - Statistiques et garanties */}
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
                    <div className="w-3 h-3 bg-travliaq-golden-sand rounded-full"></div>
                    <span className="text-white/90">{t('whyTravliaq.guarantee1')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-travliaq-turquoise rounded-full"></div>
                    <span className="text-white/90">{t('whyTravliaq.guarantee2')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-travliaq-light-blue rounded-full"></div>
                    <span className="text-white/90">{t('whyTravliaq.guarantee3')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-travliaq-golden-sand rounded-full"></div>
                    <span className="text-white/90">{t('whyTravliaq.guarantee4')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section testimonial intégrée */}
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

          {/* Double call-to-action harmonieux */}
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <Button variant="hero" size="xl" className="bg-travliaq-golden-sand text-travliaq-deep-blue hover:bg-travliaq-golden-sand/90 font-bold px-8 py-4" asChild>
              <a href="/questionnaire">
                <Sparkles className="mr-2" />
                {t('cta.create')}
              </a>
            </Button>
            
            <div className="text-center">
              <p className="text-white/60 text-sm">
                {t('footer.ribbon')}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Footer Professionnel */}
      <footer className="py-20 bg-travliaq-deep-blue text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Logo et description */}
            <div className="text-center mb-16">
              <img src={logo} alt="Logo Travliaq" className="h-16 w-auto mx-auto mb-6" />
              <p className="text-xl text-white/80 font-inter max-w-2xl mx-auto">
                {t('footer.tagline')}
              </p>
            </div>

            {/* Grid des sections */}
            <div className="grid md:grid-cols-4 gap-12 mb-16">
              
              {/* Navigation */}
              <div className="text-center md:text-left">
                <h4 className="text-lg font-montserrat font-bold mb-6 text-travliaq-golden-sand">
                  {t('footer.nav')}
                </h4>
                <div className="space-y-4">
                  <a href="/" className="block text-white/90 hover:text-travliaq-turquoise transition-colors">
                    {t('nav.home')}
                  </a>
                  <a href="/questionnaire" className="block text-white/90 hover:text-travliaq-turquoise transition-colors">
                    {t('footer.create')}
                  </a>
                  <a href="/blog" className="block text-white/90 hover:text-travliaq-turquoise transition-colors">
                    {t('nav.blog')}
                  </a>
                </div>
              </div>

              {/* Contact */}
              <div className="text-center md:text-left">
                <h4 className="text-lg font-montserrat font-bold mb-6 text-travliaq-golden-sand">
                  {t('footer.contact')}
                </h4>
                <div className="space-y-4">
                  <a href="mailto:hello@travliaq.com" className="flex items-center gap-2 text-white/90 hover:text-travliaq-turquoise transition-colors justify-center md:justify-start">
                    <Mail className="w-5 h-5" />
                    hello@travliaq.com
                  </a>
                </div>
              </div>

              {/* Légal */}
              <div className="text-center">
                <h4 className="text-lg font-montserrat font-bold mb-6 text-travliaq-golden-sand">
                  {t('footer.legal')}
                </h4>
                <div className="space-y-4">
                  <a href="/cgv" className="block text-white/90 hover:text-travliaq-turquoise transition-colors">
                    {t('footer.terms')}
                  </a>
                  <a href="/mentions-legales" className="block text-white/90 hover:text-travliaq-turquoise transition-colors">
                    {t('footer.imprint')}
                  </a>
                  <a href="/confidentialite" className="block text-white/90 hover:text-travliaq-turquoise transition-colors">
                    {t('footer.privacy')}
                  </a>
                </div>
              </div>

              {/* Réseaux sociaux */}
              <div className="text-center md:text-right">
                <h4 className="text-lg font-montserrat font-bold mb-6 text-travliaq-golden-sand">
                  {t('footer.follow')}
                </h4>
                <div className="flex gap-4 justify-center md:justify-end">
                  <a href="https://instagram.com/travliaq" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-travliaq-turquoise rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a href="https://x.com/travliaq" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-travliaq-turquoise rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a href="https://linkedin.com/company/travliaq" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-travliaq-turquoise rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                  <a href="https://facebook.com/travliaq" target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 hover:bg-travliaq-turquoise rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-travliaq-light-blue pt-8 text-center">
              <p className="text-white/60 font-inter">
                {t('footer.copyright')}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;