// Valeurs internes du questionnaire (indépendantes de la langue)
// Ces valeurs sont stockées dans la base de données et ne changent pas avec la langue

export const TRAVEL_GROUPS = {
  SOLO: 'solo',
  DUO: 'duo',
  GROUP35: 'group35',
  FAMILY: 'family'
} as const;

export const YES_NO = {
  YES: 'yes',
  NO: 'no'
} as const;

export const HELP_WITH = {
  FLIGHTS: 'flights',
  ACCOMMODATION: 'accommodation',
  ACTIVITIES: 'activities'
} as const;

export const DATES_TYPE = {
  FIXED: 'fixed',
  FLEXIBLE: 'flexible'
} as const;

// ============= CLIMATE PREFERENCES =============
export const CLIMATE = {
  DONT_MIND: 'dont_mind',
  HOT_SUNNY: 'hot_sunny',
  MILD_SWEET: 'mild_sweet',
  COLD_SNOWY: 'cold_snowy',
  TROPICAL_HUMID: 'tropical_humid',
  MOUNTAIN_ALTITUDE: 'mountain_altitude',
  // Anciens codes gardés pour compatibilité
  HOT: 'hot',
  TEMPERATE: 'temperate',
  COLD: 'cold',
  TROPICAL: 'tropical',
  DRY: 'dry'
} as const;

// ============= TRAVEL AFFINITIES =============
export const AFFINITIES = {
  DONT_MIND: 'dont_mind',
  PARADISE_BEACHES: 'paradise_beaches',
  HISTORIC_CITIES: 'historic_cities',
  NATURE_HIKING: 'nature_hiking',
  SKI_WINTER_SPORTS: 'ski_winter_sports',
  SAFARI_ANIMALS: 'safari_animals',
  LOCAL_GASTRONOMY: 'local_gastronomy',
  SHOPPING_FASHION: 'shopping_fashion',
  FESTIVALS_EVENTS: 'festivals_events',
  MODERN_ARCHITECTURE: 'modern_architecture',
  TEMPLES_SPIRITUALITY: 'temples_spirituality',
  AMUSEMENT_PARKS: 'amusement_parks',
  DIVING_SNORKELING: 'diving_snorkeling',
  ROAD_TRIP_FREEDOM: 'road_trip_freedom',
  VINEYARDS_WINE: 'vineyards_wine',
  DESERTS_LUNAR: 'deserts_lunar',
  ISLANDS_ARCHIPELAGOS: 'islands_archipelagos',
  PHOTOGRAPHY: 'photography',
  ART_MUSEUMS: 'art_museums',
  WATER_SPORTS: 'water_sports',
  FISHING: 'fishing',
  SPAS_THERMAL: 'spas_thermal',
  CRUISES: 'cruises',
  LOCAL_MARKETS: 'local_markets',
  // Anciens codes gardés pour compatibilité
  BEACH: 'beach',
  MOUNTAIN: 'mountain',
  CITY: 'city',
  COUNTRYSIDE: 'countryside',
  DESERT: 'desert',
  ISLAND: 'island',
  SAFARI: 'safari',
  ROAD_TRIP: 'road_trip'
} as const;

// ============= TRAVEL AMBIANCE =============
export const AMBIANCE = {
  ADVENTURE_EXOTIC: 'adventure_exotic',
  RELAXATION: 'relaxation',
  ROMANCE_INTIMACY: 'romance_intimacy',
  CULTURAL_DISCOVERY: 'cultural_discovery',
  PARTY_NIGHTLIFE: 'party_nightlife',
  FAMILY_CONVIVIALITY: 'family_conviviality',
  // Anciens codes gardés pour compatibilité
  ADVENTURE: 'adventure',
  CULTURE: 'culture',
  PARTY: 'party',
  SPORT: 'sport',
  WELLNESS: 'wellness',
  ROMANTIC: 'romantic',
  FAMILY: 'family',
  DISCOVERY: 'discovery'
} as const;

// ============= ACCOMMODATION TYPES =============
export const ACCOMMODATION_TYPE = {
  DONT_MIND: 'dont_mind',
  HOTEL: 'hotel',
  APARTMENT: 'apartment',
  VILLA: 'villa',
  CHALET: 'chalet',
  CONDOMINIUM: 'condominium',
  HOSTEL: 'hostel',
  GUESTHOUSE: 'guesthouse',
  LODGE: 'lodge',
  CAMPING: 'camping',
  BED_BREAKFAST: 'bed_breakfast',
  RESORT: 'resort'
} as const;

