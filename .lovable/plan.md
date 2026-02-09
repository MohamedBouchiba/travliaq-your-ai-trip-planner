
# Plan : Tracer TOUS les Tools + Combler les Trous dans l'Utilisation des Tools

## Diagnostic du Probleme

### Pourquoi "je sais pas trop" declenche toujours des destinations

Le probleme est dans la **chaine de decision** :

1. **Le system prompt** (lignes 383-398 de `index.ts`) definit l'ordre : `DESTINATION -> DATE -> DUREE -> VOYAGEURS -> VILLE DEPART -> CONFIRMATION`. Il n'y a **aucune etape "PREFERENCES"** dans cet ordre.

2. **L'intent classifier** (lignes 70-72 de `intentClassifier.ts`) met `destinationSuggestions` a priorite 4 avec les triggers "je ne sais pas ou", "inspire-moi", etc. Mais **aucun trigger** n'existe pour "je sais pas trop" qui devrait d'abord demander les preferences.

3. **Le reasoning engine** (`plan_response`) produit une strategie mais le LLM ne dispose pas d'instruction claire lui disant : "Si l'utilisateur est indecis ET que les preferences sont vides, collecte d'abord les preferences avant de suggerer."

4. **Le `preferenceContext`** dans le debug montre : `Interets: (vide)`. Malgre cela, le LLM saute directement aux suggestions de destinations sans avoir collecte les interets.

5. **Les SSE events** ne montrent que les tools dont les donnees sont non-null (lignes 759-826 de `index.ts`), avec des latences aleatoires (`Math.random() * 100 + 50`). Les vrais appels `plan_response` et `classify_intent` sont invisibles si leurs resultats sont vides.

### Les tools existants sous-utilises

| Tool | Utilise ? | Probleme |
|------|-----------|----------|
| `plan_response` | Oui mais invisible dans debug | Latences fausses, pas emis si null |
| `classify_intent` | Oui mais trop oriente destination | Manque logique "preferences d'abord" |
| `update_flight_widget` | Oui | OK |
| `update_accommodation_widget` | Rarement | Jamais propose proactivement |
| `update_preferences` | Jamais proactivement | Le LLM ne le declenche que si l'utilisateur parle explicitement de preferences |
| `generate_quick_replies` | Presque jamais | Le LLM ne l'appelle pas, pas rendu obligatoire |
| `request_destination_suggestions` | Sur-utilise | Seul reflexe du LLM quand l'utilisateur est indecis |
| `trigger_flight_search` | OK | Fonctionne quand tout est pret |

---

## Partie 1 : Backend - Challenger le System Prompt avec des Phases et Sous-Etapes

### 1.1 Le probleme du system prompt monolithique actuel

Le system prompt actuel tente de tout gerer dans un seul bloc : destination, dates, voyageurs, vols, hotels, activites. C'est insuffisant parce que :

- **Chaque phase a des besoins differents** : chercher une destination demande de l'inspiration, comparer des hotels demande de l'analyse, planifier des activites demande de la connaissance locale
- **Les sous-etapes sont ignorees** : apres avoir choisi la destination, l'utilisateur doit aussi choisir un hotel (comparaison), des activites (rythme, budget), etc. Aujourd'hui le prompt ne guide pas ca
- **Un seul prompt ne peut pas etre expert en tout** : le ton, les regles, les priorites changent selon la phase

### 1.2 Nouveau workflow en phases avec sous-etapes

Le workflow strict actuel (`DESTINATION -> DATE -> VOYAGEURS -> VILLE DEPART -> CONFIRMATION`) est remplace par un **workflow en phases** plus riche. Chaque phase a son propre contexte et ses propres regles.

