
## Fix des incohérences du chat planner

### Problèmes identifiés (3 bugs distincts)

**Bug 1 : Double suggestion de destinations**
Quand l'utilisateur dit "oui" pour les suggestions, le LLM fait deux choses contradictoires :
- Il génère dans son texte une liste hardcodée (Barcelone, Lisbonne, Athènes)
- Il appelle `request_destination_suggestions` qui déclenche l'API réelle (Egypte, Cambodge, RD)

L'utilisateur voit les deux, ce qui est confus et incohérent.

**Bug 2 : Le LLM réaffiche `preferenceInterests` après les suggestions**
Après avoir appelé `request_destination_suggestions`, le LLM génère dans sa réponse finale un texte contenant "Sélectionnez vos centres d'intérêt" et "Autre chose à mentionner ?", relançant le flux de préférences alors que les suggestions sont déjà affichées. La protection `blockedWidgets` fonctionne côté classification d'intention, mais pas sur le texte libre du LLM dans la boucle de contenu final.

**Bug 3 : Le texte du LLM contient des tags `<widget>` bruts**
La première réponse contient `<widget preferenceInterests />` dans le texte brut, qui ne sont pas des directives valides mais du texte généré par le LLM.

---

### Corrections prévues

#### 1. System prompt : interdire les listes de destinations dans le texte (Bug 1)

**Fichier : `supabase/functions/planner-chat/index.ts`** (dans `buildSystemPrompt`)

Ajouter une règle explicite :
```
RÈGLE : QUAND TU APPELLES request_destination_suggestions
- Ne liste AUCUNE destination dans ton texte
- Ton texte doit être un court message d'accompagnement (ex: "Voici mes suggestions personnalisées pour toi !")
- L'outil affiche automatiquement les cartes de destinations, tu ne dois PAS les dupliquer
- INTERDIT : lister des villes/pays dans le texte quand l'outil est appelé
```

#### 2. System prompt : interdire la re-sollicitation de widgets bloqués (Bug 2)

**Fichier : `supabase/functions/planner-chat/index.ts`** (dans `buildSystemPrompt`)

Renforcer la règle sur les widgets bloqués :
```
RÈGLE CRITIQUE : WIDGETS BLOQUÉS
Si un widget apparaît dans [WIDGETS BLOQUÉS], tu ne dois JAMAIS :
- Mentionner ce widget dans ton texte
- Demander à l'utilisateur de remplir ce qui correspond à ce widget
- Générer du contenu qui duplique la fonction de ce widget
```

#### 3. Nettoyage du contenu côté client quand `destinationSuggestionRequest` (Bug 1+2)

**Fichier : `src/components/planner/chat/hooks/useChatDestinationFlow.ts`**

Dans `handleLLMDestinationRequest`, lors de la mise à jour du message (ligne 258-274), remplacer aussi le texte du message par un court texte d'accompagnement pour éliminer le contenu LLM incohérent :

```typescript
setMessages((prev) =>
  prev.map((m) =>
    m.id === messageId
      ? {
          ...m,
          text: m.text, // Keep LLM text as-is (will be cleaned below)
          isTyping: false,
          isStreaming: false,
          widget: "destinationSuggestions",
          widgetData: { suggestions, basedOnProfile },
        }
      : m
  )
);
```

Ajouter un nettoyage du texte : supprimer les listes numérotées de destinations et les mentions de widgets bloqués du contenu textuel avant de l'afficher.

#### 4. Strip des tags `<widget>` du contenu LLM (Bug 3)

**Fichier : `supabase/functions/planner-chat/index.ts`** (ligne ~1185)

Le code strip déjà les tags `<action>`. Ajouter un strip pour les tags `<widget>` :
```typescript
finalContent = finalContent.replace(/<widget\s+\w+\s*\/>/g, "").trim();
finalContent = finalContent.replace(/<action>[\s\S]*?<\/action>/g, "").trim();
```

#### 5. Nettoyage côté client du texte quand destinationSuggestions (fallback)

**Fichier : `src/components/planner/chat/hooks/useChatSubmit.ts`**

Avant le early-return à la ligne 398, nettoyer le contenu du message pour retirer les listes de destinations halllucinées :
```typescript
if (destinationSuggestionRequest) {
  // Clean LLM hallucinated destination lists from streamed content
  const cleanedContent = (content || "").replace(/\d+\.\s*\*\*[^*]+\*\*[^\n]*/g, "").trim();
  if (cleanedContent && cleanedContent !== content) {
    opts.setMessages(updateMessageById(messageId, { text: cleanedContent }));
  }
  await opts.handleLLMDestinationRequest(messageId, ...);
  return;
}
```

---

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `supabase/functions/planner-chat/index.ts` | Ajouter règles system prompt + strip `<widget>` tags |
| `src/components/planner/chat/hooks/useChatSubmit.ts` | Nettoyer le texte streamé avant early-return destination suggestions |
| `src/components/planner/chat/hooks/useChatDestinationFlow.ts` | Nettoyage optionnel du texte dans handleLLMDestinationRequest |

### Redéploiement
- Déployer `planner-chat`
- Tester avec le flux "Inspire-moi !" complet
