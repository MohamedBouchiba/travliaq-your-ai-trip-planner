import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      // Navigation
      "nav.home": "Accueil",
      "nav.blog": "Blog",
      "nav.admin": "Admin",
      "nav.login": "Se connecter",
      "nav.logout": "Déconnexion",
      
      // Hero Section
      "hero.title": "Ton voyage,",
      "hero.title.ai": "optimisé par l'IA",
      "hero.subtitle": "Découvre ton prochain itinéraire personnalisé — vols, hôtels, météo, activités, tout en un seul clic.",
      "hero.subtitle.user": "{{name}}, découvre ton prochain itinéraire personnalisé — vols, hôtels, météo, activités, tout en un seul clic.",
      "hero.cta": "Crée ton itinéraire",
      
      // How it works
      "howItWorks.title": "Comment ça marche ?",
      "howItWorks.description": "Travliaq simplifie ton voyage en 4 étapes :",
      "howItWorks.step1": "Tu indiques tes envies (destination, budget, style).",
      "howItWorks.step2": "Nous comparons en temps réel vols, hébergements et activités (prix, météo, distances).",
      "howItWorks.step3": "Nous créons pour toi un itinéraire jour-par-jour clair, optimisé et respectueux de ton budget.",
      "howItWorks.step4": "Tu reçois une proposition personnalisée avec un prix détaillé et un seul lien pour tout réserver en quelques clics.",
      "howItWorks.tagline": "Moins d'onglets, plus d'aventure.",
      
      // Steps details
      "step1.title": "Vos envies",
      "step1.dest": "Indique ta destination :",
      "step1.dest.desc": "que ce soit Lisbonne, Tokyo ou juste l'aéroport de départ, pour que Travliaq trouve les meilleures options.",
      "step1.dates": "Précise tes dates :",
      "step1.dates.desc": "fixes ou flexibles, pour optimiser prix et météo, et te garantir un timing parfait.",
      "step1.budget": "Partage ton budget et ton style de voyage :",
      "step1.budget.desc": "solo, sac à dos, confort ou premium, on adapte chaque étape à ton rythme et à tes envies.",
      
      "step2.title": "Recherche intelligente",
      "step2.scan": "On scanne les meilleures options :",
      "step2.scan.desc": "vols, hébergements et activités, via des sources fiables et mises à jour en temps réel.",
      "step2.cross": "On croise prix, météo et logistique :",
      "step2.cross.desc": "pour que chaque étape s'enchaîne naturellement, sans perte de temps ni de budget.",
      "step2.filter": "On filtre selon ton profil :",
      "step2.filter.desc": "solo, backpacker, confort ou premium, chaque résultat est ajusté à tes priorités.",
      
      "step3.title": "Itinéraire optimisé",
      "step3.program": "Programme jour par jour :",
      "step3.program.desc": "activités, visites, pauses et repas organisés dans un ordre logique, pour profiter sans te presser.",
      "step3.budget": "Budget maîtrisé :",
      "step3.budget.desc": "chaque étape est chiffrée pour éviter les mauvaises surprises, du vol au café du coin.",
      "step3.tips": "Astuces locales intégrées :",
      "step3.tips.desc": "spots photo, restaurants cachés, transports malins... comme si un ami sur place te guidait.",
      
      "step4.title": "Voyage prêt à réserver",
      "step4.email": "Itinéraire complet envoyé par e-mail :",
      "step4.email.desc": "prêt à être consulté en ligne ou hors connexion.",
      "step4.links": "Liens directs pour réserver :",
      "step4.links.desc": "vols, hébergements, activités, tout est à portée de clic.",
      "step4.modular": "100% modulable :",
      "step4.modular.desc": "tu peux ajuster les dates, changer une activité ou relancer une recherche en un instant.",
      
      // Why Travliaq
      "whyTravliaq.title": "Pourquoi Travliaq ?",
      "whyTravliaq.subtitle": "La révolution du voyage intelligent est arrivée",
      "whyTravliaq.noPlan.title": "Fini la galère de planification",
      "whyTravliaq.noPlan.desc": "Plus de 20 onglets ouverts, plus de comparaisons interminables. L'IA analyse tout pour toi : prix, météo, distances, disponibilités.",
      "whyTravliaq.local.title": "Voyager comme un local",
      "whyTravliaq.local.desc": "Nos recommandations te mènent vers les vrais trésors cachés, loin des pièges à touristes. Authentique, pas artificiel.",
      "whyTravliaq.stat": "d'économies en temps de recherche",
      "whyTravliaq.guarantees": "Nos garanties",
      "whyTravliaq.guarantee1": "Meilleurs prix garantis",
      "whyTravliaq.guarantee2": "Itinéraire en moins de 24h",
      "whyTravliaq.guarantee3": "100% personnalisable",
      "whyTravliaq.guarantee4": "Support 7j/7",
      "whyTravliaq.testimonial": "« J'ai économisé 15 heures de recherche et 300€ sur mon voyage à Tokyo. Travliaq a trouvé des spots que même mes amis japonais ne connaissaient pas ! »",
      "whyTravliaq.testimonial.author": "Sarah, 26 ans — Tokyo & Kyoto, 10 jours",
      
      // CTA
      "cta.start": "Commencer mon voyage",
      "cta.create": "Crée ton itinéraire",
      
      // Toast
      "toast.login": "Connectez-vous avec Google pour sauvegarder vos préférences",
      "toast.loginButton": "Se connecter",
      "toast.loginError": "Erreur de connexion: {{error}}",
    }
  },
  en: {
    translation: {
      // Navigation
      "nav.home": "Home",
      "nav.blog": "Blog",
      "nav.admin": "Admin",
      "nav.login": "Login",
      "nav.logout": "Logout",
      
      // Hero Section
      "hero.title": "Your trip,",
      "hero.title.ai": "AI-optimized",
      "hero.subtitle": "Discover your next personalized itinerary — flights, hotels, weather, activities, all in one click.",
      "hero.subtitle.user": "{{name}}, discover your next personalized itinerary — flights, hotels, weather, activities, all in one click.",
      "hero.cta": "Create your itinerary",
      
      // How it works
      "howItWorks.title": "How does it work?",
      "howItWorks.description": "Travliaq simplifies your trip in 4 steps:",
      "howItWorks.step1": "You tell us your wishes (destination, budget, style).",
      "howItWorks.step2": "We compare flights, accommodations and activities in real time (prices, weather, distances).",
      "howItWorks.step3": "We create a clear, optimized day-by-day itinerary that respects your budget.",
      "howItWorks.step4": "You receive a personalized proposal with detailed pricing and a single link to book everything in a few clicks.",
      "howItWorks.tagline": "Fewer tabs, more adventure.",
      
      // Steps details
      "step1.title": "Your wishes",
      "step1.dest": "Tell us your destination:",
      "step1.dest.desc": "whether it's Lisbon, Tokyo or just your departure airport, so Travliaq can find the best options.",
      "step1.dates": "Specify your dates:",
      "step1.dates.desc": "fixed or flexible, to optimize prices and weather, and guarantee you perfect timing.",
      "step1.budget": "Share your budget and travel style:",
      "step1.budget.desc": "solo, backpacking, comfort or premium, we adapt each step to your pace and wishes.",
      
      "step2.title": "Smart search",
      "step2.scan": "We scan the best options:",
      "step2.scan.desc": "flights, accommodations and activities, from reliable sources updated in real time.",
      "step2.cross": "We cross-reference prices, weather and logistics:",
      "step2.cross.desc": "so each step flows naturally, without wasting time or budget.",
      "step2.filter": "We filter according to your profile:",
      "step2.filter.desc": "solo, backpacker, comfort or premium, each result is adjusted to your priorities.",
      
      "step3.title": "Optimized itinerary",
      "step3.program": "Day-by-day program:",
      "step3.program.desc": "activities, visits, breaks and meals organized in a logical order, to enjoy without rushing.",
      "step3.budget": "Controlled budget:",
      "step3.budget.desc": "each step is priced to avoid bad surprises, from the flight to the corner café.",
      "step3.tips": "Integrated local tips:",
      "step3.tips.desc": "photo spots, hidden restaurants, smart transport... as if a friend on site was guiding you.",
      
      "step4.title": "Trip ready to book",
      "step4.email": "Complete itinerary sent by email:",
      "step4.email.desc": "ready to be consulted online or offline.",
      "step4.links": "Direct booking links:",
      "step4.links.desc": "flights, accommodations, activities, everything is one click away.",
      "step4.modular": "100% customizable:",
      "step4.modular.desc": "you can adjust dates, change an activity or restart a search in an instant.",
      
      // Why Travliaq
      "whyTravliaq.title": "Why Travliaq?",
      "whyTravliaq.subtitle": "The smart travel revolution has arrived",
      "whyTravliaq.noPlan.title": "No more planning hassle",
      "whyTravliaq.noPlan.desc": "No more 20 open tabs, no more endless comparisons. AI analyzes everything for you: prices, weather, distances, availability.",
      "whyTravliaq.local.title": "Travel like a local",
      "whyTravliaq.local.desc": "Our recommendations lead you to real hidden gems, away from tourist traps. Authentic, not artificial.",
      "whyTravliaq.stat": "savings in search time",
      "whyTravliaq.guarantees": "Our guarantees",
      "whyTravliaq.guarantee1": "Best prices guaranteed",
      "whyTravliaq.guarantee2": "Itinerary in less than 24h",
      "whyTravliaq.guarantee3": "100% customizable",
      "whyTravliaq.guarantee4": "24/7 support",
      "whyTravliaq.testimonial": "« I saved 15 hours of research and €300 on my trip to Tokyo. Travliaq found spots that even my Japanese friends didn't know! »",
      "whyTravliaq.testimonial.author": "Sarah, 26 years old — Tokyo & Kyoto, 10 days",
      
      // CTA
      "cta.start": "Start my journey",
      "cta.create": "Create your itinerary",
      
      // Toast
      "toast.login": "Sign in with Google to save your preferences",
      "toast.loginButton": "Sign in",
      "toast.loginError": "Login error: {{error}}",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