```
PHASE 1 : DECOUVERTE (preferences + destination)
├── 1a. Preferences (si indecis) : interets, style, budget approximatif
├── 1b. Suggestion destinations (basees sur preferences)
├── 1c. Exploration destination (infos, questions, comparaison entre destinations)
└── 1d. Validation destination finale

PHASE 2 : LOGISTIQUE VOYAGE (dates, voyageurs, vols)
├── 2a. Dates de voyage
├── 2b. Nombre de voyageurs
├── 2c. Ville de depart
├── 2d. Comparaison vols (prix, horaires, escales)
└── 2e. Selection vol

PHASE 3 : HEBERGEMENT
├── 3a. Type d'hebergement souhaite (hotel, airbnb, auberge)
├── 3b. Criteres (quartier, budget, etoiles, equipements)
├── 3c. Comparaison hebergements
└── 3d. Selection hebergement

PHASE 4 : ACTIVITES & PLANNING
├── 4a. Rythme de voyage (relax, modere, intensif)
├── 4b. Centres d'interet pour cette destination specifique
├── 4c. Budget activites
├── 4d. Suggestions d'activites (jour par jour)
├── 4e. Comparaison activites
└── 4f. Validation planning

PHASE 5 : RECAPITULATIF & AJUSTEMENTS
├── 5a. Resume complet du voyage (vol + hotel + activites + budget total)
├── 5b. Ajustements si besoin
└── 5c. Export / partage du plan
```

### 1.3 Implementation : Systemes prompt par phase (phasePrompts.ts)

Le fichier `phasePrompts.ts` existe deja avec 5 phases (`inspiration`, `research`, `comparison`, `planning`, `booking`). Il faut le **realigner** sur les 5 nouvelles phases definies ci-dessus et enrichir chaque phase avec :

- **Les sous-etapes** que le LLM doit suivre dans l'ordre
- **Les tools a utiliser** pour chaque sous-etape
- **Les regles de transition** : quand passer a la phase suivante
- **Les widgets a proposer** a chaque sous-etape

**Phase 1 (DECOUVERTE)** - System prompt :
```
Tu es en phase DECOUVERTE. Ton role est d'aider l'utilisateur a trouver SA destination ideale.

SOUS-ETAPES (dans l'ordre) :
1. Si l'utilisateur est indecis → demander ses preferences (widget preferenceInterests)
   - Quel type de voyage ? (plage, culture, aventure, gastronomie, nature)
   - Quel budget approximatif ?
   - Quelle duree ideale ?
2. Proposer des destinations adaptees (tool request_destination_suggestions)
   - Basees sur ses preferences, PAS aleatoires
3. Explorer une destination (repondre aux questions, donner des infos)
4. Valider la destination finale (confirmation explicite)

TOOLS A UTILISER :
- update_preferences : des qu'un indice de preference est detecte
- request_destination_suggestions : UNIQUEMENT apres avoir collecte les preferences
- generate_quick_replies : a CHAQUE reponse

TRANSITION VERS PHASE 2 :
- Quand la destination est confirmee par l'utilisateur
- NE PAS passer a la phase 2 tant que la destination n'est pas validee
```

**Phase 2 (LOGISTIQUE)** - System prompt :
```
Tu es en phase LOGISTIQUE. La destination est choisie : [DESTINATION].
Ton role est de collecter les infos de vol et proposer les meilleures options.

SOUS-ETAPES :
1. Dates de voyage (widget DatePicker)
2. Nombre de voyageurs (widget TravelersSelector)
3. Ville de depart (widget CitySelector ou question directe)
4. Recherche de vols (tool trigger_flight_search)
5. Comparaison des vols trouves (presenter les options, avantages/inconvenients)
6. Selection du vol

TOOLS A UTILISER :
- update_flight_widget : pour extraire les donnees de vol
- trigger_flight_search : quand dates + voyageurs + ville depart sont remplis
- generate_quick_replies : a CHAQUE reponse

TRANSITION VERS PHASE 3 :
- Quand le vol est selectionne ou quand l'utilisateur veut passer aux hotels
```

