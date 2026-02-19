
## Plan : Activer le vrai streaming mot-a-mot (style ChatGPT)

### Diagnostic

Le probleme vient du backend (edge function `planner-chat`). Voici ce qui se passe actuellement :

1. **La boucle ReAct (ligne 1091) utilise toujours `stream: false`** pour l'appel OpenAI
2. Quand le LLM repond directement sans outils (`loopCount === 0`), le contenu est deja genere en entier (ligne 1111)
3. Ce contenu pre-genere est ensuite "simule" en streaming via `createSimulatedStreamingResponse` -- qui decoupe le texte mot par mot avec des `setTimeout(0)`, mais le navigateur recoit souvent tout en un seul bloc TCP
4. Le vrai streaming (passthrough OpenAI SSE) n'est active que quand `loopCount > 0` ET `needsQuickReplies === false` -- ce qui arrive rarement car `generate_quick_replies` est presque toujours disponible

Le frontend est correctement cable (`streamingText`, `setStreamingText`, `MarkdownMessage` en mode raw text pendant le streaming). Le probleme est **100% backend**.

---

### Solution

Modifier l'edge function pour utiliser le vrai streaming OpenAI dans le cas `loopCount === 0` (reponse directe sans outils), qui represente la majorite des interactions.

#### Changement 1 : Streaming reel pour les reponses directes (loopCount === 0)

Actuellement, quand le LLM repond sans appeler d'outils, le contenu est capture en bloc (ligne 1108-1113) puis simule. Le changement consiste a :

- Detecter le cas `loopCount === 0` + pas de tool_calls + `stream === true`
- Au lieu de capturer le contenu en bloc, refaire un appel OpenAI avec `stream: true` et le passer directement via `createStreamingResponse`
- Alternative plus simple : dans le premier appel de la boucle ReAct, si `stream === true`, passer `stream: true` a OpenAI. Si la reponse contient des tool_calls, les traiter normalement. Sinon, passer le flux SSE directement au client.

L'approche retenue est la **seconde** (plus performante, un seul appel LLM) :

```text
// Ligne ~1084-1091 : modifier pour supporter le streaming conditionnel
// Si stream === true ET c'est le premier tour de boucle, on peut streamer
// MAIS on doit d'abord verifier si le LLM veut appeler des outils

// Approche pragmatique : quand loopCount === 0 et pas de tool_calls,
// refaire un appel rapide avec stream: true au lieu de retourner le contenu en bloc
```

Concretement, dans le bloc `if (!choice?.message?.tool_calls)` (ligne 1108) :

```text
// AVANT (bloc actuel):
finalContent = choice?.message?.content || "";
break;

// APRES:
if (stream && loopCount === 0) {
  // Le LLM a repondu directement sans outils : relancer en streaming
  // On reutilise les memes messages mais avec stream: true
  const streamingResp = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: conversationMessages,
      temperature: 0.7,
      max_tokens: MULTI_TOOL_CONFIG.REACT_MAX_TOKENS,
      stream: true,
    }),
  }, log, "direct_stream");
  
  if (streamingResp.ok) {
    normalizeExtractedYears(collectedData, currentDate);
    return createStreamingResponse(streamingResp, collectedData, log, requestId, toolExecutionLog);
  }
  // Fallback si le streaming echoue
  finalContent = choice?.message?.content || "";
}
finalContent = choice?.message?.content || "";
break;
```

**IMPORTANT** : Cette approche fait un double appel LLM (un non-streame pour detecter les outils, un streame pour le contenu). C'est le prix a payer tant que la boucle ReAct a besoin de `stream: false` pour detecter les tool_calls.

#### Changement 2 : Forcer le streaming reel meme quand quick replies sont demandees

Actuellement, ligne 1178 : `const useRealStreaming = stream && !needsQuickReplies`. Comme `needsQuickReplies` est presque toujours `true`, le vrai streaming est quasi-jamais utilise pour le cas `loopCount > 0`.

Solution : streamer le contenu en reel, puis faire un appel separe non-streame uniquement pour les quick replies :

```text
// AVANT:
const useRealStreaming = stream && !needsQuickReplies;

// APRES:
const useRealStreaming = stream; // Toujours streamer le contenu
// Les quick replies seront generees dans un appel separe si necessaire
```

Si `needsQuickReplies`, ajouter un second appel rapide apres le streaming pour generer les quick replies, et les emettre comme un evenement SSE supplementaire avant le `[DONE]`.

#### Changement 3 : Ameliorer createStreamingResponse pour les quick replies post-stream

Modifier `createStreamingResponse` pour accepter un callback optionnel qui s'execute apres la fin du flux OpenAI mais avant le `[DONE]`. Ce callback fera l'appel quick replies et emettra l'evenement SSE correspondant.

---

### Fichiers modifies

| Fichier | Action |
|---|---|
| `supabase/functions/planner-chat/index.ts` | Ajouter streaming reel pour `loopCount === 0`, decouple quick replies du streaming |

### Risques et mitigations

- **Double appel LLM (loopCount === 0)** : Augmente la latence d'environ 200ms (temps de setup du second appel). Acceptable car l'utilisateur voit le texte arriver immediatement au lieu d'attendre 3-7 secondes en bloc.
- **Quick replies en post-stream** : L'appel separe ajoute ~500ms apres la fin du contenu, mais les quick replies apparaissent deja apres le message donc l'UX n'est pas impactee.
- **Fallback** : Si le streaming echoue, on retombe sur le comportement actuel (simulated streaming).
