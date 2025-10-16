import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      // Navigation
      "nav.home": "Accueil",
      "nav.blog": "Blog",
      "nav.discover": "Découvrir",
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

      // Hero name suffix
      "hero.subtitle.afterName": ", découvre ton prochain itinéraire personnalisé — vols, hôtels, météo, activités, tout en un seul clic.",

      // Footer
      "footer.ribbon": "Gratuit • Sans engagement • Résultat en 24h",
      "footer.tagline": "L'intelligence artificielle au service de vos voyages exceptionnels",
      "footer.nav": "Navigation",
      "footer.contact": "Contact",
      "footer.legal": "Informations légales",
      "footer.follow": "Suivez-nous",
      "footer.create": "Créer un itinéraire",
      "footer.terms": "Conditions Générales de Vente",
      "footer.imprint": "Mentions légales",
      "footer.privacy": "Politique de confidentialité",
      "footer.copyright": "© 2025 Travliaq. Tous droits réservés. Fait avec ❤️ pour les voyageurs authentiques",
      
      // Questionnaire
      "q.title": "VOTRE VOYAGE SUR MESURE",
      "q.back": "Retour",
      "q.continue": "Continuer",
      "q.send": "Envoyer 🚀",
      "q.sending": "Envoi en cours...",
      
      // Q1: Who's traveling
      "q.step1.title": "Qui voyage ? 👥",
      "q.step1.solo": "Solo",
      "q.step1.duo": "Duo",
      "q.step1.group": "Groupe 3-5",
      "q.step1.family": "Famille (enfants <12)",
      "q.step1b.group.title": "Nombre de voyageurs",
      "q.step1b.family.title": "Nombre de personnes (enfants inclus) 👨‍👩‍👧‍👦",
      
      // Q2: Help needed
      "q.step2.title": "Comment Travliaq peut vous aider ? 🎯",
      "q.step2.desc": "Sélectionnez tous les services nécessaires",
      "q.step2.flights": "Vols",
      "q.step2.accommodation": "Hébergement",
      "q.step2.activities": "Activités & Suggestions",
      
      // Q3: Destination
      "q.step3.title": "Où souhaitez-vous aller ? 🌍",
      "q.step3.desc": "Destination finale de votre voyage",
      "q.step3.yes": "Oui, j'ai une destination en tête",
      "q.step3.no": "Non, je ne sais pas encore",
      "q.step3.search": "Rechercher une destination...",
      "q.step3.popular": "Destinations populaires",
      
      // Q4: Departure location
      "q.step4.title": "D'où partez-vous ? ✈️",
      "q.step4.search": "Rechercher votre ville de départ...",
      "q.step4.detect": "Détecter automatiquement",
      "q.step4.detecting": "Détection en cours...",
      
      // Q5: Climate
      "q.step5.title": "Quel climat préférez-vous ? 🌡️",
      "q.step5.desc": "Sélectionnez tous les climats qui vous plaisent",
      "q.step5.hot": "Chaud (plage, soleil)",
      "q.step5.mild": "Tempéré (doux, agréable)",
      "q.step5.cold": "Froid (montagne, neige)",
      "q.step5.mix": "Mixte (variété)",
      
      // Q6: Travel affinities
      "q.step6.title": "Quelles sont vos affinités de voyage ? 💫",
      "q.step6.desc": "Choisissez 3 maximum",
      "q.step6.culture": "Culture (musées, monuments)",
      "q.step6.nature": "Nature (randonnée, parcs)",
      "q.step6.gastro": "Gastronomie",
      "q.step6.beach": "Plage & Détente",
      "q.step6.nightlife": "Vie nocturne",
      "q.step6.shopping": "Shopping",
      "q.step6.adventure": "Aventure",
      "q.step6.wellbeing": "Bien-être (spa, yoga)",
      
      // Q7: Travel ambiance
      "q.step7.title": "Ambiance de voyage souhaitée 🎨",
      "q.step7.romantic": "Romantique (couple)",
      "q.step7.family": "Famille (enfants)",
      "q.step7.friends": "Entre amis (fête)",
      "q.step7.relax": "Détente absolue",
      "q.step7.cultural": "Culturel (apprentissage)",
      "q.step7.adventure": "Aventure (sport)",
      
      // Q8: Dates
      "q.step8.title": "Quand souhaitez-vous partir ? 📅",
      "q.step8.exact": "J'ai des dates précises",
      "q.step8.approx": "J'ai une période approximative",
      "q.step8.flexible": "Je suis flexible",
      "q.step8.departure": "Date de départ",
      "q.step8.return": "Date de retour",
      "q.step8.approx.title": "Avez-vous une période approximative de départ ?",
      "q.step8.approx.yes": "Oui, j'ai une idée",
      "q.step8.approx.no": "Non, je suis totalement flexible",
      "q.step8.approx.when": "Vers quand souhaiteriez-vous partir ?",
      "q.step8.flex.title": "Quel est votre niveau de flexibilité ? ⏰",
      "q.step8.flex.days": "±3 jours",
      "q.step8.flex.week": "±1 semaine",
      "q.step8.flex.2weeks": "±2 semaines",
      "q.step8.flex.month": "±1 mois",
      
      // Q9: Duration
      "q.step9.title": "Durée du séjour 📆",
      "q.step9.1week": "1 semaine (5-7 jours)",
      "q.step9.2weeks": "2 semaines (10-14 jours)",
      "q.step9.3weeks": "3 semaines (18-21 jours)",
      "q.step9.custom": "Durée personnalisée",
      "q.step9.nights": "Nombre exact de nuits",
      
      // Q10: Budget
      "q.step10.title": "Budget par personne 💰",
      "q.step10.desc": "Estimation approximative",
      "q.step10.low": "Petit budget (< 1000€)",
      "q.step10.mid": "Moyen (1000-3000€)",
      "q.step10.high": "Confortable (3000-5000€)",
      "q.step10.premium": "Premium (> 5000€)",
      "q.step10.exact": "Budget précis",
      "q.step10.custom.title": "Budget exact par personne",
      "q.step10.total": "Budget total",
      "q.step10.perperson": "Budget par personne",
      "q.step10.amount": "Montant",
      "q.step10.currency": "Devise",
      
      // Q11: Travel styles
      "q.step11.title": "Styles de voyage 🎒",
      "q.step11.desc": "Sélectionnez tous ceux qui correspondent",
      "q.step11.backpacker": "Backpacker (auberges, routard)",
      "q.step11.comfort": "Confort (hôtels 3-4⭐)",
      "q.step11.premium": "Premium (hôtels 5⭐, luxe)",
      "q.step11.authentic": "Authentique (local, immersion)",
      "q.step11.classic": "Classique (incontournables)",
      "q.step11.offbeat": "Insolite (hors sentiers battus)",
      
      // Q12: Rhythm
      "q.step12.title": "Rythme du voyage 🕐",
      "q.step12.slow": "Slow travel (prendre son temps)",
      "q.step12.balanced": "Équilibré (mix détente/visites)",
      "q.step12.intense": "Intense (programme chargé)",
      
      // Q13: Flight preference
      "q.step13.title": "Préférence de vol ✈️",
      "q.step13.direct": "Direct uniquement",
      "q.step13.1stop": "1 escale max",
      "q.step13.any": "Peu importe (meilleur prix)",
      
      // Q14: Luggage
      "q.step14.title": "Bagages par voyageur 🧳",
      "q.step14.cabin": "Bagage cabine",
      "q.step14.hold": "Bagage soute",
      "q.step14.both": "Cabine + Soute",
      
      // Q15: Mobility
      "q.step15.title": "Mobilité & Accessibilité ♿",
      "q.step15.desc": "Sélectionnez tout ce qui s'applique",
      "q.step15.none": "Aucune contrainte",
      "q.step15.wheelchair": "Fauteuil roulant",
      "q.step15.walking": "Difficulté à marcher longtemps",
      "q.step15.elevator": "Besoin ascenseur",
      "q.step15.stairs": "Éviter les escaliers",
      
      // Q16: Accommodation type
      "q.step16.title": "Type d'hébergement 🏨",
      "q.step16.desc": "Choisissez tous ceux qui vous conviennent",
      "q.step16.hotel": "Hôtel",
      "q.step16.airbnb": "Airbnb/Location",
      "q.step16.hostel": "Auberge de jeunesse",
      "q.step16.resort": "Resort/All-inclusive",
      "q.step16.boutique": "Hôtel boutique",
      "q.step16b.title": "Préférences pour l'hôtel 🏨",
      "q.step16b.desc": "Sélectionnez ce qui vous intéresse",
      "q.step16b.breakfast": "Petit-déjeuner inclus",
      "q.step16b.halfboard": "Demi-pension",
      "q.step16b.fullboard": "Pension complète",
      "q.step16b.allinc": "All-inclusive",
      "q.step16b.room": "Room service",
      
      // Q17: Comfort
      "q.step17.title": "Niveau de confort attendu 🛏️",
      "q.step17.simple": "Simple (propreté de base)",
      "q.step17.standard": "Standard (confortable)",
      "q.step17.superior": "Supérieur (très confortable)",
      "q.step17.luxury": "Luxe (5 étoiles)",
      
      // Q18: Neighborhood
      "q.step18.title": "Emplacement de l'hébergement 📍",
      "q.step18.center": "Centre-ville (accès facile)",
      "q.step18.quiet": "Quartier calme (éloigné)",
      "q.step18.transport": "Près des transports",
      "q.step18.attractions": "Près des attractions",
      
      // Q19: Amenities
      "q.step19.title": "Équipements souhaités 🏊",
      "q.step19.desc": "Sélectionnez tous ceux importants pour vous",
      "q.step19.wifi": "Wi-Fi",
      "q.step19.pool": "Piscine",
      "q.step19.gym": "Salle de sport",
      "q.step19.spa": "Spa",
      "q.step19.restaurant": "Restaurant sur place",
      "q.step19.parking": "Parking",
      "q.step19.ac": "Climatisation",
      "q.step19.kitchen": "Cuisine équipée",
      
      // Q20: Constraints
      "q.step20.title": "Contraintes & préférences 🎯",
      "q.step20.desc": "Sélectionnez toutes les options importantes",
      "q.step20.halal": "Halal",
      "q.step20.kosher": "Casher",
      "q.step20.vege": "Végétarien",
      "q.step20.vegan": "Vegan",
      "q.step20.gluten": "Sans gluten",
      "q.step20.allergies": "Allergies alimentaires",
      "q.step20.none": "Aucune contrainte",
      
      // Q21: Additional info
      "q.step21.title": "Informations complémentaires 📝",
      "q.step21.desc": "Précisez vos attentes, contraintes ou préférences particulières (optionnel)",
      "q.step21.placeholder": "Ex: anniversaire, allergies alimentaires, accessibilité spécifique...",
      
      // Q22: Open comments
      "q.step22.title": "Zone libre 💭",
      "q.step22.desc": "Ajoutez tout commentaire, question ou information utile (optionnel)",
      "q.step22.placeholder": "Partagez vos envies, inspirations, contraintes particulières...",
      
      // Q23: Email
      "q.step23.title": "Dernière étape ! 📧",
      "q.step23.desc": "Où devons-nous envoyer votre itinéraire personnalisé ?",
      "q.step23.email": "Votre email",
      "q.step23.name": "Votre nom (optionnel)",
      
      // Errors & Success
      "q.error.quota": "Quota atteint 🚫",
      "q.error.quota.desc": "Vous avez atteint votre quota de 2 questionnaires par jour. Revenez demain pour planifier un autre voyage !",
      "q.error.auth": "Connexion requise 🔒",
      "q.error.auth.desc": "Vous devez être connecté pour soumettre un questionnaire.",
      "q.error.validation": "Erreur de validation",
      "q.error.validation.desc": "Certains champs contiennent des données invalides.",
      "q.error.generic": "Erreur",
      "q.error.generic.desc": "Une erreur est survenue lors de l'envoi du questionnaire. Veuillez réessayer.",
      "q.success": "Questionnaire envoyé ! 🎉",
      "q.success.desc": "Nous vous enverrons votre itinéraire personnalisé sous 48h.",
      
      // Questionnaire - Additional keys
      "questionnaire.connectionRequired": "Connexion requise 🔒",
      "questionnaire.mustBeConnected": "Vous devez être connecté pour soumettre un questionnaire.",
      "questionnaire.submittedTitle": "Questionnaire envoyé ! 🎉",
      "questionnaire.submittedDescription": "Nous vous enverrons votre itinéraire personnalisé sous 48h.",
      "questionnaire.quotaReached": "Quota atteint 🚫",
      "questionnaire.quotaExceeded": "Vous avez atteint votre quota de 2 questionnaires par jour. Revenez demain pour planifier un autre voyage !",
      "questionnaire.validationError": "Erreur de validation",
      "questionnaire.invalidData": "Certains champs contiennent des données invalides.",
      "questionnaire.error": "Erreur",
      "questionnaire.submissionError": "Une erreur est survenue lors de l'envoi du questionnaire. Veuillez réessayer.",
      "questionnaire.whoTraveling": "Qui voyage ? 👥",
      "questionnaire.numberOfPeople": "Nombre de personnes (enfants inclus) 👨‍👩‍👧‍👦",
      "questionnaire.continue": "Continuer",
      "questionnaire.howManyPeople": "Combien de personnes exactement ? 👥",
      "questionnaire.destinationInMind": "Tu as déjà une destination en tête ? 🌍",
      "questionnaire.howCanHelp": "Comment Travliaq peut vous aider ? 🎯",
      "questionnaire.multipleSelectionPossible": "Sélection multiple possible",
      "questionnaire.solo": "Solo",
      "questionnaire.duo": "Duo",
      "questionnaire.group35": "Groupe 3-5",
      "questionnaire.family": "Famille (enfants <12)",
      "questionnaire.3people": "3 personnes",
      "questionnaire.4people": "4 personnes",
      "questionnaire.5people": "5 personnes",
      "questionnaire.yes": "Oui",
      "questionnaire.no": "Non",
      "questionnaire.flights": "Vols",
      "questionnaire.accommodation": "Hébergement",
      "questionnaire.activities": "Activités",
      "questionnaire.destinationDetails": "Renseigne les détails de ta destination 🌍",
      "questionnaire.whereFrom": "D'où pars-tu ? 📍",
      "questionnaire.cityTooltip": "Vous pouvez saisir n'importe quelle ville, même si elle n'apparaît pas dans la liste. L'IA comprendra votre point de départ si vous l'orthographiez correctement.",
      "questionnaire.detecting": "Détection...",
      "questionnaire.myPosition": "Ma position",
      "questionnaire.departureCity": "Ville de départ",
      "questionnaire.whereGoing": "Où vas-tu ? 🌍",
      "questionnaire.destinationCity": "Ville de destination...",
      "questionnaire.climatePreference": "Quel type de climat recherches-tu ? 🌡️",
      "questionnaire.customTrip": "VOTRE VOYAGE SUR MESURE",
      "questionnaire.back": "Retour",
      
      // Climate options
      "questionnaire.climate.hotSunny": "Chaud & ensoleillé",
      "questionnaire.climate.hotSunny.desc": "25-35°C",
      "questionnaire.climate.mildSweet": "Tempéré & doux",
      "questionnaire.climate.mildSweet.desc": "15-25°C",
      "questionnaire.climate.coldSnowy": "Froid & neigeux",
      "questionnaire.climate.coldSnowy.desc": "<10°C",
      "questionnaire.climate.tropicalHumid": "Tropical & humide",
      "questionnaire.climate.tropicalHumid.desc": "Plages & jungle",
      "questionnaire.climate.mountainAltitude": "Montagne & altitude",
      "questionnaire.climate.mountainAltitude.desc": "Air pur",
      "questionnaire.climate.dontMind": "Peu importe",
      "questionnaire.climate.dontMind.desc": "Je suis flexible",
      
      // Travel affinities
      "questionnaire.affinities.title": "Qu'est-ce qui t'attire le plus ? 🎯",
      "questionnaire.affinities.selectUpTo5": "Sélectionnez jusqu'à 5 affinités",
      "questionnaire.affinities.paradiseBeaches": "Plages paradisiaques",
      "questionnaire.affinities.historicCities": "Villes historiques",
      "questionnaire.affinities.natureHiking": "Nature & randonnées",
      "questionnaire.affinities.skiWinterSports": "Ski & sports d'hiver",
      "questionnaire.affinities.safariAnimals": "Safari & animaux",
      "questionnaire.affinities.localGastronomy": "Gastronomie locale",
      "questionnaire.affinities.shoppingFashion": "Shopping & mode",
      "questionnaire.affinities.festivalsEvents": "Festivals & événements",
      "questionnaire.affinities.modernArchitecture": "Architecture moderne",
      "questionnaire.affinities.templesSpirituality": "Temples & spiritualité",
      "questionnaire.affinities.amusementParks": "Parcs d'attractions",
      "questionnaire.affinities.divingSnorkeling": "Plongée & snorkeling",
      "questionnaire.affinities.roadTripFreedom": "Road trip & liberté",
      "questionnaire.affinities.vineyardsWine": "Vignobles & œnotourisme",
      "questionnaire.affinities.desertsLunar": "Déserts & paysages lunaires",
      "questionnaire.affinities.islandsArchipelagos": "Îles & archipels",
      
      // Travel ambiance
      "questionnaire.ambiance.title": "Quelle ambiance recherches-tu ? 🎨",
      "questionnaire.ambiance.adventureExotic": "Aventure & dépaysement",
      "questionnaire.ambiance.adventureExotic.desc": "Sortir de ma zone de confort",
      "questionnaire.ambiance.relaxation": "Détente & relaxation",
      "questionnaire.ambiance.relaxation.desc": "Me ressourcer totalement",
      "questionnaire.ambiance.romanceIntimacy": "Romance & intimité",
      "questionnaire.ambiance.romanceIntimacy.desc": "Moments à deux",
      "questionnaire.ambiance.culturalDiscovery": "Découverte culturelle",
      "questionnaire.ambiance.culturalDiscovery.desc": "Apprendre et m'enrichir",
      "questionnaire.ambiance.partyNightlife": "Fête & vie nocturne",
      "questionnaire.ambiance.partyNightlife.desc": "Faire la fête",
      "questionnaire.ambiance.familyConviviality": "Famille & convivialité",
      "questionnaire.ambiance.familyConviviality.desc": "Moments en famille",
      
      // Dates
      "questionnaire.dates.title": "Dates de voyage 📅",
      "questionnaire.dates.fixed": "Dates fixes",
      "questionnaire.dates.flexible": "Je suis flexible",
      "questionnaire.dates.selectDates": "Sélectionnez vos dates de voyage 🗓️",
      "questionnaire.dates.selectRange": "Cliquez et faites glisser pour sélectionner une plage de dates",
      "questionnaire.dates.selected": "Dates sélectionnées :",
      "questionnaire.dates.departure": "Départ :",
      "questionnaire.dates.return": "Retour :",
      "questionnaire.dates.nights": "nuits",
      "questionnaire.dates.reset": "Réinitialiser les dates",
      
      // Flexibility
      "questionnaire.flexibility.title": "Flexibilité des dates ⏰",
      "questionnaire.flexibility.3days": "±3 jours",
      "questionnaire.flexibility.week": "±1 semaine",
      "questionnaire.flexibility.2weeks": "±2 semaines",
      "questionnaire.flexibility.month": "±1 mois",
      "questionnaire.flexibility.hasApproxDate": "As-tu une date de départ approximative ? 📆",
      "questionnaire.flexibility.approxDate": "Quelle est votre date de départ approximative ? 📆",
      "questionnaire.flexibility.clickDate": "Cliquez sur une date (cette date servira de référence pour votre flexibilité)",
      "questionnaire.flexibility.dateSelected": "Date sélectionnée :",
      
      // Duration
      "questionnaire.duration.title": "Durée du séjour 🌙",
      "questionnaire.duration.2nights": "2 nuits",
      "questionnaire.duration.3nights": "3 nuits",
      "questionnaire.duration.4nights": "4 nuits",
      "questionnaire.duration.5nights": "5 nuits",
      "questionnaire.duration.6nights": "6 nuits",
      "questionnaire.duration.7nights": "7 nuits",
      "questionnaire.duration.8to10": "8-10 nuits",
      "questionnaire.duration.11to14": "11-14 nuits",
      "questionnaire.duration.more14": ">14 nuits",
      "questionnaire.duration.exactNights": "Combien de nuits exactement ? 🌉",
      
      // Budget
      "questionnaire.budget.title": "Budget par personne 💰",
      "questionnaire.budget.excluding": "Hors achats personnels",
      "questionnaire.budget.less300": "<300€",
      "questionnaire.budget.300to600": "300-600€",
      "questionnaire.budget.600to900": "600-900€",
      "questionnaire.budget.900to1200": "900-1 200€",
      "questionnaire.budget.1200to1800": "1 200-1 800€",
      "questionnaire.budget.more1800": ">1 800€",
      "questionnaire.budget.dontKnow": "Je ne sais pas",
      "questionnaire.budget.precise": "Budget précis",
      "questionnaire.budget.totalBudget": "Quel est votre budget total ? 💵",
      "questionnaire.budget.entireTrip": "Pour l'ensemble du voyage",
      "questionnaire.budget.amount": "Montant",
      "questionnaire.budget.currency": "Devise",
      
      // Travel styles
      "questionnaire.styles.title": "Style de voyage 🎨",
      "questionnaire.styles.selectUpTo5": "Sélectionnez jusqu'à 5 styles",
      "questionnaire.styles.nature": "Nature",
      "questionnaire.styles.cultureMuseums": "Culture & musées",
      "questionnaire.styles.food": "Food",
      "questionnaire.styles.beach": "Plage",
      "questionnaire.styles.mountainHiking": "Montagne & rando",
      "questionnaire.styles.photoSpots": "Photo spots",
      "questionnaire.styles.localMarkets": "Vie locale & marchés",
      "questionnaire.styles.sportOutdoor": "Sport & outdoor",
      "questionnaire.styles.wellnessSpa": "Bien-être & spa",
      "questionnaire.styles.nightlife": "Vie nocturne",
      
      // Rhythm
      "questionnaire.rhythm.title": "Rythme souhaité ⏱️",
      "questionnaire.rhythm.cool": "Cool",
      "questionnaire.rhythm.cool.desc": "1-2 activités/jour",
      "questionnaire.rhythm.balanced": "Équilibré",
      "questionnaire.rhythm.balanced.desc": "2-3 activités/jour",
      "questionnaire.rhythm.intense": "Intense",
      "questionnaire.rhythm.intense.desc": "3+ activités/jour",
      
      // Flights
      "questionnaire.flights.title": "Vols – préférence ✈️",
      "questionnaire.flights.directOnly": "Direct uniquement",
      "questionnaire.flights.max1Stop": "Max 1 escale",
      "questionnaire.flights.dontMind": "Peu importe",
      
      // Luggage
      "questionnaire.luggage.title": "Bagages par voyageur 🧳",
      "questionnaire.luggage.travelers": "voyageur",
      "questionnaire.luggage.travelers_plural": "voyageurs",
      "questionnaire.luggage.traveler": "Voyageur",
      "questionnaire.luggage.personalItem": "Objet personnel uniquement",
      "questionnaire.luggage.cabin": "Bagage cabine",
      "questionnaire.luggage.hold": "Bagage soute",
      "questionnaire.luggage.cabinHold": "Cabine + Soute",
      
      // Mobility
      "questionnaire.mobility.title": "Mobilité 🚶",
      "questionnaire.mobility.selectMultiple": "Sélection multiple possible",
      "questionnaire.mobility.publicTransport": "Transports en commun",
      "questionnaire.mobility.rentalCar": "Voiture de location",
      "questionnaire.mobility.taxi": "Taxi/VTC",
      "questionnaire.mobility.bike": "Vélo",
      "questionnaire.mobility.walking": "À pied",
      "questionnaire.mobility.atypical": "Transport atypique",
      "questionnaire.mobility.atypical.desc": "Tuk-tuk, scooter, etc.",
      "questionnaire.mobility.ferry": "Bateau/ferry",
      "questionnaire.mobility.incompleteSelection": "Sélection incomplète",
      "questionnaire.mobility.selectOtherTransport": "Veuillez sélectionner au moins un autre mode de transport en plus du transport atypique ou bateau/ferry.",
      
      // Accommodation type
      "questionnaire.accommodationType.title": "Type d'hébergement 🏨",
      "questionnaire.accommodationType.select1or2": "Sélectionnez 1 ou 2 types",
      "questionnaire.accommodationType.hotel": "Hôtel",
      "questionnaire.accommodationType.apartment": "Appartement",
      "questionnaire.accommodationType.hostel": "Auberge",
      "questionnaire.accommodationType.guesthouse": "Maison d'hôtes/riad",
      "questionnaire.accommodationType.lodge": "Lodge/eco-stay",
      "questionnaire.accommodationType.camping": "Camping/glamping",
      "questionnaire.accommodationType.bedBreakfast": "Chambre d'hôtes",
      "questionnaire.accommodationType.resort": "Resort",
      "questionnaire.accommodationType.dontMind": "Peu importe",
      
      // Hotel preferences
      "questionnaire.hotelPreferences.title": "Préférences pour l'hôtel 🏨",
      "questionnaire.hotelPreferences.selectInterested": "Sélectionnez ce qui vous intéresse",
      "questionnaire.hotelPreferences.breakfast": "Petit-déjeuner inclus",
      "questionnaire.hotelPreferences.halfBoard": "Demi-pension",
      "questionnaire.hotelPreferences.fullBoard": "Pension complète",
      "questionnaire.hotelPreferences.allInclusive": "All-inclusive",
      "questionnaire.hotelPreferences.roomService": "Room service",
      "questionnaire.hotelPreferences.minibar": "Minibar",
      "questionnaire.hotelPreferences.view": "Vue mer/montagne",
      "questionnaire.hotelPreferences.balcony": "Balcon/terrasse",
      
      // Comfort
      "questionnaire.comfort.title": "Confort minimum ⭐",
      "questionnaire.comfort.rating75": "Note ≥7.5",
      "questionnaire.comfort.rating80": "Note ≥8.0",
      "questionnaire.comfort.rating85": "Note ≥8.5",
      "questionnaire.comfort.dontMind": "Peu importe",
      
      // Neighborhood
      "questionnaire.neighborhood.title": "Quartier recherché 🗺️",
      "questionnaire.neighborhood.quiet": "Calme",
      "questionnaire.neighborhood.centralLively": "Central & animé",
      "questionnaire.neighborhood.nearNatureBeach": "Proche nature/plage",
      "questionnaire.neighborhood.atypicalCharm": "Atypique/charme local",
      
      // Amenities
      "questionnaire.amenities.title": "Équipements souhaités 🛠️",
      "questionnaire.amenities.selectAll": "Sélectionnez tous ceux qui vous importent",
      "questionnaire.amenities.reliableWifi": "Wi-Fi fiable",
      "questionnaire.amenities.airConditioning": "Climatisation",
      "questionnaire.amenities.kitchen": "Cuisine",
      "questionnaire.amenities.washingMachine": "Machine à laver",
      "questionnaire.amenities.parking": "Parking",
      "questionnaire.amenities.elevator": "Ascenseur",
      "questionnaire.amenities.reception24": "Réception 24/7",
      "questionnaire.amenities.nearWorship": "Proximité lieu de culte",
      "questionnaire.amenities.babyCrib": "Lit bébé",
      "questionnaire.amenities.familyRoom": "Chambre famille",
      "questionnaire.amenities.pool": "Piscine",
      "questionnaire.amenities.gym": "Salle de sport",
      "questionnaire.amenities.spa": "Spa/jacuzzi",
      "questionnaire.amenities.gardenTerrace": "Jardin/terrasse",
      
      // Constraints
      "questionnaire.constraints.title": "Contraintes & préférences 🎯",
      "questionnaire.constraints.selectAllImportant": "Sélectionnez toutes les options importantes",
      "questionnaire.constraints.halal": "Halal",
      "questionnaire.constraints.kosher": "Casher",
      "questionnaire.constraints.vegetarian": "Végétarien",
      "questionnaire.constraints.vegan": "Vegan",
      "questionnaire.constraints.glutenFree": "Sans gluten",
      "questionnaire.constraints.noPork": "Sans porc",
      "questionnaire.constraints.noAlcohol": "Sans alcool",
      "questionnaire.constraints.prayerPlaces": "Lieux de prière",
      "questionnaire.constraints.buddhistTraditions": "Respect traditions bouddhistes",
      "questionnaire.constraints.accessibility": "Accessibilité PMR",
      "questionnaire.constraints.safezones": "Zones sûres",
      "questionnaire.constraints.avoidCar": "Éviter voiture",
      "questionnaire.constraints.localTraditions": "Respect traditions locales",
      "questionnaire.constraints.foodAllergies": "Allergies alimentaires",
      "questionnaire.constraints.dontMind": "Peu importe",
      
      // Additional info
      "questionnaire.additionalInfo.title": "Informations complémentaires 💭",
      "questionnaire.additionalInfo.optional": "Zone libre (optionnel)",
      "questionnaire.additionalInfo.placeholder": "Partage tes envies, inspirations, contraintes particulières...",
      "questionnaire.additionalInfo.skip": "Passer",
      
      // Email step
      "questionnaire.email.title": "Recevoir mon itinéraire 📧",
      "questionnaire.email.description": "Nous vous enverrons votre itinéraire personnalisé sous 48h",
      "questionnaire.email.placeholder": "votre@email.com",
      "questionnaire.email.send": "Envoyer 🚀",
      "questionnaire.email.sending": "Envoi en cours..."
    }
  },
  en: {
    translation: {
      // Navigation
      "nav.home": "Home",
      "nav.blog": "Blog",
      "nav.discover": "Discover",
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

      // Hero name suffix
      "hero.subtitle.afterName": ", discover your next personalized itinerary — flights, hotels, weather, activities, all in one click.",

      // Footer
      "footer.ribbon": "Free • No commitment • Result in 24h",
      "footer.tagline": "Artificial intelligence at the service of your exceptional travels",
      "footer.nav": "Navigation",
      "footer.contact": "Contact",
      "footer.legal": "Legal information",
      "footer.follow": "Follow us",
      "footer.create": "Create an itinerary",
      "footer.terms": "Terms and Conditions",
      "footer.imprint": "Legal Notice",
      "footer.privacy": "Privacy Policy",
      "footer.copyright": "© 2025 Travliaq. All rights reserved. Made with ❤️ for authentic travelers",
      
      // Questionnaire
      "q.title": "YOUR CUSTOM TRIP",
      "q.back": "Back",
      "q.continue": "Continue",
      "q.send": "Send 🚀",
      "q.sending": "Sending...",
      
      // Q1: Who's traveling
      "q.step1.title": "Who's traveling? 👥",
      "q.step1.solo": "Solo",
      "q.step1.duo": "Duo",
      "q.step1.group": "Group 3-5",
      "q.step1.family": "Family (children <12)",
      "q.step1b.group.title": "Number of travelers",
      "q.step1b.family.title": "Number of people (children included) 👨‍👩‍👧‍👦",
      
      // Q2: Help needed
      "q.step2.title": "How can Travliaq help you? 🎯",
      "q.step2.desc": "Select all services needed",
      "q.step2.flights": "Flights",
      "q.step2.accommodation": "Accommodation",
      "q.step2.activities": "Activities & Suggestions",
      
      // Q3: Destination
      "q.step3.title": "Where do you want to go? 🌍",
      "q.step3.desc": "Final destination of your trip",
      "q.step3.yes": "Yes, I have a destination in mind",
      "q.step3.no": "No, I don't know yet",
      "q.step3.search": "Search for a destination...",
      "q.step3.popular": "Popular destinations",
      
      // Q4: Departure location
      "q.step4.title": "Where are you departing from? ✈️",
      "q.step4.search": "Search your departure city...",
      "q.step4.detect": "Auto-detect",
      "q.step4.detecting": "Detecting...",
      
      // Q5: Climate
      "q.step5.title": "What climate do you prefer? 🌡️",
      "q.step5.desc": "Select all climates you like",
      "q.step5.hot": "Hot (beach, sun)",
      "q.step5.mild": "Mild (gentle, pleasant)",
      "q.step5.cold": "Cold (mountains, snow)",
      "q.step5.mix": "Mixed (variety)",
      
      // Q6: Travel affinities
      "q.step6.title": "What are your travel interests? 💫",
      "q.step6.desc": "Choose maximum 3",
      "q.step6.culture": "Culture (museums, monuments)",
      "q.step6.nature": "Nature (hiking, parks)",
      "q.step6.gastro": "Gastronomy",
      "q.step6.beach": "Beach & Relaxation",
      "q.step6.nightlife": "Nightlife",
      "q.step6.shopping": "Shopping",
      "q.step6.adventure": "Adventure",
      "q.step6.wellbeing": "Wellness (spa, yoga)",
      
      // Q7: Travel ambiance
      "q.step7.title": "Desired travel atmosphere 🎨",
      "q.step7.romantic": "Romantic (couple)",
      "q.step7.family": "Family (with children)",
      "q.step7.friends": "With friends (party)",
      "q.step7.relax": "Total relaxation",
      "q.step7.cultural": "Cultural (learning)",
      "q.step7.adventure": "Adventure (sports)",
      
      // Q8: Dates
      "q.step8.title": "When do you want to travel? 📅",
      "q.step8.exact": "I have specific dates",
      "q.step8.approx": "I have an approximate period",
      "q.step8.flexible": "I'm flexible",
      "q.step8.departure": "Departure date",
      "q.step8.return": "Return date",
      "q.step8.approx.title": "Do you have an approximate departure period?",
      "q.step8.approx.yes": "Yes, I have an idea",
      "q.step8.approx.no": "No, I'm totally flexible",
      "q.step8.approx.when": "When would you like to leave?",
      "q.step8.flex.title": "What is your flexibility level? ⏰",
      "q.step8.flex.days": "±3 days",
      "q.step8.flex.week": "±1 week",
      "q.step8.flex.2weeks": "±2 weeks",
      "q.step8.flex.month": "±1 month",
      
      // Q9: Duration
      "q.step9.title": "Trip duration 📆",
      "q.step9.1week": "1 week (5-7 days)",
      "q.step9.2weeks": "2 weeks (10-14 days)",
      "q.step9.3weeks": "3 weeks (18-21 days)",
      "q.step9.custom": "Custom duration",
      "q.step9.nights": "Exact number of nights",
      
      // Q10: Budget
      "q.step10.title": "Budget per person 💰",
      "q.step10.desc": "Rough estimate",
      "q.step10.low": "Low budget (< €1000)",
      "q.step10.mid": "Medium (€1000-3000)",
      "q.step10.high": "Comfortable (€3000-5000)",
      "q.step10.premium": "Premium (> €5000)",
      "q.step10.exact": "Precise budget",
      "q.step10.custom.title": "Exact budget per person",
      "q.step10.total": "Total budget",
      "q.step10.perperson": "Budget per person",
      "q.step10.amount": "Amount",
      "q.step10.currency": "Currency",
      
      // Q11: Travel styles
      "q.step11.title": "Travel styles 🎒",
      "q.step11.desc": "Select all that apply",
      "q.step11.backpacker": "Backpacker (hostels, budget)",
      "q.step11.comfort": "Comfort (3-4⭐ hotels)",
      "q.step11.premium": "Premium (5⭐ hotels, luxury)",
      "q.step11.authentic": "Authentic (local, immersion)",
      "q.step11.classic": "Classic (must-sees)",
      "q.step11.offbeat": "Off the beaten path",
      
      // Q12: Rhythm
      "q.step12.title": "Trip pace 🕐",
      "q.step12.slow": "Slow travel (take your time)",
      "q.step12.balanced": "Balanced (mix relaxation/visits)",
      "q.step12.intense": "Intense (packed schedule)",
      
      // Q13: Flight preference
      "q.step13.title": "Flight preference ✈️",
      "q.step13.direct": "Direct only",
      "q.step13.1stop": "Max 1 layover",
      "q.step13.any": "Doesn't matter (best price)",
      
      // Q14: Luggage
      "q.step14.title": "Luggage per traveler 🧳",
      "q.step14.cabin": "Cabin luggage",
      "q.step14.hold": "Checked luggage",
      "q.step14.both": "Cabin + Checked",
      
      // Q15: Mobility
      "q.step15.title": "Mobility & Accessibility ♿",
      "q.step15.desc": "Select all that apply",
      "q.step15.none": "No constraints",
      "q.step15.wheelchair": "Wheelchair",
      "q.step15.walking": "Difficulty walking long distances",
      "q.step15.elevator": "Need elevator",
      "q.step15.stairs": "Avoid stairs",
      
      // Q16: Accommodation type
      "q.step16.title": "Accommodation type 🏨",
      "q.step16.desc": "Choose all that suit you",
      "q.step16.hotel": "Hotel",
      "q.step16.airbnb": "Airbnb/Rental",
      "q.step16.hostel": "Hostel",
      "q.step16.resort": "Resort/All-inclusive",
      "q.step16.boutique": "Boutique hotel",
      "q.step16b.title": "Hotel preferences 🏨",
      "q.step16b.desc": "Select what interests you",
      "q.step16b.breakfast": "Breakfast included",
      "q.step16b.halfboard": "Half-board",
      "q.step16b.fullboard": "Full-board",
      "q.step16b.allinc": "All-inclusive",
      "q.step16b.room": "Room service",
      
      // Q17: Comfort
      "q.step17.title": "Expected comfort level 🛏️",
      "q.step17.simple": "Simple (basic cleanliness)",
      "q.step17.standard": "Standard (comfortable)",
      "q.step17.superior": "Superior (very comfortable)",
      "q.step17.luxury": "Luxury (5 stars)",
      
      // Q18: Neighborhood
      "q.step18.title": "Accommodation location 📍",
      "q.step18.center": "City center (easy access)",
      "q.step18.quiet": "Quiet area (remote)",
      "q.step18.transport": "Near transport",
      "q.step18.attractions": "Near attractions",
      
      // Q19: Amenities
      "q.step19.title": "Desired amenities 🏊",
      "q.step19.desc": "Select all important to you",
      "q.step19.wifi": "Wi-Fi",
      "q.step19.pool": "Pool",
      "q.step19.gym": "Gym",
      "q.step19.spa": "Spa",
      "q.step19.restaurant": "On-site restaurant",
      "q.step19.parking": "Parking",
      "q.step19.ac": "Air conditioning",
      "q.step19.kitchen": "Equipped kitchen",
      
      // Q20: Constraints
      "q.step20.title": "Constraints & preferences 🎯",
      "q.step20.desc": "Select all important options",
      "q.step20.halal": "Halal",
      "q.step20.kosher": "Kosher",
      "q.step20.vege": "Vegetarian",
      "q.step20.vegan": "Vegan",
      "q.step20.gluten": "Gluten-free",
      "q.step20.allergies": "Food allergies",
      "q.step20.none": "No constraints",
      
      // Q21: Additional info
      "q.step21.title": "Additional information 📝",
      "q.step21.desc": "Specify your expectations, constraints or special preferences (optional)",
      "q.step21.placeholder": "E.g.: birthday, food allergies, specific accessibility...",
      
      // Q22: Open comments
      "q.step22.title": "Free text 💭",
      "q.step22.desc": "Add any comments, questions or useful information (optional)",
      "q.step22.placeholder": "Share your desires, inspirations, special constraints...",
      
      // Q23: Email
      "q.step23.title": "Last step! 📧",
      "q.step23.desc": "Where should we send your personalized itinerary?",
      "q.step23.email": "Your email",
      "q.step23.name": "Your name (optional)",
      
      // Errors & Success
      "q.error.quota": "Quota reached 🚫",
      "q.error.quota.desc": "You have reached your quota of 2 questionnaires per day. Come back tomorrow to plan another trip!",
      "q.error.auth": "Login required 🔒",
      "q.error.auth.desc": "You must be logged in to submit a questionnaire.",
      "q.error.validation": "Validation error",
      "q.error.validation.desc": "Some fields contain invalid data.",
      "q.error.generic": "Error",
      "q.error.generic.desc": "An error occurred while submitting the questionnaire. Please try again.",
      "q.success": "Questionnaire submitted! 🎉",
      "q.success.desc": "We'll send you your personalized itinerary within 48 hours.",
      
      // Questionnaire - Additional keys
      "questionnaire.connectionRequired": "Connection required 🔒",
      "questionnaire.mustBeConnected": "You must be logged in to submit a questionnaire.",
      "questionnaire.submittedTitle": "Questionnaire submitted! 🎉",
      "questionnaire.submittedDescription": "We will send you your personalized itinerary within 48h.",
      "questionnaire.quotaReached": "Quota reached 🚫",
      "questionnaire.quotaExceeded": "You have reached your quota of 2 questionnaires per day. Come back tomorrow to plan another trip!",
      "questionnaire.validationError": "Validation error",
      "questionnaire.invalidData": "Some fields contain invalid data.",
      "questionnaire.error": "Error",
      "questionnaire.submissionError": "An error occurred while submitting the questionnaire. Please try again.",
      "questionnaire.whoTraveling": "Who's traveling? 👥",
      "questionnaire.numberOfPeople": "Number of people (including children) 👨‍👩‍👧‍👦",
      "questionnaire.continue": "Continue",
      "questionnaire.howManyPeople": "How many people exactly? 👥",
      "questionnaire.destinationInMind": "Do you already have a destination in mind? 🌍",
      "questionnaire.howCanHelp": "How can Travliaq help you? 🎯",
      "questionnaire.multipleSelectionPossible": "Multiple selection possible",
      "questionnaire.solo": "Solo",
      "questionnaire.duo": "Duo",
      "questionnaire.group35": "Group 3-5",
      "questionnaire.family": "Family (children <12)",
      "questionnaire.3people": "3 people",
      "questionnaire.4people": "4 people",
      "questionnaire.5people": "5 people",
      "questionnaire.yes": "Yes",
      "questionnaire.no": "No",
      "questionnaire.flights": "Flights",
      "questionnaire.accommodation": "Accommodation",
      "questionnaire.activities": "Activities",
      "questionnaire.destinationDetails": "Enter your destination details 🌍",
      "questionnaire.whereFrom": "Where are you leaving from? 📍",
      "questionnaire.cityTooltip": "You can enter any city, even if it doesn't appear in the list. The AI will understand your starting point if you spell it correctly.",
      "questionnaire.detecting": "Detecting...",
      "questionnaire.myPosition": "My position",
      "questionnaire.departureCity": "Departure city",
      "questionnaire.whereGoing": "Where are you going? 🌍",
      "questionnaire.destinationCity": "Destination city...",
      "questionnaire.climatePreference": "What type of climate are you looking for? 🌡️",
      "questionnaire.customTrip": "YOUR CUSTOM TRIP",
      "questionnaire.back": "Back",
      
      // Climate options
      "questionnaire.climate.hotSunny": "Hot & sunny",
      "questionnaire.climate.hotSunny.desc": "25-35°C",
      "questionnaire.climate.mildSweet": "Mild & sweet",
      "questionnaire.climate.mildSweet.desc": "15-25°C",
      "questionnaire.climate.coldSnowy": "Cold & snowy",
      "questionnaire.climate.coldSnowy.desc": "<10°C",
      "questionnaire.climate.tropicalHumid": "Tropical & humid",
      "questionnaire.climate.tropicalHumid.desc": "Beaches & jungle",
      "questionnaire.climate.mountainAltitude": "Mountain & altitude",
      "questionnaire.climate.mountainAltitude.desc": "Fresh air",
      "questionnaire.climate.dontMind": "Don't mind",
      "questionnaire.climate.dontMind.desc": "I'm flexible",
      
      // Travel affinities
      "questionnaire.affinities.title": "What attracts you most? 🎯",
      "questionnaire.affinities.selectUpTo5": "Select up to 5 affinities",
      "questionnaire.affinities.paradiseBeaches": "Paradise beaches",
      "questionnaire.affinities.historicCities": "Historic cities",
      "questionnaire.affinities.natureHiking": "Nature & hiking",
      "questionnaire.affinities.skiWinterSports": "Skiing & winter sports",
      "questionnaire.affinities.safariAnimals": "Safari & animals",
      "questionnaire.affinities.localGastronomy": "Local gastronomy",
      "questionnaire.affinities.shoppingFashion": "Shopping & fashion",
      "questionnaire.affinities.festivalsEvents": "Festivals & events",
      "questionnaire.affinities.modernArchitecture": "Modern architecture",
      "questionnaire.affinities.templesSpirituality": "Temples & spirituality",
      "questionnaire.affinities.amusementParks": "Amusement parks",
      "questionnaire.affinities.divingSnorkeling": "Diving & snorkeling",
      "questionnaire.affinities.roadTripFreedom": "Road trip & freedom",
      "questionnaire.affinities.vineyardsWine": "Vineyards & wine tourism",
      "questionnaire.affinities.desertsLunar": "Deserts & lunar landscapes",
      "questionnaire.affinities.islandsArchipelagos": "Islands & archipelagos",
      
      // Travel ambiance
      "questionnaire.ambiance.title": "What ambiance are you looking for? 🎨",
      "questionnaire.ambiance.adventureExotic": "Adventure & exotic",
      "questionnaire.ambiance.adventureExotic.desc": "Get out of my comfort zone",
      "questionnaire.ambiance.relaxation": "Relaxation",
      "questionnaire.ambiance.relaxation.desc": "Completely recharge",
      "questionnaire.ambiance.romanceIntimacy": "Romance & intimacy",
      "questionnaire.ambiance.romanceIntimacy.desc": "Moments for two",
      "questionnaire.ambiance.culturalDiscovery": "Cultural discovery",
      "questionnaire.ambiance.culturalDiscovery.desc": "Learn and grow",
      "questionnaire.ambiance.partyNightlife": "Party & nightlife",
      "questionnaire.ambiance.partyNightlife.desc": "Party time",
      "questionnaire.ambiance.familyConviviality": "Family & conviviality",
      "questionnaire.ambiance.familyConviviality.desc": "Family moments",
      
      // Dates
      "questionnaire.dates.title": "Travel dates 📅",
      "questionnaire.dates.fixed": "Fixed dates",
      "questionnaire.dates.flexible": "I'm flexible",
      "questionnaire.dates.selectDates": "Select your travel dates 🗓️",
      "questionnaire.dates.selectRange": "Click and drag to select a date range",
      "questionnaire.dates.selected": "Selected dates:",
      "questionnaire.dates.departure": "Departure:",
      "questionnaire.dates.return": "Return:",
      "questionnaire.dates.nights": "nights",
      "questionnaire.dates.reset": "Reset dates",
      
      // Flexibility
      "questionnaire.flexibility.title": "Date flexibility ⏰",
      "questionnaire.flexibility.3days": "±3 days",
      "questionnaire.flexibility.week": "±1 week",
      "questionnaire.flexibility.2weeks": "±2 weeks",
      "questionnaire.flexibility.month": "±1 month",
      "questionnaire.flexibility.hasApproxDate": "Do you have an approximate departure date? 📆",
      "questionnaire.flexibility.approxDate": "What is your approximate departure date? 📆",
      "questionnaire.flexibility.clickDate": "Click on a date (this date will serve as a reference for your flexibility)",
      "questionnaire.flexibility.dateSelected": "Date selected:",
      
      // Duration
      "questionnaire.duration.title": "Trip duration 🌙",
      "questionnaire.duration.2nights": "2 nights",
      "questionnaire.duration.3nights": "3 nights",
      "questionnaire.duration.4nights": "4 nights",
      "questionnaire.duration.5nights": "5 nights",
      "questionnaire.duration.6nights": "6 nights",
      "questionnaire.duration.7nights": "7 nights",
      "questionnaire.duration.8to10": "8-10 nights",
      "questionnaire.duration.11to14": "11-14 nights",
      "questionnaire.duration.more14": ">14 nights",
      "questionnaire.duration.exactNights": "How many nights exactly? 🌉",
      
      // Budget
      "questionnaire.budget.title": "Budget per person 💰",
      "questionnaire.budget.excluding": "Excluding personal purchases",
      "questionnaire.budget.less300": "<€300",
      "questionnaire.budget.300to600": "€300-600",
      "questionnaire.budget.600to900": "€600-900",
      "questionnaire.budget.900to1200": "€900-1,200",
      "questionnaire.budget.1200to1800": "€1,200-1,800",
      "questionnaire.budget.more1800": ">€1,800",
      "questionnaire.budget.dontKnow": "I don't know",
      "questionnaire.budget.precise": "Precise budget",
      "questionnaire.budget.totalBudget": "What is your total budget? 💵",
      "questionnaire.budget.entireTrip": "For the entire trip",
      "questionnaire.budget.amount": "Amount",
      "questionnaire.budget.currency": "Currency",
      
      // Travel styles
      "questionnaire.styles.title": "Travel style 🎨",
      "questionnaire.styles.selectUpTo5": "Select up to 5 styles",
      "questionnaire.styles.nature": "Nature",
      "questionnaire.styles.cultureMuseums": "Culture & museums",
      "questionnaire.styles.food": "Food",
      "questionnaire.styles.beach": "Beach",
      "questionnaire.styles.mountainHiking": "Mountain & hiking",
      "questionnaire.styles.photoSpots": "Photo spots",
      "questionnaire.styles.localMarkets": "Local life & markets",
      "questionnaire.styles.sportOutdoor": "Sport & outdoor",
      "questionnaire.styles.wellnessSpa": "Wellness & spa",
      "questionnaire.styles.nightlife": "Nightlife",
      
      // Rhythm
      "questionnaire.rhythm.title": "Desired pace ⏱️",
      "questionnaire.rhythm.cool": "Cool",
      "questionnaire.rhythm.cool.desc": "1-2 activities/day",
      "questionnaire.rhythm.balanced": "Balanced",
      "questionnaire.rhythm.balanced.desc": "2-3 activities/day",
      "questionnaire.rhythm.intense": "Intense",
      "questionnaire.rhythm.intense.desc": "3+ activities/day",
      
      // Flights
      "questionnaire.flights.title": "Flights – preference ✈️",
      "questionnaire.flights.directOnly": "Direct only",
      "questionnaire.flights.max1Stop": "Max 1 stop",
      "questionnaire.flights.dontMind": "Don't mind",
      
      // Luggage
      "questionnaire.luggage.title": "Luggage per traveler 🧳",
      "questionnaire.luggage.travelers": "traveler",
      "questionnaire.luggage.travelers_plural": "travelers",
      "questionnaire.luggage.traveler": "Traveler",
      "questionnaire.luggage.personalItem": "Personal item only",
      "questionnaire.luggage.cabin": "Cabin baggage",
      "questionnaire.luggage.hold": "Hold baggage",
      "questionnaire.luggage.cabinHold": "Cabin + Hold",
      
      // Mobility
      "questionnaire.mobility.title": "Mobility 🚶",
      "questionnaire.mobility.selectMultiple": "Multiple selection possible",
      "questionnaire.mobility.publicTransport": "Public transport",
      "questionnaire.mobility.rentalCar": "Rental car",
      "questionnaire.mobility.taxi": "Taxi/Uber",
      "questionnaire.mobility.bike": "Bicycle",
      "questionnaire.mobility.walking": "Walking",
      "questionnaire.mobility.atypical": "Atypical transport",
      "questionnaire.mobility.atypical.desc": "Tuk-tuk, scooter, etc.",
      "questionnaire.mobility.ferry": "Boat/ferry",
      "questionnaire.mobility.incompleteSelection": "Incomplete selection",
      "questionnaire.mobility.selectOtherTransport": "Please select at least one other mode of transport in addition to atypical transport or boat/ferry.",
      
      // Accommodation type
      "questionnaire.accommodationType.title": "Accommodation type 🏨",
      "questionnaire.accommodationType.select1or2": "Select 1 or 2 types",
      "questionnaire.accommodationType.hotel": "Hotel",
      "questionnaire.accommodationType.apartment": "Apartment",
      "questionnaire.accommodationType.hostel": "Hostel",
      "questionnaire.accommodationType.guesthouse": "Guesthouse/riad",
      "questionnaire.accommodationType.lodge": "Lodge/eco-stay",
      "questionnaire.accommodationType.camping": "Camping/glamping",
      "questionnaire.accommodationType.bedBreakfast": "Bed & breakfast",
      "questionnaire.accommodationType.resort": "Resort",
      "questionnaire.accommodationType.dontMind": "Don't mind",
      
      // Hotel preferences
      "questionnaire.hotelPreferences.title": "Hotel preferences 🏨",
      "questionnaire.hotelPreferences.selectInterested": "Select what interests you",
      "questionnaire.hotelPreferences.breakfast": "Breakfast included",
      "questionnaire.hotelPreferences.halfBoard": "Half board",
      "questionnaire.hotelPreferences.fullBoard": "Full board",
      "questionnaire.hotelPreferences.allInclusive": "All-inclusive",
      "questionnaire.hotelPreferences.roomService": "Room service",
      "questionnaire.hotelPreferences.minibar": "Minibar",
      "questionnaire.hotelPreferences.view": "Sea/mountain view",
      "questionnaire.hotelPreferences.balcony": "Balcony/terrace",
      
      // Comfort
      "questionnaire.comfort.title": "Minimum comfort ⭐",
      "questionnaire.comfort.rating75": "Rating ≥7.5",
      "questionnaire.comfort.rating80": "Rating ≥8.0",
      "questionnaire.comfort.rating85": "Rating ≥8.5",
      "questionnaire.comfort.dontMind": "Don't mind",
      
      // Neighborhood
      "questionnaire.neighborhood.title": "Preferred neighborhood 🗺️",
      "questionnaire.neighborhood.quiet": "Quiet",
      "questionnaire.neighborhood.centralLively": "Central & lively",
      "questionnaire.neighborhood.nearNatureBeach": "Near nature/beach",
      "questionnaire.neighborhood.atypicalCharm": "Atypical/local charm",
      
      // Amenities
      "questionnaire.amenities.title": "Desired amenities 🛠️",
      "questionnaire.amenities.selectAll": "Select all that matter to you",
      "questionnaire.amenities.reliableWifi": "Reliable Wi-Fi",
      "questionnaire.amenities.airConditioning": "Air conditioning",
      "questionnaire.amenities.kitchen": "Kitchen",
      "questionnaire.amenities.washingMachine": "Washing machine",
      "questionnaire.amenities.parking": "Parking",
      "questionnaire.amenities.elevator": "Elevator",
      "questionnaire.amenities.reception24": "24/7 reception",
      "questionnaire.amenities.nearWorship": "Near place of worship",
      "questionnaire.amenities.babyCrib": "Baby crib",
      "questionnaire.amenities.familyRoom": "Family room",
      "questionnaire.amenities.pool": "Pool",
      "questionnaire.amenities.gym": "Gym",
      "questionnaire.amenities.spa": "Spa/jacuzzi",
      "questionnaire.amenities.gardenTerrace": "Garden/terrace",
      
      // Constraints
      "questionnaire.constraints.title": "Constraints & preferences 🎯",
      "questionnaire.constraints.selectAllImportant": "Select all important options",
      "questionnaire.constraints.halal": "Halal",
      "questionnaire.constraints.kosher": "Kosher",
      "questionnaire.constraints.vegetarian": "Vegetarian",
      "questionnaire.constraints.vegan": "Vegan",
      "questionnaire.constraints.glutenFree": "Gluten-free",
      "questionnaire.constraints.noPork": "No pork",
      "questionnaire.constraints.noAlcohol": "No alcohol",
      "questionnaire.constraints.prayerPlaces": "Prayer places",
      "questionnaire.constraints.buddhistTraditions": "Respect Buddhist traditions",
      "questionnaire.constraints.accessibility": "Wheelchair accessibility",
      "questionnaire.constraints.safezones": "Safe zones",
      "questionnaire.constraints.avoidCar": "Avoid car",
      "questionnaire.constraints.localTraditions": "Respect local traditions",
      "questionnaire.constraints.foodAllergies": "Food allergies",
      "questionnaire.constraints.dontMind": "Don't mind",
      
      // Additional info
      "questionnaire.additionalInfo.title": "Additional information 💭",
      "questionnaire.additionalInfo.optional": "Free text (optional)",
      "questionnaire.additionalInfo.placeholder": "Share your wishes, inspirations, special constraints...",
      "questionnaire.additionalInfo.skip": "Skip",
      
      // Email step
      "questionnaire.email.title": "Receive my itinerary 📧",
      "questionnaire.email.description": "We will send you your personalized itinerary within 48h",
      "questionnaire.email.placeholder": "your@email.com",
      "questionnaire.email.send": "Send 🚀",
      "questionnaire.email.sending": "Sending..."
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