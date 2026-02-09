

# Plan: 5 Fixes Scalables pour le Chat Planner

## Problemes identifies (depuis le debug trace)

1. **Rigidite des phases** : Le prompt systeme contient "NE SAUTE PAS de phase" / "Si l'utilisateur pose une question hors-phase, reponds brievement puis recentre". Resultat : le LLM refuse de repondre a "Peux-tu comparer ces destinations ?" ou "cite moi 10 choses wow" car il est en phase LOGISTICS.
2. **Budget mappe sur preferenceStyle** : L'intent classifier retourne `widgetToShow: preferenceStyle` pour une demande de budget, alors qu'un widget `budgetRangeSlider` existe deja mais n'est jamais utilise via l'intent.
3. **Fallback d'activites force** : Quand le LLM repond avec un intent `other` ou `ask_question`, le frontend force quand meme le prochain widget requis via `widgetTriggeringIntents` (qui inclut `ask_question`). Resultat : une question libre ("cite moi 10 choses") declenche `preferenceStyle`.
4. **Flight search "no-op"** : `trigger_flight_search` emet `eventBus.emit("flight:triggerSearch")` qui active le `FlightsPanel` et met `triggerFlightSearch=true`. Mais dans le panel, la recherche echoue silencieusement car les legs multi-destination ne sont pas synchronises vers le formulaire de recherche.
5. **Desambiguisation des nombres** : "2" en reponse a un choix numerote (1. Continuer / 2. Revenir) est classe comme `provide_travelers` avec `adults: 2` au lieu de `confirm_selection` avec `selectedOption: "2"`.

---

## Fix 1 : Flexibilite cross-phase (Backend - prompt)

**Fichier** : `supabase/functions/planner-chat/index.ts` (buildSystemPrompt, lignes ~520-523)

**Changement** : Remplacer la regle rigide par une regle flexible :

Avant :
```
NE SAUTE PAS de phase. NE MELANGE PAS les phases.
Si l'utilisateur pose une question hors-phase, reponds brievement puis recentre sur la phase en cours.
```

Apres :
```
Suis la phase en cours EN PRIORITE. Cependant, si l'utilisateur pose une question 
hors-phase (activites, comparaison, budget, informations generales sur une destination), 
reponds COMPLETEMENT a sa question sans la bloquer. 
Apres avoir repondu, rappelle brievement ou vous en etes dans le processus 
et propose de continuer. Ne refuse JAMAIS de repondre a une question pertinente au voyage.
```

**Fichier** : `supabase/functions/planner-chat/prompts/phasePrompts.ts`

Meme changement dans chaque phase : modifier les `doNot` pour remplacer les interdictions rigides par des guidances souples. Par exemple dans `logistics.doNot`, supprimer "Ne pas revenir sur la destination sauf si l'utilisateur le demande" et ajouter "Si l'utilisateur pose une question sur les activites ou la destination, reponds-y avant de recentrer sur la logistique."

---

## Fix 2 : Budget mappe sur budgetRangeSlider (Backend + Frontend)

**Fichier** : `supabase/functions/planner-chat/tools/intentClassifier.ts`

Ajouter `budgetRangeSlider` dans le enum `widgetToShow.type` (ligne 230-241). Ajouter une section dans la description du tool :

```
### BUDGET (REGLE SPECIALE)
Si l'utilisateur mentionne un budget, un prix, ou veut definir son budget :
- "definir mon budget", "quel budget", "combien ca coute", "pas cher", "economique"
→ widgetType: "budgetRangeSlider" (PAS preferenceStyle)
preferenceStyle = sliders style de voyage (relax/intense, nature/urbain)
budgetRangeSlider = selection de fourchette de prix
```

**Fichier** : `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts`

Dans le bloc entity-based fallback (lignes 636-639), changer :
```typescript
if (entities.budgetLevel && canShowWidget("preferenceStyle").valid) {
```
en :
```typescript
if (entities.budgetLevel && canShowWidget("budgetRangeSlider").valid) {
  if (onWidgetTriggered) onWidgetTriggered("budgetRangeSlider");
  return { shouldShowWidget: true, widgetType: "budgetRangeSlider", action: "none", reason: "Budget level detected" };
}
```

---

## Fix 3 : Supprimer ask_question et other des widget-triggering intents (Frontend)

**Fichier** : `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts`

Lignes 599-612 : Supprimer `ask_question` de la liste `widgetTriggeringIntents`. Cet intent correspond a des questions libres qui ne devraient JAMAIS forcer l'affichage d'un widget.

Aussi ajouter un guard explicite : si `intent.primaryIntent === "other"` ou `"ask_question"` ou `"ask_recommendations"` ou `"compare_options"`, retourner directement `{ shouldShowWidget: false, widgetType: null, action: "none" }` AVANT le bloc `widgetTriggeringIntents`. Ces intents sont conversationnels et ne doivent jamais declencher de widget automatiquement.

