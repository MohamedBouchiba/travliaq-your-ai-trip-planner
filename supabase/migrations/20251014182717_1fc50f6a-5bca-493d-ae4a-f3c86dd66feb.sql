-- Update the insert_trip_from_json function to support multilingual fields and step_type
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
  -- Insertion du trip principal avec support multilingue
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
    start_date
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
    NULLIF(trip_data->>'start_date', '')::date
  ) RETURNING id INTO new_trip_id;
  
  -- Insertion des steps avec support multilingue et step_type
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