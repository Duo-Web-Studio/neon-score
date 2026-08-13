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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          notes: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          notes?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          activated_at: string | null
          churn_notes: string | null
          churn_reason: string | null
          churned_at: string | null
          company: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          monthly_revenue: number
          name: string
          notes: string | null
          phone: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          churn_notes?: string | null
          churn_reason?: string | null
          churned_at?: string | null
          company?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          monthly_revenue?: number
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          churn_notes?: string | null
          churn_reason?: string | null
          churned_at?: string | null
          company?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          monthly_revenue?: number
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      commission_periods: {
        Row: {
          closed_at: string | null
          commission_rate: number
          commission_value: number
          created_at: string
          deals_count: number
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          revenue: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          commission_rate?: number
          commission_value?: number
          created_at?: string
          deals_count?: number
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          revenue?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          commission_rate?: number
          commission_value?: number
          created_at?: string
          deals_count?: number
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          revenue?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commission_rates: {
        Row: {
          id: string
          percentage: number
          role: Database["public"]["Enums"]["app_role"] | null
          scope: string
          updated_at: string
          updated_by: string
          user_id: string | null
        }
        Insert: {
          id?: string
          percentage: number
          role?: Database["public"]["Enums"]["app_role"] | null
          scope: string
          updated_at?: string
          updated_by: string
          user_id?: string | null
        }
        Update: {
          id?: string
          percentage?: number
          role?: Database["public"]["Enums"]["app_role"] | null
          scope?: string
          updated_at?: string
          updated_by?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          client_id: string | null
          closed_at: string | null
          closed_by_role: Database["public"]["Enums"]["app_role"] | null
          closed_by_user_id: string | null
          commission_paid_at: string | null
          commission_paid_by: string | null
          company_name: string
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          converted_at: string | null
          created_at: string
          description: string | null
          id: string
          meeting_at: string | null
          next_action_at: string | null
          priority: string
          recovered_at: string | null
          section_id: string | null
          source: string
          stage: string
          user_id: string
          value: number
          was_lost: boolean
        }
        Insert: {
          client_id?: string | null
          closed_at?: string | null
          closed_by_role?: Database["public"]["Enums"]["app_role"] | null
          closed_by_user_id?: string | null
          commission_paid_at?: string | null
          commission_paid_by?: string | null
          company_name: string
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          converted_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          meeting_at?: string | null
          next_action_at?: string | null
          priority?: string
          recovered_at?: string | null
          section_id?: string | null
          source?: string
          stage?: string
          user_id: string
          value?: number
          was_lost?: boolean
        }
        Update: {
          client_id?: string | null
          closed_at?: string | null
          closed_by_role?: Database["public"]["Enums"]["app_role"] | null
          closed_by_user_id?: string | null
          commission_paid_at?: string | null
          commission_paid_by?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          converted_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          meeting_at?: string | null
          next_action_at?: string | null
          priority?: string
          recovered_at?: string | null
          section_id?: string | null
          source?: string
          stage?: string
          user_id?: string
          value?: number
          was_lost?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string
          current_value: number
          end_date: string
          id: string
          parent_goal_id: string | null
          period: string
          start_date: string
          status: string
          target_user_id: string | null
          target_value: number
          title: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by: string
          current_value?: number
          end_date: string
          id?: string
          parent_goal_id?: string | null
          period?: string
          start_date: string
          status?: string
          target_user_id?: string | null
          target_value: number
          title: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string
          current_value?: number
          end_date?: string
          id?: string
          parent_goal_id?: string | null
          period?: string
          start_date?: string
          status?: string
          target_user_id?: string | null
          target_value?: number
          title?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          is_final: boolean
          key: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          is_final?: boolean
          key: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          is_final?: boolean
          key?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id: string
          status?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          color: string
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
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
      close_commission_month: {
        Args: { _period_start: string }
        Returns: number
      }
      get_commission_rate_for_user:
        | { Args: { _user_id: string }; Returns: number }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: number
          }
      get_profile_status: { Args: { _user_id: string }; Returns: string }
      rollover_commissions: { Args: never; Returns: number }
      rollover_monthly_goals: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "sdr" | "closer"
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
      app_role: ["admin", "sdr", "closer"],
    },
  },
} as const
