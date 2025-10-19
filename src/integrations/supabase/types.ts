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
          name: string
          search_text: string | null
        }
        Insert: {
          country: string
          country_code: string
          created_at?: string | null
          id?: string
          name: string
          search_text?: string | null
        }
        Update: {
          country?: string
          country_code?: string
          created_at?: string | null
          id?: string
          name?: string
          search_text?: string | null
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          accommodation_type: Json | null
          additional_info: string | null
          amenities: Json | null
          approximate_departure_date: string | null
          biorhythm: Json | null
          budget: string | null
          budget_amount: number | null
          budget_currency: string | null
          budget_type: string | null
          children: Json | null
          climate_preference: string | null
          comfort: string | null
          constraints: Json | null
          created_at: string
          dates_type: string | null
          departure_date: string | null
          departure_location: string | null
          destination: string | null
          duration: string | null
          email: string
          exact_nights: number | null
          flexibility: string | null
          flight_preference: string | null
          has_approximate_departure_date: string | null
          has_destination: string | null
          id: string
          luggage: Json | null
          mobility: Json | null
          neighborhood: string | null
          number_of_travelers: number | null
          return_date: string | null
          rhythm: string | null
          security: Json | null
          styles: Json | null
          travel_affinities: Json | null
          travel_ambiance: string | null
          travel_group: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accommodation_type?: Json | null
          additional_info?: string | null
          amenities?: Json | null
          approximate_departure_date?: string | null
          biorhythm?: Json | null
          budget?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          budget_type?: string | null
          children?: Json | null
          climate_preference?: string | null
          comfort?: string | null
          constraints?: Json | null
          created_at?: string
          dates_type?: string | null
          departure_date?: string | null
          departure_location?: string | null
          destination?: string | null
          duration?: string | null
          email: string
          exact_nights?: number | null
          flexibility?: string | null
          flight_preference?: string | null
          has_approximate_departure_date?: string | null
          has_destination?: string | null
          id?: string
          luggage?: Json | null
          mobility?: Json | null
          neighborhood?: string | null
          number_of_travelers?: number | null
          return_date?: string | null
          rhythm?: string | null
          security?: Json | null
          styles?: Json | null
          travel_affinities?: Json | null
          travel_ambiance?: string | null
          travel_group?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accommodation_type?: Json | null
          additional_info?: string | null
          amenities?: Json | null
          approximate_departure_date?: string | null
          biorhythm?: Json | null
          budget?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          budget_type?: string | null
          children?: Json | null
          climate_preference?: string | null
          comfort?: string | null
          constraints?: Json | null
          created_at?: string
          dates_type?: string | null
          departure_date?: string | null
          departure_location?: string | null
          destination?: string | null
          duration?: string | null
          email?: string
          exact_nights?: number | null
          flexibility?: string | null
          flight_preference?: string | null
          has_approximate_departure_date?: string | null
          has_destination?: string | null
          id?: string
          luggage?: Json | null
          mobility?: Json | null
          neighborhood?: string | null
          number_of_travelers?: number | null
          return_date?: string | null
          rhythm?: string | null
          security?: Json | null
          styles?: Json | null
          travel_affinities?: Json | null
          travel_ambiance?: string | null
          travel_group?: string | null
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
      [_ in never]: never
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
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_trip_from_json: {
        Args: { trip_data: Json }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
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
