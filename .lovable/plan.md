

# Plan d'Expert : Correction des 6 Causes Racines

## Architecture de la solution

Chaque fix est concu pour etre **sans hardcoding**, en utilisant les systemes existants (i18n, cooldown, stores) comme source de verite unique.

---

## CR1 : Internationaliser tous les messages auto-generes

**Probleme** : `useChatWidgetFlow.ts` importe `{ fr }` en dur et ecrit tous les labels/messages en francais. Meme chose dans `useWidgetActionExecutor.ts`.

**Solution** : Le hook `useLocale()` existe deja dans `src/hooks/useLocale.ts` et fournit `dateFnsLocale` + `language`. Les cles i18n `planner.widget.*` existent deja dans les deux langues (fr/en). Il faut :

### Etape 1a : Ajouter les cles i18n manquantes

**Fichiers** : `src/i18n/locales/fr/planner.json` et `src/i18n/locales/en/planner.json`

Ajouter les cles pour les messages auto-generes des widgets :

```json
// fr
"planner.widget.userChoice.departOn": "Je pars le {{date}}",
"planner.widget.userChoice.returnOn": "Je reviens le {{date}}",
"planner.widget.userChoice.dateRange": "Je pars du {{from}} au {{to}}",
"planner.widget.userChoice.travelers": "Nous sommes {{label}}",
"planner.widget.userChoice.selectCity": "Je choisis {{city}}, {{country}}",
"planner.widget.userChoice.roundtrip": "Oui, c'est un aller-retour",
"planner.widget.userChoice.oneway": "Non, c'est un aller simple",
"planner.widget.userChoice.multi": "C'est un voyage multi-destinations",
"planner.widget.userChoice.validateStyle": "Je valide le style de voyage",
"planner.widget.userChoice.validateInterests": "Je valide les centres d'intérêt",
"planner.widget.userChoice.selectDestination": "Je choisis **{{country}}**",
"planner.widget.confirm.date": "✓ Date de départ : **{{date}}**",
"planner.widget.confirm.returnDate": "✓ Date de retour : **{{date}}**",
"planner.widget.confirm.dateRange": "✓ **{{from}}** → **{{to}}**",
"planner.widget.confirm.dateRangeWithTravelers": "✓ **{{from}}** → **{{to}}**. {{travelersQuestion}}",
"planner.widget.confirm.travelersWithTripType": "Parfait, {{label}} ! {{tripTypeQuestion}}",
"planner.widget.confirm.departure": "✓ Départ : **{{airport}}**",
"planner.widget.confirm.arrival": "✓ Arrivée : **{{airport}}**",
"planner.widget.label.adult": "adulte",
"planner.widget.label.adults": "adultes",
"planner.widget.label.child": "enfant",
"planner.widget.label.children": "enfants",
"planner.widget.label.infant": "bébé",
"planner.widget.label.infants": "bébés",
"planner.widget.tripType.roundtrip": "Aller-retour",
"planner.widget.tripType.oneway": "Aller simple",
"planner.widget.tripType.multi": "Multi-destinations",
"planner.widget.ask.travelers": "Combien êtes-vous ?",
"planner.widget.ask.tripType": "C'est bien un aller-retour ?",
"planner.widget.ask.multiSteps": "Pour un voyage multi-destinations, indiquez-moi toutes vos étapes.",
"planner.widget.ask.dateChoice": "Choisis tes dates de voyage :",
"planner.widget.ask.departureDateChoice": "Quand souhaites-tu partir ?",
"planner.widget.confirm.tripType": "**{{type}}** confirmé ! Cliquez ci-dessous pour lancer la recherche.",

// en (equivalents)
"planner.widget.userChoice.departOn": "I depart on {{date}}",
"planner.widget.userChoice.returnOn": "I return on {{date}}",
"planner.widget.userChoice.dateRange": "I travel from {{from}} to {{to}}",
"planner.widget.userChoice.travelers": "We are {{label}}",
"planner.widget.userChoice.selectCity": "I choose {{city}}, {{country}}",
"planner.widget.userChoice.roundtrip": "Yes, it's a round trip",
"planner.widget.userChoice.oneway": "No, it's a one-way trip",
"planner.widget.userChoice.multi": "It's a multi-destination trip",
"planner.widget.userChoice.validateStyle": "I confirm the travel style",
"planner.widget.userChoice.validateInterests": "I confirm interests",
"planner.widget.userChoice.selectDestination": "I choose **{{country}}**",
"planner.widget.confirm.date": "✓ Departure: **{{date}}**",
... (meme structure)
```

