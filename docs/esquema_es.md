# Esquema de la base de datos en español

Contrato de nombres para la migración del esquema al español. El diagrama
entidad-relación de la tesis (sección 5.13, entregada el 17 de octubre de 2026)
ya usa estos nombres; la migración debe producir **exactamente** estos nombres
para que el sistema en vivo coincida con el documento.

Reglas de la migración:

- Solo `ALTER TABLE … RENAME`, `ALTER TABLE … RENAME COLUMN`, `ALTER TYPE … RENAME`,
  `ALTER VIEW … RENAME` y `ALTER ROLE … RENAME`: no se copian ni se borran filas.
  Se conservan todos los datos, llaves, índices y políticas RLS.
- Las migraciones anteriores no se modifican; el cambio va en una migración nueva.
- Los **valores** de los tipos enumerados no cambian, ni el contenido de las
  columnas `jsonb` (`metricas`, `datos`, `configuracion`, `condicion`…).
- Las funciones y disparadores que nombran tablas en su cuerpo se reescriben en la
  misma migración.

## Tablas y columnas

### `perfiles` (antes `profiles`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK, FK → auth.users.id |
| `nombre_completo` | `full_name` | text |  |
| `rol` | `role` | rol_usuario |  |
| `creado_en` | `created_at` | timestamptz |  |
| `actualizado_en` | `updated_at` | timestamptz |  |

### `consentimientos` (antes `consents`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `version_consentimiento` | `consent_version` | text |  |
| `aceptado_en` | `accepted_at` | timestamptz |  |

### `sesiones` (antes `sessions`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `estado` | `status` | estado_sesion |  |
| `iniciada_en` | `started_at` | timestamptz |  |
| `finalizada_en` | `ended_at` | timestamptz |  |

### `eventos_interaccion` (antes `interaction_events`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `sesion_id` | `session_id` | uuid | FK → sesiones.id |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `tipo_evento` | `event_type` | tipo_evento_interaccion |  |
| `datos` | `payload` | jsonb |  |
| `ocurrido_en` | `occurred_at` | timestamptz |  |

### `intentos_actividad` (antes `activity_runs`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `sesion_id` | `session_id` | uuid | FK → sesiones.id |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `tipo_actividad` | `activity_type` | tipo_actividad |  |
| `version_protocolo` | `protocol_version` | text |  |
| `estado` | `status` | estado_intento |  |
| `iniciado_en` | `started_at` | timestamptz |  |
| `finalizado_en` | `ended_at` | timestamptz |  |
| `rondas_practica` | `practice_rounds` | smallint |  |
| `configuracion` | `config` | jsonb |  |
| `tipo_dispositivo` | `device_type` | tipo_dispositivo |  |
| `entrada_principal` | `input_primary` | tipo_entrada |  |
| `conteo_entradas` | `input_counts` | jsonb |  |
| `ancho_ventana` | `viewport_w` | integer |  |
| `alto_ventana` | `viewport_h` | integer |  |
| `proporcion_pixeles` | `device_pixel_ratio` | numeric |  |
| `orientacion` | `orientation` | text |  |
| `navegador` | `browser` | text |  |
| `sistema_operativo` | `os` | text |  |
| `frecuencia_refresco_est` | `refresh_hz_est` | numeric |  |
| `perdidas_visibilidad` | `visibility_losses` | integer |  |

### `ensayos_actividad` (antes `activity_trials`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | bigint | PK |
| `intento_id` | `run_id` | uuid | FK → intentos_actividad.id |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `indice_ensayo` | `trial_index` | integer | UQ (intento_id, indice_ensayo) |
| `condicion` | `condition` | jsonb |  |
| `inicio_estimulo_ms` | `stimulus_onset_ms` | double precision |  |
| `respuesta_en_ms` | `response_at_ms` | double precision |  |
| `tiempo_reaccion_ms` | `rt_ms` | double precision |  |
| `respuesta` | `response` | text |  |
| `detalle_respuesta` | `response_detail` | jsonb |  |
| `correcto` | `correct` | boolean |  |
| `clasificacion` | `classification` | text |  |
| `tipo_entrada` | `input_type` | tipo_entrada |  |
| `valido` | `valid` | boolean |  |
| `motivo_invalidez` | `invalid_reason` | text |  |

### `resultados_actividad` (antes `activity_results`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `sesion_id` | `session_id` | uuid | FK → sesiones.id |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `intento_id` | `run_id` | uuid | FK → intentos_actividad.id |
| `tipo_actividad` | `activity_type` | tipo_actividad |  |
| `version_protocolo` | `protocol_version` | text |  |
| `duracion_ms` | `duration_ms` | integer |  |
| `precision` | `accuracy` | numeric |  |
| `nivel_alcanzado` | `level_reached` | integer |  |
| `metricas` | `metrics` | jsonb |  |
| `completado_en` | `completed_at` | timestamptz |  |

