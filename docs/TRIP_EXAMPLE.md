# Exemple de Trip Complet avec Tous les Paramètres

Ce fichier présente un exemple complet d'un trip avec **tous** les paramètres possibles, y compris les traductions anglaises et les nouveaux champs.

## Structure du Trip

```json
{
  "code": "COMPLETE2025",
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
  "price_activities": "700 €"
}
```

## Insertion SQL d'un Trip Complet

```sql
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
  'COMPLETE2025',
  'Tokyo & Kyoto',
  'Tokyo & Kyoto',
  7,
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=80',
  'Paris',
  'Tokyo',
  '16h30',
  'Vol direct',
  'Mitsui Garden Hotel Ginza',
  4.6,
  '3 200 €',
  '3 200 €',
  '21°C',
  'Culture & Gastronomie',
  'Culture & Gastronomy',
  '2025-04-15',
  2,
  '800 €',
  '1 400 €',
  '300 €',
  '700 €'
);
```

## Notes sur les Champs

### Champs Obligatoires
- `code` : Identifiant unique (MAJUSCULES recommandées)
- `destination` : Nom de la destination
- `total_days` : Nombre de jours du voyage

### Champs Optionnels
Tous les autres champs sont optionnels :
- **Images** : `main_image`
- **Vol** : `flight_from`, `flight_to`, `flight_duration`, `flight_type`
- **Hébergement** : `hotel_name`, `hotel_rating`
- **Tarification** : `total_price`, `total_budget`
- **Budget détaillé** : `price_flights`, `price_hotels`, `price_transport`, `price_activities`
- **Voyageurs** : `travelers` (nombre de voyageurs)
- **Météo** : `average_weather`
- **Style** : `travel_style`, `travel_style_en`
- **Date** : `start_date`
- **Multilingue** : `destination_en`, `travel_style_en`

### Support Multilingue

Les champs suivants supportent la traduction anglaise :
- `destination_en` : Traduction du nom de destination
- `travel_style_en` : Traduction du style de voyage

Pour ajouter d'autres langues à l'avenir, créez de nouvelles colonnes avec le suffixe approprié (ex: `_es`, `_de`, `_it`).