// ============= HOTEL PREFERENCES =============
export const HOTEL_PREFERENCES = {
  DONT_MIND: 'dont_mind',
  BREAKFAST: 'breakfast',
  HALF_BOARD: 'half_board',
  FULL_BOARD: 'full_board',
  ALL_INCLUSIVE: 'all_inclusive',
  ROOM_SERVICE: 'room_service',
  MINIBAR: 'minibar',
  VIEW: 'view',
  BALCONY: 'balcony',
  CONCIERGE: 'concierge'
} as const;

// Hotel preferences avec repas (pour détection des contraintes alimentaires)
export const HOTEL_MEAL_PREFERENCES = [
  HOTEL_PREFERENCES.BREAKFAST,
  HOTEL_PREFERENCES.HALF_BOARD,
  HOTEL_PREFERENCES.FULL_BOARD,
  HOTEL_PREFERENCES.ALL_INCLUSIVE
] as const;

// ============= COMFORT LEVELS =============
export const COMFORT = {
  BASIC: 'basic',
  STANDARD: 'standard',
  COMFORT: 'comfort',
  PREMIUM: 'premium',
  LUXURY: 'luxury'
} as const;

// ============= DIETARY CONSTRAINTS =============
export const CONSTRAINTS = {
  DONT_MIND: 'dont_mind',
  HALAL: 'halal',
  KOSHER: 'kosher',
  VEGETARIAN: 'vegetarian',
  VEGAN: 'vegan',
  GLUTEN_FREE: 'gluten_free',
  NO_PORK: 'no_pork',
  NO_ALCOHOL: 'no_alcohol',
  PRAYER_PLACES: 'prayer_places',
  BUDDHIST: 'buddhist',
  ACCESSIBILITY: 'accessibility',
  SAFE_ZONES: 'safe_zones',
  AVOID_CAR: 'avoid_car',
  LOCAL_TRADITIONS: 'local_traditions',
  FOOD_ALLERGIES: 'food_allergies'
} as const;

// ============= MOBILITY =============
export const MOBILITY = {
  DONT_MIND: 'dont_mind',
  WALKING: 'walking',
  TAXI: 'taxi',
  RENTAL_CAR: 'rental_car',
  BIKE: 'bike',
  ELECTRIC_SCOOTER: 'electric_scooter',
  MOTORBIKE_SCOOTER: 'motorbike_scooter',
  TOURIST_BUS: 'tourist_bus',
  TRAIN_METRO: 'train_metro',
  FERRY: 'ferry',
  ATYPICAL: 'atypical',
  // Anciens codes gardés pour compatibilité
  VERY_MOBILE: 'very_mobile',
  MOBILE: 'mobile',
  LIMITED: 'limited',
  WHEELCHAIR: 'wheelchair'
} as const;

// ============= RHYTHM =============
export const RHYTHM = {
  RELAXED: 'relaxed',
  BALANCED: 'balanced',
  INTENSE: 'intense'
} as const;

// ============= SCHEDULE PREFERENCES =============
export const SCHEDULE = {
  EARLY_BIRD: 'early_bird',
  NIGHT_OWL: 'night_owl',
  NEEDS_SIESTA: 'needs_siesta',
  NEEDS_BREAKS: 'needs_breaks',
  NEEDS_FREE_TIME: 'needs_free_time',
  FLEXIBLE: 'flexible_schedule'
} as const;

// ============= FLIGHT PREFERENCES =============
export const FLIGHT_PREF = {
  DIRECT: 'direct',
  ONE_STOP: 'one_stop',
  CHEAPEST: 'cheapest',
  FASTEST: 'fastest',
  COMFORT: 'comfort'
} as const;

// ============= LUGGAGE =============
export const LUGGAGE = {
  PERSONAL_ITEM: 'personal_item',
  CABIN: 'cabin',
  HOLD: 'hold',
  CABIN_HOLD: 'cabin_hold'
} as const;

// ============= ACTIVITY STYLES =============
export const STYLES = {
  NATURE: 'nature',
  CULTURE_MUSEUMS: 'culture_museums',
  FOOD: 'food',
  BEACH: 'beach',
  MOUNTAIN_HIKING: 'mountain_hiking',
  PHOTO_SPOTS: 'photo_spots',
  LOCAL_MARKETS: 'local_markets',
  SPORT_OUTDOOR: 'sport_outdoor',
  WELLNESS_SPA: 'wellness_spa',
  NIGHTLIFE: 'nightlife'
} as const;

