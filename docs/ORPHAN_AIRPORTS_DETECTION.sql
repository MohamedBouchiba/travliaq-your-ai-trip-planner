-- =====================================================
-- Script de détection des aéroports "orphelins"
-- Aéroports trop éloignés de leur city_name assigné (>80km)
-- ou sans correspondance dans la table cities
-- =====================================================

-- Requête principale : Détection des anomalies
WITH airport_with_city AS (
  SELECT 
    a.iata,
    a.name AS airport_name,
    a.city_name,
    a.country_code,
    a.airport_type,
    a.latitude AS airport_lat,
    a.longitude AS airport_lng,
    c.latitude AS city_lat,
    c.longitude AS city_lng,
    c.name AS matched_city_name,
    -- Distance Haversine en km
    CASE WHEN c.latitude IS NOT NULL THEN
      (2 * 6371 * ASIN(SQRT(
        POWER(SIN(RADIANS(c.latitude - a.latitude) / 2), 2) +
        COS(RADIANS(a.latitude)) * COS(RADIANS(c.latitude)) *
        POWER(SIN(RADIANS(c.longitude - a.longitude) / 2), 2)
      )))
    ELSE NULL
    END AS distance_km
  FROM airports a
  LEFT JOIN cities c ON 
    LOWER(TRIM(a.city_name)) = LOWER(TRIM(c.name)) 
    AND LOWER(a.country_code) = LOWER(c.country_code)
  WHERE a.airport_type IN ('large_airport', 'medium_airport')
)
SELECT 
  iata,
  airport_name,
  city_name,
  country_code,
  airport_type,
  ROUND(distance_km::numeric, 1) AS distance_km,
  matched_city_name,
  ROUND(airport_lat::numeric, 4) AS airport_lat,
  ROUND(airport_lng::numeric, 4) AS airport_lng,
  ROUND(city_lat::numeric, 4) AS city_lat,
  ROUND(city_lng::numeric, 4) AS city_lng,
  CASE 
    WHEN city_lat IS NULL THEN 'NO_CITY_MATCH'
    WHEN distance_km > 120 THEN 'VERY_FAR (>120km)'
    WHEN distance_km > 80 THEN 'FAR (>80km)'
    ELSE 'OK'
  END AS status
FROM airport_with_city
WHERE distance_km > 80 OR city_lat IS NULL
ORDER BY 
  CASE WHEN city_lat IS NULL THEN 0 ELSE 1 END,
  distance_km DESC NULLS LAST
LIMIT 100;

-- =====================================================
-- Exemples connus d'aéroports mal assignés :
-- =====================================================
-- XCR (Paris-Vatry) : 150km de Paris, devrait être séparé
-- PRX (Cox Field, Texas) : Assigné à "Paris" mais c'est Paris, Texas USA
-- BVA (Beauvais) : 85km de Paris, limite acceptable

-- =====================================================
-- Pour corriger dans la DB (exemple) :
-- =====================================================
-- UPDATE airports SET city_name = 'Châlons-Vatry' WHERE iata = 'XCR';
-- UPDATE airports SET city_name = 'Paris Texas' WHERE iata = 'PRX';
