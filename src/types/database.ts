// Database types for Supabase
// These mirror the SQL schema and provide type safety

export type Database = {
  public: {
    Tables: {
      exercises: {
        Row: {
          id: string
          user_id: string | null
          name: string
          category: string | null
          is_custom: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          category?: string | null
          is_custom?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          category?: string | null
          is_custom?: boolean
          created_at?: string
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          day_of_week: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          day_of_week?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          day_of_week?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          id: string
          template_id: string
          exercise_name: string
          target_sets: number
          target_reps_min: number
          target_reps_max: number | null
          order_index: number
          notes: string | null
        }
        Insert: {
          id?: string
          template_id: string
          exercise_name: string
          target_sets: number
          target_reps_min: number
          target_reps_max?: number | null
          order_index: number
          notes?: string | null
        }
        Update: {
          id?: string
          template_id?: string
          exercise_name?: string
          target_sets?: number
          target_reps_min?: number
          target_reps_max?: number | null
          order_index?: number
          notes?: string | null
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          date: string
          duration_minutes: number | null
          notes: string | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          date?: string
          duration_minutes?: number | null
          notes?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          date?: string
          duration_minutes?: number | null
          notes?: string | null
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      logged_sets: {
        Row: {
          id: string
          session_id: string
          exercise_name: string
          set_number: number
          weight: number
          reps: number
          rpe: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          exercise_name: string
          set_number: number
          weight: number
          reps: number
          rpe?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          exercise_name?: string
          set_number?: number
          weight?: number
          reps?: number
          rpe?: number | null
          notes?: string | null
          created_at?: string
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

// Convenience types for common use cases
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row']
export type TemplateExercise = Database['public']['Tables']['template_exercises']['Row']
export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row']
export type LoggedSet = Database['public']['Tables']['logged_sets']['Row']

// Insert types
export type ExerciseInsert = Database['public']['Tables']['exercises']['Insert']
export type WorkoutTemplateInsert = Database['public']['Tables']['workout_templates']['Insert']
export type TemplateExerciseInsert = Database['public']['Tables']['template_exercises']['Insert']
export type WorkoutSessionInsert = Database['public']['Tables']['workout_sessions']['Insert']
export type LoggedSetInsert = Database['public']['Tables']['logged_sets']['Insert']
