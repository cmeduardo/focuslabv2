/**
 * Tipos de la base de datos de Supabase, escritos a mano a partir de
 * supabase/migrations/. Si el esquema cambia, actualiza este archivo (y
 * ARCHITECTURE.md) en el mismo commit.
 *
 * Cuando el proyecto esté enlazado con el CLI de Supabase, este archivo se
 * puede regenerar con:
 *   npx supabase gen types typescript --linked > src/lib/types/database.ts
 */

export type UserRole = "participante" | "investigador" | "autoridad";
export type SessionStatus = "en_progreso" | "completada" | "abandonada";
export type ActivityType =
  | "reaction_test"
  | "focus_flow"
  | "memory_matrix"
  | "word_sprint"
  | "pattern_hunt"
  | "deep_read";
export type InteractionEventType =
  | "click"
  | "visibility_change"
  | "idle_start"
  | "idle_end"
  | "activity_start"
  | "activity_end"
  | "tool_start"
  | "tool_end"
  | "tool_interrupt"
  | "tool_progress"
  | "session_pulse";
export type KanbanTaskStatus = "pendiente" | "en_progreso" | "completado";
export type AiReportStatus = "pendiente" | "completado" | "fallido";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      consents: {
        Row: {
          id: string;
          user_id: string;
          consent_version: string;
          accepted_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["consents"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["consents"]["Row"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          status: SessionStatus;
          started_at: string;
          ended_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sessions"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Row"]>;
        Relationships: [];
      };
      interaction_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          event_type: InteractionEventType;
          payload: Record<string, unknown>;
          occurred_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["interaction_events"]["Row"]
        > & {
          session_id: string;
          user_id: string;
          event_type: InteractionEventType;
        };
        Update: Partial<
          Database["public"]["Tables"]["interaction_events"]["Row"]
        >;
        Relationships: [];
      };
      activity_results: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          activity_type: ActivityType;
          duration_ms: number;
          accuracy: number | null;
          level_reached: number | null;
          metrics: Record<string, unknown>;
          completed_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["activity_results"]["Row"]
        > & {
          session_id: string;
          user_id: string;
          activity_type: ActivityType;
          duration_ms: number;
        };
        Update: Partial<Database["public"]["Tables"]["activity_results"]["Row"]>;
        Relationships: [];
      };
      pomodoro_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          work_duration_minutes: number;
          break_duration_minutes: number;
          started_at: string;
          ended_at: string | null;
          completed_cycles: number;
          interrupted: boolean;
          pause_count: number;
          paused_ms: number;
        };
        Insert: Partial<
          Database["public"]["Tables"]["pomodoro_sessions"]["Row"]
        > & {
          user_id: string;
          work_duration_minutes: number;
          break_duration_minutes: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["pomodoro_sessions"]["Row"]
        >;
        Relationships: [];
      };
      kanban_tasks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          status: KanbanTaskStatus;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["kanban_tasks"]["Row"]> & {
          user_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["kanban_tasks"]["Row"]>;
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          archived: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["habits"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["habits"]["Row"]>;
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          completed: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["habit_logs"]["Row"]> & {
          habit_id: string;
          user_id: string;
          log_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["habit_logs"]["Row"]>;
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          start_at: string;
          end_at: string;
          created_at: string;
          completed: boolean | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["calendar_events"]["Row"]
        > & {
          user_id: string;
          title: string;
          start_at: string;
          end_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Row"]>;
        Relationships: [];
      };
      ai_reports: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          status: AiReportStatus;
          attentional_profile: string | null;
          strengths: string[];
          areas_for_improvement: string[];
          recommendations: string[];
          raw_response: Record<string, unknown> | null;
          requested_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_reports"]["Row"]> & {
          session_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_reports"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      vw_activity_results_summary: {
        Row: {
          activity_type: ActivityType;
          total_resultados: number;
          duracion_ms_promedio: number | null;
          precision_promedio: number | null;
          nivel_promedio: number | null;
          precision_desv_estandar: number | null;
        };
        Relationships: [];
      };
      vw_interaction_events_summary: {
        Row: {
          event_type: InteractionEventType;
          dia: string;
          total_eventos: number;
        };
        Relationships: [];
      };
      vw_sessions_summary: {
        Row: {
          dia: string;
          status: SessionStatus;
          total_sesiones: number;
          duracion_segundos_promedio: number | null;
        };
        Relationships: [];
      };
      vw_tool_usage_summary: {
        Row: {
          herramienta: "pomodoro" | "kanban";
          dia: string;
          total_usos: number;
          total_interrupciones: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
