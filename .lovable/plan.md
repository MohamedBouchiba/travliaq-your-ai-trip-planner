

## Plan : Corriger le clignotement des prix sur la carte (onglet Vols)

### Diagnostic - 3 causes identifiees

**Cause 1 : `useMapPrices.fetchPrices` cree un nouvel objet `prices` a chaque appel, meme quand tout est cache**

Dans `useMapPrices.ts` ligne 288, `setPrices({ ...pricesRef.current })` est appele a CHAQUE invocation de `fetchPrices`, meme si toutes les destinations sont deja en cache et que rien n'a change. Cela cree une nouvelle reference objet, ce qui declenche le useEffect de `FlightPriceMarkers` (ligne 312, depend de `prices`).

Chaine de declenchement :
```text
moveend (map bouge) 
  -> fetchAirports -> setAirports (nouvelle ref)
  -> destinationIatas recalcule (useMemo)
  -> fetchPrices appele
  -> setPrices({...pricesRef.current}) meme si 0 changements
  -> FlightPriceMarkers effect se relance
  -> tous les markers sont re-synces
```

**Cause 2 : `updateMarkerPrice` ecrase le DOM meme quand le prix n'a pas change**

La fonction `updateMarkerPrice` (ligne 169) fait `priceSpan.innerHTML = ...` a chaque appel, meme si le contenu est identique. Cela provoque un flash visuel (le navigateur reparse et re-rend le HTML).

**Cause 3 : L'effet de sync des markers depend de `prices` ET `airports` ensemble**

Le useEffect ligne 249-312 a `[map, airports, prices, isFlightsTab, ...]` comme dependances. Tout changement de `airports` OU `prices` relance le sync complet. Comme les deux changent souvent (chaque mouvement de carte), le sync se fait 2 fois par mouvement.

### Solution

#### Changement 1 : Eviter les re-renders inutiles dans `useMapPrices.ts`

Ne pas appeler `setPrices` quand aucune donnee n'a change. Ajouter une comparaison avant de mettre a jour l'etat :

```text
// AVANT (ligne 288):
setPrices({ ...pricesRef.current });

// APRES:
// Ne mettre a jour que si de nouvelles valeurs ont ete hydratees du cache
if (hydratedFromCache) {
  setPrices({ ...pricesRef.current });
}
```

Et a la fin du fetch (ligne 382-383), ne faire le `setPrices` que si des prix ont reellement ete ajoutes/modifies.

#### Changement 2 : Empecher les ecritures DOM inutiles dans `FlightPriceMarkers.tsx`

Dans `updateMarkerPrice` (ligne 169), verifier si le contenu a change avant d'ecraser le DOM :

```text
function updateMarkerPrice(el, price, isOrigin, departureLabel, currencySymbol) {
  const priceSpan = el.querySelector(".airport-price");
  if (!priceSpan) return;
  
  let newContent: string;
  let newColor: string;
  
  if (isOrigin) {
    newContent = departureLabel;
    newColor = "#64748b";
  } else if (price === undefined) {
    newContent = createLoadingDots();
    newColor = "#0369a1";
  } else if (price !== null) {
    newContent = price + currencySymbol;
    newColor = "#0369a1";
  } else {
    return; // null = no flight, marker should have been removed
  }
  
  // SKIP DOM update if content hasn't changed (prevents flash)
  if (priceSpan.textContent === newContent.replace(/<[^>]*>/g, '') 
      && !newContent.includes('loading-dots')) {
    return;
  }
  
  priceSpan.innerHTML = newContent;
  priceSpan.style.color = newColor;
}
```

#### Changement 3 : Utiliser `pricesRef` au lieu de `prices` state dans le sync effect

Dans `FlightPriceMarkers`, le sync effect depend de `prices` (state) qui change de reference a chaque setPrices. A la place, utiliser `dataRef` pour les prix (deja mis a jour via `dataRef.current = {...}` ligne 204), et ne dependre que de `airports` et `isFlightsTab` pour le declenchement :

```text
// AVANT (ligne 312):
}, [map, airports, prices, isFlightsTab, handleClick, updatePositions]);

// APRES - retirer prices des deps, utiliser dataRef.current.prices :
}, [map, airports, isFlightsTab, handleClick, updatePositions]);
```

Et ajouter un useEffect separe, leger, pour mettre a jour les prix des markers existants quand `prices` change, sans re-sync complet :

```text
// Effet leger : mettre a jour les prix des markers existants
useEffect(() => {
  if (!isFlightsTab) return;
  
  markersRef.current.forEach(({ el, airport, isOrigin }, hubId) => {
    const price = getHubPrice(airport, prices);
    updateMarkerPrice(el, price, isOrigin, departureLabel, currencySymbol);
  });
}, [prices, isFlightsTab, departureLabel, currencySymbol]);
```

Cela decouple : le gros sync (creation/suppression de markers) ne se fait que quand les aeroports changent, et la mise a jour des prix (legere, juste changer le texte) se fait separement.

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/hooks/useMapPrices.ts` | Eviter setPrices quand rien n'a change (ligne 288), tracker si des prix ont ete hydrates |
| `src/components/planner/FlightPriceMarkers.tsx` | Skip DOM update si contenu identique, decoupler sync markers et update prix |

### Impact

- Les prix s'affichent une fois et restent stables tant qu'ils ne changent pas
- Les loading dots ne reapparaissent plus pour des destinations deja connues
- Les mouvements de carte ne provoquent plus de flash sur les marqueurs existants
- Performance amelioree : moins de re-renders React, moins d'ecritures DOM
