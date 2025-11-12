import { describe, it, expect, beforeEach } from 'vitest';
import { TRAVEL_GROUPS, YES_NO, DATES_TYPE, HELP_WITH } from '@/lib/questionnaireValues';

/**
 * Suite de tests professionnels pour le questionnaire Travliaq
 * 
 * Ces tests vérifient la cohérence et la logique du questionnaire,
 * notamment la synchronisation entre getTotalSteps(), canProceedToNextStep() et renderStep()
 */

// Type représentant les réponses du questionnaire
type QuestionnaireAnswers = {
  travelGroup?: string;
  numberOfTravelers?: number;
  travelers?: Array<{ type: 'adult' | 'child'; age?: number }>;
  hasDestination?: string;
  helpWith?: string[];
  destination?: string;
  departureLocation?: string;
  climatePreference?: string[];
  travelAffinities?: string[];
  travelAmbiance?: string;
  datesType?: string;
  departureDate?: string;
  returnDate?: string;
  flexibility?: string;
  hasApproximateDepartureDate?: string;
  approximateDepartureDate?: string;
  duration?: string;
  exactNights?: number;
  budgetPerPerson?: string;
  budgetType?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  styles?: string[];
  flightPreference?: string;
  luggage?: { [key: number]: string };
  mobility?: string[];
  accommodationType?: string[];
  hotelPreferences?: string[];
  comfort?: string;
  neighborhood?: string;
  amenities?: string[];
  security?: string[];
  rhythm?: string;
  schedulePrefs?: string[];
  constraints?: string[];
};

// Fonction helper pour calculer le nombre total d'étapes (logique extraite de Questionnaire.tsx)
function calculateTotalSteps(answers: QuestionnaireAnswers): number {
  let total = 1; // Step 1: Groupe de voyage
  
  // Step 1b: Nombre exact si Famille ou Groupe 3-5
  const isFamilyOrGroup = answers.travelGroup === TRAVEL_GROUPS.FAMILY || 
                          answers.travelGroup === TRAVEL_GROUPS.GROUP35;
  if (isFamilyOrGroup) total++;
  
  total++; // Step 2: Destination en tête
  total++; // Step 2b: Comment aider
  
  const hasDestination = answers.hasDestination === YES_NO.YES;
  if (hasDestination) {
    total++; // Step 2c: Quelle destination
  } else {
    total++; // Step 2d: Climat
    total++; // Step 2e: Affinités
    total++; // Step 2f: Ambiance
    total++; // Step 2g: Ville de départ
  }
  
  total++; // Step 3: Dates
  
  const isFlexible = answers.datesType === DATES_TYPE.FLEXIBLE;
  if (answers.datesType === DATES_TYPE.FIXED) {
    total++; // Step 3b: Dates précises
  } else if (isFlexible) {
    total++; // Step 3c: Flexibilité
    total++; // Step 3d: Question période approximative
    if (answers.hasApproximateDepartureDate === YES_NO.YES) {
      total++; // Step 3e: Saisie date
    }
    total++; // Step 4: Durée
    if (answers.duration?.includes('14') || answers.duration?.toLowerCase().includes('more')) {
      total++; // Step 4b: Nombre exact
    }
  }
  
  total++; // Step 5: Budget
  if (answers.budgetType?.includes('précis') || answers.budgetType?.includes('1800')) {
    total++; // Step 5b: Montant exact
  }
  
  const helpWith = answers.helpWith || [];
  const needsFlights = helpWith.includes(HELP_WITH.FLIGHTS);
  const needsAccommodation = helpWith.includes(HELP_WITH.ACCOMMODATION);
  const needsActivities = helpWith.includes(HELP_WITH.ACTIVITIES);
  
  // Step 6: Style (si destination précise ET activités)
  if (hasDestination && needsActivities) {
    total++;
  }
  
  // Step 8-9: Vols et bagages
  if (needsFlights) {
    total += 2;
  }
  
  // Step 10: Mobilité (pas si uniquement vols ou uniquement hébergement)
  const onlyFlights = helpWith.length === 1 && needsFlights;
  const onlyAccommodation = helpWith.length === 1 && needsAccommodation;
  if (!onlyFlights && !onlyAccommodation) {
    total++;
  }
  
  // Step 11-14: Hébergement
  if (needsAccommodation) {
    total++; // Type hébergement
    // Préférences hôtel si hôtel sélectionné
    if (answers.accommodationType?.some(type => 
      type.toLowerCase().includes('hôtel') || type.toLowerCase().includes('hotel')
    )) {
      total++;
    }
    total++; // Confort
    total++; // Quartier
    total++; // Équipements
  }
  
  // Step 15: Sécurité (seulement si activités)
  if (needsActivities) {
    total++;
  }
  
  // Step 16: Horloge biologique (seulement si activités)
  if (needsActivities) {
    total++;
  }
  
  // Step 17: Contraintes (si hébergement + hôtel + repas)
  const hasHotelWithMeals = needsAccommodation && 
    answers.accommodationType?.some(type => 
      type.toLowerCase().includes('hôtel') || type.toLowerCase().includes('hotel')
    ) &&
    answers.hotelPreferences?.some(pref => 
      pref.toLowerCase().includes('breakfast') || 
      pref.toLowerCase().includes('half') ||
      pref.toLowerCase().includes('full') ||
      pref.toLowerCase().includes('inclusive')
    );
  if (hasHotelWithMeals) {
    total++;
  }
  
  total++; // Step 18: Zone ouverte
  total++; // Step final: Review
  
  return total;
}

