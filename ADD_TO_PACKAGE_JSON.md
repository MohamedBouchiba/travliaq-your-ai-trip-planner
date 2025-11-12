# 📦 Scripts à ajouter dans package.json

## 🎯 Instructions

Copiez-collez ces 4 lignes dans la section `"scripts"` de votre fichier `package.json` :

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

## 📋 Exemple complet

Avant :
```json
{
  "name": "travliaq",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Après :
```json
{
  "name": "travliaq",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## ✅ Vérification

Après avoir ajouté les scripts, exécutez :

```bash
npm test
```

Vous devriez voir :
```
✓ src/test/questionnaire.test.tsx (15)
  ✓ Questionnaire - Tests de cohérence et logique (12)
  ✓ Questionnaire - Tests de validation (3)

Test Files  1 passed (1)
     Tests  15 passed (15)
```

## 🎉 C'est tout !

Les tests sont maintenant opérationnels. Consultez `TESTING_SETUP.md` pour plus d'informations.
