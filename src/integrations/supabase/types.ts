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
      active_chat_sessions: {
        Row: {
          chat_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          last_activity_at: string
          man_user_id: string
          rate_per_minute: number
          started_at: string
          status: string
          total_earned: number
          total_minutes: number
          updated_at: string
          woman_user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          last_activity_at?: string
          man_user_id: string
          rate_per_minute?: number
          started_at?: string
          status?: string
          total_earned?: number
          total_minutes?: number
          updated_at?: string
          woman_user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          last_activity_at?: string
          man_user_id?: string
          rate_per_minute?: number
          started_at?: string
          status?: string
          total_earned?: number
          total_minutes?: number
          updated_at?: string
          woman_user_id?: string
        }
        Relationships: []
      }
      admin_revenue_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          man_user_id: string | null
          reference_id: string | null
          session_id: string | null
          transaction_type: string
          woman_user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          man_user_id?: string | null
          reference_id?: string | null
          session_id?: string | null
          transaction_type: string
          woman_user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          man_user_id?: string | null
          reference_id?: string | null
          session_id?: string | null
          transaction_type?: string
          woman_user_id?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean
          last_updated_by: string | null
          setting_key: string
          setting_name: string
          setting_type: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          last_updated_by?: string | null
          setting_key: string
          setting_name: string
          setting_type?: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean
          last_updated_by?: string | null
          setting_key?: string
          setting_name?: string
          setting_type?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type?: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string
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
      audit_logs: {
        Row: {
          action: string
          action_type: string
          admin_email: string | null
          admin_id: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_type: string
          status: string
          user_agent: string | null
        }
        Insert: {
          action: string
          action_type?: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type: string
          status?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_type?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_type: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          size_bytes: number | null
          started_at: string
          status: string
          storage_path: string | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          size_bytes?: number | null
          started_at?: string
          status?: string
          storage_path?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          size_bytes?: number | null
          started_at?: string
          status?: string
          storage_path?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          flag_reason: string | null
          flagged: boolean
          flagged_at: string | null
          flagged_by: string | null
          id: string
          is_read: boolean | null
          is_translated: boolean | null
          message: string
          moderation_status: string | null
          original_english: string | null
          receiver_id: string
          sender_id: string
          translated_message: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          is_read?: boolean | null
          is_translated?: boolean | null
          message: string
          moderation_status?: string | null
          original_english?: string | null
          receiver_id: string
          sender_id: string
          translated_message?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          flag_reason?: string | null
          flagged?: boolean
          flagged_at?: string | null
          flagged_by?: string | null
          id?: string
          is_read?: boolean | null
          is_translated?: boolean | null
          message?: string
          moderation_status?: string | null
          original_english?: string | null
          receiver_id?: string
          sender_id?: string
          translated_message?: string | null
        }
        Relationships: []
      }
      chat_pricing: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          min_withdrawal_balance: number
          rate_per_minute: number
          updated_at: string
          video_rate_per_minute: number
          video_women_earning_rate: number
          women_earning_rate: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          min_withdrawal_balance?: number
          rate_per_minute?: number
          updated_at?: string
          video_rate_per_minute?: number
          video_women_earning_rate?: number
          women_earning_rate?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          min_withdrawal_balance?: number
          rate_per_minute?: number
          updated_at?: string
          video_rate_per_minute?: number
          video_women_earning_rate?: number
          women_earning_rate?: number
        }
        Relationships: []
      }
      chat_wait_queue: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          matched_at: string | null
          preferred_language: string
          priority: number
          status: string
          updated_at: string
          user_id: string
          wait_time_seconds: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          matched_at?: string | null
          preferred_language: string
          priority?: number
          status?: string
          updated_at?: string
          user_id: string
          wait_time_seconds?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          matched_at?: string | null
          preferred_language?: string
          priority?: number
          status?: string
          updated_at?: string
          user_id?: string
          wait_time_seconds?: number | null
        }
        Relationships: []
      }
      community_announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          language_code: string
          leader_id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          language_code: string
          leader_id: string
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language_code?: string
          leader_id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_disputes: {
        Row: {
          created_at: string
          description: string | null
          dispute_type: string
          id: string
          language_code: string
          reported_user_id: string | null
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dispute_type?: string
          id?: string
          language_code: string
          reported_user_id?: string | null
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dispute_type?: string
          id?: string
          language_code?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_elections: {
        Row: {
          created_at: string
          election_officer_id: string
          election_results: Json | null
          election_year: number
          ended_at: string | null
          id: string
          language_code: string
          scheduled_at: string | null
          started_at: string | null
          status: string
          total_votes: number | null
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          election_officer_id: string
          election_results?: Json | null
          election_year: number
          ended_at?: string | null
          id?: string
          language_code: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          total_votes?: number | null
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          election_officer_id?: string
          election_results?: Json | null
          election_year?: number
          ended_at?: string | null
          id?: string
          language_code?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          total_votes?: number | null
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      community_leaders: {
        Row: {
          activity_status: string | null
          created_at: string
          election_id: string | null
          id: string
          language_code: string
          last_activity_at: string | null
          status: string
          term_end: string
          term_start: string
          user_id: string
        }
        Insert: {
          activity_status?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          language_code: string
          last_activity_at?: string | null
          status?: string
          term_end: string
          term_start?: string
          user_id: string
        }
        Update: {
          activity_status?: string | null
          created_at?: string
          election_id?: string | null
          id?: string
          language_code?: string
          last_activity_at?: string | null
          status?: string
          term_end?: string
          term_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_leaders_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "community_elections"
            referencedColumns: ["id"]
          },
        ]
      }
      community_shift_schedules: {
        Row: {
          created_at: string
          created_by: string
          end_time: string
          id: string
          language_code: string
          notes: string | null
          shift_date: string
          start_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_time: string
          id?: string
          language_code: string
          notes?: string | null
          shift_date: string
          start_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_time?: string
          id?: string
          language_code?: string
          notes?: string | null
          shift_date?: string
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      election_candidates: {
        Row: {
          created_at: string
          election_id: string
          id: string
          nominated_at: string
          nomination_status: string
          platform_statement: string | null
          user_id: string
          vote_count: number | null
        }
        Insert: {
          created_at?: string
          election_id: string
          id?: string
          nominated_at?: string
          nomination_status?: string
          platform_statement?: string | null
          user_id: string
          vote_count?: number | null
        }
        Update: {
          created_at?: string
          election_id?: string
          id?: string
          nominated_at?: string
          nomination_status?: string
          platform_statement?: string | null
          user_id?: string
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "election_candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "community_elections"
            referencedColumns: ["id"]
          },
        ]
      }
      election_officers: {
        Row: {
          assigned_at: string
          auto_assigned: boolean | null
          id: string
          is_active: boolean | null
          language_code: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          auto_assigned?: boolean | null
          id?: string
          is_active?: boolean | null
          language_code: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          auto_assigned?: boolean | null
          id?: string
          is_active?: boolean | null
          language_code?: string
          user_id?: string
        }
        Relationships: []
      }
      election_votes: {
        Row: {
          candidate_id: string
          election_id: string
          id: string
          is_tiebreaker: boolean | null
          voted_at: string
          voter_id: string
        }
        Insert: {
          candidate_id: string
          election_id: string
          id?: string
          is_tiebreaker?: boolean | null
          voted_at?: string
          voter_id: string
        }
        Update: {
          candidate_id?: string
          election_id?: string
          id?: string
          is_tiebreaker?: boolean | null
          voted_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "community_elections"
            referencedColumns: ["id"]
          },
        ]
      }
      female_profiles: {
        Row: {
          account_status: string
          age: number | null
          ai_approved: boolean | null
          ai_disapproval_reason: string | null
          approval_status: string
          auto_approved: boolean | null
          avg_response_time_seconds: number | null
          bio: string | null
          body_type: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          earning_badge_type: string | null
          earning_slot_assigned_at: string | null
          education_level: string | null
          full_name: string | null
          height_cm: number | null
          id: string
          interests: string[] | null
          is_earning_eligible: boolean | null
          is_indian: boolean | null
          is_premium: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          last_rotation_date: string | null
          life_goals: string[] | null
          marital_status: string | null
          monthly_chat_minutes: number | null
          occupation: string | null
          performance_score: number | null
          phone: string | null
          photo_url: string | null
          preferred_language: string | null
          primary_language: string | null
          profile_completeness: number | null
          promoted_from_free: boolean | null
          religion: string | null
          state: string | null
          suspended_at: string | null
          suspension_reason: string | null
          total_chats_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          age?: number | null
          ai_approved?: boolean | null
          ai_disapproval_reason?: string | null
          approval_status?: string
          auto_approved?: boolean | null
          avg_response_time_seconds?: number | null
          bio?: string | null
          body_type?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          earning_badge_type?: string | null
          earning_slot_assigned_at?: string | null
          education_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_earning_eligible?: boolean | null
          is_indian?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_rotation_date?: string | null
          life_goals?: string[] | null
          marital_status?: string | null
          monthly_chat_minutes?: number | null
          occupation?: string | null
          performance_score?: number | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          primary_language?: string | null
          profile_completeness?: number | null
          promoted_from_free?: boolean | null
          religion?: string | null
          state?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          total_chats_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          age?: number | null
          ai_approved?: boolean | null
          ai_disapproval_reason?: string | null
          approval_status?: string
          auto_approved?: boolean | null
          avg_response_time_seconds?: number | null
          bio?: string | null
          body_type?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          earning_badge_type?: string | null
          earning_slot_assigned_at?: string | null
          education_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_earning_eligible?: boolean | null
          is_indian?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_rotation_date?: string | null
          life_goals?: string[] | null
          marital_status?: string | null
          monthly_chat_minutes?: number | null
          occupation?: string | null
          performance_score?: number | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          primary_language?: string | null
          profile_completeness?: number | null
          promoted_from_free?: boolean | null
          religion?: string | null
          state?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          total_chats_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_transactions: {
        Row: {
          created_at: string
          currency: string
          gift_id: string
          id: string
          message: string | null
          price_paid: number
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          currency?: string
          gift_id: string
          id?: string
          message?: string | null
          price_paid: number
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          currency?: string
          gift_id?: string
          id?: string
          message?: string | null
          price_paid?: number
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_transactions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          category: string
          created_at: string
          currency: string
          description: string | null
          emoji: string
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          created_at: string
          gift_amount_paid: number
          group_id: string
          has_access: boolean
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gift_amount_paid?: number
          group_id: string
          has_access?: boolean
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gift_amount_paid?: number
          group_id?: string
          has_access?: boolean
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "private_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          group_id: string
          id: string
          is_translated: boolean | null
          message: string
          sender_id: string
          translated_message: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_id: string
          id?: string
          is_translated?: boolean | null
          message: string
          sender_id: string
          translated_message?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          group_id?: string
          id?: string
          is_translated?: boolean | null
          message?: string
          sender_id?: string
          translated_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "private_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_video_access: {
        Row: {
          access_expires_at: string
          access_granted_at: string
          created_at: string
          gift_amount: number
          gift_id: string | null
          group_id: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          access_expires_at?: string
          access_granted_at?: string
          created_at?: string
          gift_amount?: number
          gift_id?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          access_expires_at?: string
          access_granted_at?: string
          created_at?: string
          gift_amount?: number
          gift_id?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_video_access_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_video_access_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "private_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      language_community_groups: {
        Row: {
          created_at: string
          id: string
          language_code: string
          language_name: string
          member_count: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          language_name: string
          member_count?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          language_name?: string
          member_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      language_community_members: {
        Row: {
          group_id: string
          id: string
          is_active: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_community_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "language_community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      language_community_messages: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          language_code: string
          message: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          language_code: string
          message?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          language_code?: string
          message?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      language_groups: {
        Row: {
          created_at: string
          current_women_count: number
          description: string | null
          id: string
          is_active: boolean
          languages: string[]
          max_women_users: number
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_women_count?: number
          description?: string | null
          id?: string
          is_active?: boolean
          languages?: string[]
          max_women_users?: number
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_women_count?: number
          description?: string | null
          id?: string
          is_active?: boolean
          languages?: string[]
          max_women_users?: number
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      language_limits: {
        Row: {
          created_at: string
          current_call_women: number
          current_chat_women: number
          current_earning_women: number | null
          id: string
          is_active: boolean
          language_name: string
          max_call_women: number
          max_chat_women: number
          max_earning_women: number | null
          max_monthly_promotions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_call_women?: number
          current_chat_women?: number
          current_earning_women?: number | null
          id?: string
          is_active?: boolean
          language_name: string
          max_call_women?: number
          max_chat_women?: number
          max_earning_women?: number | null
          max_monthly_promotions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_call_women?: number
          current_chat_women?: number
          current_earning_women?: number | null
          id?: string
          is_active?: boolean
          language_name?: string
          max_call_women?: number
          max_chat_women?: number
          max_earning_women?: number | null
          max_monthly_promotions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      leader_admin_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          language_code: string
          leader_id: string
          message: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          language_code: string
          leader_id: string
          message: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          language_code?: string
          leader_id?: string
          message?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          effective_date: string | null
          file_path: string
          file_size: number | null
          id: string
          is_active: boolean
          mime_type: string | null
          name: string
          updated_at: string
          uploaded_by: string | null
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          effective_date?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          name: string
          updated_at?: string
          uploaded_by?: string | null
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          effective_date?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_active?: boolean
          mime_type?: string | null
          name?: string
          updated_at?: string
          uploaded_by?: string | null
          version?: string
        }
        Relationships: []
      }
      male_profiles: {
        Row: {
          account_status: string
          age: number | null
          bio: string | null
          body_type: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          education_level: string | null
          full_name: string | null
          height_cm: number | null
          id: string
          interests: string[] | null
          is_premium: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          life_goals: string[] | null
          marital_status: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          preferred_language: string | null
          primary_language: string | null
          profile_completeness: number | null
          religion: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          age?: number | null
          bio?: string | null
          body_type?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          education_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          life_goals?: string[] | null
          marital_status?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          primary_language?: string | null
          profile_completeness?: number | null
          religion?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          age?: number | null
          bio?: string | null
          body_type?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          education_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          life_goals?: string[] | null
          marital_status?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          primary_language?: string | null
          profile_completeness?: number | null
          religion?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
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
      message_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          message_count: number | null
          updated_at: string | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_count?: number | null
          updated_at?: string | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_count?: number | null
          updated_at?: string | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      moderation_reports: {
        Row: {
          action_reason: string | null
          action_taken: string | null
          chat_message_id: string | null
          content: string | null
          created_at: string
          id: string
          report_type: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_reason?: string | null
          action_taken?: string | null
          chat_message_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          report_type?: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_reason?: string | null
          action_taken?: string | null
          chat_message_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          report_type?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reports_chat_message_id_fkey"
            columns: ["chat_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
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
      officer_nomination_votes: {
        Row: {
          created_at: string | null
          id: string
          nomination_id: string
          vote_type: string
          voter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nomination_id: string
          vote_type: string
          voter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nomination_id?: string
          vote_type?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_nomination_votes_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "officer_nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_nominations: {
        Row: {
          approvals_count: number | null
          created_at: string | null
          id: string
          language_code: string
          nominated_by: string
          nominee_id: string
          rejections_count: number | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          approvals_count?: number | null
          created_at?: string | null
          id?: string
          language_code: string
          nominated_by: string
          nominee_id: string
          rejections_count?: number | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          approvals_count?: number | null
          created_at?: string | null
          id?: string
          language_code?: string
          nominated_by?: string
          nominee_id?: string
          rejections_count?: number | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          token_hash: string
          used: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          token_hash: string
          used?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token_hash?: string
          used?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_metrics: {
        Row: {
          active_chats: number
          active_users: number
          admin_profit: number
          completed_withdrawals: number
          created_at: string
          female_users: number
          gift_revenue: number
          id: string
          male_users: number
          men_recharges: number
          men_spent: number
          metric_date: string
          new_users: number
          pending_withdrawals: number
          total_chats: number
          total_matches: number
          total_messages: number
          total_users: number
          total_video_calls: number
          updated_at: string
          video_call_minutes: number
          video_call_revenue: number
          women_earnings: number
        }
        Insert: {
          active_chats?: number
          active_users?: number
          admin_profit?: number
          completed_withdrawals?: number
          created_at?: string
          female_users?: number
          gift_revenue?: number
          id?: string
          male_users?: number
          men_recharges?: number
          men_spent?: number
          metric_date?: string
          new_users?: number
          pending_withdrawals?: number
          total_chats?: number
          total_matches?: number
          total_messages?: number
          total_users?: number
          total_video_calls?: number
          updated_at?: string
          video_call_minutes?: number
          video_call_revenue?: number
          women_earnings?: number
        }
        Update: {
          active_chats?: number
          active_users?: number
          admin_profit?: number
          completed_withdrawals?: number
          created_at?: string
          female_users?: number
          gift_revenue?: number
          id?: string
          male_users?: number
          men_recharges?: number
          men_spent?: number
          metric_date?: string
          new_users?: number
          pending_withdrawals?: number
          total_chats?: number
          total_matches?: number
          total_messages?: number
          total_users?: number
          total_video_calls?: number
          updated_at?: string
          video_call_minutes?: number
          video_call_revenue?: number
          women_earnings?: number
        }
        Relationships: []
      }
      policy_violation_alerts: {
        Row: {
          action_taken: string | null
          admin_notes: string | null
          alert_type: string
          content: string | null
          created_at: string
          detected_by: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          source_chat_id: string | null
          source_message_id: string | null
          status: string
          updated_at: string
          user_id: string
          violation_type: string
        }
        Insert: {
          action_taken?: string | null
          admin_notes?: string | null
          alert_type?: string
          content?: string | null
          created_at?: string
          detected_by?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_chat_id?: string | null
          source_message_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          violation_type: string
        }
        Update: {
          action_taken?: string | null
          admin_notes?: string | null
          alert_type?: string
          content?: string | null
          created_at?: string
          detected_by?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          source_chat_id?: string | null
          source_message_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          violation_type?: string
        }
        Relationships: []
      }
      private_call_invitations: {
        Row: {
          caller_id: string
          caller_language: string | null
          created_at: string
          expires_at: string
          id: string
          min_gift_amount: number
          receiver_id: string
          status: string
          updated_at: string
        }
        Insert: {
          caller_id: string
          caller_language?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          min_gift_amount?: number
          receiver_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          caller_id?: string
          caller_language?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          min_gift_amount?: number
          receiver_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      private_calls: {
        Row: {
          access_expires_at: string | null
          admin_earnings: number | null
          call_type: string
          caller_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          gift_amount: number | null
          gift_id: string | null
          id: string
          receiver_id: string
          started_at: string | null
          status: string
          updated_at: string
          woman_earnings: number | null
        }
        Insert: {
          access_expires_at?: string | null
          admin_earnings?: number | null
          call_type?: string
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          gift_amount?: number | null
          gift_id?: string | null
          id?: string
          receiver_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          woman_earnings?: number | null
        }
        Update: {
          access_expires_at?: string | null
          admin_earnings?: number | null
          call_type?: string
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          gift_amount?: number | null
          gift_id?: string | null
          id?: string
          receiver_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          woman_earnings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "private_calls_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      private_groups: {
        Row: {
          access_type: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_live: boolean
          min_gift_amount: number
          name: string
          owner_id: string
          owner_language: string | null
          participant_count: number
          stream_id: string | null
          updated_at: string
        }
        Insert: {
          access_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_live?: boolean
          min_gift_amount?: number
          name: string
          owner_id: string
          owner_language?: string | null
          participant_count?: number
          stream_id?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_live?: boolean
          min_gift_amount?: number
          name?: string
          owner_id?: string
          owner_language?: string | null
          participant_count?: number
          stream_id?: string | null
          updated_at?: string
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
          account_status: string
          age: number | null
          ai_approved: boolean | null
          ai_disapproval_reason: string | null
          approval_status: string
          avg_response_time_seconds: number | null
          bio: string | null
          body_type: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          dietary_preference: string | null
          drinking_habit: string | null
          earning_badge_type: string | null
          earning_slot_assigned_at: string | null
          education_level: string | null
          email: string | null
          fitness_level: string | null
          full_name: string | null
          gender: string | null
          has_children: boolean | null
          height_cm: number | null
          id: string
          interests: string[] | null
          is_earning_eligible: boolean | null
          is_indian: boolean | null
          is_premium: boolean | null
          is_verified: boolean | null
          last_active_at: string | null
          last_rotation_date: string | null
          latitude: number | null
          life_goals: string[] | null
          longitude: number | null
          marital_status: string | null
          monthly_chat_minutes: number | null
          occupation: string | null
          performance_score: number | null
          personality_type: string | null
          pet_preference: string | null
          phone: string | null
          photo_url: string | null
          preferred_language: string | null
          primary_language: string | null
          profile_completeness: number | null
          promoted_from_free: boolean | null
          religion: string | null
          smoking_habit: string | null
          state: string | null
          total_chats_count: number | null
          travel_frequency: string | null
          updated_at: string
          user_id: string
          verification_status: boolean | null
          zodiac_sign: string | null
        }
        Insert: {
          account_status?: string
          age?: number | null
          ai_approved?: boolean | null
          ai_disapproval_reason?: string | null
          approval_status?: string
          avg_response_time_seconds?: number | null
          bio?: string | null
          body_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_preference?: string | null
          drinking_habit?: string | null
          earning_badge_type?: string | null
          earning_slot_assigned_at?: string | null
          education_level?: string | null
          email?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_earning_eligible?: boolean | null
          is_indian?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_rotation_date?: string | null
          latitude?: number | null
          life_goals?: string[] | null
          longitude?: number | null
          marital_status?: string | null
          monthly_chat_minutes?: number | null
          occupation?: string | null
          performance_score?: number | null
          personality_type?: string | null
          pet_preference?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          primary_language?: string | null
          profile_completeness?: number | null
          promoted_from_free?: boolean | null
          religion?: string | null
          smoking_habit?: string | null
          state?: string | null
          total_chats_count?: number | null
          travel_frequency?: string | null
          updated_at?: string
          user_id: string
          verification_status?: boolean | null
          zodiac_sign?: string | null
        }
        Update: {
          account_status?: string
          age?: number | null
          ai_approved?: boolean | null
          ai_disapproval_reason?: string | null
          approval_status?: string
          avg_response_time_seconds?: number | null
          bio?: string | null
          body_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dietary_preference?: string | null
          drinking_habit?: string | null
          earning_badge_type?: string | null
          earning_slot_assigned_at?: string | null
          education_level?: string | null
          email?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          has_children?: boolean | null
          height_cm?: number | null
          id?: string
          interests?: string[] | null
          is_earning_eligible?: boolean | null
          is_indian?: boolean | null
          is_premium?: boolean | null
          is_verified?: boolean | null
          last_active_at?: string | null
          last_rotation_date?: string | null
          latitude?: number | null
          life_goals?: string[] | null
          longitude?: number | null
          marital_status?: string | null
          monthly_chat_minutes?: number | null
          occupation?: string | null
          performance_score?: number | null
          personality_type?: string | null
          pet_preference?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_language?: string | null
          primary_language?: string | null
          profile_completeness?: number | null
          promoted_from_free?: boolean | null
          religion?: string | null
          smoking_habit?: string | null
          state?: string | null
          total_chats_count?: number | null
          travel_frequency?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: boolean | null
          zodiac_sign?: string | null
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
      shift_rotations: {
        Row: {
          affected_users: number | null
          created_at: string | null
          executed_at: string | null
          id: string
          notes: string | null
          rotation_date: string
        }
        Insert: {
          affected_users?: number | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          notes?: string | null
          rotation_date: string
        }
        Update: {
          affected_users?: number | null
          created_at?: string | null
          executed_at?: string | null
          id?: string
          notes?: string | null
          rotation_date?: string
        }
        Relationships: []
      }
      shift_templates: {
        Row: {
          break_hours: number
          created_at: string
          duration_hours: number
          end_time: string
          id: string
          is_active: boolean
          name: string
          rotation_order: number | null
          shift_code: string
          start_time: string
          updated_at: string
          work_hours: number
        }
        Insert: {
          break_hours?: number
          created_at?: string
          duration_hours?: number
          end_time: string
          id?: string
          is_active?: boolean
          name: string
          rotation_order?: number | null
          shift_code: string
          start_time: string
          updated_at?: string
          work_hours?: number
        }
        Update: {
          break_hours?: number
          created_at?: string
          duration_hours?: number
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string
          rotation_order?: number | null
          shift_code?: string
          start_time?: string
          updated_at?: string
          work_hours?: number
        }
        Relationships: []
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
      system_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_value: number
          id: string
          is_resolved: boolean
          message: string
          metric_name: string
          resolved_at: string | null
          threshold_value: number
        }
        Insert: {
          alert_type?: string
          created_at?: string
          current_value: number
          id?: string
          is_resolved?: boolean
          message: string
          metric_name: string
          resolved_at?: string | null
          threshold_value: number
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_value?: number
          id?: string
          is_resolved?: boolean
          message?: string
          metric_name?: string
          resolved_at?: string | null
          threshold_value?: number
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          active_connections: number
          cpu_usage: number
          created_at: string
          disk_usage: number | null
          error_rate: number | null
          id: string
          memory_usage: number
          network_in: number | null
          network_out: number | null
          recorded_at: string
          response_time: number
        }
        Insert: {
          active_connections?: number
          cpu_usage?: number
          created_at?: string
          disk_usage?: number | null
          error_rate?: number | null
          id?: string
          memory_usage?: number
          network_in?: number | null
          network_out?: number | null
          recorded_at?: string
          response_time?: number
        }
        Update: {
          active_connections?: number
          cpu_usage?: number
          created_at?: string
          disk_usage?: number | null
          error_rate?: number | null
          id?: string
          memory_usage?: number
          network_in?: number | null
          network_out?: number | null
          recorded_at?: string
          response_time?: number
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
      user_blocks: {
        Row: {
          block_type: string
          blocked_by: string
          blocked_user_id: string
          created_at: string
          expires_at: string | null
          id: string
          reason: string | null
        }
        Insert: {
          block_type?: string
          blocked_by: string
          blocked_user_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
        }
        Update: {
          block_type?: string
          blocked_by?: string
          blocked_user_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          reason?: string | null
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
      user_friends: {
        Row: {
          created_at: string
          created_by: string | null
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
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
      user_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          photo_type: string
          photo_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          photo_type?: string
          photo_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          photo_type?: string
          photo_url?: string
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
          active_call_count: number | null
          active_chat_count: number | null
          created_at: string
          id: string
          is_online: boolean
          last_seen: string
          max_parallel_calls: number | null
          max_parallel_chats: number | null
          status_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_call_count?: number | null
          active_chat_count?: number | null
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          max_parallel_calls?: number | null
          max_parallel_chats?: number | null
          status_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_call_count?: number | null
          active_chat_count?: number | null
          created_at?: string
          id?: string
          is_online?: boolean
          last_seen?: string
          max_parallel_calls?: number | null
          max_parallel_chats?: number | null
          status_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          issued_by: string
          message: string
          user_id: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          issued_by: string
          message: string
          user_id: string
          warning_type?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          issued_by?: string
          message?: string
          user_id?: string
          warning_type?: string
        }
        Relationships: []
      }
      video_call_sessions: {
        Row: {
          call_id: string
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          man_user_id: string
          rate_per_minute: number
          started_at: string | null
          status: string
          total_earned: number
          total_minutes: number
          updated_at: string
          woman_user_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          man_user_id: string
          rate_per_minute?: number
          started_at?: string | null
          status?: string
          total_earned?: number
          total_minutes?: number
          updated_at?: string
          woman_user_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          man_user_id?: string
          rate_per_minute?: number
          started_at?: string | null
          status?: string
          total_earned?: number
          total_minutes?: number
          updated_at?: string
          woman_user_id?: string
        }
        Relationships: []
      }
      voter_registry: {
        Row: {
          election_id: string
          id: string
          is_eligible: boolean | null
          registered_at: string
          registered_by: string
          user_id: string
        }
        Insert: {
          election_id: string
          id?: string
          is_eligible?: boolean | null
          registered_at?: string
          registered_by: string
          user_id: string
        }
        Update: {
          election_id?: string
          id?: string
          is_eligible?: boolean | null
          registered_at?: string
          registered_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voter_registry_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "community_elections"
            referencedColumns: ["id"]
          },
        ]
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
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_details: Json | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      women_availability: {
        Row: {
          created_at: string
          current_call_count: number | null
          current_chat_count: number
          id: string
          is_available: boolean
          is_available_for_calls: boolean | null
          last_assigned_at: string | null
          max_concurrent_calls: number | null
          max_concurrent_chats: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_call_count?: number | null
          current_chat_count?: number
          id?: string
          is_available?: boolean
          is_available_for_calls?: boolean | null
          last_assigned_at?: string | null
          max_concurrent_calls?: number | null
          max_concurrent_chats?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_call_count?: number | null
          current_chat_count?: number
          id?: string
          is_available?: boolean
          is_available_for_calls?: boolean | null
          last_assigned_at?: string | null
          max_concurrent_calls?: number | null
          max_concurrent_chats?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      women_earnings: {
        Row: {
          amount: number
          chat_session_id: string | null
          created_at: string
          description: string | null
          earning_type: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          chat_session_id?: string | null
          created_at?: string
          description?: string | null
          earning_type?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          chat_session_id?: string | null
          created_at?: string
          description?: string | null
          earning_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "women_earnings_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "active_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      women_shift_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          id: string
          is_active: boolean
          language_group_id: string | null
          shift_template_id: string | null
          updated_at: string
          user_id: string
          week_off_days: number[]
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language_group_id?: string | null
          shift_template_id?: string | null
          updated_at?: string
          user_id: string
          week_off_days?: number[]
        }
        Update: {
          assigned_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language_group_id?: string | null
          shift_template_id?: string | null
          updated_at?: string
          user_id?: string
          week_off_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "women_shift_assignments_language_group_id_fkey"
            columns: ["language_group_id"]
            isOneToOne: false
            referencedRelation: "language_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "women_shift_assignments_shift_template_id_fkey"
            columns: ["shift_template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_earning_slots: { Args: never; Returns: Json }
      check_group_video_access: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Json
      }
      check_message_rate_limit: {
        Args: {
          max_messages?: number
          p_user_id: string
          window_minutes?: number
        }
        Returns: boolean
      }
      check_private_call_access: {
        Args: { p_call_id: string; p_user_id: string }
        Returns: Json
      }
      cleanup_chat_media: { Args: never; Returns: undefined }
      cleanup_expired_data: { Args: never; Returns: undefined }
      cleanup_idle_sessions: { Args: never; Returns: undefined }
      cleanup_old_group_messages: { Args: never; Returns: undefined }
      cleanup_old_group_video_sessions: { Args: never; Returns: undefined }
      cleanup_video_sessions: { Args: never; Returns: undefined }
      expire_group_video_access: { Args: never; Returns: undefined }
      get_current_chat_rate: {
        Args: never
        Returns: {
          chat_rate: number
          currency: string
          video_rate: number
        }[]
      }
      get_group_owner_profile: {
        Args: { owner_user_id: string }
        Returns: {
          full_name: string
          photo_url: string
          user_id: string
        }[]
      }
      get_matched_female_profile: {
        Args: { target_user_id: string }
        Returns: {
          age: number
          approval_status: string
          bio: string
          country: string
          full_name: string
          id: string
          interests: string[]
          is_verified: boolean
          occupation: string
          photo_url: string
          state: string
        }[]
      }
      get_matched_profile: {
        Args: { target_user_id: string }
        Returns: {
          age: number
          bio: string
          country: string
          full_name: string
          gender: string
          id: string
          interests: string[]
          is_verified: boolean
          occupation: string
          photo_url: string
          state: string
        }[]
      }
      get_online_men_dashboard: {
        Args: never
        Returns: {
          active_chat_count: number
          age: number
          country: string
          full_name: string
          last_seen: string
          mother_tongue: string
          photo_url: string
          preferred_language: string
          primary_language: string
          state: string
          user_id: string
          wallet_balance: number
        }[]
      }
      get_safe_profile: {
        Args: { target_user_id: string }
        Returns: {
          age: number
          bio: string
          country: string
          full_name: string
          gender: string
          id: string
          interests: string[]
          occupation: string
          photo_url: string
          state: string
        }[]
      }
      get_top_earner_today: {
        Args: never
        Returns: {
          full_name: string
          total_amount: number
          user_id: string
        }[]
      }
      get_woman_monthly_chat_minutes: {
        Args: { p_month_start: string; p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_vote_count: {
        Args: { candidate_uuid: string }
        Returns: undefined
      }
      is_indian_woman: { Args: { p_country: string }; Returns: boolean }
      is_super_user: { Args: { user_email: string }; Returns: boolean }
      perform_monthly_earning_rotation: { Args: never; Returns: Json }
      process_atomic_transfer: {
        Args: {
          p_amount: number
          p_description?: string
          p_from_user_id: string
          p_to_user_id: string
        }
        Returns: Json
      }
      process_chat_billing: {
        Args: { p_minutes: number; p_session_id: string }
        Returns: Json
      }
      process_gift_transaction: {
        Args: {
          p_gift_id: string
          p_message?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      process_group_gift: {
        Args: { p_gift_id: string; p_group_id: string; p_sender_id: string }
        Returns: Json
      }
      process_group_video_gift: {
        Args: { p_gift_id: string; p_group_id: string; p_sender_id: string }
        Returns: Json
      }
      process_private_call_gift: {
        Args: {
          p_gift_id: string
          p_invitation_id?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: Json
      }
      process_recharge: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      process_video_billing: {
        Args: { p_minutes: number; p_session_id: string }
        Returns: Json
      }
      process_wallet_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      process_withdrawal_request: {
        Args: {
          p_amount: number
          p_payment_details?: Json
          p_payment_method?: string
          p_user_id: string
        }
        Returns: Json
      }
      rotate_monthly_shifts: { Args: never; Returns: undefined }
      should_bypass_balance: { Args: { p_user_id: string }; Returns: boolean }
      should_woman_earn: { Args: { p_user_id: string }; Returns: boolean }
      update_daily_platform_metrics: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
