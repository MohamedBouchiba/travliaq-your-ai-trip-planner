
## Plan : Corriger les prix de vols qui ne chargent jamais sur la carte

### Diagnostic

Apres investigation en direct (navigation sur /planner, envoi de "Je pars de Bruxelles", verification des logs et requetes reseau) :

1. **airports-in-bounds** est appele et retourne 25 aeroports -> les marqueurs avec loading dots s'affichent
2. **map-prices** n'est JAMAIS appele par le navigateur (0 requetes dans les logs analytics et les network requests)
3. **Aucun log `[useMapPrices]`** n'apparait dans la console -> `fetchPrices` n'est jamais execute

### Causes racines

**Cause 1 : Marqueurs affiches sans aeroport de depart**

`FlightPriceMarkers` cree des marqueurs pour TOUS les aeroports visibles des que `isFlightsTab=true`. Quand `departureAirports` est vide (pas encore de depart defini), `useMapPrices` a `enabled=false` et ne fetche jamais. Resultat : loading dots eternels.

**Cause 2 : Le guard `departureAirports.length === 0` dans l'effet empeche le premier appel**

Dans `useDepartureAirports.ts` (ligne 165), si `departureAirports` est encore `[]` quand les airports chargent, l'effet retourne sans appeler `fetchPrices`. Quand `departureAirports` est ensuite mis a jour, `destinationIatas` se recalcule, mais le timing entre la recreation de `fetchPrices` (via `enabled` qui change) et la propagation de l'etat peut causer un "missed render" ou l'effet ne se relance pas avec les bonnes valeurs.

**Cause 3 : Debounce 1200ms trop long + reset a chaque changement d'airports**

Chaque changement de `destinationIatas` (cause par un changement d'airports) relance l'effet, qui appelle `fetchPrices`, qui CLEAR le debounce precedent et en demarre un nouveau. Si les airports changent plusieurs fois en sequence rapide, le debounce est perpetuellement reset.

### Solution

#### Fichier 1 : `src/components/planner/FlightPriceMarkers.tsx`

**Ne pas afficher de loading dots quand aucun depart n'est defini.**

Ajouter une prop `hasDeparture` (derivee de `departureAirports.length > 0`) et l'utiliser dans la logique de creation de marqueurs :

- Si `hasDeparture = false` et `price === undefined` : ne pas creer de marqueur (au lieu d'afficher des loading dots)
- Si `hasDeparture = true` et `price === undefined` : afficher les loading dots normalement

Modification de `createMarkerElement` et du sync effect pour respecter cette logique.

#### Fichier 2 : `src/hooks/useMapPrices.ts`

**Rendre le fetch plus resilient :**

1. Reduire le debounce de 1200ms a 800ms
2. Ne PAS reset le debounce si les destinations a fetcher sont un sous-ensemble de celles deja en attente. Ajouter un `pendingFetchDestinations` ref pour tracker ce qui est deja programme dans le timeout en cours
3. Ajouter un log au tout debut de `fetchPrices` (avant le guard `enabled`) pour diagnostiquer les appels futurs

#### Fichier 3 : `src/components/planner/map/useDepartureAirports.ts`

**Forcer le fetch quand le depart change :**

Ajouter un `useEffect` specifique qui re-fetch les prix quand `departureAirports` passe de vide a non-vide, avec un delai court (300ms) pour laisser le temps a `destinationIatas` de se recalculer :

```text
useEffect(() => {
  if (departureAirports.length === 0 || destinationIatas.length === 0) return;
  
  // Petit delai pour laisser React se stabiliser
  const timer = setTimeout(() => {
    fetchPrices(departureAirports, destinationIatas);
  }, 300);
  
  return () => clearTimeout(timer);
}, [departureAirports.length > 0]); // Seulement quand le flag change
```

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/components/planner/FlightPriceMarkers.tsx` | Ne pas afficher loading dots sans depart, ajouter prop `hasDeparture` |
| `src/hooks/useMapPrices.ts` | Reduire debounce a 800ms, ne pas reset si destinations deja en attente, ajouter logs diagnostiques |
| `src/components/planner/map/useDepartureAirports.ts` | Forcer re-fetch quand departure passe de vide a non-vide |
| `src/components/planner/PlannerMap.tsx` | Passer `hasDeparture` a FlightPriceMarkers |

### Impact

- Plus de loading dots eternels quand aucun depart n'est defini
- Les prix chargent effectivement quand un depart est configure
- Le debounce ne bloque plus le chargement initial des prix
