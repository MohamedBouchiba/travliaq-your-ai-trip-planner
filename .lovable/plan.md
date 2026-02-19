

## Plan : Corriger les suggestions (pas d'auto-envoi, pas de doublons) + cap aeroport 50km

### Problemes identifies

1. **Pas d'auto-envoi** : Le code actuel dans `handleSuggestionClick` (lignes 1004-1007) fait deja `setInput(message)` sans envoyer -- c'est le bon comportement. Aucun auto-send n'existe dans le code actuel. Par contre, le probleme de "double suggestions" vient du fait que quand `setInput(message)` est appele, le contexte `MemoizedSmartSuggestions` change (car `lastUserMessage`, `conversationTurn`, etc. sont recalcules), ce qui regenere de nouvelles suggestions statiques immediatement, avant meme que le message soit envoye.

2. **Double suggestions** : Deux fichiers morts existent (`RealtimeSuggestionChips.tsx` et `useRealtimeSuggestions.ts`) -- ils ne sont pas importes nulle part donc ne causent pas de doublons a l'ecran, mais creent de la confusion. Le vrai probleme est que les suggestions statiques (`getSuggestions`) se recalculent quand le contexte change, ce qui arrive des que `setInput` modifie l'etat et provoque un re-render.

3. **Aeroports trop loin** : L'edge function n'a aucun filtre de distance max -- elle retourne les N plus proches sans plafond. Il faut ajouter un cap a 50km.

---

### Changements prevus

#### 1. Bloquer les nouvelles suggestions tant que l'input est rempli (PlannerChat.tsx)

Dans le composant `MemoizedSmartSuggestions`, passer `isLoading={isLoading || !!input.trim()}` au lieu de `isLoading={isLoading}`. Quand l'input contient du texte (apres un clic sur une suggestion), les suggestions disparaissent et ne reapparaissent qu'apres que l'utilisateur a envoye le message (ce qui vide l'input).

Cela corrige le "double suggestion" sans changer la logique d'envoi.

#### 2. Supprimer le code mort des suggestions (2 fichiers)

- Supprimer `src/components/planner/chat/RealtimeSuggestionChips.tsx`
- Supprimer `src/components/planner/chat/hooks/useRealtimeSuggestions.ts`

Ces fichiers ne sont importes par aucun composant et creent de la confusion.

#### 3. Cap aeroport a 50km (nearest-airports/index.ts)

Dans l'edge function, ligne 348, ajouter un `.filter()` avant le `.slice()` :

```text
// Avant:
.sort((a, b) => a.distance_km - b.distance_km)
.slice(0, limit);

// Apres:
.sort((a, b) => a.distance_km - b.distance_km)
.filter((a) => a.distance_km <= 50)
.slice(0, limit);
```

#### 4. Verification globale anti-auto-send

Apres revue complete du code :
- `handleSuggestionClick` : fait `setInput()` (pas d'envoi) -- OK
- `handleSend` : appele uniquement par `ChatInputArea` quand l'utilisateur clique "Envoyer" ou appuie Entree -- OK
- `onSuggestionClick` dans `SmartSuggestions.tsx` : appelle simplement le callback parent -- OK
- Aucun `handleSend` n'est appele automatiquement nulle part dans le flow de suggestions -- confirme

Aucun auto-envoi n'existe dans le code. Le probleme percu etait les suggestions qui changeaient trop vite, resolu par le point 1.

---

### Details techniques

| Fichier | Action | Lignes |
|---|---|---|
| `src/components/planner/PlannerChat.tsx` | Changer `isLoading` prop en `isLoading OR input non vide` | ~1108 |
| `src/components/planner/chat/RealtimeSuggestionChips.tsx` | Supprimer | entier |
| `src/components/planner/chat/hooks/useRealtimeSuggestions.ts` | Supprimer | entier |
| `supabase/functions/nearest-airports/index.ts` | Ajouter `.filter(a => a.distance_km <= 50)` | ~348 |

