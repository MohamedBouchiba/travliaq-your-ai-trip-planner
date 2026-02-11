

# Plan : Fix des 7 tests en echec — scalable

## Diagnostic

### Echec 1 : chatAdvancedSim (Guard 1 obsolete)
Le test attend encore `destinationSuggestions` apres preferences, mais Guard 1 a ete supprime. Simple mise a jour du test pour attendre `null`.

### Echecs 2-7 : analyzeUserIntent manque de capacites
Les tests Journey 42 et 43 utilisent des capacites qui n'existent pas encore dans `analyzeUserIntent` :

| Capacite manquante | Exemples non detectes |
|---|---|
| `wantsMoreOptions` ne matche pas "inspire" ni "propose-moi des destinations" | "inspire-moi", "propose-moi des destinations", "oui, propose-moi des destinations" |
| `mentionedDestination` jamais rempli | "je veux aller a Amsterdam", "non merci, je veux aller a Amsterdam" |
| `mentionedBudget` (qualitatif) pas detecte | "escapade pas chere" (pas de montant numerique) |

## Corrections

### Fichier 1 : `src/components/planner/chat/services/messageAnalyzer.ts`

**A. Enrichir `MORE_OPTIONS_INTENT_PATTERNS`** (ligne ~446)

Ajouter les patterns manquants pour matcher "inspire", "propose", "suggere", "recommande", "idees" :

```text
Avant :
  /autre|plus\s+d'options?|alternatives?|sinon|différent/i,

Apres :
  /autre|plus\s+d'options?|alternatives?|sinon|différent|inspire|propose[r-]?\s*(moi|nous|des)|sugg[eè]re|recommande|id[ée]es?\s*(de\s+voyage|de\s+destination)?|où\s+partir/i,
```

**B. Ajouter la detection de `mentionedDestination`** (apres le bloc `isUndecided`, ~ligne 561)

Ajouter un bloc qui detecte les noms de villes/pays mentionnes dans des patterns comme :
- "aller a/en X"
- "partir a/en/au/aux X"
- "destination : X"
- "je veux X" (quand X est un nom propre capitalise)

```typescript
// Detect destination mentions
const destinationPatterns = [
  /(?:aller|partir|voyager)\s+(?:[àa]|en|au|aux)\s+([A-ZÀ-Ü][\w\s-]+)/i,
  /destination\s*[:=]?\s*([A-ZÀ-Ü][\w\s-]+)/i,
  /(?:je\s+veux|on\s+va|direction)\s+([A-ZÀ-Ü][\w\s-]+)/i,
];
for (const pattern of destinationPatterns) {
  const match = text.match(pattern);
  if (match) {
    intent.mentionedDestination = match[1].trim();
    break;
  }
}
```

**C. Enrichir la detection de budget qualitatif** (~ligne 492)

Actuellement, `mentionedBudget` n'est rempli que si un montant numerique est trouve. Ajouter la detection des mentions qualitatives :

```typescript
// Qualitative budget mentions
if (intent.wantsBudgetInfo && !intent.mentionedBudget) {
  const qualPatterns = [
    { pattern: /pas\s+ch[eè]re?|[ée]conomique|budget/i, label: "budget" },
    { pattern: /luxe|premium|haut\s+de\s+gamme/i, label: "luxury" },
    { pattern: /moyen|raisonnable|correct/i, label: "moderate" },
  ];
  for (const { pattern, label } of qualPatterns) {
    if (pattern.test(text)) {
      intent.mentionedBudget = label;
      break;
    }
  }
}
```

Egalement ajouter "pas cher" / "pas chere" / "economique" dans `BUDGET_INTENT_PATTERNS` s'ils n'y sont pas deja.

### Fichier 2 : `src/lib/suites/chatAdvancedSim.suite.ts`

**Ligne 620-627** : Mettre a jour le test pour reflecter la suppression de Guard 1 :

```text
Avant : expect(result?.widgetType).toBe("destinationSuggestions");
Apres : expect(result).toBe(null);
```

### Fichier 3 : `src/lib/suites/chatJourneysSim.suite.ts`

Aucune modification necessaire — les tests sont corrects, c'est le code source (`analyzeUserIntent`) qui doit etre enrichi pour les faire passer.

## Resume des fichiers modifies

| Fichier | Changement |
|---|---|
| `messageAnalyzer.ts` | Ajout patterns "inspire/propose/suggere" dans MORE_OPTIONS, detection `mentionedDestination`, detection budget qualitatif |
| `chatAdvancedSim.suite.ts` | Test Guard 1 mis a jour pour attendre `null` |

## Scalabilite

Cette approche est scalable car :
- Les patterns sont dans des tableaux constants, faciles a enrichir
- La detection de destination utilise des regex generiques (pas de noms hardcodes)
- Le budget qualitatif utilise un mapping label extensible
- Tous les nouveaux comportements sont couverts par les tests existants (Journey 42, 43) qui passeront une fois le code mis a jour

