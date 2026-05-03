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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      coaching_insights: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          insight_type: string
          is_completed: boolean
          is_read: boolean
          related_goal: string | null
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_type: string
          is_completed?: boolean
          is_read?: boolean
          related_goal?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          insight_type?: string
          is_completed?: boolean
          is_read?: boolean
          related_goal?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tracking: {
        Row: {
          created_at: string
          date: string
          hydration_glasses: number | null
          hydration_goal: number | null
          id: string
          reading_goal: number | null
          reading_pages: number | null
          running_goal: number | null
          running_km: number | null
          sleep_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          hydration_glasses?: number | null
          hydration_goal?: number | null
          id?: string
          reading_goal?: number | null
          reading_pages?: number | null
          running_goal?: number | null
          running_km?: number | null
          sleep_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          hydration_glasses?: number | null
          hydration_goal?: number | null
          id?: string
          reading_goal?: number | null
          reading_pages?: number | null
          running_goal?: number | null
          running_km?: number | null
          sleep_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_media: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          media_type: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          media_type: string
          storage_path: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          media_type?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_media_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          enhanced_text: string | null
          id: string
          location: Json | null
          mood: string | null
          mood_score: number | null
          original_transcription: string | null
          playback_language: string | null
          reflection_audio_url: string | null
          rich_content: string | null
          soul_reflection: string | null
          time_of_day: string | null
          title: string | null
          updated_at: string
          user_id: string
          weather: Json | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          enhanced_text?: string | null
          id?: string
          location?: Json | null
          mood?: string | null
          mood_score?: number | null
          original_transcription?: string | null
          playback_language?: string | null
          reflection_audio_url?: string | null
          rich_content?: string | null
          soul_reflection?: string | null
          time_of_day?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          weather?: Json | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          enhanced_text?: string | null
          id?: string
          location?: Json | null
          mood?: string | null
          mood_score?: number | null
          original_transcription?: string | null
          playback_language?: string | null
          reflection_audio_url?: string | null
          rich_content?: string | null
          soul_reflection?: string | null
          time_of_day?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          weather?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          capture_context: boolean
          created_at: string
          display_name: string | null
          fears: string[] | null
          gender: string | null
          goals: Json | null
          id: string
          interests: string[] | null
          onboarding_completed: boolean
          pin_hash: string | null
          soul_profile_summary: Json | null
          strengths: string[] | null
          updated_at: string
          voice_clone_id: string | null
          worldview: string | null
        }
        Insert: {
          avatar_url?: string | null
          capture_context?: boolean
          created_at?: string
          display_name?: string | null
          fears?: string[] | null
          gender?: string | null
          goals?: Json | null
          id: string
          interests?: string[] | null
          onboarding_completed?: boolean
          pin_hash?: string | null
          soul_profile_summary?: Json | null
          strengths?: string[] | null
          updated_at?: string
          voice_clone_id?: string | null
          worldview?: string | null
        }
        Update: {
          avatar_url?: string | null
          capture_context?: boolean
          created_at?: string
          display_name?: string | null
          fears?: string[] | null
          gender?: string | null
          goals?: Json | null
          id?: string
          interests?: string[] | null
          onboarding_completed?: boolean
          pin_hash?: string | null
          soul_profile_summary?: Json | null
          strengths?: string[] | null
          updated_at?: string
          voice_clone_id?: string | null
          worldview?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          is_manual_grant: boolean
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_manual_grant?: boolean
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          is_manual_grant?: boolean
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
