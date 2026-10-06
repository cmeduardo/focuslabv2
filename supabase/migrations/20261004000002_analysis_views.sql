-- FocusLab · 20261004000002 · Vistas de análisis (v2) y acceso de Power BI
--
-- 1. El análisis usa SOLO datos v2 (rediseño 2026-10-04) y SOLO perfiles
--    con rol 'participante': las pruebas del investigador y las mecánicas
--    v1 no cumplen el enfoque actual y no deben mezclarse.
-- 2. Power BI Desktop se conecta directo a Postgres (no por la API), así
--    que no hay auth.uid() ni current_user_role(): las vistas anteriores le
--    devolvían cero filas. Se crea el rol de solo lectura `powerbi_reader`
--    (sin contraseña aquí: se le asigna a mano en el SQL Editor, ver
--    docs/power_bi.md) y las vistas lo aceptan explícitamente.
-- 3. Unidad de análisis de las hipótesis: el participante. Se toma el
--    PRIMER intento completado de cada actividad (mismo criterio que el
--    informe de IA) y las variables pasivas de todas sus sesiones.

-- ---------------------------------------------------------------------------
-- Rol de Power BI y funciones de acceso
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'powerbi_reader') then
    create role powerbi_reader nologin;
  end if;
end
$$;

grant usage on schema public to powerbi_reader;

-- No son security definer a propósito: current_user debe ser quien consulta
-- (powerbi_reader en Power BI, authenticated en la API).
create or replace function public.can_read_aggregates()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user = 'powerbi_reader'
    or coalesce(public.current_user_role() in ('investigador', 'autoridad'), false);
$$;

create or replace function public.can_read_participant_level()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user = 'powerbi_reader'
    or coalesce(public.current_user_role() = 'investigador', false);
$$;

-- Seudónimo estable por participante (sin nombre ni correo).
create or replace function public.participant_code(uid uuid)
returns text
language sql
immutable
as $$
  select 'P-' || upper(substr(md5(uid::text), 1, 6));
$$;

grant execute on function public.can_read_aggregates(), public.can_read_participant_level(),
  public.participant_code(uuid), public.current_user_role() to powerbi_reader;

-- ---------------------------------------------------------------------------
-- Vistas agregadas existentes: mismas columnas, ahora solo participantes
-- (y solo v2 en actividades) + acceso de Power BI.
-- ---------------------------------------------------------------------------
create or replace view public.vw_activity_results_summary as
select
  r.activity_type,
  count(*) as total_resultados,
  avg(r.duration_ms) as duracion_ms_promedio,
  avg(r.accuracy) as precision_promedio,
  avg(r.level_reached) as nivel_promedio,
  stddev(r.accuracy) as precision_desv_estandar,
  r.protocol_version
from public.activity_results r
join public.profiles p on p.id = r.user_id and p.role = 'participante'
where public.can_read_aggregates() and r.protocol_version = 'v2'
group by r.activity_type, r.protocol_version;

create or replace view public.vw_interaction_events_summary as
select
  e.event_type,
  date_trunc('day', e.occurred_at) as dia,
  count(*) as total_eventos
from public.interaction_events e
join public.profiles p on p.id = e.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by e.event_type, date_trunc('day', e.occurred_at);

create or replace view public.vw_sessions_summary as
select
  date_trunc('day', s.started_at) as dia,
  s.status,
  count(*) as total_sesiones,
  avg(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at))) as duracion_segundos_promedio
from public.sessions s
join public.profiles p on p.id = s.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by date_trunc('day', s.started_at), s.status;

create or replace view public.vw_tool_usage_summary as
select
  'pomodoro' as herramienta,
  date_trunc('day', ps.started_at) as dia,
  count(*) as total_usos,
  sum(case when ps.interrupted then 1 else 0 end) as total_interrupciones
from public.pomodoro_sessions ps
join public.profiles p on p.id = ps.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by date_trunc('day', ps.started_at)
union all
select
  'kanban' as herramienta,
  date_trunc('day', k.created_at) as dia,
  count(*) as total_usos,
  0 as total_interrupciones
from public.kanban_tasks k
join public.profiles p on p.id = k.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by date_trunc('day', k.created_at);

