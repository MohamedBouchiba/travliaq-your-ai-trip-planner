/**
 * Multilingual System Prompts for Travel Assistant
 * 
 * This module provides language-agnostic prompt templates that are
 * dynamically filled based on the user's language preference.
 */

export type SupportedLanguage = "en" | "fr" | "es";

export interface LocalizedContent {
  // Core persona
  persona: string;
  // Response language instruction
  languageInstruction: string;
  // Date format hint
  dateFormatHint: string;
  // Default year
  defaultYear: string;
  // Emoji limit
  emojiLimit: string;
}

/**
 * Localized content for each supported language
 */
const LOCALIZED_CONTENT: Record<SupportedLanguage, LocalizedContent> = {
  fr: {
    persona: "Tu es un assistant de voyage bienveillant pour Travliaq.",
    languageInstruction: "Réponds en français",
    dateFormatHint: "Format de date: jj/mm/aaaa ou 'le 15 mars'",
    defaultYear: "", // Dynamically set via buildBaseSystemPrompt
    emojiLimit: "Maximum 2 emojis par message",
  },
  en: {
    persona: "You are a friendly travel assistant for Travliaq.",
    languageInstruction: "Respond in English",
    dateFormatHint: "Date format: mm/dd/yyyy or 'March 15th'",
    defaultYear: "", // Dynamically set via buildBaseSystemPrompt
    emojiLimit: "Maximum 2 emojis per message",
  },
  es: {
    persona: "Eres un asistente de viajes amable para Travliaq.",
    languageInstruction: "Responde en español",
    dateFormatHint: "Formato de fecha: dd/mm/aaaa o '15 de marzo'",
    defaultYear: "", // Dynamically set via buildBaseSystemPrompt
    emojiLimit: "Máximo 2 emojis por mensaje",
  },
};

/**
 * Step labels for different languages
 */
const STEP_LABELS: Record<SupportedLanguage, Record<string, string>> = {
  fr: {
    destination: "Destination",
    dates: "Dates",
    travelers: "Voyageurs",
    departure: "Ville de départ",
    confirmation: "Confirmation",
    citySelection: "Sélection de ville",
  },
  en: {
    destination: "Destination",
    dates: "Dates",
    travelers: "Travelers",
    departure: "Departure city",
    confirmation: "Confirmation",
    citySelection: "City selection",
  },
  es: {
    destination: "Destino",
    dates: "Fechas",
    travelers: "Viajeros",
    departure: "Ciudad de salida",
    confirmation: "Confirmación",
    citySelection: "Selección de ciudad",
  },
};

/**
 * Widget trigger phrases per language (for intent detection)
 */
const WIDGET_TRIGGER_PHRASES: Record<SupportedLanguage, Record<string, string[]>> = {
  fr: {
    destination: ["aller à", "visiter", "partir en", "direction", "vers"],
    dates: ["quand", "en février", "ce weekend", "la semaine prochaine"],
    travelers: ["nous sommes", "en famille", "entre amis", "solo", "seul", "en couple"],
    chooseForMe: ["choisis pour moi", "décide pour moi", "à toi de choisir", "je te fais confiance"],
    search: ["lance la recherche", "cherche", "trouve-moi"],
  },
  en: {
    destination: ["go to", "visit", "travel to", "heading to", "fly to"],
    dates: ["when", "in February", "this weekend", "next week"],
    travelers: ["we are", "with family", "with friends", "solo", "alone", "as a couple"],
    chooseForMe: ["choose for me", "decide for me", "you choose", "I trust you"],
    search: ["search", "find me", "look for"],
  },
  es: {
    destination: ["ir a", "visitar", "viajar a", "hacia", "volar a"],
    dates: ["cuándo", "en febrero", "este fin de semana", "la próxima semana"],
    travelers: ["somos", "en familia", "con amigos", "solo", "en pareja"],
    chooseForMe: ["elige por mí", "decide por mí", "tú eliges", "confío en ti"],
    search: ["busca", "encuentra", "buscar"],
  },
};

/**
 * Common questions/prompts per language
 */