**Phase 3 (HEBERGEMENT)** - System prompt :
```
Tu es en phase HEBERGEMENT. Destination : [DESTINATION], Dates : [DATES].
Ton role est d'aider l'utilisateur a trouver l'hebergement ideal.

SOUS-ETAPES :
1. Quel type d'hebergement ? (hotel, appartement, auberge, resort)
2. Quels criteres importants ? (quartier, piscine, petit-dej, vue, wifi, parking)
3. Budget par nuit ?
4. Proposer des options avec comparaison (prix, emplacement, avis, equipements)
5. Selection de l'hebergement

TOOLS A UTILISER :
- update_accommodation_widget : pour extraire les criteres et preferences hotel
- generate_quick_replies : a CHAQUE reponse

TRANSITION VERS PHASE 4 :
- Quand l'hebergement est selectionne ou quand l'utilisateur veut passer aux activites
```

**Phase 4 (ACTIVITES & PLANNING)** - System prompt :
```
Tu es en phase ACTIVITES & PLANNING. Destination : [DESTINATION], Dates : [DATES], Hotel : [HOTEL].
Ton role est de creer un planning d'activites sur mesure.

SOUS-ETAPES :
1. Quel rythme de voyage ? (relax = 1-2 activites/jour, modere = 2-3, intensif = 4+)
2. Quels centres d'interet pour CETTE destination ? (pas les preferences generales, mais specifiques)
   - Ex pour Tokyo : temples, quartiers modernes, gastronomie, shopping, nature
3. Budget prevu pour les activites ?
4. Proposer un planning jour par jour adapte au rythme
5. Permettre des ajustements (ajouter/retirer des activites, changer l'ordre)

TOOLS A UTILISER :
- update_preferences : pour extraire rythme, interets specifiques, budget activites
- generate_quick_replies : a CHAQUE reponse

TRANSITION VERS PHASE 5 :
- Quand le planning est valide par l'utilisateur
```

**Phase 5 (RECAPITULATIF)** - System prompt :
```
Tu es en phase RECAPITULATIF. Tout est planifie.
Ton role est de presenter un resume clair et complet, et permettre les ajustements.

CONTENU DU RECAP :
- Destination + dates + duree
- Vol selectionne (prix, horaires)
- Hebergement selectionne (prix, localisation)
- Planning activites (jour par jour)
- Budget total estime (vol + hotel + activites + marge)

ACTIONS POSSIBLES :
- Modifier n'importe quel element (retour a la phase concernee)
- Exporter / partager le plan
- Valider le voyage complet
```

### 1.4 Modifier le system prompt principal dans index.ts

**Fichier** : `supabase/functions/planner-chat/index.ts` (lignes 375-407)

Remplacer l'ordre strict lineaire par une reference a la phase active :

```
## WORKFLOW PAR PHASES
Le voyage se planifie en 5 phases. Tu es actuellement en PHASE [X].
Suis les instructions specifiques de la phase active.
NE SAUTE PAS de phase. NE MELANGE PAS les phases.
Si l'utilisateur pose une question hors-phase, reponds brievement puis recentre sur la phase en cours.

[INSTRUCTIONS DE LA PHASE ACTIVE INSEREES ICI - cf phasePrompts.ts]
```

L'injection du prompt de phase se fait en passant la phase detectee (depuis le `flowState` ou le `reasoning`) a `buildPhaseSystemPrompt`.

### 1.5 Modifier l'Intent Classifier : Nouvelle logique "indecision"

**Fichier** : `supabase/functions/planner-chat/tools/intentClassifier.ts`

Ajouter dans la description du tool, section "LOGIQUE DE DETECTION", un nouveau bloc avant "DESTINATION" :

```
### INDECISION / AIDE (PRIORITE 11 - LA PLUS HAUTE)
- "je sais pas", "je ne sais pas", "j'hesite", "aide-moi", "no idea", "help me decide"
- SI preferences vides (pas d'interets, pas de style) → widgetType: "preferenceInterests"
- SI preferences partielles (interets mais pas de style) → widgetType: "preferenceStyle"
- SI preferences completes → widgetType: "destinationSuggestions" (maintenant c'est pertinent)
- primaryIntent: "ask_inspiration" uniquement si preferences deja remplies
- primaryIntent: "gather_preferences" si preferences vides
```

