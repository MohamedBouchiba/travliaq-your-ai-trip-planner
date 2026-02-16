
# Tests anti-boucle widget dans le Test Runner

## Contexte du bug
L'utilisateur restait bloque dans une boucle infinie ou le backend reproposait `preferenceStyle` meme apres confirmation. Deux causes :
1. `applyPreferenceFirstLogic` ignorait les `blockedWidgets`
2. `buildLLMContext` considerait `styleAxesConfigured = false` quand tous les axes etaient a 50 (valeur par defaut mais choix valide)

## Nouveaux tests a creer

### 1. Nouvelle suite : `widgetAntiLoop.suite.ts`
Categorie : `widgetAntiLoop` -- tests dedies a la non-regression de la boucle widget.

**Tests buildLLMContext :**
- `styleAxesConfigured` retourne `true` quand les axes existent (meme tous a 50)
- `styleAxesConfigured` retourne `false` quand pas d'axes
- `blockedWidgets` est inclus dans le contexte LLM
- `preferencesState` remonte correctement les interets et le style

**Tests anti-boucle (logique pure simulee cote navigateur) :**
- Un widget confirme (`confirmed: true`) ne doit JAMAIS etre repropose
- Un widget bloque dans `blockedWidgets` empeche le override vers `preferenceStyle`
- Un widget bloque dans `blockedWidgets` empeche le override vers `preferenceInterests`
- Scenario multi-tours : style confirme + interests confirme = aucun widget de preference force
- Scenario : intent `gather_preferences` + `preferenceStyle` bloque = pas d'override
- Scenario : intent `ask_inspiration` + `preferenceStyle` bloque = pas d'override

**Tests regression scenario utilisateur :**
- Simulation du parcours exact du bug : user dit "je ne sais pas ou aller" -> style confirme -> re-demande inspiration -> le systeme ne boucle PAS sur le style

### 2. Modifications a `browser-test-suites.ts`
- Ajouter la categorie `widgetAntiLoop` avec metadata (emoji, label, description)
- Ajouter l'import dynamique et l'enregistrement conditionnel

## Details techniques

La suite reproduira la logique de `applyPreferenceFirstLogic` et `buildLLMContext` en fonctions pures testables dans le navigateur, sans dependre du backend. On importera `buildLLMContext` et `truncateField` directement depuis le code source.

Les tests de `applyPreferenceFirstLogic` simuleront la logique (car la fonction vit dans l'edge function et n'est pas importable cote client) en repliquant les regles critiques : guards conversationnels, check `blockedWidgets`, check `styleAxesConfigured`.

Environ 15-20 tests, executables dans la page `/test-runner`.
