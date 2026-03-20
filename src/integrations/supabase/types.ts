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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          age_category: string | null
          attendance_type: string | null
          branch: string
          branch_id: string
          duration_seconds: number | null
          email: string
          end_time: string | null
          family_adult_count: number | null
          family_children_count: number | null
          family_surname: string | null
          family_young_adult_count: number | null
          family_youth_count: number | null
          id: string
          is_archived: boolean | null
          last_seen_at: string
          name: string
          start_time: string
          stream_session_id: string
          stream_title: string
          timestamp: string | null
        }
        Insert: {
          age_category?: string | null
          attendance_type?: string | null
          branch: string
          branch_id: string
          duration_seconds?: number | null
          email: string
          end_time?: string | null
          family_adult_count?: number | null
          family_children_count?: number | null
          family_surname?: string | null
          family_young_adult_count?: number | null
          family_youth_count?: number | null
          id?: string
          is_archived?: boolean | null
          last_seen_at: string
          name: string
          start_time: string
          stream_session_id: string
          stream_title: string
          timestamp?: string | null
        }
        Update: {
          age_category?: string | null
          attendance_type?: string | null
          branch?: string
          branch_id?: string
          duration_seconds?: number | null
          email?: string
          end_time?: string | null
          family_adult_count?: number | null
          family_children_count?: number | null
          family_surname?: string | null
          family_young_adult_count?: number | null
          family_youth_count?: number | null
          id?: string
          is_archived?: boolean | null
          last_seen_at?: string
          name?: string
          start_time?: string
          stream_session_id?: string
          stream_title?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_staff: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          password_hash: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          password_hash: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          password_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      stream_settings: {
        Row: {
          attendance_auto_stop_at: string | null
          auto_attendance_duration_hours: number | null
          auto_detected_url: string | null
          check_day: string | null
          check_end_time: string | null
          check_interval_minutes: number | null
          check_start_time: string | null
          id: string
          is_attendance_active: boolean | null
          last_api_check_time: string | null
          last_live_check_date: string | null
          stream_title: string | null
          updated_at: string | null
          youtube_channel_id: string | null
          youtube_url: string | null
        }
        Insert: {
          attendance_auto_stop_at?: string | null
          auto_attendance_duration_hours?: number | null
          auto_detected_url?: string | null
          check_day?: string | null
          check_end_time?: string | null
          check_interval_minutes?: number | null
          check_start_time?: string | null
          id?: string
          is_attendance_active?: boolean | null
          last_api_check_time?: string | null
          last_live_check_date?: string | null
          stream_title?: string | null
          updated_at?: string | null
          youtube_channel_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          attendance_auto_stop_at?: string | null
          auto_attendance_duration_hours?: number | null
          auto_detected_url?: string | null
          check_day?: string | null
          check_end_time?: string | null
          check_interval_minutes?: number | null
          check_start_time?: string | null
          id?: string
          is_attendance_active?: boolean | null
          last_api_check_time?: string | null
          last_live_check_date?: string | null
          stream_title?: string | null
          updated_at?: string | null
          youtube_channel_id?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