// ============= AMENITIES =============
export const AMENITIES = {
  DONT_MIND: 'dont_mind',
  RELIABLE_WIFI: 'reliable_wifi',
  AIR_CONDITIONING: 'air_conditioning',
  KITCHEN: 'kitchen',
  WASHING_MACHINE: 'washing_machine',
  PARKING: 'parking',
  ELEVATOR: 'elevator',
  RECEPTION_24: 'reception_24',
  BABY_CRIB: 'baby_crib',
  FAMILY_ROOM: 'family_room',
  POOL: 'pool',
  GYM: 'gym',
  SPA: 'spa',
  GARDEN_TERRACE: 'garden_terrace'
} as const;

// ============= NORMALISATION FUNCTIONS =============

export const normalizeTravelGroup = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (['solo', 'duo', 'group35', 'family'].includes(lowerValue)) return lowerValue;
  if (lowerValue === 'groupe 3-5' || lowerValue === 'group 3-5') return 'group35';
  if (lowerValue.includes('famille') || lowerValue.includes('family')) return 'family';
  
  return lowerValue;
};

export const normalizeYesNo = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (['yes', 'no', 'oui', 'non'].includes(lowerValue)) {
    return lowerValue === 'oui' ? 'yes' : lowerValue === 'non' ? 'no' : lowerValue;
  }
  
  return lowerValue;
};

export const normalizeDatesType = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (['fixed', 'flexible'].includes(lowerValue)) return lowerValue;
  if (lowerValue.includes('fixe') || lowerValue.includes('précise')) return 'fixed';
  if (lowerValue.includes('flexible')) return 'flexible';
  
  return lowerValue;
};

export const normalizeHelpWith = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (['flights', 'accommodation', 'activities'].includes(lowerValue)) return lowerValue;
  if (lowerValue.includes('vol') || lowerValue.includes('flight')) return 'flights';
  if (lowerValue.includes('hébergement') || lowerValue.includes('accommodation')) return 'accommodation';
  if (lowerValue.includes('activité') || lowerValue.includes('activities')) return 'activities';
  
  return lowerValue;
};

export const normalizeHelpWithArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeHelpWith(v)).filter(Boolean) as string[];
};

export const normalizeClimate = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(CLIMATE).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('importe') || lowerValue.includes("don't mind")) return CLIMATE.DONT_MIND;
  if (lowerValue.includes('chaud') || lowerValue.includes('hot') || lowerValue.includes('sunny') || lowerValue.includes('ensoleillé')) return CLIMATE.HOT_SUNNY;
  if (lowerValue.includes('doux') || lowerValue.includes('mild') || lowerValue.includes('tempéré') || lowerValue.includes('temperate')) return CLIMATE.MILD_SWEET;
  if (lowerValue.includes('froid') || lowerValue.includes('cold') || lowerValue.includes('neig') || lowerValue.includes('snowy')) return CLIMATE.COLD_SNOWY;
  if (lowerValue.includes('tropical') || lowerValue.includes('humide') || lowerValue.includes('humid')) return CLIMATE.TROPICAL_HUMID;
  if (lowerValue.includes('montagne') || lowerValue.includes('mountain') || lowerValue.includes('altitude')) return CLIMATE.MOUNTAIN_ALTITUDE;
  if (lowerValue.includes('sec') || lowerValue.includes('dry')) return CLIMATE.DRY;
  
  return lowerValue;
};

export const normalizeClimateArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeClimate(v)).filter(Boolean) as string[];
};