const COMMON_PROMPTS: Record<SupportedLanguage, Record<string, string>> = {
  fr: {
    askDestination: "Où souhaites-tu aller ?",
    askDates: "Quand souhaites-tu partir ?",
    askTravelers: "Combien êtes-vous à voyager ?",
    askDeparture: "D'où pars-tu ?",
    confirmTrip: "Tout est prêt ! Récapitulatif de ton voyage :",
    countryDetected: "est une destination fascinante ! Voici les principales villes :",
    datesConfirmed: "Parfait ! Dates enregistrées.",
    travelersConfirmed: "Super ! Voyageurs configurés.",
  },
  en: {
    askDestination: "Where would you like to go?",
    askDates: "When would you like to travel?",
    askTravelers: "How many travelers?",
    askDeparture: "Where are you departing from?",
    confirmTrip: "All set! Here's your trip summary:",
    countryDetected: "is a fascinating destination! Here are the main cities:",
    datesConfirmed: "Perfect! Dates saved.",
    travelersConfirmed: "Great! Travelers configured.",
  },
  es: {
    askDestination: "¿A dónde te gustaría ir?",
    askDates: "¿Cuándo te gustaría viajar?",
    askTravelers: "¿Cuántos viajeros son?",
    askDeparture: "¿Desde dónde sales?",
    confirmTrip: "¡Todo listo! Resumen de tu viaje:",
    countryDetected: "¡es un destino fascinante! Aquí están las principales ciudades:",
    datesConfirmed: "¡Perfecto! Fechas guardadas.",
    travelersConfirmed: "¡Genial! Viajeros configurados.",
  },
};

/**
 * Get localized content for a specific language
 */
export function getLocalizedContent(language: SupportedLanguage): LocalizedContent {
  return LOCALIZED_CONTENT[language] || LOCALIZED_CONTENT.en;
}

/**
 * Get step labels for a specific language
 */
export function getStepLabels(language: SupportedLanguage): Record<string, string> {
  return STEP_LABELS[language] || STEP_LABELS.en;
}

/**
 * Get widget trigger phrases for a specific language
 */
export function getWidgetTriggerPhrases(language: SupportedLanguage): Record<string, string[]> {
  return WIDGET_TRIGGER_PHRASES[language] || WIDGET_TRIGGER_PHRASES.en;
}

/**
 * Get common prompts for a specific language
 */
export function getCommonPrompts(language: SupportedLanguage): Record<string, string> {
  return COMMON_PROMPTS[language] || COMMON_PROMPTS.en;
}

/**
 * Detect language from string (defaults to 'en')
 */
export function detectLanguage(lang?: string): SupportedLanguage {
  if (!lang) return "en";
  const normalized = lang.toLowerCase().slice(0, 2);
  if (normalized === "fr") return "fr";
  if (normalized === "es") return "es";
  return "en";
}

/**
 * Build the base system prompt with language-specific content
 */
