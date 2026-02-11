

# Fix des 3 tests — budget qualitatif

## Analyse

### Echecs 1 et 2 : "cheap trip" remplit mentionedBudget alors qu'il ne devrait pas

Le code qu'on vient d'ajouter (detection qualitative) met `mentionedBudget = "budget"` quand il detecte "cheap" ou "pas cher". Or les tests attendent `mentionedBudget = undefined` car :
- `wantsBudgetInfo = true` capture deja l'intention "budget serre"
- `mentionedBudget` devrait etre reserve aux montants explicites ("500 euros", "1000$")
- Remplir les deux est une double-information redondante

**Correction** : Supprimer le bloc de detection qualitative qui remplit `mentionedBudget` avec des labels comme "budget"/"luxury"/"moderate". La semantique correcte est :
- "pas cher" / "cheap" -> `wantsBudgetInfo = true` (deja fait par BUDGET_INTENT_PATTERNS)
- "500 euros" -> `wantsBudgetInfo = true` + `mentionedBudget = "500"` (deja fait)

Le bloc qualitative ajoute dans le dernier patch (lignes ~574-586) doit etre retire.

### Echec 3 : "pas chere" ne matche pas BUDGET_INTENT_PATTERNS

Le pattern actuel est `/pas\s+cher/i` qui ne matche pas "pas chere" (feminin). Le mot "escapade pas chere" echoue.

**Correction** : Modifier le pattern dans BUDGET_INTENT_PATTERNS de `pas\s+cher` en `pas\s+ch[eè]re?s?` pour couvrir toutes les formes (cher, chere, chers, cheres, avec ou sans accent).

## Fichiers modifies

| Fichier | Changement |
|---|---|
| `messageAnalyzer.ts` | (1) Supprimer le bloc qualitative budget detection (lignes ~574-586). (2) Corriger BUDGET_INTENT_PATTERNS : `pas\s+cher` -> `pas\s+ch[eè]re?s?` |

## Resultat attendu

- "cheap trip" -> `wantsBudgetInfo = true`, `mentionedBudget = undefined`
- "500 euros" -> `wantsBudgetInfo = true`, `mentionedBudget = "500"`
- "escapade pas chere" -> `wantsBudgetInfo = true`, `mentionedBudget = undefined`
- "luxe" -> `wantsBudgetInfo = true`, `mentionedBudget = undefined`

Les 3 tests passeront, et les tests existants (budget numerique) ne sont pas impactes.
