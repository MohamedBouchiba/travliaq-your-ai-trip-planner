

# Plan de correction en profondeur -- 4 bugs critiques du chat planner

## Diagnostic

L'interaction montre que l'utilisateur dit clairement "Paris-Francfort du 15 au 18 mars, vol direct, hotel business" et le systeme reconnait correctement l'intent (`trigger_search`, confidence 95) avec toutes les entites extraites... mais **rien ne se passe**. L'utilisateur repete 5 fois sa demande.

4 causes racines identifiees :

---

## Bug 1 : `trigger_flight_search` bloque par le filtrage de phase (CRITIQUE)

**Cause** : La phase frontend envoie `inspiration` ou `planning`, qui sont mappees a `discovery` ou `activities` par `normalizeTravelPhase()`. Or `trigger_flight_search` n'est disponible que dans la phase `logistics`. Le LLM ne peut donc JAMAIS appeler cet outil.

```text
TOOL_NAMES_BY_PHASE:
  discovery  -> update_preferences, request_destination_suggestions, generate_quick_replies
  logistics  -> update_flight_widget, update_preferences, trigger_flight_search, generate_quick_replies
  activities -> update_preferences, generate_quick_replies
```

Le mapping legacy :
- `inspiration` -> `discovery` (pas de trigger_flight_search)
- `planning` -> `activities` (pas de trigger_flight_search)

Resultat : `flightSearchTrigger` reste toujours `false` dans les reponses SSE. Le frontend ne recoit jamais le signal.

**Fix** : Rendre `trigger_flight_search` disponible dans TOUTES les phases ou l'intent est `trigger_search` ou `provide_destination` avec des dates completes. Concretement :

- Dans `index.ts`, apres le filtrage par phase (ligne ~950-958), ajouter une injection conditionnelle : si `collectedData.intentClassification?.primaryIntent` est `trigger_search` ET que les entites contiennent destination + dates, forcer l'ajout de `flightSearchTriggerTool` dans `reActTools` meme si la phase ne le prevoit pas.
- Alternative plus propre : ajouter `trigger_flight_search` aux phases `discovery` et `activities` dans `TOOL_NAMES_BY_PHASE`.

---

## Bug 2 : Widget `travelersConfirmBeforeSearch` bloquant sans interaction utilisateur

**Cause** : Le widget apparait 3 fois (`widgetConfirmed: false` a chaque fois) car le frontend le repropose a chaque nouveau message. L'utilisateur (ou bot de test) ne clique jamais sur "Oui je voyage seul" / "Non, modifier". Le flux reste bloque.

Le probleme est dans `searchHandler.ts` : quand `totalTravelers === 1` et que les voyageurs n'ont pas ete explicitement confirmes, le systeme force le widget au lieu de lancer la recherche. Mais si le backend a deja identifie `trigger_search` avec toutes les infos, ce widget intermediaire est inutile.

**Fix** :

1. Dans `useChatSubmit.ts` (ligne ~376), quand `flightSearchTrigger === true` ET que le backend a renvoye `confirmed: true`, emettre directement `flight:triggerSearch` SANS passer par le widget de confirmation voyageurs.
2. Ajouter un auto-dismiss du widget : si `travelersConfirmBeforeSearch` est affiche et que le message suivant de l'utilisateur repete la meme demande, auto-confirmer avec la valeur actuelle (1 adulte par defaut).
3. Dans `searchHandler.ts`, ajouter une condition : si l'intent backend est `trigger_search`, bypasser la verification des voyageurs et lancer directement.

---

## Bug 3 : Extraction de dates incomplete dans `sessionEntities`

**Cause** : Le regex de dates dans `useSessionContext.ts` (ligne 57) ne capture que le premier groupe de capture :

```regex
/(?:du|le)?\s*(\d{1,2})\s*(janvier|...)/gi
```

Pour "du 15 au 18 mars", ce regex matche "15 mars" et "18 mars" separement, mais `extractEntities` utilise `match[1]` (le premier groupe = juste le nombre). Donc seuls "15" et "18" sont captures, pas "15 mars" et "18 mars".

De plus, le pattern "du X au Y mois" n'est pas gere comme un range.

**Fix** :

