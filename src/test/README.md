# 🧪 Tests Unitaires du Questionnaire Travliaq

## 📋 Vue d'ensemble

Cette suite de tests professionnels vérifie la cohérence et la logique du questionnaire Travliaq, avec un focus particulier sur la synchronisation entre les fonctions critiques `getTotalSteps()`, `canProceedToNextStep()` et `renderStep()`.

## 🎯 Objectifs des tests

1. **Cohérence du comptage des étapes** : Vérifier que le nombre d'étapes calculé correspond exactement au parcours utilisateur
2. **Validation des scénarios** : Tester tous les chemins possibles du questionnaire
3. **Logique conditionnelle** : S'assurer que les questions apparaissent ou disparaissent selon les bonnes conditions
4. **Prévention des régressions** : Détecter immédiatement toute modification qui casse la logique

## 📦 Installation

Les dépendances de test ont déjà été installées :
- `vitest` : Framework de test rapide et moderne
- `@testing-library/react` : Utilitaires pour tester React
- `@testing-library/jest-dom` : Matchers personnalisés pour le DOM
- `@vitest/ui` : Interface graphique pour les tests
- `jsdom` : Environnement DOM pour Node.js

## 🚀 Lancement des tests

### Mode watch (recommandé en développement)
```bash
npm test
```
Les tests se relanceront automatiquement à chaque modification.

### Interface graphique
```bash
npm run test:ui
```
Ouvre une interface web interactive pour explorer et exécuter les tests.

### Exécution unique (CI/CD)
```bash
npm run test:run
```
Lance tous les tests une seule fois et affiche le résultat.

### Avec couverture de code
```bash
npm run test:coverage
```
Génère un rapport HTML de couverture dans `coverage/index.html`.

## 📊 Tests disponibles

### Tests de cohérence et logique (12 tests)

1. **Test 1 : Solo avec destination et tous services** (21 étapes)
   - Vérifie le parcours complet maximal pour un voyageur solo

2. **Test 2 : Duo sans destination avec dates flexibles** (17 étapes)
   - Teste le parcours sans destination précise

3. **Test 3 : Famille avec hébergement uniquement** (14 étapes)
   - Valide le parcours famille avec un seul service

4. **Test 4 : Groupe avec budget >1800€** (19 étapes)
   - Vérifie l'étape additionnelle pour budget précis

5. **Test 5 : Activités uniquement** (13 étapes)
   - Teste le parcours minimal avec activités

6. **Test 6 : Vols uniquement** (11 étapes)
   - Vérifie le parcours le plus court possible

7. **Test 7 : Dates flexibles >14 nuits** (19 étapes)
   - Valide l'étape de saisie du nombre exact de nuits

8. **Test 8 : Hôtel avec repas** (15 étapes)
   - Vérifie que les contraintes alimentaires apparaissent

9. **Test 9 : Hôtel sans repas** (14 étapes)
   - Confirme que les contraintes n'apparaissent PAS

10. **Test 10 : Scénario complet maximal** (27 étapes)
    - Teste le parcours le plus long avec toutes les options

11. **Test 11 : Hébergement seul (pas de mobilité)** (13 étapes)
    - Vérifie que mobilité ne s'affiche pas

12. **Test 12 : Activités sans hébergement** (13 étapes)
    - Confirme que sécurité et horloge s'affichent

### Tests de validation (3 tests)

13. **Test 13 : Champs obligatoires**
    - Détecte les réponses manquantes

14. **Test 14 : Cohérence dates flexibles**
    - Valide la structure des dates flexibles

15. **Test 15 : Structure voyageurs famille**
    - Vérifie les données adultes/enfants

## 🔍 Structure du fichier de test

```typescript
src/test/
├── setup.ts              # Configuration globale des tests
├── questionnaire.test.tsx # Suite complète de tests
└── README.md             # Ce fichier
```

## 🎨 Bonnes pratiques

### Écrire un nouveau test

```typescript
describe('Test X: Description du scénario', () => {
  it('doit calculer correctement...', () => {
    const answers: QuestionnaireAnswers = {
      travelGroup: TRAVEL_GROUPS.SOLO,
      hasDestination: YES_NO.YES,
      // ... autres réponses
    };
    
    const totalSteps = calculateTotalSteps(answers);
    
    // Commentaire expliquant le calcul attendu
    expect(totalSteps).toBe(15);
  });
});
```

### Règles importantes

1. **Commentez le calcul** : Expliquez comment vous arrivez au nombre d'étapes
2. **Testez les cas limites** : Scénarios minimaux et maximaux
3. **Un test = un scénario** : Ne testez qu'une chose à la fois
4. **Noms explicites** : Le titre doit expliquer ce qui est testé

## 🐛 Debugging

Si un test échoue :

1. **Lisez le message d'erreur** : Il indique quel nombre était attendu vs reçu
2. **Vérifiez la logique** : Relisez `getTotalSteps()` dans `Questionnaire.tsx`
3. **Tracez manuellement** : Comptez les étapes selon les conditions
4. **Utilisez l'UI** : `npm run test:ui` pour débugger visuellement

## 📈 Couverture de code

Pour vérifier la couverture :
```bash
npm run test:coverage
open coverage/index.html
```

**Objectif** : Maintenir une couverture >80% sur les fonctions critiques.

## 🔄 Maintenance

Après chaque modification du questionnaire :

1. **Exécutez les tests** : `npm test`
2. **Corrigez les tests cassés** : Mettez à jour les attentes si la logique a changé
3. **Ajoutez de nouveaux tests** : Si de nouvelles conditions sont ajoutées
4. **Vérifiez la cohérence** : Assurez-vous que tous les tests passent

## 💡 Notes importantes

- Les tests utilisent la fonction `calculateTotalSteps()` qui réplique la logique de `getTotalSteps()` du questionnaire
- Cette approche permet de tester la logique indépendamment du composant React
- Les tests ne testent PAS le rendu visuel, seulement la logique métier

## 🚨 En cas de régression détectée

Si un test échoue après une modification :

1. ✅ **C'est une bonne chose !** Le test a fait son travail
2. 🔍 **Analysez** : Le changement était-il intentionnel ?
3. 🔧 **Corrigez** : Soit le code, soit le test (selon le cas)
4. ✅ **Vérifiez** : Tous les tests doivent passer avant commit

## 📞 Support

En cas de questions sur les tests :
- Consultez la documentation Vitest : https://vitest.dev
- Consultez Testing Library : https://testing-library.com

---

**Dernière mise à jour** : 2024
**Mainteneur** : Équipe Travliaq
