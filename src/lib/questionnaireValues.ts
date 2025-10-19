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

// Normaliser les valeurs traduites vers les codes internes
// Accepte à la fois les codes (solo, duo) et les labels traduits (Solo, Duo, etc.)
export const normalizeTravelGroup = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase().trim();
  
  // Si c'est déjà un code interne, le retourner
  if (['solo', 'duo', 'group35', 'family'].includes(lowerValue)) {
    return lowerValue;
  }
  
  // Sinon, essayer de détecter depuis les labels traduits
  if (lowerValue === 'groupe 3-5' || lowerValue === 'group 3-5') return 'group35';
  if (lowerValue.includes('famille') || lowerValue.includes('family')) return 'family';
  
  return lowerValue; // Retourner la valeur normalisée
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
  
  // Si c'est déjà un code interne
  if (['fixed', 'flexible'].includes(lowerValue)) {
    return lowerValue;
  }
  
  // Détecter depuis les labels traduits
  if (lowerValue.includes('fixe') || lowerValue.includes('précise')) return 'fixed';
  if (lowerValue.includes('flexible')) return 'flexible';
  
  return lowerValue;
};

// Helper pour obtenir la clé de traduction à partir de la valeur
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

// Rhythm mapping
export const getRhythmLabel = (value: string) => {
  const map: Record<string, string> = {
    'relaxed': 'questionnaire.rhythm.relaxed',
    'balanced': 'questionnaire.rhythm.balanced',
    'intense': 'questionnaire.rhythm.intense',
  };
  return map[value] || value;
};

// Schedule preferences mapping
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
