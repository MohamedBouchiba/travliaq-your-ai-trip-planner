
## Plan : Corriger la disparition des widgets (cause profonde)

### Diagnostic

La cause profonde est **structurelle** : malgre les commentaires dans le code qui disent "never unmount PlannerPanel", le composant est demonte dans deux scenarios :

1. **Mobile** : `PlannerPanel` est a l'interieur du conditionnel `{mobileView === "chat" ? <Chat/> : <MapsWithPanel/>}` (TravelPlanner.tsx, ligne 317). Quand l'utilisateur passe du chat aux cartes, **tout le sous-arbre est demonte puis remonte**, y compris les panels lazy-loaded (AccommodationPanel, ActivitiesPanel).

2. **Mobile + Desktop** : `PlannerPanel` est a l'interieur de `{viewMode === 'itinerary' ? <Itinerary/> : <>...<PlannerPanel/>...</>}` (lignes 329 et 502). Le passage en mode itineraire **demonte** PlannerPanel et toute sa sous-arborescence.

De plus, la fonction `performHardReset()` (nouveau chat) emet `panel:toggle { visible: false }` qui cache le panel. C'est correct, mais combine avec les problemes de demontage ci-dessus, ca cree une experience ou le panel semble "disparu" apres un nouveau chat.

### Solution

Restructurer le JSX de `TravelPlanner.tsx` pour que `PlannerPanel` soit **toujours monte**, en dehors de tout conditionnel, avec un controle de visibilite par CSS uniquement.

### Changements

#### Fichier : `src/pages/TravelPlanner.tsx`

**Mobile (lignes 316-448)** : Sortir `PlannerPanel` du conditionnel `mobileView === "chat"`. Au lieu de :

```text
{mobileView === "chat" ? (
  <Chat />
) : (
  <div>
    {viewMode === 'itinerary' ? (
      <Itinerary />
    ) : (
      <>
        <Map />
        <PlannerPanel />  // <-- DEMONTE quand mobileView === "chat"
      </>
    )}
  </div>
)}
```

Restructurer en :

```text
{mobileView === "chat" ? (
  <Chat />
) : (
  <div>
    {viewMode === 'itinerary' ? (
      <Itinerary />
    ) : (
      <Map />
    )}
  </div>
)}

{/* PlannerPanel TOUJOURS monte, hors de tout conditionnel */}
<PlannerPanel
  isVisible={mobileView !== "chat" && viewMode !== "itinerary" && isPanelVisible && !youtubePanel}
  layout="mobile-top"
  ...
/>
```

**Desktop (lignes 500-577)** : Meme principe, sortir `PlannerPanel` du conditionnel `viewMode` :

```text
{/* Avant: PlannerPanel est DANS le else de viewMode */}
{viewMode === 'itinerary' ? (
  <Itinerary />
) : (
  <>
    <Map />
    <PlannerPanel />  // <-- DEMONTE en mode itineraire
  </>
)}

{/* Apres: PlannerPanel est AU MEME NIVEAU que le conditionnel */}
{viewMode === 'itinerary' ? (
  <Itinerary />
) : (
  <Map />
)}
<PlannerPanel
  isVisible={viewMode !== 'itinerary' && isPanelVisible && !youtubePanel}
  layout="overlay"
  ...
/>
```

#### Fichier : `src/components/planner/PlannerPanel.tsx`

Ajuster la logique `isHidden` (ligne 76) pour ne plus limiter le CSS-hide aux seuls layouts `overlay` et `mobile-top` :

```text
// AVANT:
const isHidden = !isVisible && (layout === "overlay" || layout === "mobile-top");

// APRES:
const isHidden = !isVisible;
```

Cela garantit que quel que soit le layout, un panel invisible est cache par CSS (visibility: hidden + pointerEvents: none) au lieu d'etre demonte.

### Pourquoi ca resout le probleme

- Les panels lazy-loaded (Suspense + lazy) ne sont charges qu'une seule fois et leur etat React interne est preserve.
- Les recherches de vols, resultats d'hotels, etc. ne sont jamais perdus lors des changements de vue.
- Le "nouveau chat" qui emet `panel:toggle { visible: false }` cache le panel par CSS ; le prochain clic sur un onglet (qui fait `setIsPanelVisible(true)`) le re-affiche sans remontage.

### Fichiers modifies

| Fichier | Action |
|---|---|
| `src/pages/TravelPlanner.tsx` | Sortir PlannerPanel des conditionnels mobileView et viewMode (mobile + desktop) |
| `src/components/planner/PlannerPanel.tsx` | Simplifier isHidden pour couvrir tous les layouts |
