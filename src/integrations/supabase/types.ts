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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alarm_settings: {
        Row: {
          created_at: string
          custom_sound_url: string | null
          default_sound: string
          enabled: boolean
          push_enabled: boolean
          ring_seconds: number
          snooze_minutes: number
          tts_enabled: boolean
          tts_voice: string
          updated_at: string
          user_id: string
          vibrate: boolean
          volume: number
        }
        Insert: {
          created_at?: string
          custom_sound_url?: string | null
          default_sound?: string
          enabled?: boolean
          push_enabled?: boolean
          ring_seconds?: number
          snooze_minutes?: number
          tts_enabled?: boolean
          tts_voice?: string
          updated_at?: string
          user_id: string
          vibrate?: boolean
          volume?: number
        }
        Update: {
          created_at?: string
          custom_sound_url?: string | null
          default_sound?: string
          enabled?: boolean
          push_enabled?: boolean
          ring_seconds?: number
          snooze_minutes?: number
          tts_enabled?: boolean
          tts_voice?: string
          updated_at?: string
          user_id?: string
          vibrate?: boolean
          volume?: number
        }
        Relationships: []
      }
      appointments: {
        Row: {
          address: string | null
          alarm_enabled: boolean
          alarm_message: string | null
          created_at: string
          doctor: string | null
          duration_minutes: number
          id: string
          location: string | null
          notes: string | null
          reminder_minutes_before: number
          scheduled_at: string
          specialty: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          title: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          alarm_enabled?: boolean
          alarm_message?: string | null
          created_at?: string
          doctor?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          reminder_minutes_before?: number
          scheduled_at: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          title: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          alarm_enabled?: boolean
          alarm_message?: string | null
          created_at?: string
          doctor?: string | null
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          reminder_minutes_before?: number
          scheduled_at?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          title?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          name: string
          phone: string
          priority: number
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          priority?: number
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          priority?: number
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_metrics: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          notes: string | null
          text_value: string | null
          type: Database["public"]["Enums"]["health_metric_type"]
          updated_at: string
          user_id: string
          value_1: number | null
          value_2: number | null
          value_3: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          text_value?: string | null
          type: Database["public"]["Enums"]["health_metric_type"]
          updated_at?: string
          user_id: string
          value_1?: number | null
          value_2?: number | null
          value_3?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          text_value?: string | null
          type?: Database["public"]["Enums"]["health_metric_type"]
          updated_at?: string
          user_id?: string
          value_1?: number | null
          value_2?: number | null
          value_3?: number | null
        }
        Relationships: []
      }
      medical_documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          description: string | null
          doctor_name: string | null
          document_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          doctor_name?: string | null
          document_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          description?: string | null
          doctor_name?: string | null
          document_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_profiles: {
        Row: {
          allergies: string | null
          blood_type: string | null
          chronic_conditions: string | null
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          chronic_conditions?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medication_logs: {
        Row: {
          created_at: string
          id: string
          medication_id: string
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["med_log_status"]
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id: string
          notes?: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["med_log_status"]
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["med_log_status"]
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          alarm_enabled: boolean
          alarm_message: string | null
          alert_phone: string | null
          created_at: string
          doctor: string | null
          dosage: string | null
          end_date: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          pills_per_dose: number
          start_date: string
          stock_quantity: number
          stock_threshold: number
          times: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          alarm_enabled?: boolean
          alarm_message?: string | null
          alert_phone?: string | null
          created_at?: string
          doctor?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          pills_per_dose?: number
          start_date?: string
          stock_quantity?: number
          stock_threshold?: number
          times?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          alarm_enabled?: boolean
          alarm_message?: string | null
          alert_phone?: string | null
          created_at?: string
          doctor?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          pills_per_dose?: number
          start_date?: string
          stock_quantity?: number
          stock_threshold?: number
          times?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          alarm_enabled: boolean
          alarm_message: string | null
          category: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alarm_enabled?: boolean
          alarm_message?: string | null
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alarm_enabled?: boolean
          alarm_message?: string | null
          category?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          created_at: string
          drank_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drank_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drank_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      water_settings: {
        Row: {
          created_at: string
          daily_goal: number
          enabled: boolean
          interval_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_goal?: number
          enabled?: boolean
          interval_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_goal?: number
          enabled?: boolean
          interval_minutes?: number
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
      appointment_status: "agendado" | "realizado" | "cancelado" | "remarcado"
      appointment_type:
        | "consulta"
        | "exame"
        | "procedimento"
        | "retorno"
        | "outro"
      chat_role: "user" | "assistant"
      document_category: "receita" | "exame" | "laudo" | "outros"
      health_metric_type:
        | "pressao"
        | "glicemia"
        | "peso"
        | "sono"
        | "humor"
        | "hidratacao"
      med_log_status: "taken" | "missed" | "late" | "skipped"
      task_priority: "baixa" | "media" | "alta"
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
      appointment_status: ["agendado", "realizado", "cancelado", "remarcado"],
      appointment_type: [
        "consulta",
        "exame",
        "procedimento",
        "retorno",
        "outro",
      ],
      chat_role: ["user", "assistant"],
      document_category: ["receita", "exame", "laudo", "outros"],
      health_metric_type: [
        "pressao",
        "glicemia",
        "peso",
        "sono",
        "humor",
        "hidratacao",
      ],
      med_log_status: ["taken", "missed", "late", "skipped"],
      task_priority: ["baixa", "media", "alta"],
    },
  },
} as const