Ajouter `"gather_preferences"` dans la liste des `primaryIntent` possibles.

### 1.6 Enrichir le Reasoning Engine pour guider la decision

**Fichier** : `supabase/functions/planner-chat/tools/reasoningEngine.ts`

Ajouter dans la description du tool `plan_response` une instruction supplementaire :

```
### REGLE CRITIQUE: PARCOURS INDECISION
Si l'utilisateur est indecis (comprendre: "il ne sait pas ou aller"):
- Verifier le [CONTEXTE PREFERENCES] dans la memoire
- Si interets = vide → strategie = "collecter les interets via preferenceInterests"
- Si interets remplis mais pas de style → strategie = "collecter le style via preferenceStyle"
- Si tout est rempli → strategie = "proposer des destinations basees sur ses preferences"
- JAMAIS proposer des destinations quand les preferences sont vides
```

### 1.7 Forcer `generate_quick_replies` a chaque reponse

**Fichier** : `supabase/functions/planner-chat/index.ts`

Dans le system prompt, ajouter l'instruction :

```
## REGLE: QUICK REPLIES OBLIGATOIRES
Tu DOIS appeler l'outil generate_quick_replies pour CHAQUE reponse.
Les quick replies doivent etre contextuelles et aider l'utilisateur a continuer.
Exemples:
- Apres question sur preferences: "Plage et detente" / "Culture et musees" / "Aventure et nature"
- Apres question sur dates: "Ce mois-ci" / "Le mois prochain" / "Flexible"
- Apres proposition de destinations: "Dis-moi en plus" / "D'autres propositions" / "J'adore !"
```

---

## Partie 2 : Backend - Tracer TOUS les Tools dans le Debug

### 2.1 Collecter les executions reelles dans le ReAct loop

**Fichier** : `supabase/functions/planner-chat/index.ts`

Ajouter un tableau `toolExecutionLog` avant la boucle (ligne 501) :

```typescript
interface ToolExecutionEntry {
  tool: string;
  status: "finished" | "failed";
  latency_ms: number;
  summary: string;
  timestamp: number;
  loopIteration: number;
}
const toolExecutionLog: ToolExecutionEntry[] = [];
```

Dans la boucle (lignes 559-563), enregistrer chaque execution reelle :

```typescript
for (const toolCall of toolCalls) {
  const startTime = Date.now();
  const { result, updatedData } = processToolCall(toolCall, requestId, collectedData, log);
  const latency = Date.now() - startTime;
  
  toolExecutionLog.push({
    tool: toolCall.function?.name || "unknown",
    status: result.success ? "finished" : "failed",
    latency_ms: latency,
    summary: result.data?.message || result.error?.message || "Unknown",
    timestamp: Date.now(),
    loopIteration: loopCount,
  });
  
  collectedData = mergeToolData(collectedData, updatedData);
  toolResponses.push(buildToolResponseMessage(toolCall.id, result));
}
```

### 2.2 Emettre les vraies executions via SSE

**Fichier** : `supabase/functions/planner-chat/index.ts`

Modifier `emitCollectedDataEvents` (lignes 759-827) pour accepter le log et emettre les vrais events au lieu des faux :

