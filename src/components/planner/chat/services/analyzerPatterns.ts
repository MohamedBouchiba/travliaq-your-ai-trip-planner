/**
 * analyzerPatterns.ts - Pattern dictionaries and suggestion templates
 *
 * Extracted from messageAnalyzer.ts to reduce file size.
 * Contains bilingual (FR/EN) regex patterns for intent detection
 * and suggestion template data.
 */

import type { AnticipatedSuggestion, ProposedContentType } from "./messageAnalyzer";

// ============================================================================
// ASSISTANT MESSAGE PATTERNS - Bilingual (FR/EN)
// ============================================================================

export const DESTINATION_PATTERNS = [
  // French
  /voici\s+(\d+)\s+[\w\s]*destinations?/i,
  /je te propose\s+(\d+)\s+[\w\s]*destinations?/i,
  /destinations?\s+(parfaites?|idéales?|recommandées?)/i,
  /pour toi\s*:\s*([\w\s,]+)/i,
  /que penses-tu de\s+([\w\s]+)\s*\?/i,
  /découvrir\s+([\w\s]+)\s*\?/i,
  // English
  /here\s+are\s+(\d+)\s+[\w\s]*destinations?/i,
  /i\s+suggest\s+(\d+)\s+[\w\s]*destinations?/i,
  /destinations?\s+(perfect|ideal|recommended)/i,
  /for\s+you\s*:\s*([\w\s,]+)/i,
  /what\s+do\s+you\s+think\s+(of|about)\s+([\w\s]+)\s*\?/i,
  /what\s+about\s+([\w\s,]+)\s*\?/i,
  /discover\s+([\w\s]+)\s*\?/i,
  /how\s+about\s+([\w\s]+)\s*\?/i,
];

export const DATES_QUESTION_PATTERNS = [
  // French
  /quand\s+(souhaitez-vous|veux-tu|voulez-vous)\s+partir/i,
  /quelles?\s+dates?\s+(préférez-vous|te convien)/i,
  /à quelle période/i,
  /pour combien de (temps|jours|nuits)/i,
  /durée\s+(du voyage|souhaitée)/i,
  /dates?\s+de\s+départ/i,
  // English
  /when\s+(would you like|do you want)\s+to\s+(leave|travel|go|depart)/i,
  /what\s+dates?\s+(do you prefer|work for you)/i,
  /which\s+period/i,
  /for\s+how\s+(long|many days|many nights)/i,
  /(trip|travel)\s+duration/i,
  /departure\s+dates?/i,
  /when\s+are\s+you\s+(thinking|planning)/i,
];