-- ---------------------------------------------------------------------------
-- vw_actividades_dimensiones (agregada: investigador, autoridad, Power BI)
-- Métrica principal de cada dimensión por tipo de dispositivo, sobre el
-- primer intento completado de cada participante.
-- ---------------------------------------------------------------------------
create view public.vw_actividades_dimensiones as
with primer as (
  select distinct on (r.user_id, r.activity_type)
    r.user_id, r.activity_type, r.accuracy, r.level_reached, r.duration_ms, r.metrics,
    coalesce(ru.device_type::text, 'sin_dato') as device_type
  from public.activity_results r
  join public.profiles p on p.id = r.user_id and p.role = 'participante'
  left join public.activity_runs ru on ru.id = r.run_id
  where r.protocol_version = 'v2'
  order by r.user_id, r.activity_type, r.completed_at
),
principal as (
  select
    activity_type,
    device_type,
    user_id,
    accuracy,
    duration_ms,
    case activity_type
      when 'reaction_test' then (metrics ->> 'rtMeanMs')::numeric
      when 'focus_flow' then (metrics ->> 'commissionRatePct')::numeric
      when 'memory_matrix' then level_reached::numeric
      when 'word_sprint' then accuracy
      when 'pattern_hunt' then (metrics ->> 'detectionSpeedMs')::numeric
      when 'deep_read' then (metrics ->> 'comprehensionScore')::numeric
    end as valor
  from primer
)
select
  activity_type,
  case activity_type
    when 'reaction_test' then 'Alerta'
    when 'focus_flow' then 'Atención sostenida'
    when 'memory_matrix' then 'Memoria de trabajo visoespacial'
    when 'word_sprint' then 'Atención selectiva e inhibición'
    when 'pattern_hunt' then 'Atención selectiva visual'
    when 'deep_read' then 'Resistencia a la distracción'
  end as dimension,
  case activity_type
    when 'reaction_test' then 'TR promedio (ms)'
    when 'focus_flow' then 'Comisiones (%)'
    when 'memory_matrix' then 'Span (bloques)'
    when 'word_sprint' then 'Precisión (%)'
    when 'pattern_hunt' then 'Velocidad de detección (ms)'
    when 'deep_read' then 'Comprensión (de 5)'
  end as metrica_principal,
  device_type,
  count(distinct user_id) as participantes,
  avg(valor) as valor_promedio,
  stddev(valor) as valor_desv_estandar,
  min(valor) as valor_minimo,
  max(valor) as valor_maximo,
  avg(accuracy) as precision_promedio,
  avg(duration_ms) / 1000.0 as duracion_s_promedio
from principal
where public.can_read_aggregates()
group by activity_type, device_type;

comment on view public.vw_actividades_dimensiones is 'Métrica principal de cada dimensión atencional por dispositivo (v2, solo participantes, primer intento). Agregada, sin identificadores.';