```typescript
function emitCollectedDataEvents(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: CollectedToolData,
  toolLog: ToolExecutionEntry[]  // NEW parameter
): void {
  // 1. Emit REAL tool executions from the log (replaces fake events)
  for (const entry of toolLog) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "tool_started",
      tool: entry.tool,
      reason: `Processing ${entry.tool}...`,
      timestamp: entry.timestamp - entry.latency_ms,
    })}\n\n`));
    
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: "tool_finished",
      tool: entry.tool,
      success: entry.status === "finished",
      latency_ms: entry.latency_ms,
      summary: entry.summary,
      timestamp: entry.timestamp,
      loopIteration: entry.loopIteration,
    })}\n\n`));
  }
  
  // 2. Continue emitting data events (flightData, reasoning, etc.)
  if (data.reasoningData) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reasoning", reasoning: data.reasoningData })}\n\n`));
  }
  if (data.intentClassification) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "intentClassification", intentClassification: data.intentClassification })}\n\n`));
  }
  // ... rest of data emissions unchanged (flightData, accommodationData, etc.)
}
```

Mettre a jour les 3 appels de `emitCollectedDataEvents` pour passer `toolExecutionLog`.

### 2.3 Inclure le log dans la reponse JSON non-stream

**Fichier** : `supabase/functions/planner-chat/index.ts` (ligne 634)

Ajouter `toolExecutions: toolExecutionLog` dans la reponse JSON.

---

## Partie 3 : Frontend - Afficher les vrais tools dans le Debug

### 3.1 Ajouter `loopIteration` au type `ToolExecution`

**Fichier** : `src/stores/debugStore.ts`

```typescript
export interface ToolExecution {
  tool: string;
  status: "started" | "finished" | "failed";
  reason?: string;
  summary?: string;
  latency_ms?: number;
  timestamp: number;
  loopIteration?: number; // NEW
}
```

### 3.2 Grouper par iteration dans ToolTimeline

**Fichier** : `src/components/planner/debug/ToolTimeline.tsx`

Grouper les executions par `loopIteration` avec un header visuel "Loop 1", "Loop 2", etc. pour montrer le pattern ReAct :

```
Loop 1 (Azure call)
  [OK] plan_response       42ms
  [OK] classify_intent      18ms
  [OK] update_preferences   12ms
  
Loop 2 (Azure call)
  [OK] request_destination_suggestions  35ms
  [OK] generate_quick_replies           22ms

Total: 5 tools, 2 loops, 129ms
```

---

## Resume des fichiers a modifier

| Fichier | Changement |
|---------|------------|
| `supabase/functions/planner-chat/index.ts` | System prompt par phases + toolExecutionLog reel + SSE events reels + reponse JSON enrichie + quick replies obligatoires |
| `supabase/functions/planner-chat/prompts/phasePrompts.ts` | Realigner sur les 5 nouvelles phases avec sous-etapes, tools par phase, regles de transition, widgets |
| `supabase/functions/planner-chat/tools/intentClassifier.ts` | Nouveau intent `gather_preferences` + priorite 11 pour indecision + logique preferences-d'abord |
| `supabase/functions/planner-chat/tools/reasoningEngine.ts` | Instructions parcours indecision dans la description du tool |
| `src/stores/debugStore.ts` | `loopIteration` dans `ToolExecution` |
| `src/components/planner/debug/ToolTimeline.tsx` | Groupement par iteration de boucle ReAct |

## Resultat attendu

1. **"je sais pas trop" declenche les preferences** et non plus les destinations : le LLM demande d'abord "Qu'est-ce qui te fait rever ? Plage, culture, aventure ?" avec le widget `preferenceInterests`
2. **Apres la destination, le chat guide vers les hotels** puis les activites, avec des sous-etapes claires (type, criteres, comparaison, selection)
3. **Chaque phase a son propre system prompt** avec des regles specifiques, des tools a utiliser, et des conditions de transition
4. **Tous les tools appeles sont visibles** dans le debug : `plan_response`, `classify_intent`, `update_preferences`, `generate_quick_replies`, etc.
5. **Latences reelles** dans le debug au lieu de valeurs aleatoires
6. **Quick replies contextuelles** a chaque reponse grace a `generate_quick_replies` rendu obligatoire
7. **Parcours ReAct visible** : on voit combien d'iterations de boucle ont eu lieu et quels tools ont ete appeles a chaque tour
