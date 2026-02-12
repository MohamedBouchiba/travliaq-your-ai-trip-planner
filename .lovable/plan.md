

# Amelioration du widget "Style de voyage"

## Probleme actuel

Les labels ont des longueurs differentes ("Relax" vs "Economique", "Intense" vs "Authentique"), ce qui desaligne les sliders entre eux. Le screenshot montre clairement que les barres de couleur n'ont pas la meme longueur visible.

## Corrections prevues

### 1. Alignement parfait des sliders (2 fichiers)

Remplacer le layout actuel (`min-w-[90px]` cote gauche / `min-w-[90px]` cote droit) par une largeur fixe identique `w-[100px]` des deux cotes, pour les deux composants :

- **`PreferenceStyleWidget.tsx`** (widget chat) : `min-w-[90px]` -> `w-[100px]`
- **`StyleEqualizer.tsx`** (panneau preferences) : `min-w-[80px]` -> `w-[100px]` (et compact : `w-[80px]`)

`w-[100px]` suffit pour le mot le plus long ("Economique" / "Touristique" / "Authentique" / "Relaxation" en anglais) a `text-xs`.

### 2. Bulle info explicative

Ajouter un bouton icone `HelpCircle` (lucide) en haut a droite du header, avec un `Tooltip` (Radix) qui affiche :

> "Ajustez chaque curseur pour indiquer vos preferences.
> Glissez les lignes pour les reorganiser par priorite : la premiere ligne compte le plus."

Cle i18n : `planner.preferences.style.helpTooltip`

Ce tooltip sera ajoute dans les deux composants (chat widget + panneau preferences).

### 3. Espacement uniforme

Ajouter `py-1` sur chaque `Reorder.Item` et un `bg-muted/5 rounded-lg` pour creer des "rails" visuels uniformes, rendant la structure plus lisible.

## Fichiers modifies

| Fichier | Changement |
|---|---|
| `PreferenceStyleWidget.tsx` | Labels `w-[100px]`, ajout tooltip info, espacement uniforme |
| `StyleEqualizer.tsx` | Labels `w-[100px]` (compact: `w-[80px]`), ajout tooltip info, espacement uniforme |
| `src/i18n/config.ts` | Ajout cle `planner.preferences.style.helpTooltip` (FR + EN) |