export const normalizeAffinity = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(AFFINITIES).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('importe') || lowerValue.includes("don't mind")) return AFFINITIES.DONT_MIND;
  if (lowerValue.includes('paradis') || lowerValue.includes('paradise') || (lowerValue.includes('plage') && lowerValue.includes('beach'))) return AFFINITIES.PARADISE_BEACHES;
  if (lowerValue.includes('historique') || lowerValue.includes('historic') || (lowerValue.includes('ville') && lowerValue.includes('city'))) return AFFINITIES.HISTORIC_CITIES;
  if (lowerValue.includes('nature') || lowerValue.includes('randonnée') || lowerValue.includes('hiking')) return AFFINITIES.NATURE_HIKING;
  if (lowerValue.includes('ski') || lowerValue.includes('winter') || lowerValue.includes('sports d\'hiver')) return AFFINITIES.SKI_WINTER_SPORTS;
  if (lowerValue.includes('safari') || lowerValue.includes('animaux') || lowerValue.includes('animals')) return AFFINITIES.SAFARI_ANIMALS;
  if (lowerValue.includes('gastronomie') || lowerValue.includes('gastronomy') || lowerValue.includes('locale')) return AFFINITIES.LOCAL_GASTRONOMY;
  if (lowerValue.includes('shopping') || lowerValue.includes('mode') || lowerValue.includes('fashion')) return AFFINITIES.SHOPPING_FASHION;
  if (lowerValue.includes('festival') || lowerValue.includes('events') || lowerValue.includes('événements')) return AFFINITIES.FESTIVALS_EVENTS;
  if (lowerValue.includes('architecture') || lowerValue.includes('moderne') || lowerValue.includes('modern')) return AFFINITIES.MODERN_ARCHITECTURE;
  if (lowerValue.includes('temple') || lowerValue.includes('spiritualité') || lowerValue.includes('spirituality')) return AFFINITIES.TEMPLES_SPIRITUALITY;
  if (lowerValue.includes('attraction') || lowerValue.includes('amusement') || lowerValue.includes('parcs')) return AFFINITIES.AMUSEMENT_PARKS;
  if (lowerValue.includes('plongée') || lowerValue.includes('diving') || lowerValue.includes('snorkeling')) return AFFINITIES.DIVING_SNORKELING;
  if (lowerValue.includes('road trip') || lowerValue.includes('liberté') || lowerValue.includes('freedom')) return AFFINITIES.ROAD_TRIP_FREEDOM;
  if (lowerValue.includes('vignoble') || lowerValue.includes('vineyard') || lowerValue.includes('vin') || lowerValue.includes('wine')) return AFFINITIES.VINEYARDS_WINE;
  if (lowerValue.includes('désert') || lowerValue.includes('desert') || lowerValue.includes('lunaire') || lowerValue.includes('lunar')) return AFFINITIES.DESERTS_LUNAR;
  if (lowerValue.includes('île') || lowerValue.includes('island') || lowerValue.includes('archipel') || lowerValue.includes('archipelago')) return AFFINITIES.ISLANDS_ARCHIPELAGOS;
  // Fallbacks vers anciens codes
  if (lowerValue.includes('plage') || lowerValue.includes('beach')) return AFFINITIES.BEACH;
  if (lowerValue.includes('montagne') || lowerValue.includes('mountain')) return AFFINITIES.MOUNTAIN;
  if (lowerValue.includes('ville') || lowerValue.includes('city')) return AFFINITIES.CITY;
  if (lowerValue.includes('campagne') || lowerValue.includes('countryside')) return AFFINITIES.COUNTRYSIDE;
  
  return lowerValue;
};

export const normalizeAffinityArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeAffinity(v)).filter(Boolean) as string[];
};

export const normalizeAmbiance = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(AMBIANCE).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('aventure') || lowerValue.includes('adventure') || lowerValue.includes('exotic') || lowerValue.includes('exotique')) return AMBIANCE.ADVENTURE_EXOTIC;
  if (lowerValue.includes('relaxation') || lowerValue.includes('détente')) return AMBIANCE.RELAXATION;
  if (lowerValue.includes('romance') || lowerValue.includes('romantique') || lowerValue.includes('intimacy') || lowerValue.includes('intimité')) return AMBIANCE.ROMANCE_INTIMACY;
  if (lowerValue.includes('culture') || lowerValue.includes('découverte') || lowerValue.includes('discovery')) return AMBIANCE.CULTURAL_DISCOVERY;
  if (lowerValue.includes('fête') || lowerValue.includes('party') || lowerValue.includes('nightlife') || lowerValue.includes('nocturne')) return AMBIANCE.PARTY_NIGHTLIFE;
  if (lowerValue.includes('famille') || lowerValue.includes('family') || lowerValue.includes('conviviality') || lowerValue.includes('convivialité')) return AMBIANCE.FAMILY_CONVIVIALITY;
  // Fallbacks vers anciens codes
  if (lowerValue.includes('sport')) return AMBIANCE.SPORT;
  if (lowerValue.includes('bien-être') || lowerValue.includes('wellness')) return AMBIANCE.WELLNESS;
  
  return lowerValue;
};

