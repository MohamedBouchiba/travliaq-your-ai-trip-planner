

# Plan : Garantir que `classify_intent` est toujours appele

## Diagnostic reel

Le debug montre clairement le probleme :

```
"No tool calls, ending loop" at loopCount: 0
tools_called: []
intent: null
```

Le LLM n'appelle **aucun tool** malgre `tool_choice: "required"`. Il met tout dans son texte (y compris des `<action>` tags). Quand `classify_intent` EST appele, la logique `applyPreferenceFirstLogic` fonctionne correctement et override vers `preferenceInterests`. Le probleme n'est pas la decision de widget, c'est que le LLM court-circuite entierement le systeme de tools.

### Causes probables

1. **`tool_choice: "required"` n'est peut-etre pas supporte par Azure OpenAI de la meme facon** -- certaines versions d'API ignorent ce parametre ou le traitent differemment.
2. **Le system prompt est trop long (7866 tokens)** -- le LLM "oublie" les instructions d'appeler les outils quand le contexte est trop charge.
3. **Le LLM genere du contenu ET pas de tools** -- `tool_choice: "required"` devrait forcer un tool call, mais si le modele retourne quand meme du `content` sans `tool_calls`, le code sort de la boucle immediatement.

## Solution : Architecture "Classify First" en deux appels separes

Au lieu de faire confiance a `tool_choice` pour forcer le LLM, on fait **un premier appel dedie** uniquement a la classification d'intent, avec un context minimal et `tool_choice` force sur `classify_intent` specifiquement.

### Pourquoi c'est scalable

- Le LLM decide toujours de l'intent (pas de regex, pas de mots-cles)
- Fonctionne dans toutes les langues (le LLM comprend le sens, pas les mots)
- Fonctionne pour tous les widgets (le LLM a la liste complete dans le tool schema)
- Le deuxieme appel (generation de texte) est plus leger car l'intent est deja decide
- La logique deterministe `applyPreferenceFirstLogic` reste en post-traitement comme filet de securite

## Changements

### 1. Separer l'appel de classification de l'appel de generation

**Fichier** : `supabase/functions/planner-chat/index.ts`

Avant la boucle ReAct actuelle, ajouter un **premier appel dedie** :

```typescript
// STEP 1: Dedicated intent classification call (lightweight, forced)
const classificationMessages = [
  { role: "system", content: buildClassificationSystemPrompt(preferencesState) },
  // Only the last user message for classification
  lastUserMessage,
];

const classifyResponse = await fetch(url, {
  method: "POST",
  headers: { "api-key": AZURE_OPENAI_API_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: classificationMessages,
    temperature: 0.3,  // Lower temperature for more deterministic classification
    max_tokens: 200,   // Classification doesn't need much tokens
    tools: [intentClassifierTool],  // ONLY the classify_intent tool
    tool_choice: { type: "function", function: { name: "classify_intent" } },
    stream: false,
  }),
});
```

Points cles :
- **`tool_choice: { type: "function", function: { name: "classify_intent" } }`** -- force exactement ce tool, pas juste "required"
- **`tools: [intentClassifierTool]`** -- un seul tool disponible, pas de confusion
- **System prompt minimal** -- juste les regles de classification, pas tout le prompt conversationnel
- **`temperature: 0.3`** -- plus deterministe pour la classification
- **`max_tokens: 200`** -- la classification n'a pas besoin de beaucoup de tokens

### 2. Creer un system prompt minimal pour la classification

**Fichier** : `supabase/functions/planner-chat/index.ts`

```typescript
function buildClassificationSystemPrompt(
  preferencesState: { interests: string[]; style: string | null }
): string {
  return `Tu es un classificateur d'intention. Analyse le message et appelle classify_intent.

CONTEXTE PREFERENCES:
- Interets: ${preferencesState.interests.length > 0 ? preferencesState.interests.join(", ") : "VIDE"}
- Style: ${preferencesState.style || "NON DEFINI"}

REGLE: Si l'utilisateur hesite/ne sait pas et que les preferences sont VIDES, 
primaryIntent = "gather_preferences", widgetType = "preferenceInterests".`;
}
```

Ce prompt fait ~100 tokens au lieu de ~3000. Le LLM a une seule tache, un seul tool, et des instructions claires.

### 3. Injecter le resultat dans la boucle ReAct existante

Apres le premier appel, le resultat de `classify_intent` est pre-charge dans `collectedData`. La boucle ReAct continue normalement mais :
- `classify_intent` est deja fait, le LLM ne le refait pas
- Le system prompt du deuxieme appel inclut le contexte de l'intent deja classifie
- Les autres tools (plan_response, update_flight_widget, etc.) restent disponibles

```typescript
// Parse classification result
const classifyData = await classifyResponse.json();
const classifyToolCall = classifyData.choices?.[0]?.message?.tool_calls?.[0];

if (classifyToolCall?.function?.name === "classify_intent") {
  const { result, updatedData } = processToolCall(classifyToolCall, requestId, collectedData, log, preferencesState);
  collectedData = mergeToolData(collectedData, updatedData);
  
  // Log for debug
  toolExecutionLog.push({
    tool: "classify_intent",
    status: result.success ? "finished" : "failed",
    latency_ms: classifyLatency,
    summary: `Intent: ${collectedData.intentClassification?.primaryIntent || "unknown"}`,
    timestamp: Date.now(),
    loopIteration: -1, // Pre-loop
  });
}

// STEP 2: Continue with existing ReAct loop (without classify_intent in tools)
const reActTools = ALL_TOOLS.filter(t => t.function.name !== "classify_intent");
```

### 4. Supprimer les patches fragiles

**Fichier** : `supabase/functions/planner-chat/index.ts`

Retirer :
- `tool_choice: loopCount === 0 ? "required" : "auto"` -- remettre `"auto"` pour la boucle ReAct
- Le bloc fallback regex (lignes 696-724) -- le classify_intent est maintenant garanti
- Le strip `<action>` tags (ligne 760) -- garder par securite mais ne devrait plus etre necessaire

Garder :
- `applyPreferenceFirstLogic` -- filet de securite deterministe, pas de mal a le garder
- `applyWidgetForcingLogic` -- pour les cas limites

### 5. Aucun changement frontend

Le frontend n'a pas besoin de changer. Le contrat SSE reste identique :
- `intentClassification` est emis dans le stream
- `processIntent` dans `useUnifiedIntentRouter` le traite
- Le widget est affiche via le flux existant

## Resume des fichiers

| Fichier | Changement |
|---------|------------|
| `supabase/functions/planner-chat/index.ts` | Ajouter l'appel de classification dedie avant la boucle ReAct, retirer les patches regex/tool_choice |

Un seul fichier modifie. Pas de changement frontend.

## Pourquoi c'est scalable et intelligent

1. **Le LLM decide toujours** -- pas de regex, pas de mots-cles, fonctionne dans toutes les langues
2. **Appel dedie = fiabilite** -- un seul tool, un prompt minimal, temperature basse = classification quasi-deterministe
3. **Post-traitement deterministe preservee** -- `applyPreferenceFirstLogic` reste comme filet de securite pour les cas ou le LLM classerait mal malgre tout
4. **Pas de changement frontend** -- meme contrat SSE, meme `processIntent`, meme flux
5. **Extensible** -- ajouter un nouveau widget = ajouter une option dans l'enum de `classify_intent`, le LLM le detectera automatiquement
6. **Performance** -- le premier appel est rapide (~200 tokens max), le deuxieme appel est plus leger car l'intent est deja decide

