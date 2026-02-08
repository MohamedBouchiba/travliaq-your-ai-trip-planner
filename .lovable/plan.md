
# Plan: Correction Globale des Traductions du Planner

## Probleme
L'interface du planner affiche des textes en francais pour un utilisateur configure en anglais. Les traductions anglaises existent dans `planner.json` mais ne sont pas utilisees car le code utilise des chaines hardcodees.

## Fichiers a Modifier

### 1. suggestionEngine.ts (Priorite Critique)
**Probleme**: Toutes les suggestions sont hardcodees en francais (100+ lignes)
- `getInspirationSuggestions()` : "Inspire-moi", "Weekend au soleil", etc.
- `getDatesSuggestions()` : "Meilleure periode", "Ce weekend", etc.
- `getTravelersSuggestions()` : "Voyage solo", "En couple", etc.
- `getFlightSuggestions()` : "Vol a X euros", "Compare les vols", etc.
- `getStaysSuggestions()` : "Meilleur rapport qualite/prix", etc.
- `getActivitiesSuggestions()` : "Incontournables", "Hors des sentiers", etc.
- `getPreferencesSuggestions()` : "Optimise mon voyage", etc.
- `getSearchReadySuggestions()` : "Lancer la recherche", etc.
- `getDestinationChoiceSuggestions()` : "Choisis pour moi", etc.

**Solution**:
- Ajouter import de `i18n` depuis `@/i18n/config`
- Modifier chaque fonction pour utiliser `i18n.t('planner.suggestions.xxx')`
- Utiliser les cles existantes dans `planner.json`

### 2. useChatSessions.ts (Priorite Critique)
**Probleme**: Fallbacks et creations de sessions en francais
- Ligne 37-41: `DEFAULT_TRANSLATIONS` en francais
- Ligne 582-585: `"Nouvelle conversation"` hardcode dans `deleteAllSessions()`
- Ligne 631-632: `"Nouvelle conversation"` hardcode dans `getSessionMetadata()`

**Solution**:
- Supprimer ou modifier les fallbacks francais
- Utiliser systematiquement le parametre `translations` passe en option
- Pour les fonctions internes, utiliser `i18n.t()` directement

### 3. phaseDetector.ts (Priorite Moyenne)
**Probleme**: Labels de debug/UI en francais (ligne 230-238)
```typescript
{
  inspiration: { label: "Inspiration", ... },
  research: { label: "Recherche", ... },     // Francais
  comparison: { label: "Comparaison", ... }, // Francais
  planning: { label: "Planification", ... }, // Francais
  booking: { label: "Reservation", ... },    // Francais
}
```

**Solution**:
- Ajouter import `i18n`
- Utiliser `i18n.t('planner.phase.research')`, etc.
- Ajouter les nouvelles cles dans `planner.json` (EN et FR)

### 4. useChatImperativeHandlers.ts (Priorite Moyenne)
**Probleme**: Toasts et messages systeme en francais
- Ligne 122: `"Je vois que vous avez selectionne **${countryName}**..."`
- Ligne 179: `"depart"` / `"destination"`
- Ligne 187: `"La ville de **${choice.cityName}** a plusieurs aeroports..."`
- Ligne 203-204: `"depart"` / `"arrivee"`
- Ligne 234: `"Parfait ! Votre itineraire..."`
- Ligne 250, 257: toasts "Hebergement introuvable", etc.
- Ligne 281: `"J'ai identifie les aeroports..."`
- Ligne 301, 311, 331, 344: toasts activites
- Ligne 503-505: toast "Preferences detectees"

**Solution**:
- Ajouter import `{ useTranslation }` ou `i18n`
- Remplacer chaque chaine par `t('planner.toast.xxx')`
- Ajouter les nouvelles cles dans `planner.json`

### 5. contextualSuggestions.ts (Priorite Moyenne)
**Probleme**: Donnees saisonnieres hardcodees (lignes 33-76)
- `SEASONAL_DATA` contient des descriptions meteo en francais: "Frais", "Doux", "Chaud", "Tres chaud"
- `SUGGESTION_PRESETS` (lignes 290-294): titres et messages en francais

**Solution**:
- Pour `SEASONAL_DATA.weather`: utiliser des cles et traduire a l'affichage
- Pour `SUGGESTION_PRESETS`: utiliser `i18n.t()`
- Note: Ce fichier utilise deja `i18n.t()` pour certaines fonctions, donc c'est partiellement fait