export const normalizeAccommodationType = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(ACCOMMODATION_TYPE).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('importe') || lowerValue.includes("don't mind")) return ACCOMMODATION_TYPE.DONT_MIND;
  if (lowerValue.includes('hôtel') || lowerValue.includes('hotel')) return ACCOMMODATION_TYPE.HOTEL;
  if (lowerValue.includes('appartement') || lowerValue.includes('apartment')) return ACCOMMODATION_TYPE.APARTMENT;
  if (lowerValue.includes('villa')) return ACCOMMODATION_TYPE.VILLA;
  if (lowerValue.includes('auberge') || lowerValue.includes('hostel')) return ACCOMMODATION_TYPE.HOSTEL;
  if (lowerValue.includes('maison') || lowerValue.includes('guesthouse') || lowerValue.includes('riad')) return ACCOMMODATION_TYPE.GUESTHOUSE;
  if (lowerValue.includes('lodge') || lowerValue.includes('eco')) return ACCOMMODATION_TYPE.LODGE;
  if (lowerValue.includes('camping') || lowerValue.includes('glamping')) return ACCOMMODATION_TYPE.CAMPING;
  if (lowerValue.includes('chambre') || lowerValue.includes('bed') || lowerValue.includes('breakfast')) return ACCOMMODATION_TYPE.BED_BREAKFAST;
  if (lowerValue.includes('resort')) return ACCOMMODATION_TYPE.RESORT;
  
  return lowerValue;
};

export const normalizeAccommodationTypeArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeAccommodationType(v)).filter(Boolean) as string[];
};

export const normalizeHotelPreference = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(HOTEL_PREFERENCES).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('importe') || lowerValue.includes("don't mind")) return HOTEL_PREFERENCES.DONT_MIND;
  if (lowerValue.includes('breakfast') || lowerValue.includes('déjeuner')) return HOTEL_PREFERENCES.BREAKFAST;
  if (lowerValue.includes('half') || lowerValue.includes('demi')) return HOTEL_PREFERENCES.HALF_BOARD;
  if (lowerValue.includes('full') || lowerValue.includes('complète') || lowerValue.includes('complete')) return HOTEL_PREFERENCES.FULL_BOARD;
  if (lowerValue.includes('inclusive')) return HOTEL_PREFERENCES.ALL_INCLUSIVE;
  if (lowerValue.includes('room service')) return HOTEL_PREFERENCES.ROOM_SERVICE;
  if (lowerValue.includes('minibar')) return HOTEL_PREFERENCES.MINIBAR;
  if (lowerValue.includes('view') || lowerValue.includes('vue')) return HOTEL_PREFERENCES.VIEW;
  if (lowerValue.includes('balcon') || lowerValue.includes('balcony') || lowerValue.includes('terrasse') || lowerValue.includes('terrace')) return HOTEL_PREFERENCES.BALCONY;
  if (lowerValue.includes('concierge')) return HOTEL_PREFERENCES.CONCIERGE;
  
  return lowerValue;
};

export const normalizeHotelPreferencesArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeHotelPreference(v)).filter(Boolean) as string[];
};

export const normalizeComfort = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(COMFORT).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('basique') || lowerValue.includes('basic') || lowerValue === '1') return COMFORT.BASIC;
  if (lowerValue.includes('standard') || lowerValue === '2' || lowerValue === '3') return COMFORT.STANDARD;
  if (lowerValue.includes('confort') || lowerValue.includes('comfort') || lowerValue === '4') return COMFORT.COMFORT;
  if (lowerValue.includes('premium') || lowerValue.includes('supérieur') || lowerValue === '5') return COMFORT.PREMIUM;
  if (lowerValue.includes('luxe') || lowerValue.includes('luxury')) return COMFORT.LUXURY;
  
  return lowerValue;
};

