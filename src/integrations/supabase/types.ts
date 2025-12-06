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
      absence_records: {
        Row: {
          absence_date: string
          ai_detected: boolean
          approved: boolean | null
          created_at: string
          id: string
          leave_type: string
          reason: string | null
          user_id: string
        }
        Insert: {
          absence_date: string
          ai_detected?: boolean
          approved?: boolean | null
          created_at?: string
          id?: string
          leave_type?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          absence_date?: string
          ai_detected?: boolean
          approved?: boolean | null
          created_at?: string
          id?: string
          leave_type?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          attendance_date: string
          auto_marked: boolean
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          id: string
          notes: string | null
          scheduled_shift_id: string | null
          shift_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_date: string
          auto_marked?: boolean
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_shift_id?: string | null
          shift_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          auto_marked?: boolean
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_shift_id?: string | null
          shift_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_scheduled_shift_id_fkey"
            columns: ["scheduled_shift_id"]
            isOneToOne: false
            referencedRelation: "scheduled_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_read: boolean | null
          is_translated: boolean | null
          message: string
          receiver_id: string
          sender_id: string
          translated_message: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_translated?: boolean | null
          message: string
          receiver_id: string
          sender_id: string
          translated_message?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_translated?: boolean | null
          message?: string
          receiver_id?: string
          sender_id?: string
          translated_message?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          match_score: number | null
          matched_at: string
          matched_user_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score?: number | null
          matched_at?: string
          matched_user_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number | null
          matched_at?: string
          matched_user_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      processing_logs: {
        Row: {
          age_verified: boolean | null
          completed_at: string | null
          created_at: string
          current_step: string | null
          errors: string[] | null
          gender_verified: boolean | null
          id: string
          language_detected: boolean | null
          photo_verified: boolean | null
          processing_status: string
          progress_percent: number | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age_verified?: boolean | null
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          errors?: string[] | null
          gender_verified?: boolean | null
          id?: string
          language_detected?: boolean | null
          photo_verified?: boolean | null
          processing_status?: string
          progress_percent?: number | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age_verified?: boolean | null
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          errors?: string[] | null
          gender_verified?: boolean | null
          id?: string
          language_detected?: boolean | null
          photo_verified?: boolean | null
          processing_status?: string
          progress_percent?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          id: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          photo_url: string | null
          preferred_language: string | null
          state: string | null
          updated_at: string
          user_id: string
          verification_status: boolean | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          verification_status?: boolean | null
        }
        Update: {
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: boolean | null
        }
        Relationships: []
      }
      scheduled_shifts: {
        Row: {
          ai_suggested: boolean
          created_at: string
          end_time: string
          id: string
          scheduled_date: string
          start_time: string
          status: string
          suggested_reason: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_suggested?: boolean
          created_at?: string
          end_time: string
          id?: string
          scheduled_date: string
          start_time: string
          status?: string
          suggested_reason?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_suggested?: boolean
          created_at?: string
          end_time?: string
          id?: string
          scheduled_date?: string
          start_time?: string
          status?: string
          suggested_reason?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shift_earnings: {
        Row: {
          amount: number
          chat_id: string | null
          created_at: string
          description: string | null
          earning_type: string
          id: string
          shift_id: string
          user_id: string
        }
        Insert: {
          amount: number
          chat_id?: string | null
          created_at?: string
          description?: string | null
          earning_type: string
          id?: string
          shift_id: string
          user_id: string
        }
        Update: {
          amount?: number
          chat_id?: string | null
          created_at?: string
          description?: string | null
          earning_type?: string
          id?: string
          shift_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_earnings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          bonus_earnings: number
          created_at: string
          earnings: number
          end_time: string | null
          id: string
          notes: string | null
          start_time: string
          status: string
          total_chats: number
          total_messages: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_earnings?: number
          created_at?: string
          earnings?: number
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string
          status?: string
          total_chats?: number
          total_messages?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_earnings?: number
          created_at?: string
          earnings?: number
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string
          status?: string
          total_chats?: number
          total_messages?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tutorial_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          skipped: boolean | null
          steps_viewed: number[] | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          skipped?: boolean | null
          steps_viewed?: number[] | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          skipped?: boolean | null
          steps_viewed?: number[] | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consent: {
        Row: {
          agreed_terms: boolean
          ccpa_consent: boolean | null
          consent_timestamp: string
          created_at: string
          dpdp_consent: boolean | null
          gdpr_consent: boolean | null
          id: string
          ip_address: string | null
          terms_version: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          agreed_terms?: boolean
          ccpa_consent?: boolean | null
          consent_timestamp?: string
          created_at?: string
          dpdp_consent?: boolean | null
          gdpr_consent?: boolean | null
          id?: string
          ip_address?: string | null
          terms_version?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          agreed_terms?: boolean
          ccpa_consent?: boolean | null
          consent_timestamp?: string
          created_at?: string
          dpdp_consent?: boolean | null
          gdpr_consent?: boolean | null
          id?: string
          ip_address?: string | null
          terms_version?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_languages: {
        Row: {
          created_at: string
          id: string
          language_code: string
          language_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          language_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          language_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          accent_color: string
          auto_translate: boolean
          created_at: string
          distance_unit: string
          id: string
          language: string
          notification_matches: boolean
          notification_messages: boolean
          notification_promotions: boolean
          notification_sound: boolean
          notification_vibration: boolean
          profile_visibility: string
          show_online_status: boolean
          show_read_receipts: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string
          auto_translate?: boolean
          created_at?: string
          distance_unit?: string
          id?: string
          language?: string
          notification_matches?: boolean
          notification_messages?: boolean
          notification_promotions?: boolean
          notification_sound?: boolean
          notification_vibration?: boolean
          profile_visibility?: string
          show_online_status?: boolean
          show_read_receipts?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string
          auto_translate?: boolean
          created_at?: string
          distance_unit?: string
          id?: string
          language?: string
          notification_matches?: boolean
          notification_messages?: boolean
          notification_promotions?: boolean
          notification_sound?: boolean
          notification_vibration?: boolean
          profile_visibility?: string
          show_online_status?: boolean
          show_read_receipts?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          last_seen: string
          status_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          status_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          status_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          status: string
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
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