1. Modifier `extractEntities` pour les dates : utiliser `match[0]` (le match complet) au lieu de `match[1]` quand le pattern est un pattern de date.
2. Ajouter un nouveau pattern pour les ranges : `/du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+(janvier|...|mars|...)/gi` qui capture "du 15 au 18 mars" comme une seule entite.
3. Ajuster le `minLength` pour les dates (actuellement 1, ce qui laisse passer des valeurs comme "18" seul).

---

## Bug 4 : Message de bienvenue en anglais

**Cause** : Le message de bienvenue est "Hello! I'm your travel assistant..." alors que l'utilisateur parle francais. Le `PlannerChat.tsx` utilise bien `t("planner.chat.welcomeMessage")` mais la detection de langue semble ne pas avoir fonctionne (navigateur HeadlessChrome avec `language: en-US`).

Le message devrait s'adapter a la langue detectee ou forcer le francais si le site est configure en francais.

**Fix** :

1. Verifier que le `getDefaultWelcomeMessage()` dans `sessionHelpers.ts` utilise bien `i18n.t()` et non une chaine en dur.
2. S'assurer que la restauration des sessions (`storedMessages`) re-traduit le message welcome (deja fait a la ligne 563 de PlannerChat.tsx mais verifier que ca couvre le cas initial).

---

## Details techniques des modifications

### Fichier 1 : `supabase/functions/planner-chat/index.ts`

- Lignes ~950-958 : Apres le filtrage `reActTools`, ajouter :
```typescript
// Si l'intent est trigger_search et que les entites sont completes,
// injecter trigger_flight_search meme si la phase ne le prevoit pas
const intent = collectedData.intentClassification?.primaryIntent;
const entities = collectedData.intentClassification?.entities;
const hasSearchContext = entities?.destinationCity && 
  (entities?.exactDepartureDate || entities?.preferredMonth);
if ((intent === "trigger_search" || intent === "confirm_selection") && hasSearchContext) {
  const hasTriggerTool = reActTools.some(t => t.function.name === "trigger_flight_search");
  if (!hasTriggerTool) {
    reActTools.push(flightSearchTriggerTool);
    log.info("tool_injection", "Injected trigger_flight_search for search intent", { phase });
  }
}
```

### Fichier 2 : `src/components/planner/chat/hooks/useChatSubmit.ts`

- Lignes ~375-379 : Modifier le handling de `flightSearchTrigger` pour bypasser le widget de confirmation voyageurs :
```typescript
if (flightSearchTrigger) {
  // Bypass travelersConfirmBeforeSearch - le backend a deja confirme
  opts.refs?.travelersConfirmed && (opts.refs.travelersConfirmed.current = true);
  eventBus.emit("flight:triggerSearch");
}
```

### Fichier 3 : `src/components/planner/chat/hooks/widgetHandlers/searchHandler.ts`

- Ajouter un parametre `intentTriggered` pour court-circuiter la confirmation voyageurs quand le backend a deja valide le search.

### Fichier 4 : `src/components/planner/chat/hooks/useSessionContext.ts`

- Ligne 57 : Ajouter un pattern de range de dates :
```typescript
// Date ranges: "du 15 au 18 mars"
/du\s+(\d{1,2})\s+au\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/gi,
```
- Modifier `extractEntities` pour les dates : preferer `match[0]` (contexte complet) plutot que `match[1]` (juste le chiffre).

### Fichier 5 : `src/hooks/sessionHelpers.ts`

- Verifier que `getDefaultWelcomeMessage()` utilise i18n pour la traduction.

### Fichier 6 : `src/lib/suites/` (nouveaux tests)

- Ajouter une suite de tests pour verifier :
  - `trigger_flight_search` est injectable quand intent = `trigger_search` meme en phase discovery
  - Le range de dates "du 15 au 18 mars" est extrait correctement
  - Le widget `travelersConfirmBeforeSearch` est bypasse quand `flightSearchTrigger = true`

### Fichier 7 : Deploiement

- Redeployer la fonction edge `planner-chat` apres modification.

---

## Ordre d'implementation

1. Fix Bug 1 (phase filtering) -- impact le plus critique, cause racine principale
2. Fix Bug 2 (widget bloquant) -- debloque le flux utilisateur
3. Fix Bug 3 (extraction dates) -- ameliore la qualite des donnees contextuelles
4. Fix Bug 4 (welcome message) -- amelioration UX
5. Tests de non-regression dans le test-runner

