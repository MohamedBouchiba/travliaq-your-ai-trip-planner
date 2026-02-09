
# Plan : Workflow Intelligent pour Suggestions de Destinations + Profil Incomplet

## Probleme

Quand l'utilisateur dit "je ne sais pas ou aller" avec un profil a 35% :
1. Le message IA naturel est ecrase par un texte systeme generique
2. Les suggestions sont montrees sans avertissement clair que le profil est quasi vide
3. Pas de quick reply pour remplir les preferences
4. Le titre reste le texte brut de l'utilisateur trop longtemps

Le workflow actuel n'est pas intelligent : il montre 3 destinations basees sur presque rien, sans guider l'utilisateur.

## Solution : Workflow en 2 branches selon le score profil

| Score profil | Comportement |
|-------------|-------------|
| < 50% | Montrer les suggestions MAIS avec un bandeau d'avertissement prominent + quick reply "Renseigner mes preferences" + message IA adapte |
| >= 50% | Montrer les suggestions normalement avec le badge de completion |

## Modifications

### 1. PlannerChat.tsx - Conserver le message IA + ajouter quick replies contextuels

**Ligne ~987-1056** : Quand `destinationSuggestionRequest` est recu :

- **Garder le texte `content` de l'IA** au lieu de le remplacer par une traduction systeme
- Apres le chargement des destinations, **ne pas ecraser le texte** avec `t("planner.messages.destinationsFoundPlural")`
- Si `completionScore < 50%`, ajouter automatiquement un quick reply "Renseigner mes preferences" qui bascule sur l'onglet preferences

```typescript
// Au lieu de :
text: t("planner.messages.destinationsFoundPlural", { count, score })

// On fait :
text: content, // Garder le message naturel de l'IA

// Et on ajoute des quick replies si profil bas :
quickReplies: completionScore < 50 ? [
  { label: "Renseigner mes preferences", action: "open_preferences" },
  { label: "Ca me va comme ca", action: "continue" }
] : undefined
```

### 2. DestinationSuggestionsGrid.tsx - Bandeau d'avertissement ameliore

Le bandeau actuel (lignes 108-133) est trop discret. On le transforme en un composant plus visible et actionnable :

**Quand score < 50%** :
- Bandeau orange/ambre avec icone d'avertissement
- Message clair : "Ces suggestions sont basees sur un profil incomplet (35%). Affine tes preferences pour des recommandations sur mesure !"
- Bouton cliquable "Completer mon profil" qui emet un evenement pour basculer sur l'onglet preferences
- Barre de progression visuelle du score

**Quand score >= 50% et < 70%** :
- Bandeau bleu/info actuel mais avec la barre de progression
- Message encourageant : "Tes suggestions sont deja bien personnalisees ! Complete ton profil pour encore mieux."

**Quand score >= 70%** :
- Badge vert : "Suggestions hautement personnalisees"

### 3. useChatSessions.ts - Titre intelligent des 2 messages

Changer le seuil de `userMessageCount >= 3` a `userMessageCount >= 2` (ligne 403).

### 4. Traductions - Nouvelles cles

Ajouter dans `src/i18n/config.ts` et les fichiers JSON :
- `planner.suggestions.lowProfileWarning` : "Ces suggestions sont basees sur un profil a {{score}}%. Affine tes preferences pour des recommandations sur mesure !"
- `planner.suggestions.mediumProfileInfo` : "Bon debut ! Complete ton profil pour des suggestions encore plus precises."
- `planner.suggestions.highProfileSuccess` : "Suggestions hautement personnalisees"
- `planner.suggestions.completeProfile` : "Completer mon profil"

## Resume des fichiers

| Fichier | Changement |
|---------|------------|
| `src/components/planner/PlannerChat.tsx` | Conserver texte IA + quick replies conditionnel profil |
| `src/components/planner/chat/widgets/DestinationSuggestionsGrid.tsx` | Bandeau 3 niveaux (rouge/orange/vert) + bouton action + barre progression |
| `src/hooks/useChatSessions.ts` | Seuil titre a 2 messages |
| `src/i18n/config.ts` | Nouvelles cles de traduction |
| `src/i18n/locales/fr/planner.json` | Traductions FR |
| `src/i18n/locales/en/planner.json` | Traductions EN |

## Resultat attendu

L'utilisateur dit "je ne sais pas ou aller" avec 35% de profil :
1. L'IA repond naturellement : "Pas de souci, je vais te proposer quelques idees..."
2. Les cartes de destinations s'affichent avec un bandeau orange : "Ces suggestions sont basees sur un profil a 35%. Affine tes preferences pour des recommandations sur mesure !"
3. Un bouton "Completer mon profil" est visible dans le bandeau
4. Des quick replies apparaissent : "Renseigner mes preferences" / "Ca me va comme ca"
5. Le titre se genere intelligemment des le 2e message
