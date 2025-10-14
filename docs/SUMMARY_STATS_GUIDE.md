# Guide des Statistiques Dynamiques du Summary

## Vue d'ensemble

Chaque trip possède une étape **summary** (résumé) qui affiche jusqu'à 8 statistiques flexibles. Ces statistiques ne sont **pas fixes** et peuvent varier d'un trip à l'autre selon ce que vous souhaitez mettre en avant.

## Types de Statistiques Disponibles

### 1. **days** - Nombre de jours
Affiche la durée totale du voyage.
- **Couleur**: Turquoise (bleu-vert)
- **Icône**: Calendrier
- **Exemple**: "7" avec label "JOURS"

```json
{
  "type": "days",
  "value": 7
}
```

### 2. **budget** - Budget total
Affiche le budget ou prix du voyage.
- **Couleur**: Golden (doré)
- **Icône**: Wallet
- **Exemple**: "3 200 €" avec label "BUDGET"

```json
{
  "type": "budget",
  "value": "3 200 €"
}
```

### 3. **weather** - Météo moyenne
Affiche la température moyenne pendant le séjour.
- **Couleur**: Turquoise
- **Icône**: Soleil
- **Exemple**: "21°C" avec label "MÉTÉO"

```json
{
  "type": "weather",
  "value": "21°C"
}
```

### 4. **style** - Style de voyage
Décrit le type de voyage (culture, aventure, détente...).
- **Couleur**: Golden
- **Icône**: Sac à dos
- **Exemple**: "Culture & Gastronomie" avec label "STYLE"

```json
{
  "type": "style",
  "value": "Culture & Gastronomie"
}
```

### 5. **cities** - Nombre de villes
Affiche combien de villes sont visitées.
- **Couleur**: Turquoise
- **Icône**: Map
- **Exemple**: "3" avec label "VILLES"

```json
{
  "type": "cities",
  "value": 3
}
```

### 6. **people** - Nombre de voyageurs
Affiche pour combien de personnes le voyage est prévu.
- **Couleur**: Golden
- **Icône**: Users
- **Exemple**: "2" avec label "VOYAGEURS"

```json
{
  "type": "people",
  "value": 2
}
```