export function buildBaseSystemPrompt(
  language: SupportedLanguage,
  currentDate: string
): string {
  const content = getLocalizedContent(language);
  const prompts = getCommonPrompts(language);

  const stepByStepRules = language === "fr" 
    ? `## RÈGLE D'OR : UNE ÉTAPE À LA FOIS
Tu ne poses qu'UNE SEULE question par message. Tu ne montres qu'UN SEUL widget à la fois.

## ORDRE STRICT DES ÉTAPES
1. DESTINATION - "${prompts.askDestination}"
2. DATES - "${prompts.askDates}" (after destination confirmed)
3. VOYAGEURS - "${prompts.askTravelers}" (after dates confirmed)
4. DÉPART - "${prompts.askDeparture}" (after travelers confirmed)
5. CONFIRMATION - "${prompts.confirmTrip}"`
    : language === "es"
    ? `## REGLA DE ORO: UN PASO A LA VEZ
Solo haces UNA pregunta por mensaje. Solo muestras UN widget a la vez.

## ORDEN ESTRICTO DE PASOS
1. DESTINO - "${prompts.askDestination}"
2. FECHAS - "${prompts.askDates}" (después de confirmar destino)
3. VIAJEROS - "${prompts.askTravelers}" (después de confirmar fechas)
4. SALIDA - "${prompts.askDeparture}" (después de confirmar viajeros)
5. CONFIRMACIÓN - "${prompts.confirmTrip}"`
    : `## GOLDEN RULE: ONE STEP AT A TIME
Ask only ONE question per message. Show only ONE widget at a time.

## STRICT STEP ORDER
1. DESTINATION - "${prompts.askDestination}"
2. DATES - "${prompts.askDates}" (after destination confirmed)
3. TRAVELERS - "${prompts.askTravelers}" (after dates confirmed)
4. DEPARTURE - "${prompts.askDeparture}" (after travelers confirmed)
5. CONFIRMATION - "${prompts.confirmTrip}"`;

  const currentYear = currentDate.split("-")[0] || new Date().getFullYear().toString();
  const defaultYearLine = language === "fr"
    ? `Année par défaut : ${currentYear}`
    : language === "es"
    ? `Año por defecto: ${currentYear}`
    : `Default year: ${currentYear}`;

  const dateRuleLine = language === "fr"
    ? `RÈGLE DATES: Toute date sans année explicite utilise ${currentYear}. Si la date résultante est dans le passé, utilise ${parseInt(currentYear) + 1}.`
    : language === "es"
    ? `REGLA FECHAS: Toda fecha sin año explícito usa ${currentYear}. Si la fecha resultante está en el pasado, usa ${parseInt(currentYear) + 1}.`
    : `DATE RULE: Any date without an explicit year uses ${currentYear}. If the resulting date is in the past, use ${parseInt(currentYear) + 1}.`;

  return `${content.persona}

${stepByStepRules}

## TECHNICAL INFO
- Current date: ${currentDate}
- ${defaultYearLine}
- ${dateRuleLine}
- ${content.languageInstruction}
- ${content.emojiLimit}`;
}

/**
 * Build choose-for-me instructions in the appropriate language
 */
export function buildChooseForMeInstructions(
  language: SupportedLanguage,
  activeWidgetsContext?: string
): string {
  if (!activeWidgetsContext) return "";

  const triggers = getWidgetTriggerPhrases(language);
  const triggerExamples = triggers.chooseForMe.map(t => `"${t}"`).join(", ");

  if (language === "fr") {
    return `
## INSTRUCTION "CHOISIS POUR MOI" (CRITIQUE)
Si l'utilisateur dit ${triggerExamples} :

1. Regarde les [WIDGETS ACTIFS] ci-dessous
2. Fais un choix logique basé sur son profil
3. Explique POURQUOI tu fais ce choix AVANT l'action
4. OBLIGATOIRE: Inclus une balise <action> pour exécuter le choix

### FORMAT DE L'ACTION
<action>{"type":"chooseWidget","widgetType":"[TYPE]","option":"[OPTION]","reason":"[RAISON]"}</action>

${activeWidgetsContext}`;
  }

  if (language === "es") {
    return `
## INSTRUCCIÓN "ELIGE POR MÍ" (CRÍTICO)
Si el usuario dice ${triggerExamples}:

1. Mira los [WIDGETS ACTIVOS] abajo
2. Haz una elección lógica basada en su perfil
3. Explica POR QUÉ haces esta elección ANTES de la acción
4. OBLIGATORIO: Incluye una etiqueta <action> para ejecutar la elección

### FORMATO DE LA ACCIÓN
<action>{"type":"chooseWidget","widgetType":"[TYPE]","option":"[OPTION]","reason":"[RAZÓN]"}</action>

${activeWidgetsContext}`;
  }

  // English default
  return `
## "CHOOSE FOR ME" INSTRUCTION (CRITICAL)
If the user says ${triggerExamples}:

1. Look at the [ACTIVE WIDGETS] below
2. Make a logical choice based on their profile
3. Explain WHY you're making this choice BEFORE the action
4. REQUIRED: Include an <action> tag to execute the choice

### ACTION FORMAT
<action>{"type":"chooseWidget","widgetType":"[TYPE]","option":"[OPTION]","reason":"[REASON]"}</action>

${activeWidgetsContext}`;
}
