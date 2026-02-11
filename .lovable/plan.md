

# Plan : Drag & Drop pour hiérarchiser les sliders de style

## Ce que l'utilisateur pourra faire

Chaque slider (Chill/Intense, Urbain/Nature, Budget/Luxe, Touristique/Authentique) deviendra réordonnançable par glisser-déposer. La position du haut = la priorité la plus haute. Un petit indicateur visuel (poignée de drag avec un numéro de rang) apparaitra à gauche de chaque slider.

## Approche technique

On utilise `framer-motion` (déjà installé) qui fournit un composant `Reorder` natif avec support tactile et clavier.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/stores/slices/preferenceTypes.ts` | Ajouter `styleAxesOrder: (keyof StyleAxes)[]` dans `TripPreferences` + valeur par défaut |
| `src/stores/slices/preferenceSlice.ts` | Ajouter action `setStyleAxesOrder(order)` pour persister l'ordre |
| `src/stores/hooks/usePreferenceMemoryStore.ts` | Exposer `setStyleAxesOrder` dans le hook |
| `src/stores/hooks/index.ts` | Re-exporter le nouveau type/action |
| `src/components/planner/preferences/StyleEqualizer.tsx` | Remplacer la liste statique par `Reorder.Group` + `Reorder.Item` de framer-motion |
| `src/components/planner/chat/widgets/PreferenceStyleWidget.tsx` | Idem, version chat du widget |

### Details de l'implementation

**1. Nouveau champ dans les preferences**

```typescript
// Dans TripPreferences
styleAxesOrder: (keyof StyleAxes)[];
// Default: ["chillVsIntense", "cityVsNature", "ecoVsLuxury", "touristVsLocal"]
```

**2. Action Zustand `setStyleAxesOrder`**

Persiste le tableau d'ordre dans le store. Declenche la mise a jour UI.

**3. StyleEqualizer avec drag & drop**

- Importer `Reorder` de `framer-motion`
- Remplacer le `div` conteneur par `Reorder.Group axis="y" values={orderedKeys} onReorder={onReorder}`
- Chaque slider est wrappé dans `Reorder.Item value={key}`
- Ajouter une poignée de drag (icone GripVertical de lucide) + badge de rang (1, 2, 3, 4)
- Animation de transition fluide via les props `layout` de framer-motion

**4. UX / Accessibilite**

- Poignee visible au survol, toujours visible sur mobile
- Badge numerote indiquant la priorite (1 = plus important)
- Curseur `grab` / `grabbing` sur la poignee
- Le slider reste fonctionnel (pas de conflit entre drag vertical et slide horizontal grace au ciblage de la poignee seulement)
- Un petit texte explicatif sous le titre : "Glissez pour réorganiser par priorité"

**5. Impact sur le backend**

Le champ `styleAxesOrder` sera envoyé avec les preferences existantes vers l'edge function. Le LLM pourra utiliser l'ordre pour ponderer les suggestions (ex: si "cityVsNature" est en position 1, privilegier les destinations qui matchent cet axe).

