
# Bouton "Signaler un probleme" avec envoi immediat + pop-up message optionnel

## Flux utilisateur

1. Sous le champ de saisie, le texte statique est remplace par : *"Un souci ? [Cliquez ici pour nous aider](lien)"*
2. **Au clic** : le JSON de debug est immediatement uploade vers Supabase Storage (`bug-reports` bucket). Un toast confirme : "Rapport envoye !"
3. **Ensuite** : une pop-up (Dialog) s'affiche avec un textarea optionnel : "Souhaitez-vous ajouter un commentaire ?"
   - Si l'utilisateur ecrit + valide : un second fichier `{report_id}_comment.json` est uploade avec le message + le report_id
   - Si l'utilisateur ferme sans ecrire : rien de plus n'est envoye
4. **Rate limit** : le lien est desactive tant que l'utilisateur n'a pas envoye au moins 5 messages depuis le dernier rapport

## Donnees collectees dans le JSON (maximum de profondeur)

Tout le contenu du `debugStore` est inclus, soit :

- **Metadonnees** : user_id, session_id (activeSessionId), timestamp, user-agent, URL courante, langue, viewport
- **Messages** : historique complet (messageTimeline) avec texte integral, widgets, widgetData, widgetConfirmed, suggestionsShown
- **Intent** : lastIntent + intentHistory complet (primary, confidence, entities, widgetToShow, source)
- **Reasoning** : understanding, contextAnalysis, responseStrategy, keyInsights, widgetDecision, confidence
- **Flow state** : hasDestination, hasDepartureDate, hasTravelers, isReadyToSearch, etc.
- **Memory context** : flightSummary, activityContext, preferenceContext, widgetHistory, blockedWidgets, basketSummary, conversationSummary, currentPhase, missingFields, sessionEntities
- **Phase** : phaseHistory (from/to/confidence)
- **Tools** : toolExecutions (tool, status, latency_ms, summary, loopIteration)
- **Erreurs** : streamErrors, widgetErrors, sseParseErrors, retryAttempts
- **Interactions** : userInteractions (category, action, detail, widgetType), blockedActions
- **EventBus** : eventBusLog (event, payload)
- **Raw responses** : rawResponses (requestId, data)
- **Timeline chronologique** : tous les elements ci-dessus fusionnes et tries par timestamp (meme format que le bouton Copy du DebugPanel)

## Details techniques

### 1. Migration SQL - Bucket `bug-reports`

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('bug-reports', 'bug-reports', false);

-- Utilisateurs authentifies peuvent uploader
CREATE POLICY "Authenticated users can upload bug reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bug-reports');

-- Pas de SELECT/UPDATE/DELETE pour les utilisateurs
```

### 2. Nouveau hook `src/hooks/useBugReport.ts`

Responsabilites :
- `canReport` : `true` si nombre de messages user depuis le dernier rapport >= 5
- `isUploading` : etat de chargement pendant l'upload
- `submitReport()` :
  1. Collecte l'integralite du `useDebugStore.getState()` (toutes les slices)
  2. Ajoute les metadonnees (user_id via `supabase.auth.getUser()`, session_id via `useChatSessions`, timestamp, user-agent, URL, langue)
  3. Reconstruit la timeline chronologique (meme logique que `handleCopyDebugInfo` du DebugPanel)
  4. Upload vers `bug-reports/{user_id}/{timestamp_iso}_{random}.json`
  5. Retourne le `reportId` (nom du fichier sans extension)
- `submitComment(reportId, comment)` : uploade `{reportId}_comment.json` avec `{ reportId, comment, timestamp }`
- Tracking via `localStorage` : `bugReport_lastTimestamp` + `bugReport_messagesSince`

### 3. Modification de `ChatInputArea.tsx`

- Nouvelles props : `onReportBug`, `canReport`, `isReporting`
- Le `<p>` statique est remplace par :
  - Si `canReport` : "Un souci ? **Cliquez ici** pour nous aider" (lien cliquable)
  - Si pas `canReport` : texte grise "Envoyez encore X messages pour pouvoir signaler un probleme"
  - Si `isReporting` : spinner "Envoi en cours..."

### 4. Nouveau composant `src/components/planner/chat/BugReportDialog.tsx`

- Dialog Radix (AlertDialog) avec :
  - Titre : "Merci pour votre aide !"
  - Description : "Le rapport technique a ete envoye. Souhaitez-vous ajouter un commentaire ?"
  - Textarea optionnel
  - Bouton "Envoyer le commentaire" + "Fermer sans commentaire"
- Gere `isOpen`, `onClose`, `onSubmitComment(text)`

### 5. Integration dans `PlannerChat.tsx`

- Importer `useBugReport` + `BugReportDialog`
- Compter `userMessageCount` = `messages.filter(m => m.role === "user").length`
- Au clic report : appeler `submitReport()`, ouvrir le dialog
- Passer props a `ChatInputArea`

### 6. Cles i18n

**FR** :
- `planner.chat.reportBugPrefix` : "Un souci ? "
- `planner.chat.reportBugLink` : "Cliquez ici pour nous aider"
- `planner.chat.reportBugSent` : "Rapport envoye, merci !"
- `planner.chat.reportBugCooldown` : "Envoyez encore {{count}} messages pour signaler un probleme"
- `planner.chat.reportBugUploading` : "Envoi du rapport..."
- `planner.chat.reportCommentTitle` : "Merci pour votre aide !"
- `planner.chat.reportCommentDescription` : "Le rapport a ete envoye. Vous pouvez ajouter un commentaire pour nous aider a comprendre le probleme."
- `planner.chat.reportCommentPlaceholder` : "Decrivez le probleme rencontre (optionnel)..."
- `planner.chat.reportCommentSend` : "Envoyer le commentaire"
- `planner.chat.reportCommentSkip` : "Fermer"

**EN** : Equivalents anglais.

### 7. Resume des fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer bucket `bug-reports` + RLS INSERT only |
| `src/hooks/useBugReport.ts` | Creer - collecte exhaustive + upload + rate limit |
| `src/components/planner/chat/BugReportDialog.tsx` | Creer - dialog commentaire optionnel |
| `src/components/planner/chat/ChatInputArea.tsx` | Modifier - lien cliquable + props report |
| `src/components/planner/PlannerChat.tsx` | Modifier - brancher hook + dialog |
| `src/i18n/locales/fr/planner.json` | Ajouter cles i18n |
| `src/i18n/locales/en/planner.json` | Ajouter cles i18n |
| `src/i18n/config.ts` | Ajouter cles i18n fallback |
