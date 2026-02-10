
# Audit complet du systeme de chat Travliaq

## 1. Architecture globale

Le chat est construit sur une architecture sophistiquee en 3 couches :

- **Backend (Edge Function `planner-chat`)** : Architecture "Classify First" a deux passes LLM (Azure OpenAI). Pass 1 = classification d'intention forcee. Pass 2 = boucle ReAct multi-tool avec streaming SSE.
- **Hooks React (couche logique)** : ~17 hooks specialises gerant streaming, widgets, cooldowns, intent routing, session, etc.
- **Composant principal (`PlannerChat.tsx`)** : 2126 lignes -- composant monolithique qui orchestre toutes les couches.

---

## 2. Points forts

| Domaine | Detail |
|---|---|
| Classification intent | Deux passes LLM avec `tool_choice` force -- garantit une classification coherente |
| Anti-boucle widget | Systeme de cooldown (`useWidgetCooldown`) avec max attempts, penalite "user typed instead", et liste de blocage injectee dans le prompt |
| Preference-first | Logique deterministe backend qui force style > interests > destinations |
| Contexte enrichi | Session entities, conversation summary, widget history, basket summary -- tout est injecte dans le prompt |
| Validation robuste | Schemas Zod avec `.passthrough()` pour tolerer les hallucinations LLM |
| Streaming SSE | Retry avec backoff exponentiel, classification d'erreurs, annulation via AbortController |
| I18n | Support FR/EN/ES avec detection automatique de langue |

---

## 3. Problemes identifies et ameliorations proposees

### 3.1 `PlannerChat.tsx` -- Composant monolithique (CRITIQUE)

**Probleme** : 2126 lignes dans un seul composant. Le `handleSubmit` seul fait ~400 lignes avec de la logique business melee au rendu.

**Amelioration** : Extraire en sous-hooks :
- `useChatSubmit` -- logique de soumission + traitement de la reponse
- `useChatDestinationFlow` -- logique de suggestions de destinations (dupliquee 2x dans le fichier)
- `useChatSessionSync` -- synchronisation messages <> stockage

### 3.2 Duplication du payload de destination

**Probleme** : Le payload `DestinationSuggestRequest` est construit de maniere identique a 2 endroits (lignes ~450 et ~1140).

**Amelioration** : Extraire une fonction `buildDestinationPayload(prefs, departure)` reutilisable.

### 3.3 Widget selection guard -- Regex fragile

**Probleme** : La garde de selection de widget repose sur des regex (`choisis`, `decide`, `a toi`) pour detecter la delegation. C'est fragile face aux variations de langue et aux fautes.

**Amelioration** : Deleguer cette detection au classificateur d'intention backend plutot qu'un regex frontend.

### 3.4 Absence de timeout sur le streaming SSE

**Probleme** : Si le serveur envoie des chunks tres lentement sans jamais fermer la connexion, aucun timeout global n'interrompt le stream. Le retry ne couvre que les echecs de connexion.

**Amelioration** : Ajouter un `setTimeout` global (ex: 60s) qui appelle `abortController.abort()` si le stream n'est pas termine.

### 3.5 Rate limiting en memoire seulement

**Probleme** : Le rate limiter dans l'edge function utilise un `Map` en memoire qui se reinitialise a chaque cold start. Un utilisateur peut contourner la limite en attendant un redemarrage.

**Amelioration** : Migrer vers un rate limiter base sur Supabase (table `rate_limits` avec TTL) ou Redis/Upstash.

### 3.6 Cache d'outils sans persistance

**Probleme** : `toolResultCache` dans `toolExecutor.ts` est un `Map` en memoire avec les memes limites que le rate limiter.

**Impact** : Faible en pratique car l'idempotence est surtout utile au sein d'une meme requete.

### 3.7 Gestion d'erreur dans les callbacks de preference

**Probleme** : Les callbacks `onStyleConfirm`, `onInterestsConfirm` dans `usePreferenceWidgetCallbacks` n'ont pas de try/catch -- une erreur dans `handleFetchDestinations` crash silencieusement.

**Amelioration** : Wrapper en try/catch avec toast d'erreur.

### 3.8 Console.log excessifs en production

**Probleme** : Nombreux `console.log` non gardes par `process.env.NODE_ENV` dans les hooks (cooldown, intent router, widget flow).

**Amelioration** : Utiliser le `plannerLogger` existant ou un guard `if (DEV)` systematique.

### 3.9 Absence de test unitaire sur le intent router

**Probleme** : `useUnifiedIntentRouter` (708 lignes) est la piece maitresse de la logique de declenchement de widgets mais n'a aucun test unitaire. Les tests E2E couvrent le comportement mais pas les cas limites.

