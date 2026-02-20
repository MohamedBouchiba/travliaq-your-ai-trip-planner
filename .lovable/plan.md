

## Fix : Glitch visuel lors de la fermeture du widget Vols/Hebergement

### Probleme

Quand `isPanelVisible` passe a `false`, le `PlannerPanel` applique instantanement `visibility: hidden` + `pointerEvents: none` sur le conteneur `<aside>`. Pendant 1-2 frames, le fond semi-transparent (`bg-card/95 backdrop-blur-xl`) disparait avant que le contenu (boutons) ne soit masque, creant un flash transparent avec des boutons fantomes visibles.

### Cause

Le passage de `visible` a `hidden` est binaire et instantane. Il n'y a aucune transition d'opacite pour adoucir la disparition. Le navigateur peut rendre une frame intermediaire ou le backdrop-blur est retire mais le contenu est encore peint.

### Solution : Ajouter une transition d'opacite au lieu d'un changement brutal

**Fichier : `src/components/planner/PlannerPanel.tsx`**

Remplacer le `style` conditionnel actuel (ligne 99) par une combinaison `opacity` + `visibility` avec une transition CSS :

```
// AVANT (ligne 99):
style={isHidden ? { visibility: "hidden", pointerEvents: "none" } : undefined}

// APRES:
style={{
  opacity: isHidden ? 0 : 1,
  visibility: isHidden ? "hidden" : "visible",
  pointerEvents: isHidden ? "none" : "auto",
  transition: "opacity 150ms ease-out, visibility 0s linear " + (isHidden ? "150ms" : "0s"),
}}
```

Explication :
- `opacity` passe de 1 a 0 en 150ms (fade-out doux)
- `visibility: hidden` est applique APRES le fade (delay de 150ms via `transition-delay`)
- A l'ouverture : `visibility: visible` est applique immediatement (delay 0s), puis `opacity` monte a 1

Cela elimine le flash car le contenu s'efface progressivement au lieu de disparaitre brutalement.

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/components/planner/PlannerPanel.tsx` | Remplacer visibility binaire par transition opacity + visibility (ligne 99) |

