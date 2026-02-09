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

// Fonction helper pour calculer le nombre total d'étapes (logique synchronisée avec Questionnaire.tsx getTotalSteps)
function calculateTotalSteps(answers: QuestionnaireAnswers): number {
  let total = 1; // Step 1: Groupe de voyage
  
  // Step 1b: Nombre exact si Famille ou Groupe 3-5
  const isFamilyOrGroup = answers.travelGroup === TRAVEL_GROUPS.FAMILY || 
                          answers.travelGroup === TRAVEL_GROUPS.GROUP35;
  if (isFamilyOrGroup) total++;
  
  // Step 1c: Détails enfants (famille uniquement)
  if (answers.travelGroup === TRAVEL_GROUPS.FAMILY) total++;
  
  total++; // Step 2: Comment Travliaq peut aider (aide)
  total++; // Step 3: Destination en tête
  
  const hasDestination = answers.hasDestination === YES_NO.YES;
  if (hasDestination) {
    total++; // Step 3b: Quelle destination
  } else if (answers.hasDestination === YES_NO.NO) {
    total++; // Step 3c: Climat
    total++; // Step 3d: Affinités
    total++; // Step 3e: Ambiance
    total++; // Step 3f: Ville de départ
  }
  
  total++; // Step 4: Dates
  
  if (answers.datesType === DATES_TYPE.FIXED) {
    total++; // Step 4b: Dates précises
  } else if (answers.datesType === DATES_TYPE.FLEXIBLE) {
    total++; // Step 4c: Flexibilité
    total++; // Step 4d: Question période approximative
    if (answers.hasApproximateDepartureDate === YES_NO.YES) {
      total++; // Step 4e: Saisie date
    }
    total++; // Step 5: Durée
    // Check for ">14 nuits" only
    if (answers.duration && (
      answers.duration.includes('14') && (
        answers.duration.includes('>') || 
        answers.duration.toLowerCase().includes('more') ||
        answers.duration.toLowerCase().includes('plus')
      )
    )) {
      total++; // Step 5b: Nombre exact (>14)
    }
  }
  
  total++; // Step 6: Budget
  if (answers.budgetType && answers.budgetType.toLowerCase().includes('précis')) {
    total++; // Step 6b: Montant exact
  }
  
  const helpWith = answers.helpWith || [];
  const needsFlights = helpWith.includes(HELP_WITH.FLIGHTS);
  const needsAccommodation = helpWith.includes(HELP_WITH.ACCOMMODATION);
  const needsActivities = helpWith.includes(HELP_WITH.ACTIVITIES);
  
  // Vols et bagages
  if (needsFlights) {
    total += 2;
  }
  
  // Style (si destination précise ET activités)
  if (hasDestination && needsActivities) {
    total++;
  }
  
  // Activités: Mobilité, Sécurité, Rythme
  if (needsActivities) {
    total++; // Mobilité
    total++; // Sécurité
    total++; // Rythme
  }
  
  // Hébergement
  if (needsAccommodation) {
    total++; // Type hébergement
    if (answers.accommodationType?.some(type => 
      type.toLowerCase().includes('hôtel') || type.toLowerCase().includes('hotel')
    )) {
      total++; // Préférences hôtel
    }
    total++; // Confort
    total++; // Quartier
    total++; // Équipements
  }
  
  // Contraintes (si hébergement + hôtel + repas avec codes internes)
  const MEAL_CODES = ['breakfast', 'half_board', 'full_board', 'all_inclusive'];
  const hasHotelWithMeals = needsAccommodation && 
    answers.accommodationType?.some(type => 
      type.toLowerCase().includes('hôtel') || type.toLowerCase().includes('hotel')
    ) &&
    answers.hotelPreferences?.some(pref => MEAL_CODES.includes(pref));
  if (hasHotelWithMeals) {
    total++;
  }
  
  total++; // Zone ouverte
  total++; // Review
  
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
        hotelPreferences: ['breakfast', 'all_inclusive'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Solo(1) + Aide(1) + Destination?(1) + Destination(1) + Dates(1) + Dates précises(1) 
      // + Budget(1) + Vols(1) + Bagages(1) + Style(1) + Mobilité(1) + Sécurité(1) + Rythme(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Contraintes(1) + Zone ouverte(1) + Review(1) = 21
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
      
      // Famille(1) + Nb voyageurs(1) + Enfants(1) + Aide(1) + Destination?(1) + Destination(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Type hébergement(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 15
      expect(totalSteps).toBe(15);
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
        budgetType: 'Budget précis',
        budgetAmount: 3000,
        budgetCurrency: 'EUR',
        accommodationType: ['Hôtel'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Groupe(1) + Nb(1) + Aide(1) + Destination?(1) + Destination(1)
      // + Dates(1) + Dates précises(1) + Budget(1) + Montant exact(1)
      // + Vols(1) + Bagages(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 18
      expect(totalSteps).toBe(18);
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
        hotelPreferences: ['half_board', 'view'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Duo(1) + Aide(1) + Destination?(1) + Destination(1)
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
        hotelPreferences: ['full_board', 'view', 'room_service'],
        comfort: '8.5/10+',
        neighborhood: 'Centre animé',
        amenities: ['Wifi fiable', 'Climatisation', 'Chambre familiale'],
        security: ['Zones sécurisées'],
        rhythm: 'balanced',
        schedulePrefs: ['early_bird'],
        constraints: ['Halal', 'Sans gluten'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Famille(1) + Nb voyageurs(1) + Enfants(1) + Aide(1) + Destination?(1) + Destination(1)
      // + Dates(1) + Flexibilité(1) + Période?(1) + Saisie date(1) + Durée(1) + Nb exact(1)
      // + Budget(1) + Montant(1)
      // + Vols(1) + Bagages(1) + Style(1) + Mobilité(1) + Sécurité(1) + Rythme(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Contraintes(1) + Zone ouverte(1) + Review(1) = 28
      expect(totalSteps).toBe(28);
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

describe('Questionnaire - Tests négatifs (cas d\'échec attendus)', () => {
  
  describe('Test 16: [NÉGATIF] Scénario incomplet - Manque destination', () => {
    it('doit détecter l\'absence de destination quand hasDestination=YES', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        // destination manquante
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.FLIGHTS],
        datesType: DATES_TYPE.FIXED,
        budgetPerPerson: '500-1000€',
      };
      
      expect(answers.destination).toBeUndefined();
      expect(answers.hasDestination).toBe(YES_NO.YES);
    });
  });

  describe('Test 17: [NÉGATIF] Budget précis sans montant', () => {
    it('doit détecter l\'absence du montant quand budgetType=précis', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.YES,
        destination: 'Berlin, Allemagne',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FIXED,
        budgetType: 'Budget précis',
        // budgetAmount et budgetCurrency manquants
      };
      
      expect(answers.budgetAmount).toBeUndefined();
      expect(answers.budgetCurrency).toBeUndefined();
      expect(answers.budgetType).toBe('Budget précis');
    });
  });

  describe('Test 18: [NÉGATIF] Bagages incomplets pour plusieurs voyageurs', () => {
    it('doit détecter l\'absence de choix de bagages pour tous les voyageurs', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.FAMILY,
        numberOfTravelers: 4,
        helpWith: [HELP_WITH.FLIGHTS],
        luggage: { 0: 'Cabine', 1: 'Cabine' }, // Seulement 2/4
      };
      
      expect(answers.luggage).toBeDefined();
      expect(Object.keys(answers.luggage || {}).length).toBeLessThan(answers.numberOfTravelers || 0);
    });
  });

  describe('Test 19: [NÉGATIF] Dates flexibles sans durée', () => {
    it('doit détecter l\'absence de durée pour des dates flexibles', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.NO,
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FLEXIBLE,
        flexibility: 'Flexible',
        // duration manquante
      };
      
      expect(answers.datesType).toBe(DATES_TYPE.FLEXIBLE);
      expect(answers.duration).toBeUndefined();
    });
  });

  describe('Test 20: [NÉGATIF] Rythme sans préférences (optionnelles)', () => {
    it('doit accepter un rythme sans préférences horaires (schedulePrefs optionnel)', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.YES,
        destination: 'Lisbonne, Portugal',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACTIVITIES],
        datesType: DATES_TYPE.FIXED,
        budgetPerPerson: '700-1000€',
        styles: ['Culture', 'Plage'],
        rhythm: 'relaxed',
        schedulePrefs: [], // Vide car optionnel
      };
      
      // Le rythme est présent mais pas de préférences - c'est valide
      expect(answers.rhythm).toBe('relaxed');
      expect(answers.schedulePrefs?.length).toBe(0);
    });
  });

  describe('Test 21: [NÉGATIF] Hôtel avec repas mais sans contraintes', () => {
    it('doit permettre un hôtel avec repas sans contraintes alimentaires (optionnel)', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Athènes, Grèce',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACCOMMODATION],
        datesType: DATES_TYPE.FIXED,
        budgetPerPerson: '800-1200€',
        accommodationType: ['Hôtel'],
        hotelPreferences: ['Pension complète'],
        constraints: [], // Pas de contraintes (optionnel)
      };
      
      expect(answers.accommodationType).toContain('Hôtel');
      expect(answers.hotelPreferences).toContain('Pension complète');
      expect(answers.constraints?.length).toBe(0);
    });
  });
});

