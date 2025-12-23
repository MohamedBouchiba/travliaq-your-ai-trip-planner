export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      airports: {
        Row: {
          airport_type: string | null
          city_name: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          iata: string
          icao: string | null
          latitude: number
          location: unknown
          longitude: number
          name: string
          name_norm: string
          scheduled_service: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          airport_type?: string | null
          city_name?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          iata: string
          icao?: string | null
          latitude: number
          location: unknown
          longitude: number
          name: string
          name_norm: string
          scheduled_service?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          airport_type?: string | null
          city_name?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          iata?: string
          icao?: string | null
          latitude?: number
          location?: unknown
          longitude?: number
          name?: string
          name_norm?: string
          scheduled_service?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      answer_enqueues: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      cities: {
        Row: {
          country: string
          country_code: string
          created_at: string | null
          id: string
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string
          population: number | null
          search_text: string | null
          slug: string
          state_code: string | null
          state_name: string | null
          updated_at: string | null
        }
        Insert: {
          country: string
          country_code: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name: string
          population?: number | null
          search_text?: string | null
          slug: string
          state_code?: string | null
          state_name?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string
          country_code?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string
          population?: number | null
          search_text?: string | null
          slug?: string
          state_code?: string | null
          state_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          iso2: string
          iso3: string | null
          name: string
          population: number | null
          region: string | null
          slug: string
          subregion: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          iso2: string
          iso3?: string | null
          name: string
          population?: number | null
          region?: string | null
          slug: string
          subregion?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          iso2?: string
          iso3?: string | null
          name?: string
          population?: number | null
          region?: string | null
          slug?: string
          subregion?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          a_date_depart_approximative: string | null
          a_destination: string | null
          affinites_voyage: Json | null
          aide_avec: string[] | null
          ambiance_voyage: string | null
          bagages: Json | null
          biorythme: Json | null
          budget_par_personne: string | null
          confort: string | null
          contraintes: Json | null
          created_at: string
          date_depart: string | null
          date_depart_approximative: string | null
          date_retour: string | null
          destination: string | null
          devise_budget: string | null
          duree: string | null
          email: string
          enfants: Json | null
          equipements: Json | null
          flexibilite: string | null
          groupe_voyage: string | null
          id: string
          infos_supplementaires: string | null
          langue: string
          lieu_depart: string | null
          mobilite: Json | null
          montant_budget: number | null
          nombre_voyageurs: number | null
          nuits_exactes: number | null
          preference_climat: string | null
          preference_vol: string | null
          preferences_horaires: string[] | null
          preferences_hotel: string[] | null
          quartier: string | null
          rythme: string | null
          securite: Json | null
          styles: Json | null
          type_budget: string | null
          type_dates: string | null
          type_hebergement: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          a_date_depart_approximative?: string | null
          a_destination?: string | null
          affinites_voyage?: Json | null
          aide_avec?: string[] | null
          ambiance_voyage?: string | null
          bagages?: Json | null
          biorythme?: Json | null
          budget_par_personne?: string | null
          confort?: string | null
          contraintes?: Json | null
          created_at?: string
          date_depart?: string | null
          date_depart_approximative?: string | null
          date_retour?: string | null
          destination?: string | null
          devise_budget?: string | null
          duree?: string | null
          email: string
          enfants?: Json | null
          equipements?: Json | null
          flexibilite?: string | null
          groupe_voyage?: string | null
          id?: string
          infos_supplementaires?: string | null
          langue?: string
          lieu_depart?: string | null
          mobilite?: Json | null
          montant_budget?: number | null
          nombre_voyageurs?: number | null
          nuits_exactes?: number | null
          preference_climat?: string | null
          preference_vol?: string | null
          preferences_horaires?: string[] | null
          preferences_hotel?: string[] | null
          quartier?: string | null
          rythme?: string | null
          securite?: Json | null
          styles?: Json | null
          type_budget?: string | null
          type_dates?: string | null
          type_hebergement?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          a_date_depart_approximative?: string | null
          a_destination?: string | null
          affinites_voyage?: Json | null
          aide_avec?: string[] | null
          ambiance_voyage?: string | null
          bagages?: Json | null
          biorythme?: Json | null
          budget_par_personne?: string | null
          confort?: string | null
          contraintes?: Json | null
          created_at?: string
          date_depart?: string | null
          date_depart_approximative?: string | null
          date_retour?: string | null
          destination?: string | null
          devise_budget?: string | null
          duree?: string | null
          email?: string
          enfants?: Json | null
          equipements?: Json | null
          flexibilite?: string | null
          groupe_voyage?: string | null
          id?: string
          infos_supplementaires?: string | null
          langue?: string
          lieu_depart?: string | null
          mobilite?: Json | null
          montant_budget?: number | null
          nombre_voyageurs?: number | null
          nuits_exactes?: number | null
          preference_climat?: string | null
          preference_vol?: string | null
          preferences_horaires?: string[] | null
          preferences_hotel?: string[] | null
          quartier?: string | null
          rythme?: string | null
          securite?: Json | null
          styles?: Json | null
          type_budget?: string | null
          type_dates?: string | null
          type_hebergement?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      steps: {
        Row: {
          created_at: string
          day_number: number
          duration: string | null
          id: string
          images: Json | null
          is_summary: boolean | null
          latitude: number | null
          longitude: number | null
          main_image: string
          price: number | null
          step_number: number
          step_type: string | null
          subtitle: string | null
          subtitle_en: string | null
          suggestion: string | null
          suggestion_en: string | null
          summary_stats: Json | null
          tips: string | null
          tips_en: string | null
          title: string
          title_en: string | null
          transfer: string | null
          transfer_en: string | null
          trip_id: string
          updated_at: string
          weather_description: string | null
          weather_description_en: string | null
          weather_icon: string | null
          weather_temp: string | null
          why: string | null
          why_en: string | null
        }
        Insert: {
          created_at?: string
          day_number: number
          duration?: string | null
          id?: string
          images?: Json | null
          is_summary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string
          price?: number | null
          step_number: number
          step_type?: string | null
          subtitle?: string | null
          subtitle_en?: string | null
          suggestion?: string | null
          suggestion_en?: string | null
          summary_stats?: Json | null
          tips?: string | null
          tips_en?: string | null
          title: string
          title_en?: string | null
          transfer?: string | null
          transfer_en?: string | null
          trip_id: string
          updated_at?: string
          weather_description?: string | null
          weather_description_en?: string | null
          weather_icon?: string | null
          weather_temp?: string | null
          why?: string | null
          why_en?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number
          duration?: string | null
          id?: string
          images?: Json | null
          is_summary?: boolean | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string
          price?: number | null
          step_number?: number
          step_type?: string | null
          subtitle?: string | null
          subtitle_en?: string | null
          suggestion?: string | null
          suggestion_en?: string | null
          summary_stats?: Json | null
          tips?: string | null
          tips_en?: string | null
          title?: string
          title_en?: string | null
          transfer?: string | null
          transfer_en?: string | null
          trip_id?: string
          updated_at?: string
          weather_description?: string | null
          weather_description_en?: string | null
          weather_icon?: string | null
          weather_temp?: string | null
          why?: string | null
          why_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "steps_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_summaries: {
        Row: {
          activities_summary: string[] | null
          average_weather: string | null
          budget_currency: string | null
          country_code: string | null
          created_at: string | null
          destination: string
          destination_en: string | null
          end_date: string | null
          flight_duration: string | null
          flight_from: string | null
          flight_to: string | null
          gallery_urls: string[] | null
          generated_at: string | null
          hotel_name: string | null
          hotel_rating: number | null
          id: string
          language: string | null
          main_image_url: string | null
          persona: string | null
          pipeline_status: string | null
          price_activities: number | null
          price_flights: number | null
          price_hotels: number | null
          questionnaire_id: string
          rhythm: string | null
          run_id: string | null
          start_date: string | null
          steps_count: number | null
          summary_paragraph: string | null
          total_days: number | null
          total_nights: number | null
          total_price: number | null
          travel_style: string | null
          travelers_count: number | null
          trip_code: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          activities_summary?: string[] | null
          average_weather?: string | null
          budget_currency?: string | null
          country_code?: string | null
          created_at?: string | null
          destination: string
          destination_en?: string | null
          end_date?: string | null
          flight_duration?: string | null
          flight_from?: string | null
          flight_to?: string | null
          gallery_urls?: string[] | null
          generated_at?: string | null
          hotel_name?: string | null
          hotel_rating?: number | null
          id?: string
          language?: string | null
          main_image_url?: string | null
          persona?: string | null
          pipeline_status?: string | null
          price_activities?: number | null
          price_flights?: number | null
          price_hotels?: number | null
          questionnaire_id: string
          rhythm?: string | null
          run_id?: string | null
          start_date?: string | null
          steps_count?: number | null
          summary_paragraph?: string | null
          total_days?: number | null
          total_nights?: number | null
          total_price?: number | null
          travel_style?: string | null
          travelers_count?: number | null
          trip_code?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          activities_summary?: string[] | null
          average_weather?: string | null
          budget_currency?: string | null
          country_code?: string | null
          created_at?: string | null
          destination?: string
          destination_en?: string | null
          end_date?: string | null
          flight_duration?: string | null
          flight_from?: string | null
          flight_to?: string | null
          gallery_urls?: string[] | null
          generated_at?: string | null
          hotel_name?: string | null
          hotel_rating?: number | null
          id?: string
          language?: string | null
          main_image_url?: string | null
          persona?: string | null
          pipeline_status?: string | null
          price_activities?: number | null
          price_flights?: number | null
          price_hotels?: number | null
          questionnaire_id?: string
          rhythm?: string | null
          run_id?: string | null
          start_date?: string | null
          steps_count?: number | null
          summary_paragraph?: string | null
          total_days?: number | null
          total_nights?: number | null
          total_price?: number | null
          travel_style?: string | null
          travelers_count?: number | null
          trip_code?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_summaries_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: true
            referencedRelation: "questionnaire_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          average_weather: string | null
          code: string
          created_at: string
          destination: string
          destination_en: string | null
          flight_duration: string | null
          flight_from: string | null
          flight_to: string | null
          flight_type: string | null
          hotel_name: string | null
          hotel_rating: number | null
          id: string
          main_image: string
          price_activities: string | null
          price_flights: string | null
          price_hotels: string | null
          price_transport: string | null
          start_date: string | null
          total_budget: string | null
          total_days: number
          total_price: string | null
          travel_style: string | null
          travel_style_en: string | null
          travelers: number | null
          updated_at: string
        }
        Insert: {
          average_weather?: string | null
          code: string
          created_at?: string
          destination: string
          destination_en?: string | null
          flight_duration?: string | null
          flight_from?: string | null
          flight_to?: string | null
          flight_type?: string | null
          hotel_name?: string | null
          hotel_rating?: number | null
          id?: string
          main_image?: string
          price_activities?: string | null
          price_flights?: string | null
          price_hotels?: string | null
          price_transport?: string | null
          start_date?: string | null
          total_budget?: string | null
          total_days?: number
          total_price?: string | null
          travel_style?: string | null
          travel_style_en?: string | null
          travelers?: number | null
          updated_at?: string
        }
        Update: {
          average_weather?: string | null
          code?: string
          created_at?: string
          destination?: string
          destination_en?: string | null
          flight_duration?: string | null
          flight_from?: string | null
          flight_to?: string | null
          flight_type?: string | null
          hotel_name?: string | null
          hotel_rating?: number | null
          id?: string
          main_image?: string
          price_activities?: string | null
          price_flights?: string | null
          price_hotels?: string | null
          price_transport?: string | null
          start_date?: string | null
          total_budget?: string | null
          total_days?: number
          total_price?: string | null
          travel_style?: string | null
          travel_style_en?: string | null
          travelers?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      commercial_airports: {
        Row: {
          airport_type: string | null
          country_code: string | null
          iata: string | null
          location: unknown
          name: string | null
          scheduled_service: string | null
        }
        Insert: {
          airport_type?: string | null
          country_code?: string | null
          iata?: string | null
          location?: unknown
          name?: string | null
          scheduled_service?: string | null
        }
        Update: {
          airport_type?: string | null
          country_code?: string | null
          iata?: string | null
          location?: unknown
          name?: string | null
          scheduled_service?: string | null
        }
        Relationships: []
      }
      search_autocomplete: {
        Row: {
          country_code: string | null
          label: string | null
          location: unknown
          rank_signal: number | null
          ref: string | null
          slug: string | null
          type: string | null
          type_priority: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_questionnaire_response: {
        Args: { response_id: string }
        Returns: undefined
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_trip_from_json: { Args: { trip_data: Json }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