export const normalizeConstraint = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(CONSTRAINTS).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('importe') || lowerValue.includes("don't mind")) return CONSTRAINTS.DONT_MIND;
  if (lowerValue.includes('halal')) return CONSTRAINTS.HALAL;
  if (lowerValue.includes('casher') || lowerValue.includes('kosher')) return CONSTRAINTS.KOSHER;
  if (lowerValue.includes('végétarien') || lowerValue.includes('vegetarian')) return CONSTRAINTS.VEGETARIAN;
  if (lowerValue.includes('vegan') || lowerValue.includes('végétalien')) return CONSTRAINTS.VEGAN;
  if (lowerValue.includes('gluten') || lowerValue.includes('sans gluten')) return CONSTRAINTS.GLUTEN_FREE;
  if (lowerValue.includes('porc') || lowerValue.includes('pork')) return CONSTRAINTS.NO_PORK;
  if (lowerValue.includes('alcool') || lowerValue.includes('alcohol')) return CONSTRAINTS.NO_ALCOHOL;
  if (lowerValue.includes('prière') || lowerValue.includes('prayer')) return CONSTRAINTS.PRAYER_PLACES;
  if (lowerValue.includes('bouddhist') || lowerValue.includes('buddhist')) return CONSTRAINTS.BUDDHIST;
  if (lowerValue.includes('accessibilité') || lowerValue.includes('accessibility')) return CONSTRAINTS.ACCESSIBILITY;
  if (lowerValue.includes('sécurisée') || lowerValue.includes('safe') || lowerValue.includes('zone')) return CONSTRAINTS.SAFE_ZONES;
  if (lowerValue.includes('voiture') || lowerValue.includes('car') || lowerValue.includes('avoid')) return CONSTRAINTS.AVOID_CAR;
  if (lowerValue.includes('tradition') || lowerValue.includes('locale') || lowerValue.includes('local')) return CONSTRAINTS.LOCAL_TRADITIONS;
  if (lowerValue.includes('allergie') || lowerValue.includes('allerg')) return CONSTRAINTS.FOOD_ALLERGIES;
  
  return lowerValue;
};

export const normalizeConstraintsArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeConstraint(v)).filter(Boolean) as string[];
};

export const normalizeMobility = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(MOBILITY).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('importe') || lowerValue.includes("don't mind")) return MOBILITY.DONT_MIND;
  if (lowerValue.includes('marche') || lowerValue.includes('walking') || lowerValue.includes('pied')) return MOBILITY.WALKING;
  if (lowerValue.includes('taxi')) return MOBILITY.TAXI;
  if (lowerValue.includes('location') || lowerValue.includes('rental') || (lowerValue.includes('voiture') && lowerValue.includes('location'))) return MOBILITY.RENTAL_CAR;
  if (lowerValue.includes('vélo') || lowerValue.includes('bike')) return MOBILITY.BIKE;
  if (lowerValue.includes('trottinette') || lowerValue.includes('electric scooter')) return MOBILITY.ELECTRIC_SCOOTER;
  if (lowerValue.includes('moto') || lowerValue.includes('motorbike') || lowerValue.includes('scooter')) return MOBILITY.MOTORBIKE_SCOOTER;
  if (lowerValue.includes('touristique') || lowerValue.includes('tourist') || lowerValue.includes('bus')) return MOBILITY.TOURIST_BUS;
  if (lowerValue.includes('train') || lowerValue.includes('métro') || lowerValue.includes('metro')) return MOBILITY.TRAIN_METRO;
  if (lowerValue.includes('ferry') || lowerValue.includes('bateau')) return MOBILITY.FERRY;
  if (lowerValue.includes('atypique') || lowerValue.includes('atypical')) return MOBILITY.ATYPICAL;
  // Anciens codes
  if (lowerValue.includes('très mobile') || lowerValue.includes('very mobile')) return MOBILITY.VERY_MOBILE;
  if (lowerValue.includes('mobile') && !lowerValue.includes('très')) return MOBILITY.MOBILE;
  if (lowerValue.includes('limitée') || lowerValue.includes('limited')) return MOBILITY.LIMITED;
  if (lowerValue.includes('fauteuil') || lowerValue.includes('wheelchair')) return MOBILITY.WHEELCHAIR;
  
  return lowerValue;
};

export const normalizeRhythm = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(RHYTHM).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('relax') || lowerValue.includes('posé') || lowerValue.includes('tranquille')) return RHYTHM.RELAXED;
  if (lowerValue.includes('équilibré') || lowerValue.includes('balanced')) return RHYTHM.BALANCED;
  if (lowerValue.includes('intense') || lowerValue.includes('soutenu')) return RHYTHM.INTENSE;
  
  return lowerValue;
};

