
# Plan d'Amélioration : Génération de Titre Intelligente + Page Debug Développeur

## Contexte des Problèmes Identifiés

### 1. Bug : Destinations Non Affichées
Quand tu dis "je ne sais pas trop où aller", le chat répond "Voici quelques suggestions de destinations" mais **aucune carte de destination ne s'affiche**. C'est un problème côté backend ou frontend dans le flux `destinationSuggestionRequest`.

**Diagnostic probable** : Le tool `request_destination_suggestions` n'a pas été déclenché par l'IA, ou le message de l'utilisateur ne matche pas les déclencheurs dans le système prompt.

### 2. Génération de Titre de Conversation
Actuellement, le titre est généré à partir du **premier message utilisateur**, tronqué à 35 caractères avec une icône basée sur des mots-clés. Ce n'est pas intelligent :
- "je ne sais pas trop ou aller" → devient le titre directement

**Solution proposée** : Générer le titre intelligemment après **2-3 échanges** en utilisant l'IA pour résumer la conversation.

### 3. Page Debug pour Développeur
Tu veux visualiser le workflow complet : intents détectés, tools appelés, reasoning, etc.

**Solution proposée** : Créer une **page dédiée `/planner-debug`** accessible uniquement en développement, qui affiche tout le flux en temps réel.

---

## Partie 1 : Génération de Titre Intelligente

### Logique de Génération

| Étape | Titre Affiché |
|-------|---------------|
| 0-2 messages utilisateur | `✈️ Nouvelle conversation` |
| ≥3 messages utilisateur | Titre généré par l'IA basé sur le contenu |

### Modifications Techniques

**Fichier : `src/hooks/useChatSessions.ts`**

1. Ajouter une fonction `generateSmartTitle()` qui appelle une edge function
2. Déclencher après le 3ème message utilisateur
3. Le titre est généré en arrière-plan (non-bloquant)
4. Fallback sur l'ancien système si l'IA échoue

**Nouvelle Edge Function : `supabase/functions/generate-chat-title/index.ts`**

```typescript
// Endpoint simple qui prend les 5 derniers messages et génère un titre
// Utilise Azure OpenAI avec un prompt concis
// Retourne : { title: "🏖️ Voyage en famille à Bali", emoji: "🏖️" }
```

### Format du Titre Généré

- Maximum 40 caractères
- Emoji pertinent en préfixe
- Résumé de l'intention principale (destination, style, occasion)
- Exemples :
  - `🏝️ Escapade tropicale en février`
  - `👨‍👩‍👧 Vacances famille Japon`
  - `💑 Lune de miel destination surprise`

---

## Partie 2 : Correction du Bug Destinations

### Diagnostic

Le flux actuel pour les suggestions de destinations :
1. Utilisateur envoie "je ne sais pas où aller"
2. Backend détecte l'intent et appelle le tool `request_destination_suggestions`
3. Frontend reçoit `destinationSuggestionRequest` dans le stream
4. Frontend appelle l'API `/destination-fact` pour récupérer les suggestions
5. Frontend met à jour le message avec le widget `destinationSuggestions`

**Problème probable** : L'IA ne déclenche pas le tool car le message "je ne sais pas trop où aller" ne matche pas exactement les déclencheurs.

### Corrections

**1. Enrichir les déclencheurs dans `destinationSuggestions.ts`** :
Ajouter des patterns plus naturels :
- "je ne sais pas où aller"
- "je ne sais pas trop"
- "aide-moi à choisir"
- "aucune idée de destination"

**2. Ajouter un fallback côté frontend** :
Si le message contient des mots-clés d'inspiration ET que l'IA n'a pas déclenché le tool, le frontend peut forcer l'affichage du widget de style/préférences.

---

## Partie 3 : Page Debug Développeur

### Route : `/planner-debug`