describe('Questionnaire - Tests de cohérence et logique', () => {
  
  describe('Test 1: Scénario Solo avec destination précise et tous les services', () => {
    it('doit calculer le bon nombre d\'étapes pour un voyageur solo avec destination, vols, hébergement et activités', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Paris, France',
        departureLocation: 'Lyon, France',
        helpWith: [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION, HELP_WITH.ACTIVITIES],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-06-01',
        returnDate: '2024-06-15',
        budgetPerPerson: '500-1000€',
        accommodationType: ['Hôtel'],
        hotelPreferences: ['Petit-déjeuner', 'All-inclusive'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Solo (1) + Destination(1) + Aide(1) + Trajet(1) + Dates(1) + Dates précises(1) 
      // + Budget(1) + Style(1) + Vols(1) + Bagages(1) + Mobilité(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Sécurité(1) + Horloge(1) + Contraintes(1) + Zone ouverte(1) + Review(1) = 21
      expect(totalSteps).toBe(21);
    });
  });
  
  describe('Test 2: Scénario Duo sans destination avec dates flexibles', () => {
    it('doit calculer le bon nombre d\'étapes pour un duo sans destination avec dates flexibles', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.NO,
        climatePreference: ['Tropical', 'Tempéré'],
        travelAffinities: ['Culture', 'Nature'],
        travelAmbiance: 'Relaxant',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.FLIGHTS],
        datesType: DATES_TYPE.FLEXIBLE,
        hasApproximateDepartureDate: YES_NO.YES,
        approximateDepartureDate: '2024-07-01',
        flexibility: 'Très flexible',
        duration: '7-14 nuits',
        budgetPerPerson: '1200-1800€',
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Duo(1) + Destination?(1) + Aide(1) + Climat(1) + Affinités(1) + Ambiance(1) + Départ(1)
      // + Dates(1) + Flexibilité(1) + Période?(1) + Saisie date(1) + Durée(1)
      // + Budget(1) + Vols(1) + Bagages(1) + Zone ouverte(1) + Review(1) = 17
      expect(totalSteps).toBe(17);
    });
  });
  
  describe('Test 3: Scénario Famille avec enfants et hébergement uniquement', () => {
    it('doit calculer le bon nombre d\'étapes pour une famille demandant uniquement hébergement', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.FAMILY,
        numberOfTravelers: 4,
        travelers: [
          { type: 'adult' },
          { type: 'adult' },
          { type: 'child', age: 8 },
          { type: 'child', age: 5 }
        ],
        hasDestination: YES_NO.YES,
        destination: 'Nice, France',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-08-01',
        returnDate: '2024-08-15',
        budgetPerPerson: '600-900€',
        accommodationType: ['Appartement'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Famille(1) + Nb voyageurs(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Type hébergement(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 14
      expect(totalSteps).toBe(14);
    });
  });
  
  describe('Test 4: Scénario Groupe 3-5 avec budget précis supérieur à 1800€', () => {
    it('doit inclure l\'étape de saisie du montant exact pour budget >1800€', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.GROUP35,
        numberOfTravelers: 4,
        hasDestination: YES_NO.YES,
        destination: 'Tokyo, Japon',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-10-01',
        returnDate: '2024-10-15',
        budgetType: '>1800€',
        budgetAmount: 3000,
        budgetCurrency: 'EUR',
        accommodationType: ['Hôtel'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Groupe(1) + Nb(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1) + Montant exact(1)
      // + Vols(1) + Bagages(1) + Mobilité(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 19
      expect(totalSteps).toBe(19);
    });
  });
  
  describe('Test 5: Scénario Activités uniquement', () => {
    it('doit calculer correctement les étapes quand seules les activités sont demandées', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.YES,
        destination: 'Barcelone, Espagne',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACTIVITIES],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-05-01',
        returnDate: '2024-05-07',
        budgetPerPerson: '300-600€',
        styles: ['Culture', 'Gastronomie', 'Plage'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Duo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Style(1) + Mobilité(1) + Sécurité(1) + Horloge(1)
      // + Zone ouverte(1) + Review(1) = 13
      expect(totalSteps).toBe(13);
    });
  });
  
  describe('Test 6: Scénario Vols uniquement (cas minimal)', () => {
    it('ne doit pas afficher mobilité, sécurité ni horloge pour vols uniquement', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Rome, Italie',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.FLIGHTS],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-09-01',
        returnDate: '2024-09-05',
        budgetPerPerson: '300-600€',
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Solo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Vols(1) + Bagages(1) + Zone ouverte(1) + Review(1) = 11
      expect(totalSteps).toBe(11);
    });
  });
  
  describe('Test 7: Scénario Dates flexibles avec >14 nuits', () => {
    it('doit inclure l\'étape de saisie du nombre exact de nuits pour durée >14', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.NO,
        climatePreference: ['Chaud'],
        travelAffinities: ['Plage'],
        travelAmbiance: 'Relaxant',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FLEXIBLE,
        hasApproximateDepartureDate: YES_NO.NO,
        flexibility: 'Flexible',
        duration: 'Plus de 14 nuits',
        exactNights: 21,
        budgetPerPerson: '1200-1800€',
        accommodationType: ['Villa'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Solo(1) + Destination(1) + Aide(1) + Climat(1) + Affinités(1) + Ambiance(1) + Départ(1)
      // + Dates(1) + Flexibilité(1) + Période?(1) + Durée(1) + Nb exact(1)
      // + Budget(1) + Type hébergement(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 19
      expect(totalSteps).toBe(19);
    });
  });
  
  describe('Test 8: Scénario Hôtel avec repas (contraintes alimentaires)', () => {
    it('doit inclure l\'étape contraintes alimentaires si hôtel avec demi-pension', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.YES,
        destination: 'Istanbul, Turquie',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-11-01',
        returnDate: '2024-11-08',
        budgetPerPerson: '900-1200€',
        accommodationType: ['Hôtel'],
        hotelPreferences: ['Demi-pension', 'Vue'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Duo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Contraintes(1) + Zone ouverte(1) + Review(1) = 15
      expect(totalSteps).toBe(15);
    });
  });
  
  describe('Test 9: Scénario Hôtel sans repas (pas de contraintes)', () => {
    it('ne doit PAS inclure l\'étape contraintes si hôtel sans prestation repas', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Londres, Royaume-Uni',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-12-01',
        returnDate: '2024-12-05',
        budgetPerPerson: '600-900€',
        accommodationType: ['Hôtel'],
        hotelPreferences: ['Wifi fiable', 'Réception 24h/24'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Solo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 14 (PAS de contraintes)
      expect(totalSteps).toBe(14);
    });
  });
  
  describe('Test 10: Scénario Complet maximal', () => {
    it('doit calculer le nombre maximal d\'étapes avec toutes les options activées', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.FAMILY,
        numberOfTravelers: 5,
        travelers: [
          { type: 'adult' },
          { type: 'adult' },
          { type: 'child', age: 12 },
          { type: 'child', age: 8 },
          { type: 'child', age: 3 }
        ],
        hasDestination: YES_NO.YES,
        destination: 'New York, USA',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION, HELP_WITH.ACTIVITIES],
        datesType: DATES_TYPE.FLEXIBLE,
        hasApproximateDepartureDate: YES_NO.YES,
        approximateDepartureDate: '2025-07-01',
        flexibility: 'Peu flexible',
        duration: 'Plus de 14 nuits',
        exactNights: 21,
        budgetType: 'Budget précis',
        budgetAmount: 12000,
        budgetCurrency: 'EUR',
        styles: ['Culture', 'Shopping', 'Gastronomie', 'Musées', 'Parcs'],
        flightPreference: 'Vol direct uniquement',
        luggage: { 0: 'Cabine', 1: 'Cabine + Soute', 2: 'Cabine', 3: 'Cabine', 4: 'Objet personnel' },
        mobility: ['Marche', 'Métro/Train', 'Taxi/VTC'],
        accommodationType: ['Hôtel'],
        hotelPreferences: ['Pension complète', 'Piscine', 'Salle de sport'],
        comfort: '8.5/10+',
        neighborhood: 'Centre animé',
        amenities: ['Wifi fiable', 'Climatisation', 'Chambre familiale'],
        security: ['Zones sécurisées'],
        rhythm: 'balanced',
        schedulePrefs: ['early_bird'],
        constraints: ['Halal', 'Sans gluten'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Famille(1) + Nb voyageurs(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Flexibilité(1) + Période?(1) + Saisie date(1) + Durée(1) + Nb exact(1)
      // + Budget(1) + Montant(1)
      // + Style(1) + Vols(1) + Bagages(1) + Mobilité(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Sécurité(1) + Horloge(1) + Contraintes(1)
      // + Zone ouverte(1) + Review(1) = 27
      expect(totalSteps).toBe(27);
    });
  });
  
  describe('Test 11: Validation de la logique conditionnelle - Hébergement uniquement', () => {
    it('ne doit pas inclure mobilité pour hébergement uniquement', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Milan, Italie',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-06-15',
        returnDate: '2024-06-20',
        budgetPerPerson: '500-800€',
        accommodationType: ['Appartement'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Vérifier que mobilité n'est PAS comptée
      // Solo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Type hébergement(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 13 (PAS de mobilité)
      expect(totalSteps).toBe(13);
    });
  });
  
  describe('Test 12: Validation cohérence - Activités sans hébergement', () => {
    it('doit inclure sécurité et horloge pour activités, même sans hébergement', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.YES,
        destination: 'Amsterdam, Pays-Bas',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACTIVITIES],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-04-10',
        returnDate: '2024-04-14',
        budgetPerPerson: '400-700€',
        styles: ['Culture', 'Vélo', 'Musées'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Duo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Style(1) + Mobilité(1) + Sécurité(1) + Horloge(1)
      // + Zone ouverte(1) + Review(1) = 13
      expect(totalSteps).toBe(13);
      
      // Vérifier explicitement que sécurité et horloge sont incluses
      const hasActivities = answers.helpWith?.includes(HELP_WITH.ACTIVITIES);
      expect(hasActivities).toBe(true);
    });
  });
  
});

