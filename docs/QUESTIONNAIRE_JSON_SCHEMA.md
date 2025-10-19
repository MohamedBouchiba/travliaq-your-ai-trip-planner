# JSON Schema pour les Questionnaires Travliaq

Ce document définit le schéma JSON standard pour les réponses au questionnaire Travliaq, incluant toutes les validations, contraintes et valeurs possibles.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du système](#architecture-du-système)
3. [JSON Schema Standard](#json-schema-standard)
4. [Exemple JSON Complet](#exemple-json-complet)
5. [Valeurs prédéfinies par champ](#valeurs-prédéfinies-par-champ)
6. [Validation et Contraintes](#validation-et-contraintes)
7. [Structure de la base de données](#structure-de-la-base-de-données)
8. [Guide d'utilisation de l'API](#guide-dutilisation-de-lapi)
9. [Sécurité et Rate Limiting](#sécurité-et-rate-limiting)
10. [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble

Le questionnaire Travliaq est un formulaire dynamique qui s'adapte aux réponses de l'utilisateur pour collecter les informations nécessaires à la création d'un voyage sur mesure. Le nombre d'étapes varie entre 10 et 25+ selon les choix de l'utilisateur.

### Technologies utilisées

- **Frontend** : React + TypeScript avec validation Zod
- **Backend** : Supabase Edge Function (Deno)
- **Base de données** : PostgreSQL (Supabase)
- **Sécurité** : RLS (Row Level Security), Rate Limiting, Authentification requise

### Flux de données

```
Utilisateur → Frontend React → Validation Zod → Edge Function → Validation serveur → PostgreSQL
                                                         ↓
                                                   Rate Limiting
                                                   Authentification
                                                   Quota journalier
```

---

## Architecture du système

### Logique conditionnelle du questionnaire

Le questionnaire est **dynamique** : certaines questions ne s'affichent que selon les réponses précédentes :

1. **Groupe de voyageurs** → Si "famille" ou "groupe 3-5" : demande le nombre exact
2. **Famille** → Demande les détails des enfants (âges)
3. **Destination** → Si "Non" : pose 3 questions supplémentaires (climat, affinités, ambiance)
4. **Dates** → Si "Flexibles" : questions de flexibilité et durée détaillées
5. **Aide souhaitée** → Détermine quelles sections afficher :
   - Vols ✈️ → Questions sur préférences de vol et bagages
   - Hébergement 🏨 → Questions détaillées sur le confort, quartier, équipements
   - Activités 🎯 → Questions sur le style et le rythme
6. **Durée** → Si "> 14 jours" : demande le nombre exact de nuits

### Champs calculés automatiquement

- `user_id` : UUID de l'utilisateur authentifié (via JWT)
- `language` : Langue du questionnaire détectée automatiquement ('fr' | 'en')
- `created_at` : Timestamp de création (automatique)
- `updated_at` : Timestamp de dernière modification (automatique)

---

## JSON Schema Standard

Schéma JSON conforme à **JSON Schema Draft 7** définissant la structure complète d'une réponse au questionnaire.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://travliaq.com/schemas/questionnaire.json",
  "title": "Travliaq Questionnaire Response",
  "description": "Schéma complet pour une réponse au questionnaire de planification de voyage",
  "type": "object",
  "required": ["email", "language", "user_id"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identifiant unique de la réponse (généré automatiquement)",
      "readOnly": true
    },
    "user_id": {
      "type": "string",
      "format": "uuid",
      "description": "Identifiant de l'utilisateur authentifié (requis)",
      "examples": ["550e8400-e29b-41d4-a716-446655440000"]
    },
    "email": {
      "type": "string",
      "format": "email",
      "description": "Email de l'utilisateur (requis)",
      "minLength": 5,
      "maxLength": 255,
      "examples": ["jean.dupont@example.com"]
    },
    "language": {
      "type": "string",
      "enum": ["fr", "en"],
      "description": "Langue utilisée pour répondre au questionnaire (détecté automatiquement)",
      "default": "fr"
    },
    "travel_group": {
      "type": ["string", "null"],
      "description": "Type de groupe de voyageurs",
      "maxLength": 100,
      "enum": [
        "Solo", "En duo", "En famille", "Groupe (3-5 personnes)", 
        "Groupe (6-10 personnes)", "Groupe (10+ personnes)",
        null
      ],
      "examples": ["En famille", "Solo", "Groupe (3-5 personnes)"]
    },
    "number_of_travelers": {
      "type": ["integer", "null"],
      "description": "Nombre exact de voyageurs (si groupe 3-5 ou famille)",
      "minimum": 1,
      "maximum": 50,
      "examples": [2, 4, 8]
    },
    "children": {
      "type": ["array", "null"],
      "description": "Détails des enfants du voyage (si famille)",
      "maxItems": 20,
      "items": {
        "type": "object",
        "required": ["age"],
        "properties": {
          "age": {
            "type": "integer",
            "minimum": 0,
            "maximum": 17,
            "description": "Âge de l'enfant"
          }
        }
      },
      "examples": [
        [{ "age": 5 }, { "age": 10 }],
        [{ "age": 3 }, { "age": 7 }, { "age": 12 }]
      ]
    },
    "has_destination": {
      "type": ["string", "null"],
      "description": "Si l'utilisateur a déjà une destination en tête",
      "maxLength": 50,
      "enum": ["Oui", "Non", "Peu importe", null],
      "examples": ["Oui", "Non"]
    },
    "destination": {
      "type": ["string", "null"],
      "description": "Destination souhaitée (ville ou pays)",
      "maxLength": 200,
      "examples": ["Tokyo, Japon 🇯🇵", "Paris, France 🇫🇷", "Bali, Indonésie 🇮🇩"]
    },
    "departure_location": {
      "type": ["string", "null"],
      "description": "Ville de départ (peut être détectée par géolocalisation)",
      "maxLength": 200,
      "examples": ["Paris, France", "Bruxelles, Belgique", "Lyon, France"]
    },
    "climate_preference": {
      "type": ["array", "string", "null"],
      "description": "Préférence climatique (peut être array ou string selon le contexte)",
      "items": {
        "type": "string",
        "maxLength": 100
      },
      "examples": [
        ["Chaud et ensoleillé ☀️", "Tropical 🌴"],
        "Chaud et ensoleillé ☀️",
        ["Tempéré 🌤️", "Frais et sec ❄️"]
      ]
    },
    "travel_affinities": {
      "type": ["array", "null"],
      "description": "Affinités de voyage (max 5 sélections)",
      "maxItems": 5,
      "items": {
        "type": "string",
        "maxLength": 200
      },
      "examples": [
        ["Culture & Histoire 🏛️", "Gastronomie 🍽️", "Nature & Paysages 🏞️"],
        ["Plages & Détente 🏖️", "Shopping 🛍️"]
      ]
    },
    "travel_ambiance": {
      "type": ["string", "null"],
      "description": "Type d'ambiance recherchée",
      "maxLength": 100,
      "enum": [
        "Animée et urbaine 🏙️",
        "Calme et nature 🌿",
        "Mix des deux 🎭",
        null
      ],
      "examples": ["Animée et urbaine 🏙️", "Calme et nature 🌿"]
    },
    "dates_type": {
      "type": ["string", "null"],
      "description": "Type de dates du voyage",
      "maxLength": 50,
      "enum": ["Dates précises", "Dates flexibles", "Pas de dates précises", null],
      "examples": ["Dates précises", "Dates flexibles"]
    },
    "departure_date": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Date de départ (format ISO 8601)",
      "examples": ["2025-06-15", "2025-12-20"]
    },
    "return_date": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Date de retour (format ISO 8601)",
      "examples": ["2025-06-25", "2025-12-30"]
    },
    "flexibility": {
      "type": ["string", "null"],
      "description": "Niveau de flexibilité sur les dates",
      "maxLength": 50,
      "enum": [
        "±1 jour",
        "±2-3 jours",
        "±1 semaine",
        "Totalement flexible",
        null
      ],
      "examples": ["±2-3 jours", "Totalement flexible"]
    },
    "has_approximate_departure_date": {
      "type": ["string", "null"],
      "description": "Si une date approximative de départ est connue",
      "maxLength": 50,
      "enum": ["Oui", "Non", null],
      "examples": ["Oui", "Non"]
    },
    "approximate_departure_date": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Date approximative de départ (si has_approximate_departure_date = 'Oui')",
      "examples": ["2025-07-01", "2025-11-15"]
    },
    "duration": {
      "type": ["string", "null"],
      "description": "Durée du séjour",
      "maxLength": 50,
      "enum": [
        "Week-end (2-3 jours)",
        "1 semaine (4-7 jours)",
        "10 jours",
        "2 semaines",
        "Plus de 2 semaines",
        null
      ],
      "examples": ["1 semaine (4-7 jours)", "2 semaines"]
    },
    "exact_nights": {
      "type": ["integer", "null"],
      "description": "Nombre exact de nuits (si duration = 'Plus de 2 semaines')",
      "minimum": 1,
      "maximum": 365,
      "examples": [7, 14, 21, 30]
    },
    "budget": {
      "type": ["string", "null"],
      "description": "Catégorie de budget",
      "maxLength": 100,
      "enum": [
        "Économique (< 50€/jour)",
        "Modéré (50-100€/jour)",
        "Confortable (100-200€/jour)",
        "Haut de gamme (> 200€/jour)",
        "Luxe (> 500€/jour)",
        null
      ],
      "examples": ["Modéré (50-100€/jour)", "Confortable (100-200€/jour)"]
    },
    "budget_type": {
      "type": ["string", "null"],
      "description": "Type de budget (estimation ou précis)",
      "maxLength": 50,
      "enum": ["Estimation par jour", "Budget total précis", null],
      "examples": ["Estimation par jour", "Budget total précis"]
    },
    "budget_amount": {
      "type": ["number", "null"],
      "description": "Montant précis du budget (si budget_type = 'Budget total précis')",
      "minimum": 0,
      "maximum": 10000000,
      "examples": [1500, 3000, 5000, 10000]
    },
    "budget_currency": {
      "type": ["string", "null"],
      "description": "Devise du budget",
      "maxLength": 50,
      "enum": ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", null],
      "examples": ["EUR", "USD"]
    },
    "styles": {
      "type": ["array", "object", "null"],
      "description": "Styles de voyage préférés (peut être array ou object selon le contexte)",
      "examples": [
        ["Culturel", "Gastronomique"],
        { "cultural": true, "adventure": false }
      ]
    },
    "rhythm": {
      "type": ["string", "null"],
      "description": "Rythme du voyage",
      "maxLength": 100,
      "enum": [
        "Tranquille (beaucoup de temps libre)",
        "Équilibré (mix activités et repos)",
        "Intense (programme chargé)",
        null
      ],
      "examples": ["Équilibré (mix activités et repos)", "Tranquille (beaucoup de temps libre)"]
    },
    "flight_preference": {
      "type": ["string", "null"],
      "description": "Préférence pour les vols",
      "maxLength": 100,
      "enum": [
        "Vol direct uniquement",
        "1 escale maximum",
        "Peu importe (le moins cher)",
        null
      ],
      "examples": ["Vol direct uniquement", "1 escale maximum"]
    },
    "luggage": {
      "type": ["object", "null"],
      "description": "Préférences de bagages par voyageur",
      "additionalProperties": {
        "type": "string",
        "enum": [
          "Bagage cabine uniquement",
          "1 bagage en soute",
          "2 bagages en soute",
          "3+ bagages en soute"
        ]
      },
      "examples": [
        { "0": "Bagage cabine uniquement", "1": "1 bagage en soute" },
        { "0": "1 bagage en soute", "1": "1 bagage en soute", "2": "Bagage cabine uniquement" }
      ]
    },
    "mobility": {
      "type": ["array", "null"],
      "description": "Modes de transport sur place",
      "maxItems": 50,
      "items": {
        "type": "string",
        "maxLength": 200
      },
      "examples": [
        ["Transports en commun 🚇", "Marche à pied 🚶", "Vélo 🚴"],
        ["Voiture de location 🚗", "Taxi/VTC 🚕"]
      ]
    },
    "accommodation_type": {
      "type": ["array", "null"],
      "description": "Types d'hébergement préférés",
      "maxItems": 20,
      "items": {
        "type": "string",
        "maxLength": 100
      },
      "examples": [
        ["Hôtel 🏨", "Appartement/Airbnb 🏠"],
        ["Auberge de jeunesse 🎒", "Chambre d'hôtes 🏡"]
      ]
    },
    "comfort": {
      "type": ["string", "null"],
      "description": "Niveau de confort minimum souhaité",
      "maxLength": 100,
      "enum": [
        "Basique (propre et fonctionnel)",
        "Standard (confortable)",
        "Supérieur (très confortable)",
        "Luxe (haut de gamme)",
        null
      ],
      "examples": ["Standard (confortable)", "Supérieur (très confortable)"]
    },
    "neighborhood": {
      "type": ["string", "null"],
      "description": "Type de quartier recherché",
      "maxLength": 200,
      "enum": [
        "Centre-ville/Touristique",
        "Quartier authentique/Local",
        "Calme/Résidentiel",
        "Peu importe",
        null
      ],
      "examples": ["Centre-ville/Touristique", "Quartier authentique/Local"]
    },
    "amenities": {
      "type": ["array", "null"],
      "description": "Équipements souhaités dans l'hébergement",
      "maxItems": 50,
      "items": {
        "type": "string",
        "maxLength": 200
      },
      "examples": [
        ["WiFi 📶", "Climatisation ❄️", "Piscine 🏊"],
        ["Cuisine équipée 🍳", "Parking 🅿️", "Spa/Wellness 💆"]
      ]
    },
    "security": {
      "type": ["array", "null"],
      "description": "Contraintes de sécurité et phobies",
      "maxItems": 20,
      "items": {
        "type": "string",
        "maxLength": 200
      },
      "examples": [
        ["Éviter foule/espaces bondés 👥", "Peur de l'avion ✈️"],
        ["Éviter hauteurs 🏔️", "Problèmes de mobilité réduite ♿"]
      ]
    },
    "biorhythm": {
      "type": ["array", "null"],
      "description": "Horloge biologique et habitudes",
      "maxItems": 20,
      "items": {
        "type": "string",
        "maxLength": 200
      },
      "examples": [
        ["Lève-tôt 🌅", "Aime voyager hors-saison 🍂"],
        ["Couche-tard 🌙", "Besoin de siestes régulières 😴"]
      ]
    },
    "constraints": {
      "type": ["array", "null"],
      "description": "Contraintes diverses",
      "maxItems": 50,
      "items": {
        "type": "string",
        "maxLength": 200
      },
      "examples": [
        ["Allergies alimentaires 🥜", "Végétarien/Vegan 🌱"],
        ["Problèmes de santé spécifiques 💊", "Besoin de médicaments particuliers 💉"]
      ]
    },
    "additional_info": {
      "type": ["string", "null"],
      "description": "Informations supplémentaires en texte libre",
      "maxLength": 2000,
      "examples": [
        "Nous aimerions célébrer notre anniversaire de mariage pendant ce voyage.",
        "Premier voyage au Japon, nous souhaitons un accompagnement pour la barrière de la langue."
      ]
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "Date et heure de création de la réponse (automatique)",
      "readOnly": true,
      "examples": ["2025-10-19T17:45:30.123Z"]
    },
    "updated_at": {
      "type": "string",
      "format": "date-time",
      "description": "Date et heure de dernière modification (automatique)",
      "readOnly": true,
      "examples": ["2025-10-19T17:50:15.456Z"]
    }
  }
}
```

---

## Exemple JSON Complet

Voici un exemple JSON complet d'une réponse au questionnaire pour **une famille de 4 personnes souhaitant partir au Japon** :

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "jean.dupont@example.com",
  "language": "fr",
  "travel_group": "En famille",
  "number_of_travelers": 4,
  "children": [
    { "age": 8 },
    { "age": 12 }
  ],
  "has_destination": "Oui",
  "destination": "Tokyo, Japon 🇯🇵",
  "departure_location": "Paris, France",
  "climate_preference": null,
  "travel_affinities": null,
  "travel_ambiance": null,
  "dates_type": "Dates précises",
  "departure_date": "2025-07-15",
  "return_date": "2025-07-29",
  "flexibility": null,
  "has_approximate_departure_date": null,
  "approximate_departure_date": null,
  "duration": "2 semaines",
  "exact_nights": 14,
  "budget": "Confortable (100-200€/jour)",
  "budget_type": "Budget total précis",
  "budget_amount": 8000,
  "budget_currency": "EUR",
  "styles": [
    "Culture & Histoire 🏛️",
    "Gastronomie 🍽️",
    "Nature & Paysages 🏞️"
  ],
  "rhythm": "Équilibré (mix activités et repos)",
  "flight_preference": "1 escale maximum",
  "luggage": {
    "0": "1 bagage en soute",
    "1": "1 bagage en soute",
    "2": "Bagage cabine uniquement",
    "3": "Bagage cabine uniquement"
  },
  "mobility": [
    "Transports en commun 🚇",
    "Marche à pied 🚶",
    "Train 🚄"
  ],
  "accommodation_type": [
    "Hôtel 🏨",
    "Appartement/Airbnb 🏠"
  ],
  "comfort": "Standard (confortable)",
  "neighborhood": "Quartier authentique/Local",
  "amenities": [
    "WiFi 📶",
    "Climatisation ❄️",
    "Cuisine équipée 🍳",
    "Lave-linge 🧺"
  ],
  "security": [
    "Éviter foule/espaces bondés 👥"
  ],
  "biorhythm": [
    "Lève-tôt 🌅",
    "Besoin de pauses régulières ☕"
  ],
  "constraints": [
    "Allergies alimentaires 🥜",
    "Végétarien/Vegan 🌱"
  ],
  "additional_info": "C'est notre premier voyage au Japon en famille. Nous aimerions découvrir la culture traditionnelle tout en gardant des activités adaptées aux enfants. Nous sommes particulièrement intéressés par les temples, les jardins zen et la gastronomie japonaise. Un de nos enfants est végétarien, merci de prévoir des options adaptées."
}
```

### Exemple 2 : Voyage solo flexible (destination ouverte)

```json
{
  "user_id": "7a3f9e2c-5d6b-4a18-9f3e-1c8d4b7a2e90",
  "email": "marie.martin@example.com",
  "language": "fr",
  "travel_group": "Solo",
  "number_of_travelers": 1,
  "children": null,
  "has_destination": "Non",
  "destination": null,
  "departure_location": "Bruxelles, Belgique",
  "climate_preference": [
    "Chaud et ensoleillé ☀️",
    "Tropical 🌴"
  ],
  "travel_affinities": [
    "Plages & Détente 🏖️",
    "Yoga & Bien-être 🧘",
    "Nature & Paysages 🏞️",
    "Rencontres & Échanges 🤝"
  ],
  "travel_ambiance": "Mix des deux 🎭",
  "dates_type": "Dates flexibles",
  "departure_date": null,
  "return_date": null,
  "flexibility": "Totalement flexible",
  "has_approximate_departure_date": "Oui",
  "approximate_departure_date": "2025-09-01",
  "duration": "10 jours",
  "exact_nights": null,
  "budget": "Modéré (50-100€/jour)",
  "budget_type": "Estimation par jour",
  "budget_amount": null,
  "budget_currency": "EUR",
  "styles": [
    "Détente & Wellness",
    "Aventure douce"
  ],
  "rhythm": "Tranquille (beaucoup de temps libre)",
  "flight_preference": "Peu importe (le moins cher)",
  "luggage": {
    "0": "Bagage cabine uniquement"
  },
  "mobility": [
    "Transports en commun 🚇",
    "Marche à pied 🚶",
    "Vélo 🚴"
  ],
  "accommodation_type": [
    "Auberge de jeunesse 🎒",
    "Éco-lodge 🌿"
  ],
  "comfort": "Basique (propre et fonctionnel)",
  "neighborhood": "Quartier authentique/Local",
  "amenities": [
    "WiFi 📶",
    "Espace yoga/méditation 🧘"
  ],
  "security": [],
  "biorhythm": [
    "Lève-tôt 🌅",
    "Aime voyager hors-saison 🍂"
  ],
  "constraints": [
    "Végétarien/Vegan 🌱"
  ],
  "additional_info": "Je cherche une destination calme pour me ressourcer, idéalement avec des cours de yoga et de la nature. Budget limité mais flexible sur les dates."
}
```

---

## Valeurs prédéfinies par champ

Cette section liste toutes les valeurs possibles pour chaque champ à choix multiple.

### 1. `travel_group` - Type de groupe

**Valeurs possibles (français)** :
- `"Solo"` - Voyage en solo
- `"En duo"` - Voyage à deux (couple ou amis)
- `"En famille"` - Voyage en famille (avec ou sans enfants)
- `"Groupe (3-5 personnes)"` - Petit groupe
- `"Groupe (6-10 personnes)"` - Groupe moyen
- `"Groupe (10+ personnes)"` - Grand groupe

**Valeurs possibles (anglais)** :
- `"Solo"`
- `"Duo"`
- `"Family"`
- `"Group (3-5 people)"`
- `"Group (6-10 people)"`
- `"Group (10+ people)"`

### 2. `has_destination` - Destination en tête

**Valeurs possibles (français)** :
- `"Oui"` - L'utilisateur sait où il veut aller
- `"Non"` - L'utilisateur ne sait pas où aller (questions supplémentaires)
- `"Peu importe"` - Flexible sur la destination

**Valeurs possibles (anglais)** :
- `"Yes"`
- `"No"`
- `"Doesn't matter"`

### 3. `climate_preference` - Préférence climatique

**Valeurs possibles (français)** :
- `"Chaud et ensoleillé ☀️"` - Climat chaud (> 25°C)
- `"Tropical 🌴"` - Climat tropical (humide et chaud)
- `"Tempéré 🌤️"` - Climat tempéré (15-25°C)
- `"Frais et sec ❄️"` - Climat frais (< 15°C)
- `"Montagne ⛰️"` - Climat montagnard
- `"Peu importe 🌍"` - Pas de préférence climatique

**Valeurs possibles (anglais)** :
- `"Hot and sunny ☀️"`
- `"Tropical 🌴"`
- `"Temperate 🌤️"`
- `"Cool and dry ❄️"`
- `"Mountain ⛰️"`
- `"Doesn't matter 🌍"`

### 4. `travel_affinities` - Affinités de voyage

**Maximum** : 5 sélections

**Valeurs possibles (français)** :
- `"Culture & Histoire 🏛️"` - Musées, monuments, patrimoine
- `"Gastronomie 🍽️"` - Cuisine locale, restaurants
- `"Nature & Paysages 🏞️"` - Parcs naturels, randonnées
- `"Plages & Détente 🏖️"` - Mer, détente
- `"Aventure & Sports 🏔️"` - Activités sportives, sensations
- `"Shopping 🛍️"` - Boutiques, marchés
- `"Vie nocturne 🎉"` - Bars, clubs, fêtes
- `"Spiritualité 🕉️"` - Temples, méditation, yoga
- `"Art & Design 🎨"` - Galeries, architecture moderne
- `"Famille & Enfants 👨‍👩‍👧‍👦"` - Activités familiales
- `"Photographie 📸"` - Sites photogéniques
- `"Rencontres & Échanges 🤝"` - Rencontrer des locaux
- `"Yoga & Bien-être 🧘"` - Wellness, spa
- `"Écotourisme 🌱"` - Tourisme responsable
- `"Luxe & Confort 💎"` - Expériences premium

**Valeurs possibles (anglais)** :
- `"Culture & History 🏛️"`
- `"Gastronomy 🍽️"`
- `"Nature & Landscapes 🏞️"`
- `"Beaches & Relaxation 🏖️"`
- `"Adventure & Sports 🏔️"`
- `"Shopping 🛍️"`
- `"Nightlife 🎉"`
- `"Spirituality 🕉️"`
- `"Art & Design 🎨"`
- `"Family & Kids 👨‍👩‍👧‍👦"`
- `"Photography 📸"`
- `"Meetings & Exchanges 🤝"`
- `"Yoga & Wellness 🧘"`
- `"Ecotourism 🌱"`
- `"Luxury & Comfort 💎"`

### 5. `travel_ambiance` - Ambiance recherchée

**Valeurs possibles (français)** :
- `"Animée et urbaine 🏙️"` - Grandes villes, animation
- `"Calme et nature 🌿"` - Campagne, montagne, bord de mer
- `"Mix des deux 🎭"` - Alternance ville et nature

**Valeurs possibles (anglais)** :
- `"Lively and urban 🏙️"`
- `"Calm and nature 🌿"`
- `"Mix of both 🎭"`

### 6. `dates_type` - Type de dates

**Valeurs possibles (français)** :
- `"Dates précises"` - Dates fixes connues
- `"Dates flexibles"` - Dates approximatives avec flexibilité
- `"Pas de dates précises"` - Aucune date définie

**Valeurs possibles (anglais)** :
- `"Fixed dates"`
- `"Flexible dates"`
- `"No specific dates"`

### 7. `flexibility` - Flexibilité sur les dates

**Valeurs possibles (français)** :
- `"±1 jour"` - Flexibilité de 1 jour avant/après
- `"±2-3 jours"` - Flexibilité de 2-3 jours
- `"±1 semaine"` - Flexibilité d'une semaine
- `"Totalement flexible"` - Aucune contrainte de dates

**Valeurs possibles (anglais)** :
- `"±1 day"`
- `"±2-3 days"`
- `"±1 week"`
- `"Totally flexible"`

### 8. `has_approximate_departure_date` - Date approximative connue

**Valeurs possibles (français)** :
- `"Oui"` - Date approximative connue (affiche un date picker)
- `"Non"` - Aucune date approximative

**Valeurs possibles (anglais)** :
- `"Yes"`
- `"No"`

### 9. `duration` - Durée du séjour

**Valeurs possibles (français)** :
- `"Week-end (2-3 jours)"` - Court séjour
- `"1 semaine (4-7 jours)"` - Séjour d'une semaine
- `"10 jours"` - Séjour de 10 jours
- `"2 semaines"` - Séjour de 2 semaines
- `"Plus de 2 semaines"` - Long séjour (affiche un champ pour le nombre exact)

**Valeurs possibles (anglais)** :
- `"Weekend (2-3 days)"`
- `"1 week (4-7 days)"`
- `"10 days"`
- `"2 weeks"`
- `"More than 2 weeks"`

### 10. `budget` - Catégorie de budget

**Valeurs possibles (français)** :
- `"Économique (< 50€/jour)"` - Backpacker, auberges
- `"Modéré (50-100€/jour)"` - Hôtels 2-3 étoiles
- `"Confortable (100-200€/jour)"` - Hôtels 3-4 étoiles
- `"Haut de gamme (> 200€/jour)"` - Hôtels 4-5 étoiles
- `"Luxe (> 500€/jour)"` - Expériences premium

**Valeurs possibles (anglais)** :
- `"Budget (< 50€/day)"`
- `"Moderate (50-100€/day)"`
- `"Comfortable (100-200€/day)"`
- `"High-end (> 200€/day)"`
- `"Luxury (> 500€/day)"`

### 11. `budget_type` - Type de budget

**Valeurs possibles (français)** :
- `"Estimation par jour"` - Budget journalier estimé
- `"Budget total précis"` - Montant total connu (affiche un champ numérique)

**Valeurs possibles (anglais)** :
- `"Daily estimate"`
- `"Precise total budget"`

### 12. `budget_currency` - Devise

**Valeurs possibles** :
- `"EUR"` - Euro
- `"USD"` - Dollar américain
- `"GBP"` - Livre sterling
- `"CHF"` - Franc suisse
- `"CAD"` - Dollar canadien
- `"AUD"` - Dollar australien

### 13. `rhythm` - Rythme du voyage

**Valeurs possibles (français)** :
- `"Tranquille (beaucoup de temps libre)"` - Rythme lent, repos
- `"Équilibré (mix activités et repos)"` - Rythme modéré
- `"Intense (programme chargé)"` - Rythme soutenu, beaucoup d'activités

**Valeurs possibles (anglais)** :
- `"Relaxed (lots of free time)"`
- `"Balanced (mix activities and rest)"`
- `"Intense (busy schedule)"`

### 14. `flight_preference` - Préférence de vol

**Valeurs possibles (français)** :
- `"Vol direct uniquement"` - Sans escale
- `"1 escale maximum"` - Accepte 1 escale
- `"Peu importe (le moins cher)"` - Prix prioritaire

**Valeurs possibles (anglais)** :
- `"Direct flight only"`
- `"1 layover maximum"`
- `"Doesn't matter (cheapest)"`

### 15. `luggage` - Bagages par voyageur

**Format** : Object avec clés numériques (index du voyageur)

**Valeurs possibles (français)** :
- `"Bagage cabine uniquement"` - Hand luggage only
- `"1 bagage en soute"` - 1 checked bag
- `"2 bagages en soute"` - 2 checked bags
- `"3+ bagages en soute"` - 3+ checked bags

**Valeurs possibles (anglais)** :
- `"Cabin luggage only"`
- `"1 checked bag"`
- `"2 checked bags"`
- `"3+ checked bags"`

### 16. `mobility` - Modes de transport sur place

**Valeurs possibles (français)** :
- `"Transports en commun 🚇"` - Métro, bus, tram
- `"Marche à pied 🚶"` - À pied
- `"Vélo 🚴"` - Vélo, trottinette
- `"Voiture de location 🚗"` - Location de voiture
- `"Taxi/VTC 🚕"` - Taxi, Uber
- `"Train 🚄"` - Train
- `"Moto/Scooter 🏍️"` - Deux-roues motorisé

**Valeurs possibles (anglais)** :
- `"Public transport 🚇"`
- `"Walking 🚶"`
- `"Bike 🚴"`
- `"Rental car 🚗"`
- `"Taxi/VTC 🚕"`
- `"Train 🚄"`
- `"Motorcycle/Scooter 🏍️"`

### 17. `accommodation_type` - Types d'hébergement

**Valeurs possibles (français)** :
- `"Hôtel 🏨"` - Hôtel classique
- `"Appartement/Airbnb 🏠"` - Location privée
- `"Auberge de jeunesse 🎒"` - Hostel, dortoir
- `"Chambre d'hôtes 🏡"` - B&B
- `"Resort/Club 🌴"` - All-inclusive
- `"Éco-lodge 🌿"` - Hébergement écologique
- `"Camping ⛺"` - Tente, camping-car

**Valeurs possibles (anglais)** :
- `"Hotel 🏨"`
- `"Apartment/Airbnb 🏠"`
- `"Hostel 🎒"`
- `"Guest house 🏡"`
- `"Resort/Club 🌴"`
- `"Eco-lodge 🌿"`
- `"Camping ⛺"`

### 18. `comfort` - Niveau de confort

**Valeurs possibles (français)** :
- `"Basique (propre et fonctionnel)"` - 1-2 étoiles
- `"Standard (confortable)"` - 2-3 étoiles
- `"Supérieur (très confortable)"` - 3-4 étoiles
- `"Luxe (haut de gamme)"` - 4-5 étoiles

**Valeurs possibles (anglais)** :
- `"Basic (clean and functional)"`
- `"Standard (comfortable)"`
- `"Superior (very comfortable)"`
- `"Luxury (high-end)"`

### 19. `neighborhood` - Type de quartier

**Valeurs possibles (français)** :
- `"Centre-ville/Touristique"` - Près des attractions
- `"Quartier authentique/Local"` - Quartiers résidentiels
- `"Calme/Résidentiel"` - Loin du bruit
- `"Peu importe"` - Pas de préférence

**Valeurs possibles (anglais)** :
- `"City center/Tourist"`
- `"Authentic/Local neighborhood"`
- `"Quiet/Residential"`
- `"Doesn't matter"`

### 20. `amenities` - Équipements

**Valeurs possibles (français)** :
- `"WiFi 📶"` - Internet
- `"Climatisation ❄️"` - Air conditionné
- `"Piscine 🏊"` - Swimming pool
- `"Cuisine équipée 🍳"` - Kitchenette
- `"Lave-linge 🧺"` - Machine à laver
- `"Parking 🅿️"` - Stationnement
- `"Petit-déjeuner inclus 🥐"` - Breakfast
- `"Spa/Wellness 💆"` - Spa
- `"Salle de sport 🏋️"` - Gym
- `"Balcon/Terrasse 🌅"` - Outdoor space
- `"Vue mer/montagne 🏞️"` - View
- `"Espace yoga/méditation 🧘"` - Yoga space

**Valeurs possibles (anglais)** :
- `"WiFi 📶"`
- `"Air conditioning ❄️"`
- `"Pool 🏊"`
- `"Kitchen 🍳"`
- `"Washing machine 🧺"`
- `"Parking 🅿️"`
- `"Breakfast included 🥐"`
- `"Spa/Wellness 💆"`
- `"Gym 🏋️"`
- `"Balcony/Terrace 🌅"`
- `"Sea/Mountain view 🏞️"`
- `"Yoga/Meditation space 🧘"`

### 21. `security` - Contraintes de sécurité et phobies

**Valeurs possibles (français)** :
- `"Éviter foule/espaces bondés 👥"` - Agoraphobie
- `"Éviter hauteurs 🏔️"` - Vertige
- `"Peur de l'avion ✈️"` - Aérophobie
- `"Peur de l'eau/mer 🌊"` - Aquaphobie
- `"Problèmes de mobilité réduite ♿"` - Accessibilité
- `"Éviter zones dangereuses 🚨"` - Sécurité
- `"Peur des insectes/animaux 🦟"` - Entomophobie

**Valeurs possibles (anglais)** :
- `"Avoid crowds/crowded spaces 👥"`
- `"Avoid heights 🏔️"`
- `"Fear of flying ✈️"`
- `"Fear of water/sea 🌊"`
- `"Reduced mobility issues ♿"`
- `"Avoid dangerous areas 🚨"`
- `"Fear of insects/animals 🦟"`

### 22. `biorhythm` - Horloge biologique

**Valeurs possibles (français)** :
- `"Lève-tôt 🌅"` - Early bird (5h-7h)
- `"Couche-tard 🌙"` - Night owl (23h-2h)
- `"Besoin de siestes régulières 😴"` - Nap time
- `"Besoin de pauses régulières ☕"` - Regular breaks
- `"Aime voyager hors-saison 🍂"` - Off-season travel
- `"Préfère haute-saison 🌞"` - High season

**Valeurs possibles (anglais)** :
- `"Early riser 🌅"`
- `"Night owl 🌙"`
- `"Need regular naps 😴"`
- `"Need regular breaks ☕"`
- `"Like off-season travel 🍂"`
- `"Prefer high season 🌞"`

### 23. `constraints` - Contraintes diverses

**Valeurs possibles (français)** :
- `"Allergies alimentaires 🥜"` - Food allergies
- `"Végétarien/Vegan 🌱"` - Dietary restrictions
- `"Sans gluten 🌾"` - Gluten-free
- `"Halal/Casher 🕌"` - Religious diet
- `"Problèmes de santé spécifiques 💊"` - Health issues
- `"Besoin de médicaments particuliers 💉"` - Medication needs
- `"Contraintes religieuses 🕌"` - Religious constraints

**Valeurs possibles (anglais)** :
- `"Food allergies 🥜"`
- `"Vegetarian/Vegan 🌱"`
- `"Gluten-free 🌾"`
- `"Halal/Kosher 🕌"`
- `"Specific health issues 💊"`
- `"Need specific medications 💉"`
- `"Religious constraints 🕌"`

---

## Validation et Contraintes

### Validation côté client (Zod)

Le frontend utilise **Zod** pour valider les données avant l'envoi :

```typescript
const questionnaireSchema = z.object({
  user_id: z.string().uuid().nullable(),
  email: z.string().trim().email({ message: "Email invalide" }).max(255, { message: "Email trop long" }),
  language: z.enum(['fr', 'en']),
  travel_group: z.string().max(100).optional().nullable(),
  number_of_travelers: z.number().int().min(1).max(50).optional().nullable(),
  has_destination: z.string().max(50).optional().nullable(),
  destination: z.string().trim().max(200).optional().nullable(),
  departure_location: z.string().trim().max(200).optional().nullable(),
  climate_preference: z.any().optional().nullable(),
  travel_affinities: z.array(z.string().max(200)).max(50).optional().nullable(),
  travel_ambiance: z.string().max(100).optional().nullable(),
  dates_type: z.string().max(50).optional().nullable(),
  departure_date: z.string().optional().nullable(),
  return_date: z.string().optional().nullable(),
  flexibility: z.string().max(50).optional().nullable(),
  has_approximate_departure_date: z.string().max(50).optional().nullable(),
  approximate_departure_date: z.string().optional().nullable(),
  duration: z.string().max(50).optional().nullable(),
  exact_nights: z.number().int().min(1).max(365).optional().nullable(),
  budget: z.string().max(100).optional().nullable(),
  budget_type: z.string().max(50).optional().nullable(),
  budget_amount: z.number().min(0).max(10000000).optional().nullable(),
  budget_currency: z.string().max(50).optional().nullable(),
  styles: z.any().optional().nullable(),
  rhythm: z.string().max(100).optional().nullable(),
  flight_preference: z.string().max(100).optional().nullable(),
  luggage: z.any().optional().nullable(),
  mobility: z.array(z.string().max(200)).max(50).optional().nullable(),
  accommodation_type: z.array(z.string().max(100)).max(20).optional().nullable(),
  comfort: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(200).optional().nullable(),
  amenities: z.array(z.string().max(200)).max(50).optional().nullable(),
  children: z.array(z.object({ age: z.number().int().min(0).max(17) })).max(20).optional().nullable(),
  security: z.array(z.string().max(200)).max(20).optional().nullable(),
  biorhythm: z.array(z.string().max(200)).max(20).optional().nullable(),
  constraints: z.array(z.string().max(200)).max(50).optional().nullable(),
  additional_info: z.string().trim().max(2000).optional().nullable(),
});
```

### Validation côté serveur (Edge Function)

L'Edge Function effectue une **double validation** pour garantir l'intégrité des données :

1. **Email** : Format valide, max 255 caractères
2. **Champs numériques** : Validation de range (budget_amount 0-10M, exact_nights 1-365, etc.)
3. **Champs texte** : Longueur max 1000-2000 caractères selon le champ
4. **Dates** : Format ISO 8601 valide
5. **Authentification** : JWT valide requis
6. **Rate limiting** : Max 3 requêtes par minute par IP
7. **Quota journalier** : Max 2 questionnaires par utilisateur/email en 24h

### Contraintes base de données

```sql
ALTER TABLE questionnaire_responses
ADD CONSTRAINT email_max_length CHECK (char_length(email) <= 255);

ALTER TABLE questionnaire_responses
ADD CONSTRAINT budget_amount_positive CHECK (budget_amount >= 0 AND budget_amount <= 10000000);

ALTER TABLE questionnaire_responses
ADD CONSTRAINT exact_nights_range CHECK (exact_nights >= 1 AND exact_nights <= 365);

ALTER TABLE questionnaire_responses
ADD CONSTRAINT number_of_travelers_range CHECK (number_of_travelers >= 1 AND number_of_travelers <= 50);

ALTER TABLE questionnaire_responses
ADD CONSTRAINT language_check CHECK (language IN ('fr', 'en'));
```

---

## Structure de la base de données

### Table `questionnaire_responses`

```sql
CREATE TABLE public.questionnaire_responses (
  -- Identifiants
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Groupe de voyageurs
  travel_group TEXT,
  number_of_travelers INTEGER,
  children JSONB,
  
  -- Destination
  has_destination TEXT,
  destination TEXT,
  departure_location TEXT,
  climate_preference JSONB,
  travel_affinities JSONB,
  travel_ambiance TEXT,
  
  -- Dates
  dates_type TEXT,
  departure_date DATE,
  return_date DATE,
  flexibility TEXT,
  has_approximate_departure_date TEXT,
  approximate_departure_date DATE,
  duration TEXT,
  exact_nights INTEGER,
  
  -- Budget
  budget TEXT,
  budget_type TEXT,
  budget_amount NUMERIC,
  budget_currency TEXT,
  
  -- Style et rythme
  styles JSONB,
  rhythm TEXT,
  
  -- Transport
  flight_preference TEXT,
  luggage JSONB,
  mobility JSONB,
  
  -- Hébergement
  accommodation_type JSONB,
  comfort TEXT,
  neighborhood TEXT,
  amenities JSONB,
  
  -- Contraintes
  security JSONB,
  biorhythm JSONB,
  constraints JSONB,
  
  -- Informations supplémentaires
  additional_info TEXT
);
```

### Index

```sql
-- Index pour améliorer les performances de recherche
CREATE INDEX idx_questionnaire_user_id ON questionnaire_responses(user_id);
CREATE INDEX idx_questionnaire_email ON questionnaire_responses(email);
CREATE INDEX idx_questionnaire_created_at ON questionnaire_responses(created_at DESC);
CREATE INDEX idx_questionnaire_destination ON questionnaire_responses(destination);
```

### Trigger pour `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_questionnaire_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questionnaire_updated_at
BEFORE UPDATE ON questionnaire_responses
FOR EACH ROW
EXECUTE FUNCTION update_questionnaire_updated_at();
```

### Politiques RLS (Row Level Security)

```sql
-- Activer RLS sur la table
ALTER TABLE questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : Les utilisateurs peuvent voir leurs propres réponses
CREATE POLICY "Users can view own responses"
ON questionnaire_responses
FOR SELECT
USING (auth.uid() = user_id);

-- Politique INSERT : Les utilisateurs authentifiés peuvent insérer leurs réponses
CREATE POLICY "Authenticated users can submit questionnaire"
ON questionnaire_responses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE : Les utilisateurs peuvent mettre à jour leurs réponses
CREATE POLICY "Users can update own responses"
ON questionnaire_responses
FOR UPDATE
USING (auth.uid() = user_id);

-- Pas de politique DELETE : Les utilisateurs ne peuvent pas supprimer leurs réponses
```

---

## Guide d'utilisation de l'API

### Endpoint

```
POST https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/submit-questionnaire
```

### Headers requis

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
```

### Exemple de requête cURL

```bash
curl -X POST \
  'https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/submit-questionnaire' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "jean.dupont@example.com",
    "language": "fr",
    "travel_group": "En famille",
    "number_of_travelers": 4,
    "children": [{"age": 8}, {"age": 12}],
    "has_destination": "Oui",
    "destination": "Tokyo, Japon 🇯🇵",
    "departure_location": "Paris, France",
    "dates_type": "Dates précises",
    "departure_date": "2025-07-15",
    "return_date": "2025-07-29",
    "budget": "Confortable (100-200€/jour)",
    "budget_type": "Budget total précis",
    "budget_amount": 8000,
    "budget_currency": "EUR"
  }'
```

### Exemple de requête JavaScript (Frontend)

```javascript
import { supabase } from "@/integrations/supabase/client";

const submitQuestionnaire = async (questionnaireData) => {
  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }
    
    // Call edge function
    const { data, error } = await supabase.functions.invoke('submit-questionnaire', {
      body: {
        ...questionnaireData,
        user_id: user.id,
        language: i18n.language === 'en' ? 'en' : 'fr'
      }
    });
    
    if (error) throw error;
    
    console.log('Questionnaire submitted successfully:', data);
    return data;
    
  } catch (error) {
    console.error('Submission error:', error);
    throw error;
  }
};
```

### Codes de réponse HTTP

| Code | Description |
|------|-------------|
| `200` | Succès - Questionnaire enregistré |
| `400` | Erreur de validation - Données invalides |
| `401` | Non authentifié - JWT manquant ou invalide |
| `429` | Trop de requêtes - Rate limit ou quota dépassé |
| `500` | Erreur serveur |

### Exemples de réponses

**Succès (200)** :
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "7a3f9e2c-5d6b-4a18-9f3e-1c8d4b7a2e90",
    "email": "jean.dupont@example.com",
    "language": "fr",
    "created_at": "2025-10-19T17:45:30.123Z",
    "updated_at": "2025-10-19T17:45:30.123Z"
    // ... autres champs
  }
}
```

**Erreur de validation (400)** :
```json
{
  "error": "Invalid email format"
}
```

**Erreur d'authentification (401)** :
```json
{
  "error": "authentication_required",
  "message": "Vous devez être connecté pour soumettre un questionnaire."
}
```

**Quota dépassé (429)** :
```json
{
  "error": "quota_exceeded",
  "message": "Vous avez atteint votre quota de 2 questionnaires par jour. Revenez demain pour planifier un autre voyage !"
}
```

**Rate limit dépassé (429)** :
```json
{
  "error": "Too many requests. Please try again later."
}
```

---

## Sécurité et Rate Limiting

### Authentification obligatoire

**Tous les appels doivent inclure un JWT valide**. L'Edge Function vérifie :

1. Présence du header `Authorization`
2. Validité du JWT (non expiré, signature correcte)
3. Existence de l'utilisateur dans la base
4. Attribution automatique du `user_id` depuis le JWT (impossible de forger)

### Rate Limiting

**Limite par IP** : 3 requêtes par minute

```javascript
const MAX_REQUESTS_PER_MINUTE = 3;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
```

**Implémentation** :
- Map en mémoire (réinitialisée au redémarrage de l'Edge Function)
- Clé : IP du client (`x-forwarded-for` ou `x-real-ip`)
- Fenêtre glissante de 60 secondes

### Quota journalier

**Limite par utilisateur** : 2 questionnaires par 24h

**Clé de quota** : `user_id` + `email` (double validation)

**Vérification** :
```sql
SELECT COUNT(*) 
FROM questionnaire_responses
WHERE user_id = <user_id>
  AND email = <email>
  AND created_at >= NOW() - INTERVAL '24 hours'
```

Si `COUNT >= 2` → Erreur 429 (quota_exceeded)

### Protection contre les injections

1. **Pas de SQL raw** : Utilisation exclusive des méthodes Supabase
2. **Validation stricte** : Regex pour email, ranges pour nombres
3. **Sanitization** : Trim automatique des strings
4. **Type checking** : Validation des types (string, number, array, object)

### CORS

**Headers autorisés** :
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Preflight** : Support des requêtes OPTIONS

---

## Bonnes pratiques

### 1. Toujours valider côté client ET serveur

Ne jamais faire confiance aux données du client. Même si Zod valide côté frontend, l'Edge Function re-valide tout.

### 2. Gérer les champs optionnels avec `null`

Utiliser `null` pour les champs non renseignés, pas `undefined` ou `""`.

```javascript
// ✅ BON
{
  destination: null,
  budget_amount: null
}

// ❌ MAUVAIS
{
  destination: undefined,
  budget_amount: ""
}
```

### 3. Capturer automatiquement `language` et `user_id`

Ne jamais laisser l'utilisateur spécifier ces champs manuellement.

```javascript
const responseData = {
  ...questionnaireData,
  user_id: user.id,  // Depuis JWT authentifié
  language: i18n.language === 'en' ? 'en' : 'fr'  // Depuis i18n
};
```

### 4. Normaliser les formats de dates

Toujours utiliser le format ISO 8601 (`YYYY-MM-DD`).

```javascript
// ✅ BON
departure_date: "2025-07-15"

// ❌ MAUVAIS
departure_date: "15/07/2025"
departure_date: "July 15, 2025"
```

### 5. Limiter les sélections multiples

Imposer un maximum pour éviter les abus :
- `travel_affinities` : max 5
- `children` : max 20
- `amenities` : max 50

### 6. Utiliser JSONB pour les arrays complexes

PostgreSQL JSONB permet :
- Indexation performante
- Requêtes JSON natives
- Flexibilité pour évolution du schéma

```sql
-- Recherche dans un JSONB array
SELECT * FROM questionnaire_responses
WHERE travel_affinities ? 'Culture & Histoire 🏛️';
```

### 7. Gérer gracieusement les erreurs

```javascript
try {
  const { data, error } = await supabase.functions.invoke('submit-questionnaire', {
    body: questionnaireData
  });
  
  if (error) {
    if (error.message.includes('quota_exceeded')) {
      // Afficher message personnalisé quota
    } else if (error.message.includes('authentication_required')) {
      // Rediriger vers login
    } else {
      // Erreur générique
    }
  }
} catch (error) {
  // Erreur réseau ou autre
}
```

### 8. Logger les erreurs côté serveur

L'Edge Function log toutes les erreurs pour debugging :

```javascript
console.log('Checking daily quota for user:', user.id, 'email:', questionnaireData.email);
console.log('Daily quota exceeded for user:', user.id, 'email:', questionnaireData.email);
console.error('Database error:', error.message);
```

### 9. Tester avec des données réelles

Utiliser des cas d'usage réalistes pour tester :
- Famille avec 3 enfants
- Solo backpacker budget
- Couple luxe
- Groupe d'amis

### 10. Documenter les changements de schéma

Toute modification du schéma doit être :
1. Documentée dans ce fichier
2. Migrée en base avec une migration SQL
3. Mise à jour dans le frontend (Zod schema)
4. Mise à jour dans l'Edge Function (validation)

---

## Évolution du schéma

### Version actuelle : 1.1.0

**Date** : 19 octobre 2025

**Changements récents** :
- Ajout du champ `language` (fr/en)
- Support multilingue complet

### Versions futures prévues

#### Version 1.2.0 (Q4 2025)
- [ ] Ajout de champs pour activités spécifiques
- [ ] Support de devises additionnelles
- [ ] Intégration d'APIs externes (vols, hôtels)

#### Version 2.0.0 (Q1 2026)
- [ ] Refonte complète avec IA générative
- [ ] Personnalisation avancée
- [ ] Recommandations en temps réel

---

## Support et Contact

Pour toute question ou problème concernant le questionnaire :

- **Email** : team.travliaq@gmail.com
- **Documentation** : https://docs.travliaq.com
- **GitHub** : https://github.com/travliaq/questionnaire

---

## Licence

© 2025 Travliaq. Tous droits réservés.

Ce schéma et cette documentation sont la propriété de Travliaq et ne peuvent être reproduits sans autorisation.
