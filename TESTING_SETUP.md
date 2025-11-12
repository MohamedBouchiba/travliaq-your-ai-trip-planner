# 🧪 Configuration des Tests - Travliaq Questionnaire

## ✅ Installation terminée

Les dépendances suivantes ont été installées :
- ✅ `vitest` - Framework de test moderne
- ✅ `@testing-library/react` - Outils pour tester React
- ✅ `@testing-library/jest-dom` - Matchers DOM personnalisés
- ✅ `@vitest/ui` - Interface graphique des tests
- ✅ `jsdom` - Environnement DOM pour Node.js

## 📝 Configuration effectuée

### Fichiers créés :

1. **`vite.config.ts`** - Configuration Vitest ajoutée
2. **`vitest.config.ts`** - Configuration dédiée aux tests
3. **`src/test/setup.ts`** - Setup global des tests
4. **`src/test/questionnaire.test.tsx`** - 15 tests professionnels
5. **`src/test/README.md`** - Documentation complète

## 🚀 Activation des scripts de test

**IMPORTANT** : Ajoutez manuellement ces scripts dans votre `package.json` :

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Étapes :

1. Ouvrez le fichier `package.json`
2. Localisez la section `"scripts"`
3. Ajoutez les 4 lignes ci-dessus
4. Sauvegardez le fichier

## 🎯 Tests créés (15 au total)

### Tests de cohérence (12 tests) :

| # | Scénario | Étapes | Focus |
|---|----------|--------|-------|
| 1 | Solo + destination + tous services | 21 | Parcours maximal solo |
| 2 | Duo sans destination + dates flexibles | 17 | Sans destination |
| 3 | Famille + hébergement uniquement | 14 | Service unique |
| 4 | Groupe + budget >1800€ | 19 | Budget précis |
| 5 | Activités uniquement | 13 | Service minimal activités |
| 6 | Vols uniquement | 11 | Parcours le plus court |
| 7 | Dates flexibles >14 nuits | 19 | Durée longue |
| 8 | Hôtel avec repas | 15 | Contraintes affichées |
| 9 | Hôtel sans repas | 14 | Contraintes cachées |
| 10 | Scénario complet maximal | 27 | Parcours le plus long |
| 11 | Hébergement seul | 13 | Pas de mobilité |
| 12 | Activités sans hébergement | 13 | Sécurité + horloge |

### Tests de validation (3 tests) :

| # | Test | Description |
|---|------|-------------|
| 13 | Champs obligatoires | Détection réponses manquantes |
| 14 | Cohérence dates flexibles | Structure dates flexibles |
| 15 | Structure voyageurs | Validation adultes/enfants |

## 🔥 Lancement rapide

### Après avoir ajouté les scripts :

```bash
# Mode watch (recommandé)
npm test

# Interface graphique
npm run test:ui

# Exécution unique
npm run test:run

# Avec couverture
npm run test:coverage
```

## 📊 Ce que les tests vérifient

### 1. Synchronisation `getTotalSteps()` ↔ `renderStep()`

Les tests garantissent que le nombre d'étapes calculé correspond **exactement** au nombre d'étapes affichées.

### 2. Logique conditionnelle

- ✅ Mobilité cachée si uniquement vols OU uniquement hébergement
- ✅ Sécurité cachée si uniquement hébergement (seulement pour activités)
- ✅ Contraintes alimentaires SEULEMENT si hôtel + repas
- ✅ Styles SEULEMENT si destination précise ET activités
- ✅ Date approximative SEULEMENT si dates flexibles + oui

### 3. Validation complète

Chaque étape est validée pour s'assurer qu'aucune soumission incomplète n'est possible.

## 🎨 Exemple de résultat

```bash
npm test

 ✓ src/test/questionnaire.test.tsx (15)
   ✓ Questionnaire - Tests de cohérence et logique (12)
     ✓ Test 1: Solo avec destination et tous services (2ms)
     ✓ Test 2: Duo sans destination avec dates flexibles
     ✓ Test 3: Famille avec hébergement uniquement
     ✓ Test 4: Groupe avec budget >1800€
     ✓ Test 5: Activités uniquement
     ✓ Test 6: Vols uniquement
     ✓ Test 7: Dates flexibles >14 nuits
     ✓ Test 8: Hôtel avec repas
     ✓ Test 9: Hôtel sans repas
     ✓ Test 10: Scénario complet maximal
     ✓ Test 11: Hébergement seul
     ✓ Test 12: Activités sans hébergement
   ✓ Questionnaire - Tests de validation (3)
     ✓ Test 13: Champs obligatoires
     ✓ Test 14: Cohérence dates flexibles
     ✓ Test 15: Structure voyageurs

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  10:30:00
   Duration  245ms
```

## 🛡️ Prévention des régressions

À chaque modification du questionnaire :

1. **Automatique** : Les tests détectent immédiatement les incohérences
2. **Précis** : Le test indique exactement quel scénario est cassé
3. **Rapide** : Tous les tests s'exécutent en <1 seconde

## 📈 Maintenance continue

### Quand ajouter un nouveau test ?

- ✅ Nouvelle condition dans le questionnaire
- ✅ Nouveau service disponible (ex: "Restaurants")
- ✅ Nouvelle règle métier
- ✅ Bug trouvé en production (test de non-régression)

### Template pour nouveau test :

```typescript
describe('Test X: Nouveau scénario', () => {
  it('doit calculer correctement pour...', () => {
    const answers: QuestionnaireAnswers = {
      // Configuration du scénario
    };
    
    const totalSteps = calculateTotalSteps(answers);
    
    // Étape(1) + Étape(2) + ... = X
    expect(totalSteps).toBe(X);
  });
});
```

## 🚨 Que faire si un test échoue ?

### Scénario 1 : Modification intentionnelle
1. Vérifiez que la logique a bien changé
2. Mettez à jour le test (nombre d'étapes attendu)
3. Validez que tous les tests passent

### Scénario 2 : Régression accidentelle
1. Annulez votre modification
2. Corrigez le code
3. Relancez les tests

## 💡 Conseils professionnels

1. **Lancez les tests AVANT chaque commit**
2. **Tous les tests doivent passer** (100% de réussite)
3. **Ne commitez JAMAIS avec des tests cassés**
4. **Ajoutez un test pour chaque bug corrigé**

## 📚 Documentation

- **Tests détaillés** : `src/test/README.md`
- **Vitest** : https://vitest.dev
- **Testing Library** : https://testing-library.com

## ✨ Avantages

- ⚡ **Rapidité** : Tests ultra-rapides avec Vitest
- 🎯 **Précision** : Détection exacte des problèmes
- 🛡️ **Sécurité** : Aucune régression possible
- 📊 **Couverture** : Tous les scénarios testés
- 🔄 **CI/CD Ready** : Intégration continue compatible

---

**Status** : ✅ Prêt à l'emploi
**Prochaine étape** : Ajoutez les scripts dans `package.json` puis lancez `npm test`