### `informes_ia` (antes `ai_reports`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `sesion_id` | `session_id` | uuid | FK → sesiones.id, UQ |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `estado` | `status` | estado_informe |  |
| `perfil_atencional` | `attentional_profile` | text |  |
| `fortalezas` | `strengths` | jsonb |  |
| `areas_de_mejora` | `areas_for_improvement` | jsonb |  |
| `recomendaciones` | `recommendations` | jsonb |  |
| `respuesta_cruda` | `raw_response` | jsonb |  |
| `solicitado_en` | `requested_at` | timestamptz |  |
| `completado_en` | `completed_at` | timestamptz |  |

### `sesiones_pomodoro` (antes `pomodoro_sessions`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `sesion_id` | `session_id` | uuid | FK → sesiones.id (opcional) |
| `duracion_trabajo_minutos` | `work_duration_minutes` | integer |  |
| `duracion_descanso_minutos` | `break_duration_minutes` | integer |  |
| `iniciada_en` | `started_at` | timestamptz |  |
| `finalizada_en` | `ended_at` | timestamptz |  |
| `ciclos_completados` | `completed_cycles` | integer |  |
| `interrumpida` | `interrupted` | boolean |  |
| `veces_pausado` | `pause_count` | integer |  |
| `ms_pausado` | `paused_ms` | integer |  |

### `tareas_kanban` (antes `kanban_tasks`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `titulo` | `title` | text |  |
| `descripcion` | `description` | text |  |
| `estado` | `status` | estado_tarea_kanban |  |
| `posicion` | `position` | integer |  |
| `creado_en` | `created_at` | timestamptz |  |
| `actualizado_en` | `updated_at` | timestamptz |  |

### `habitos` (antes `habits`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `nombre` | `name` | text |  |
| `archivado` | `archived` | boolean |  |
| `creado_en` | `created_at` | timestamptz |  |

### `registros_habito` (antes `habit_logs`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `habito_id` | `habit_id` | uuid | FK → habitos.id |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `fecha` | `log_date` | date | UQ (habito_id, fecha) |
| `completado` | `completed` | boolean |  |
| `creado_en` | `created_at` | timestamptz |  |

### `eventos_calendario` (antes `calendar_events`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | uuid | PK |
| `perfil_id` | `user_id` | uuid | FK → perfiles.id |
| `titulo` | `title` | text |  |
| `descripcion` | `description` | text |  |
| `inicio_en` | `start_at` | timestamptz |  |
| `fin_en` | `end_at` | timestamptz |  |
| `completado` | `completed` | boolean |  |
| `creado_en` | `created_at` | timestamptz |  |

### `analisis_excluidos` (antes `analisis_excluidos`)

| Columna | Antes | Tipo | Notas |
|---|---|---|---|
| `perfil_id` | `user_id` | uuid | PK, FK → perfiles.id |
| `motivo` | `motivo` | text |  |
| `creado_en` | `created_at` | timestamptz |  |

## Tipos enumerados

| Tipo | Antes | Valores (sin cambio) |
|---|---|---|
| `rol_usuario` | `user_role` | participante, investigador, autoridad |
| `estado_sesion` | `session_status` | en_progreso, completada, abandonada |
| `tipo_actividad` | `activity_type` | reaction_test, focus_flow, memory_matrix, word_sprint, pattern_hunt, deep_read |
| `estado_intento` | `activity_run_status` | en_curso, completada, incompleta |
| `estado_informe` | `ai_report_status` | pendiente, completado, fallido |
| `tipo_dispositivo` | `device_type` | mobile, tablet, desktop |
| `tipo_entrada` | `input_type` | touch, mouse, keyboard |
| `tipo_evento_interaccion` | `interaction_event_type` | click, visibility_change, idle_start, idle_end, activity_start, activity_end, tool_start, tool_end, tool_interrupt, tool_progress, session_pulse |
| `estado_tarea_kanban` | `kanban_task_status` | pendiente, en_progreso, completado |

## Vistas

| Vista | Antes |
|---|---|
| `vw_resumen_resultados_actividad` | `vw_activity_results_summary` |
| `vw_resumen_sesiones` | `vw_sessions_summary` |
| `vw_resumen_eventos_interaccion` | `vw_interaction_events_summary` |
| `vw_resumen_uso_herramientas` | `vw_tool_usage_summary` |
| `vw_actividades_dimensiones` | `vw_actividades_dimensiones` |
| `vw_participantes_analisis` | `vw_participantes_analisis` |
| `vw_ensayos_analisis` | `vw_ensayos_analisis` |

Las columnas de las vistas que provienen de columnas renombradas toman el
nombre nuevo; los tableros de Power BI se vuelven a enlazar después de la migración.

## Rol de solo lectura

`lector_powerbi` (antes `powerbi_reader`), usado por Power BI.
