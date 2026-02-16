

# Corrections restantes post-audit

## Probleme critique (crash bloquant)

**"Cannot access 'isStreaming' before initialization"** dans `PlannerChat.tsx`

Le `useEffect` aux lignes 138-145 reference `isStreaming` dans son tableau de dependances (`[isStreaming]`), mais `isStreaming` est declare plus bas a la ligne 230 via `const { streamResponse, isStreaming } = useChatStream(...)`. Le tableau de dependances est evalue pendant le rendu, avant que la variable ne soit initialisee -- c'est une erreur de "Temporal Dead Zone" (TDZ).

**Correction** : Deplacer le `useEffect` (lignes 137-145) apres la declaration de `useChatStream` (apres la ligne 230), ou mieux, deplacer l'appel a `useChatStream` avant ce `useEffect`.

---

## Corrections P2 restantes

### 1. Texte "Depart" code en dur (`FlightPriceMarkers.tsx`)

Deux occurrences du texte `"Départ"` (lignes 72 et 168) au lieu d'utiliser `i18next`. Le composant est un `memo` vanilla sans acces a `useTranslation`. 

**Correction** : Ajouter une prop `departureLabel` au composant, fournie par le parent via `t("planner.map.departure")`, et l'utiliser a la place du texte brut. Ajouter la cle i18n correspondante dans les fichiers de traduction FR/EN.

### 2. Devise EUR codee en dur (`FlightPriceMarkers.tsx`)

Le signe `€` est code en dur dans les prix (lignes 77, 174). La devise devrait etre dynamique.

**Correction** : Ajouter une prop `currencySymbol` (defaut: `"€"`) et l'utiliser dans le formatage des prix.

### 3. Dictionnaire `cityCoordinates` statique (`map/constants.ts`)

166 lignes de coordonnees codees en dur, viole le principe "no-hardcode". Cependant, ce dictionnaire sert de **fallback** quand l'index de destinations n'est pas charge. Le supprimer completement casserait la carte pour les activites sans coordonnees.

**Correction** : Ce dictionnaire sera conserve temporairement en tant que fallback explicitement documente, avec un commentaire `// FALLBACK: will be replaced by destinationIndex geocoding API`. La migration complete vers une API de geocodage est un chantier plus large hors scope ici.

### 4. `CITY_COORDINATES` dans `types.ts` (lignes 256-298)

Meme probleme de hardcoding, doublon partiel avec `map/constants.ts`.

**Correction** : Faire pointer `getCityCoords()` vers `cityCoordinates` de `map/constants.ts` au lieu de maintenir un second dictionnaire. Supprimer `CITY_COORDINATES` de `types.ts`. Adapter le test suite `chatTypes.suite.ts` en consequence.

### 5. `MONTH_MAP` dans `types.ts` (lignes 303-325)

Mapping statique des noms de mois FR/EN. Ce mapping est utilise pour parser les entrees utilisateur ("mars", "january"...) -- c'est une table de lookup de parsing, pas de l'affichage. `date-fns/locale` ne fournit pas de parser inverse (nom -> index).

**Correction** : Conserver `MONTH_MAP` tel quel -- c'est un mapping de parsing lexical, pas un cas de hardcoding d'affichage. Ajouter un commentaire explicatif.

---

## Resume des modifications

| Fichier | Action |
|---------|--------|
| `PlannerChat.tsx` | Deplacer `useChatStream()` avant le `useEffect` qui utilise `isStreaming` |
| `FlightPriceMarkers.tsx` | Ajouter props `departureLabel` + `currencySymbol`, supprimer texte FR en dur |
| `types.ts` | Supprimer `CITY_COORDINATES`, rediriger `getCityCoords` vers `map/constants.ts` |
| `chatTypes.suite.ts` | Adapter tests pour importer depuis `map/constants` |
| Fichiers i18n (FR/EN) | Ajouter cle `planner.map.departure` |
| Parent de FlightPriceMarkers | Passer `departureLabel={t("planner.map.departure")}` |