```typescript
// Conversational intents: never auto-trigger widgets
const conversationalIntents = [
  "other", "ask_question", "ask_recommendations", 
  "compare_options", "greeting", "thank_you"
];
if (conversationalIntents.includes(intent.primaryIntent)) {
  return { shouldShowWidget: false, widgetType: null, action: "none" };
}
```

---

## Fix 4 : Flight search multi-destination sync (Frontend)

**Probleme** : Quand `flight:triggerSearch` est emis, le `FlightsPanel` se met en mode recherche mais les legs multi-destination du store ne sont pas synchronises vers le formulaire de recherche du panel.

**Fichier** : `src/hooks/useFlightState.ts`

Ajouter la synchronisation des legs depuis le flight memory store quand `triggerFlightSearch` passe a `true` :

```typescript
usePlannerEvent("flight:triggerSearch", useCallback(() => {
  setActiveTab("flights");
  setIsPanelVisible(true);
  
  // Sync multi-destination legs from memory store to flight form
  const memoryLegs = useFlightMemoryStore.getState().legs;
  const tripType = useFlightMemoryStore.getState().tripType;
  if (tripType === "multi" && memoryLegs.length > 0) {
    // Convert memory legs to FlightFormData format
    setFlightFormData({
      tripType: "multi",
      legs: memoryLegs.map(leg => ({
        from: leg.departure || "",
        to: leg.arrival || "",
        date: leg.departureDate ? leg.departureDate.toISOString().split("T")[0] : undefined,
      })),
    });
  }
  
  setTriggerFlightSearch(true);
}, [setActiveTab, setIsPanelVisible, setFlightFormData]));
```

**Fichier** : `src/components/planner/PlannerPanel.tsx`

Dans le `FlightsPanel`, ajouter la gestion du cas `flightFormData.legs` pour les multi-destinations. Quand `triggerSearch` est `true` et que des `legs` existent dans le `flightFormData`, populer le formulaire multi-destination du panel avec ces legs avant de lancer la recherche.

---

## Fix 5 : Desambiguisation contextuelle des nombres (Backend)

**Fichier** : `supabase/functions/planner-chat/index.ts` (buildClassificationSystemPrompt)

Ajouter une regle contextuelle dans le prompt du classificateur :

```
REGLE CRITIQUE : NOMBRES EN CONTEXTE
Si le dernier message assistant contenait une liste numerotee (1. Option A / 2. Option B) 
et que l'utilisateur repond uniquement par un nombre ("2", "1", "3") :
→ primaryIntent: "confirm_selection"
→ entities.selectedOption: "[le numero]"
→ NE PAS interpreter comme provide_travelers ou adults

Un nombre SEUL n'est JAMAIS un nombre de voyageurs sauf si le contexte 
parle explicitement de voyageurs/passagers/personnes.
```

**Fichier** : `supabase/functions/planner-chat/tools/intentClassifier.ts`

Ajouter `selectedOption` dans les entities du schema :

```typescript
selectedOption: {
  type: "string",
  description: "Quand l'utilisateur repond a un choix numerote (1, 2, 3) ou par le nom d'une option proposee dans le message precedent."
}
```

---

## Resume des fichiers modifies

| Fix | Fichier(s) | Type |
|-----|-----------|------|
| 1 - Cross-phase flexibility | `planner-chat/index.ts`, `phasePrompts.ts` | Backend prompt |
| 2 - Budget widget mapping | `intentClassifier.ts`, `useUnifiedIntentRouter.ts` | Backend + Frontend |
| 3 - Conversational intent guard | `useUnifiedIntentRouter.ts` | Frontend |
| 4 - Multi-dest search sync | `useFlightState.ts`, `PlannerPanel.tsx` | Frontend |
| 5 - Number disambiguation | `planner-chat/index.ts`, `intentClassifier.ts` | Backend |

## Pourquoi c'est scalable

- **Fix 1** : Tout ajout de phase future beneficie de la meme regle souple. Pas de listes d'exceptions a maintenir.
- **Fix 2** : Le mapping `budgetLevel -> budgetRangeSlider` est declaratif dans l'intent classifier. Ajouter un nouveau widget = 1 ligne dans l'enum + 1 regle dans la description.
- **Fix 3** : La liste `conversationalIntents` est semantique. Ajouter un nouvel intent conversationnel = 1 string dans le tableau.
- **Fix 4** : La synchronisation utilise le store existant (`useFlightMemoryStore`) comme source de verite. Tout ajout de champ au store est automatiquement disponible.
- **Fix 5** : La regle est semantique (basee sur le contexte du dernier message), pas sur des mots-cles. Fonctionne dans toutes les langues.

