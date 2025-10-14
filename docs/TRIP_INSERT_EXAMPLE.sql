-- ========================================
-- EXEMPLE D'INSERTION D'UN VOYAGE COMPLET
-- ========================================
-- Ce fichier montre comment créer un voyage avec plusieurs étapes
-- Copiez ce template et modifiez les valeurs selon vos besoins

-- ========================================
-- 1. CRÉER LE VOYAGE PRINCIPAL
-- ========================================

INSERT INTO trips (
  code,                    -- Code unique (MAJUSCULES recommandées)
  destination,             -- Nom de la destination
  destination_en,          -- Traduction anglaise de la destination
  total_days,             -- Nombre de jours
  main_image,             -- Image principale (URL Unsplash ou autre)
  flight_from,            -- Ville de départ
  flight_to,              -- Ville d'arrivée
  flight_duration,        -- Durée du vol
  flight_type,            -- Type de vol
  hotel_name,             -- Nom de l'hôtel
  hotel_rating,           -- Note sur 5
  total_price,            -- Prix affiché
  total_budget,           -- Budget total
  average_weather,        -- Météo moyenne
  travel_style,           -- Style du voyage
  travel_style_en,        -- Traduction anglaise du style
  start_date,             -- Date de début
  travelers,              -- Nombre de voyageurs
  price_flights,          -- Prix des vols
  price_hotels,           -- Prix des hébergements
  price_transport,        -- Prix des transports
  price_activities        -- Prix des activités
) VALUES (
  'BALI2025',
  'Bali',
  'Bali',
  10,
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1920&q=80',
  'Paris',
  'Denpasar',
  '17h30',
  'Vol avec escale',
  'Four Seasons Resort Bali',
  4.9,
  '3 500 € TTC',
  '4 000 €',
  '28°C',
  'Relaxation & Aventure',
  'Relaxation & Adventure',
  '2025-07-15',
  2,
  '1 200 €',
  '1 800 €',
  '400 €',
  '600 €'
);

-- ========================================
-- 2. AJOUTER LES ÉTAPES DU VOYAGE
-- ========================================

-- JOUR 1 - ÉTAPE 1 : Arrivée complète avec tous les détails
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title,
  title_en,
  subtitle,
  subtitle_en,
  main_image,
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
  (SELECT id FROM trips WHERE code = 'BALI2025'),
  1,
  1,
  'Arrivée à Bali',
  'Arrival in Bali',
  'Aéroport Ngurah Rai',
  'Ngurah Rai Airport',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=80',
  'transport',
  -8.7467,
  115.1668,
  'Arrivée en soirée à l''aéroport international de Ngurah Rai. Transfert vers votre hôtel à Seminyak pour commencer votre aventure balinaise.',
  'Evening arrival at Ngurah Rai International Airport. Transfer to your hotel in Seminyak to begin your Balinese adventure.',
  'Préparez de la monnaie locale (IDR) avant de sortir de l''aéroport. Le taux de change est meilleur en ville.',
  'Prepare local currency (IDR) before leaving the airport. The exchange rate is better in town.',
  '45 min en voiture privée avec chauffeur inclus dans le forfait',
  '45 min by private car with driver included in package',
  'Installation à l''hôtel et dîner léger sur la plage de Seminyak',
  'Hotel check-in and light dinner on Seminyak beach',
  '☀️',
  '29°C',
  'Ciel dégagé',
  'Clear sky',
  0,
  '3h',
  '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80"]'::jsonb
);

-- JOUR 1 - ÉTAPE 2 : Soirée à Seminyak
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title,
  title_en,
  subtitle,
  subtitle_en,
  main_image,
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
  price,
  duration
) VALUES (
  (SELECT id FROM trips WHERE code = 'BALI2025'),
  2,
  1,
  'Seminyak Beach',
  'Seminyak Beach',
  'Première soirée balinaise',
  'First Balinese evening',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=80',
  'loisir',
  -8.6904,
  115.1683,
  'Détente sur la plage de Seminyak, réputée pour ses couchers de soleil spectaculaires et son ambiance décontractée.',
  'Relax on Seminyak beach, famous for its spectacular sunsets and laid-back atmosphere.',
  'Réservez une table au La Plancha pour le coucher de soleil. Arrivez 1h avant pour avoir les meilleurs coussins.',
  'Book a table at La Plancha for sunset. Arrive 1h early to get the best cushions.',
  '10 min à pied depuis l''hôtel',
  '10 min walk from hotel',
  'Dîner au restaurant Motel Mexicola',
  'Dinner at Motel Mexicola restaurant',
  '🌅',
  '27°C',
  0,
  '2h'
);

