

## Plan : Synchroniser automatiquement les hebergements avec la destination de vol

### Probleme

Quand tu selectionnes un itineraire (ex: Bruxelles -> Havana) via le chat ou le widget, l'onglet Hebergements ne se met pas a jour avec la ville de destination. Deux conditions bloquantes dans `AccommodationPanel.tsx` :

1. **Ligne 274 (multi-destination)** : `if (!leg.arrival?.city || !leg.arrival?.lat || !leg.arrival?.lng)` -- exige des coordonnees GPS
2. **Ligne 461 (aller-retour/aller simple)** : `else if (departure.lat && departure.lng)` -- exige aussi des coordonnees

Or, la selection de ville via le chat ne fournit que `city`, `country`, `countryCode` (pas de lat/lng). Resultat : la sync est ignoree.

### Solution

**Fichier unique : `src/components/planner/AccommodationPanel.tsx`**

3 modifications dans le useEffect de sync (lignes 261-488) :

**Modification 1 -- Ligne 274 : Relaxer le filtre multi-destination**

```
// AVANT
if (!leg.arrival?.city || !leg.arrival?.lat || !leg.arrival?.lng) return false;

// APRES
if (!leg.arrival?.city) return false;
```

**Modification 2 -- Lignes 290-291 : Rendre lat/lng optionnels dans le map**

```
// AVANT
lat: leg.arrival!.lat!,
lng: leg.arrival!.lng!,

// APRES
lat: leg.arrival!.lat || 0,
lng: leg.arrival!.lng || 0,
```

**Modification 3 -- Ligne 461 : Relaxer la condition aller-retour + ajouter creation si ville absente**

```
// AVANT
} else if (departure.lat && departure.lng) {
  const first = memory.accommodations[0];
  if (first && !first.city) {
    updateAccommodation(first.id, { ... });
  }
}

// APRES
} else if (departure.city) {
  const first = memory.accommodations[0];
  if (first && !first.city) {
    // Remplir la premiere accommodation vide
    updateAccommodation(first.id, {
      city: departure.city,
      country: departure.country || "",
      countryCode: departure.countryCode || "",
      lat: departure.lat,
      lng: departure.lng,
      checkIn: departureDate,
      checkOut: returnDate || null,
      syncedFromFlight: true,
      userModifiedDates: false,
    });
  } else if (!memory.accommodations.some(
    a => a.city?.toLowerCase() === departure.city!.toLowerCase()
  )) {
    // Aucune accommodation pour cette ville -> en creer une
    addAccommodation({
      city: departure.city,
      country: departure.country || "",
      countryCode: departure.countryCode || "",
      lat: departure.lat,
      lng: departure.lng,
      checkIn: departureDate,
      checkOut: returnDate || null,
      syncedFromFlight: true,
      userModifiedDates: false,
    });
  }
}
```

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/components/planner/AccommodationPanel.tsx` | 3 modifications : relaxer les conditions lat/lng dans le filtre multi, le map, et la branche aller-retour ; ajouter creation d'accommodation si ville absente |

### Comportement attendu apres fix

- Selectionner Bruxelles -> Havana dans le chat -> l'onglet Hebergements affiche immediatement "Havana" comme destination
- Multi-destinations (ex: Paris -> Tokyo -> Bangkok) -> 2 accommodations creees automatiquement (Tokyo + Bangkok)
- Si l'utilisateur modifie manuellement la ville dans l'hebergement, la sync ne l'ecrase pas (garde `userModifiedDates` existant)

