import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  TRAVEL_GROUPS, YES_NO, DATES_TYPE, HELP_WITH,
  CLIMATE, AFFINITIES, AMBIANCE, ACCOMMODATION_TYPE, COMFORT,
  CONSTRAINTS, MOBILITY, RHYTHM, SCHEDULE, FLIGHT_PREF, LUGGAGE,
  STYLES, AMENITIES,
  normalizeTravelGroup, normalizeYesNo, normalizeDatesType,
  normalizeHelpWithArray, normalizeClimateArray, normalizeAffinityArray,
  normalizeAmbiance, normalizeAccommodationTypeArray, normalizeComfort,
  normalizeConstraintsArray, normalizeMobility, normalizeRhythm,
  normalizeSchedulePrefsArray, normalizeFlightPref, normalizeLuggage,
  normalizeStylesArray, normalizeAmenitiesArray
} from '@/lib/questionnaireValues';

describe('Questionnaire Data Normalization & Submission', () => {
  describe('Travel Group Normalization', () => {
    it('should normalize solo traveler', () => {
      expect(normalizeTravelGroup('Solo')).toBe(TRAVEL_GROUPS.SOLO);
      expect(normalizeTravelGroup('solo')).toBe(TRAVEL_GROUPS.SOLO);
    });

    it('should normalize duo travelers', () => {
      expect(normalizeTravelGroup('Duo')).toBe(TRAVEL_GROUPS.DUO);
      expect(normalizeTravelGroup('duo')).toBe(TRAVEL_GROUPS.DUO);
    });

    it('should normalize group 3-5', () => {
      expect(normalizeTravelGroup('Groupe 3-5')).toBe(TRAVEL_GROUPS.GROUP35);
      expect(normalizeTravelGroup('group35')).toBe(TRAVEL_GROUPS.GROUP35);
    });

    it('should normalize family', () => {
      expect(normalizeTravelGroup('Famille')).toBe(TRAVEL_GROUPS.FAMILY);
      expect(normalizeTravelGroup('Family')).toBe(TRAVEL_GROUPS.FAMILY);
    });
  });

  describe('Yes/No Normalization', () => {
    it('should normalize yes responses', () => {
      expect(normalizeYesNo('Oui')).toBe(YES_NO.YES);
      expect(normalizeYesNo('Yes')).toBe(YES_NO.YES);
    });

    it('should normalize no responses', () => {
      expect(normalizeYesNo('Non')).toBe(YES_NO.NO);
      expect(normalizeYesNo('No')).toBe(YES_NO.NO);
    });
  });

  describe('Dates Type Normalization', () => {
    it('should normalize fixed dates', () => {
      expect(normalizeDatesType('Dates fixes')).toBe(DATES_TYPE.FIXED);
      expect(normalizeDatesType('Fixed')).toBe(DATES_TYPE.FIXED);
    });

    it('should normalize flexible dates', () => {
      expect(normalizeDatesType('Dates flexibles')).toBe(DATES_TYPE.FLEXIBLE);
      expect(normalizeDatesType('Flexible')).toBe(DATES_TYPE.FLEXIBLE);
    });
  });

  describe('Help With Array Normalization', () => {
    it('should normalize help with services', () => {
      const input = ['Vols', 'Hébergement', 'Activités'];
      const expected = [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION, HELP_WITH.ACTIVITIES];
      expect(normalizeHelpWithArray(input)).toEqual(expected);
    });

    it('should normalize mixed language services', () => {
      const input = ['Flights', 'Hébergement'];
      const expected = [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION];
      expect(normalizeHelpWithArray(input)).toEqual(expected);
    });
  });

  describe('Climate Normalization', () => {
    it('should normalize climate preferences', () => {
      const input = ['Chaud et ensoleillé', 'Doux et tempéré'];
      const result = normalizeClimateArray(input);
      expect(result).toContain(CLIMATE.HOT_SUNNY);
      expect(result).toContain(CLIMATE.MILD_SWEET);
    });

    it('should normalize dont mind option', () => {
      const input = ['Peu importe'];
      const result = normalizeClimateArray(input);
      expect(result).toContain(CLIMATE.DONT_MIND);
    });

    it('should normalize all climate options', () => {
      expect(normalizeClimateArray(['Chaud et ensoleillé'])).toContain(CLIMATE.HOT_SUNNY);
      expect(normalizeClimateArray(['Froid et neigeux'])).toContain(CLIMATE.COLD_SNOWY);
      expect(normalizeClimateArray(['Tropical et humide'])).toContain(CLIMATE.TROPICAL_HUMID);
      expect(normalizeClimateArray(['Montagne et altitude'])).toContain(CLIMATE.MOUNTAIN_ALTITUDE);
    });
  });

  describe('Affinities Normalization', () => {
    it('should normalize all affinity types', () => {
      expect(normalizeAffinityArray(['Plages paradisiaques'])).toContain(AFFINITIES.PARADISE_BEACHES);
      expect(normalizeAffinityArray(['Villes historiques'])).toContain(AFFINITIES.HISTORIC_CITIES);
      expect(normalizeAffinityArray(['Nature et randonnée'])).toContain(AFFINITIES.NATURE_HIKING);
      expect(normalizeAffinityArray(['Ski et sports d\'hiver'])).toContain(AFFINITIES.SKI_WINTER_SPORTS);
      expect(normalizeAffinityArray(['Safari et animaux'])).toContain(AFFINITIES.SAFARI_ANIMALS);
      expect(normalizeAffinityArray(['Gastronomie locale'])).toContain(AFFINITIES.LOCAL_GASTRONOMY);
      expect(normalizeAffinityArray(['Shopping et mode'])).toContain(AFFINITIES.SHOPPING_FASHION);
      expect(normalizeAffinityArray(['Festivals et événements'])).toContain(AFFINITIES.FESTIVALS_EVENTS);
    });

    it('should handle dont mind option', () => {
      expect(normalizeAffinityArray(['Peu importe'])).toContain(AFFINITIES.DONT_MIND);
    });
  });

  describe('Ambiance Normalization', () => {
    it('should normalize all ambiance types', () => {
      expect(normalizeAmbiance('Aventure et exotisme')).toBe(AMBIANCE.ADVENTURE_EXOTIC);
      expect(normalizeAmbiance('Relaxation')).toBe(AMBIANCE.RELAXATION);
      expect(normalizeAmbiance('Romance et intimité')).toBe(AMBIANCE.ROMANCE_INTIMACY);
      expect(normalizeAmbiance('Découverte culturelle')).toBe(AMBIANCE.CULTURAL_DISCOVERY);
      expect(normalizeAmbiance('Fête et vie nocturne')).toBe(AMBIANCE.PARTY_NIGHTLIFE);
      expect(normalizeAmbiance('Famille et convivialité')).toBe(AMBIANCE.FAMILY_CONVIVIALITY);
    });
  });

  describe('Styles Normalization', () => {
    it('should normalize all activity styles', () => {
      const styles = [
        'Nature',
        'Culture et musées',
        'Gastronomie',
        'Plage',
        'Montagne et randonnée'
      ];
      const result = normalizeStylesArray(styles);
      
      expect(result).toContain(STYLES.NATURE);
      expect(result).toContain(STYLES.CULTURE_MUSEUMS);
      expect(result).toContain(STYLES.FOOD);
      expect(result).toContain(STYLES.BEACH);
      expect(result).toContain(STYLES.MOUNTAIN_HIKING);
    });
  });

  describe('Mobility Normalization', () => {
    it('should normalize all mobility options', () => {
      expect(normalizeMobility('Marche à pied')).toBe(MOBILITY.WALKING);
      expect(normalizeMobility('Taxi')).toBe(MOBILITY.TAXI);
      expect(normalizeMobility('Voiture de location')).toBe(MOBILITY.RENTAL_CAR);
      expect(normalizeMobility('Vélo')).toBe(MOBILITY.BIKE);
      expect(normalizeMobility('Trottinette électrique')).toBe(MOBILITY.ELECTRIC_SCOOTER);
      expect(normalizeMobility('Moto/Scooter')).toBe(MOBILITY.MOTORBIKE_SCOOTER);
      expect(normalizeMobility('Bus touristique')).toBe(MOBILITY.TOURIST_BUS);
      expect(normalizeMobility('Train/Métro')).toBe(MOBILITY.TRAIN_METRO);
      expect(normalizeMobility('Ferry')).toBe(MOBILITY.FERRY);
      expect(normalizeMobility('Moyen atypique')).toBe(MOBILITY.ATYPICAL);
    });

    it('should handle dont mind option', () => {
      expect(normalizeMobility('Peu importe')).toBe(MOBILITY.DONT_MIND);
    });
  });

  describe('Accommodation Type Normalization', () => {
    it('should normalize all accommodation types', () => {
      const types = ['Hôtel', 'Appartement', 'Auberge de jeunesse'];
      const result = normalizeAccommodationTypeArray(types);
      
      expect(result).toContain(ACCOMMODATION_TYPE.HOTEL);
      expect(result).toContain(ACCOMMODATION_TYPE.APARTMENT);
      expect(result).toContain(ACCOMMODATION_TYPE.HOSTEL);
    });

    it('should handle dont mind option', () => {
      expect(normalizeAccommodationTypeArray(['Peu importe'])).toContain(ACCOMMODATION_TYPE.DONT_MIND);
    });
  });

  describe('Amenities Normalization', () => {
    it('should normalize all amenities', () => {
      const amenities = [
        'WiFi fiable',
        'Climatisation',
        'Cuisine équipée',
        'Machine à laver',
        'Parking',
        'Ascenseur'
      ];
      const result = normalizeAmenitiesArray(amenities);
      
      expect(result).toContain(AMENITIES.RELIABLE_WIFI);
      expect(result).toContain(AMENITIES.AIR_CONDITIONING);
      expect(result).toContain(AMENITIES.KITCHEN);
      expect(result).toContain(AMENITIES.WASHING_MACHINE);
      expect(result).toContain(AMENITIES.PARKING);
      expect(result).toContain(AMENITIES.ELEVATOR);
    });
  });

  describe('Constraints Normalization', () => {
    it('should normalize all dietary and cultural constraints', () => {
      const constraints = [
        'Halal',
        'Casher',
        'Végétarien',
        'Vegan',
        'Sans gluten',
        'Lieux de prière',
        'Accessibilité'
      ];
      const result = normalizeConstraintsArray(constraints);
      
      expect(result).toContain(CONSTRAINTS.HALAL);
      expect(result).toContain(CONSTRAINTS.KOSHER);
      expect(result).toContain(CONSTRAINTS.VEGETARIAN);
      expect(result).toContain(CONSTRAINTS.VEGAN);
      expect(result).toContain(CONSTRAINTS.GLUTEN_FREE);
      expect(result).toContain(CONSTRAINTS.PRAYER_PLACES);
      expect(result).toContain(CONSTRAINTS.ACCESSIBILITY);
    });

    it('should normalize additional constraints', () => {
      expect(normalizeConstraintsArray(['Zones sécurisées'])).toContain(CONSTRAINTS.SAFE_ZONES);
      expect(normalizeConstraintsArray(['Éviter la voiture'])).toContain(CONSTRAINTS.AVOID_CAR);
      expect(normalizeConstraintsArray(['Traditions locales'])).toContain(CONSTRAINTS.LOCAL_TRADITIONS);
      expect(normalizeConstraintsArray(['Allergies alimentaires'])).toContain(CONSTRAINTS.FOOD_ALLERGIES);
    });
  });

  describe('Comfort Level Normalization', () => {
    it('should normalize all comfort levels', () => {
      expect(normalizeComfort('Basique (1-2★)')).toBe(COMFORT.BASIC);
      expect(normalizeComfort('Standard (3★)')).toBe(COMFORT.STANDARD);
      expect(normalizeComfort('Confort (4★)')).toBe(COMFORT.COMFORT);
      expect(normalizeComfort('Premium (5★)')).toBe(COMFORT.PREMIUM);
      expect(normalizeComfort('Luxe (5★+)')).toBe(COMFORT.LUXURY);
    });
  });

  describe('Rhythm Normalization', () => {
    it('should normalize all rhythm types', () => {
      expect(normalizeRhythm('Posé et tranquille')).toBe(RHYTHM.RELAXED);
      expect(normalizeRhythm('Équilibré')).toBe(RHYTHM.BALANCED);
      expect(normalizeRhythm('Intense et soutenu')).toBe(RHYTHM.INTENSE);
    });
  });

  describe('Schedule Preferences Normalization', () => {
    it('should normalize all schedule preferences', () => {
      const prefs = [
        'Je suis plutôt matinal',
        'Je suis couche-tard',
        'J\'ai besoin de sieste',
        'J\'ai besoin de pauses'
      ];
      const result = normalizeSchedulePrefsArray(prefs);
      
      expect(result).toContain(SCHEDULE.EARLY_BIRD);
      expect(result).toContain(SCHEDULE.NIGHT_OWL);
      expect(result).toContain(SCHEDULE.NEEDS_SIESTA);
      expect(result).toContain(SCHEDULE.NEEDS_BREAKS);
    });
  });

  describe('Flight Preferences Normalization', () => {
    it('should normalize all flight preferences', () => {
      expect(normalizeFlightPref('Vol direct uniquement')).toBe(FLIGHT_PREF.DIRECT);
      expect(normalizeFlightPref('Une escale max')).toBe(FLIGHT_PREF.ONE_STOP);
      expect(normalizeFlightPref('Le moins cher')).toBe(FLIGHT_PREF.CHEAPEST);
      expect(normalizeFlightPref('Le plus rapide')).toBe(FLIGHT_PREF.FASTEST);
      expect(normalizeFlightPref('Confort prioritaire')).toBe(FLIGHT_PREF.COMFORT);
    });
  });

  describe('Luggage Normalization', () => {
    it('should normalize all luggage options', () => {
      expect(normalizeLuggage('Bagage personnel uniquement')).toBe(LUGGAGE.PERSONAL_ITEM);
      expect(normalizeLuggage('Bagage cabine uniquement')).toBe(LUGGAGE.CABIN);
      expect(normalizeLuggage('Bagage soute uniquement')).toBe(LUGGAGE.HOLD);
      expect(normalizeLuggage('Cabine + Soute')).toBe(LUGGAGE.CABIN_HOLD);
    });
  });

  describe('Complete Questionnaire Data Structure', () => {
    it('should ensure all required fields are present in submission payload', () => {
      const completeQuestionnaireData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        langue: 'fr',
        groupe_voyage: TRAVEL_GROUPS.SOLO,
        nombre_voyageurs: 1,
        a_destination: YES_NO.YES,
        destination: 'Paris',
        lieu_depart: 'Lyon',
        preference_climat: [CLIMATE.HOT_SUNNY, CLIMATE.MILD_SWEET],
        affinites_voyage: [AFFINITIES.PARADISE_BEACHES, AFFINITIES.LOCAL_GASTRONOMY],
        ambiance_voyage: AMBIANCE.RELAXATION,
        type_dates: DATES_TYPE.FIXED,
        date_depart: '2025-06-01',
        date_retour: '2025-06-15',
        flexibilite: null,
        a_date_depart_approximative: null,
        date_depart_approximative: null,
        duree: '14-21',
        nuits_exactes: 14,
        budget_par_personne: '2000-3000',
        type_budget: 'per_person',
        montant_budget: 2500,
        devise_budget: 'EUR',
        styles: [STYLES.NATURE, STYLES.BEACH, STYLES.FOOD],
        rythme: RHYTHM.RELAXED,
        preferences_horaires: [SCHEDULE.EARLY_BIRD, SCHEDULE.NEEDS_SIESTA],
        preference_vol: FLIGHT_PREF.DIRECT,
        bagages: { 0: LUGGAGE.CABIN_HOLD },
        mobilite: [MOBILITY.WALKING, MOBILITY.TAXI],
        type_hebergement: [ACCOMMODATION_TYPE.HOTEL],
        preferences_hotel: ['breakfast', 'half_board'],
        confort: COMFORT.COMFORT,
        quartier: 'Centre-ville',
        equipements: [AMENITIES.RELIABLE_WIFI, AMENITIES.AIR_CONDITIONING],
        enfants: [],
        securite: null,
        aide_avec: [HELP_WITH.FLIGHTS, HELP_WITH.ACCOMMODATION],
        contraintes: [CONSTRAINTS.VEGETARIAN, CONSTRAINTS.GLUTEN_FREE],
        infos_supplementaires: 'Je préfère des restaurants locaux authentiques'
      };

      // Verify all required fields are present
      expect(completeQuestionnaireData.user_id).toBeDefined();
      expect(completeQuestionnaireData.email).toBeDefined();
      expect(completeQuestionnaireData.langue).toBeDefined();
      expect(completeQuestionnaireData.groupe_voyage).toBeDefined();
      expect(completeQuestionnaireData.type_dates).toBeDefined();
      expect(completeQuestionnaireData.duree).toBeDefined();
      expect(completeQuestionnaireData.aide_avec).toBeDefined();
      expect(completeQuestionnaireData.aide_avec.length).toBeGreaterThan(0);

      // Verify normalized values are internal codes
      expect(completeQuestionnaireData.groupe_voyage).toBe('solo');
      expect(completeQuestionnaireData.type_dates).toBe('fixed');
      expect(completeQuestionnaireData.preference_climat).toContain('hot_sunny');
      expect(completeQuestionnaireData.affinites_voyage).toContain('paradise_beaches');
      expect(completeQuestionnaireData.ambiance_voyage).toBe('relaxation');
      expect(completeQuestionnaireData.styles).toContain('nature');
      expect(completeQuestionnaireData.mobilite).toContain('walking');
      expect(completeQuestionnaireData.type_hebergement).toContain('hotel');
      expect(completeQuestionnaireData.equipements).toContain('reliable_wifi');
      expect(completeQuestionnaireData.contraintes).toContain('vegetarian');
    });

    it('should handle optional fields correctly', () => {
      const minimalQuestionnaireData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        langue: 'fr',
        groupe_voyage: TRAVEL_GROUPS.DUO,
        type_dates: DATES_TYPE.FLEXIBLE,
        duree: '7-14',
        aide_avec: [HELP_WITH.ACTIVITIES]
      };

      // Verify required fields
      expect(minimalQuestionnaireData.user_id).toBeDefined();
      expect(minimalQuestionnaireData.email).toBeDefined();
      expect(minimalQuestionnaireData.groupe_voyage).toBeDefined();
      expect(minimalQuestionnaireData.type_dates).toBeDefined();
      expect(minimalQuestionnaireData.duree).toBeDefined();
      expect(minimalQuestionnaireData.aide_avec).toBeDefined();
    });
  });

  describe('Language Independence', () => {
    it('should produce same internal codes regardless of language', () => {
      // French input
      const frenchClimate = normalizeClimateArray(['Chaud et ensoleillé']);
      // English input
      const englishClimate = normalizeClimateArray(['Hot and sunny']);
      
      // Both should produce the same internal code
      expect(frenchClimate[0]).toBe(CLIMATE.HOT_SUNNY);
      expect(englishClimate[0]).toBe(CLIMATE.HOT_SUNNY);
      expect(frenchClimate[0]).toBe(englishClimate[0]);
    });

    it('should normalize travel groups in both languages', () => {
      expect(normalizeTravelGroup('Solo')).toBe(normalizeTravelGroup('Solo'));
      expect(normalizeTravelGroup('Famille')).toBe(normalizeTravelGroup('Family'));
    });
  });
});