**Amelioration** : Extraire la logique pure (`evaluatePhaseTransition`, `processIntent` core logic) en fonctions testables.

### 3.10 Pas de test sur l'annulation de stream

**Probleme** : `cancelStream` existe mais n'est teste ni en unitaire ni en E2E.

---

## 4. Tests E2E existants (20 fichiers)

| Fichier | Couverture |
|---|---|
| `chat-conversation-flow.spec.ts` | 5 phases, cross-phase, messages courts, multilangue |
| `preference-first-workflow.spec.ts` | Style > Interests > Destinations |
| `widget-cooldown-system.spec.ts` | Max attempts, penalty, confirmed widgets |
| `widget-selection-guard.spec.ts` | Guard "choisis pour moi" |
| `full-user-journey.spec.ts` | Parcours complet |
| `cr1-cr5` | Regressions specifiques (i18n, overrides, regex bypass, context, search realism) |
| `memory-persistence.spec.ts` | Persistence de la memoire |
| Divers | Hotels, budget, accommodation, multi-destination |

### Lacunes identifiees dans la couverture E2E :

1. **Aucun test de streaming/annulation** -- le bouton d'annulation pendant le streaming n'est pas teste
2. **Aucun test de reprise apres erreur** -- que se passe-t-il si le backend renvoie une 500 ou un timeout ?
3. **Aucun test de session** -- creation, switch, suppression de sessions n'est pas couvert
4. **Aucun test de "choose for me"** -- le flux "choisis pour moi" avec execution d'action n'est pas teste
5. **Aucun test mobile** -- la vue responsive du chat n'est pas testee
6. **Aucun test de geocodage** -- le flux destination > geocode > map route n'est pas verifie
7. **Aucun test d'historique de conversation** -- re-ouvrir un ancien chat et verifier la restauration
8. **Aucun test de rate limiting** -- envoyer de nombreux messages rapidement

---

## 5. Tests E2E proposes

### 5.1 Session management
```text
- Creer une conversation, envoyer des messages
- Creer une nouvelle session
- Verifier que l'ancienne session est listee dans l'historique
- Revenir a l'ancienne session, verifier la restauration des messages
- Supprimer une session
```

### 5.2 Error resilience (backend down)
```text
- Envoyer un message quand le backend est indisponible
- Verifier le message d'erreur affiche
- Verifier que le retry automatique fonctionne
- Verifier que l'input reste editable apres l'erreur
```

### 5.3 Stream cancellation
```text
- Envoyer un message
- Pendant le streaming, cliquer sur le bouton d'annulation
- Verifier que le message partiel est affiche
- Verifier que l'input redevient actif
```

### 5.4 "Choose for me" flow
```text
- Configurer les preferences (style + interests)
- Obtenir des suggestions de destination
- Envoyer "choisis pour moi"
- Verifier qu'une destination est selectionnee automatiquement
- Verifier que le widget est marque comme confirme
```

### 5.5 Mobile responsive
```text
- Ouvrir le planner en viewport 390x844
- Verifier le chat input, le scroll, l'envoi de messages
- Verifier la barre du bas et le collapse du chat
```

### 5.6 Rate limiting
```text
- Envoyer 20+ messages rapidement
- Verifier le message "trop de requetes"
- Attendre 60s et reverifier que ca fonctionne
```

### 5.7 Conversation history persistence
```text
- Envoyer 5 messages, rafraichir la page
- Verifier que les messages sont restaures
- Verifier que les widgets confirmes restent confirmes
- Verifier que le welcome message est dans la bonne langue
```

### 5.8 Destination geocoding flow
```text
- Dire "je veux aller a Tokyo"
- Verifier que la memoire flight a les coordonnees
- Verifier que la carte est centree sur la destination
```

---

## 6. Recapitulatif des priorites

| Priorite | Action | Impact |
|---|---|---|
| P0 | Refactorer `PlannerChat.tsx` en sous-hooks | Maintenabilite |
| P0 | Ajouter un timeout global au streaming SSE | Fiabilite |
| P1 | Tests unitaires pour `useUnifiedIntentRouter` | Qualite |
| P1 | Tests E2E session management + error resilience | Couverture |
| P1 | Supprimer la duplication du payload destination | DRY |
| P2 | Migrer le rate limiter vers Supabase/Redis | Securite |
| P2 | Nettoyer les console.log en production | Performance |
| P2 | Tests E2E "choose for me" + mobile | Couverture |
| P3 | Remplacer le regex de delegation par intent backend | Robustesse |
| P3 | Tests E2E rate limiting + stream cancellation | Couverture |
