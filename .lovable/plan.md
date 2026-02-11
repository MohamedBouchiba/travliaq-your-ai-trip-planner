

# Plan: Fix du bug d'année dans les dates + tests de non-régression

## Problème identifié

Le système a 3 points où l'année est hardcodée ou absente :

1. **`systemPrompts.ts`** (ligne 31, 38, 45) : `defaultYear: "Année par défaut : 2025"` -- hardcodé à 2025 dans les 3 langues
2. **`phasePrompts.ts`** (ligne 228) : `Année par défaut : 2025` -- hardcodé
3. **`buildClassificationSystemPrompt()`** dans `index.ts` (ligne 407) : Le prompt de classification ne contient **aucune référence à la date actuelle**. Le LLM doit donc deviner l'année, ce qui explique `2024-05-04` dans l'extraction.
4. **`flightExtractor.ts`** et **`intentClassifier.ts`** : Les descriptions des champs `departureDate` et `exactDepartureDate` ne mentionnent pas l'année courante, le LLM n'a aucun contexte temporel.

## Cause racine

Le LLM qui fait la classification d'intent et l'extraction de vol n'a **pas accès à `currentDate`** dans son prompt système. Il invente l'année. En parallèle, les prompts principaux disent "2025" en dur au lieu d'utiliser la date dynamique déjà calculée (`currentDate` en ligne 626).

## Corrections

### 1. Rendre `defaultYear` dynamique dans `systemPrompts.ts`

Remplacer le champ `defaultYear` hardcodé par une fonction qui utilise l'année courante :

```typescript
// Avant
defaultYear: "Année par défaut : 2025",

// Après : supprimer le champ statique, utiliser currentDate dans buildBaseSystemPrompt
```

Concrètement, dans `buildBaseSystemPrompt()`, remplacer `${content.defaultYear}` par l'année extraite de `currentDate`.

### 2. Rendre `phasePrompts.ts` dynamique

Ligne 228 : remplacer `Année par défaut : 2025` par l'année extraite de `currentDate` (déjà passé en paramètre).

### 3. Injecter `currentDate` dans `buildClassificationSystemPrompt()`

Ajouter un paramètre `currentDate: string` et l'inclure dans le prompt :

```text
DATE ACTUELLE: ${currentDate}
RÈGLE: Toute date sans année explicite utilise l'année de la date actuelle. 
Si la date résultante est dans le passé, utilise l'année suivante.
```

Mettre à jour l'appel dans `index.ts` ligne 671 pour passer `currentDate`.

### 4. Enrichir les descriptions de dates dans les outils

Dans **`intentClassifier.ts`** (champ `exactDepartureDate`) et **`flightExtractor.ts`** (champ `departureDate`), ajouter dans la description :

```
"Format YYYY-MM-DD. Si l'utilisateur ne précise pas l'année, utilise l'année de la date actuelle fournie dans le prompt système. Si la date résultante est passée, utilise l'année suivante."
```

### 5. Ajouter une validation côté serveur dans `index.ts`

Après extraction des dates par les outils, ajouter une fonction `normalizeExtractedYear()` qui :
- Compare les dates extraites à `currentDate`
- Si l'année est dans le passé, la corrige vers l'année courante ou suivante
- Applique cette correction à `flightData.departureDate`, `flightData.returnDate`, `intentClassification.entities.exactDepartureDate`, `intentClassification.entities.exactReturnDate`

C'est un filet de sécurité car le LLM peut toujours halluciner malgré les instructions.

## Tests de non-régression

Ajouter une nouvelle suite ou enrichir une suite existante avec ces cas :

### Dans `chatCoherence.suite.ts` ou nouvelle suite `dateNormalization.suite.ts`

```text
Test 1: "le 4 mai" sans année → doit produire 2026-05-04 (année courante)
Test 2: "le 15 janvier" (mois passé si on est en février 2026) → doit produire 2027-01-15
Test 3: "pour le 4/5 mai" → doit extraire departureDate: 2026-05-04, pas 2024 ou 2025
Test 4: Date explicite avec année "le 4 mai 2027" → garde 2027
Test 5: "3 jours" + departureDate sans année → durée OK, année corrigée
```

Ces tests valideront la fonction `normalizeExtractedYear()` de manière unitaire.

## Résumé des fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/planner-chat/prompts/systemPrompts.ts` | `defaultYear` dynamique basé sur `currentDate` |
| `supabase/functions/planner-chat/prompts/phasePrompts.ts` | Année dynamique ligne 228 |
| `supabase/functions/planner-chat/index.ts` | Passer `currentDate` à `buildClassificationSystemPrompt()`, ajouter `normalizeExtractedYear()` |
| `supabase/functions/planner-chat/tools/intentClassifier.ts` | Description enrichie pour `exactDepartureDate`/`exactReturnDate` |
| `supabase/functions/planner-chat/tools/flightExtractor.ts` | Description enrichie pour `departureDate`/`returnDate` |
| `src/lib/suites/dateNormalization.suite.ts` | Nouvelle suite de tests pour la normalisation des années |

