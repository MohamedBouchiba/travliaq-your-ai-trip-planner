# Guide d'utilisation du système de voyages dynamique

## Vue d'ensemble

Le système de recommandations de voyages est entièrement dynamique et stocké dans Supabase. Vous pouvez créer, modifier et gérer des voyages avec une grande flexibilité.

## Structure de la base de données

### Table `trips`

Contient les informations principales du voyage.

#### Champs obligatoires :
- `code` (text) : Code unique du voyage (ex: "TOKYO2025", "SIDIBEL2025")
- `destination` (text) : Nom de la destination
- `total_days` (integer) : Nombre total de jours

#### Champs optionnels :
- `main_image` (text) : URL de l'image principale
- `flight_from` (text) : Ville de départ du vol
- `flight_to` (text) : Ville d'arrivée du vol
- `flight_duration` (text) : Durée du vol (ex: "16h30")
- `flight_type` (text) : Type de vol (ex: "Vol direct")
- `hotel_name` (text) : Nom de l'hôtel
- `hotel_rating` (numeric) : Note de l'hôtel (ex: 4.6)
- `total_price` (text) : Prix total (ex: "2 500 € TTC")
- `total_budget` (text) : Budget total (ex: "3 200 €")
- `travelers` (integer) : Nombre de voyageurs
- `price_flights` (text) : Prix des vols (ex: "800 €")
- `price_hotels` (text) : Prix des hébergements (ex: "1 400 €")
- `price_transport` (text) : Prix des transports sur place (ex: "300 €")
- `price_activities` (text) : Prix des activités (ex: "700 €")
- `average_weather` (text) : Météo moyenne (ex: "21°C")
- `travel_style` (text) : Style de voyage (ex: "Culture & Gastronomie")
- `travel_style_en` (text) : Traduction anglaise du style de voyage
- `destination_en` (text) : Traduction anglaise de la destination
- `start_date` (date) : Date de début du voyage

### Table `steps`

Contient les étapes individuelles de chaque voyage.

#### Champs obligatoires :
- `trip_id` (uuid) : ID du voyage parent
- `step_number` (integer) : Numéro de l'étape (ordre d'affichage)
- `day_number` (integer) : Jour du voyage
- `title` (text) : Titre de l'étape

#### Champs optionnels :
- `subtitle` (text) : Sous-titre de l'étape
- `main_image` (text) : URL de l'image principale
- `latitude` (numeric) : Latitude GPS
- `longitude` (numeric) : Longitude GPS
- `why` (text) : Pourquoi cette étape ?
- `why_en` (text) : Traduction anglaise du "pourquoi"
- `tips` (text) : Conseils IA
- `tips_en` (text) : Traduction anglaise des conseils
- `transfer` (text) : Informations sur le transfert
- `transfer_en` (text) : Traduction anglaise du transfert
- `suggestion` (text) : Suggestions d'activités
- `suggestion_en` (text) : Traduction anglaise des suggestions
- `weather_icon` (text) : Icône météo (emoji)
- `weather_temp` (text) : Température (ex: "18°C")
- `weather_description` (text) : Description météo
- `weather_description_en` (text) : Traduction anglaise de la météo
- `price` (numeric) : Prix de l'étape en euros
- `duration` (text) : Durée de l'étape (ex: "3h")
- `images` (jsonb array) : Galerie d'images supplémentaires
- `step_type` (text) : Type d'étape (ex: "activité", "restaurant", "transport") **NOUVEAU**

## Comment ajouter un nouveau voyage

### 1. Créer le voyage principal

```sql
INSERT INTO trips (
  code,
  destination,
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
  start_date
) VALUES (
  'PARIS2025',
  'Paris',
  5,
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80',
  'Nice',
  'Paris',
  '1h30',
  'Vol direct',
  'Hôtel Plaza Athénée',
  4.8,
  '1 800 € TTC',
  '2 000 €',
  '15°C',
  'Culture & Shopping',
  '2025-06-01'
);
```

### 2. Ajouter des étapes

Exemple d'étape complète avec tous les champs :

```sql
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title,
  subtitle,
  main_image,
  latitude,
  longitude,
  why,
  tips,
  transfer,
  suggestion,
  weather_icon,
  weather_temp,
  weather_description,
  price,
  duration,
  images
) VALUES (
  (SELECT id FROM trips WHERE code = 'PARIS2025'),
  1,
  1,
  'Tour Eiffel',
  'Monument emblématique',
  'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=1920&q=80',
  48.8584,
  2.2945,
  'La Tour Eiffel est le symbole de Paris et offre une vue imprenable sur la ville.',
  'Réservez vos billets en ligne pour éviter la file d''attente. Privilégiez la fin d''après-midi pour profiter du coucher de soleil.',
  '30 min en métro ligne 6 depuis votre hôtel',
  'Pique-nique au Champ de Mars ou restaurant Jules Verne pour une expérience gastronomique',
  '☀️',
  '16°C',
  'Ensoleillé',
  32.50,
  '2h30',
  '["https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80"]'::jsonb
);
```