### Etape 1b : Refactorer `useChatWidgetFlow.ts`

Le hook ne peut pas appeler `useTranslation()` directement car il est deja un hook. La solution : **ajouter `t` et `dateFnsLocale` dans `UseChatWidgetFlowOptions`** (les composants parents les passent deja via `useTranslation` et `useLocale`).

**Modifications** :
- Supprimer `import { fr } from "date-fns/locale"` (ligne 17)
- Ajouter dans `UseChatWidgetFlowOptions` : `t: TFunction` et `dateFnsLocale: Locale`
- Remplacer chaque `{ locale: fr }` par `{ locale: dateFnsLocale }`
- Remplacer chaque string francaise par `t("planner.widget.xxx", { param })` 

**Exemple concret** (handleDateSelect, lignes 258-278) :
```typescript
// AVANT
const dateLabel = format(date, "d MMMM yyyy", { locale: fr });
text: `Je pars le ${dateLabel}`

// APRES
const dateLabel = format(date, "d MMMM yyyy", { locale: dateFnsLocale });
text: t("planner.widget.userChoice.departOn", { date: dateLabel })
```

Meme pattern pour **chaque** handler : `handleDateRangeSelect`, `handleTravelersSelect`, `handleTripTypeConfirm`, `handleCitySelect`, `handleAirportSelect`.

### Etape 1c : Refactorer `useWidgetActionExecutor.ts`

Meme approche : passer `t` en parametre dans les options du hook. Remplacer les ~10 strings francaises (`"Je choisis..."`, `"Je configure..."`, etc.) par des cles i18n. Les regex de parsing (`/(\d+)\s*adulte/i`) doivent aussi matcher les variantes anglaises (`/(\d+)\s*(adult|adulte)/i`).

### Etape 1d : Passer t et locale depuis le composant parent

**Fichier** : `src/components/planner/PlannerChat.tsx`

A l'endroit ou `useChatWidgetFlow` est appele, passer les 2 nouvelles props :

```typescript
const { t } = useTranslation();
const { dateFnsLocale } = useLocale();

const widgetFlow = useChatWidgetFlow({
  memory, updateMemory, updateTravelers, setMessages,
  t, dateFnsLocale, // nouvelles props
});
```

---

## CR2 : Supprimer `applyWidgetForcingLogic` + proteger `applyPreferenceFirstLogic`

**Probleme** : `applyWidgetForcingLogic` (lignes 327-370) lit `detectedEntities` qui n'existe pas -> toujours une chaine vide -> mort-ne. `applyPreferenceFirstLogic` override les intents conversationnels.

### Etape 2a : Supprimer `applyWidgetForcingLogic`

**Fichier** : `supabase/functions/planner-chat/index.ts`

Supprimer entierement la fonction `applyWidgetForcingLogic` (lignes 327-370). Elle est inutile car :
- La source de donnees (`detectedEntities`) n'existe pas
- Les keywords sont en francais uniquement (pas scalable)
- Le LLM intent classifier fait deja ce travail (avec plus de contexte)

Supprimer aussi son appel dans la pipeline (chercher `applyWidgetForcingLogic(` et retirer la ligne).

### Etape 2b : Proteger `applyPreferenceFirstLogic` contre les intents conversationnels

**Fichier** : `supabase/functions/planner-chat/index.ts`, lignes 406-421

Ajouter un guard en debut de fonction :

