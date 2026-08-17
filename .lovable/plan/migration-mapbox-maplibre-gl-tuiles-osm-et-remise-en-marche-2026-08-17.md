# Migration Mapbox → MapLibre GL + tuiles OSM, et remise en marche du site

## Objectif

1. Supprimer totalement la dépendance Mapbox (coût de facturation) et passer à MapLibre GL avec des tuiles OpenStreetMap gratuites.
2. Faire un audit complet des erreurs actuelles du site et corriger ce qui bloque.

## État constaté

- Le typecheck TypeScript de l'app passe désormais sans erreur (corrections précédentes appliquées).
- Aucune erreur runtime remontée dans le preview actuel, aucun log console capturé.
- Mapbox est utilisé dans 11 fichiers (~3 600 lignes de code carte) :
  - `src/config/mapbox.ts` (token public en dur)
  - `src/components/travel/MapView.tsx`
  - `src/components/planner/PlannerMap.tsx`, `FlightPriceMarkers.tsx`
  - 8 hooks dans `src/components/planner/map/` (init, caméra, marqueurs aéroports/hôtels/activités, routes de vol, position utilisateur)
  - `src/styles/mapbox-overrides.css` (surcharges des classes `.mapboxgl-*`)
- Styles utilisés : `mapbox://styles/mapbox/outdoors-v12` (planner) et `dark-v11` (travel).

## Étape 1 — Audit des erreurs (avant toute migration)

- Vérification du build de production et du typecheck.
- Exécution des suites de tests existantes (vitest + suites internes) et relevé des échecs.
- Parcours automatisé du site en navigateur (accueil, planner, questionnaire, blog) avec capture des erreurs console, des requêtes réseau en échec et des edge functions en erreur.
- Vérification des edge functions Supabase (logs récents, clés API manquantes ou expirées).
- Livrable : une liste priorisée des erreurs (bloquantes / gênantes / cosmétiques). Je corrige les bloquantes dans la foulée, et je te présente le reste pour arbitrage.

## Étape 2 — Migration vers MapLibre GL

Approche : MapLibre GL JS est un fork de Mapbox GL JS v1, l'API (`Map`, `Marker`, `Popup`, `LngLatBounds`, sources/layers GeoJSON) est quasi identique. La migration est donc mécanique, pas une réécriture.

1. Ajouter `maplibre-gl`, retirer `mapbox-gl` du projet.
2. Remplacer `src/config/mapbox.ts` par un module de configuration carte unique (`src/config/map.ts`) exposant le style et les URLs de tuiles — aucune valeur en dur dispersée, une seule source de configuration.
3. Définir un style MapLibre en JSON (tuiles raster OSM + variante sombre) reproduisant au plus près les rendus actuels `outdoors` et `dark`. Attribution OSM affichée comme requis par la licence.
4. Remplacer les imports `mapbox-gl` par `maplibre-gl` dans les 10 fichiers concernés et adapter les rares différences d'API (options d'init, `projection`, `fog`/`terrain` si utilisés, contrôles).
5. Renommer les surcharges CSS `.mapboxgl-*` en `.maplibregl-*` (MapLibre émet les deux préfixes, mais on nettoie).
6. Vérifier que chaque fonctionnalité carte fonctionne encore : marqueurs prix de vols, aéroports de départ, hôtels, activités, routes de vol animées, recentrage caméra, bouton "rechercher dans cette zone", position utilisateur, fallback WebGL.

## Étape 3 — Vérification

- Contrôle visuel en navigateur du planner : chargement de la carte, marqueurs, popups, zoom, sélection de destination.
- Contrôle du parcours travel/MapView.
- Confirmation qu'aucune requête ne part plus vers `api.mapbox.com` (donc plus aucune facturation).

## Détails techniques

- Tuiles par défaut : serveur de tuiles OSM standard, configurable via variable d'environnement pour pouvoir basculer plus tard vers un fournisseur payant/auto-hébergé sans toucher au code.
- Les tuiles raster OSM ne supportent pas les styles vectoriels (rotation d'étiquettes, 3D). Si le rendu actuel dépend de couches vectorielles, je te le signale et on choisira une alternative de style gratuite compatible.
- Aucun token requis pour OSM ; le fichier de config accepte quand même une clé optionnelle pour un fournisseur de tuiles futur.
- Le géocodage, l'autocomplétion de lieux et la recherche d'aéroports passent déjà par des edge functions dédiées, ils ne sont pas impactés par le changement de fournisseur de carte.
