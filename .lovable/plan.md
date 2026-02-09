
# Plan d'Amélioration : Widget de Suggestions de Destinations

## Contexte

Tu as identifié deux problèmes dans le widget de suggestions de destinations :
1. **Profil incomplet sans action** : Quand le chat affiche des destinations avec un profil à 35%, il n'y a aucune incitation à compléter le profil pour obtenir de meilleures recommandations
2. **Proportions de la carte** : L'image est trop grande et les informations textuelles sont trop petites/difficiles à lire

---

## Partie 1 : Suggestion de Compléter le Profil

### Modifications du Badge de Profil (DestinationSuggestionsGrid)

**Changement actuel → proposé :**
- Le badge affiche juste "Recommandations basées sur votre profil (35% complété)"
- Ajouter une phrase d'incitation sous le badge quand le score < 70%
- Exemple : "Pour des recommandations plus personnalisées, complétez votre profil"

### Ajout de Quick Replies Contextuels

**Après l'affichage des destinations :**
Quand le score de profil < 70%, ajouter automatiquement des quick replies :
- "Renseigner mes préférences" → Ouvre l'onglet Préférences
- "Affiner mon style de voyage" → Remplit l'input avec une demande de style

**Fichiers à modifier :**
- `src/components/planner/chat/widgets/DestinationSuggestionsGrid.tsx`
- `src/components/planner/PlannerChat.tsx` (pour ajouter les quickReplies au message)
- `src/i18n/locales/fr/planner.json` et `en/planner.json` (nouvelles traductions)
- `src/i18n/config.ts` (traductions de fallback)

---

## Partie 2 : Amélioration de l'Interface de la Carte

### Ajustements dans DestinationSuggestionCard

**Image :**
- Réduire le ratio de `aspect-[16/10]` à `aspect-[16/8]` (plus panoramique, moins haute)
- Garder le zoom au hover

**Textes :**
- Headline : de `text-sm` à `text-base` et `font-bold`
- Description : de `text-xs` à `text-sm`
- Key Factors : de `text-xs` à `text-sm` avec meilleure lisibilité
- Stats bar (budget/saison/vol) : de `text-xs` à `text-sm`, padding augmenté
- Activities tags : de `text-xs` à `text-sm`
- Padding global : de `px-3 py-3` à `px-4 py-4`

**Aperçu des changements visuels :**

| Élément | Avant | Après |
|---------|-------|-------|
| Ratio image | 16:10 | 16:8 |
| Titre | text-sm font-semibold | text-base font-bold |
| Description | text-xs | text-sm |
| Facteurs clés | text-xs | text-sm |
| Stats | text-xs, py-2 px-3 | text-sm, py-2.5 px-4 |
| Tags activités | text-xs, py-1 | text-sm, py-1.5 |

**Fichier à modifier :**
- `src/components/planner/chat/widgets/DestinationSuggestionCard.tsx`

---

## Détails Techniques

### 1. Nouvelles traductions à ajouter

```json
{
  "planner.suggestions.improveRecommendations": "Pour des recommandations plus personnalisées, complétez votre profil.",
  "planner.suggestions.fillPreferences": "Renseigner mes préférences",
  "planner.suggestions.fillPreferencesMessage": "Je veux renseigner mes préférences de voyage"
}
```

### 2. Logique de Quick Replies conditionnel

Dans `PlannerChat.tsx`, après avoir reçu les suggestions de destinations :
```typescript
// Si le score de profil < 70%, ajouter un quick reply pour compléter le profil
if ((response.basedOnProfile?.completionScore || 0) < 70) {
  quickReplies.push({
    id: "fill-preferences",
    label: t("planner.suggestions.fillPreferences"),
    icon: "✨",
    action: { type: "navigate", tab: "preferences" },
    variant: "outline"
  });
}
```

### 3. Badge amélioré avec CTA

Dans `DestinationSuggestionsGrid.tsx` :
```tsx
{basedOnProfile && basedOnProfile.completionScore < 70 && (
  <p className="text-xs text-muted-foreground mt-1">
    {t("planner.suggestions.improveRecommendations")}
  </p>
)}
```

---

## Résumé des Fichiers Modifiés

1. **`src/components/planner/chat/widgets/DestinationSuggestionCard.tsx`**
   - Ratio image réduit
   - Tailles de police augmentées
   - Meilleurs espacements

2. **`src/components/planner/chat/widgets/DestinationSuggestionsGrid.tsx`**
   - Message d'incitation sous le badge profil
   - Callback optionnel pour naviguer vers préférences

3. **`src/components/planner/PlannerChat.tsx`**
   - Ajout des quick replies contextuels pour profil incomplet

4. **`src/i18n/locales/fr/planner.json`**
   - Nouvelles clés de traduction

5. **`src/i18n/locales/en/planner.json`**
   - Nouvelles clés de traduction

6. **`src/i18n/config.ts`**
   - Traductions de fallback