### 7. **activities** - Nombre d'activités
Affiche le nombre d'étapes/activités du voyage.
- **Couleur**: Turquoise
- **Icône**: Activity (graphique d'activité)
- **Exemple**: "15" avec label "ACTIVITÉS"

```json
{
  "type": "activities",
  "value": 15
}
```

### 8. **custom** - Statistique personnalisée
Créez une stat entièrement personnalisée avec vos propres icône, valeur, label et couleur.
- **Couleur**: Au choix (turquoise ou golden)
- **Icône**: Au choix (nom Lucide React)
- **Exemples**: 
  - Vol direct: `"Direct"` avec label `"VOL"`
  - Hôtel: `"4.6★"` avec label `"HÔTEL"`
  - Escales: `"0"` avec label `"ESCALES"`

```json
{
  "type": "custom",
  "value": "Direct",
  "icon": "Plane",
  "label": "VOL",
  "color": "golden"
}
```

## Comment Définir les Stats d'un Trip

### Dans le JSON du Trip

Ajoutez le champ `summary_stats` dans l'étape summary (celle avec `is_summary: true`) :

```json
{
  "code": "TOKYO2025",
  "destination": "Tokyo & Kyoto",
  "total_days": 7,
  "steps": [
    {
      "step_number": 1,
      "day_number": 1,
      "title": "Arrivée à Tokyo",
      "is_summary": false,
      "..."
    },
    {
      "step_number": 16,
      "day_number": 7,
      "title": "Résumé du voyage",
      "is_summary": true,
      "summary_stats": [
        { "type": "days", "value": 7 },
        { "type": "budget", "value": "3 200 €" },
        { "type": "weather", "value": "21°C" },
        { "type": "style", "value": "Culture & Gastronomie" },
        { "type": "cities", "value": 3 },
        { "type": "people", "value": 2 },
        { "type": "activities", "value": 15 },
        { "type": "custom", "value": "Direct", "icon": "Plane", "label": "VOL", "color": "golden" }
      ]
    }
  ]
}
```

### Insertion SQL Directe

```sql
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title,
  is_summary,
  summary_stats,
  main_image
) VALUES (
  (SELECT id FROM trips WHERE code = 'TOKYO2025'),
  16,
  7,
  'Résumé du voyage',
  true,
  '[
    {"type": "days", "value": 7},
    {"type": "budget", "value": "3 200 €"},
    {"type": "weather", "value": "21°C"},
    {"type": "style", "value": "Culture & Gastronomie"},
    {"type": "cities", "value": 3},
    {"type": "people", "value": 2},
    {"type": "activities", "value": 15},
    {"type": "custom", "value": "Direct", "icon": "Plane", "label": "VOL", "color": "golden"}
  ]'::jsonb,
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80'
);
```

## Exemples de Configurations

### Trip Culturel Complet (8 stats)
```json
"summary_stats": [
  { "type": "days", "value": 7 },
  { "type": "budget", "value": "3 200 €" },
  { "type": "weather", "value": "21°C" },
  { "type": "style", "value": "Culture & Gastronomie" },
  { "type": "cities", "value": 3 },
  { "type": "people", "value": 2 },
  { "type": "activities", "value": 15 },
  { "type": "custom", "value": "Direct", "icon": "Plane", "label": "VOL", "color": "golden" }
]
```

### Trip Aventure Minimaliste (5 stats)
```json
"summary_stats": [
  { "type": "days", "value": 10 },
  { "type": "weather", "value": "15°C" },
  { "type": "style", "value": "Aventure & Randonnée" },
  { "type": "people", "value": 4 },
  { "type": "activities", "value": 8 }
]
```

### Trip Luxe avec Détails (8 stats)
```json
"summary_stats": [
  { "type": "days", "value": 5 },
  { "type": "budget", "value": "5 500 €" },
  { "type": "weather", "value": "28°C" },
  { "type": "style", "value": "Luxe & Détente" },
  { "type": "people", "value": 2 },
  { "type": "custom", "value": "1", "icon": "Plane", "label": "ESCALE", "color": "turquoise" },
  { "type": "custom", "value": "5★", "icon": "Hotel", "label": "HÔTEL", "color": "golden" },
  { "type": "custom", "value": "Spa inclus", "icon": "Sparkles", "label": "BONUS", "color": "turquoise" }
]
```

### Road Trip Simple (6 stats)
```json
"summary_stats": [
  { "type": "days", "value": 14 },
  { "type": "budget", "value": "1 800 €" },
  { "type": "style", "value": "Road Trip" },
  { "type": "cities", "value": 8 },
  { "type": "people", "value": 3 },
  { "type": "custom", "value": "Location", "icon": "Car", "label": "VÉHICULE", "color": "golden" }
]
```

## Comportement par Défaut (Sans summary_stats)

Si vous ne spécifiez pas `summary_stats` dans l'étape summary, le système génère automatiquement 5 statistiques à partir des données du trip :

1. **days**: Depuis `trips.total_days`
2. **budget**: Depuis `trips.total_budget`
3. **weather**: Depuis `trips.average_weather`
4. **style**: Depuis `trips.travel_style`
5. **activities**: Nombre total de steps (non-summary)

Exemple de trip minimal :
```sql
-- Sans summary_stats défini, le système affichera automatiquement:
-- 7 JOURS | 3 200 € BUDGET | 21°C MÉTÉO | Culture & Gastronomie STYLE | 15 ACTIVITÉS
INSERT INTO trips (code, destination, total_days, total_budget, average_weather, travel_style) 
VALUES ('SIMPLE2025', 'Paris', 7, '3 200 €', '21°C', 'Culture & Gastronomie');
```

## Icônes Disponibles (Lucide React)

Voici les icônes les plus utiles pour les stats custom :

- **Transport**: `Plane`, `Train`, `Car`, `Ship`, `Bus`
- **Hébergement**: `Hotel`, `Home`, `Building`, `Tent`
- **Activités**: `Mountain`, `UtensilsCrossed`, `Camera`, `Music`, `Palette`
- **Général**: `MapPin`, `Clock`, `Star`, `Heart`, `Award`, `Trophy`, `Sparkles`
- **Nature**: `Sun`, `Cloud`, `CloudRain`, `Snowflake`, `Trees`, `Waves`

Liste complète : [https://lucide.dev/icons/](https://lucide.dev/icons/)

## Recommandations

### Nombre de Stats
- **Minimum**: 4 stats (pour éviter un footer vide)
- **Maximum**: 8 stats (pour un affichage équilibré sur 2 lignes)
- **Idéal**: 6-8 stats pour un rendu complet

### Alternance des Couleurs
Alternez turquoise et golden pour un rendu visuel harmonieux :
```json
[
  { "type": "days", "value": 7 },           // Turquoise
  { "type": "budget", "value": "3 200 €" }, // Golden
  { "type": "weather", "value": "21°C" },   // Turquoise
  { "type": "style", "value": "Culture" },  // Golden
  { "type": "cities", "value": 3 },         // Turquoise
  { "type": "people", "value": 2 }          // Golden
]
```

### Choix des Stats
Choisissez les stats qui **mettent en valeur** votre trip :
- **Trip budget**: Incluez `budget` et `custom` avec hôtel/vol
- **Trip aventure**: Mettez en avant `activities`, `cities`, `weather`
- **Trip luxe**: Insistez sur les stats custom (hôtel 5★, spa, etc.)
- **Trip famille**: Montrez `people`, `activities`, `style`

## Structure JSON Complète

```json
{
  "type": "days" | "budget" | "weather" | "style" | "cities" | "people" | "activities" | "custom",
  "value": "string ou number",
  "icon": "string (nom Lucide) - optionnel, uniquement pour custom",
  "label": "string - optionnel, uniquement pour custom",
  "color": "turquoise" | "golden" - optionnel, uniquement pour custom"
}
```

## Migration d'un Ancien Trip

Si vous avez un trip sans `summary_stats`, ajoutez-le via SQL :

```sql
UPDATE steps 
SET summary_stats = '[
  {"type": "days", "value": 7},
  {"type": "budget", "value": "3 200 €"},
  {"type": "weather", "value": "21°C"},
  {"type": "style", "value": "Culture & Gastronomie"}
]'::jsonb
WHERE trip_id = (SELECT id FROM trips WHERE code = 'VOTRECODE')
  AND is_summary = true;
```

## Debugging

### Vérifier les stats d'un trip
```sql
SELECT 
  t.code,
  s.title,
  s.summary_stats
FROM trips t
JOIN steps s ON s.trip_id = t.id
WHERE t.code = 'TOKYO2025'
  AND s.is_summary = true;
```

### Tester différentes combinaisons
Créez un trip de test avec différentes configs pour voir le rendu :
```sql
SELECT insert_trip_from_json('{
  "code": "TEST2025",
  "destination": "Test",
  "total_days": 5,
  "steps": [
    {
      "step_number": 1,
      "day_number": 1,
      "title": "Summary",
      "main_image": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1920&q=80",
      "is_summary": true,
      "summary_stats": [
        {"type": "days", "value": 5},
        {"type": "budget", "value": "1 000 €"}
      ]
    }
  ]
}'::jsonb);
```

Puis accédez à : `https://votresite.com/recommendations?code=TEST2025`
