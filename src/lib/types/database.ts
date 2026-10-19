/**
 * Tipos de la base de datos de Supabase, escritos a mano a partir de
 * supabase/migrations/ (20261019000000_esquema.sql y las posteriores). Si el esquema cambia, actualiza este archivo (y
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
export type ActivityRunStatus = "en_curso" | "completada" | "incompleta";
export type DeviceType = "mobile" | "tablet" | "desktop";
export type InputType = "touch" | "mouse" | "keyboard";

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string;
          nombre_completo: string | null;
          rol: UserRole;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["perfiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["perfiles"]["Row"]>;
        Relationships: [];
      };
      consentimientos: {
        Row: {
          id: string;
          perfil_id: string;
          version_consentimiento: string;
          aceptado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["consentimientos"]["Row"]> & {
          perfil_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["consentimientos"]["Row"]>;
        Relationships: [];
      };
      sesiones: {
        Row: {
          id: string;
          perfil_id: string;
          estado: SessionStatus;
          iniciada_en: string;
          finalizada_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sesiones"]["Row"]> & {
          perfil_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["sesiones"]["Row"]>;
        Relationships: [];
      };
      eventos_interaccion: {
        Row: {
          id: string;
          sesion_id: string;
          perfil_id: string;
          tipo_evento: InteractionEventType;
          datos: Record<string, unknown>;
          ocurrido_en: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["eventos_interaccion"]["Row"]
        > & {
          sesion_id: string;
          perfil_id: string;
          tipo_evento: InteractionEventType;
        };
        Update: Partial<
          Database["public"]["Tables"]["eventos_interaccion"]["Row"]
        >;
        Relationships: [];
      };
      resultados_actividad: {
        Row: {
          id: string;
          sesion_id: string;
          perfil_id: string;
          tipo_actividad: ActivityType;
          duracion_ms: number;
          precision: number | null;
          nivel_alcanzado: number | null;
          metricas: Record<string, unknown>;
          completado_en: string;
          intento_id: string | null;
          version_protocolo: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["resultados_actividad"]["Row"]
        > & {
          sesion_id: string;
          perfil_id: string;
          tipo_actividad: ActivityType;
          duracion_ms: number;
        };
        Update: Partial<Database["public"]["Tables"]["resultados_actividad"]["Row"]>;
        Relationships: [];
      };
      intentos_actividad: {
        Row: {
          id: string;
          sesion_id: string;
          perfil_id: string;
          tipo_actividad: ActivityType;
          version_protocolo: string;
          estado: ActivityRunStatus;
          iniciado_en: string;
          finalizado_en: string | null;
          rondas_practica: number;
          configuracion: Record<string, unknown>;
          tipo_dispositivo: DeviceType | null;
          entrada_principal: InputType | null;
          conteo_entradas: Partial<Record<InputType, number>>;
          ancho_ventana: number | null;
          alto_ventana: number | null;
          proporcion_pixeles: number | null;
          orientacion: "portrait" | "landscape" | null;
          navegador: string | null;
          sistema_operativo: string | null;
          frecuencia_refresco_est: number | null;
          perdidas_visibilidad: number;
        };
        Insert: Partial<Database["public"]["Tables"]["intentos_actividad"]["Row"]> & {
          id: string;
          sesion_id: string;
          perfil_id: string;
          tipo_actividad: ActivityType;
        };
        Update: Partial<Database["public"]["Tables"]["intentos_actividad"]["Row"]>;
        Relationships: [];
      };
      ensayos_actividad: {
        Row: {
          id: number;
          intento_id: string;
          perfil_id: string;
          indice_ensayo: number;
          condicion: Record<string, unknown>;
          inicio_estimulo_ms: number | null;
          respuesta_en_ms: number | null;
          tiempo_reaccion_ms: number | null;
          respuesta: string | null;
          detalle_respuesta: Record<string, unknown> | null;
          correcto: boolean | null;
          clasificacion: string | null;
          tipo_entrada: InputType | null;
          valido: boolean;
          motivo_invalidez: string | null;
        };
        Insert: Partial<
          Omit<Database["public"]["Tables"]["ensayos_actividad"]["Row"], "id">
        > & {
          intento_id: string;
          perfil_id: string;
          indice_ensayo: number;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["ensayos_actividad"]["Row"], "id">
        >;
        Relationships: [];
      };
      sesiones_pomodoro: {
        Row: {
          id: string;
          perfil_id: string;
          sesion_id: string | null;
          duracion_trabajo_minutos: number;
          duracion_descanso_minutos: number;
          iniciada_en: string;
          finalizada_en: string | null;
          ciclos_completados: number;
          interrumpida: boolean;
          veces_pausado: number;
          ms_pausado: number;
        };
        Insert: Partial<
          Database["public"]["Tables"]["sesiones_pomodoro"]["Row"]
        > & {
          perfil_id: string;
          duracion_trabajo_minutos: number;
          duracion_descanso_minutos: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["sesiones_pomodoro"]["Row"]
        >;
        Relationships: [];
      };
      tareas_kanban: {
        Row: {
          id: string;
          perfil_id: string;
          titulo: string;
          descripcion: string | null;
          estado: KanbanTaskStatus;
          posicion: number;
          creado_en: string;
          actualizado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tareas_kanban"]["Row"]> & {
          perfil_id: string;
          titulo: string;
        };
        Update: Partial<Database["public"]["Tables"]["tareas_kanban"]["Row"]>;
        Relationships: [];
      };
      habitos: {
        Row: {
          id: string;
          perfil_id: string;
          nombre: string;
          archivado: boolean;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["habitos"]["Row"]> & {
          perfil_id: string;
          nombre: string;
        };
        Update: Partial<Database["public"]["Tables"]["habitos"]["Row"]>;
        Relationships: [];
      };
      registros_habito: {
        Row: {
          id: string;
          habito_id: string;
          perfil_id: string;
          fecha: string;
          completado: boolean;
          creado_en: string;
        };
        Insert: Partial<Database["public"]["Tables"]["registros_habito"]["Row"]> & {
          habito_id: string;
          perfil_id: string;
          fecha: string;
        };
        Update: Partial<Database["public"]["Tables"]["registros_habito"]["Row"]>;
        Relationships: [];
      };
      eventos_calendario: {
        Row: {
          id: string;
          perfil_id: string;
          titulo: string;
          descripcion: string | null;
          inicio_en: string;
          fin_en: string;
          creado_en: string;
          completado: boolean | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["eventos_calendario"]["Row"]
        > & {
          perfil_id: string;
          titulo: string;
          inicio_en: string;
          fin_en: string;
        };
        Update: Partial<Database["public"]["Tables"]["eventos_calendario"]["Row"]>;
        Relationships: [];
      };
      informes_ia: {
        Row: {
          id: string;
          sesion_id: string;
          perfil_id: string;
          estado: AiReportStatus;
          perfil_atencional: string | null;
          fortalezas: string[];
          areas_de_mejora: string[];
          recomendaciones: string[];
          respuesta_cruda: Record<string, unknown> | null;
          solicitado_en: string;
          completado_en: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["informes_ia"]["Row"]> & {
          sesion_id: string;
          perfil_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["informes_ia"]["Row"]>;
        Relationships: [];
      };
      // Sin acceso desde la API: la escribe el servidor con la service role.
      verificaciones_sesion: {
        Row: {
          sesion_auth_id: string;
          perfil_id: string;
          codigo_hash: string;
          intentos: number;
          enviado_en: string;
          expira_en: string;
          verificada_en: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["verificaciones_sesion"]["Row"],
          "intentos" | "enviado_en" | "verificada_en"
        > &
          Partial<
            Pick<
              Database["public"]["Tables"]["verificaciones_sesion"]["Row"],
              "intentos" | "enviado_en" | "verificada_en"
            >
          >;
        Update: Partial<Database["public"]["Tables"]["verificaciones_sesion"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      vw_resumen_resultados_actividad: {
        Row: {
          tipo_actividad: ActivityType;
          total_resultados: number;
          duracion_ms_promedio: number | null;
          precision_promedio: number | null;
          nivel_promedio: number | null;
          precision_desv_estandar: number | null;
          version_protocolo: string;
        };
        Relationships: [];
      };
      vw_actividades_dimensiones: {
        Row: {
          tipo_actividad: ActivityType;
          dimension: string;
          metrica_principal: string;
          tipo_dispositivo: string;
          participantes: number;
          valor_promedio: number | null;
          valor_desv_estandar: number | null;
          valor_minimo: number | null;
          valor_maximo: number | null;
          precision_promedio: number | null;
          duracion_s_promedio: number | null;
        };
        Relationships: [];
      };
      vw_participantes_analisis: {
        Row: Record<string, string | number | null> & { participante: string };
        Relationships: [];
      };
      vw_ensayos_analisis: {
        Row: {
          participante: string;
          tipo_actividad: ActivityType;
          tipo_dispositivo: string | null;
          entrada_principal: string | null;
          frecuencia_refresco_est: number | null;
          corrida_inicio: string;
          indice_ensayo: number;
          condicion: Record<string, unknown>;
          inicio_estimulo_ms: number | null;
          tiempo_reaccion_ms: number | null;
          respuesta: string | null;
          correcto: boolean | null;
          clasificacion: string | null;
          tipo_entrada: string | null;
          valido: boolean;
          motivo_invalidez: string | null;
        };
        Relationships: [];
      };
      vw_resumen_eventos_interaccion: {
        Row: {
          tipo_evento: InteractionEventType;
          dia: string;
          total_eventos: number;
        };
        Relationships: [];
      };
      vw_resumen_sesiones: {
        Row: {
          dia: string;
          estado: SessionStatus;
          total_sesiones: number;
          duracion_segundos_promedio: number | null;
        };
        Relationships: [];
      };
      vw_resumen_uso_herramientas: {
        Row: {
          herramienta: "pomodoro" | "kanban";
          dia: string;
          total_usos: number;
          total_interrupciones: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      sesion_staff_verificada: { Args: Record<string, never>; Returns: boolean };
    };
  };
}
