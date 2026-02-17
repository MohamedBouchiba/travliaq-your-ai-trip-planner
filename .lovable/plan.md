
## Fix : Widget preferenceStyle non affiché quand l'utilisateur demande "Inspire-moi"

### Diagnostic

Le backend classe correctement l'intention comme `gather_preferences` avec `widgetToShow: preferenceStyle` (confirmé dans les logs). Le widget est bien renvoyé au frontend et traité. **Le vrai probleme** est que le LLM de l'etape 2 (ReAct) ne sait pas qu'un widget a ete selectionne en etape 1. Il genere donc un texte long avec des listes d'options ("Plage et detente, Culture et musees...") qui duplique le role du widget.

Le prompt systeme dit "Quand widgetToShow est defini, ton texte doit etre TRES COURT", mais le LLM du ReAct n'a aucun moyen de savoir que `widgetToShow` a ete defini car cette info n'est pas injectee dans ses messages.

### Correction

**Fichier : `supabase/functions/planner-chat/index.ts`**

Apres l'etape 1 (classification) et avant l'etape 2 (ReAct loop), injecter un message systeme dans `conversationMessages` informant le LLM du widget selectionne. Cela lui permettra de :
- Generer un texte court (1-2 phrases)
- Ne pas lister d'options en texte
- Ne pas dupliquer le contenu du widget

```text
// Injection entre Step 1 et Step 2 (avant la construction de rawMessages)
Si collectedData.intentClassification?.widgetToShow?.type existe :
  Ajouter un message systeme dans conversationMessages :
  "[WIDGET ACTIF] Le widget '{widgetType}' sera affiche apres ce message.
   REGLE : Ton texte doit etre TRES COURT (1-2 phrases max).
   NE FAIS PAS de liste a puces. Le widget affiche deja les options.
   Exemples : 'On va d'abord cerner ton style de voyage :' ou 'Selectionne ce qui te tente le plus :'"
```

Concretement, entre les lignes ~1000 et ~1005, apres le filtrage des outils et avant la boucle ReAct :

1. Verifier si `collectedData.intentClassification?.widgetToShow?.type` est defini
2. Si oui, ajouter un message systeme a la fin de `rawMessages` (juste avant le dernier message utilisateur) avec le contexte du widget
3. Cela garantit que le LLM sait quel widget sera montre et adapte sa reponse

### Test de non-regression

**Fichier : `src/__tests__/bug-fixes.test.ts`**

Ajouter un test verifiant que lorsque le backend retourne `widgetToShow: preferenceStyle`, le message de l'assistant ne contient PAS de liste a puces ni d'enumeration d'options.

### Fichiers modifies

| Fichier | Action |
|---|---|
| `supabase/functions/planner-chat/index.ts` | Injecter le contexte widget dans les messages ReAct |
| `src/__tests__/bug-fixes.test.ts` | Test de non-regression pour le texte court avec widget |

### Impact attendu

- Quand l'utilisateur dit "Inspire-moi", le LLM genere un texte court comme "On va d'abord cerner ton style de voyage pour te faire les meilleures recommandations :" et le widget `preferenceStyle` s'affiche en dessous
- Plus de liste "Plage et detente / Culture et musees / Aventure" dans le texte