export const normalizeSchedulePref = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(SCHEDULE).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('matinal') || lowerValue.includes('early bird')) return SCHEDULE.EARLY_BIRD;
  if (lowerValue.includes('couche-tard') || lowerValue.includes('night owl')) return SCHEDULE.NIGHT_OWL;
  if (lowerValue.includes('sieste') || lowerValue.includes('siesta')) return SCHEDULE.NEEDS_SIESTA;
  if (lowerValue.includes('pause') || lowerValue.includes('breaks')) return SCHEDULE.NEEDS_BREAKS;
  if (lowerValue.includes('temps libre') || lowerValue.includes('free time')) return SCHEDULE.NEEDS_FREE_TIME;
  if (lowerValue.includes('flexible')) return SCHEDULE.FLEXIBLE;
  
  return lowerValue;
};

export const normalizeSchedulePrefsArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeSchedulePref(v)).filter(Boolean) as string[];
};

export const normalizeFlightPref = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(FLIGHT_PREF).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('direct')) return FLIGHT_PREF.DIRECT;
  if (lowerValue.includes('escale') || lowerValue.includes('stop')) return FLIGHT_PREF.ONE_STOP;
  if (lowerValue.includes('moins cher') || lowerValue.includes('cheapest')) return FLIGHT_PREF.CHEAPEST;
  if (lowerValue.includes('rapide') || lowerValue.includes('fastest')) return FLIGHT_PREF.FASTEST;
  if (lowerValue.includes('confort') || lowerValue.includes('comfort')) return FLIGHT_PREF.COMFORT;
  
  return lowerValue;
};

export const normalizeStyle = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(STYLES).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('nature')) return STYLES.NATURE;
  if (lowerValue.includes('culture') || lowerValue.includes('musée') || lowerValue.includes('museum')) return STYLES.CULTURE_MUSEUMS;
  if (lowerValue.includes('gastronomie') || lowerValue.includes('food') || lowerValue.includes('restaurant')) return STYLES.FOOD;
  if (lowerValue.includes('plage') || lowerValue.includes('beach')) return STYLES.BEACH;
  if (lowerValue.includes('montagne') || lowerValue.includes('mountain') || lowerValue.includes('randonnée') || lowerValue.includes('hiking')) return STYLES.MOUNTAIN_HIKING;
  if (lowerValue.includes('photo')) return STYLES.PHOTO_SPOTS;
  if (lowerValue.includes('marché') || lowerValue.includes('market') || lowerValue.includes('locaux') || lowerValue.includes('local')) return STYLES.LOCAL_MARKETS;
  if (lowerValue.includes('sport') || lowerValue.includes('outdoor')) return STYLES.SPORT_OUTDOOR;
  if (lowerValue.includes('bien-être') || lowerValue.includes('wellness') || lowerValue.includes('spa')) return STYLES.WELLNESS_SPA;
  if (lowerValue.includes('nightlife') || lowerValue.includes('nuit') || lowerValue.includes('fête')) return STYLES.NIGHTLIFE;
  
  return lowerValue;
};

export const normalizeStylesArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeStyle(v)).filter(Boolean) as string[];
};

export const normalizeAmenity = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(AMENITIES).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('importe') || lowerValue.includes("don't mind")) return AMENITIES.DONT_MIND;
  if (lowerValue.includes('wifi')) return AMENITIES.RELIABLE_WIFI;
  if (lowerValue.includes('climatisation') || lowerValue.includes('air') || lowerValue.includes('conditioning')) return AMENITIES.AIR_CONDITIONING;
  if (lowerValue.includes('cuisine') || lowerValue.includes('kitchen')) return AMENITIES.KITCHEN;
  if (lowerValue.includes('linge') || lowerValue.includes('washing') || lowerValue.includes('machine')) return AMENITIES.WASHING_MACHINE;
  if (lowerValue.includes('parking')) return AMENITIES.PARKING;
  if (lowerValue.includes('ascenseur') || lowerValue.includes('elevator')) return AMENITIES.ELEVATOR;
  if (lowerValue.includes('réception') || lowerValue.includes('reception') || lowerValue.includes('24')) return AMENITIES.RECEPTION_24;
  if (lowerValue.includes('bébé') || lowerValue.includes('baby') || lowerValue.includes('berceau') || lowerValue.includes('crib')) return AMENITIES.BABY_CRIB;
  if (lowerValue.includes('familiale') || lowerValue.includes('family') || lowerValue.includes('room')) return AMENITIES.FAMILY_ROOM;
  if (lowerValue.includes('piscine') || lowerValue.includes('pool')) return AMENITIES.POOL;
  if (lowerValue.includes('gym') || lowerValue.includes('salle de sport')) return AMENITIES.GYM;
  if (lowerValue.includes('spa')) return AMENITIES.SPA;
  if (lowerValue.includes('jardin') || lowerValue.includes('garden') || lowerValue.includes('terrasse') || lowerValue.includes('terrace')) return AMENITIES.GARDEN_TERRACE;
  
  return lowerValue;
};