export const TRAVELERS_QUESTION_PATTERNS = [
  // French
  /combien\s+(serez-vous|êtes-vous|de personnes|de voyageurs?)/i,
  /(voyagez-vous|pars-tu)\s+(seul|en couple|en famille|entre amis)/i,
  /nombre\s+de\s+voyageurs?/i,
  /qui\s+(vous accompagne|t'accompagne)/i,
  // English
  /how\s+many\s+(people|travelers|travellers|guests|passengers)/i,
  /how\s+many\s+of\s+you/i,
  /(are you|will you be)\s+travel(l)?ing\s+(alone|solo|as a couple|with family|with friends)/i,
  /number\s+of\s+(travelers|travellers|guests|passengers)/i,
  /who\s+(is|will be)\s+(joining|coming|accompanying)/i,
  /traveling\s+with\s+anyone/i,
];

export const BUDGET_QUESTION_PATTERNS = [
  // French
  /quel\s+(est ton|est votre)\s+budget/i,
  /budget\s+(prévu|souhaité|estimé)/i,
  /combien\s+(souhaitez-vous|veux-tu)\s+dépenser/i,
  /fourchette\s+de\s+prix/i,
  // English
  /what('s| is)\s+(your)?\s*budget/i,
  /budget\s+(expected|planned|estimated)/i,
  /how\s+much\s+(would you like|do you want)\s+to\s+spend/i,
  /price\s+range/i,
  /what\s+can\s+you\s+afford/i,
];

export const FLIGHTS_PATTERNS = [
  // French
  /voici\s+(les|des)\s+vols?/i,
  /j'ai trouvé\s+(\d+)\s+vols?/i,
  /options?\s+de\s+vol/i,
  /vols?\s+(disponibles?|pour)/i,
  /billets?\s+d'avion/i,
  // English
  /here\s+are\s+(the|some)\s+flights?/i,
  /i('ve)?\s+found\s+(\d+)\s+flights?/i,
  /flight\s+options?/i,
  /flights?\s+(available|for)/i,
  /plane\s+tickets?/i,
  /available\s+flights/i,
];

export const HOTELS_PATTERNS = [
  // French
  /voici\s+(les|des)\s+[\w\s]*hôtels?/i,
  /j'ai trouvé\s+(\d+)\s+[\w\s]*hôtels?/i,
  /hébergements?\s+(disponibles?|recommandés?)/i,
  /options?\s+d'hébergement/i,
  /où\s+dormir/i,
  // English
  /here\s+are\s+(the|some)\s+[\w\s]*hotels?/i,
  /i('ve)?\s+found\s+(these|some|\d+)\s+[\w\s]*hotels?/i,
  /accommodations?\s+(available|recommended)/i,
  /accommodation\s+options?/i,
  /where\s+to\s+stay/i,
  /lodging\s+options?/i,
];

export const ACTIVITIES_PATTERNS = [
  // French
  /voici\s+(les|des)\s+activités?/i,
  /j'ai trouvé\s+(\d+)\s+activités?/i,
  /choses?\s+à\s+faire/i,
  /que\s+faire\s+à/i,
  /expériences?\s+(recommandées?|à\s+ne\s+pas\s+manquer)/i,
  // English
  /here\s+are\s+(the|some)\s+activities/i,
  /i('ve)?\s+found\s+(\d+)\s+activities/i,
  /things\s+to\s+do/i,
  /what\s+to\s+do\s+(in|at)/i,
  /experiences?\s+(recommended|not to miss|must-do)/i,
];

export const DESTINATION_INFO_PATTERNS = [
  // French
  /est\s+(idéal|parfait|recommandé)\s+(en|pour)/i,
  /meilleure\s+période/i,
  /climat\s+(est|sera)/i,
  /température\s+moyenne/i,
  /à\s+savoir\s+sur/i,
  /voici\s+ce\s+que\s+tu\s+dois\s+savoir/i,
  // English
  /is\s+(ideal|perfect|recommended)\s+(in|for)/i,
  /best\s+(time|period|season)/i,
  /climate\s+(is|will be)/i,
  /average\s+temperature/i,
  /to\s+know\s+about/i,
  /here('s| is)\s+what\s+you\s+(should|need to)\s+know/i,
];

export const CONFIRMATION_PATTERNS = [
  // French
  /c'est\s+noté/i,
  /parfait\s*!/i,
  /excellent\s+choix/i,
  /j'ai\s+bien\s+enregistré/i,
  /on\s+récapitule/i,
  /je\s+note/i,
  /bien\s+noté/i,
  /enregistré/i,
  // English
  /noted/i,
  /perfect\s*!/i,
  /excellent\s+choice/i,
  /i('ve)?\s+(saved|recorded|noted)/i,
  /i('ll)?\s+note/i,
  /let('s)?\s+recap/i,
  /got\s+it/i,
  /i\s+understand/i,
  /understood/i,
  /let\s+me\s+help/i,
];

export const DEPARTURE_QUESTION_PATTERNS = [
  // French
  /depuis\s+quelle\s+ville/i,
  /ville\s+de\s+départ/i,
  /d'où\s+(souhaitez-vous|souhaites-tu|veux-tu)\s+partir/i,
  // English
  /from\s+which\s+city/i,
  /departure\s+city/i,
  /where\s+(would you like|do you want)\s+to\s+(depart|leave)\s+from/i,
  /where\s+will\s+you\s+be\s+depart/i,
  /where\s+are\s+you\s+depart/i,
];

export const NEXT_STEPS_PATTERNS = [
  // French
  /il\s+reste\s+à\s+préciser/i,
  /voici\s+ce\s+qu'il\s+reste/i,
  /ce\s+que\s+nous\s+devons\s+préciser/i,
  // English
  /what('s|\s+is)\s+(left|remaining)\s+to/i,
  /here('s|\s+is)\s+what\s+we\s+(still\s+)?need/i,
];

export const GREETING_PATTERNS = [
  // French
  /bonjour/i,
  /bienvenue/i,
  /comment\s+puis-je\s+t'aider/i,
  /en quoi\s+puis-je/i,
  /prêt\s+à\s+planifier/i,
  // English
  /hello/i,
  /welcome/i,
  /how\s+can\s+i\s+help/i,
  /what\s+can\s+i\s+do\s+for\s+you/i,
  /ready\s+to\s+plan/i,
  /hi\s+there/i,
  /hey\s+there/i,
];

// ============================================================================
// USER INTENT PATTERNS - Bilingual
// ============================================================================

export const BUDGET_INTENT_PATTERNS = [
  // French
  /budget|€|\d+\s*(euros?|€)|pas\s+ch[eè]re?s?|économique|luxe|combien/i,
  // English
  /budget|\$|\£|\d+\s*(dollars?|pounds?|\$|\£)|cheap|affordable|luxury|expensive|how\s+much/i,
];

export const DATE_INTENT_PATTERNS = [
  // French
  /quand|date|période|mois|semaine|weekend|\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i,
  // English
  /when|date|period|month|week|weekend|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
];

export const COMPARISON_INTENT_PATTERNS = [
  // French
  /compare|versus|vs|ou\s+plutôt|différence|lequel/i,
  // English
  /compare|versus|vs|or\s+rather|difference|which\s+one|which\s+is\s+better|torn\s+between/i,
];

export const MORE_OPTIONS_INTENT_PATTERNS = [
  // French
  /autre|plus\s+d'options?|alternatives?|sinon|différent|inspire|propose[r-]?\s*(moi|nous|des)|sugg[eè]re|recommande|id[ée]es?\s*(de\s+voyage|de\s+destination)?|où\s+partir/i,
  // English
  /other|more\s+options?|alternatives?|else|different|something\s+(more|else|different)/i,
];

export const BOOKING_INTENT_PATTERNS = [
  // French
  /réserve|book|je\s+prends|on\s+prend|c'est\s+bon|valide|confirme/i,
  // English
  /book|reserve|i('ll)?\s+take\b|sounds\s+good|confirm|validate|let's\s+go\s+with/i,
];

export const POSITIVE_INTENT_PATTERNS = [
  // French
  /super|parfait|génial|j'adore|excellent|oui|ok|d'accord/i,
  // English
  /great|perfect|awesome|love\s+it|excellent|yes|ok|okay|sounds\s+good|let's\s+do\s+it/i,
];

export const NEGATIVE_INTENT_PATTERNS = [
  // French
  /non|pas\s+vraiment|je\s+préfère\s+pas|autre\s+chose|bof|finalement[,\s]+(pas|non)/i,
  // English
  /\bno\b|not\s+really|i('d)?\s+prefer\s+not|something\s+else|meh|nah|don't\s+like/i,
];

export const UNDECIDED_INTENT_PATTERNS = [
  // French
  /(?:je|on)\s+(?:ne\s+)?sai[st]?\s+pas|hésit|peut-être|je\s+ne\s+suis\s+pas\s+sûr/i,
  // English
  /i\s+don't\s+know|not\s+sure|maybe|perhaps|hesitat|undecided|torn\s+between|can't\s+decide/i,
];

// ============================================================================
// FALLBACK DESTINATION LIST (when index hasn't loaded)
// ============================================================================

export const FALLBACK_DESTINATIONS = [
  'Thaïlande', 'Thailand', 'Bali', 'Vietnam', 'Japon', 'Japan',
  'Grèce', 'Greece', 'Espagne', 'Spain', 'Italie', 'Italy',
  'Portugal', 'Maroc', 'Morocco', 'Mexique', 'Mexico',
  'Croatie', 'Croatia', 'Turquie', 'Turkey', 'Égypte', 'Egypt',
  'Maldives', 'Seychelles', 'Maurice', 'Mauritius',
  'Dubaï', 'Dubai', 'Singapour', 'Singapore',
  'Costa Rica', 'Colombie', 'Colombia', 'Pérou', 'Peru',
  'Argentine', 'Argentina', 'Brésil', 'Brazil',
  'Islande', 'Iceland', 'Norvège', 'Norway', 'Suède', 'Sweden',
  'Paris', 'Rome', 'Barcelona', 'Barcelone', 'Lisbonne', 'Lisbon',
  'Tokyo', 'Kyoto', 'Bangkok', 'Phuket', 'Bora Bora',
  'New York', 'Los Angeles', 'Miami', 'San Francisco',
  'Londres', 'London', 'Amsterdam', 'Berlin', 'Prague', 'Vienne', 'Vienna',
  'Zanzibar', 'Cambodge', 'Cambodia', 'Ibiza', 'Mykonos',
  'Montenegro', 'Cyprus', 'Chypre', 'Santorini', 'Tunisie', 'Tunisia',
  'Madère', 'Madeira',
];

// ============================================================================
// SUGGESTION TEMPLATES - Bilingual
// ============================================================================

export const SUGGESTION_TEMPLATES: Record<string, Record<'fr' | 'en', AnticipatedSuggestion[]>> = {
  greeting: {
    fr: [
      { id: 'inspire', label: 'Inspire-moi', message: 'Inspire-moi !', emoji: '✨', priority: 1 },
      { id: 'weekend', label: 'Weekend au soleil', message: 'Je cherche un weekend au soleil', emoji: '☀️', priority: 2 },
      { id: 'citybreak', label: 'City break', message: 'Je veux faire un city break', emoji: '🏙️', priority: 3 },
      { id: 'adventure', label: 'Aventure', message: 'Je veux partir à l\'aventure', emoji: '🌍', priority: 4 },
    ],
    en: [
      { id: 'inspire', label: 'Inspire me', message: 'Inspire me!', emoji: '✨', priority: 1 },
      { id: 'weekend', label: 'Sunny weekend', message: 'I\'m looking for a sunny weekend getaway', emoji: '☀️', priority: 2 },
      { id: 'citybreak', label: 'City break', message: 'I want to do a city break', emoji: '🏙️', priority: 3 },
      { id: 'adventure', label: 'Adventure', message: 'I want an adventure trip', emoji: '🌍', priority: 4 },
    ],
  },
  dates_question: {
    fr: [
      { id: 'this-weekend', label: 'Ce weekend', message: 'Ce weekend', emoji: '📅', priority: 1 },
      { id: 'next-week', label: 'Semaine prochaine', message: 'La semaine prochaine', emoji: '📆', priority: 2 },
      { id: 'flexible', label: 'Flexible', message: 'Je suis flexible sur les dates', emoji: '🤷', priority: 4 },
    ],
    en: [
      { id: 'this-weekend', label: 'This weekend', message: 'This weekend', emoji: '📅', priority: 1 },
      { id: 'next-week', label: 'Next week', message: 'Next week', emoji: '📆', priority: 2 },
      { id: 'flexible', label: 'Flexible', message: 'I\'m flexible with dates', emoji: '🤷', priority: 4 },
    ],
  },
  travelers_question: {
    fr: [
      { id: 'solo', label: 'Seul', message: 'Je pars seul', emoji: '🧳', priority: 1 },
      { id: 'couple', label: 'En couple', message: 'En couple, nous sommes 2', emoji: '💑', priority: 2 },
      { id: 'friends', label: 'Entre amis', message: 'Entre amis', emoji: '👥', priority: 3 },
      { id: 'family', label: 'En famille', message: 'En famille avec enfants', emoji: '👨‍👩‍👧', priority: 4 },
    ],
    en: [
      { id: 'solo', label: 'Solo', message: 'I\'m traveling solo', emoji: '🧳', priority: 1 },
      { id: 'couple', label: 'Couple', message: 'As a couple, 2 adults', emoji: '💑', priority: 2 },
      { id: 'friends', label: 'With friends', message: 'With friends', emoji: '👥', priority: 3 },
      { id: 'family', label: 'Family', message: 'Family with kids', emoji: '👨‍👩‍👧', priority: 4 },
    ],
  },
  budget_question: {
    fr: [
      { id: 'budget-eco', label: 'Économique', message: 'Budget économique, moins de 500€', emoji: '💰', priority: 1 },
      { id: 'budget-mid', label: 'Confort', message: 'Budget confort, entre 500€ et 1000€', emoji: '💵', priority: 2 },
      { id: 'budget-high', label: 'Premium', message: 'Budget premium, plus de 1000€', emoji: '💎', priority: 3 },
      { id: 'budget-flex', label: 'Pas de limite', message: 'Pas de budget défini', emoji: '🤷', priority: 4 },
    ],
    en: [
      { id: 'budget-eco', label: 'Budget', message: 'Budget-friendly, under $500', emoji: '💰', priority: 1 },
      { id: 'budget-mid', label: 'Comfort', message: 'Comfortable budget, $500-$1000', emoji: '💵', priority: 2 },
      { id: 'budget-high', label: 'Premium', message: 'Premium budget, over $1000', emoji: '💎', priority: 3 },
      { id: 'budget-flex', label: 'No limit', message: 'No set budget', emoji: '🤷', priority: 4 },
    ],
  },
  flights: {
    fr: [
      { id: 'cheapest', label: 'Le moins cher', message: 'Je prends le vol le moins cher', emoji: '💰', priority: 1 },
      { id: 'fastest', label: 'Le plus rapide', message: 'Je préfère le vol le plus rapide', emoji: '⚡', priority: 2 },
      { id: 'direct', label: 'Vol direct', message: 'Je veux un vol direct uniquement', emoji: '✈️', priority: 3 },
      { id: 'compare', label: 'Compare-les', message: 'Compare ces vols pour moi', emoji: '⚖️', priority: 4 },
    ],
    en: [
      { id: 'cheapest', label: 'Cheapest', message: 'I\'ll take the cheapest flight', emoji: '💰', priority: 1 },
      { id: 'fastest', label: 'Fastest', message: 'I prefer the fastest flight', emoji: '⚡', priority: 2 },
      { id: 'direct', label: 'Direct only', message: 'I want a direct flight only', emoji: '✈️', priority: 3 },
      { id: 'compare', label: 'Compare them', message: 'Compare these flights for me', emoji: '⚖️', priority: 4 },
    ],
  },
  hotels: {
    fr: [
      { id: 'best-rated', label: 'Mieux noté', message: 'Je prends le mieux noté', emoji: '⭐', priority: 1 },
      { id: 'central', label: 'Le plus central', message: 'Je veux l\'hôtel le plus central', emoji: '📍', priority: 2 },
      { id: 'cheapest-hotel', label: 'Le moins cher', message: 'Je prends le moins cher', emoji: '💰', priority: 3 },
      { id: 'with-pool', label: 'Avec piscine', message: 'Je veux un hôtel avec piscine', emoji: '🏊', priority: 4 },
    ],
    en: [
      { id: 'best-rated', label: 'Best rated', message: 'I\'ll take the best rated', emoji: '⭐', priority: 1 },
      { id: 'central', label: 'Most central', message: 'I want the most central hotel', emoji: '📍', priority: 2 },
      { id: 'cheapest-hotel', label: 'Cheapest', message: 'I\'ll take the cheapest', emoji: '💰', priority: 3 },
      { id: 'with-pool', label: 'With pool', message: 'I want a hotel with a pool', emoji: '🏊', priority: 4 },
    ],
  },
  activities: {
    fr: [
      { id: 'add-all', label: 'Tout ajouter', message: 'Ajoute toutes ces activités', emoji: '✅', priority: 1 },
      { id: 'more-info', label: 'Plus de détails', message: 'Donne-moi plus de détails sur ces activités', emoji: '📋', priority: 2 },
      { id: 'other-activities', label: 'Autres activités', message: 'Propose-moi d\'autres activités', emoji: '🔄', priority: 3 },
      { id: 'free-activities', label: 'Activités gratuites', message: 'Quelles activités gratuites sont disponibles ?', emoji: '🆓', priority: 4 },
    ],
    en: [
      { id: 'add-all', label: 'Add all', message: 'Add all these activities', emoji: '✅', priority: 1 },
      { id: 'more-info', label: 'More details', message: 'Give me more details about these activities', emoji: '📋', priority: 2 },
      { id: 'other-activities', label: 'Other activities', message: 'Suggest other activities', emoji: '🔄', priority: 3 },
      { id: 'free-activities', label: 'Free activities', message: 'What free activities are available?', emoji: '🆓', priority: 4 },
    ],
  },
  confirmation: {
    fr: [
      { id: 'continue', label: 'Continuer', message: 'On continue !', emoji: '▶️', priority: 1 },
      { id: 'search-flights', label: 'Chercher des vols', message: 'Cherche-moi des vols', emoji: '✈️', priority: 2 },
      { id: 'search-hotels', label: 'Chercher des hôtels', message: 'Cherche-moi des hôtels', emoji: '🏨', priority: 3 },
      { id: 'modify', label: 'Modifier', message: 'Je veux modifier quelque chose', emoji: '✏️', priority: 4 },
    ],
    en: [
      { id: 'continue', label: 'Continue', message: 'Let\'s continue!', emoji: '▶️', priority: 1 },
      { id: 'search-flights', label: 'Search flights', message: 'Search for flights', emoji: '✈️', priority: 2 },
      { id: 'search-hotels', label: 'Search hotels', message: 'Search for hotels', emoji: '🏨', priority: 3 },
      { id: 'modify', label: 'Modify', message: 'I want to change something', emoji: '✏️', priority: 4 },
    ],
  },
  open_question: {
    fr: [
      { id: 'yes', label: 'Oui', message: 'Oui', emoji: '👍', priority: 1 },
      { id: 'no', label: 'Non', message: 'Non', emoji: '👎', priority: 2 },
      { id: 'more-info', label: 'Plus d\'infos', message: 'J\'ai besoin de plus d\'informations', emoji: 'ℹ️', priority: 3 },
    ],
    en: [
      { id: 'yes', label: 'Yes', message: 'Yes', emoji: '👍', priority: 1 },
      { id: 'no', label: 'No', message: 'No', emoji: '👎', priority: 2 },
      { id: 'more-info', label: 'More info', message: 'I need more information', emoji: 'ℹ️', priority: 3 },
    ],
  },
  default_start: {
    fr: [
      { id: 'inspire', label: 'Inspire-moi', message: 'Inspire-moi !', emoji: '✨', priority: 1 },
      { id: 'destination', label: 'J\'ai une destination', message: 'J\'ai déjà une destination en tête', emoji: '📍', priority: 2 },
      { id: 'weekend', label: 'Weekend', message: 'Je cherche une idée de weekend', emoji: '☀️', priority: 3 },
    ],
    en: [
      { id: 'inspire', label: 'Inspire me', message: 'Inspire me!', emoji: '✨', priority: 1 },
      { id: 'destination', label: 'I have a destination', message: 'I already have a destination in mind', emoji: '📍', priority: 2 },
      { id: 'weekend', label: 'Weekend', message: 'I\'m looking for a weekend idea', emoji: '☀️', priority: 3 },
    ],
  },
  default_mid: {
    fr: [
      { id: 'recap', label: 'Récapitule', message: 'Récapitule mon voyage', emoji: '📋', priority: 1 },
      { id: 'help', label: 'Aide', message: 'De quoi as-tu besoin pour continuer ?', emoji: '❓', priority: 2 },
    ],
    en: [
      { id: 'recap', label: 'Recap', message: 'Recap my trip', emoji: '📋', priority: 1 },
      { id: 'help', label: 'Help', message: 'What do you need to continue?', emoji: '❓', priority: 2 },
    ],
  },
  departure_question: {
    fr: [
      { id: 'brussels', label: 'Bruxelles', message: 'Je pars de Bruxelles', emoji: '✈️', priority: 1 },
      { id: 'paris', label: 'Paris', message: 'Je pars de Paris', emoji: '✈️', priority: 2 },
      { id: 'other', label: 'Autre ville', message: 'Je pars de ', emoji: '📍', priority: 3 },
    ],
    en: [
      { id: 'london', label: 'London', message: 'I depart from London', emoji: '✈️', priority: 1 },
      { id: 'paris', label: 'Paris', message: 'I depart from Paris', emoji: '✈️', priority: 2 },
      { id: 'other', label: 'Other city', message: 'I depart from ', emoji: '📍', priority: 3 },
    ],
  },
  next_steps: {
    fr: [
      { id: 'solo', label: 'Seul', message: 'Je pars seul', emoji: '🧳', priority: 1 },
      { id: 'couple', label: 'En couple', message: 'En couple, nous sommes 2', emoji: '💑', priority: 2 },
      { id: 'family', label: 'En famille', message: 'En famille', emoji: '👨‍👩‍👧', priority: 3 },
    ],
    en: [
      { id: 'solo', label: 'Solo', message: 'I\'m traveling solo', emoji: '🧳', priority: 1 },
      { id: 'couple', label: 'Couple', message: 'As a couple, 2 adults', emoji: '💑', priority: 2 },
      { id: 'family', label: 'Family', message: 'Family trip', emoji: '👨‍👩‍👧', priority: 3 },
    ],
  },
};

// ============================================================================
// WIDGET COHERENCE RULES
// ============================================================================

export const WIDGET_COHERENCE_RULES: Array<{
  textPatterns: RegExp[];
  validWidgets: string[];
  label: string;
}> = [
  {
    label: "travelers",
    textPatterns: [
      /combien\b.*(?:voyageur|personne|êtes|serez|partez)/i,
      /how\s+many\b.*(?:traveler|people|person)/i,
      /(?:voyageur|personne|traveler|people)\b.*combien/i,
    ],
    validWidgets: ["travelersSelector"],
  },
  {
    label: "dates",
    textPatterns: [
      /quand\b.*(?:partir|voyager|aller)/i,
      /quelles?\s+dates?/i,
      /(?:when|what\s+dates?)\b.*(?:travel|go|leave|depart)/i,
      /pour\s+quel\s+week-?end/i,
    ],
    validWidgets: ["datePicker", "dateRangePicker"],
  },
  {
    label: "departure",
    textPatterns: [
      /(?:ville\s+de\s+départ|d'où\s+part|d'où\s+souhait)/i,
      /(?:departure\s+city|where\s+(?:are\s+you|do\s+you)\s+(?:depart|leav))/i,
      /indiquez?\s+(?:votre\s+)?ville/i,
    ],
    validWidgets: ["citySelector"],
  },
  {
    label: "budget",
    textPatterns: [
      /quel\s+(?:est\s+(?:votre|ton)\s+)?budget/i,
      /(?:what(?:'s| is)\s+your\s+budget)/i,
      /budget\s+(?:prévu|souhaité|envisagé)/i,
    ],
    validWidgets: ["budgetRangeSlider"],
  },
];
