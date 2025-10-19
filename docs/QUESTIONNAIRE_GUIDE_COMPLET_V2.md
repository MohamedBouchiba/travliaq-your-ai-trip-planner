# **📋 GUIDE COMPLET DU QUESTIONNAIRE TRAVLIAQ v2.0**

**Documentation complète pour comprendre la logique du questionnaire dynamique**

**Dernière mise à jour : 19 janvier 2025**

---

## **📋 TABLE DES MATIÈRES**

1. [Vue d'ensemble du système](#-vue-densemble-du-système)
2. [Changements majeurs v2.0](#-changements-majeurs-v20)
3. [Codes internes vs Labels traduits](#-codes-internes-vs-labels-traduits)
4. [Logique conditionnelle et branches](#-logique-conditionnelle-et-branches)
5. [Arbre de décision complet](#-arbre-de-décision-complet)
6. [Description détaillée des champs](#-description-détaillée-des-champs)
7. [Exemples de parcours complets](#-exemples-de-parcours-complets)
8. [Structure JSON de sortie](#-structure-json-de-sortie)
9. [JSON Schema](#-json-schema)
10. [Utilisation des données](#-utilisation-des-données)
11. [Conseils et bonnes pratiques](#-conseils-et-bonnes-pratiques)

---

## **🌍 VUE D'ENSEMBLE DU SYSTÈME**

Le questionnaire Travliaq est un **formulaire dynamique intelligent** qui s'adapte aux réponses de l'utilisateur pour collecter uniquement les informations pertinentes. Le nombre d'étapes varie entre **10 et 22+** selon les choix effectués.

### **Principe de fonctionnement**

```
┌─────────────────────────────────────────────┐
│  Utilisateur répond à une question          │
│           ↓                                  │
│  Système évalue la réponse                  │
│           ↓                                  │
│  Décide quelle(s) question(s) suivante(s)   │
│           ↓                                  │
│  Affiche la ou les questions pertinentes    │
└─────────────────────────────────────────────┘
```

### **Caractéristiques principales**

✅ **Questionnaire adaptatif** : Les questions changent selon les réponses précédentes

✅ **Multilingue** : Support FR/EN avec détection automatique de la langue

✅ **Codes internes** : Utilisation de codes indépendants de la langue (v2.0)

✅ **Authentification requise** : L'utilisateur doit être connecté pour soumettre

✅ **Quota intelligent** : Maximum 2 soumissions par utilisateur/email par 24h

✅ **Géolocalisation** : Détection automatique du lieu de départ

✅ **Validation double** : Frontend (Zod) + Backend (Edge Function)

✅ **Recherche de villes avancée** : Base de données de 500+ villes avec normalisation des accents

---

## **🆕 CHANGEMENTS MAJEURS V2.0**

### **1. Codes internes indépendants de la langue**

**Avant (v1.0)** : Stockage des labels traduits
```json
{
  "travelGroup": "En famille",
  "hasDestination": "Oui",
  "datesType": "Dates précises"
}
```

**Maintenant (v2.0)** : Stockage de codes internes
```json
{
  "travelGroup": "family",
  "hasDestination": "yes",
  "datesType": "fixed"
}
```

### **2. Nouveau champ `helpWith` avec codes**

Remplace l'ancienne approche avec des labels traduits.

```json
{
  "helpWith": ["flights", "accommodation", "activities"]
}
```

### **3. Nouveaux champs de préférences de rythme**

- `rhythm` : Type de rythme de voyage (`relaxed`, `balanced`, `intense`)
- `schedulePrefs` : Préférences horaires sous forme de codes
  - `early_bird` : Lève-tôt
  - `night_owl` : Couche-tard
  - `needs_siesta` : Besoin de siestes
  - `needs_breaks` : Besoin de pauses
  - `needs_free_time` : Besoin de temps libre
  - `flexible_schedule` : Horaires flexibles

### **4. Suppression du champ `biorhythm`**

Remplacé par `schedulePrefs` qui est plus précis et structuré.

### **5. Nouveau système de voyageurs unifié**

Utilisation du champ `travelers` pour gérer adultes et enfants ensemble.

```json
{
  "travelers": [
    { "type": "adult" },
    { "type": "adult" },
    { "type": "child", "age": 8 },
    { "type": "child", "age": 12 }
  ]
}
```

Le champ `children` est conservé pour compatibilité mais déprécié.

### **6. Amélioration de la recherche de villes**

- Normalisation des accents (Paris trouvé avec "par", "paris", "París")
- Base de données enrichie (France : 33 villes, Espagne : 28 villes)
- Priorisation intelligente (Paris toujours en premier)
- Affichage des drapeaux emoji

---

## **🔑 CODES INTERNES VS LABELS TRADUITS**

Le questionnaire utilise désormais des **codes internes** indépendants de la langue pour garantir la cohérence des données.

### **Mapping des codes**

#### **Travel Groups**
| Code interne | Label FR | Label EN |
|-------------|----------|----------|
| `solo` | Solo | Solo |
| `duo` | En duo | Duo |
| `family` | En famille | Family |
| `group35` | Groupe (3-5 personnes) | Group (3-5 people) |

#### **Yes/No**
| Code interne | Label FR | Label EN |
|-------------|----------|----------|
| `yes` | Oui | Yes |
| `no` | Non | No |

#### **Dates Type**
| Code interne | Label FR | Label EN |
|-------------|----------|----------|
| `fixed` | Dates précises | Fixed dates |
| `flexible` | Dates flexibles | Flexible dates |

#### **Help With** (Services)
| Code interne | Label FR | Label EN |
|-------------|----------|----------|
| `flights` | Vols | Flights |
| `accommodation` | Hébergement | Accommodation |
| `activities` | Activités | Activities |

#### **Rhythm**
| Code interne | Label FR | Label EN |
|-------------|----------|----------|
| `relaxed` | Tranquille | Relaxed |
| `balanced` | Équilibré | Balanced |
| `intense` | Intense | Intense |

#### **Schedule Preferences**
| Code interne | Label FR | Label EN |
|-------------|----------|----------|
| `early_bird` | Lève-tôt 🌅 | Early bird 🌅 |
| `night_owl` | Couche-tard 🌙 | Night owl 🌙 |
| `needs_siesta` | Besoin de siestes 😴 | Needs siesta 😴 |
| `needs_breaks` | Besoin de pauses régulières ☕ | Needs regular breaks ☕ |
| `needs_free_time` | Besoin de temps libre 🕐 | Needs free time 🕐 |
| `flexible_schedule` | Horaires flexibles ⏰ | Flexible schedule ⏰ |

### **Fonctions de normalisation**

Le système utilise des fonctions de normalisation pour convertir automatiquement les labels traduits en codes :

```typescript
normalizeTravelGroup('En famille') → 'family'
normalizeYesNo('Oui') → 'yes'
normalizeDatesType('Dates précises') → 'fixed'
```

---

## **🔀 LOGIQUE CONDITIONNELLE ET BRANCHES**

Le questionnaire suit une **logique en arbre** où certaines questions ne s'affichent que si des conditions sont remplies.

### **Questions toujours affichées (tronc commun)**

Ces questions apparaissent **systématiquement** pour tous les utilisateurs :

1. **Qui voyage ?** (Solo, Duo, Famille, Groupe)
2. **Destination en tête ?** (Oui, Non)
3. **Comment Travliaq peut aider ?** (Vols, Hébergement, Activités)
4. **Type de dates** (Précises, Flexibles)
5. **Budget** (Économique, Modéré, Confortable, Luxe)
6. **Mobilité sur place** (Transports en commun, Voiture, Vélo…)
7. **Contraintes diverses** (Allergies, Végétarien, Santé…)
8. **Zone ouverte** (Informations additionnelles en texte libre)
9. **Récapitulatif & Email** (Vérification et soumission)

### **Branches conditionnelles principales**

Le questionnaire se divise en **5 grandes branches conditionnelles** :

### **🌳 BRANCHE 1 : Détails du groupe**

**Condition d'affichage** : Si `travel_group` = `family` OU `group35`

**Questions supplémentaires** :
- **Nombre exact de voyageurs** (champ numérique)
- **Si Famille** : Détails des enfants avec leurs âges

**Impact sur la suite** : Détermine le nombre de bagages à gérer

---

### **🌳 BRANCHE 2 : Définition de la destination**

**Condition d'affichage** : Si `has_destination` = `no`

**Questions supplémentaires** (4 questions) :
1. **Climat préféré** (Chaud, Tropical, Tempéré, Frais, Montagne)
2. **Affinités de voyage** (max 5 sélections parmi 15 options)
3. **Ambiance recherchée** (Animée et urbaine, Calme et nature, Mix des deux)
4. **Ville de départ** (avec géolocalisation possible)

**Si `has_destination` = `yes`** :
- Question unique : **Quelle destination ?** (recherche avec 500+ villes, normalisation des accents)

---

### **🌳 BRANCHE 3 : Dates et durée**

**Condition d'affichage** : Selon `dates_type`

**Si dates_type = `fixed`** :
- **Sélecteur de dates** (date de départ + date de retour avec calendrier visuel)

**Si dates_type = `flexible`** :
1. **Flexibilité** (±1 jour, ±2-3 jours, ±1 semaine, Totalement flexible)
2. **Date de départ approximative** (Oui/Non)
3. **Si Oui** : Sélecteur de date approximative
4. **Durée du séjour** (Week-end, 1 semaine, 10 jours, 2 semaines, Plus de 2 semaines)
5. **Si "Plus de 2 semaines"** : Champ numérique pour le nombre exact de nuits

---

### **🌳 BRANCHE 4 : Services sélectionnés** (la plus complexe)

**Condition d'affichage** : Selon les choix dans `helpWith` (tableau de codes)

### **4A. Si `flights` dans helpWith** ✈️

**Questions supplémentaires** (2 questions) :
1. **Préférence de vol** (Direct uniquement, 1 escale max, Peu importe)
2. **Bagages par voyageur** (Cabine uniquement, 1 bagage soute, 2 bagages, 3+)

### **4B. Si `accommodation` dans helpWith** 🏨

**Questions supplémentaires** (5 questions) :
1. **Type d'hébergement** (Hôtel, Appartement, Auberge, Chambre d'hôtes, Resort, Éco-lodge, Camping)
2. **Si "Hôtel" sélectionné** : Préférences hôtel (Full-inclusif, Demi-pension, Petit-déjeuner, Rien)
3. **Confort minimum** (Peu importe, 7.5+, 8.0+, 8.5+)
4. **Type de quartier** (Calme, Centre-ville animé, Bord de mer, Peu importe)
5. **Équipements souhaités** (WiFi, Clim, Piscine, Cuisine, Spa, Parking…)

### **4C. Si `activities` dans helpWith** 🎯

**Questions supplémentaires** (3 questions) :
1. **Si destination précise** : Style de voyage (Culture, Gastronomie, Nature, Plages, Aventure…)
2. **Rythme du voyage** (Tranquille, Équilibré, Intense) → Code interne: `relaxed`, `balanced`, `intense`
3. **Préférences horaires** (Lève-tôt, Couche-tard, Besoin de siestes…) → Codes internes

### **4D. Si `accommodation` OU `activities` dans helpWith** 🔐

**Question supplémentaire** (1 question) :
- **Sécurité & Phobies** (Éviter foules, Éviter hauteurs, Peur avion, Mobilité réduite…)

---

### **🌳 BRANCHE 5 : Budget détaillé**

**Condition d'affichage** : Si `budget_type` contient "précis" ou "precise"

**Questions supplémentaires** (2 questions) :
1. **Montant exact** (champ numérique)
2. **Devise** (EUR, USD, GBP, CHF, CAD, AUD)

**Si budget_type = "Estimation par jour"** : Aucune question supplémentaire

---

## **🌲 ARBRE DE DÉCISION COMPLET**

Voici l'arbre de décision complet du questionnaire v2.0 :

```
START
  │
  ├─ 1. Qui voyage ? ────────────────────┐
  │    • solo                             │
  │    • duo                              │
  │    • family ───────────────┐          │
  │    • group35 ──────────┐   │          │
  │                        │   │          │
  │    ┌───────────────────┴───┘          │
  │    │ 1b. Nombre exact                 │
  │    └──────────────────────────────────┐
  │                                       │
  │    ┌──────────────────────────────────┘
  │    │ 1c. Détails enfants (âges)
  │    │     (si family)
  │    └──────────────────────────────────┐
  │                                       │
  ├─ 2. Destination en tête ? ────────────┤
  │    • yes ───────────────┐             │
  │    • no ────────────┐   │             │
  │                     │   │             │
  │    ┌────────────────┘   │             │
  │    │ 2c. Quelle         │             │
  │    │     destination ?  │             │
  │    │     (recherche     │             │
  │    │      500+ villes)  │             │
  │    └────────────────┐   │             │
  │                     │   │             │
  │    ┌────────────────┘   │             │
  │    │ 2d. Climat         │             │
  │    │ 2e. Affinités      │             │
  │    │ 2f. Ambiance       │             │
  │    │ 2g. Ville départ   │             │
  │    └────────────────────┘             │
  │                                       │
  ├─ 2b. Comment Travliaq peut aider ? ───┤
  │    □ flights ──────────┐              │
  │    □ accommodation ─┐  │              │
  │    □ activities ─┐  │  │              │
  │                  │  │  │              │
  │    ┌─────────────┘  │  │              │
  │    │ activities ✓   │  │              │
  │    │ ↓              │  │              │
  │    │ 6. Style       │  │              │
  │    │    (si dest    │  │              │
  │    │     précise)   │  │              │
  │    │ 16. Rythme     │  │              │
  │    │     (relaxed/  │  │              │
  │    │      balanced/ │  │              │
  │    │      intense)  │  │              │
  │    │ 16b. Préf.     │  │              │
  │    │      horaires  │  │              │
  │    └────────────────┘  │              │
  │                        │              │
  │    ┌───────────────────┘              │
  │    │ flights ✓                        │
  │    │ ↓                                │
  │    │ 8. Préférence vol                │
  │    │ 9. Bagages                       │
  │    └──────────────────────────────────┤
  │                                       │
  │    ┌───────────────────────────────┐  │
  │    │ accommodation ✓               │  │
  │    │ ↓                             │  │
  │    │ 11. Type hébergement          │  │
  │    │ 11b. Préférences hôtel        │  │
  │    │      (si "Hôtel" sélectionné) │  │
  │    │ 12. Confort                   │  │
  │    │ 13. Quartier                  │  │
  │    │ 14. Équipements               │  │
  │    └───────────────────────────────┘  │
  │                                       │
  │    ┌───────────────────────────────┐  │
  │    │ accommodation OU activities ✓ │  │
  │    │ ↓                             │  │
  │    │ 15. Sécurité & Phobies        │  │
  │    └───────────────────────────────┘  │
  │                                       │
  ├─ 10. Mobilité sur place ──────────────┤
  │                                       │
  ├─ 3. Type de dates ─────────────────┐  │
  │    • fixed ────────────────────┐   │  │
  │    • flexible ─────────────┐   │   │  │
  │                            │   │   │  │
  │    ┌───────────────────────┘   │   │  │
  │    │ 3b. Sélecteur dates       │   │  │
  │    │     (range picker)        │   │  │
  │    └───────────────────────────┘   │  │
  │                                    │  │
  │    ┌────────────────────────────────┘  │
  │    │ 3c. Flexibilité                   │
  │    │ 3d. Date approx ? (yes/no) ──┐    │
  │    │                               │    │
  │    │ ┌─────────────────────────────┘    │
  │    │ │ 3e. Sélecteur date approx        │
  │    │ └─────────────────────────────┐    │
  │    │                               │    │
  │    │ 4. Durée ──────────────────┐  │    │
  │    │                            │  │    │
  │    │ ┌──────────────────────────┘  │    │
  │    │ │ Si "Plus de 14 jours"       │    │
  │    │ │ ↓                           │    │
  │    │ │ 4b. Nombre exact de nuits   │    │
  │    │ └─────────────────────────────┘    │
  │    └────────────────────────────────────┤
  │                                         │
  ├─ 5. Budget ─────────────────────────┐   │
  │    • Économique                     │   │
  │    • Modéré                         │   │
  │    • Confortable                    │   │
  │    • Haut de gamme                  │   │
  │    • Luxe                           │   │
  │                                     │   │
  │    Type ? ───────────────────────┐  │   │
  │    • Estimation par jour         │  │   │
  │    • Budget total précis ────┐   │  │   │
  │                              │   │  │   │
  │    ┌──────────────────────────┘   │  │   │
  │    │ 5b. Montant exact            │  │   │
  │    │ 5c. Devise                   │  │   │
  │    └──────────────────────────────┘  │   │
  │                                     │   │
  ├─ 17. Contraintes ───────────────────┤   │
  │                                     │   │
  ├─ 18. Zone ouverte ──────────────────┤   │
  │                                     │   │
  └─ 19. Récapitulatif & Email ─────────┘   │
                                            │
                                           END
```

---

## **📊 DESCRIPTION DÉTAILLÉE DES CHAMPS**

### **Section 1 : INFORMATIONS DE BASE** (automatiques)

### **user_id** 🆔

- **Type** : UUID
- **Obligatoire** : Oui
- **Généré automatiquement** : Via JWT d'authentification
- **À quoi ça sert** : Associer la réponse à l'utilisateur connecté
- **Stockage** : Base de données Supabase

### **email** ✉️

- **Type** : String (max 255 caractères)
- **Obligatoire** : Oui
- **Question** : "Votre email pour recevoir vos recommandations"
- **À quoi ça sert** : Envoyer les recommandations de voyage personnalisées
- **Validation** : Format email valide

### **language** 🌍

- **Type** : Enum (`'fr'` | `'en'`)
- **Obligatoire** : Oui
- **Généré automatiquement** : Détecté via i18n.language
- **À quoi ça sert** : Savoir dans quelle langue l'utilisateur a répondu (pour personnaliser l'email)
- **Valeurs** :
    - `'fr'` : Questionnaire rempli en français
    - `'en'` : Questionnaire rempli en anglais

---

### **Section 2 : PROFIL VOYAGEUR**

### **travel_group** 👥

- **Type** : String (code interne)
- **Question** : "Qui voyage ?"
- **À quoi ça sert** : Déterminer le profil du groupe et adapter les questions suivantes
- **Impact** : Déclenche des questions sur le nombre exact de voyageurs et les enfants
- **Valeurs possibles** (codes internes) :
    - `"solo"` : Voyage en solo (1 personne)
    - `"duo"` : Voyage à deux (couple ou amis)
    - `"family"` : Voyage en famille → Déclenche questions enfants
    - `"group35"` : Groupe (3-5 personnes) → Déclenche question nombre exact

### **number_of_travelers** 🔢

- **Type** : Integer (1-50)
- **Question** : "Combien de personnes exactement ?"
- **Affiché si** : `travel_group` = `"family"` OU `"group35"`
- **À quoi ça sert** : Connaître le nombre exact pour calculer les prix et les besoins en bagages
- **Impact** : Détermine le nombre de voyageurs pour la question des bagages

### **travelers** 👨‍👩‍👧‍👦 (NOUVEAU v2.0)

- **Type** : Array d'objets `[{ type: 'adult' | 'child', age?: number }]`
- **Question** : Détails des voyageurs (step intégré)
- **Affiché si** : `travel_group` = `"family"` OU `"group35"`
- **À quoi ça sert** : Système unifié pour gérer adultes et enfants
- **Exemple** :
```json
[
  { "type": "adult" },
  { "type": "adult" },
  { "type": "child", "age": 8 },
  { "type": "child", "age": 12 }
]
```

### **children** 👶 (DÉPRÉCIÉ)

- **Type** : Array d'objets `[{ age: number }]`
- **Question** : "Quel est l'âge de vos enfants ?"
- **Affiché si** : `travel_group` = `"family"`
- **À quoi ça sert** : Maintenu pour compatibilité, mais remplacé par `travelers`
- **Contraintes** : Âge entre 0 et 17 ans

---

### **Section 3 : DESTINATION**

### **has_destination** 🌍

- **Type** : String (code interne)
- **Question** : "Avez-vous déjà une destination en tête ?"
- **À quoi ça sert** : Point de bifurcation principal
- **Impact** : Déclenche 1 question (yes) ou 4 questions (no)
- **Valeurs possibles** (codes internes) :
    - `"yes"` → Question : "Quelle destination ?"
    - `"no"` → Questions : Climat, Affinités, Ambiance, Ville de départ

### **destination** 📍

- **Type** : String (max 200 caractères)
- **Question** : "Quelle destination ?"
- **Affiché si** : `has_destination` = `"yes"`
- **À quoi ça sert** : Destination précise souhaitée par l'utilisateur
- **Format** : "Ville, Pays 🇫🇷" (avec emoji drapeau)
- **Recherche** : 500+ villes avec normalisation des accents
  - "par" → trouve "Paris"
  - "seville" → trouve "Séville"
  - Paris toujours en priorité
- **Exemple** : `"Tokyo, Japon 🇯🇵"`, `"Bali, Indonésie 🇮🇩"`

### **departure_location** 🛫

- **Type** : String (max 200 caractères)
- **Question** : "D'où partez-vous ?"
- **Affiché si** : `has_destination` = `"no"`
- **À quoi ça sert** : Calculer les temps de vol et proposer des destinations accessibles
- **Fonctionnalité** : Géolocalisation automatique possible (bouton GPS)
- **Exemple** : `"Paris, France 🇫🇷"`, `"Bruxelles, Belgique 🇧🇪"`

### **climate_preference** 🌤️

- **Type** : Array de strings
- **Question** : "Quel climat préférez-vous ?"
- **Affiché si** : `has_destination` = `"no"`
- **À quoi ça sert** : Filtrer les destinations selon les préférences météo
- **Sélection multiple** : Oui
- **Valeurs possibles** : (labels traduits, pas de codes internes)
    - `"Chaud et ensoleillé ☀️"` (> 25°C)
    - `"Tropical 🌴"` (chaud + humide)
    - `"Tempéré 🌤️"` (15-25°C)
    - `"Frais et sec ❄️"` (< 15°C)
    - `"Montagne ⛰️"` (altitude)
    - `"Peu importe 🌍"` (aucune préférence)

### **travel_affinities** ❤️

- **Type** : Array de strings (max 5 sélections)
- **Question** : "Qu'est-ce qui vous attire dans un voyage ?"
- **Affiché si** : `has_destination` = `"no"`
- **À quoi ça sert** : Comprendre les centres d'intérêt
- **Maximum** : 5 sélections
- **Valeurs possibles** (15 options - labels traduits) :
    - Culture & Histoire, Gastronomie, Nature & Paysages, Plages & Détente, Aventure & Sports, Shopping, Vie nocturne, Spiritualité, Art & Design, Famille & Enfants, Photographie, Rencontres & Échanges, Yoga & Bien-être, Écotourisme, Luxe & Confort

### **travel_ambiance** 🎭

- **Type** : String
- **Question** : "Quelle ambiance recherchez-vous ?"
- **Affiché si** : `has_destination` = `"no"`
- **À quoi ça sert** : Affiner le type de destination
- **Valeurs possibles** : (labels traduits)
    - Animée et urbaine, Calme et nature, Mix des deux

---

### **Section 4 : SERVICES SOUHAITÉS** (NOUVEAU v2.0)

### **help_with** 🆘

- **Type** : Array de strings (codes internes)
- **Question** : "Comment Travliaq peut vous aider ?"
- **À quoi ça sert** : **POINT CENTRAL** qui détermine quelles sections afficher
- **Valeurs possibles** (codes internes) :
    - `"flights"` → Affiche questions 8-9 (vol + bagages)
    - `"accommodation"` → Affiche questions 11-14 (type, confort, quartier, équipements)
    - `"activities"` → Affiche questions 6, 16 (style, rythme, préférences horaires)
- **Impact majeur** : Fait varier le nombre d'étapes de 10 à 22+
- **Sélection multiple** : Oui
- **Exemple** :
```json
{
  "help_with": ["flights", "accommodation", "activities"]
}
```

---

### **Section 5 : DATES ET DURÉE**

### **dates_type** 📅

- **Type** : String (code interne)
- **Question** : "Comment sont vos dates ?"
- **À quoi ça sert** : Déterminer le niveau de flexibilité
- **Impact** : Déclenche des questions différentes
- **Valeurs possibles** (codes internes) :
    - `"fixed"` → Affiche sélecteur de dates (départ + retour)
    - `"flexible"` → Affiche 4-5 questions sur la flexibilité et la durée

### **departure_date** 🛫

- **Type** : Date (format ISO: YYYY-MM-DD)
- **Question** : "Date de départ"
- **Affiché si** : `dates_type` = `"fixed"`
- **À quoi ça sert** : Date de départ exacte
- **Format** : Sélecteur de calendrier visuel (DateRangePicker)
- **Exemple** : `"2025-07-15"`

### **return_date** 🛬

- **Type** : Date (format ISO: YYYY-MM-DD)
- **Question** : "Date de retour"
- **Affiché si** : `dates_type` = `"fixed"`
- **À quoi ça sert** : Date de retour exacte
- **Validation** : Doit être >= departure_date
- **Exemple** : `"2025-07-29"`

### **flexibility** 🔄

- **Type** : String
- **Question** : "Quelle flexibilité sur les dates ?"
- **Affiché si** : `dates_type` = `"flexible"`
- **À quoi ça sert** : Comprendre la marge de manœuvre
- **Valeurs possibles** : (labels traduits)
    - ±1 jour, ±2-3 jours, ±1 semaine, Totalement flexible

### **has_approximate_departure_date** 📆

- **Type** : String (code interne: `"yes"` | `"no"`)
- **Question** : "Avez-vous une période approximative de départ ?"
- **Affiché si** : `dates_type` = `"flexible"`
- **À quoi ça sert** : Savoir si on doit afficher un date picker
- **Impact** : Si `"yes"` → Affiche question suivante

### **approximate_departure_date** 📅

- **Type** : Date (format ISO: YYYY-MM-DD)
- **Question** : "Quelle période approximativement ?"
- **Affiché si** : `has_approximate_departure_date` = `"yes"`
- **À quoi ça sert** : Date approximative pour orienter la recherche
- **Exemple** : `"2025-09-01"`

### **duration** ⏱️

- **Type** : String
- **Question** : "Durée souhaitée du séjour"
- **Affiché si** : `dates_type` = `"flexible"`
- **À quoi ça sert** : Nombre de jours/semaines souhaités
- **Impact** : Si contient "Plus de" ou "more" → Affiche question suivante
- **Valeurs possibles** : (labels traduits)
    - Week-end (2-3 jours), 1 semaine (4-7 jours), 10 jours, 2 semaines, Plus de 2 semaines

### **exact_nights** 🌙

- **Type** : Integer (1-365)
- **Question** : "Combien de nuits exactement ?"
- **Affiché si** : `duration` contient "Plus de 14" ou "more"
- **À quoi ça sert** : Nombre précis de nuits pour longs séjours
- **Exemple** : `21` (3 semaines), `30` (1 mois)

---

### **Section 6 : BUDGET**

### **budget** 💰

- **Type** : String
- **Question** : "Quel est votre budget ?"
- **À quoi ça sert** : Catégorie de budget pour filtrer les recommandations
- **Valeurs possibles** : (labels traduits)
    - Économique (< 50€/jour), Modéré (50-100€/jour), Confortable (100-200€/jour), Haut de gamme (> 200€/jour), Luxe (> 500€/jour)

### **budget_type** 💵

- **Type** : String
- **Question** : "Comment définissez-vous votre budget ?"
- **À quoi ça sert** : Savoir si le budget est une estimation ou un montant précis
- **Impact** : Si contient "précis" ou "precise" → Affiche 2 questions suivantes
- **Valeurs possibles** : (labels traduits)
    - Estimation par jour, Budget total précis

### **budget_amount** 💶

- **Type** : Number (0-10,000,000)
- **Question** : "Quel est le montant de votre budget ?"
- **Affiché si** : `budget_type` contient "précis" ou "precise"
- **À quoi ça sert** : Montant total disponible
- **Exemple** : `3000`, `8000`, `15000`

### **budget_currency** 💱

- **Type** : String
- **Question** : "Devise"
- **Affiché si** : `budget_type` contient "précis" ou "precise"
- **À quoi ça sert** : Convertir le budget dans la devise appropriée
- **Valeurs possibles** :
    - `"EUR"`, `"USD"`, `"GBP"`, `"CHF"`, `"CAD"`, `"AUD"`

---

### **Section 7 : STYLE ET RYTHME** (si activities dans helpWith)

### **styles** 🎨

- **Type** : Array de strings
- **Question** : "Quel style de voyage vous attire ?"
- **Affiché si** : `has_destination` = `"yes"` ET `"activities"` dans `help_with`
- **À quoi ça sert** : Affiner les activités recommandées
- **Sélection multiple** : Oui
- **Valeurs possibles** : (labels traduits)
    - Culturel, Gastronomique, Nature, Plages, Aventure, Shopping, Vie nocturne

### **rhythm** 🏃 (NOUVEAU v2.0)

- **Type** : String (code interne)
- **Question** : "Quel rythme pour votre voyage ?"
- **Affiché si** : `"activities"` dans `help_with`
- **À quoi ça sert** : Déterminer la densité des activités proposées
- **Valeurs possibles** (codes internes) :
    - `"relaxed"` : Tranquille (1-2 activités/jour)
    - `"balanced"` : Équilibré (2-3 activités/jour)
    - `"intense"` : Intense (4+ activités/jour)

### **schedule_prefs** ⏰ (NOUVEAU v2.0)

- **Type** : Array de strings (codes internes)
- **Question** : "Vos préférences horaires"
- **Affiché si** : `"activities"` dans `help_with`
- **À quoi ça sert** : Adapter les horaires des activités
- **Sélection multiple** : Oui (max 6)
- **Valeurs possibles** (codes internes) :
    - `"early_bird"` : Lève-tôt 🌅
    - `"night_owl"` : Couche-tard 🌙
    - `"needs_siesta"` : Besoin de siestes 😴
    - `"needs_breaks"` : Besoin de pauses régulières ☕
    - `"needs_free_time"` : Besoin de temps libre 🕐
    - `"flexible_schedule"` : Horaires flexibles ⏰

---

### **Section 8 : TRANSPORT** (si flights dans helpWith)

### **flight_preference** ✈️

- **Type** : String
- **Question** : "Préférence pour les vols"
- **Affiché si** : `"flights"` dans `help_with`
- **À quoi ça sert** : Critères de recherche de vols
- **Valeurs possibles** : (labels traduits)
    - Vol direct uniquement, 1 escale maximum, Peu importe (le moins cher)

### **luggage** 🧳

- **Type** : Object `{ "0": "type", "1": "type", ... }`
- **Question** : "Bagages pour chaque voyageur"
- **Affiché si** : `"flights"` dans `help_with`
- **À quoi ça sert** : Calculer les frais de bagages
- **Format** : Clé = index du voyageur, Valeur = type de bagage
- **Valeurs possibles** : (labels traduits)
    - Bagage cabine uniquement, 1 bagage en soute, 2 bagages en soute, 3+ bagages en soute
- **Exemple** :
```json
{
  "0": "1 bagage en soute",
  "1": "Bagage cabine uniquement"
}
```

### **mobility** 🚗

- **Type** : Array de strings
- **Question** : "Comment vous déplacerez-vous sur place ?"
- **À quoi ça sert** : Recommandations sur les transports locaux
- **Sélection multiple** : Oui
- **Valeurs possibles** : (labels traduits avec emoji)
    - Transports en commun 🚇, Marche à pied 🚶, Vélo 🚴, Voiture de location 🚗, Taxi/VTC 🚕, Train 🚄, Moto/Scooter 🏍️

---

### **Section 9 : HÉBERGEMENT** (si accommodation dans helpWith)

### **accommodation_type** 🏨

- **Type** : Array de strings
- **Question** : "Type d'hébergement préféré"
- **Affiché si** : `"accommodation"` dans `help_with`
- **À quoi ça sert** : Filtrer les hébergements disponibles
- **Impact** : Si contient "Hôtel" ou "Hotel" → Affiche question préférences hôtel
- **Sélection multiple** : Oui
- **Valeurs possibles** : (labels traduits)
    - Hôtel 🏨, Appartement/Airbnb 🏠, Auberge de jeunesse 🎒, Chambre d'hôtes 🏡, Resort/Club 🌴, Éco-lodge 🌿, Camping ⛺

### **hotel_preferences** 🏨 (NOUVEAU v2.0)

- **Type** : Array de strings
- **Question** : "Préférences pour l'hôtel"
- **Affiché si** : "Hôtel" dans `accommodation_type`
- **À quoi ça sert** : Options de pension
- **Sélection multiple** : Oui
- **Valeurs possibles** : (labels traduits)
    - Full-inclusif (all-inclusive), Demi-pension (petit-déjeuner + dîner), Petit-déjeuner uniquement, Rien (je gère mes repas)

### **comfort** 🛏️

- **Type** : String
- **Question** : "Niveau de confort minimum"
- **Affiché si** : `"accommodation"` dans `help_with`
- **À quoi ça sert** : Filtrer par standing (rating)
- **Valeurs possibles** : (labels traduits)
    - Peu importe, Note 7.5+, Note 8.0+, Note 8.5+

### **neighborhood** 🏘️

- **Type** : String
- **Question** : "Type de quartier recherché"
- **Affiché si** : `"accommodation"` dans `help_with`
- **À quoi ça sert** : Emplacement géographique souhaité
- **Valeurs possibles** : (labels traduits)
    - Calme et résidentiel, Centre-ville animé, Bord de mer/nature, Peu importe

### **amenities** 🎯

- **Type** : Array de strings
- **Question** : "Équipements souhaités"
- **Affiché si** : `"accommodation"` dans `help_with`
- **À quoi ça sert** : Filtrer par équipements
- **Sélection multiple** : Oui (max 50)
- **Valeurs possibles** : (labels traduits avec emoji)
    - Peu importe 🤷, WiFi fiable 📶, Climatisation ❄️, Cuisine équipée 🍳, Lave-linge 🧺, Parking 🅿️, Ascenseur 🛗, Réception 24h 🔔, Lit bébé 👶, Chambre familiale 👨‍👩‍👧‍👦, Piscine 🏊, Salle de sport 💪, Spa 🧖, Jardin/Terrasse 🌳

---

### **Section 10 : CONTRAINTES ET SÉCURITÉ**

### **security** 🔐

- **Type** : Array de strings
- **Question** : "Contraintes de sécurité ou phobies"
- **Affiché si** : `"accommodation"` OU `"activities"` dans `help_with`
- **À quoi ça sert** : Éviter certaines situations/lieux
- **Sélection multiple** : Oui (max 20)
- **Valeurs possibles** : (labels traduits avec emoji)
    - Éviter foule/espaces bondés 👥, Éviter hauteurs 🏔️, Peur de l'avion ✈️, Peur de l'eau/mer 🌊, Problèmes de mobilité réduite ♿, Éviter zones dangereuses 🚨, Peur des insectes/animaux 🦟

### **constraints** 🚫

- **Type** : Array de strings
- **Question** : "Contraintes diverses"
- **À quoi ça sert** : Contraintes alimentaires, religieuses, médicales
- **Sélection multiple** : Oui (max 50)
- **Valeurs possibles** : (labels traduits avec emoji)
    - Peu importe 🤷, Halal 🥙, Casher ✡️, Végétarien 🥗, Végan 🌱, Sans gluten 🌾, Pas de porc 🚫🥓, Pas d'alcool 🚫🍷, Lieux de prière 🛐, Traditions bouddhistes ☸️, Accessibilité ♿, Safe zones 🛡️, Éviter voiture 🚫🚗, Traditions locales 🕊️, Allergies alimentaires ⚠️

---

### **Section 11 : INFORMATIONS COMPLÉMENTAIRES**

### **additional_info** 📝

- **Type** : String (max 2000 caractères)
- **Question** : "Informations complémentaires"
- **À quoi ça sert** : Zone de texte libre pour toute information non couverte
- **Exemple** :
    - "Premier voyage au Japon, besoin d'accompagnement pour la langue"
    - "Nous aimerions célébrer notre anniversaire pendant ce voyage"

---

## **🛤️ EXEMPLES DE PARCOURS COMPLETS**

### **Parcours 1 : Famille avec enfants, destination précise, tout géré** 👨‍👩‍👧‍👦

**Profil** : Famille de 4 personnes (2 adultes + 2 enfants) souhaitant aller au Japon avec aide complète

**Questions posées** : ~20 étapes

```
1. Qui voyage ? → "family"
  1b. Système de voyageurs → 2 adultes + 2 enfants (8 et 12 ans)

2. Destination en tête ? → "yes"
  2c. Quelle destination ? → "Tokyo, Japon 🇯🇵"

2b. Comment Travliaq peut aider ? → ["flights", "accommodation", "activities"]

6. Style de voyage → ["Culturel", "Gastronomique", "Nature"]
16. Rythme → "balanced"
16b. Préférences horaires → ["early_bird", "needs_breaks"]

3. Type de dates → "fixed"
  3b. Dates → Départ: 2025-07-15, Retour: 2025-07-29

5. Budget → "Confortable (100-200€/jour)"
  Budget type → "Budget total précis"
  5b. Montant → 8000
  5c. Devise → "EUR"

8. Préférence vol → "1 escale maximum"
9. Bagages → {"0": "1 bagage soute", "1": "1 bagage soute", "2": "Cabine", "3": "Cabine"}

10. Mobilité → ["Transports en commun", "Marche", "Train"]

11. Type hébergement → ["Hôtel", "Appartement/Airbnb"]
  11b. Préférences hôtel → ["Petit-déjeuner uniquement"]
12. Confort → "Note 7.5+"
13. Quartier → "Calme et résidentiel"
14. Équipements → ["WiFi", "Climatisation", "Cuisine équipée", "Lave-linge"]

15. Sécurité → ["Éviter foule/espaces bondés"]

17. Contraintes → ["Allergies alimentaires", "Végétarien"]
18. Zone ouverte → "Premier voyage au Japon en famille. Un enfant est végétarien."
19. Récapitulatif & Email → jean.dupont@example.com
```

**JSON de sortie** :
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jean.dupont@example.com",
  "language": "fr",
  "travel_group": "family",
  "number_of_travelers": 4,
  "travelers": [
    { "type": "adult" },
    { "type": "adult" },
    { "type": "child", "age": 8 },
    { "type": "child", "age": 12 }
  ],
  "has_destination": "yes",
  "destination": "Tokyo, Japon 🇯🇵",
  "help_with": ["flights", "accommodation", "activities"],
  "dates_type": "fixed",
  "departure_date": "2025-07-15",
  "return_date": "2025-07-29",
  "budget": "Confortable (100-200€/jour)",
  "budget_type": "Budget total précis",
  "budget_amount": 8000,
  "budget_currency": "EUR",
  "styles": ["Culturel", "Gastronomique", "Nature"],
  "rhythm": "balanced",
  "schedule_prefs": ["early_bird", "needs_breaks"],
  "flight_preference": "1 escale maximum",
  "luggage": {
    "0": "1 bagage soute",
    "1": "1 bagage soute",
    "2": "Cabine",
    "3": "Cabine"
  },
  "mobility": ["Transports en commun", "Marche", "Train"],
  "accommodation_type": ["Hôtel", "Appartement/Airbnb"],
  "hotel_preferences": ["Petit-déjeuner uniquement"],
  "comfort": "Note 7.5+",
  "neighborhood": "Calme et résidentiel",
  "amenities": ["WiFi", "Climatisation", "Cuisine équipée", "Lave-linge"],
  "security": ["Éviter foule/espaces bondés"],
  "constraints": ["Allergies alimentaires", "Végétarien"],
  "additional_info": "Premier voyage au Japon en famille. Un enfant est végétarien."
}
```

---

### **Parcours 2 : Solo, destination flexible, juste activités** 🎒

**Profil** : Voyageur solo flexible, gère ses vols/hôtels, veut juste des recommandations d'activités

**Questions posées** : ~14 étapes

```
1. Qui voyage ? → "solo"

2. Destination en tête ? → "no"
  2d. Climat → ["Chaud et ensoleillé", "Tropical"]
  2e. Affinités → ["Plages & Détente", "Yoga & Bien-être", "Nature"]
  2f. Ambiance → "Mix des deux"
  2g. Ville de départ → "Bruxelles, Belgique 🇧🇪" (géolocalisé)

2b. Comment Travliaq peut aider ? → ["activities"]

16. Rythme → "relaxed"
16b. Préférences horaires → ["early_bird", "flexible_schedule"]

3. Type de dates → "flexible"
  3c. Flexibilité → "Totalement flexible"
  3d. Date approx ? → "yes"
  3e. Date approx → 2025-09-01
  4. Durée → "10 jours"

5. Budget → "Modéré (50-100€/jour)"

10. Mobilité → ["Transports en commun", "Marche", "Vélo"]

17. Contraintes → ["Végétarien"]
18. Zone ouverte → "Je cherche une destination calme pour me ressourcer."
19. Récapitulatif & Email → marie.martin@example.com
```

---

## **📦 STRUCTURE JSON DE SORTIE**

### **Champs toujours présents**

- `user_id` (UUID)
- `email` (string)
- `language` ('fr' | 'en')
- `created_at` (timestamp - généré automatiquement)
- `updated_at` (timestamp - généré automatiquement)

### **Champs conditionnels (peuvent être null)**

Tous les autres champs peuvent être `null` selon les réponses de l'utilisateur.

---

## **🔐 JSON SCHEMA**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Travliaq Questionnaire Response v2.0",
  "description": "Schema for questionnaire responses with internal codes",
  "type": "object",
  "required": ["user_id", "email", "language"],
  "properties": {
    "user_id": {
      "type": "string",
      "format": "uuid",
      "description": "User ID from authentication"
    },
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 255,
      "description": "User email for recommendations"
    },
    "language": {
      "type": "string",
      "enum": ["fr", "en"],
      "description": "Questionnaire language"
    },
    "travel_group": {
      "type": "string",
      "enum": ["solo", "duo", "family", "group35"],
      "description": "Type of travel group (internal code)"
    },
    "number_of_travelers": {
      "type": "integer",
      "minimum": 1,
      "maximum": 50,
      "description": "Exact number of travelers"
    },
    "travelers": {
      "type": "array",
      "description": "Unified system for adults and children",
      "items": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["adult", "child"]
          },
          "age": {
            "type": "integer",
            "minimum": 0,
            "maximum": 17,
            "description": "Age required for children"
          }
        }
      }
    },
    "children": {
      "type": "array",
      "description": "DEPRECATED: Use travelers instead",
      "items": {
        "type": "object",
        "required": ["age"],
        "properties": {
          "age": {
            "type": "integer",
            "minimum": 0,
            "maximum": 17
          }
        }
      }
    },
    "has_destination": {
      "type": "string",
      "enum": ["yes", "no"],
      "description": "Whether user has a destination in mind (internal code)"
    },
    "destination": {
      "type": "string",
      "maxLength": 200,
      "description": "Specific destination (City, Country 🇫🇷)"
    },
    "departure_location": {
      "type": "string",
      "maxLength": 200,
      "description": "Departure city"
    },
    "climate_preference": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Preferred climate types (translated labels)"
    },
    "travel_affinities": {
      "type": "array",
      "maxItems": 5,
      "items": {
        "type": "string"
      },
      "description": "Travel interests (max 5)"
    },
    "travel_ambiance": {
      "type": "string",
      "description": "Desired ambiance (translated label)"
    },
    "help_with": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["flights", "accommodation", "activities"]
      },
      "description": "Services needed (internal codes)"
    },
    "dates_type": {
      "type": "string",
      "enum": ["fixed", "flexible"],
      "description": "Date flexibility (internal code)"
    },
    "departure_date": {
      "type": "string",
      "format": "date",
      "description": "Departure date (YYYY-MM-DD)"
    },
    "return_date": {
      "type": "string",
      "format": "date",
      "description": "Return date (YYYY-MM-DD)"
    },
    "flexibility": {
      "type": "string",
      "description": "Date flexibility description (translated label)"
    },
    "has_approximate_departure_date": {
      "type": "string",
      "enum": ["yes", "no"],
      "description": "Whether user has approximate date (internal code)"
    },
    "approximate_departure_date": {
      "type": "string",
      "format": "date",
      "description": "Approximate departure date"
    },
    "duration": {
      "type": "string",
      "description": "Trip duration (translated label)"
    },
    "exact_nights": {
      "type": "integer",
      "minimum": 1,
      "maximum": 365,
      "description": "Exact number of nights for long trips"
    },
    "budget": {
      "type": "string",
      "description": "Budget category (translated label)"
    },
    "budget_type": {
      "type": "string",
      "description": "Budget type (translated label)"
    },
    "budget_amount": {
      "type": "number",
      "minimum": 0,
      "maximum": 10000000,
      "description": "Exact budget amount"
    },
    "budget_currency": {
      "type": "string",
      "enum": ["EUR", "USD", "GBP", "CHF", "CAD", "AUD"],
      "description": "Budget currency"
    },
    "styles": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Travel styles (translated labels)"
    },
    "rhythm": {
      "type": "string",
      "enum": ["relaxed", "balanced", "intense"],
      "description": "Trip rhythm (internal code)"
    },
    "schedule_prefs": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "early_bird",
          "night_owl",
          "needs_siesta",
          "needs_breaks",
          "needs_free_time",
          "flexible_schedule"
        ]
      },
      "description": "Schedule preferences (internal codes)"
    },
    "flight_preference": {
      "type": "string",
      "description": "Flight preference (translated label)"
    },
    "luggage": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      },
      "description": "Luggage per traveler (index: type)"
    },
    "mobility": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Local transportation (translated labels)"
    },
    "accommodation_type": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Accommodation types (translated labels)"
    },
    "hotel_preferences": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Hotel preferences (translated labels)"
    },
    "comfort": {
      "type": "string",
      "description": "Minimum comfort level (translated label)"
    },
    "neighborhood": {
      "type": "string",
      "description": "Neighborhood type (translated label)"
    },
    "amenities": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "string"
      },
      "description": "Desired amenities (translated labels)"
    },
    "security": {
      "type": "array",
      "maxItems": 20,
      "items": {
        "type": "string"
      },
      "description": "Security constraints (translated labels)"
    },
    "constraints": {
      "type": "array",
      "maxItems": 50,
      "items": {
        "type": "string"
      },
      "description": "Various constraints (translated labels)"
    },
    "additional_info": {
      "type": "string",
      "maxLength": 2000,
      "description": "Additional information (free text)"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Response creation timestamp"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time",
      "description": "Response update timestamp"
    }
  }
}
```

---

## **📊 UTILISATION DES DONNÉES**

### **Côté backend - Edge Function**

L'Edge Function `submit-questionnaire` :

✅ **Valide** toutes les données (email, ranges numériques, formats de dates)

✅ **Normalise** automatiquement les codes internes (v2.0)

✅ **Vérifie l'authentification** (JWT valide requis)

✅ **Rate limiting** : 3 requêtes/minute par IP

✅ **Quota** : 2 soumissions/utilisateur/email par 24h

✅ **Insère** les données dans `questionnaire_responses`

✅ **Retourne** l'ID de la réponse créée

### **Côté frontend - Traitement**

Une fois le questionnaire soumis :

1. **Enregistrement en base** via Edge Function
2. **Email automatique** à l'utilisateur avec son ID de réponse
3. **Traitement par l'équipe Travliaq** :
    - Lecture des préférences
    - Création d'un trip personnalisé
    - Envoi du trip par email

### **Utilisation future**

Les données peuvent servir à :

- **Recommandations automatiques** (algorithme IA)
- **Statistiques** (destinations populaires, budgets moyens)
- **Amélioration du questionnaire** (questions les plus abandonnées)
- **Segmentation marketing** (profils voyageurs)
- **Analyse multilingue** (comparaison FR vs EN)

---

## **💡 CONSEILS ET BONNES PRATIQUES**

### **Pour les développeurs**

✅ **Toujours utiliser les codes internes** pour les comparaisons (v2.0)

✅ **Ne jamais stocker les labels traduits** dans la base

✅ **Utiliser les fonctions de normalisation** (`normalizeTravelGroup`, etc.)

✅ **Toujours vérifier les conditions d'affichage** avant d'ajouter une nouvelle question

✅ **Utiliser getTotalSteps()** pour calculer dynamiquement le nombre d'étapes

✅ **Valider côté frontend ET backend** (double sécurité)

✅ **Logger les erreurs** pour debugging (Edge Function)

### **Pour les product managers**

✅ **Tester tous les parcours possibles** (au moins 5-6 parcours types)

✅ **Surveiller le taux d'abandon** par étape (analytics)

✅ **Optimiser les questions les plus abandonnées**

✅ **A/B tester** l'ordre des questions

✅ **Proposer des valeurs par défaut** pour accélérer le remplissage

✅ **Analyser les différences FR vs EN** pour optimiser les traductions

### **Pour les utilisateurs**

✅ **Être précis** dans les réponses (meilleure recommandation)

✅ **Ne pas hésiter à utiliser la zone ouverte** pour informations importantes

✅ **Activer la géolocalisation** pour détection automatique du lieu de départ

✅ **Sélectionner plusieurs affinités** (max 5) pour meilleure personnalisation

✅ **Utiliser la recherche de villes** même avec des accents manquants (Paris trouvé avec "par")

---

## **📚 RESSOURCES**

- **Code source** : `src/pages/Questionnaire.tsx`
- **Edge Function** : `supabase/functions/submit-questionnaire/index.ts`
- **Schema BDD** : Voir `questionnaire_responses` dans Supabase
- **Codes internes** : `src/lib/questionnaireValues.ts`
- **Validation** : Zod schema dans `Questionnaire.tsx`
- **Documentation technique** : `docs/QUESTIONNAIRE_JSON_SCHEMA.md`

---

## **📝 CHANGELOG**

### **Version 2.0.0** (19 janvier 2025)

✅ **BREAKING CHANGE** : Utilisation de codes internes indépendants de la langue

✅ Nouveau champ `help_with` avec codes (`flights`, `accommodation`, `activities`)

✅ Nouveau champ `rhythm` avec codes (`relaxed`, `balanced`, `intense`)

✅ Nouveau champ `schedule_prefs` avec codes (remplace `biorhythm`)

✅ Nouveau champ `travelers` (système unifié adultes + enfants)

✅ Amélioration recherche de villes (normalisation accents, 500+ villes)

✅ Correction bugs de sélection d'options

✅ Calcul dynamique des étapes amélioré

### **Version 1.1.0** (19 octobre 2025)

✅ Ajout du champ `language` (détection automatique FR/EN)

✅ Support multilingue complet

### **Version 1.0.0** (12 octobre 2025)

✅ Lancement initial du questionnaire dynamique

✅ 19 sections principales

✅ Logique conditionnelle complète

✅ Authentification obligatoire

✅ Quota journalier (2/jour)

---

**✨ Dernière mise à jour : 19 janvier 2025 - Version 2.0.0**
