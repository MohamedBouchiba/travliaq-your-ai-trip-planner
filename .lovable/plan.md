
# Plan Ultime : Architecture Chat Agentique Travel Planner

## Vue d'ensemble

Ce plan consolide **toutes les améliorations précédentes** et ajoute des axes critiques pour atteindre une implémentation "production-grade".

---

## PHASE 1 : Observabilité & Logging Centralisé (Sentry)

### 1.1 Logger Backend pour Edge Functions

**Créer** : `supabase/functions/_shared/logger.ts`

```typescript
// Logger centralisé avec envoi vers Sentry via le tunnel existant
export function createRequestLogger(requestId: string, userId?: string) {
  const events: LogEvent[] = [];
  const startTime = Date.now();
  
  return {
    info: (category: string, message: string, data?: Record<string, any>) => {...},
    error: (category: string, message: string, error?: Error, data?: Record<string, any>) => {...},
    toolStart: (toolName: string) => {...},
    toolEnd: (toolName: string, success: boolean, latencyMs: number, result?: any) => {...},
    azureCall: (type: "start" | "end", latencyMs?: number, tokens?: number) => {...},
    flush: async () => { /* Envoie le batch à Sentry via sentry-tunnel */ }
  };
}
```

### 1.2 Enrichir le Logger Frontend

**Modifier** : `src/utils/logger.ts`

- Ajouter `LogCategory.PLANNER_CHAT` et `LogCategory.PLANNER_TOOL`
- Créer `plannerLogger` avec méthodes spécialisées :
  - `logRequest(requestId, message, metadata)`
  - `logToolEvent(requestId, tool, status, metadata)`
  - `logError(requestId, error, context)`

### 1.3 Propagation du Request ID

**Modifier** : `src/components/planner/chat/hooks/useChatStream.ts`

- Générer `requestId = crypto.randomUUID()` au début de chaque requête
- Envoyer dans header `X-Request-ID` ET dans le body JSON
- Logger côté frontend : request start, SSE events, completion/error

**Modifier** : `supabase/functions/planner-chat/index.ts`

- Récupérer `requestId` du header ou body (fallback: générer un nouveau)
- Utiliser le logger pour toutes les étapes clés

---

## PHASE 2 : Robustesse des Tools

### 2.1 Validation des Outputs avec Zod

**Modifier** : `supabase/functions/planner-chat/index.ts`

Actuellement les outputs sont parsés sans validation :
```typescript
// AVANT (dangereux)
flightData = JSON.parse(toolCall.function.arguments);
```

Ajouter une validation stricte :
```typescript
// APRÈS (sécurisé)
import { z } from "npm:zod";

const FlightDataSchema = z.object({
  to: z.string().max(100).optional(),
  from: z.string().max(100).optional(),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().min(1).max(9).optional(),
  children: z.number().min(0).max(9).optional(),
  infants: z.number().min(0).max(9).optional(),
  needsDateWidget: z.boolean().optional(),
  needsTravelersWidget: z.boolean().optional(),
  needsCitySelection: z.boolean().optional(),
  toCountryCode: z.string().length(2).optional(),
  // ... autres champs
}).strict();

const result = FlightDataSchema.safeParse(JSON.parse(toolCall.function.arguments));
if (!result.success) {
  log.error("tool_validation", "Invalid flight data", null, { errors: result.error.issues });
  flightData = null; // Ne pas utiliser des données invalides
} else {
  flightData = result.data;
}
```

### 2.2 Erreurs Structurées pour Auto-Correction

**Problème actuel** : Les erreurs sont ignorées, le LLM ne sait pas qu'il a mal répondu.

**Solution** : Retourner des erreurs structurées dans les tool responses :

```typescript
// Nouveau pattern pour les tool responses
interface ToolResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;  // INVALID_DATE_FORMAT, MISSING_REQUIRED_FIELD, etc.
    message: string;
    suggestion?: string;  // Pour aider le LLM à se corriger
  };
}

// Exemple d'utilisation
if (!result.success) {
  return {
    success: false,
    error: {
      code: "VALIDATION_FAILED",
      message: `Invalid fields: ${result.error.issues.map(i => i.path.join('.')).join(', ')}`,
      suggestion: "Please ensure dates are in YYYY-MM-DD format and passenger counts are between 1-9"
    }
  };
}
```

### 2.3 Limite du Contexte (15 derniers messages)

**Modifier** : `useChatStream.ts` ou `PlannerChat.tsx`

Actuellement tout l'historique est envoyé. Risque de dépassement de contexte.

```typescript
// Limiter les messages envoyés
const MAX_MESSAGES = 15;
const apiMessages = messages.slice(-MAX_MESSAGES).map(m => ({
  role: m.role,
  content: m.content
}));

// Le memoryContext contient déjà le résumé structuré
```

---

## PHASE 3 : Streaming Events & UX

### 3.1 Nouveaux Events SSE : tool_started / tool_finished

**Modifier** : `supabase/functions/planner-chat/index.ts`