Exemple d'étape minimaliste (seulement les champs obligatoires) :

```sql
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title
) VALUES (
  (SELECT id FROM trips WHERE code = 'PARIS2025'),
  2,
  1,
  'Déjeuner libre'
);
```

## Accéder à un voyage

Les voyages sont accessibles via deux formats d'URL :

1. **Query parameter** : `/recommendations?code=TOKYO2025`
2. **Path parameter** : `/recommendations/TOKYO2025`

Le code est insensible à la casse, aux espaces et aux caractères spéciaux.

## Flexibilité du système

### Affichage conditionnel

Tous les champs optionnels sont affichés conditionnellement :
- Si un champ est vide ou null, il ne sera pas affiché
- Vous pouvez créer des étapes avec uniquement un titre
- Vous pouvez créer des voyages sans vol, sans hôtel, etc.

### Exemples d'utilisation

**Voyage complet avec tous les détails** :
- Vol, hôtel, prix, toutes les étapes avec descriptions complètes
- Idéal pour : forfaits tout compris

**Voyage minimaliste** :
- Juste la destination et les étapes principales
- Idéal pour : road trips, voyages DIY

**Voyage hybride** :
- Certaines étapes détaillées, d'autres basiques
- Idéal pour : voyages semi-organisés

## Gestion des images

### Images principales
- Format recommandé : 1920x1080 ou supérieur
- Source recommandée : Unsplash, Pexels

### Galerie d'images
Format JSON array :
```json
["url1", "url2", "url3"]
```

## Coordonnées GPS

Les coordonnées sont optionnelles mais recommandées pour :
- L'affichage sur la carte interactive
- La navigation entre les étapes

Si non fournies, les étapes apparaîtront quand même dans le planning mais pas sur la carte.

## Tips pour une expérience optimale

1. **Codes uniques** : Utilisez des codes faciles à retenir (ex: DESTINATION + ANNÉE)
2. **Images cohérentes** : Gardez un style visuel cohérent
3. **Descriptions** : Soyez concis mais informatif (50-150 mots par section)
4. **Prix** : Indiquez toujours la devise
5. **Météo** : Utilisez des emojis météo standard : ☀️ 🌤️ ⛅ 🌧️ ❄️
6. **Ordre des étapes** : Utilisez step_number pour l'ordre d'affichage, day_number pour le jour

## Support Multilingue

Le système prend désormais en charge les traductions en ajoutant des colonnes avec le suffixe de la langue.

### Champs Traduisibles pour les Trips
- `destination_en` : Traduction anglaise de la destination
- `travel_style_en` : Traduction anglaise du style de voyage

### Champs Traduisibles pour les Steps
- `title_en` : Traduction anglaise du titre
- `subtitle_en` : Traduction anglaise du sous-titre
- `why_en` : Traduction anglaise du "pourquoi"
- `tips_en` : Traduction anglaise des conseils
- `transfer_en` : Traduction anglaise des infos de transfert
- `suggestion_en` : Traduction anglaise des suggestions
- `weather_description_en` : Traduction anglaise de la description météo

### Extension Multilingue

Pour ajouter d'autres langues :
1. Ajoutez les colonnes avec le suffixe approprié (ex: `_es` pour espagnol)
2. Mettez à jour les interfaces TypeScript
3. Adaptez la logique de sélection de langue dans l'application

---

## Type d'Étape

Le nouveau champ `step_type` permet de catégoriser les étapes visuellement.

### Types Suggérés
- `activité` : Activités, excursions, expériences
- `restaurant` : Restaurants, cafés, marchés alimentaires
- `transport` : Transferts, trajets entre villes
- `hébergement` : Check-in/check-out hôtel
- `visite` : Monuments, musées, sites touristiques
- `loisir` : Détente, plage, spa
- `shopping` : Marchés, boutiques
- `spectacle` : Concerts, théâtre, événements

### Affichage

Le type d'étape est affiché dans l'interface avec :
- Un badge semi-transparent avec icône Tag
- Position : entre le badge "Étape X" et les badges durée/prix
- Format automatique : première lettre en majuscule

---

Pour toute question sur la structure des données ou l'ajout de voyages, consultez la documentation Supabase du projet.