export const normalizeAmenitiesArray = (values: string[] | undefined): string[] => {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => normalizeAmenity(v)).filter(Boolean) as string[];
};

export const normalizeLuggage = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  if (Object.values(LUGGAGE).includes(lowerValue as any)) return lowerValue;
  if (lowerValue.includes('personnel') || lowerValue.includes('personal')) return LUGGAGE.PERSONAL_ITEM;
  if (lowerValue.includes('cabine') && !lowerValue.includes('soute') && !lowerValue.includes('hold')) return LUGGAGE.CABIN;
  if (lowerValue.includes('soute') && !lowerValue.includes('cabine') || (lowerValue.includes('hold') && !lowerValue.includes('cabin'))) return LUGGAGE.HOLD;
  if ((lowerValue.includes('cabine') && lowerValue.includes('soute')) || (lowerValue.includes('cabin') && lowerValue.includes('hold'))) return LUGGAGE.CABIN_HOLD;
  
  return lowerValue;
};

// ============= LABEL GETTERS (pour affichage depuis codes) =============

export const getTravelGroupLabel = (value: string) => {
  const normalized = normalizeTravelGroup(value);
  const map: Record<string, string> = {
    'solo': 'questionnaire.solo',
    'duo': 'questionnaire.duo',
    'group35': 'questionnaire.group35',
    'family': 'questionnaire.family'
  };
  return map[normalized || ''] || value;
};

export const getYesNoLabel = (value: string) => {
  const normalized = normalizeYesNo(value);
  const map: Record<string, string> = {
    'yes': 'questionnaire.yes',
    'no': 'questionnaire.no'
  };
  return map[normalized || ''] || value;
};

export const getHelpWithLabel = (value: string) => {
  const map: Record<string, string> = {
    'flights': 'questionnaire.flights',
    'accommodation': 'questionnaire.accommodation',
    'activities': 'questionnaire.activities'
  };
  return map[value] || value;
};

export const getDatesTypeLabel = (value: string) => {
  const normalized = normalizeDatesType(value);
  const map: Record<string, string> = {
    'fixed': 'questionnaire.dates.fixed',
    'flexible': 'questionnaire.dates.flexible'
  };
  return map[normalized || ''] || value;
};

export const getRhythmLabel = (value: string) => {
  const map: Record<string, string> = {
    'relaxed': 'questionnaire.rhythm.relaxed',
    'balanced': 'questionnaire.rhythm.balanced',
    'intense': 'questionnaire.rhythm.intense',
  };
  return map[value] || value;
};

export const getSchedulePrefLabel = (value: string) => {
  const map: Record<string, string> = {
    'early_bird': 'questionnaire.schedule.earlyBird',
    'night_owl': 'questionnaire.schedule.nightOwl',
    'needs_siesta': 'questionnaire.schedule.needsSiesta',
    'needs_breaks': 'questionnaire.schedule.needsBreaks',
    'needs_free_time': 'questionnaire.schedule.needsFreeTime',
    'flexible_schedule': 'questionnaire.schedule.flexibleSchedule',
  };
  return map[value] || value;
};

export const getHotelPreferenceLabel = (value: string) => {
  const map: Record<string, string> = {
    'dont_mind': 'questionnaire.hotelPreferences.dontMind',
    'breakfast': 'questionnaire.hotelPreferences.breakfast',
    'half_board': 'questionnaire.hotelPreferences.halfBoard',
    'full_board': 'questionnaire.hotelPreferences.fullBoard',
    'all_inclusive': 'questionnaire.hotelPreferences.allInclusive',
    'room_service': 'questionnaire.hotelPreferences.roomService',
    'minibar': 'questionnaire.hotelPreferences.minibar',
    'view': 'questionnaire.hotelPreferences.view',
    'balcony': 'questionnaire.hotelPreferences.balcony',
    'concierge': 'questionnaire.hotelPreferences.concierge',
  };
  return map[value] || value;
};
