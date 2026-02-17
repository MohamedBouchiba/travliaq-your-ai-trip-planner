
# Plan de correction durable - 5 bugs critiques identifiés

## Synthèse des 3 sessions analysées

| Session | Utilisateur | Bugs observés |
|---------|-------------|---------------|
| Session 1 (aventure couple) | FR speaker, HeadlessChrome en-US | Welcome EN, ask-departure EN, "Paris" ignoré au profit du GeoIP (YKF Canada), descriptions villes dupliquées (Oman), date range "10 mars -> 10 mars" (même jour), 500 errors, boucle répétitive 6x |
| Session 2 (digital nomad) | EN speaker | Welcome EN (correct), 2x erreurs 500, descriptions PT dupliquées (Braga/Amadora/Seixal), contenu FR dans conversation EN |
| Session 3 (famille) | FR speaker, HeadlessChrome en-US | Welcome EN, ask-departure EN, descriptions CV dupliquées, widget dateRangePicker affiché mais jamais utilisé (bloqué 6 min), 3x erreurs 500 |

---

## Bug 1 : Message `ask-departure` toujours en anglais (SYSTÉMIQUE)

**Cause racine** : Le message "To suggest destinations that suit you..." est la traduction EN de `planner.messages.needDepartureCityFirst`. Ce message est injecté par `useChatDestinationFlow.ts` via `t()`. Le problème est que i18n est initialisé avec `en-US` (la langue du navigateur HeadlessChrome) et ne bascule JAMAIS en français, même quand l'utilisateur écrit en français.

Le welcome message a le même problème : `getTranslations()` dans `sessionHelpers.ts` capture l'état de i18n au moment de l'initialisation. Si le navigateur est en-US, tout reste en anglais.

**Impact** : Les 3 sessions montrent des messages système en anglais dans des conversations françaises.

**Fix** :
1. Dans `useChatDestinationFlow.ts` et `PlannerChat.tsx` : les messages `ask-departure` doivent utiliser la langue détectée du premier message utilisateur, pas la langue du navigateur.
2. Ajouter un mécanisme de détection de langue du premier message utilisateur dans le chat. Quand le bot détecte que l'utilisateur parle français (via le backend qui renvoie déjà la langue dans l'intent), basculer `i18n.changeLanguage()` automatiquement.
3. Forcer la re-traduction du welcome message quand la langue change (le welcome message est stocké en localStorage avec la langue initiale).

**Fichiers** :
- `src/components/planner/PlannerChat.tsx` : Ajouter un `useEffect` qui détecte la langue de la première réponse backend et appelle `i18n.changeLanguage()`.
- `src/hooks/useChatSessions.ts` : Re-générer le welcome message quand la langue change.
- `src/components/planner/chat/hooks/useChatDestinationFlow.ts` : Pas de changement nécessaire si i18n est correctement basculé.

---

## Bug 2 : Départ GeoIP écrase le départ utilisateur (Paris -> YKF Canada)

**Cause racine** : Session 1 montre `flightSummary: "Départ: Amsterdam, The Netherlands"` alors que l'utilisateur a dit "Paris". Le système `useAutoDetectDeparture` a auto-détecté un départ basé sur la géolocalisation du HeadlessChrome (qui pointe vers le Canada ou Amsterdam), et cette valeur écrase la ville de départ fournie par l'utilisateur.

Le problème spécifique : quand le backend extrait `departureCity: "Paris"` via l'intent `provide_departure_city`, la logique frontend de `persistExtractedEntities.ts` devrait mettre à jour la mémoire avec "Paris", mais la résolution d'aéroport (`nearest-airports`) utilise le nom "Paris" et tombe sur un résultat canadien car le backend ne filtre pas par pays.

**Preuves** : L'airport suggestion montre `YKF (Waterloo Airport, Canada)` pour "Paris" -- c'est la ville de Waterloo, Ontario, Canada. L'edge function `nearest-airports` a reçu `query="Brussels"` dans les logs récents, ce qui suggère qu'elle fait un lookup textuel sans contexte géographique.

**Fix** :
1. Dans `persistExtractedEntities.ts` : Quand `departureCity` est extrait, passer le pays de l'utilisateur (ou le continent attendu) comme hint au `nearest-airports` edge function.
2. Dans `supabase/functions/nearest-airports/index.ts` : Ajouter un paramètre optionnel `preferred_country` ou `region` pour prioriser les résultats européens quand le contexte l'indique. Si "Paris" est recherché et que le site est travliaq.com (plateforme européenne), prioriser CDG/ORY.
3. Ajouter un fallback dans `top-cities-by-country` pour les villes avec des homonymes internationaux (Paris, London, etc.).

**Fichiers** :
- `supabase/functions/nearest-airports/index.ts` : Ajouter un filtre de priorité par région/pays.
- `src/components/planner/chat/hooks/persistExtractedEntities.ts` : Passer le contexte géographique lors de la résolution d'aéroport.

---

## Bug 3 : Descriptions de villes dupliquées ("Ville importante de X")

**Cause racine** : L'edge function `top-cities-by-country` (ligne 247-258) utilise un dictionnaire hardcodé `cityDescriptions` avec ~60 villes. Pour les villes non référencées, elle génère un fallback générique : `"Ville importante de ${displayCountry} offrant une expérience authentique..."`.

Pour les pays comme Oman (OM), Cap-Vert (CV), le `countryNames` mapping ne contient pas ces codes, donc `displayCountry` tombe sur le code ISO brut ("OM", "CV") au lieu du nom du pays.

**Preuves** :
- Oman : 5 villes avec "Ville importante de OM" (ligne 400-422 session 1)
- Cap-Vert : 5 villes avec "Ville importante de CV" (ligne 333-357 session 3)
- Portugal : Braga/Amadora/Seixal avec la même description (session 2, car pas dans le dictionnaire)