Accessible uniquement en `import.meta.env.DEV`

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    /planner-debug                               │
├───────────────────────────────┬─────────────────────────────────┤
│         CHAT ZONE             │        DEBUG PANEL              │
│   (Copie du PlannerChat)      │                                 │
│                               │   ┌─────────────────────────┐   │
│                               │   │ Intent Classification   │   │
│   [Message utilisateur]       │   │ - primaryIntent         │   │
│   [Réponse assistant]         │   │ - confidence: 85%       │   │
│                               │   │ - entities: {...}       │   │
│                               │   └─────────────────────────┘   │
│                               │                                 │
│                               │   ┌─────────────────────────┐   │
│                               │   │ Tool Executions         │   │
│                               │   │ ✓ classify_intent 45ms  │   │
│                               │   │ ✓ plan_response 120ms   │   │
│                               │   │ ○ request_destinations  │   │
│                               │   └─────────────────────────┘   │
│                               │                                 │
│                               │   ┌─────────────────────────┐   │
│                               │   │ Flow State              │   │
│                               │   │ [✓] hasDestination      │   │
│                               │   │ [ ] hasDepartureDate    │   │
│                               │   │ [ ] hasTravelers        │   │
│                               │   └─────────────────────────┘   │
│                               │                                 │
│                               │   ┌─────────────────────────┐   │
│                               │   │ Memory Context          │   │
│                               │   │ - flightSummary         │   │
│                               │   │ - blockedWidgets        │   │
│                               │   │ - widgetHistory         │   │
│                               │   └─────────────────────────┘   │
│                               │                                 │
│                               │   ┌─────────────────────────┐   │
│                               │   │ Raw API Response        │   │
│                               │   │ { ... JSON ... }        │   │
│                               │   └─────────────────────────┘   │
└───────────────────────────────┴─────────────────────────────────┘
```

### Fonctionnalités du Panel Debug

1. **Intent Classification** : Affiche l'intent détecté, la confiance, les entités
2. **Tool Executions** : Timeline des tools appelés avec durée et statut
3. **Flow State** : État du flux de réservation (destination, dates, voyageurs...)
4. **Memory Context** : Ce qui est envoyé à l'IA comme contexte
5. **Widget Decision** : Quel widget l'IA a décidé d'afficher et pourquoi
6. **Raw Response** : JSON brut de la réponse pour debug approfondi
7. **Reasoning** : Chain of Thought de l'IA (si activé)

### Composants à Créer

**`src/pages/PlannerDebug.tsx`** : Page principale avec layout split
**`src/components/planner/debug/DebugPanel.tsx`** : Panel complet de debug
**`src/components/planner/debug/ToolTimeline.tsx`** : Timeline visuelle des tools
**`src/components/planner/debug/MemoryInspector.tsx`** : Inspection du contexte mémoire
**`src/components/planner/debug/RawResponseViewer.tsx`** : Viewer JSON

---

## Résumé des Fichiers à Modifier/Créer

### Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useChatSessions.ts` | Ajouter `generateSmartTitle()` et logique de déclenchement |
| `src/App.tsx` | Ajouter route `/planner-debug` |
| `supabase/functions/planner-chat/tools/destinationSuggestions.ts` | Enrichir les déclencheurs |
| `src/components/planner/PlannerChat.tsx` | Exposer plus de données pour le debug (via context ou props) |

### Fichiers à Créer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/generate-chat-title/index.ts` | Edge function pour génération de titre IA |
| `src/pages/PlannerDebug.tsx` | Page de debug développeur |
| `src/components/planner/debug/DebugPanel.tsx` | Panel principal de debug |
| `src/components/planner/debug/ToolTimeline.tsx` | Timeline des tools |
| `src/components/planner/debug/MemoryInspector.tsx` | Inspecteur de mémoire |
| `src/components/planner/debug/RawResponseViewer.tsx` | Viewer JSON |
| `src/hooks/useDebugContext.ts` | Hook pour stocker et partager les données de debug |

---

## Ordre d'Implémentation Recommandé

1. **Correction du bug destinations** (le plus urgent - UX cassée)
2. **Page debug développeur** (pour faciliter le debugging futur)
3. **Génération de titre intelligent** (amélioration UX)
