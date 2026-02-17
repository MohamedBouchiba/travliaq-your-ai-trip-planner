

## Migration Azure OpenAI -> OpenAI direct

### 1. Ajouter les secrets manquants

- `OPENAI_API_KEY` : demander la valeur via l'outil add_secret
- `OPENAI_MODEL` : valeur `gpt-4o-mini`

Note : le secret `OPENAI_API_KEY` existe deja dans Supabase (visible dans la config). Il faut verifier s'il contient la bonne valeur ou le mettre a jour. Le secret `OPENAI_MODEL` existe aussi -- il faut le mettre a jour avec `gpt-4o-mini`.

### 2. Nettoyer les references Azure restantes

**Fichier `supabase/functions/planner-chat/index.ts`** :
- Renommer les variables `azureStartTime`, `azureLatency` en `llmStartTime`, `llmLatency`
- Remplacer les appels `log.azureCall(...)` par des appels equivalents `log.info("openai", ...)` ou garder `azureCall` tel quel (c'est un nom de methode du logger, pas une reference fonctionnelle)
- Mettre a jour les commentaires mentionnant "Azure"

**Fichier `supabase/functions/planner-chat/utils/fetchWithRetry.ts`** :
- Changer le label par defaut de `"azure_openai"` a `"openai"`

**Fichier `supabase/functions/_shared/logger.ts`** :
- Renommer le type `LogCategory` : remplacer `"azure_openai"` par `"openai"` (et mettre a jour tous les usages)
- Renommer la methode `azureCall` en `llmCall` (et mettre a jour tous les appels dans index.ts)

**Fichier `supabase/functions/destination-fact/index.ts`** :
- Migrer aussi vers OpenAI direct (meme pattern : `OPENAI_API_KEY` + `OPENAI_MODEL` + endpoint `https://api.openai.com/v1/chat/completions`)
- Supprimer les references aux variables Azure (`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, etc.)

### 3. Redeployer

- Deployer `planner-chat` et `destination-fact`
- Tester avec "Inspire-moi !" dans le chat

### Fichiers modifies

| Fichier | Action |
|---|---|
| `supabase/functions/planner-chat/index.ts` | Renommer variables Azure, mettre a jour commentaires |
| `supabase/functions/planner-chat/utils/fetchWithRetry.ts` | Label par defaut `"openai"` |
| `supabase/functions/_shared/logger.ts` | Renommer `azure_openai` -> `openai`, `azureCall` -> `llmCall` |
| `supabase/functions/destination-fact/index.ts` | Migrer vers OpenAI direct |