-- JOUR 2 - ÉTAPE 1 : Temple Tanah Lot
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title,
  title_en,
  subtitle,
  subtitle_en,
  main_image,
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
  price,
  duration,
  images
) VALUES (
  (SELECT id FROM trips WHERE code = 'BALI2025'),
  3,
  2,
  'Tanah Lot Temple',
  'Tanah Lot Temple',
  'Temple emblématique sur la mer',
  'Iconic temple on the sea',
  'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=1920&q=80',
  'visite',
  -8.6214,
  115.0869,
  'Le temple Tanah Lot est l''un des temples les plus emblématiques de Bali, perché sur un rocher en pleine mer. Spectaculaire au coucher du soleil.',
  'Tanah Lot temple is one of Bali''s most iconic temples, perched on a rock in the middle of the sea. Spectacular at sunset.',
  'Visitez en fin d''après-midi pour le coucher de soleil. Attention aux singes qui peuvent voler vos affaires !',
  'Visit in late afternoon for sunset. Beware of monkeys who can steal your belongings!',
  '40 min en voiture avec chauffeur',
  '40 min by car with driver',
  'Dîner au restaurant avec vue sur le temple',
  'Dinner at restaurant with temple view',
  '☀️',
  '30°C',
  20,
  '3h',
  '["https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&q=80"]'::jsonb
);

-- JOUR 3 - ÉTAPE 1 : Rizières de Tegalalang (minimaliste)
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title,
  subtitle,
  main_image,
  step_type,
  latitude,
  longitude,
  weather_icon,
  weather_temp,
  price
) VALUES (
  (SELECT id FROM trips WHERE code = 'BALI2025'),
  4,
  3,
  'Rizières de Tegalalang',
  'Paysages de carte postale',
  'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1920&q=80',
  'visite',
  -8.4350,
  115.2808,
  '☀️',
  '28°C',
  10
);

-- JOUR 3 - ÉTAPE 2 : Ubud Center (sans coordonnées GPS - exemple flexible)
INSERT INTO steps (
  trip_id,
  step_number,
  day_number,
  title,
  subtitle,
  main_image,
  why,
  tips,
  suggestion
) VALUES (
  (SELECT id FROM trips WHERE code = 'BALI2025'),
  5,
  3,
  'Centre d''Ubud',
  'Shopping et culture',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1920&q=80',
  'Découverte du centre culturel de Bali, avec ses marchés artisanaux et ses galeries d''art.',
  'Négociez les prix au marché, c''est la tradition ! Commencez à 50% du prix demandé.',
  'Visite du Palais Royal et spectacle de danse traditionnelle le soir'
);

-- ========================================
-- 3. VÉRIFIER L'INSERTION
-- ========================================

-- Vérifier le voyage créé
SELECT * FROM trips WHERE code = 'BALI2025';

-- Compter les étapes
SELECT COUNT(*) as total_steps 
FROM steps 
WHERE trip_id = (SELECT id FROM trips WHERE code = 'BALI2025');

-- Voir toutes les étapes dans l'ordre
SELECT step_number, day_number, title, subtitle 
FROM steps 
WHERE trip_id = (SELECT id FROM trips WHERE code = 'BALI2025')
ORDER BY step_number;

-- ========================================
-- 4. ACCÉDER AU VOYAGE
-- ========================================
-- URL: /recommendations?code=BALI2025
-- ou: /recommendations/BALI2025

-- ========================================
-- NOTES IMPORTANTES
-- ========================================
-- 1. Seuls trip_id, step_number, day_number et title sont OBLIGATOIRES pour les steps
-- 2. Tous les autres champs sont optionnels - créez des étapes aussi simples ou détaillées que nécessaire
-- 3. Les coordonnées GPS (latitude/longitude) sont optionnelles - sans elles, l'étape n'apparaîtra pas sur la carte
-- 4. Le champ images est un tableau JSON - utilisez '["url1", "url2"]'::jsonb
-- 5. Les prix sont en euros par défaut
-- 6. Utilisez des emojis pour weather_icon: ☀️ 🌤️ ⛅ 🌧️ ❄️ 🌅
-- 7. Le champ step_type est NOUVEAU et facultatif - permet de catégoriser les étapes (activité, restaurant, transport, etc.)
-- 8. Les champs avec suffixe _en sont les traductions anglaises (optionnelles)
