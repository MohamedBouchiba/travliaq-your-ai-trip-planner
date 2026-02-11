

# Correction des anomalies du flux conversationnel

## Anomalie 1 : Widget/Texte desynchronises (PRIORITE HAUTE)

**Probleme** : Le LLM choisit un widget incoherent avec son propre texte. Par exemple, le texte demande "Combien serez-vous ?" mais le widget affiche `budgetRangeSlider`.

**Cause** : Le systeme fait confiance aveugle au `widgetToShow` du LLM sans verifier la coherence avec le contenu textuel.

**Correction** : Ajouter un "widget coherence guard" dans le pipeline, apres la classification LLM et avant l'affichage du widget.

| Fichier | Changement |
|---|---|
| `src/components/planner/chat/services/messageAnalyzer.ts` | Ajouter une fonction `validateWidgetTextCoherence(text, widgetType)` qui verifie que le texte et le widget sont compatibles |
| `src/components/planner/chat/hooks/useChatStream.ts` | Appeler le guard apres reception de la classification LLM, avant d'emettre le widget. Si incoherent, supprimer le widget (null) |

Regles de coherence :
- Si le texte mentionne "combien" / "how many" / "voyageurs" → seul `travelersSelector` est valide
- Si le texte mentionne "quand" / "dates" / "week-end" → seuls `datePicker`/`dateRangePicker` sont valides
- Si le texte mentionne "ville de depart" / "d'ou" / "departure" → seul `citySelector` est valide
- Si le texte mentionne "budget" / "cher" / "prix" → seul `budgetRangeSlider` est valide
- Si aucune regle ne matche → le widget est laisse tel quel (pas de sur-correction)

```text
Pipeline actuel :
  LLM classify_intent → widgetToShow → affichage

Pipeline corrige :
  LLM classify_intent → widgetToShow → coherenceGuard(text, widget) → affichage
```

## Anomalie 2 : Pollution des destinations par le budget (PRIORITE HAUTE)

**Probleme** : `ENTITY_PATTERNS.destinations` utilise le flag `gi`. Le `i` rend `[A-ZÀ-Ü]` insensible a la casse, donc des mots comme "le moins chers possible" sont captures comme destination.

**Cause** : Flag `i` annule le filtre "commence par une majuscule" cense limiter l'extraction aux noms propres.

**Correction** :

| Fichier | Changement |
|---|---|
| `src/components/planner/chat/hooks/useSessionContext.ts` | Remplacer `gi` par `g` sur les patterns `destinations` (lignes 37-44). Ajouter un filtre post-extraction qui rejette les matches contenant des mots-cles budget ("cher", "cheap", "budget", "moins") |

Detail technique :
```typescript
// Avant (flag gi = insensible a la casse)
/(?:aller|partir|voyager)\s+(?:[àa]|en|au|aux)?\s+([A-ZÀ-Ü][a-zà-ü]+...)/gi,

// Apres (flag g seulement)
/(?:aller|partir|voyager)\s+(?:[àa]|en|au|aux)?\s+([A-ZÀ-Ü][a-zà-ü]+...)/g,
```

Mais attention : les messages utilisateurs ne commencent pas toujours par des majuscules. Donc il faut aussi normaliser : si le pattern "verbe + destination" est detecte, verifier que le candidat n'est PAS un mot de budget/negation avant de l'accepter.

Filtre de rejet :
```typescript
const DESTINATION_REJECT = /\b(cher|cheap|budget|moins|plus|pas|possible|affordable|luxe)\b/i;
```

## Anomalie 3 : Pas de proactivite apres ville de depart (PRIORITE MOYENNE)

**Probleme** : Apres "bruxelle", le bot dit "Je vais preparer les options" mais n'affiche aucun widget et ne lance aucune action.

**Cause** : A ce stade, le flowState a `hasDestination = false` et `hasDepartureCity = false` (depart != destination dans notre modele). Le systeme ne sait pas quoi faire ensuite car la destination manque, et la regle anti-proactivite interdit de montrer `destinationSuggestions` automatiquement.

**Correction** : Ce n'est PAS une anomalie mais le comportement souhaite. Le chip "Suggere-moi des destinations" est la bonne approche. Cependant, le texte du bot est trompeur ("Je vais maintenant preparer les options") — il promet une action qu'il ne fait pas.

| Fichier | Changement |
|---|---|
| Prompt systeme (edge function `planner-chat`) | Ajouter une instruction : "Si la destination manque encore, ne promets pas de 'preparer les options'. Demande plutot si l'utilisateur a une destination en tete ou s'il souhaite des suggestions." |

## Anomalie 4 : Dates initiales incorrectes (PRIORITE BASSE)

**Probleme** : La premiere classification retourne `exactDepartureDate: "2026-02-14"` (jour de St-Valentin) alors que l'utilisateur n'a pas precise "le weekend DE la St-Valentin" ou "le weekend APRES".

**Impact** : Faible, car le tour suivant corrige les dates a 20-22/02. Neanmoins, le LLM fait une supposition non confirmee.

**Correction** : Pas de changement de code necessaire — c'est un comportement LLM normal. Les dates sont corrigees au tour suivant quand l'utilisateur precise.

## Tests a ajouter

| Fichier test | Test |
|---|---|
| `chatCoherence.suite.ts` | Test "widget coherence guard" : texte "Combien serez-vous ?" + widget `budgetRangeSlider` → widget rejete (null) |
| `chatCoherence.suite.ts` | Test "widget coherence guard" : texte "Quel budget ?" + widget `budgetRangeSlider` → widget accepte |
| `chatJourneysSim.suite.ts` | Test session entities : "le moins chers possible" ne doit PAS apparaitre dans `destinations` |
| `chatJourneysSim.suite.ts` | Test session entities : "je veux aller a Amsterdam" → "Amsterdam" DOIT apparaitre dans `destinations` |

## Ordre d'implementation

1. Fix `ENTITY_PATTERNS.destinations` (flag `g` + filtre rejet) — resout anomalie 2
2. Ajouter `validateWidgetTextCoherence` — resout anomalie 1
3. Ajouter les tests de coherence
4. Mettre a jour le prompt systeme pour le texte trompeur — resout anomalie 3

