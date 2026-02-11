
# Plan : Rendre le chat intelligent -- Stop au forçage des suggestions de destinations

## Probleme central

Apres la collecte des preferences (style + interets), le systeme **force systematiquement** 3 suggestions de destinations via deux mecanismes independants :

1. **Backend (ReAct loop)** : Le LLM appelle `request_destination_suggestions(3)` de lui-meme apres les preferences, meme quand l'utilisateur dit simplement "non"
2. **Frontend (`evaluatePhaseTransition`)** : La transition de phase "preferences complete -> destinationSuggestions" se declenche automatiquement des que `style_configured` ou `interests_selected` existe dans l'historique

Le resultat : l'utilisateur se retrouve TOUJOURS avec 3 destinations apres ses preferences, meme s'il n'a rien demande.

## Corrections

### 1. Supprimer la transition automatique preferences -> destinations (Frontend)

**Fichier** : `src/components/planner/chat/hooks/intentRouterCore.ts`

La garde "Guard 1" (lignes 306-317) dans `evaluatePhaseTransition` force `destinationSuggestions` des que les preferences existent et qu'il n'y a pas de destination. Cette logique doit etre **supprimee** car :
- C'est le backend (LLM) qui doit decider QUAND proposer des destinations
- L'utilisateur peut avoir deja mentionne un pays/ville avant les preferences
- L'utilisateur peut vouloir poser une question ou preciser un budget avant les destinations

```text
Avant : Guard 1 retourne destinationSuggestions si hasStyleOrInterests && !hasDestination
Apres : Guard 1 supprime -- la decision revient au backend uniquement
```

### 2. Empecher le LLM de forcer les suggestions (Backend)

**Fichier** : `supabase/functions/planner-chat/index.ts`

Ajouter une instruction dans le system prompt qui interdit au LLM d'appeler `request_destination_suggestions` de maniere proactive. Il ne doit l'appeler QUE si :
- L'utilisateur demande explicitement des suggestions ("propose-moi des destinations", "inspire-moi", "ou partir ?")
- L'utilisateur repond positivement a une question du type "voulez-vous que je vous propose des destinations ?"

```text
## REGLE : SUGGESTIONS DE DESTINATIONS
N'appelle JAMAIS request_destination_suggestions de ta propre initiative.
Tu ne dois l'appeler QUE si l'utilisateur demande EXPLICITEMENT des suggestions.
Apres avoir collecte les preferences, pose la question :
"Souhaitez-vous que je vous propose des destinations adaptees a vos gouts ?"
Attends la reponse AVANT d'appeler l'outil.
```

### 3. Mettre a jour le tool description pour renforcer la garde (Backend)

**Fichier** : `supabase/functions/planner-chat/tools/destinationSuggestions.ts`

Ajouter dans la description du tool une regle anti-proactivite :

```text
REGLE ANTI-PROACTIVITE :
N'appelle PAS cet outil automatiquement apres les preferences.
Attends que l'utilisateur DEMANDE des suggestions ou ACCEPTE une proposition.
Si l'utilisateur dit "non", "pas pour l'instant", ne propose PAS de destinations.
```

### 4. Supprimer la suppression post-loop devenue inutile (Backend)

**Fichier** : `supabase/functions/planner-chat/index.ts` (lignes 874-880)

Le bloc qui supprime `destinationSuggestionRequest` quand `primaryIntent === "gather_preferences"` devient inutile puisque le LLM ne forcera plus les suggestions. On le conserve neanmoins comme filet de securite.

### 5. Rendre le nombre de suggestions dynamique (Backend + Frontend)

**Fichier** : `supabase/functions/planner-chat/tools/destinationSuggestions.ts`

Le `requestedCount` par defaut passe de 3 a un choix contextuel. Quand l'utilisateur ne precise pas de nombre, le LLM devrait demander "combien de suggestions souhaitez-vous ?" ou utiliser un defaut adapte au contexte (escapade courte = 2-3, voyage long = 3-5).

Modifier la description du tool :
```text
Si l'utilisateur ne precise pas de nombre, utilise un defaut adapte :
- Escapade courte (1-3 jours) : 2 suggestions
- Voyage moyen (4-7 jours) : 3 suggestions  
- Voyage long (8+ jours) : 4-5 suggestions
```

## Resume des fichiers modifies

| Fichier | Changement |
|---|---|
| `intentRouterCore.ts` | Suppression de Guard 1 (auto-trigger destinationSuggestions apres preferences) |
| `planner-chat/index.ts` | Instruction anti-proactivite dans le system prompt |
| `destinationSuggestions.ts` | Description enrichie : anti-proactivite + nombre dynamique |

## Impact attendu

Apres ce fix, le flux sera :
1. Utilisateur : "escapade pas cher depuis Bruxelles"
2. Bot : collecte style (widget)
3. Bot : collecte interets (widget)
4. Utilisateur : "non" (pas d'autres criteres)
5. Bot : **"Souhaitez-vous que je vous propose des destinations adaptees ?"** (au lieu de forcer 3 destinations)
6. Utilisateur : "oui" -> Bot appelle `request_destination_suggestions`
7. OU Utilisateur : "non, je veux aller a Amsterdam" -> Bot continue sans widget