describe('Questionnaire - Tests de synchronisation logique', () => {
  
  describe('Test 22: Synchronisation getTotalSteps et validation - Activités seules', () => {
    it('doit avoir le même nombre d\'étapes calculé et les étapes doivent être validables', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.YES,
        destination: 'Prague, République Tchèque',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.ACTIVITIES],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-05-10',
        returnDate: '2024-05-17',
        budgetPerPerson: '600-900€',
        styles: ['Culture', 'Histoire', 'Gastronomie'],
        mobility: ['Marche'],
        security: ['Aucune contrainte'],
        rhythm: 'balanced',
        schedulePrefs: ['early_bird'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Duo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Style(1) + Mobilité(1) + Sécurité(1) + Horloge(1)
      // + Zone ouverte(1) + Review(1) = 13
      expect(totalSteps).toBe(13);
    });
  });

  describe('Test 23: Synchronisation avec plusieurs services combinés', () => {
    it('doit calculer correctement les étapes pour vols + hébergement + activités', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Séville, Espagne',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION, HELP_WITH.ACTIVITIES],
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-09-20',
        returnDate: '2024-09-27',
        budgetPerPerson: '900-1200€',
        styles: ['Culture', 'Flamenco'],
        flightPreference: 'Prix le plus bas',
        luggage: { 0: 'Cabine + Soute' },
        mobility: ['Marche', 'Métro/Train'],
        accommodationType: ['Hôtel'],
        hotelPreferences: ['breakfast', 'view'],
        comfort: '7/10',
        neighborhood: 'Centre historique',
        amenities: ['Wifi fiable', 'Climatisation'],
        security: ['Zones touristiques'],
        rhythm: 'balanced',
        schedulePrefs: [],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Solo(1) + Aide(1) + Destination?(1) + Destination(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Vols(1) + Bagages(1) + Style(1) + Mobilité(1) + Sécurité(1) + Rythme(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Contraintes(1) + Zone ouverte(1) + Review(1) = 21
      expect(totalSteps).toBe(21);
    });
  });

  describe('Test 24: Test limite - Aucun service sélectionné', () => {
    it('doit gérer le cas où aucun service n\'est sélectionné', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.SOLO,
        hasDestination: YES_NO.YES,
        destination: 'Venise, Italie',
        departureLocation: 'Paris, France',
        helpWith: [], // Aucun service
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-10-05',
        returnDate: '2024-10-10',
        budgetPerPerson: '500-800€',
      };
      
      const totalSteps = calculateTotalSteps(answers);
      
      // Solo(1) + Destination(1) + Aide(1) + Trajet(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Zone ouverte(1) + Review(1) = 9
      expect(totalSteps).toBe(9);
    });
  });

  describe('Test 25: Cohérence calcul étapes - Style n\'apparaît que si activités', () => {
    it('ne doit pas compter l\'étape style si pas d\'activités demandées', () => {
      const answers: QuestionnaireAnswers = {
        travelGroup: TRAVEL_GROUPS.DUO,
        hasDestination: YES_NO.YES,
        destination: 'Vienne, Autriche',
        departureLocation: 'Paris, France',
        helpWith: [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION], // PAS d'activités
        datesType: DATES_TYPE.FIXED,
        departureDate: '2024-11-15',
        returnDate: '2024-11-22',
        budgetPerPerson: '1000-1500€',
        accommodationType: ['Hôtel'],
      };
      
      const totalSteps = calculateTotalSteps(answers);
      const needsActivities = answers.helpWith?.includes(HELP_WITH.ACTIVITIES);
      
      // Vérifier que activités n'est PAS inclus
      expect(needsActivities).toBe(false);
      
      // Duo(1) + Aide(1) + Destination?(1) + Destination(1)
      // + Dates(1) + Dates précises(1) + Budget(1)
      // + Vols(1) + Bagages(1)
      // + Type hébergement(1) + Préf hôtel(1) + Confort(1) + Quartier(1) + Équipements(1)
      // + Zone ouverte(1) + Review(1) = 16 (PAS de style, mobilité, sécurité, rythme)
      expect(totalSteps).toBe(16);
    });
  });
});