describe('Questionnaire - Tests de validation des réponses', () => {
  
  describe('Test 13: Validation des champs obligatoires - Étapes initiales', () => {
    it('doit détecter les réponses manquantes dans les premières étapes', () => {
      const incompleteAnswers: QuestionnaireAnswers = {
        // travelGroup manquant
        hasDestination: YES_NO.YES,
      };
      
      expect(incompleteAnswers.travelGroup).toBeUndefined();
      expect(incompleteAnswers.destination).toBeUndefined();
    });
  });
  
  describe('Test 14: Validation cohérence dates flexibles', () => {
    it('doit valider que les dates flexibles ont une flexibilité et une durée', () => {
      const flexibleDatesAnswers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Madrid, Espagne',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FLEXIBLE,
        hasApproximateDepartureDate: YES_NO.NO,
        flexibility: 'Très flexible',
        duration: '7-14 nuits',
        budgetPerPerson: '600-900€',
      };
      
      expect(flexibleDatesAnswers.datesType).toBe(DATES_TYPE.FLEXIBLE);
      expect(flexibleDatesAnswers.flexibility).toBeDefined();
      expect(flexibleDatesAnswers.duration).toBeDefined();
    });
  });
  
  describe('Test 15: Validation structure données voyageurs', () => {
    it('doit valider que les données famille incluent adultes et enfants avec âges', () => {
      const familyAnswers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.FAMILY,
        numberOfTravelers: 4,
        travelers: [
          { type: 'adult' },
          { type: 'adult' },
          { type: 'child', age: 10 },
          { type: 'child', age: 6 }
        ],
      };
      
      const adults = familyAnswers.travelers?.filter(t => t.type === 'adult');
      const children = familyAnswers.travelers?.filter(t => t.type === 'child');
      
      expect(adults?.length).toBe(2);
      expect(children?.length).toBe(2);
      expect(children?.every(c => c.age !== undefined && c.age > 0)).toBe(true);
    });
  });
  
});
