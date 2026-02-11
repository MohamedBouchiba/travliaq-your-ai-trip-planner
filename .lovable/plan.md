
# Plan: Fix des 5 incohérences du debug snapshot + tests de non-régression

## Incohérences identifiées

### 1. Données fantômes dans rawResponses et toolExecutions
Le `debugStore` n'est jamais vidé entre deux sessions/conversations. Le `rawResponses[0]` contient la réponse Agadir d'une session précédente, et les `toolExecutions` mélangent des timestamps `13:13` (ancienne session) avec `13:45` (session courante).

### 2. `flightSummary` affiche "AUVERGNE (CFE)" au lieu de Bruxelles
Le départ dans le `plannerStoreV2` (persisté en localStorage) provient d'une ancienne session. L'utilisateur dit "à partir de bruxelles" mais le LLM ne renvoie pas de `flightData.from` (il renvoie `flightData: null`), donc le store n'est jamais mis à jour. Le `getMemorySummary()` lit l'ancien départ persisté.

### 3. `sessionEntities` vide malgré des infos claires
Les regex dans `useSessionContext.ts` (ligne 34-57) sont trop restrictives :
- **Destinations** : ne capturent que `aller/partir/voyager à [Ville]` mais pas "à partir de bruxelles" (ville de départ)
- **Dates** : ne capturent que des mois/saisons, pas "2 jours" (durée)
- **Budgets** : ne capturent que des montants ou presets, pas "la moins chers possible" (contrainte de coût)
- **Villes de départ** : aucun pattern n'existe

### 4. Langue de la première réponse
L'utilisateur écrit en français mais la réponse est "For commencer, où voudrais-tu aller depuis Bruxelles ?" -- un mélange qui semble correct dans ce cas, mais le `rawResponses[0]` (fantôme) est entièrement en anglais.

### 5. `missingFields` non contextuel
Les champs manquants listent tout (destination, date départ, date retour) dès le début au lieu de ne montrer que le prochain champ requis par la phase courante.

---

## Corrections

### Fichier 1: `src/components/planner/chat/hooks/useSessionContext.ts`

Enrichir les `ENTITY_PATTERNS` pour capturer :

```text
destinations:
  + /à partir de ([A-Z][a-z]+)/gi             -- "à partir de Bruxelles"
  + /depuis ([A-Z][a-z]+)/gi                   -- "depuis Bruxelles"
  + /(?:to|from|in) ([A-Z][a-z]+)/gi          -- EN patterns

budgets:
  + /(le |la )?(moins cher|cheapest|budget serré|pas cher|économique)/gi
  + /\$\s*(\d+)/gi                              -- "$2000"

dates:
  + /(\d+)\s*jours?/gi                          -- "2 jours"  
  + /(\d+)\s*semaines?/gi                       -- "3 semaines"
  + /(\d+)\s*days?/gi                           -- EN patterns
```

### Fichier 2: `src/components/planner/chat/hooks/useChatStream.ts` (ou le composant parent qui monte le chat)

Appeler `debugStore.clearAll()` lors de l'initialisation d'une nouvelle conversation, pour purger les données fantômes (rawResponses, toolExecutions, intent, reasoning).

Rechercher l'endroit exact où les messages sont initialisés (message welcome) et y ajouter :

```typescript
import { useDebugStore } from "@/stores/debugStore";
// ...
useEffect(() => {
  useDebugStore.getState().clearAll();
}, []); // On mount = new conversation
```

### Fichier 3: `src/components/planner/chat/hooks/useChatSubmit.ts`

Dans la section qui traite le `flightData`, ajouter l'extraction du départ depuis les `intentEntities` quand `flightData` est null :

```typescript
// Si pas de flightData mais intent a un departureCity, mettre à jour le départ
if (!flightData && intentClassification?.entities?.departureCity) {
  opts.updateMemory({ 
    departure: { city: intentClassification.entities.departureCity } 
  });
}
```

### Fichier 4: `src/lib/suites/chatJourneysSim.suite.ts` (ou nouvelle suite)

Ajouter des tests de non-régression pour `sessionEntities` :

```text
Test 1: "à partir de bruxelles" → sessionEntities.destinations contient "bruxelles"
Test 2: "depuis Paris" → sessionEntities.destinations contient "Paris"
Test 3: "2 jours" → sessionEntities.dates contient "2 jours"
Test 4: "la moins chers possible" → sessionEntities.budgets contient un match
Test 5: "$2000" → sessionEntities.budgets contient "2000"
Test 6: debugStore.clearAll() vide rawResponses et toolExecutions
```

---

## Résumé des fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/components/planner/chat/hooks/useSessionContext.ts` | Regex enrichies pour capturer départs, durées, et contraintes de coût |
| `src/components/planner/chat/hooks/useChatSubmit.ts` | Extraction du departureCity depuis intentEntities quand flightData est null |
| Composant parent du chat (à identifier) | Appel `debugStore.clearAll()` au montage pour purger les données fantômes |
| `src/lib/suites/sessionEntities.suite.ts` (nouveau) | Tests unitaires pour la capture d'entités et le nettoyage du debug store |