Ajouter des events pour la visibilité sur l'exécution des tools :

```typescript
// Avant l'exécution d'un tool
const emitToolStart = (toolName: string, reason?: string) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "tool_started",
    tool: toolName,
    reason: reason || `Processing ${toolName}...`,
    timestamp: Date.now()
  })}\n\n`));
};

// Après l'exécution
const emitToolEnd = (toolName: string, success: boolean, latencyMs: number, summary?: string) => {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
    type: "tool_finished",
    tool: toolName,
    success,
    latency_ms: latencyMs,
    summary,
    timestamp: Date.now()
  })}\n\n`));
};

// Utilisation dans la boucle de parsing des tools
for (const toolCall of choice.message.tool_calls) {
  const toolStartTime = Date.now();
  emitToolStart(toolCall.function.name);
  
  // ... exécution du tool ...
  
  emitToolEnd(toolCall.function.name, true, Date.now() - toolStartTime, "Destination détectée: Tokyo");
}
```

### 3.2 Parser les Nouveaux Events Frontend

**Modifier** : `src/components/planner/chat/hooks/useChatStream.ts`

```typescript
// Dans le parser SSE
if (parsed.type === "tool_started") {
  plannerLogger.logToolEvent(requestId, parsed.tool, "started");
  onToolStatus?.({
    tool: parsed.tool,
    status: "started",
    reason: parsed.reason
  });
}

if (parsed.type === "tool_finished") {
  plannerLogger.logToolEvent(requestId, parsed.tool, "finished", {
    latency_ms: parsed.latency_ms,
    success: parsed.success
  });
  onToolStatus?.({
    tool: parsed.tool,
    status: parsed.success ? "finished" : "failed",
    summary: parsed.summary
  });
}
```

### 3.3 Composant ToolStatusIndicator (Nouveau)

**Créer** : `src/components/planner/chat/ToolStatusIndicator.tsx`

```typescript
// Affiche le statut des tools en cours d'exécution
interface ToolStatusIndicatorProps {
  tools: Array<{
    name: string;
    status: "pending" | "running" | "success" | "error";
    duration?: number;
    summary?: string;
  }>;
}

// Icônes par type de tool
const TOOL_ICONS: Record<string, string> = {
  classify_intent: "🎯",
  plan_response: "🧠",
  update_flight_widget: "✈️",
  generate_quick_replies: "💬",
  // ...
};
```

---

## PHASE 4 : Sécurité & Validation

### 4.1 Validation des Inputs (Déjà en place, à renforcer)

**Vérifier/Améliorer** : `supabase/functions/planner-chat/index.ts`

```typescript
// Schéma de validation pour les inputs
const RequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().max(10000)  // Limite de taille
  })).max(50),  // Max 50 messages
  stream: z.boolean().optional(),
  currentPhase: z.enum(["inspiration", "research", "comparison", "planning", "booking"]).optional(),
  language: z.enum(["fr", "en"]).optional(),
  blockedWidgets: z.array(z.string()).optional(),
  // ...
});

const { messages, stream, ...rest } = RequestSchema.parse(await req.json());
```

### 4.2 Rate Limiting Basique

**Considération** : Ajouter un rate limit simple basé sur userId

```typescript
// Simple in-memory rate limit (pour démo - en prod utiliser Redis)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 20;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(userId);
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (limit.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  limit.count++;
  return true;
}
```

---

## PHASE 5 : Améliorations Structurelles (Challenges Supplémentaires)

### 5.1 CHALLENGE : Refactoring des Tools en Fichiers Séparés

**Problème** : `index.ts` fait 1220 lignes avec 8 tools inline.

**Solution** : Structurer proprement

```
supabase/functions/planner-chat/
├── index.ts              # Orchestrateur (~300 lignes)
├── tools/
│   ├── index.ts          # Export centralisé
│   ├── intentClassifier.ts   ✅ (existe)
│   ├── reasoningEngine.ts    ✅ (existe)
│   ├── flightExtractor.ts    # NOUVEAU
│   ├── accommodationExtractor.ts  # NOUVEAU
│   ├── preferenceExtractor.ts  # NOUVEAU
│   ├── quickReplies.ts       # NOUVEAU
│   ├── destinationSuggestions.ts  # NOUVEAU
│   └── flightSearchTrigger.ts  # NOUVEAU
├── validators/
│   ├── schemas.ts        # Tous les schémas Zod
│   └── index.ts
└── prompts/
    ├── phasePrompts.ts   ✅ (existe)
    └── systemPrompts.ts  ✅ (existe)
```

### 5.2 CHALLENGE : Boucle Multi-Tools (ReAct Pattern)

**Problème actuel** : Le backend fait 1 appel tools → 1 appel response. Pas de chaînage.

**Pattern souhaité** (ReAct) :
```
User message → Tool1 → Result1 → LLM décide → Tool2 → Result2 → ... → Response finale
```

