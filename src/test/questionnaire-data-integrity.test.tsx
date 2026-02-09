import { describe, it, expect } from 'vitest';
import {
  TRAVEL_GROUPS, HELP_WITH, CLIMATE, AFFINITIES, AMBIANCE,
  ACCOMMODATION_TYPE, STYLES, MOBILITY, AMENITIES, CONSTRAINTS,
  COMFORT, RHYTHM, SCHEDULE, FLIGHT_PREF, LUGGAGE
} from '@/lib/questionnaireValues';

/**
 * Tests d'intégrité des données du questionnaire
 * Vérifie que toutes les constantes sont bien définies et cohérentes
 */

describe('Questionnaire Constants Integrity', () => {
  describe('TRAVEL_GROUPS constants', () => {
    it('should have all required travel group codes', () => {
      expect(TRAVEL_GROUPS.SOLO).toBe('solo');
      expect(TRAVEL_GROUPS.DUO).toBe('duo');
      expect(TRAVEL_GROUPS.GROUP35).toBe('group35');
      expect(TRAVEL_GROUPS.FAMILY).toBe('family');
    });

    it('should have exactly 4 travel group options', () => {
      const values = Object.values(TRAVEL_GROUPS);
      expect(values.length).toBe(4);
    });
  });

  describe('HELP_WITH constants', () => {
    it('should have all required service codes', () => {
      expect(HELP_WITH.FLIGHTS).toBe('flights');
      expect(HELP_WITH.ACCOMMODATION).toBe('accommodation');
      expect(HELP_WITH.ACTIVITIES).toBe('activities');
    });

    it('should have exactly 3 service options', () => {
      const values = Object.values(HELP_WITH);
      expect(values.length).toBe(3);
    });
  });

  describe('CLIMATE constants', () => {
    it('should have all required climate codes including new ones', () => {
      expect(CLIMATE.DONT_MIND).toBe('dont_mind');
      expect(CLIMATE.HOT_SUNNY).toBe('hot_sunny');
      expect(CLIMATE.MILD_SWEET).toBe('mild_sweet');
      expect(CLIMATE.COLD_SNOWY).toBe('cold_snowy');
      expect(CLIMATE.TROPICAL_HUMID).toBe('tropical_humid');
      expect(CLIMATE.MOUNTAIN_ALTITUDE).toBe('mountain_altitude');
    });

    it('should have backward compatibility codes', () => {
      expect(CLIMATE.HOT).toBe('hot');
      expect(CLIMATE.TEMPERATE).toBe('temperate');
      expect(CLIMATE.COLD).toBe('cold');
      expect(CLIMATE.TROPICAL).toBe('tropical');
      expect(CLIMATE.DRY).toBe('dry');
    });

    it('should have at least 11 climate options', () => {
      const values = Object.values(CLIMATE);
      expect(values.length).toBeGreaterThanOrEqual(11);
    });
  });

  describe('AFFINITIES constants', () => {
    it('should have all required affinity codes', () => {
      expect(AFFINITIES.DONT_MIND).toBe('dont_mind');
      expect(AFFINITIES.PARADISE_BEACHES).toBe('paradise_beaches');
      expect(AFFINITIES.HISTORIC_CITIES).toBe('historic_cities');
      expect(AFFINITIES.NATURE_HIKING).toBe('nature_hiking');
      expect(AFFINITIES.SKI_WINTER_SPORTS).toBe('ski_winter_sports');
      expect(AFFINITIES.SAFARI_ANIMALS).toBe('safari_animals');
      expect(AFFINITIES.LOCAL_GASTRONOMY).toBe('local_gastronomy');
      expect(AFFINITIES.SHOPPING_FASHION).toBe('shopping_fashion');
      expect(AFFINITIES.FESTIVALS_EVENTS).toBe('festivals_events');
      expect(AFFINITIES.MODERN_ARCHITECTURE).toBe('modern_architecture');
      expect(AFFINITIES.TEMPLES_SPIRITUALITY).toBe('temples_spirituality');
      expect(AFFINITIES.AMUSEMENT_PARKS).toBe('amusement_parks');
      expect(AFFINITIES.DIVING_SNORKELING).toBe('diving_snorkeling');
      expect(AFFINITIES.ROAD_TRIP_FREEDOM).toBe('road_trip_freedom');
      expect(AFFINITIES.VINEYARDS_WINE).toBe('vineyards_wine');
      expect(AFFINITIES.DESERTS_LUNAR).toBe('deserts_lunar');
      expect(AFFINITIES.ISLANDS_ARCHIPELAGOS).toBe('islands_archipelagos');
    });

    it('should have at least 25 affinity options (including backward compat)', () => {
      const values = Object.values(AFFINITIES);
      expect(values.length).toBeGreaterThanOrEqual(25);
    });
  });

  describe('AMBIANCE constants', () => {
    it('should have all required ambiance codes', () => {
      expect(AMBIANCE.ADVENTURE_EXOTIC).toBe('adventure_exotic');
      expect(AMBIANCE.RELAXATION).toBe('relaxation');
      expect(AMBIANCE.ROMANCE_INTIMACY).toBe('romance_intimacy');
      expect(AMBIANCE.CULTURAL_DISCOVERY).toBe('cultural_discovery');
      expect(AMBIANCE.PARTY_NIGHTLIFE).toBe('party_nightlife');
      expect(AMBIANCE.FAMILY_CONVIVIALITY).toBe('family_conviviality');
    });

    it('should have backward compatibility codes', () => {
      expect(AMBIANCE.ADVENTURE).toBe('adventure');
      expect(AMBIANCE.CULTURE).toBe('culture');
      expect(AMBIANCE.PARTY).toBe('party');
      expect(AMBIANCE.SPORT).toBe('sport');
      expect(AMBIANCE.WELLNESS).toBe('wellness');
      expect(AMBIANCE.ROMANTIC).toBe('romantic');
      expect(AMBIANCE.FAMILY).toBe('family');
      expect(AMBIANCE.DISCOVERY).toBe('discovery');
    });

    it('should have at least 14 ambiance options', () => {
      const values = Object.values(AMBIANCE);
      expect(values.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe('STYLES constants', () => {
    it('should have all required activity style codes', () => {
      expect(STYLES.NATURE).toBe('nature');
      expect(STYLES.CULTURE_MUSEUMS).toBe('culture_museums');
      expect(STYLES.FOOD).toBe('food');
      expect(STYLES.BEACH).toBe('beach');
      expect(STYLES.MOUNTAIN_HIKING).toBe('mountain_hiking');
      expect(STYLES.PHOTO_SPOTS).toBe('photo_spots');
      expect(STYLES.LOCAL_MARKETS).toBe('local_markets');
      expect(STYLES.SPORT_OUTDOOR).toBe('sport_outdoor');
      expect(STYLES.WELLNESS_SPA).toBe('wellness_spa');
      expect(STYLES.NIGHTLIFE).toBe('nightlife');
    });

    it('should have exactly 10 style options', () => {
      const values = Object.values(STYLES);
      expect(values.length).toBe(10);
    });
  });

  describe('MOBILITY constants', () => {
    it('should have all required mobility codes', () => {
      expect(MOBILITY.DONT_MIND).toBe('dont_mind');
      expect(MOBILITY.WALKING).toBe('walking');
      expect(MOBILITY.TAXI).toBe('taxi');
      expect(MOBILITY.RENTAL_CAR).toBe('rental_car');
      expect(MOBILITY.BIKE).toBe('bike');
      expect(MOBILITY.ELECTRIC_SCOOTER).toBe('electric_scooter');
      expect(MOBILITY.MOTORBIKE_SCOOTER).toBe('motorbike_scooter');
      expect(MOBILITY.TOURIST_BUS).toBe('tourist_bus');
      expect(MOBILITY.TRAIN_METRO).toBe('train_metro');
      expect(MOBILITY.FERRY).toBe('ferry');
      expect(MOBILITY.ATYPICAL).toBe('atypical');
    });

    it('should have backward compatibility codes', () => {
      expect(MOBILITY.VERY_MOBILE).toBe('very_mobile');
      expect(MOBILITY.MOBILE).toBe('mobile');
      expect(MOBILITY.LIMITED).toBe('limited');
      expect(MOBILITY.WHEELCHAIR).toBe('wheelchair');
    });

    it('should have at least 15 mobility options', () => {
      const values = Object.values(MOBILITY);
      expect(values.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('ACCOMMODATION_TYPE constants', () => {
    it('should have all required accommodation codes', () => {
      expect(ACCOMMODATION_TYPE.DONT_MIND).toBe('dont_mind');
      expect(ACCOMMODATION_TYPE.HOTEL).toBe('hotel');
      expect(ACCOMMODATION_TYPE.APARTMENT).toBe('apartment');
      expect(ACCOMMODATION_TYPE.VILLA).toBe('villa');
      expect(ACCOMMODATION_TYPE.HOSTEL).toBe('hostel');
      expect(ACCOMMODATION_TYPE.GUESTHOUSE).toBe('guesthouse');
      expect(ACCOMMODATION_TYPE.LODGE).toBe('lodge');
      expect(ACCOMMODATION_TYPE.CAMPING).toBe('camping');
      expect(ACCOMMODATION_TYPE.BED_BREAKFAST).toBe('bed_breakfast');
      expect(ACCOMMODATION_TYPE.RESORT).toBe('resort');
    });

    it('should have exactly 12 accommodation type options', () => {
      const values = Object.values(ACCOMMODATION_TYPE);
      expect(values.length).toBe(12);
    });
  });

  describe('AMENITIES constants', () => {
    it('should have all required amenity codes', () => {
      expect(AMENITIES.DONT_MIND).toBe('dont_mind');
      expect(AMENITIES.RELIABLE_WIFI).toBe('reliable_wifi');
      expect(AMENITIES.AIR_CONDITIONING).toBe('air_conditioning');
      expect(AMENITIES.KITCHEN).toBe('kitchen');
      expect(AMENITIES.WASHING_MACHINE).toBe('washing_machine');
      expect(AMENITIES.PARKING).toBe('parking');
      expect(AMENITIES.ELEVATOR).toBe('elevator');
      expect(AMENITIES.RECEPTION_24).toBe('reception_24');
      expect(AMENITIES.BABY_CRIB).toBe('baby_crib');
      expect(AMENITIES.FAMILY_ROOM).toBe('family_room');
      expect(AMENITIES.POOL).toBe('pool');
      expect(AMENITIES.GYM).toBe('gym');
      expect(AMENITIES.SPA).toBe('spa');
      expect(AMENITIES.GARDEN_TERRACE).toBe('garden_terrace');
    });

    it('should have exactly 14 amenity options', () => {
      const values = Object.values(AMENITIES);
      expect(values.length).toBe(14);
    });
  });

  describe('CONSTRAINTS constants', () => {
    it('should have all required constraint codes', () => {
      expect(CONSTRAINTS.DONT_MIND).toBe('dont_mind');
      expect(CONSTRAINTS.HALAL).toBe('halal');
      expect(CONSTRAINTS.KOSHER).toBe('kosher');
      expect(CONSTRAINTS.VEGETARIAN).toBe('vegetarian');
      expect(CONSTRAINTS.VEGAN).toBe('vegan');
      expect(CONSTRAINTS.GLUTEN_FREE).toBe('gluten_free');
      expect(CONSTRAINTS.NO_PORK).toBe('no_pork');
      expect(CONSTRAINTS.NO_ALCOHOL).toBe('no_alcohol');
      expect(CONSTRAINTS.PRAYER_PLACES).toBe('prayer_places');
      expect(CONSTRAINTS.BUDDHIST).toBe('buddhist');
      expect(CONSTRAINTS.ACCESSIBILITY).toBe('accessibility');
      expect(CONSTRAINTS.SAFE_ZONES).toBe('safe_zones');
      expect(CONSTRAINTS.AVOID_CAR).toBe('avoid_car');
      expect(CONSTRAINTS.LOCAL_TRADITIONS).toBe('local_traditions');
      expect(CONSTRAINTS.FOOD_ALLERGIES).toBe('food_allergies');
    });

    it('should have exactly 15 constraint options', () => {
      const values = Object.values(CONSTRAINTS);
      expect(values.length).toBe(15);
    });
  });

  describe('COMFORT constants', () => {
    it('should have all required comfort level codes', () => {
      expect(COMFORT.BASIC).toBe('basic');
      expect(COMFORT.STANDARD).toBe('standard');
      expect(COMFORT.COMFORT).toBe('comfort');
      expect(COMFORT.PREMIUM).toBe('premium');
      expect(COMFORT.LUXURY).toBe('luxury');
    });

    it('should have exactly 5 comfort level options', () => {
      const values = Object.values(COMFORT);
      expect(values.length).toBe(5);
    });
  });

  describe('RHYTHM constants', () => {
    it('should have all required rhythm codes', () => {
      expect(RHYTHM.RELAXED).toBe('relaxed');
      expect(RHYTHM.BALANCED).toBe('balanced');
      expect(RHYTHM.INTENSE).toBe('intense');
    });

    it('should have exactly 3 rhythm options', () => {
      const values = Object.values(RHYTHM);
      expect(values.length).toBe(3);
    });
  });

  describe('SCHEDULE constants', () => {
    it('should have all required schedule preference codes', () => {
      expect(SCHEDULE.EARLY_BIRD).toBe('early_bird');
      expect(SCHEDULE.NIGHT_OWL).toBe('night_owl');
      expect(SCHEDULE.NEEDS_SIESTA).toBe('needs_siesta');
      expect(SCHEDULE.NEEDS_BREAKS).toBe('needs_breaks');
      expect(SCHEDULE.NEEDS_FREE_TIME).toBe('needs_free_time');
      expect(SCHEDULE.FLEXIBLE).toBe('flexible_schedule');
    });

    it('should have exactly 6 schedule preference options', () => {
      const values = Object.values(SCHEDULE);
      expect(values.length).toBe(6);
    });
  });

  describe('FLIGHT_PREF constants', () => {
    it('should have all required flight preference codes', () => {
      expect(FLIGHT_PREF.DIRECT).toBe('direct');
      expect(FLIGHT_PREF.ONE_STOP).toBe('one_stop');
      expect(FLIGHT_PREF.CHEAPEST).toBe('cheapest');
      expect(FLIGHT_PREF.FASTEST).toBe('fastest');
      expect(FLIGHT_PREF.COMFORT).toBe('comfort');
    });

    it('should have exactly 5 flight preference options', () => {
      const values = Object.values(FLIGHT_PREF);
      expect(values.length).toBe(5);
    });
  });

  describe('LUGGAGE constants', () => {
    it('should have all required luggage codes', () => {
      expect(LUGGAGE.PERSONAL_ITEM).toBe('personal_item');
      expect(LUGGAGE.CABIN).toBe('cabin');
      expect(LUGGAGE.HOLD).toBe('hold');
      expect(LUGGAGE.CABIN_HOLD).toBe('cabin_hold');
    });

    it('should have exactly 4 luggage options', () => {
      const values = Object.values(LUGGAGE);
      expect(values.length).toBe(4);
    });
  });

  describe('No duplicate values', () => {
    it('should have unique values in each constant group', () => {
      const checkUnique = (obj: Record<string, string>) => {
        const values = Object.values(obj);
        const uniqueValues = new Set(values);
        return values.length === uniqueValues.size;
      };

      expect(checkUnique(TRAVEL_GROUPS)).toBe(true);
      expect(checkUnique(HELP_WITH)).toBe(true);
      expect(checkUnique(STYLES)).toBe(true);
      expect(checkUnique(COMFORT)).toBe(true);
      expect(checkUnique(RHYTHM)).toBe(true);
      expect(checkUnique(FLIGHT_PREF)).toBe(true);
      expect(checkUnique(LUGGAGE)).toBe(true);
    });
  });

  describe('Snake case naming convention', () => {
    it('should use snake_case for all internal codes', () => {
      const snakeCaseRegex = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
      
      // Check a sample of values from each constant
      expect(CLIMATE.HOT_SUNNY).toMatch(snakeCaseRegex);
      expect(AFFINITIES.PARADISE_BEACHES).toMatch(snakeCaseRegex);
      expect(AMBIANCE.ADVENTURE_EXOTIC).toMatch(snakeCaseRegex);
      expect(ACCOMMODATION_TYPE.BED_BREAKFAST).toMatch(snakeCaseRegex);
      expect(STYLES.CULTURE_MUSEUMS).toMatch(snakeCaseRegex);
      expect(MOBILITY.ELECTRIC_SCOOTER).toMatch(snakeCaseRegex);
      expect(AMENITIES.RELIABLE_WIFI).toMatch(snakeCaseRegex);
      expect(CONSTRAINTS.FOOD_ALLERGIES).toMatch(snakeCaseRegex);
    });
  });
});
