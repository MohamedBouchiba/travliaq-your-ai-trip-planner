
# Remplacer les listes hardcodees par la base de donnees

## Objectif

Eliminer les tableaux statiques `knownDestinations` et `CITY_COORDINATES` en les remplacant par un cache alimente depuis les tables Supabase `cities`, `countries` et `search_autocomplete`. Le systeme s'adaptera automatiquement a toute nouvelle ville ou pays ajoute en base.

## Architecture

```text
                    App Boot
                       |
             DestinationIndex.init()
                       |
          +------------+------------+
          |                         |
   cities (top 5000)         countries (250)
   par population            tous
          |                         |
          +------> Index en         |
          |        memoire <--------+
          |        (Map)
          |
    Lookup O(1) par nom normalise
```

### Ce qui change

| Avant (statique) | Apres (DB) |
|---|---|
| `knownDestinations` : 60 noms hardcodes | `DestinationIndex.match(text)` : lookup dans un index de ~5250 entrees |
| `CITY_COORDINATES` : 25 villes hardcodees | `DestinationIndex.getCoords(name)` : coords depuis la DB |
| Ajouter une destination = modifier le code | Ajouter une destination = ajouter en base |

## Plan d'implementation

### Etape 1 : Creer le service `DestinationIndex`

**Nouveau fichier** : `src/services/destinationIndex.ts`

Ce service singleton charge les donnees une seule fois au demarrage, puis fournit des lookups instantanes.

**Donnees chargees** :
- `cities` : top 5000 par population (colonnes : `name`, `latitude`, `longitude`, `country`, `country_code`)
- `countries` : tous les 250 (colonnes : `name`, `iso2`)

**Structure interne** :
- `nameToCoords: Map<string, [lng, lat]>` -- noms normalises (lowercase, sans accents) vers coordonnees
- `allNames: Set<string>` -- ensemble de tous les noms pour le matching rapide
- `nameVariants: Map<string, string>` -- noms FR/EN : "espagne" -> "Spain", "thaïlande" -> "Thailand"

**API publique** :
- `init()` : charge les donnees (appele une fois, idempotent)
- `isReady(): boolean` : verifie si l'index est charge
- `getCoords(name: string): [number, number] | null` : remplace `getCityCoords`
- `match(text: string): string[]` : remplace `extractDestinationNames` -- extrait les noms de destinations trouves dans un texte
- `isKnownDestination(name: string): boolean` : verifie si un nom est une destination connue

**Normalisation** : `toLowerCase()` + suppression accents via `normalize('NFD').replace(/[\u0300-\u036f]/g, '')` pour matcher "Thaïlande" avec "thailande".

**Matching dans le texte** : au lieu de boucler sur 5000 noms a chaque message, on :
1. Tokenize le texte en mots
2. Teste chaque mot et chaque paire de mots consecutifs (pour "New York", "Bora Bora", etc.) contre le `Set`
3. Complexite : O(n) avec n = nombre de mots dans le message (typiquement < 50)

### Etape 2 : Initialiser au boot de l'application

**Fichier modifie** : `src/App.tsx` ou le composant racine du planner

Appeler `DestinationIndex.init()` au montage. C'est un appel asynchrone non-bloquant -- l'UI s'affiche immediatement, les lookups retournent des resultats vides jusqu'a ce que le chargement soit termine (graceful degradation).

### Etape 3 : Migrer `extractDestinationNames`

**Fichier modifie** : `src/components/planner/chat/services/messageAnalyzer.ts`

Remplacer :
```typescript
// AVANT : liste statique de 60 noms
const knownDestinations = ['Thaïlande', 'Thailand', ...];
for (const dest of knownDestinations) {
  if (text.toLowerCase().includes(dest.toLowerCase())) {
    destinations.push(dest);
  }
}
```

Par :
```typescript
// APRES : lookup dans l'index DB
import { destinationIndex } from '@/services/destinationIndex';
const destinations = destinationIndex.match(text);
```

### Etape 4 : Migrer `getCityCoords` et `CITY_COORDINATES`

**Fichier modifie** : `src/components/planner/chat/types.ts`

Garder `getCityCoords` comme fonction publique mais changer son implementation interne :

```typescript
// AVANT : objet statique de 25 villes
export const CITY_COORDINATES = { "paris": [2.35, 48.85], ... };
export function getCityCoords(name: string) {
  return CITY_COORDINATES[name.toLowerCase().trim()] || null;
}
```

```typescript
// APRES : delegation a l'index DB
import { destinationIndex } from '@/services/destinationIndex';
export function getCityCoords(name: string) {
  return destinationIndex.getCoords(name);
}
// CITY_COORDINATES garde pour fallback si l'index n'est pas encore charge
```

On garde `CITY_COORDINATES` comme fallback minimal (les 25 villes les plus courantes) pour le cas ou l'index n'est pas encore pret au moment d'un appel. Cela garantit zero regression.

### Etape 5 : Mettre a jour les tests

**Fichiers modifies** :
- `src/lib/suites/chatTypes.suite.ts` : les tests `getCityCoords` continuent de passer car l'API ne change pas
- `src/lib/suites/chatConversationSim.suite.ts` et `chatJourneysSim.suite.ts` : les tests de `extractDestinationNames` deviennent plus fiables car l'index couvre bien plus de destinations

Pour les tests unitaires qui s'executent sans Supabase, le fallback `CITY_COORDINATES` assure que les tests de base passent toujours. Pour les tests d'integration (browser), `init()` aura ete appele.

## Performance

- **Requetes DB** : 2 requetes au boot (cities top 5000 + countries 250). Taille estimee : ~200 KB de donnees, charge en < 500ms
- **Memoire** : ~5250 entrees dans des `Map/Set`. Negligeable (~1 MB)
- **Lookup** : O(1) pour `getCoords` et `isKnownDestination` ; O(n_mots) pour `match`
- **Cache** : les donnees sont chargees une seule fois par session, pas de re-fetch

## Fichiers concernes

| Fichier | Action |
|---|---|
| `src/services/destinationIndex.ts` | Creer (nouveau service) |
| `src/components/planner/chat/services/messageAnalyzer.ts` | Remplacer `knownDestinations` par `destinationIndex.match()` |
| `src/components/planner/chat/types.ts` | Migrer `getCityCoords` vers l'index, garder `CITY_COORDINATES` en fallback |
| `src/App.tsx` (ou composant planner) | Appeler `destinationIndex.init()` au boot |
| `src/lib/suites/chatTypes.suite.ts` | Aucun changement necessaire (API stable) |
