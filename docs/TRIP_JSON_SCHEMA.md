# JSON Schema pour les Trips Travliaq

Ce document définit le schéma JSON standard pour créer des voyages dans Travliaq, incluant un exemple complet basé sur le trip Tokyo & Kyoto.

## Table des matières

1. [JSON Schema Standard](#json-schema-standard)
2. [Exemple JSON Complet](#exemple-json-complet)
3. [Fonction SQL d'Insertion](#fonction-sql-dinsertion)
4. [Statistiques Dynamiques du Footer](#statistiques-dynamiques-du-footer)
5. [Utilisation](#utilisation)

---

## JSON Schema Standard

Schéma JSON conforme à **JSON Schema Draft 7** définissant la structure complète d'un trip avec ses steps.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://travliaq.com/schemas/trip.json",
  "title": "Travliaq Trip",
  "description": "Schéma complet pour définir un voyage avec toutes ses étapes",
  "type": "object",
  "required": ["code", "destination", "total_days", "steps"],
  "properties": {
    "code": {
      "type": "string",
      "description": "Code unique du voyage (majuscules et chiffres recommandés)",
      "pattern": "^[A-Z0-9]+$",
      "minLength": 3,
      "maxLength": 20,
      "examples": ["TOKYO2025", "PARIS2024", "SIDIBEL2025"]
    },
    "destination": {
      "type": "string",
      "description": "Nom de la destination principale",
      "minLength": 1,
      "examples": ["Tokyo & Kyoto", "Paris", "Sidi Bel Abbès"]
    },
    "destination_en": {
      "type": ["string", "null"],
      "description": "English translation of destination",
      "examples": ["Tokyo & Kyoto", "Paris", "Sidi Bel Abbes"]
    },
    "total_days": {
      "type": "integer",
      "description": "Nombre total de jours du voyage",
      "minimum": 1,
      "maximum": 365
    },
    "main_image": {
      "type": ["string", "null"],
      "description": "URL de l'image principale du voyage",
      "format": "uri",
      "examples": ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80"]
    },
    "flight_from": {
      "type": ["string", "null"],
      "description": "Ville de départ du vol",
      "examples": ["Paris", "Londres", "New York"]
    },
    "flight_to": {
      "type": ["string", "null"],
      "description": "Ville d'arrivée du vol",
      "examples": ["Tokyo", "Marrakech", "Rome"]
    },
    "flight_duration": {
      "type": ["string", "null"],
      "description": "Durée du vol",
      "examples": ["16h30", "2h15", "12h"]
    },
    "flight_type": {
      "type": ["string", "null"],
      "description": "Type de vol",
      "examples": ["Vol direct", "1 escale", "2 escales"]
    },
    "hotel_name": {
      "type": ["string", "null"],
      "description": "Nom de l'hôtel principal",
      "examples": ["Mitsui Garden Hotel Ginza", "Riad Les Bougainvilliers"]
    },
    "hotel_rating": {
      "type": ["number", "null"],
      "description": "Note de l'hôtel sur 5",
      "minimum": 0,
      "maximum": 5,
      "examples": [4.6, 4.2, 5.0]
    },
    "total_price": {
      "type": ["string", "null"],
      "description": "Prix total affiché (avec devise)",
      "examples": ["3 200 €", "1 500 €", "$2,800"]
    },
    "total_budget": {
      "type": ["string", "null"],
      "description": "Budget total estimé",
      "examples": ["3 200 €", "Modéré", "Luxe"]
    },
    "average_weather": {
      "type": ["string", "null"],
      "description": "Météo moyenne du voyage",
      "examples": ["21°C", "25°C", "18°C"]
    },
    "travel_style": {
      "type": ["string", "null"],
      "description": "Style de voyage",
      "examples": ["Culture & Gastronomie", "Aventure", "Détente & Spa"]
    },
    "travel_style_en": {
      "type": ["string", "null"],
      "description": "English translation of travel style",
      "examples": ["Culture & Gastronomy", "Adventure", "Relaxation & Spa"]
    },
    "start_date": {
      "type": ["string", "null"],
      "description": "Date de début du voyage (format ISO 8601)",
      "format": "date",
      "examples": ["2025-04-15", "2024-12-01"]
    },
    "travelers": {
      "type": ["integer", "null"],
      "description": "Nombre de voyageurs",
      "minimum": 1,
      "examples": [1, 2, 4]
    },
    "price_flights": {
      "type": ["string", "null"],
      "description": "Prix des vols (avec devise)",
      "examples": ["800 €", "$1,200", "€650"]
    },
    "price_hotels": {
      "type": ["string", "null"],
      "description": "Prix des hébergements (avec devise)",
      "examples": ["1 400 €", "$2,000", "€1,100"]
    },
    "price_transport": {
      "type": ["string", "null"],
      "description": "Prix des transports sur place (avec devise)",
      "examples": ["300 €", "$350", "€250"]
    },
    "price_activities": {
      "type": ["string", "null"],
      "description": "Prix des activités (avec devise)",
      "examples": ["700 €", "$800", "€600"]
    },
    "steps": {
      "type": "array",
      "description": "Liste des étapes du voyage",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["step_number", "day_number", "title"],
        "properties": {
          "step_number": {
            "type": "integer",
            "description": "Numéro d'ordre de l'étape (commence à 1)",
            "minimum": 1
          },
          "day_number": {
            "type": "integer",
            "description": "Jour du voyage (commence à 1)",
            "minimum": 1
          },
          "title": {
            "type": "string",
            "description": "Titre de l'étape",
            "minLength": 1,
            "examples": ["Arrivée à Tokyo", "Senso-ji Temple", "TeamLab Borderless"]
          },
          "title_en": {
            "type": ["string", "null"],
            "description": "English translation of title",
            "examples": ["Arrival in Tokyo", "Senso-ji Temple", "TeamLab Borderless"]
          },
          "subtitle": {
            "type": ["string", "null"],
            "description": "Sous-titre descriptif",
            "examples": ["Aéroport Narita", "Temple historique d'Asakusa"]
          },
          "subtitle_en": {
            "type": ["string", "null"],
            "description": "English translation of subtitle",
            "examples": ["Narita Airport", "Historic Asakusa Temple"]
          },
          "main_image": {
            "type": "string",
            "description": "URL de l'image principale de l'étape (OBLIGATOIRE - réutilisez des images cohérentes si nécessaire)",
            "format": "uri"
          },
          "is_summary": {
            "type": "boolean",
            "description": "Si true, cette étape représente le récapitulatif final du voyage (affiche une checkbox au lieu d'un numéro)",
            "default": false
          },
          "latitude": {
            "type": ["number", "null"],
            "description": "Latitude GPS (format décimal)",
            "minimum": -90,
            "maximum": 90,
            "examples": [35.6938, 48.8566]
          },
          "longitude": {
            "type": ["number", "null"],
            "description": "Longitude GPS (format décimal)",
            "minimum": -180,
            "maximum": 180,
            "examples": [139.7006, 2.3522]
          },
          "step_type": {
            "type": ["string", "null"],
            "description": "Type d'étape (optionnel)",
            "examples": ["activité", "restaurant", "transport", "hébergement", "visite", "loisir"]
          },
          "why": {
            "type": ["string", "null"],
            "description": "Pourquoi visiter cette étape (markdown supporté)"
          },
          "why_en": {
            "type": ["string", "null"],
            "description": "English translation of why section"
          },
          "tips": {
            "type": ["string", "null"],
            "description": "Conseils de l'IA pour cette étape (markdown supporté)"
          },
          "tips_en": {
            "type": ["string", "null"],
            "description": "English translation of tips"
          },
          "transfer": {
            "type": ["string", "null"],
            "description": "Informations de transfert/transport",
            "examples": ["75 min en Narita Express", "10 min à pied", "30 min en métro"]
          },
          "transfer_en": {
            "type": ["string", "null"],
            "description": "English translation of transfer info",
            "examples": ["75 min by Narita Express", "10 min walk", "30 min by subway"]
          },
          "suggestion": {
            "type": ["string", "null"],
            "description": "Suggestions supplémentaires (markdown supporté)"
          },
          "suggestion_en": {
            "type": ["string", "null"],
            "description": "English translation of suggestion"
          },
          "weather_icon": {
            "type": ["string", "null"],
            "description": "Emoji ou icône météo",
            "examples": ["☀️", "🌤️", "🌧️", "⛅", "🌥️"]
          },
          "weather_temp": {
            "type": ["string", "null"],
            "description": "Température",
            "examples": ["18°C", "25°C", "15°C"]
          },
          "weather_description": {
            "type": ["string", "null"],
            "description": "Description de la météo",
            "examples": ["Ensoleillé", "Nuageux", "Pluvieux"]
          },
          "weather_description_en": {
            "type": ["string", "null"],
            "description": "English translation of weather description",
            "examples": ["Sunny", "Cloudy", "Rainy"]
          },
          "price": {
            "type": ["number", "null"],
            "description": "Prix en euros de cette activité",
            "minimum": 0,
            "examples": [35, 50, 120]
          },
          "duration": {
            "type": ["string", "null"],
            "description": "Durée de l'activité",
            "examples": ["3h environ", "2h30", "Toute la journée"]
          },
          "images": {
            "type": "array",
            "description": "Galerie d'images supplémentaires",
            "items": {
              "type": "string",
              "format": "uri"
            },
            "default": []
          }
        }
      }
    }
  }
}
```

---

## Exemple JSON Complet

Voici un exemple JSON complet basé sur le trip **TOKYO2025** actuellement en base de données :

```json
{
  "code": "TOKYO2025",
  "destination": "Tokyo & Kyoto",
  "destination_en": "Tokyo & Kyoto",
  "total_days": 7,
  "main_image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
  "flight_from": "Paris",
  "flight_to": "Tokyo",
  "flight_duration": "16h30",
  "flight_type": "Vol direct",
  "hotel_name": "Mitsui Garden Hotel Ginza",
  "hotel_rating": 4.6,
  "total_price": "3 200 €",
  "total_budget": "3 200 €",
  "average_weather": "21°C",
  "travel_style": "Culture & Gastronomie",
  "travel_style_en": "Culture & Gastronomy",
  "start_date": "2025-04-15",
  "travelers": 2,
  "price_flights": "800 €",
  "price_hotels": "1 400 €",
  "price_transport": "300 €",
  "price_activities": "700 €",
  "steps": [
    {
      "step_number": 1,
      "day_number": 1,
      "title": "Arrivée à Tokyo",
      "subtitle": "Aéroport Narita",
      "main_image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
      "latitude": 35.6938,
      "longitude": 139.7006,
      "why": "Arrivée en après-midi à l'aéroport international de Narita, récupération des bagages et transfert vers l'hôtel. Cette première étape vous permet de vous acclimater doucement au décalage horaire.",
      "tips": "Prends une Suica Card à l'aéroport, c'est indispensable pour tous les transports en commun.",
      "transfer": "75 min en Narita Express",
      "suggestion": "Installation à l'hôtel et repos",
      "weather_icon": "🌤️",
      "weather_temp": "18°C",
      "weather_description": "Nuageux",
      "price": null,
      "duration": "3h environ",
      "images": []
    },
    {
      "step_number": 2,
      "day_number": 1,
      "title": "Shinjuku",
      "subtitle": "Quartier animé",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.6938,
      "longitude": 139.7006,
      "why": "Découverte du quartier le plus animé de Tokyo avec ses néons, restaurants et vie nocturne.",
      "tips": "Visite de l'observatoire gratuit du Tokyo Metropolitan Government.",
      "transfer": "À pied depuis l'hôtel",
      "suggestion": "Dîner à Omoide Yokocho",
      "weather_icon": "🌤️",
      "weather_temp": "18°C",
      "weather_description": "Nuageux",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 3,
      "day_number": 1,
      "title": "Golden Gai",
      "subtitle": "Soirée dans les bars traditionnels",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.6945,
      "longitude": 139.7046,
      "why": "Ambiance unique dans les petits bars de Golden Gai, quartier mythique de Tokyo.",
      "tips": "Attention, certains bars refusent les touristes. Soyez respectueux.",
      "transfer": "10 min à pied",
      "suggestion": "Bar hopping dans Golden Gai",
      "weather_icon": "🌤️",
      "weather_temp": "16°C",
      "weather_description": "Nuit claire",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 4,
      "day_number": 2,
      "title": "Senso-ji Temple",
      "subtitle": "Temple historique d'Asakusa",
      "main_image": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=80",
      "latitude": 35.7148,
      "longitude": 139.7967,
      "why": "Le plus ancien temple de Tokyo, dans le quartier traditionnel d'Asakusa.",
      "tips": "Arrive tôt pour éviter la foule et profiter de l'atmosphère.",
      "transfer": "30 min en métro",
      "suggestion": "Déjeuner dans les environs",
      "weather_icon": "☀️",
      "weather_temp": "20°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": null,
      "images": [
        "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80"
      ]
    },
    {
      "step_number": 5,
      "day_number": 2,
      "title": "TeamLab Borderless",
      "subtitle": "Musée d'art numérique",
      "main_image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
      "latitude": 35.6264,
      "longitude": 139.7753,
      "why": "Expérience immersive unique au monde dans ce musée d'art numérique interactif. Les installations lumineuses réagissent à votre présence.",
      "tips": "Réserve à l'avance, le créneau de 16h est recommandé. Porte des vêtements confortables.",
      "transfer": "45 min en métro depuis Asakusa",
      "suggestion": "Dîner à Odaiba avec vue sur Rainbow Bridge",
      "weather_icon": "☀️",
      "weather_temp": "20°C",
      "weather_description": "Ensoleillé",
      "price": 35,
      "duration": "2h30",
      "images": [
        "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80",
        "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800&q=80",
        "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&q=80"
      ]
    },
    {
      "step_number": 6,
      "day_number": 3,
      "title": "Tsukiji Outer Market",
      "subtitle": "Petit-déjeuner de sushis frais",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.6654,
      "longitude": 139.7707,
      "why": "Découverte du célèbre marché aux poissons de Tokyo, désormais dans sa partie extérieure accessible aux touristes.",
      "tips": "Arrive avant 7h pour éviter la foule et goûter aux meilleurs sushis de ta vie.",
      "transfer": "20 min en métro",
      "suggestion": "Visite du marché extérieur",
      "weather_icon": "☀️",
      "weather_temp": "19°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 7,
      "day_number": 3,
      "title": "Shibuya Crossing",
      "subtitle": "Le carrefour le plus fréquenté du monde",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.6595,
      "longitude": 139.7004,
      "why": "Expérience iconique de Tokyo : traverser le carrefour de Shibuya au milieu de milliers de personnes.",
      "tips": "Monte au Starbucks du Tsutaya pour avoir la meilleure vue sur le crossing.",
      "transfer": "15 min en métro",
      "suggestion": "Shopping dans le quartier",
      "weather_icon": "☀️",
      "weather_temp": "21°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 8,
      "day_number": 3,
      "title": "Harajuku & Takeshita Street",
      "subtitle": "Culture kawaii et mode japonaise",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.6702,
      "longitude": 139.7028,
      "why": "Immersion dans la culture jeune japonaise et ses boutiques excentriques.",
      "tips": "Goûte aux crêpes japonaises, une spécialité de Takeshita Street.",
      "transfer": "10 min à pied depuis Shibuya",
      "suggestion": "Visite du sanctuaire Meiji Jingu à proximité",
      "weather_icon": "☀️",
      "weather_temp": "22°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 9,
      "day_number": 4,
      "title": "Shinkansen vers Kyoto",
      "subtitle": "Train à grande vitesse",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.6762,
      "longitude": 139.7649,
      "why": "Voyage en train à grande vitesse, expérience typiquement japonaise.",
      "tips": "Réserve un siège côté Mont Fuji pour une vue spectaculaire.",
      "transfer": "2h15 en Shinkansen",
      "suggestion": "Achète un bento à la gare pour le trajet",
      "weather_icon": "☀️",
      "weather_temp": "20°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": "2h15",
      "images": []
    },
    {
      "step_number": 10,
      "day_number": 4,
      "title": "Fushimi Inari Taisha",
      "subtitle": "Les milliers de torii vermillon",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 34.9671,
      "longitude": 135.7727,
      "why": "Sanctuaire mythique avec ses milliers de portes torii rouges serpentant sur la montagne.",
      "tips": "Monte jusqu'au sommet (2h aller-retour) pour éviter la foule et profiter de la vue.",
      "transfer": "30 min en train local",
      "suggestion": "Balade dans le quartier de Gion en soirée",
      "weather_icon": "☀️",
      "weather_temp": "19°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 11,
      "day_number": 5,
      "title": "Arashiyama",
      "subtitle": "Forêt de bambous et temples zen",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.0094,
      "longitude": 135.6724,
      "why": "Escapade nature dans la célèbre forêt de bambous d'Arashiyama.",
      "tips": "Visite tôt le matin pour profiter de la forêt sans touristes.",
      "transfer": "45 min en train",
      "suggestion": "Visite du temple Tenryu-ji",
      "weather_icon": "⛅",
      "weather_temp": "18°C",
      "weather_description": "Partiellement nuageux",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 12,
      "day_number": 6,
      "title": "Kinkaku-ji",
      "subtitle": "Le Pavillon d'Or",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.0394,
      "longitude": 135.7292,
      "why": "Temple zen recouvert d'or pur, reflet parfait dans son étang.",
      "tips": "Visite en matinée pour la meilleure lumière sur le pavillon doré.",
      "transfer": "20 min en bus",
      "suggestion": "Balade dans le jardin zen",
      "weather_icon": "☀️",
      "weather_temp": "20°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 13,
      "day_number": 7,
      "title": "Retour à Tokyo",
      "subtitle": "Dernière journée",
      "main_image": "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1920&q=80",
      "latitude": 35.6762,
      "longitude": 139.7649,
      "why": "Retour à Tokyo pour les derniers achats et le vol retour.",
      "tips": "Prévois 3h avant le vol pour arriver à l'aéroport de Narita.",
      "transfer": "2h30 en Shinkansen + 75 min Narita Express",
      "suggestion": "Shopping de dernière minute à la gare de Tokyo",
      "weather_icon": "☀️",
      "weather_temp": "19°C",
      "weather_description": "Ensoleillé",
      "price": null,
      "duration": null,
      "images": []
    },
    {
      "step_number": 14,
      "day_number": 7,
      "title": "Récapitulatif de votre voyage",
      "subtitle": "Fin de l'itinéraire",
      "main_image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80",
      "is_summary": true,
      "latitude": 35.6938,
      "longitude": 139.7006,
      "why": "",
      "tips": "",
      "transfer": "",
      "suggestion": "",
      "weather_icon": "✅",
      "weather_temp": "",
      "weather_description": null,
      "price": null,
      "duration": null,
      "images": []
    }
  ]
}
```

---

## Fonction SQL d'Insertion

Cette fonction PostgreSQL permet d'insérer directement un objet JSON dans la base de données.

### Création de la fonction

```sql
CREATE OR REPLACE FUNCTION insert_trip_from_json(trip_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_trip_id uuid;
  step_item jsonb;
BEGIN
  -- Insertion du trip principal
  INSERT INTO trips (
    code,
    destination,
    destination_en,
    total_days,
    main_image,
    flight_from,
    flight_to,
    flight_duration,
    flight_type,
    hotel_name,
    hotel_rating,
    total_price,
    total_budget,
    average_weather,
    travel_style,
    travel_style_en,
    start_date,
    travelers,
    price_flights,
    price_hotels,
    price_transport,
    price_activities
  ) VALUES (
    trip_data->>'code',
    trip_data->>'destination',
    NULLIF(trip_data->>'destination_en', ''),
    (trip_data->>'total_days')::integer,
    NULLIF(trip_data->>'main_image', ''),
    NULLIF(trip_data->>'flight_from', ''),
    NULLIF(trip_data->>'flight_to', ''),
    NULLIF(trip_data->>'flight_duration', ''),
    NULLIF(trip_data->>'flight_type', ''),
    NULLIF(trip_data->>'hotel_name', ''),
    NULLIF(trip_data->>'hotel_rating', '')::numeric,
    NULLIF(trip_data->>'total_price', ''),
    NULLIF(trip_data->>'total_budget', ''),
    NULLIF(trip_data->>'average_weather', ''),
    NULLIF(trip_data->>'travel_style', ''),
    NULLIF(trip_data->>'travel_style_en', ''),
    NULLIF(trip_data->>'start_date', '')::date,
    NULLIF(trip_data->>'travelers', '')::integer,
    NULLIF(trip_data->>'price_flights', ''),
    NULLIF(trip_data->>'price_hotels', ''),
    NULLIF(trip_data->>'price_transport', ''),
    NULLIF(trip_data->>'price_activities', '')
  ) RETURNING id INTO new_trip_id;
  
  -- Insertion des steps
  FOR step_item IN SELECT * FROM jsonb_array_elements(trip_data->'steps')
  LOOP
    INSERT INTO steps (
      trip_id,
      step_number,
      day_number,
      title,
      title_en,
      subtitle,
      subtitle_en,
      main_image,
      is_summary,
      step_type,
      latitude,
      longitude,
      why,
      why_en,
      tips,
      tips_en,
      transfer,
      transfer_en,
      suggestion,
      suggestion_en,
      weather_icon,
      weather_temp,
      weather_description,
      weather_description_en,
      price,
      duration,
      images
    ) VALUES (
      new_trip_id,
      (step_item->>'step_number')::integer,
      (step_item->>'day_number')::integer,
      step_item->>'title',
      NULLIF(step_item->>'title_en', ''),
      NULLIF(step_item->>'subtitle', ''),
      NULLIF(step_item->>'subtitle_en', ''),
      step_item->>'main_image',
      COALESCE((step_item->>'is_summary')::boolean, false),
      NULLIF(step_item->>'step_type', ''),
      NULLIF(step_item->>'latitude', '')::numeric,
      NULLIF(step_item->>'longitude', '')::numeric,
      NULLIF(step_item->>'why', ''),
      NULLIF(step_item->>'why_en', ''),
      NULLIF(step_item->>'tips', ''),
      NULLIF(step_item->>'tips_en', ''),
      NULLIF(step_item->>'transfer', ''),
      NULLIF(step_item->>'transfer_en', ''),
      NULLIF(step_item->>'suggestion', ''),
      NULLIF(step_item->>'suggestion_en', ''),
      NULLIF(step_item->>'weather_icon', ''),
      NULLIF(step_item->>'weather_temp', ''),
      NULLIF(step_item->>'weather_description', ''),
      NULLIF(step_item->>'weather_description_en', ''),
      NULLIF(step_item->>'price', '')::numeric,
      NULLIF(step_item->>'duration', ''),
      COALESCE(step_item->'images', '[]'::jsonb)
    );
  END LOOP;
  
  RETURN new_trip_id;
END;
$$;
```

### Utilisation de la fonction

```sql
-- Insérer un trip depuis un fichier JSON
SELECT insert_trip_from_json('
{
  "code": "TOKYO2025",
  "destination": "Tokyo & Kyoto",
  ...
}'::jsonb);

-- Ou depuis une variable
DO $$
DECLARE
  trip_json jsonb := '{...votre JSON...}';
  new_id uuid;
BEGIN
  new_id := insert_trip_from_json(trip_json);
  RAISE NOTICE 'Trip créé avec l''ID: %', new_id;
END $$;
```

### Vérification de l'insertion

```sql
-- Vérifier que le trip a été créé
SELECT * FROM trips WHERE code = 'TOKYO2025';

-- Vérifier les steps associées
SELECT s.step_number, s.day_number, s.title, s.subtitle
FROM steps s
JOIN trips t ON s.trip_id = t.id
WHERE t.code = 'TOKYO2025'
ORDER BY s.day_number, s.step_number;

-- Compter les steps
SELECT t.code, t.destination, COUNT(s.id) as total_steps
FROM trips t
LEFT JOIN steps s ON s.trip_id = t.id
WHERE t.code = 'TOKYO2025'
GROUP BY t.id, t.code, t.destination;
```

---

## Statistiques Dynamiques du Footer

Le système supporte des statistiques **flexibles et personnalisables** pour chaque trip via le champ `summary_stats` dans l'étape summary.

### Configuration des Stats

Les statistiques sont définies dans l'étape `is_summary: true` via le champ `summary_stats` (array de stats).

Chaque stat a un `type` :
- **Prédéfinis**: `days`, `budget`, `weather`, `style`, `cities`, `people`, `activities`
- **Personnalisé**: `custom` (avec `icon`, `label`, `color`)

**Exemple avec 8 stats variées** :

```json
{
  "step_number": 16,
  "day_number": 7,
  "title": "Résumé du voyage",
  "is_summary": true,
  "main_image": "...",
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
```

**Insertion SQL** :

```sql
INSERT INTO steps (
  trip_id, step_number, day_number, title, is_summary, main_image, summary_stats
) VALUES (
  (SELECT id FROM trips WHERE code = 'TOKYO2025'),
  16, 7, 'Résumé du voyage', true,
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80',
  '[
    {"type": "days", "value": 7},
    {"type": "budget", "value": "3 200 €"},
    {"type": "weather", "value": "21°C"},
    {"type": "style", "value": "Culture & Gastronomie"},
    {"type": "cities", "value": 3},
    {"type": "people", "value": 2},
    {"type": "activities", "value": 15},
    {"type": "custom", "value": "Direct", "icon": "Plane", "label": "VOL", "color": "golden"}
  ]'::jsonb
);
```

### Types de Stats Disponibles

| Type | Description | Couleur | Exemple |
|------|-------------|---------|---------|
| `days` | Nombre de jours | Turquoise | `{"type": "days", "value": 7}` |
| `budget` | Budget total | Golden | `{"type": "budget", "value": "3 200 €"}` |
| `weather` | Météo moyenne | Turquoise | `{"type": "weather", "value": "21°C"}` |
| `style` | Style de voyage | Golden | `{"type": "style", "value": "Culture"}` |
| `cities` | Nombre de villes | Turquoise | `{"type": "cities", "value": 3}` |
| `people` | Nombre de voyageurs | Golden | `{"type": "people", "value": 2}` |
| `activities` | Nombre d'étapes | Turquoise | `{"type": "activities", "value": 15}` |
| `custom` | Stat personnalisée | Au choix | `{"type": "custom", "value": "5★", "icon": "Hotel", "label": "HÔTEL", "color": "golden"}` |

### Exemples de Configurations

**Trip Culturel Complet (8 stats)** :
```json
[
  {"type": "days", "value": 7},
  {"type": "budget", "value": "3 200 €"},
  {"type": "weather", "value": "21°C"},
  {"type": "style", "value": "Culture & Gastronomie"},
  {"type": "cities", "value": 3},
  {"type": "people", "value": 2},
  {"type": "activities", "value": 15},
  {"type": "custom", "value": "Direct", "icon": "Plane", "label": "VOL", "color": "golden"}
]
```

**Trip Aventure Minimaliste (5 stats)** :
```json
[
  {"type": "days", "value": 10},
  {"type": "weather", "value": "15°C"},
  {"type": "style", "value": "Aventure & Randonnée"},
  {"type": "people", "value": 4},
  {"type": "activities", "value": 8}
]
```

**Trip Luxe avec Détails (8 stats)** :
```json
[
  {"type": "days", "value": 5},
  {"type": "budget", "value": "5 500 €"},
  {"type": "weather", "value": "28°C"},
  {"type": "style", "value": "Luxe & Détente"},
  {"type": "people", "value": 2},
  {"type": "custom", "value": "1", "icon": "Plane", "label": "ESCALE", "color": "turquoise"},
  {"type": "custom", "value": "5★", "icon": "Hotel", "label": "HÔTEL", "color": "golden"},
  {"type": "custom", "value": "Spa inclus", "icon": "Sparkles", "label": "BONUS", "color": "turquoise"}
]
```

### Comportement par Défaut

Si `summary_stats` n'est **pas défini**, le système génère automatiquement 5 stats depuis les données du trip :
1. `days` (depuis `trips.total_days`)
2. `budget` (depuis `trips.total_budget`)
3. `weather` (depuis `trips.average_weather`)
4. `style` (depuis `trips.travel_style`)
5. `activities` (nombre de steps non-summary)

### Recommandations

- **Nombre**: 4-8 stats (idéal : 6-8)
- **Alternance**: Variez turquoise/golden pour un rendu harmonieux
- **Pertinence**: Choisissez les stats qui **mettent en valeur** votre trip

📖 **Guide détaillé** : Voir `docs/SUMMARY_STATS_GUIDE.md` pour tous les exemples et la liste complète des icônes.

---

## Utilisation

### 1. Créer votre JSON

1. Copiez l'exemple JSON ci-dessus
2. Modifiez les valeurs selon votre voyage
3. Validez votre JSON contre le schéma (optionnel)

### 2. Insérer en base de données

```sql
-- Option 1 : Via la fonction SQL
SELECT insert_trip_from_json('[votre JSON]'::jsonb);

-- Option 2 : Via psql avec un fichier
\set trip_json `cat trip.json`
SELECT insert_trip_from_json(:'trip_json'::jsonb);
```

### 3. Accéder au voyage

Une fois inséré, accédez au voyage via l'une de ces URLs :

```
https://votresite.com/recommendations?code=TOKYO2025
https://votresite.com/recommendations/TOKYO2025
```

### 4. Validation du schéma (optionnel)

Pour valider votre JSON avant insertion :

```bash
# Avec Node.js et ajv
npm install ajv ajv-formats
node validate-trip.js trip.json

# Ou avec Python et jsonschema
pip install jsonschema
python validate-trip.py trip.json
```

### 5. Mise à jour d'un trip existant

```sql
-- Supprimer les steps existantes
DELETE FROM steps WHERE trip_id = (SELECT id FROM trips WHERE code = 'TOKYO2025');

-- Supprimer le trip
DELETE FROM trips WHERE code = 'TOKYO2025';

-- Réinsérer avec la fonction
SELECT insert_trip_from_json('[nouveau JSON]'::jsonb);
```

---

## Notes importantes

1. **Champs obligatoires** :
   - `code`, `destination`, `total_days`, `steps`
   - Pour chaque step : `step_number`, `day_number`, `title`, `main_image`

2. **Image de fond (main_image)** :
   - **OBLIGATOIRE** pour chaque step, pas de step sans background
   - Réutilisez intelligemment les images existantes du trip si nécessaire pour cohérence visuelle
   - Format recommandé : URLs Unsplash ou similaires en 1920px de large minimum

3. **Step de récapitulatif (is_summary)** :
   - Ajoutez une dernière step avec `is_summary: true` pour afficher le widget de fin
   - Cette step affiche une checkbox ✓ au lieu d'un numéro d'étape
   - Les champs `why`, `tips`, `transfer`, `suggestion` peuvent être vides pour cette step

4. **Types de données** :
   - **Code unique** : Le champ `code` doit être unique dans la table `trips`
   - **Coordonnées GPS** : Utilisez le format décimal (ex: `35.6938`, pas `35°41'38"N`)
   - **Images** : Les URLs doivent être accessibles publiquement
   - **Champs optionnels** : Utilisez `null` pour les champs non renseignés (pas de chaînes vides)
   - **Arrays vides** : Pour `images`, utilisez `[]` plutôt que `null`
   - **Dates** : Format ISO 8601 (`YYYY-MM-DD`)
   - **Prix** : En euros (type `number` pour les steps, `string` pour le trip total)
   - **Météo** : Préférez les emojis standards (☀️, 🌤️, ⛅, 🌥️, 🌧️, ⛈️, 🌨️)

---

## Support

- Documentation générale : `docs/README_DYNAMIC_SYSTEM.md`
- Guide d'insertion : `docs/TRIP_INSERT_EXAMPLE.sql`
- Exemples de trips : `docs/DYNAMIC_TRIPS_GUIDE.md`
- Trip de démo : `TOKYO2025` et `SIDIBEL2025`
