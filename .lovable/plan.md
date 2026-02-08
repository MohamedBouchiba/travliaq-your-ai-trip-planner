# Plan Ultime : Architecture Chat Agentique Travel Planner

## État d'avancement

| Sprint | Description | Status |
|--------|-------------|--------|
| Sprint 1 | Observabilité & Logging Centralisé | ✅ TERMINÉ |
| Sprint 2 | Robustesse des Tools (Zod, SSE events) | ✅ TERMINÉ |
| Sprint 3 | Optimisation (Rate limit, Context limit) | ✅ TERMINÉ |
| Sprint 4 | Multi-tools ReAct & Idempotence | ✅ TERMINÉ |

---

## Fichiers Créés/Modifiés

### Sprint 1 - Fondations
- ✅ `supabase/functions/_shared/logger.ts` - Logger centralisé backend
- ✅ `src/utils/logger.ts` - Logger frontend enrichi avec PLANNER_CHAT/PLANNER_TOOL
- ✅ `src/components/planner/chat/hooks/useChatStream.ts` - Propagation requestId

### Sprint 2 - Robustesse
- ✅ `supabase/functions/planner-chat/validators/schemas.ts` - Schémas Zod
- ✅ `src/components/planner/chat/ToolStatusIndicator.tsx` - Composant UI statut tools

### Sprint 3 - Optimisation
- ✅ `supabase/functions/planner-chat/tools/flightExtractor.ts`
- ✅ `supabase/functions/planner-chat/tools/accommodationExtractor.ts`
- ✅ `supabase/functions/planner-chat/tools/preferenceExtractor.ts`
- ✅ `supabase/functions/planner-chat/tools/quickReplies.ts`
- ✅ `supabase/functions/planner-chat/tools/destinationSuggestions.ts`
- ✅ `supabase/functions/planner-chat/tools/flightSearchTrigger.ts`
- ✅ `supabase/functions/planner-chat/tools/index.ts`

### Sprint 4 - Multi-tools & Idempotence
- ✅ `supabase/functions/planner-chat/utils/toolExecutor.ts` - Executor avec cache
- ✅ `supabase/functions/planner-chat/index.ts` - Refactorisé (réduit de 1416 → ~700 lignes)

---

## Architecture Finale

```
supabase/functions/planner-chat/
├── index.ts                 # Orchestrateur principal (~700 lignes)
├── tools/
│   ├── index.ts             # Exports centralisés + TOOL_NAMES
│   ├── intentClassifier.ts  # Classification d'intention
│   ├── reasoningEngine.ts   # Chain of Thought
│   ├── flightExtractor.ts   # Extraction vol
│   ├── accommodationExtractor.ts
│   ├── preferenceExtractor.ts
│   ├── quickReplies.ts
│   ├── destinationSuggestions.ts
│   └── flightSearchTrigger.ts
├── validators/
│   └── schemas.ts           # Schémas Zod pour validation
├── utils/
│   └── toolExecutor.ts      # Executor avec idempotence + cache
└── prompts/
    ├── phasePrompts.ts
    └── systemPrompts.ts

supabase/functions/_shared/
└── logger.ts                # Logger centralisé Sentry
```

---

## Fonctionnalités Implémentées

### 1. Multi-Tool Loop (ReAct Pattern)
```typescript
const MAX_LOOPS = 3;
while (loopCount <= MAX_LOOPS) {
  response = await callAzureOpenAI(messages, tools);
  if (!response.tool_calls) break;
  
  // Process tools, add to conversation
  for (const toolCall of response.tool_calls) {
    const { result, data } = processToolCall(toolCall);
    collectedData = mergeToolData(collectedData, data);
  }
  loopCount++;
}
```

### 2. Idempotence avec Cache
```typescript
const toolRunId = `${requestId}_${toolCallId}`;
const cached = getCachedToolResult(toolRunId);
if (cached) return cached;

const result = executeTool(toolCall);
cacheToolResult(toolRunId, result, TTL=5min);
```

### 3. Validation Zod
Tous les outputs tools sont validés avec des schémas stricts :
- FlightDataSchema
- AccommodationDataSchema
- PreferencesDataSchema
- QuickRepliesDataSchema
- DestinationSuggestionRequestSchema
- FlightSearchTriggerSchema

### 4. Rate Limiting
- 20 requêtes/minute par utilisateur
- Response 429 avec Retry-After header

### 5. Context Limiting
- Max 50 messages backend
- Max 15 messages frontend (sliding window)

### 6. SSE Events
- `tool_started` / `tool_finished` pour feedback temps réel
- `reasoning`, `intentClassification`, `flightData`, etc.

---

## Points Forts Préservés

- ✅ Architecture 2-appels (tools → response)
- ✅ Stores Zustand (FlightMemory, Preferences, etc.)
- ✅ useWidgetCooldown (anti-boucle)
- ✅ useUnifiedIntentRouter (source unique de vérité)
- ✅ SSE streaming existant
- ✅ Chain of Thought (plan_response)
- ✅ Tunnel Sentry existant
- ✅ Logger frontend existant

---

## Prochaines Étapes Optionnelles

1. **Dashboards Sentry** - Visualiser métriques par tool
2. **Redis Rate Limiting** - Persistence across cold starts
3. **Tests E2E** - Couverture du flow complet
4. **Monitoring Alertes** - Alertes sur erreurs critiques
