

# Plan : Forcer le parcours "Preferences d'abord" via du code deterministe

## Diagnostic

Le probleme est clair dans le debug : malgre les instructions dans le system prompt et l'intent classifier (priorite 11 pour l'indecision), le LLM **ignore** la regle "preferences avant destinations" et retourne `primaryIntent: "destinationSuggestions"` avec `widgetToShow: "destinationSuggestions"` quand l'utilisateur dit "je sais pas trop ou aller".

### Pourquoi le LLM n'obeit pas

1. **Le LLM ne peut pas evaluer des conditions runtime** : L'intent classifier dit "SI preferences vides -> preferenceInterests", mais le LLM ne sait pas si les preferences sont vides. Il lit le contexte memoire dans les messages, mais il ne fait pas de logique conditionnelle fiable.

2. **`gather_preferences` n'existe pas dans l'enum** : L'intent `gather_preferences` est mentionne dans la description textuelle du tool mais n'est pas dans la liste `enum` du parametre `primaryIntent` dans le schema JSON du tool. Le LLM ne peut donc jamais le retourner.

3. **Conflit de priorites** : "je sais pas ou aller" matche a la fois les patterns d'indecision (priorite 11) et `destinationSuggestions` (priorite 4 avec "je ne sais pas ou"). Le LLM choisit le match le plus litteral.

4. **L'`<action>` tag dans le texte** : Le LLM essaie de compenser en generant `<action>{"type":"chooseWidget","widgetType":"preferenceInterests"}</action>` dans son texte, mais ce mecanisme est concu uniquement pour "choisis pour moi" et est bloque par le frontend.

### La solution : Logique deterministe cote backend

Plutot que de faire confiance au LLM pour des decisions conditionnelles, on ajoute un **post-traitement deterministe** dans `processToolCall` qui override le `widgetToShow` de l'intent classifier quand les conditions sont reunies.

---

## Changements

### 1. Ajouter `gather_preferences` a l'enum de l'intent classifier

**Fichier** : `supabase/functions/planner-chat/tools/intentClassifier.ts`

Ajouter `"gather_preferences"` dans la liste `enum` du champ `primaryIntent` (actuellement absent, ce qui empeche le LLM de le retourner).

### 2. Envoyer l'etat des preferences au backend

**Fichier** : `src/components/planner/chat/hooks/useChatStream.ts`

Ajouter un champ `preferencesState` dans le body de la requete POST avec les interets et le style actuels :

```typescript
body: JSON.stringify({
  // ... existing fields ...
  preferencesState: {
    interests: memoryContext.interests || [],
    style: memoryContext.style || null,
    pace: memoryContext.pace || null,
  },
}),
```

### 3. Override deterministe du widget dans le backend

**Fichier** : `supabase/functions/planner-chat/index.ts`

Apres le traitement de `classify_intent`, appliquer une logique deterministe :

```typescript
// In applyWidgetForcingLogic or as a new post-processing step:

function applyPreferenceFirstLogic(
  intentClassification: IntentClassificationResult,
  preferencesState: { interests: string[]; style: string | null },
  log: RequestLogger
): IntentClassificationResult {
  // Detect indecision patterns in the original user message
  const isIndecisIntent = [
    "gather_preferences", "ask_inspiration", "search_destination"
  ].includes(intentClassification.primaryIntent);
  
  const isDestinationSuggestion = 
    intentClassification.widgetToShow?.type === "destinationSuggestions" ||
    intentClassification.primaryIntent === "destinationSuggestions";

  // If user is indecis OR system wants to show destinations
  // BUT preferences are empty -> override to preferenceInterests
  if ((isIndecisIntent || isDestinationSuggestion) && 
      (!preferencesState.interests || preferencesState.interests.length === 0)) {
    log.info("preference_first", "Overriding to preferenceInterests (empty interests)");
    intentClassification.primaryIntent = "gather_preferences";
    intentClassification.widgetToShow = {
      type: "preferenceInterests",
      reason: "Preferences must be collected before suggesting destinations",
    };
    return intentClassification;
  }

  // If interests exist but no style -> preferenceStyle
  if ((isIndecisIntent || isDestinationSuggestion) && !preferencesState.style) {
    log.info("preference_first", "Overriding to preferenceStyle (missing style)");
    intentClassification.primaryIntent = "gather_preferences";
    intentClassification.widgetToShow = {
      type: "preferenceStyle",
      reason: "Travel style needed before suggesting destinations",
    };
    return intentClassification;
  }

  return intentClassification;
}
```

Cette logique est **deterministe** : elle ne depend pas du LLM, elle verifie programmatiquement si les preferences sont vides et override le widget en consequence.

### 4. Recevoir et utiliser `preferencesState` dans le backend

**Fichier** : `supabase/functions/planner-chat/index.ts`

Extraire `preferencesState` du body de la requete et le passer a `applyWidgetForcingLogic` / `applyPreferenceFirstLogic`.

### 5. Gerer `gather_preferences` dans le frontend intent router

**Fichier** : `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts`

Ajouter `"gather_preferences"` a la liste `widgetTriggeringIntents` pour que le router sache que cet intent peut declencher un widget.

### 6. Passer le context de preferences depuis PlannerChat

**Fichier** : `src/components/planner/PlannerChat.tsx`

S'assurer que le `memoryContext` passe a `useChatStream` inclut `interests` et `style` extraits du `preferenceMemoryState`.

---

## Resume des fichiers a modifier

| Fichier | Changement |
|---------|------------|
| `supabase/functions/planner-chat/tools/intentClassifier.ts` | Ajouter `gather_preferences` a l'enum `primaryIntent` |
| `supabase/functions/planner-chat/index.ts` | Nouvelle fonction `applyPreferenceFirstLogic` + extraire `preferencesState` du body |
| `src/components/planner/chat/hooks/useChatStream.ts` | Envoyer `preferencesState` dans le body |
| `src/components/planner/chat/hooks/useUnifiedIntentRouter.ts` | Ajouter `gather_preferences` aux intents qui declenchent des widgets |
| `src/components/planner/PlannerChat.tsx` | Passer interests/style dans le memoryContext |

## Resultat attendu

1. L'utilisateur dit "je sais pas trop ou aller"
2. Le LLM classifie en `destinationSuggestions` (comme avant)
3. Le backend detecte que `interests` est vide et **override** vers `preferenceInterests`
4. Le frontend recoit `widgetToShow: "preferenceInterests"` et affiche le widget de preferences
5. Apres que l'utilisateur choisit ses preferences, la prochaine fois qu'il est indecis, les destinations seront basees sur ses choix

