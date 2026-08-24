-- FocusLab · 0012 · vistas agregadas y anonimizadas para el panel administrativo
-- Módulo 6 / RF-13 / RF-14 / RF-15 / RS-04.
--
-- Estas vistas no exponen user_id ni ninguna otra columna identificable: solo
-- agregados (conteos, promedios, desviaciones) agrupados por variables no
-- personales (tipo de actividad, tipo de evento, día). Se filtran con
-- current_user_role() para que únicamente investigador y autoridad puedan
-- leerlas (RS-06); un participante que consulte la vista recibe cero filas.
-- Pensadas para conectarse directamente desde Power BI Desktop vía el
-- conector nativo de PostgreSQL (RF-14).

create view public.vw_activity_results_summary as
select
  activity_type,
  count(*) as total_resultados,
  avg(duration_ms) as duracion_ms_promedio,
  avg(accuracy) as precision_promedio,
  avg(level_reached) as nivel_promedio,
  stddev(accuracy) as precision_desv_estandar
from public.activity_results
where public.current_user_role() in ('investigador', 'autoridad')
group by activity_type;

comment on view public.vw_activity_results_summary is 'Distribución agregada de resultados por actividad cognitiva (RF-13). Sin identificadores individuales.';

create view public.vw_interaction_events_summary as
select
  event_type,
  date_trunc('day', occurred_at) as dia,
  count(*) as total_eventos
from public.interaction_events
where public.current_user_role() in ('investigador', 'autoridad')
group by event_type, date_trunc('day', occurred_at);

comment on view public.vw_interaction_events_summary is 'Frecuencia diaria de eventos pasivos por tipo (RF-13). Sin identificadores individuales.';

create view public.vw_sessions_summary as
select
  date_trunc('day', started_at) as dia,
  status,
  count(*) as total_sesiones,
  avg(extract(epoch from (coalesce(ended_at, now()) - started_at))) as duracion_segundos_promedio
from public.sessions
where public.current_user_role() in ('investigador', 'autoridad')
group by date_trunc('day', started_at), status;

comment on view public.vw_sessions_summary is 'Estadísticos descriptivos básicos de sesiones por día (RF-13). Sin identificadores individuales.';

create view public.vw_tool_usage_summary as
select
  'pomodoro' as herramienta,
  date_trunc('day', started_at) as dia,
  count(*) as total_usos,
  sum(case when interrupted then 1 else 0 end) as total_interrupciones
from public.pomodoro_sessions
where public.current_user_role() in ('investigador', 'autoridad')
group by date_trunc('day', started_at)
union all
select
  'kanban' as herramienta,
  date_trunc('day', created_at) as dia,
  count(*) as total_usos,
  0 as total_interrupciones
from public.kanban_tasks
where public.current_user_role() in ('investigador', 'autoridad')
group by date_trunc('day', created_at);

comment on view public.vw_tool_usage_summary is 'Uso agregado de las herramientas de productividad por día (RF-13). Sin identificadores individuales.';

grant select on
  public.vw_activity_results_summary,
  public.vw_interaction_events_summary,
  public.vw_sessions_summary,
  public.vw_tool_usage_summary
to authenticated;