### 6. messageAnalyzer.ts (Priorite Basse)
**Probleme**: `detectLanguage()` retourne 'fr' par defaut (ligne 486)
```typescript
return frCount >= enCount ? 'fr' : 'en';
```

**Solution**:
- Modifier pour utiliser `i18n.language` comme valeur par defaut quand le texte est vide ou ambigu
- Cela garantit que les suggestions dynamiques (`getAnticipatedSuggestions`) utilisent la bonne langue

### 7. Nouvelles Cles de Traduction
Ajouter dans `planner.json` (EN et FR):

```json
{
  "toast": {
    "accommodationNotFound": "Accommodation not found",
    "accommodationNotFoundDesc": "No accommodation found for {{city}}",
    "accommodationUpdated": "Accommodation updated",
    "accommodationUpdatedDesc": "Preferences for {{city}} have been modified",
    "activityNotFound": "No activity",
    "activityNotFoundDesc": "No activity found for {{city}}",
    "activityUpdated": "Activity updated",
    "activityUpdatedDesc": "{{count}} activity(ies) for {{city}} modified",
    "destinationNotFound": "Destination not found",
    "destinationNotFoundDesc": "No destination found for {{city}}",
    "activityAdded": "Activity added",
    "activityAddedDesc": "New activity for {{city}}",
    "preferencesDetected": "Preferences detected",
    "preferencesDetectedDesc": "AI detected: {{summary}}. Modify them in the Preferences tab."
  },
  "systemMessage": {
    "countrySelected": "I see you've selected **{{country}}**. Which city would you like to {{action}}?",
    "actionDepart": "depart from",
    "actionArrive": "arrive in",
    "multipleAirports": "The city of **{{city}}** has multiple airports. Which one would you like to use as {{fieldLabel}}?",
    "fieldDeparture": "departure",
    "fieldDestination": "destination",
    "multipleAirportsConfirm": "Multiple airports are available for {{locations}}. Select your preferences:",
    "routeReady": "Perfect! Your route **{{from}} -> {{to}}** is ready. Click below to search for flights.",
    "airportsIdentified": "I've identified the following airports for your multi-destination trip:\n\n{{legs}}\n\nYou can modify each airport below or confirm to launch the search."
  },
  "phase": {
    "inspiration": "Inspiration",
    "research": "Research",
    "comparison": "Comparison",
    "planning": "Planning",
    "booking": "Booking"
  }
}
```

## Ordre d'Implementation

1. **suggestionEngine.ts** - Impact visuel immediat (boutons de suggestion)
2. **useChatSessions.ts** - Titres et previews des sessions
3. **useChatImperativeHandlers.ts** - Messages systeme et toasts
4. **phaseDetector.ts** - Labels de phase
5. **contextualSuggestions.ts** - Presets saisonniers
6. **messageAnalyzer.ts** - Detection de langue par defaut
7. **planner.json (EN + FR)** - Nouvelles cles

## Details Techniques

### Pattern d'Import i18n
```typescript
// Dans les fichiers services (non-React)
import i18n from "@/i18n/config";
const t = i18n.t.bind(i18n);

// Exemple d'utilisation
const label = t('planner.suggestions.inspire');
```

### Pattern pour Substitutions
```typescript
// Avec variables
t('planner.suggestions.whereIn', { month: currentMonth })
// Resultat EN: "Where in March?"
// Resultat FR: "Ou en mars ?"
```

### Gestion des Mois
La fonction `getNextMonthName()` dans `suggestionEngine.ts` sera remplacee par:
```typescript
function getNextMonthKey(): string {
  const monthKeys = ['january', 'february', 'march', ...];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return monthKeys[nextMonth.getMonth()];
}

// Usage
const monthName = i18n.t(`planner.months.${getNextMonthKey()}`);
```

## Resultat Attendu

Apres correction, un utilisateur en anglais verra:
- Suggestions: "Inspire me", "Sunny weekend", "City break"
- Sessions: "New conversation", "Start the conversation..."
- Toasts: "Accommodation updated", "Activity added"
- Messages systeme: "I see you've selected **France**..."
- Phases: "Research", "Comparison", "Planning"