**Implémentation suggérée** :
```typescript
const MAX_TOOL_LOOPS = 3;
let loopCount = 0;
let response = await callAzureOpenAI(messages, tools);

while (response.tool_calls && loopCount < MAX_TOOL_LOOPS) {
  log.info("multi_tool", `Tool loop ${loopCount + 1}`, { tools: response.tool_calls.map(t => t.function.name) });
  
  const toolResults = await executeToolsWithValidation(response.tool_calls);
  const toolMessages = buildToolResponseMessages(response, toolResults);
  
  response = await callAzureOpenAI([...messages, response, ...toolMessages], tools);
  loopCount++;
}
```

### 5.3 CHALLENGE : Résumé Progressif de Conversation

**Problème** : Conversations longues → dépassement de contexte → hallucinations.

**Solution** : Résumé automatique tous les N messages

```typescript
// Dans PlannerChat.tsx ou un hook dédié
const MAX_RAW_MESSAGES = 10;
const SUMMARY_INTERVAL = 5;

async function getOptimizedContext(messages: Message[]): Promise<APIMessage[]> {
  if (messages.length <= MAX_RAW_MESSAGES) {
    return messages.map(m => ({ role: m.role, content: m.content }));
  }
  
  // Garder les 5 derniers messages bruts
  const recentMessages = messages.slice(-5);
  
  // Le memoryContext contient déjà le résumé structuré via les stores Zustand
  // Pas besoin de résumé LLM supplémentaire si les stores sont bien maintenus
  
  return recentMessages.map(m => ({ role: m.role, content: m.content }));
}
```

### 5.4 CHALLENGE : Idempotence des Tools (toolRunId)

**Problème** : Si une requête est rejouée (retry), le même tool peut s'exécuter 2 fois.

**Solution** : Ajouter un identifiant unique par exécution de tool

```typescript
// Générer un toolRunId unique
const toolRunId = `${requestId}_${toolCall.id}`;

// Vérifier si déjà exécuté (optionnel - nécessite un cache partagé)
if (await hasAlreadyExecuted(toolRunId)) {
  return getCachedResult(toolRunId);
}

// Exécuter et cacher le résultat
const result = await executeTool(toolCall);
await cacheResult(toolRunId, result);
```

---

## PHASE 6 : Métriques & Debugging

### 6.1 Dashboard de Métriques (via Sentry)

Avec le logging centralisé, on peut créer des dashboards Sentry pour :

- **Latence moyenne** : `avg(tool.latency_ms)` par tool
- **Taux d'erreur** : `count(level:error) / count(*)` par catégorie
- **Tokens consommés** : `sum(tokens_used)` par jour
- **Intentions les plus fréquentes** : `count(primaryIntent)` groupé

### 6.2 Mode Debug Frontend

Améliorer `IntentDebugPanel.tsx` existant pour afficher :
- Request ID pour le support
- Latences des tools
- Contexte mémoire envoyé
- Widgets bloqués par cooldown

---

## Résumé des Fichiers à Modifier/Créer

| Fichier | Action | Priorité |
|---------|--------|----------|
| `supabase/functions/_shared/logger.ts` | CRÉER | P1 |
| `supabase/functions/planner-chat/index.ts` | MODIFIER (logging, validation, SSE events) | P1 |
| `src/utils/logger.ts` | MODIFIER (catégories planner) | P1 |
| `src/components/planner/chat/hooks/useChatStream.ts` | MODIFIER (requestId, tool events) | P1 |
| `src/components/planner/chat/ToolStatusIndicator.tsx` | CRÉER | P2 |
| `supabase/functions/planner-chat/validators/schemas.ts` | CRÉER | P2 |
| `supabase/functions/planner-chat/tools/*.ts` | REFACTORING | P3 |

---

## Ordre d'Implémentation Recommandé

### Sprint 1 (2-3 jours) - Fondations
1. Créer `_shared/logger.ts`
2. Intégrer le logger dans `planner-chat/index.ts`
3. Ajouter `plannerLogger` au frontend
4. Propager `requestId` frontend → backend

### Sprint 2 (2-3 jours) - Robustesse
5. Ajouter validation Zod des outputs tools
6. Implémenter les events SSE `tool_started`/`tool_finished`
7. Créer `ToolStatusIndicator.tsx`
8. Parser les nouveaux events dans `useChatStream.ts`

### Sprint 3 (3-4 jours) - Optimisation
9. Limiter les messages envoyés (15 max)
10. Ajouter rate limiting basique
11. Refactorer les tools en fichiers séparés

### Sprint 4 (Optionnel - Avancé)
12. Implémenter la boucle multi-tools
13. Ajouter l'idempotence (toolRunId)
14. Créer des dashboards Sentry

---

## Points Forts Préservés

- Architecture 2-appels (tools → response)
- Stores Zustand (FlightMemory, Preferences, etc.)
- useWidgetCooldown (anti-boucle)
- useUnifiedIntentRouter (source unique de vérité)
- SSE streaming existant
- Chain of Thought (plan_response)
- Tunnel Sentry existant
- Logger frontend existant (`src/utils/logger.ts`)