-- ---------------------------------------------------------------------------
-- vw_participantes_analisis (nivel participante, seudonimizado: solo
-- investigador y Power BI). Una fila por participante: métricas cognitivas
-- (primer intento v2) + variables pasivas (H1/H2).
-- ---------------------------------------------------------------------------
create view public.vw_participantes_analisis as
with primer as (
  select distinct on (r.user_id, r.activity_type)
    r.user_id, r.activity_type, r.accuracy, r.level_reached, r.metrics,
    ru.device_type::text as device_type
  from public.activity_results r
  join public.profiles p on p.id = r.user_id and p.role = 'participante'
  left join public.activity_runs ru on ru.id = r.run_id
  where r.protocol_version = 'v2'
  order by r.user_id, r.activity_type, r.completed_at
),
cognitivas as (
  select
    user_id,
    mode() within group (order by device_type) as dispositivo_principal,
    count(*) as actividades_completadas,
    max((metrics ->> 'rtMeanMs')::numeric) filter (where activity_type = 'reaction_test') as rt_promedio_ms,
    max((metrics ->> 'rtSdMs')::numeric) filter (where activity_type = 'reaction_test') as rt_desv_ms,
    max((metrics ->> 'lapses')::numeric) filter (where activity_type = 'reaction_test') as rt_lapsos,
    max((metrics ->> 'anticipations')::numeric) filter (where activity_type = 'reaction_test') as rt_anticipaciones,
    max((metrics ->> 'commissionRatePct')::numeric) filter (where activity_type = 'focus_flow') as ff_comision_pct,
    max((metrics ->> 'omissionRatePct')::numeric) filter (where activity_type = 'focus_flow') as ff_omision_pct,
    max((metrics ->> 'goRtMeanMs')::numeric) filter (where activity_type = 'focus_flow') as ff_rt_ms,
    max(level_reached) filter (where activity_type = 'memory_matrix') as mm_span,
    max((metrics ->> 'correctSequences')::numeric) filter (where activity_type = 'memory_matrix') as mm_secuencias_correctas,
    max(accuracy) filter (where activity_type = 'word_sprint') as ws_precision_pct,
    max((metrics ->> 'interferenceMs')::numeric) filter (where activity_type = 'word_sprint') as ws_interferencia_ms,
    max((metrics ->> 'detectionSpeedMs')::numeric) filter (where activity_type = 'pattern_hunt') as ph_deteccion_ms,
    max((metrics ->> 'conjunctionPresentSlopeMsPerItem')::numeric) filter (where activity_type = 'pattern_hunt') as ph_pendiente_conjuncion,
    max(accuracy) filter (where activity_type = 'pattern_hunt') as ph_precision_pct,
    max((metrics ->> 'comprehensionScore')::numeric) filter (where activity_type = 'deep_read') as dr_comprension,
    max((metrics ->> 'wordsPerMinute')::numeric) filter (where activity_type = 'deep_read') as dr_palabras_minuto,
    max((metrics ->> 'notificationsIgnored')::numeric) filter (where activity_type = 'deep_read') as dr_notificaciones_ignoradas,
    max((metrics ->> 'visibilityExits')::numeric) filter (where activity_type = 'deep_read') as dr_salidas_pestana
  from primer
  group by user_id
),
sesiones as (
  select
    s.user_id,
    count(*) as sesiones,
    avg(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at))) / 60.0 as sesion_minutos_promedio
  from public.sessions s
  group by s.user_id
),
eventos as (
  select
    e.user_id,
    count(*) as eventos_totales,
    count(*) filter (where e.event_type = 'click') as clics,
    count(*) filter (where e.event_type = 'visibility_change' and e.payload ->> 'state' = 'hidden') as cambios_pestana,
    avg((e.payload ->> 'rating')::numeric) filter (where e.event_type = 'session_pulse') as pulso_concentracion_promedio
  from public.interaction_events e
  group by e.user_id
),
-- Inactividad: idle_start se emite tras 60 s sin interacción
-- (IDLE_THRESHOLD_MS en use-event-tracker.ts), así que la duración real es
-- 60 s + el intervalo hasta el idle_end siguiente.
inactividad as (
  select user_id, avg(duracion_s) as inactividad_promedio_s, count(*) as periodos_inactividad
  from (
    select
      e.user_id,
      e.event_type,
      lag(e.event_type) over w as previo,
      60 + extract(epoch from (e.occurred_at - lag(e.occurred_at) over w)) as duracion_s
    from public.interaction_events e
    where e.event_type in ('idle_start', 'idle_end')
    window w as (partition by e.session_id order by e.occurred_at)
  ) x
  where event_type = 'idle_end' and previo = 'idle_start'
  group by user_id
),
pomodoro as (
  select
    user_id,
    count(*) as pomodoros,
    avg(case when interrupted then 1.0 else 0.0 end) * 100 as pomodoro_interrupcion_pct,
    avg(pause_count) as pomodoro_pausas_promedio
  from public.pomodoro_sessions
  group by user_id
)
select
  public.participant_code(c.user_id) as participante,
  c.dispositivo_principal,
  c.actividades_completadas,
  c.rt_promedio_ms, c.rt_desv_ms, c.rt_lapsos, c.rt_anticipaciones,
  c.ff_comision_pct, c.ff_omision_pct, c.ff_rt_ms,
  c.mm_span, c.mm_secuencias_correctas,
  c.ws_precision_pct, c.ws_interferencia_ms,
  c.ph_deteccion_ms, c.ph_pendiente_conjuncion, c.ph_precision_pct,
  c.dr_comprension, c.dr_palabras_minuto, c.dr_notificaciones_ignoradas, c.dr_salidas_pestana,
  s.sesiones,
  s.sesion_minutos_promedio,
  coalesce(ev.cambios_pestana, 0)::numeric / greatest(s.sesiones, 1) as cambios_pestana_por_sesion,
  i.inactividad_promedio_s,
  coalesce(i.periodos_inactividad, 0) as periodos_inactividad,
  coalesce(ev.eventos_totales, 0) as eventos_totales,
  coalesce(ev.clics, 0) as clics,
  ev.pulso_concentracion_promedio,
  coalesce(po.pomodoros, 0) as pomodoros,
  po.pomodoro_interrupcion_pct,
  po.pomodoro_pausas_promedio
from cognitivas c
left join sesiones s on s.user_id = c.user_id
left join eventos ev on ev.user_id = c.user_id
left join inactividad i on i.user_id = c.user_id
left join pomodoro po on po.user_id = c.user_id
where public.can_read_participant_level();

comment on view public.vw_participantes_analisis is 'Una fila por participante (seudónimo): métricas cognitivas v2 (primer intento) y variables pasivas. Solo investigador y Power BI.';

-- ---------------------------------------------------------------------------
-- vw_ensayos_analisis (nivel ensayo, seudonimizado: solo investigador y
-- Power BI). Para análisis finos (distribuciones de TR, efecto por
-- condición) fuera de la app.
-- ---------------------------------------------------------------------------
create view public.vw_ensayos_analisis as
select
  public.participant_code(t.user_id) as participante,
  ru.activity_type,
  ru.device_type::text as device_type,
  ru.input_primary::text as entrada_principal,
  ru.refresh_hz_est,
  ru.started_at as corrida_inicio,
  t.trial_index,
  t.condition,
  t.stimulus_onset_ms,
  t.rt_ms,
  t.response,
  t.correct,
  t.classification,
  t.input_type::text as input_type,
  t.valid,
  t.invalid_reason
from public.activity_trials t
join public.activity_runs ru on ru.id = t.run_id and ru.status = 'completada'
join public.profiles p on p.id = t.user_id and p.role = 'participante'
where public.can_read_participant_level();

comment on view public.vw_ensayos_analisis is 'Ensayos registrados (v2) de corridas completadas, por participante seudonimizado. Solo investigador y Power BI.';

grant select on
  public.vw_activity_results_summary,
  public.vw_interaction_events_summary,
  public.vw_sessions_summary,
  public.vw_tool_usage_summary,
  public.vw_actividades_dimensiones,
  public.vw_participantes_analisis,
  public.vw_ensayos_analisis
to authenticated, powerbi_reader;
