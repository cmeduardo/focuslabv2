-- Los resúmenes diarios agrupaban con date_trunc('day', ts), que en
-- Supabase corta el día en UTC: una sesión a las 20:00 de Guatemala
-- (02:00 UTC) caía en el día siguiente, y Power BI mostraba el bucket
-- convertido a hora local ("2 oct, 6 PM").
--
-- Ahora el día se calcula en America/Guatemala y `dia` es la medianoche de
-- Guatemala como timestamptz (06:00 UTC). Mismo tipo de columna, así que
-- create or replace conserva permisos y comentarios. La app formatea la
-- fecha UTC del bucket (src/lib/analysis/overview.ts › formatDia), que es
-- el día correcto antes y después de esta migración.

create or replace view public.vw_interaction_events_summary as
select
  e.event_type,
  (date_trunc('day', e.occurred_at at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  count(*) as total_eventos
from public.interaction_events e
join public.profiles p on p.id = e.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by e.event_type, (date_trunc('day', e.occurred_at at time zone 'America/Guatemala') at time zone 'America/Guatemala');

create or replace view public.vw_sessions_summary as
select
  (date_trunc('day', s.started_at at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  s.status,
  count(*) as total_sesiones,
  avg(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at))) as duracion_segundos_promedio
from public.sessions s
join public.profiles p on p.id = s.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by (date_trunc('day', s.started_at at time zone 'America/Guatemala') at time zone 'America/Guatemala'), s.status;

create or replace view public.vw_tool_usage_summary as
select
  'pomodoro' as herramienta,
  (date_trunc('day', ps.started_at at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  count(*) as total_usos,
  sum(case when ps.interrupted then 1 else 0 end) as total_interrupciones
from public.pomodoro_sessions ps
join public.profiles p on p.id = ps.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by (date_trunc('day', ps.started_at at time zone 'America/Guatemala') at time zone 'America/Guatemala')
union all
select
  'kanban' as herramienta,
  (date_trunc('day', k.created_at at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  count(*) as total_usos,
  0 as total_interrupciones
from public.kanban_tasks k
join public.profiles p on p.id = k.user_id and p.role = 'participante'
where public.can_read_aggregates()
group by (date_trunc('day', k.created_at at time zone 'America/Guatemala') at time zone 'America/Guatemala');

