

# Fix des 3 tests en echec dans `buildLLMContext.test.ts`

## Cause

Les 3 tests echouent car ils ont ete ecrits AVANT le fix `styleAxesUserConfirmed`. Ils testent l'ancienne logique ("axes existent = configured") alors que la nouvelle logique exige `styleAxesUserConfirmed: true` explicitement.

### Tests en echec

1. **"returns true when axes exist with all values at 50"** -- passe `styleAxes` avec valeurs 50/50 mais PAS `styleAxesUserConfirmed: true`
2. **"returns true when axes have mixed values"** -- passe `styleAxes` avec valeur 30 mais PAS `styleAxesUserConfirmed: true`
3. **"full scenario: style confirmed -> re-ask inspiration -> NO style loop"** -- meme probleme

## Correction

Mettre a jour les 3 tests pour inclure `styleAxesUserConfirmed: true` dans le mock `getPreferenceMemory()` quand on s'attend a `styleAxesConfigured === true`. C'est le comportement correct : les axes seuls ne suffisent plus, il faut la confirmation explicite de l'utilisateur.

### Fichier modifie

`src/components/planner/chat/hooks/__tests__/buildLLMContext.test.ts`

### Modifications

**Test "detects configured style axes" (ligne 193-208)** : Ajouter `styleAxesUserConfirmed: true` dans le mock retourne par `getPreferenceMemory()`.

**Test "detects default style axes as configured" (ligne 210-227)** : Ajouter `styleAxesUserConfirmed: true` dans le mock. Le commentaire "balanced is a valid choice" reste vrai -- mais maintenant la validite depend du flag explicite, pas de la valeur des axes.

**Test "full scenario" (si present plus bas)** : Ajouter `styleAxesUserConfirmed: true` dans le mock apres l'etape de confirmation du style.

### Logique validee

- Sans `styleAxesUserConfirmed: true` : `styleAxesConfigured === false` (meme si les axes existent avec des valeurs non-default)
- Avec `styleAxesUserConfirmed: true` : `styleAxesConfigured === true`
- C'est coherent avec le fix du bug "style de voyage saute"

