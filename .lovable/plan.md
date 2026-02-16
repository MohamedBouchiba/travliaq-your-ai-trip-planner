

# Barre de prix + bouton "Planifier mon voyage" et vue itineraire

## Objectif

Ajouter une barre horizontale fixe en bas de la zone map (panneau droit sur desktop, bas d'ecran sur mobile) affichant :
- Le prix total du panier (Trip Basket Store) en temps reel
- Un bouton "Planifier mon voyage" grise tant que le panier n'est pas complet, qui se degrise quand toutes les etapes requises sont remplies
- Au clic sur le bouton, la map est remplacee par une vue itineraire jour-par-jour (inspiree de TravelRecommendations) dans le meme panneau

## Architecture

Le panneau droit du planner aura deux etats :
1. **Mode Map** (actuel) : map + widgets + la nouvelle barre de prix en bas
2. **Mode Itineraire** : la map est remplacee par la vue itineraire, le chat reste a gauche

Un state `viewMode: 'map' | 'itinerary'` dans TravelPlanner controlera l'affichage.

## Etapes d'implementation

### 1. Nouveau composant `TripPriceBar`
Fichier : `src/components/planner/TripPriceBar.tsx`

- S'abonne au `useTripBasketStore` pour lire `getTotalPrice()`, `basketCurrency`, `isBasketComplete()`, `getMissingSteps()`
- Affiche le prix total formate (ex: "1 250 EUR")
- Affiche le nombre d'elements dans le panier
- Bouton "Planifier mon voyage" :
  - `disabled` si `!isBasketComplete()`
  - Style grise quand disabled, style accent/hero quand actif
  - `onClick` declenche le passage en mode itineraire
- Barre fine (h-14 environ), positionnee en `absolute bottom-0` dans le conteneur map
- Responsive : s'adapte au mobile

### 2. Nouveau composant `PlannerItineraryView`
Fichier : `src/components/planner/PlannerItineraryView.tsx`

- Vue qui remplace la map quand l'utilisateur clique "Planifier mon voyage"
- Pour l'instant (phase 1) : affiche un placeholder / mockup avec les donnees du basket
- Reutilise les composants existants de TravelRecommendations : `DaySection`, `HeroHeader`, `FooterSummary`
- Bouton "Retour a la carte" pour revenir au mode map
- Plus tard : l'IA generera le contenu jour-par-jour (pas implemente maintenant)

### 3. Modifications dans `TravelPlanner.tsx`

- Ajout d'un state `viewMode: 'map' | 'itinerary'`
- Dans le panneau droit (desktop) :
  - Si `viewMode === 'map'` : affichage actuel (map + widgets) + `TripPriceBar` en bas
  - Si `viewMode === 'itinerary'` : affichage de `PlannerItineraryView` a la place de la map
- Sur mobile : meme logique, la barre de prix apparait en bas de la vue "maps"
- Le chat reste toujours visible et fonctionnel quel que soit le mode

### 4. Aucune modification des stores existants

Le `useTripBasketStore` expose deja tout ce qu'il faut :
- `getTotalPrice()` et `basketCurrency` pour le prix
- `isBasketComplete()` pour activer/desactiver le bouton
- `getMissingSteps()` pour afficher ce qu'il manque (tooltip optionnel)
- `getBasketItems()` pour le nombre d'elements

## Details techniques

```text
+----------------------------------+
|  Chat  |        Map Area         |
|        |                         |
|        |   [widgets overlay]     |
|        |                         |
|        |                         |
|        +-------------------------+
|        | 0 EUR  [Planifier...  ] | <-- TripPriceBar (absolute bottom)
+----------------------------------+
```

Quand le bouton est clique :

```text
+----------------------------------+
|  Chat  |   Itinerary View       |
|        |   [<- Retour carte]    |
|        |                         |
|        |   Jour 1 - ...         |
|        |   Jour 2 - ...         |
|        |   Jour 3 - ...         |
+----------------------------------+
```

- La barre de prix utilise `z-20` pour etre au-dessus de la map mais sous les modales
- Le bouton utilise le variant `hero` quand actif, `secondary` + `disabled` quand grise
- L'itineraire est scrollable verticalement dans le panneau
- Pas d'appel IA pour l'instant : le contenu de l'itineraire sera un placeholder qui affiche les elements du basket groupes par jour/ville

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `src/components/planner/TripPriceBar.tsx` | Creer |
| `src/components/planner/PlannerItineraryView.tsx` | Creer |
| `src/pages/TravelPlanner.tsx` | Modifier (ajouter viewMode + integrer les 2 composants) |

