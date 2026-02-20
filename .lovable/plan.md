

## Plan : Corriger les bugs d'interaction dans le chat

### Diagnostic - 2 bugs identifies dans les rapports

---

### Bug A : Boucle infinie du citySelector

**Symptome** : L'utilisateur selectionne "Algiers" dans le widget citySelector, mais le meme widget se re-affiche immediatement. L'utilisateur a du cliquer 5+ fois sur la meme ville sans que le systeme avance.

**Cause racine** : Enchainement de 3 problemes :

1. `handleCitySelect` (locationHandlers.ts:99) fait `refs.citySelectionShownForCountry.current = null` apres chaque selection. Cela reset le garde anti-doublon.

2. `handleCitySelect` appelle ensuite `updateMemory({ arrival: { city, country, countryCode } })`. Cette mise a jour du memory declenche un recalcul des "legs" dans FlightsPanel.

3. Le leg a toujours `toLocation.type === "country"` (la selection de ville ne change pas le type du location dans le leg). Le code de FlightsPanel detecte `toIsCountry === true` et rappelle `onCountrySelected()`.

4. `injectSystemMessage` (useChatImperativeHandlers.ts:92) verifie `citySelectionShownRef.current === countryKey`. Comme le ref a ete reset a null, le garde passe, et un nouveau citySelector est cree.

5. L'utilisateur selectionne encore → retour a l'etape 1.

```text
handleCitySelect
  -> refs.citySelectionShownForCountry = null   // RESET du garde
  -> updateMemory({ arrival: {...} })
    -> legs recalcul
      -> toLocation.type === "country" (inchange)
        -> onCountrySelected()
          -> injectSystemMessage()
            -> garde passe (ref = null)
              -> nouveau citySelector
                -> boucle
```

**Correction** :

**Fichier `src/components/planner/chat/hooks/widgetHandlers/locationHandlers.ts`** (ligne 99) :

Supprimer le reset `refs.citySelectionShownForCountry.current = null`. Le ref doit rester positionne pour bloquer les re-appels de `injectSystemMessage` pour le meme pays. Le reset ne doit se faire QUE quand l'utilisateur envoie un NOUVEAU message texte (deja fait dans useChatSubmit.ts:191).

**Fichier `src/components/planner/chat/hooks/useChatImperativeHandlers.ts`** (ligne 86-100) :

Ajouter un garde supplementaire : si le memory a deja une ville d'arrivee (ou de depart) definie pour le champ correspondant, ne pas re-ouvrir le citySelector. Cela protege meme si le ref est corrompu.

```text
// Avant le garde existant, ajouter :
// Si une ville est deja selectionnee pour ce champ, ignorer
const flightMemory = usePlannerStoreV2.getState();
const fieldCity = event.field === "from" 
  ? flightMemory.departure?.city 
  : flightMemory.arrival?.city;
if (fieldCity) {
  if (import.meta.env.DEV) console.log("[Chat] City already selected:", fieldCity);
  return;
}
```

---

### Bug B : Reponse vide quand l'utilisateur re-demande des destinations

**Symptome** : L'utilisateur dit "propose moi des destinantion", le bot repond avec un message vide (aucun texte, aucun widget).

**Cause racine** : Le message precedent avait deja affiche `destinationSuggestions` (non confirme). Quand l'utilisateur re-demande :

1. `sendText` cree le placeholder bot avec `text: ""` (useChatSubmit.ts:196)
2. Le SSE stream retourne une reponse avec `destinationSuggestionRequest` rempli
3. `handleLLMDestinationRequest` est appele (useChatSubmit.ts:426)
4. Mais `isFetchingRef.current` est potentiellement encore `true` du fetch precedent (le guard B2 a la ligne 171 de useChatDestinationFlow.ts). Le fetch precedent a reussi, mais si le `finally` n'a pas encore execute (timing React), le guard bloque.
5. `handleLLMDestinationRequest` retourne immediatement sans mettre a jour le message → le bot affiche `text: ""`
6. Alternativement, le SSE stream retourne du contenu vide et le systeme ne le remplace pas

**Correction** :

**Fichier `src/components/planner/chat/hooks/useChatDestinationFlow.ts`** (ligne 170-172) :

Quand le garde `isFetchingRef` bloque l'appel, ne pas retourner silencieusement. Au lieu de cela, mettre a jour le message avec le texte existant ou un message de fallback, et re-montrer le widget de suggestions existant :

```text
if (isFetchingRef.current) {
  // Flash le widget existant au lieu de laisser un message vide
  setMessages((prev) => {
    // Find existing unconfirmed destination suggestion
    const existingWidget = prev.find(
      (m) => m.widget === "destinationSuggestions" && !m.widgetConfirmed
    );
    if (existingWidget) {
      // Flash it + update the new message to point the user there
      return prev.map((m) => {
        if (m.id === existingWidget.id) {
          return { ...m, _flashKey: Date.now() };
        }
        if (m.id === messageId) {
          return { ...m, text: t("planner.messages.suggestionsAlreadyShown"), isTyping: false, isStreaming: false };
        }
        return m;
      });
    }
    return prev;
  });
  return;
}
```

**Fichier `src/components/planner/chat/hooks/useChatSubmit.ts`** (autour de la ligne 409-428) :

Ajouter un fallback quand `content` est vide avant d'appeler `handleLLMDestinationRequest` :

```text
if (destinationSuggestionRequest) {
  const rawContent = content || "";
  // ... nettoyage existant ...
  
  // Si le contenu nettoye est vide, mettre un texte par defaut
  if (!cleanedContent) {
    opts.setMessages(updateMessageById(messageId, { 
      text: t("planner.messages.searchingDestinations"), 
      isTyping: true, 
      isStreaming: false 
    }));
  }
  
  await opts.handleLLMDestinationRequest(...);
  opts.setIsLoading(false);
  return;
}
```

---

### Fichiers modifies

| Fichier | Changement |
|---|---|
| `src/components/planner/chat/hooks/widgetHandlers/locationHandlers.ts` | Supprimer le reset de `citySelectionShownForCountry` dans `handleCitySelect` (ligne 99) |
| `src/components/planner/chat/hooks/useChatImperativeHandlers.ts` | Ajouter garde memoire dans `injectSystemMessage` : skip si ville deja definie |
| `src/components/planner/chat/hooks/useChatDestinationFlow.ts` | Gerer le cas `isFetchingRef` bloquant : flash widget existant + message fallback |
| `src/components/planner/chat/hooks/useChatSubmit.ts` | Ajouter texte fallback quand content vide + destinationSuggestionRequest |

### Impact attendu

- Plus de boucle infinie du citySelector apres selection d'une ville
- Plus de message vide quand l'utilisateur re-demande des suggestions de destinations
- Le widget existant est "flashe" pour attirer l'attention au lieu de creer un doublon