```typescript
function applyPreferenceFirstLogic(...) {
  // GUARD: Never override conversational intents
  const CONVERSATIONAL_INTENTS = [
    "greeting", "thank_you", "other", "ask_question",
    "compare_options", "ask_recommendations",
    "confirm_selection", "modify_selection", "cancel_or_restart"
  ];
  if (CONVERSATIONAL_INTENTS.includes(intentClassification.primaryIntent)) {
    return intentClassification; // ne touche pas
  }

  // GUARD: Never override when LLM already assigned a specific non-preference widget
  const NON_PREFERENCE_WIDGETS = [
    "budgetRangeSlider", "dietary", "mustHaves",
    "citySelector", "datePicker", "dateRangePicker",
    "travelersSelector", "tripTypeConfirm"
  ];
  if (intentClassification.widgetToShow?.type &&
      NON_PREFERENCE_WIDGETS.includes(intentClassification.widgetToShow.type)) {
    return intentClassification; // le LLM a deja choisi un widget specifique
  }
  
  // ... reste de la logique existante
}
```

---

## CR3 : Supprimer le bypass regex dans PlannerChat.tsx

**Probleme** : Lignes 900-941 dans `sendText()` -- une regex intercepte "inspire/recommend/suggest" et injecte `preferenceStyle` directement, sans cooldown, sans API.

### Etape 3a : Supprimer le bloc regex

**Fichier** : `src/components/planner/PlannerChat.tsx`, lignes 899-941

Supprimer entierement ce bloc :
```typescript
// Detect "inspire" intent for preference widgets flow
const isInspireIntent = /inspire|...|recommend/i.test(userText);
if (isInspireIntent) { ... return; }
```

Le message sera traite par le pipeline normal : envoi a l'API -> classification par le LLM -> `processIntent` -> cooldown check. Le LLM sait deja gerer les demandes d'inspiration (intent `ask_inspiration` ou `gather_preferences`).

**Aucune fonctionnalite perdue** : le LLM intent classifier a deja les regles pour detecter "inspire-moi", "suggest", "recommend" et retourner le bon widget.

---

## CR4 : Envoyer le contexte conversationnel au classificateur

**Probleme** : Le classificateur ne recoit qu'un seul message (lignes 706-709), donc pas de contexte pour desambiguiser les nombres, les references anaphoriques, ou les intents contextuels.

### Etape 4a : Envoyer les 3 derniers messages au classificateur

**Fichier** : `supabase/functions/planner-chat/index.ts`, lignes 692-710

Remplacer l'extraction d'un seul message par les N derniers :

```typescript
// AVANT
const lastUserMessage = [...limitedMessages].reverse().find(m => m.role === "user");
// ...
messages: [
  { role: "system", content: buildClassificationSystemPrompt(...) },
  lastUserMessage,
],

// APRES
// Prendre les 4 derniers messages (2 paires user/assistant) pour le contexte
const recentMessages = limitedMessages.slice(-4);
// ...
messages: [
  { role: "system", content: buildClassificationSystemPrompt(...) },
  ...recentMessages,
],
```

**Pourquoi 4** : 2 paires (assistant + user) donnent assez de contexte pour :
- Desambiguiser "2" (CR6 corrige automatiquement)
- Detecter "Valentine's trip" comme style (contexte de la conversation)
- Comprendre "with my husband" = 2 adultes (contexte familial)
- Identifier les references a des listes numerotees

**Impact sur les couts** : Passage de ~50 tokens a ~200 tokens en input pour la classification. Cout negligeable (~0.001$ par requete supplementaire).

### Etape 4b : Mettre a jour `buildClassificationSystemPrompt`

Ajouter une instruction pour utiliser le contexte :

```typescript
return `Tu es un classificateur d'intention pour un assistant de voyage.
Analyse le DERNIER message utilisateur en tenant compte du contexte conversationnel fourni.

CONTEXTE:
- Les messages precedents te donnent le contexte de la conversation
- Utilise-les pour desambiguiser les intentions (ex: "2" = selection si liste proposee)
- Le dernier message utilisateur est celui a classifier

... (reste identique)`;
```

---

## CR5 : Flight search - promesse realiste

