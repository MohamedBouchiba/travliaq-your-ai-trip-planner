

## Rendre les interactions widgets plus fluides

### Probleme identifie

Apres qu'un utilisateur confirme un widget (ex: budget), deux choses se passent mal :

1. **Silence radio** : Le widget passe en mode "confirme" (coche verte) mais rien ne se passe ensuite. L'utilisateur ne sait pas que c'est a lui de parler ou que le systeme va continuer.
2. **Re-proposition du meme widget** : Le budget n'est jamais enregistre comme "bloque" dans le systeme anti-boucle (widgetCooldown), donc l'IA le repropose au message suivant.

### Solution

Deux corrections complementaires :

**1. Enregistrer les widgets selection dans le cooldown**

Fichier : `src/components/planner/chat/hooks/widgetHandlers/selectionHandlers.ts`

Actuellement, `handleBudgetSelect` (et les autres handlers de selection) ne signalent jamais au systeme de cooldown que le widget a ete confirme. Il faut ajouter l'appel `widgetCooldown.recordWidgetConfirmed(...)` dans chaque handler de selection pour que le widget soit bloque apres confirmation.

Le probleme est que `HandlerDeps` ne contient pas `widgetCooldown`. Il faut :
- Ajouter `widgetCooldown` au type `HandlerDeps` (fichier `types.ts`)
- Le passer depuis `useChatWidgetFlow.ts` via `depsRef`
- L'appeler dans `handleBudgetSelect`, `handleStarRatingSelect`, `handleCabinClassSelect`, etc.

**2. Ajouter un message de suivi automatique apres confirmation**

Fichier : `src/components/planner/chat/hooks/widgetHandlers/selectionHandlers.ts`

Apres la confirmation du budget, ajouter automatiquement un message assistant court et contextuel (ex: "Budget note ! Dis-moi la suite, ou pose-moi une question.") pour que l'utilisateur comprenne que la conversation continue.

Alternative plus elegante : envoyer automatiquement un message utilisateur invisible au backend (comme le font les preference widgets avec `sendMessage`) pour que l'IA enchaine naturellement avec l'etape suivante.

Concretement, pour `handleBudgetSelect` :
- Apres `setMessages(updateMessageById(...))`, ajouter un nouveau message assistant de suivi
- Generer des quick replies contextuels (ex: "Chercher des vols", "Definir les dates")

Meme pattern pour `handleStarRatingSelect`, `handleCabinClassSelect`, etc.

**3. Passer le widgetCooldown dans les deps**

Fichier : `src/components/planner/chat/hooks/widgetHandlers/types.ts`

Ajouter `widgetCooldown` optionnel dans le type `HandlerDeps`.

Fichier : `src/components/planner/chat/hooks/useChatWidgetFlow.ts`

S'assurer que `depsRef.current` inclut le `widgetCooldown`.

### Fichiers modifies

| Fichier | Action |
|---|---|
| `src/components/planner/chat/hooks/widgetHandlers/types.ts` | Ajouter widgetCooldown au type HandlerDeps |
| `src/components/planner/chat/hooks/widgetHandlers/selectionHandlers.ts` | Appeler recordWidgetConfirmed + ajouter message de suivi |
| `src/components/planner/chat/hooks/useChatWidgetFlow.ts` | Passer widgetCooldown dans depsRef |

### Resultat attendu

- Apres confirmation d'un widget budget, l'utilisateur voit un message de suivi clair
- Le meme widget ne sera plus repropose grace au cooldown
- L'experience est fluide : widget confirme, message de suivi, conversation qui continue
