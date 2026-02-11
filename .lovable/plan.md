

# Plan : Fix des incohérences persistantes (snapshot 15:22)

## Incohérences identifiees

### 1. `sessionEntities` toujours vide -- accent manquant dans la regex
Le pattern `/à\s+partir\s+de\s+(...)/gi` exige le caractere `à` (avec accent grave), mais l'utilisateur tape `a partir de bruxelles` sans accent. Le match echoue silencieusement. Meme probleme pour d'autres variantes informelles.

### 2. `flightSummary` affiche toujours "AUVERGNE (CFE)"
Le fix precedent (`useChatSubmit.ts` ligne 293-298) devrait fonctionner : quand `flightData` est null et `intentClassification.entities.departureCity` existe, on appelle `updateMemory({ departure: { city: depCity } })`. Mais le probleme est que le **plannerStoreV2 est persiste en localStorage** et n'est jamais purge entre sessions. L'ancien depart "AUVERGNE" survit dans le store. Le fix fonctionne en theorie, mais si l'intent n'a pas `departureCity` (ce qui arrive pour les messages suivants), l'ancien depart reste.

La solution : en plus du fix existant, il faut **aussi** purger le depart du planner store au debut d'une nouvelle conversation si le store contient des donnees potentiellement obsoletes.

### 3. LLM repond en anglais
L'utilisateur ecrit en francais mais le bot repond "Let's start by selecting your travel dates" et "Great! Now, let's pick your destination city in France". Le system prompt contient deja l'instruction de repondre dans la langue de l'utilisateur, mais le LLM ne la respecte pas systematiquement. Il faut renforcer cette instruction en la placant plus haut et en la repetant dans le user message context.

### 4. LLM assume "France" comme destination
Sans que l'utilisateur le dise, le LLM repond "pick your destination city in France" et met `toCountryCode: "FR"` dans flightData. C'est une hallucination du LLM. On peut ajouter une guard cote client : ignorer `toCountryCode` quand l'utilisateur n'a pas explicitement mentionne de pays.

---

## Corrections

### Fichier 1 : `src/components/planner/chat/hooks/useSessionContext.ts`

Rendre les patterns tolerants aux accents manquants :

```text
Avant :  /à\s+partir\s+de\s+(...)/gi
Apres :  /[àa]\s+partir\s+de\s+(...)/gi

Ajouter aussi :
  /(?:au départ de|au depart de)\s+(...)/gi
```

Meme approche pour tous les patterns FR qui contiennent des caracteres accentues.

### Fichier 2 : `src/components/planner/chat/hooks/useChatStream.ts`

Au montage (deja present le `debugStore.clearAll()`), ajouter aussi un reset du depart dans le planner store si le chat demarre une nouvelle session :

```typescript
useEffect(() => {
  useDebugStore.getState().clearAll();
  // Reset stale departure from previous session
  const currentDeparture = usePlannerStoreV2.getState().departure;
  if (currentDeparture?.iata || currentDeparture?.city) {
    usePlannerStoreV2.getState().setDeparture(null);
  }
}, []);
```

Note : on ne purge que le depart (pas tout le store) car d'autres donnees comme les preferences peuvent etre volontairement persistees.

### Fichier 3 : `supabase/functions/planner-chat/index.ts`

Renforcer l'instruction de langue en l'ajoutant au debut du system prompt (avant tout autre contenu) et en ajoutant un rappel dans le contexte utilisateur :

```text
## REGLE ABSOLUE NUMERO 1 : LANGUE
Tu DOIS repondre dans la MEME LANGUE que le dernier message de l'utilisateur.
Si l'utilisateur ecrit en francais, tu reponds en francais. AUCUNE EXCEPTION.
Ne reponds JAMAIS en anglais sauf si l'utilisateur ecrit en anglais.
```

### Fichier 4 : `src/components/planner/chat/hooks/useChatSubmit.ts`

Ajouter une guard pour ignorer `toCountryCode` quand aucun pays n'a ete explicitement mentionne par l'utilisateur :

```typescript
// Dans le traitement de flightData, avant d'appliquer toCountryCode
if (flightData?.toCountryCode && !flightData?.to) {
  // LLM a devine un pays sans que l'utilisateur le mentionne -> ignorer
  delete flightData.toCountryCode;
}
```

### Fichier 5 : `src/lib/suites/sessionEntities.suite.ts`

Ajouter des tests pour les variantes sans accent :

```text
Test : "a partir de bruxelles" (sans accent) -> destinations contient "bruxelles"
Test : "au depart de lyon" -> destinations contient "lyon"  
Test : "je pars de marseille" -> destinations contient "marseille"
```

---

## Resume des fichiers modifies

| Fichier | Changement |
|---|---|
| `useSessionContext.ts` | Regex tolerantes aux accents manquants |
| `useChatStream.ts` | Reset du depart du planner store au montage |
| `planner-chat/index.ts` | Instruction de langue renforcee en position 1 |
| `useChatSubmit.ts` | Guard contre `toCountryCode` hallucine |
| `sessionEntities.suite.ts` | Tests pour variantes sans accent |

