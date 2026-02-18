
## Fix : Streaming fluide + scroll professionnel (inspiré ChatGPT/Claude)

### Diagnostic des 3 vrais problèmes

**Problème 1 — Le texte arrive en blocs, pas mot-à-mot**

La cause n'est pas le réseau : c'est `ReactMarkdown`. Pendant le streaming, chaque token reçu déclenche un re-rendu de `MarkdownMessage`, qui re-parse tout le markdown depuis zéro. React-markdown utilise remark/rehype en interne — c'est lourd. Le navigateur groupe ces re-rendus et les flush par blocs, ce qui donne l'effet "par paquets".

**Solution** : pendant `isStreaming === true`, remplacer `<ReactMarkdown>` par du texte brut `<span>`. Une fois le streaming terminé, on rend le markdown complet. C'est exactement ce que fait Claude.

**Problème 2 — Le scroll ne suit pas le contenu qui grandit**

`useChatScroll` écoute `messagesCount` (nombre de messages). Pendant le streaming, ce chiffre ne change pas — seul le contenu d'un message change. Le hook ne se déclenche donc jamais pendant le streaming. L'effet à la ligne 673-679 de PlannerChat a le même problème : il réagit à `messages.length`.

**Solution** : ajouter un `useEffect` dans `useChatScroll` qui observe `isStreaming` et, quand c'est actif + que l'utilisateur n'est pas en train de lire l'historique, scrolle vers le bas avec `behavior: "auto"` à chaque frame via `requestAnimationFrame`. On arrête quand `isStreaming === false`.

**Problème 3 — Le curseur clignotant**

Le plan précédent proposait un `animate-pulse` sur un bloc rectangulaire. L'utilisateur a raison que c'est moche. Au lieu de ça : un léger fondu du dernier mot en cours (opacity légèrement réduite sur le dernier chunk en cours d'arrivée). Alternativement : rien du tout — juste le scroll fluide et le texte progressif donnent déjà la sensation de "vivant". ChatGPT et Claude n'ont pas de curseur visible sur mobile.

**Décision finale** : pas de curseur visible. Le streaming progressif mot-à-mot suffit. Plus élégant.

---

### Plan de correction

#### Fichier 1 : `src/hooks/useChatScroll.ts`

Ajouter `isStreaming` comme paramètre optionnel. Quand `isStreaming === true` et `isUserScrolling === false`, lancer un RAF-loop pour scroller automatiquement vers le bas avec `behavior: "auto"` (pas `"smooth"` qui cause des sautes pendant le streaming). Arrêter le loop quand le streaming s'arrête.

```
Nouvelle interface :
UseChatScrollOptions {
  messagesCount: number;
  containerRef: RefObject<HTMLDivElement | null>;
  threshold?: number;
  isStreaming?: boolean;  // <-- NOUVEAU
}
```

Logic interne :
```
useEffect(() => {
  if (!isStreaming || isUserScrolling) return;
  
  let rafId: number;
  const scroll = () => {
    const container = containerRef.current;
    if (container && !isAtBottom()) {
      container.scrollTop = container.scrollHeight; // behavior: "auto" instantané
    }
    rafId = requestAnimationFrame(scroll);
  };
  rafId = requestAnimationFrame(scroll);
  
  return () => cancelAnimationFrame(rafId);
}, [isStreaming, isUserScrolling, containerRef, isAtBottom]);
```

#### Fichier 2 : `src/components/planner/PlannerChat.tsx`

- Récupérer `isStreaming` depuis `useChatStream` (déjà exposé via `streamResponse` mais pas consommé au niveau du composant — il faut le passer depuis `useChatSubmit` ou lire `isStreaming` directement depuis le hook)
- Passer `isStreaming` à `useChatScroll`

Vérification : `useChatStream` retourne `isStreaming` (ligne 82, 492). Il faut vérifier si `useChatSubmit` l'expose ou si on doit le récupérer autrement. Actuellement dans PlannerChat, `streamResponse` vient de `useChatStream` mais l'état `isStreaming` n'est pas directement accessible dans PlannerChat — il est encapsulé dans le hook. On peut soit :
- (A) Exposer `isStreaming` depuis `useChatSubmit` 
- (B) Utiliser `isLoading` comme proxy (déjà accessible dans PlannerChat)

**Option B choisie** : `isLoading` est déjà utilisé comme état global de chargement et est `true` pendant tout le streaming. On l'utilise comme `isStreaming` proxy pour le scroll. C'est plus simple et déjà disponible.

#### Fichier 3 : `src/components/planner/chat/widgets/MarkdownMessage.tsx`

Ajouter une prop `isStreaming?: boolean`. Quand `true`, rendre le contenu en texte simple (pas de markdown parsing) :

```tsx
export function MarkdownMessage({ content, className, isStreaming }: MarkdownMessageProps) {
  if (isStreaming) {
    // Texte brut pendant le streaming = rendu instantané, pas de re-parsing lourd
    return (
      <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", className)}>
        {content}
      </div>
    );
  }
  
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown ...>{content}</ReactMarkdown>
    </div>
  );
}
```

#### Fichier 4 : `src/components/planner/chat/ChatMessageBubble.tsx`

Passer `isStreaming` à `MarkdownMessage` quand `m.isStreaming === true` :

```tsx
<MarkdownMessage content={m.text} isStreaming={m.isStreaming} />
```

Aussi : ajouter une transition douce à la fin du streaming. Une légère classe `transition-opacity` sur le wrapper fait que quand le markdown "re-render" en mode riche après la fin du streaming, ça ne flash pas.

#### Fichier 5 (bonus UX) : Empty state engageant

Dans `PlannerChat.tsx`, quand `visibleMessages.length === 0`, afficher un écran d'accueil centré avec 3-4 suggestion cards cliquables — comme ChatGPT. Ces cards disparaissent dès le premier message. Cards suggérées :
- "✈️ Inspire-moi pour un voyage"  
- "🏖️ Trouver une destination soleil"
- "📅 Planifier un week-end rapide"
- "💰 Voyager avec un petit budget"

Pas de nouveau composant — juste un bloc conditionnel dans le JSX existant du chat.

---

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `src/hooks/useChatScroll.ts` | Ajouter `isStreaming` + RAF-loop de scroll automatique |
| `src/components/planner/PlannerChat.tsx` | Passer `isLoading` comme `isStreaming` au scroll hook + empty state |
| `src/components/planner/chat/widgets/MarkdownMessage.tsx` | Mode texte brut pendant le streaming |
| `src/components/planner/chat/ChatMessageBubble.tsx` | Passer `isStreaming` à MarkdownMessage |

### Résultat attendu

- Chaque mot s'affiche dès réception (pas de bloc) car aucun parsing markdown pendant le streaming
- La vue scrolle automatiquement vers le bas à chaque nouveau token (RAF-loop)
- Quand le streaming se termine, le markdown riche s'affiche proprement (gras, listes, etc.)
- L'écran vide propose des suggestions engageantes pour démarrer
- Comportement identique à ChatGPT/Claude : scroll fluide, texte progressif, transition propre