**Fix** :
1. Dans `supabase/functions/top-cities-by-country/index.ts` :
   - Étendre le `countryNames` mapping pour couvrir TOUS les pays (ou utiliser le `country_name` retourné par l'API externe).
   - Remplacer le fallback générique par un appel au LLM pour générer une description unique, OU enrichir le dictionnaire avec plus de villes.
   - A minima : utiliser `countryDisplayName` (qui vient de l'API) au lieu de `countryNames[upperCode]` dans `getCityDescription()`.
2. Le fix immédiat : la fonction reçoit déjà `countryDisplayName` de l'API (ligne 298), mais `getCityDescription` reçoit `countryName` qui est undefined quand le code n'est pas dans le mapping. Corriger pour passer `countryDisplayName` à `getCityDescription`.

**Fichiers** :
- `supabase/functions/top-cities-by-country/index.ts` : Corriger la propagation de `countryDisplayName`, étendre les descriptions.

---

## Bug 4 : Boucle répétitive `ask-departure` (blocage utilisateur)

**Cause racine** : Dans les 3 sessions, le pattern est identique :
1. L'utilisateur demande des suggestions
2. Le backend appelle `request_destination_suggestions`
3. Le frontend vérifie `departureCityRef.current` dans `useChatDestinationFlow.ts` (ligne 184)
4. La departure city n'est PAS dans la ref (même si l'utilisateur l'a dite)
5. Le message `ask-departure` est injecté
6. L'utilisateur répond "Paris" 
7. Le backend extrait `departureCity: "Paris"` avec `provide_departure_city`
8. Mais `departureCityRef.current` n'est toujours pas mis à jour quand la prochaine suggestion est demandée

Le problème est un bug de synchronisation : `departureCityRef` dans `useChatDestinationFlow` n'est pas mis à jour quand `persistExtractedEntities` reçoit la departure city du backend. Il y a une déconnexion entre la mémoire de vol (store Zustand) et la ref locale du hook.

**Preuves** : Session 1 montre 4x `ask-departure` messages consécutifs après que l'utilisateur a dit "Paris". Session 3 montre 2x `ask-departure` après "Paris".

**Fix** :
1. Dans `useChatDestinationFlow.ts` : Synchroniser `departureCityRef` avec le store Zustand `useFlightMemoryStore`. Utiliser un `useEffect` qui watch `memory.departure?.city` et met à jour la ref.
2. Ajouter un mécanisme `pendingDestinationFetch` : quand la departure city est fournie APRÈS un `ask-departure`, auto-relancer la fetch des destinations sans re-demander.
3. Vérifier que `persistExtractedEntities` écrit bien la departure city dans le store quand l'intent `provide_departure_city` est reçu.

**Fichiers** :
- `src/components/planner/chat/hooks/useChatDestinationFlow.ts` : Ajouter un sync effect.
- `src/components/planner/chat/hooks/persistExtractedEntities.ts` : Vérifier le mapping `departureCity`.

---

## Bug 5 : Erreurs 500 récurrentes du backend

**Cause** : Les 3 sessions montrent des erreurs 500 (`planner.error.server`) :
- Session 1 : 2 erreurs 500 (lignes 882-900)
- Session 2 : 2 erreurs 500 (lignes 582-596) 
- Session 3 : 3 erreurs 500 (lignes 755-776)

Ces erreurs surviennent typiquement quand le backend (Azure OpenAI) timeout ou retourne une erreur. Le retry automatique fonctionne (1-2 tentatives) mais cause des délais perceptibles.

**Fix** :
1. Dans `supabase/functions/planner-chat/index.ts` : Ajouter un logging plus détaillé des erreurs 500 pour identifier si c'est Azure OpenAI, la base de données, ou un bug de code.
2. Ajouter un circuit breaker : si 2 erreurs 500 consécutives, réduire la complexité du prompt (moins de contexte) pour la tentative suivante.

---

## Ordre d'implémentation

1. **Bug 3** (descriptions dupliquées) -- Fix le plus simple, impact visuel immédiat
2. **Bug 4** (boucle ask-departure) -- Cause racine du blocage utilisateur
3. **Bug 2** (GeoIP écrase départ) -- Corrige les aéroports hallucinations
4. **Bug 1** (locale système) -- Corrige les messages en anglais
5. **Bug 5** (erreurs 500) -- Monitoring et résilience

## Détails techniques

### Fichier 1 : `supabase/functions/top-cities-by-country/index.ts`
- Ligne 247 : Modifier `getCityDescription` pour accepter et utiliser `countryDisplayName` (déjà disponible à la ligne 298)
- Ligne 141-148 : Étendre `countryNames` avec les codes manquants (OM, CV, TZ, KH, JM, etc.)
- Ligne 312-316 : Passer `countryDisplayName` à `getCityDescription` au lieu de undefined

### Fichier 2 : `src/components/planner/chat/hooks/useChatDestinationFlow.ts`  
- Ajouter un `useEffect` pour synchroniser `departureCityRef` avec le store Zustand
- Utiliser le pattern `pendingDestinationFetch` existant (ligne 204) pour auto-relancer après reception de la departure city

### Fichier 3 : `supabase/functions/nearest-airports/index.ts`
- Ajouter un paramètre `preferred_region` pour désambiguïser les villes homonymes (Paris FR vs Paris CA)

### Fichier 4 : `src/components/planner/PlannerChat.tsx`
- Ajouter un mécanisme de détection/switch de langue basé sur la première réponse backend

### Fichier 5 : `supabase/functions/planner-chat/index.ts`
- Améliorer le logging des erreurs 500 pour diagnostic
