

# Bug: Style de voyage sauté — `styleAxesConfigured` toujours `true`

## Cause racine

Le flux "preference-first" dans le backend (`applyPreferenceFirstLogic`, ligne 479) vérifie :

```
if ((isIndecisIntent || isDestinationSuggestion) && !preferencesState.styleAxesConfigured)
```

Mais `styleAxesConfigured` est **toujours `true`** dès le démarrage car :

1. `DEFAULT_PREFERENCES` dans `preferenceTypes.ts` (ligne 143) initialise `styleAxes: DEFAULT_STYLE_AXES` avec les 4 axes à 50
2. `buildLLMContext.ts` (ligne 167-179) calcule : `if (!axes) return false; return true;` — puisque `axes` existe toujours, le résultat est toujours `true`
3. La condition `!preferencesState.styleAxesConfigured` ne se déclenche donc **jamais**
4. Le système saute directement au check des intérêts (ligne 494), d'où le widget `preferenceInterests` affiché en premier au lieu de `preferenceStyle`

## Correction

### 1. Ajouter un flag `styleAxesUserConfirmed` dans le preference store

Dans `src/stores/slices/preferenceTypes.ts` : ajouter un champ boolean `styleAxesUserConfirmed: boolean` au type `TripPreferences`, initialisé à `false` dans `DEFAULT_PREFERENCES`.

### 2. Mettre le flag à `true` quand l'utilisateur confirme le widget style

Dans `src/components/planner/chat/hooks/usePreferenceWidgetCallbacks.ts` : dans `onStyleContinue()`, appeler `updatePreferences({ styleAxesUserConfirmed: true })`.

Aussi dans `src/components/planner/preferences/steps/BaseStep.tsx` : dans `handleApplyPreset()`, mettre `styleAxesUserConfirmed: true` (un preset = un choix explicite).

### 3. Corriger `buildLLMContext.ts` pour utiliser le flag explicite

Remplacer la logique actuelle (lignes 167-179) par :

```text
styleAxesConfigured: preferenceMemoryState?.styleAxesUserConfirmed === true
```

Cela garantit que `styleAxesConfigured` est `false` tant que l'utilisateur n'a pas interagi avec le widget style ou choisi un preset.

### 4. Edge function — pas de changement

`applyPreferenceFirstLogic` dans `planner-chat/index.ts` est déjà correcte. Le bug était dans la valeur envoyée par le frontend (`styleAxesConfigured: true` en permanence).

### 5. Tests de régression

Ajouter dans `src/test/regression/bug-fixes.test.ts` :

- **Test "styleAxesConfigured is false by default"** : importer `DEFAULT_PREFERENCES` et vérifier que `styleAxesUserConfirmed` est `false`
- **Test "buildLLMContext returns styleAxesConfigured=false when user hasn't confirmed"** : mocker `getPreferenceMemory()` pour retourner des preferences par défaut (sans `styleAxesUserConfirmed: true`) et vérifier que `preferencesState.styleAxesConfigured === false`
- **Test "buildLLMContext returns styleAxesConfigured=true after user confirms"** : mocker avec `styleAxesUserConfirmed: true` et vérifier que `preferencesState.styleAxesConfigured === true`
- **Test "applyPreferenceFirstLogic forces preferenceStyle when styleAxesConfigured=false"** : tester unitairement la fonction backend avec `styleAxesConfigured: false` et un intent `ask_inspiration` — doit retourner `widgetToShow.type === "preferenceStyle"`
- **Test "applyPreferenceFirstLogic skips style when already configured"** : même test avec `styleAxesConfigured: true` — ne doit PAS forcer `preferenceStyle`
- **Test "preset sets styleAxesUserConfirmed=true"** : vérifier que le code source de `BaseStep.tsx` inclut `styleAxesUserConfirmed: true` dans `handleApplyPreset`

## Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `src/stores/slices/preferenceTypes.ts` | Ajouter `styleAxesUserConfirmed: boolean` au type + `false` dans defaults |
| `src/components/planner/chat/hooks/buildLLMContext.ts` | Remplacer la detection par `styleAxesUserConfirmed === true` |
| `src/components/planner/chat/hooks/usePreferenceWidgetCallbacks.ts` | Mettre `styleAxesUserConfirmed: true` dans `onStyleContinue` |
| `src/components/planner/preferences/steps/BaseStep.tsx` | Mettre `styleAxesUserConfirmed: true` dans `handleApplyPreset` |
| `src/test/regression/bug-fixes.test.ts` | 6 nouveaux tests de regression |

## Comportement attendu après correction

- Utilisateur dit "Inspire-moi !" sans avoir configuré son style -> widget `preferenceStyle` affiché en premier
- Utilisateur confirme le style -> widget `preferenceInterests` affiché ensuite (si intérêts vides)
- Utilisateur qui a déjà dit "je voyage en couple avec un budget serré" -> `styleAxesUserConfirmed` reste `false` (car le LLM a extrait les prefs mais l'utilisateur n'a pas confirmé le widget) MAIS le LLM peut quand même retourner `preferenceInterests` car les axes sont dans le contexte
- Utilisateur qui choisit un preset (ex: "Romantique") -> `styleAxesUserConfirmed: true`, passe directement aux intérêts