**Probleme** : `trigger_flight_search` emet un event mais aucune API de recherche reelle n'est connectee. Le LLM promet des resultats.

### Etape 5a : Modifier le prompt systeme pour refletir la realite

**Fichier** : `supabase/functions/planner-chat/index.ts`, dans `buildSystemPrompt`

Ajouter une regle :

```
## RECHERCHE DE VOLS - COMPORTEMENT ATTENDU
Quand trigger_flight_search est appele, le formulaire de recherche est PRE-REMPLI dans l'onglet Vols.
L'utilisateur doit VERIFIER le formulaire et lancer la recherche manuellement.
NE DIS JAMAIS "je recherche" ou "les resultats arrivent". 
DIS : "J'ai pre-rempli le formulaire de recherche dans l'onglet Vols. 
Verifiez les details et lancez la recherche quand vous etes pret."
```

### Etape 5b : Mettre a jour la description du tool `trigger_flight_search`

**Fichier** : `supabase/functions/planner-chat/tools/flightSearchTrigger.ts`

Modifier la description pour refleter la realite :

```typescript
description: `Pre-remplit le formulaire de recherche de vols avec l'itineraire configure.
NE LANCE PAS de recherche automatique. L'utilisateur devra verifier et lancer manuellement.
Dans ta reponse, dis que le formulaire est pret dans l'onglet Vols.`
```

### Note sur l'API de vol

Si tu veux connecter une vraie API de recherche de vols (ex: Amadeus, Kiwi, Duffel), c'est un travail cote API/backend. L'architecture est prete : le `FlightsPanel` recoit deja `triggerFlightSearch=true` et `flightFormData`. Il suffirait d'ajouter un appel API dans le panel quand ces deux conditions sont remplies. **Dis-moi si tu veux que je prepare l'interface pour ca** -- je peux definir le contrat (types de requete/reponse) pour que tu l'implementes dans ton API.

---

## CR6 : Desambiguisation des nombres (corrigee par CR4)

La correction CR4 (envoi de 4 messages au classificateur) corrige automatiquement ce probleme. Le classificateur verra le message precedent de l'assistant avec la liste numerotee et pourra interpreter "2" comme `confirm_selection` + `selectedOption: "2"`.

La regle textuelle ajoutee precedemment dans `buildClassificationSystemPrompt` (lignes 469-476) est deja correcte. Elle sera maintenant **fonctionnelle** car le contexte sera present.

---

## Resume des modifications

| CR | Fichier(s) | Action |
|----|-----------|--------|
| CR1 | `fr/planner.json`, `en/planner.json` | Ajouter ~30 cles i18n pour les messages widgets |
| CR1 | `useChatWidgetFlow.ts` | Remplacer `fr` et strings par `t()` + `dateFnsLocale` |
| CR1 | `useWidgetActionExecutor.ts` | Remplacer strings par `t()` |
| CR1 | `PlannerChat.tsx` | Passer `t` et `dateFnsLocale` aux hooks |
| CR2 | `planner-chat/index.ts` | Supprimer `applyWidgetForcingLogic`, ajouter guards dans `applyPreferenceFirstLogic` |
| CR3 | `PlannerChat.tsx` | Supprimer le bloc regex inspire (lignes 899-941) |
| CR4 | `planner-chat/index.ts` | Envoyer 4 derniers messages au classificateur, maj du prompt |
| CR5 | `planner-chat/index.ts` + `flightSearchTrigger.ts` | Prompt realiste pour la recherche de vols |
| CR6 | (aucun) | Corrige automatiquement par CR4 |

## Ordre d'implementation

1. **CR3** (5 min) -- suppression du regex, zero risque de regression
2. **CR2** (10 min) -- suppression de `applyWidgetForcingLogic` + guards
3. **CR4** (5 min) -- contexte conversationnel au classificateur (corrige aussi CR6)
4. **CR5** (5 min) -- prompt realiste flight search
5. **CR1** (30 min) -- i18n de tous les messages (le plus gros, mais mecanique)

Total : ~55 min de modifications, 0 feature perdue, 16 anomalies corrigees.

