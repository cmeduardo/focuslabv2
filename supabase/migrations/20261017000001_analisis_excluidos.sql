-- FocusLab · 20261017000001 · Participantes fuera de la cohorte del taller
--
-- vw_actividades_dimensiones (la que usa el tablero de Autoridades) no trae
-- participante ni fecha, así que Power BI no puede quitar las cuentas que
-- probaron la app antes del taller del 10 de octubre. El tablero mostraba
-- 17 participantes en vez de los 16 de la cohorte.
--
-- Se lleva la lista de exclusiones en una tabla y la vista la descuenta.
-- La vista es SECURITY DEFINER (ver 20261013000002), así que lee la tabla
-- con los permisos de su dueño; nadie más necesita acceso a ella.

create table public.analisis_excluidos (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  motivo text not null,
  created_at timestamptz not null default now()
);

alter table public.analisis_excluidos enable row level security;
revoke all on public.analisis_excluidos from anon, authenticated;

comment on table public.analisis_excluidos is 'Participantes que no cuentan en el análisis (cuentas de prueba previas al taller).';

insert into public.analisis_excluidos (user_id, motivo)
select p.id, 'Cuenta previa al taller del 10 de octubre de 2026'
from public.profiles p
where public.participant_code(p.id) in ('P-F424D5', 'P-7ADF0A', 'P-DC6B03', 'P-0DD1D6');

create or replace view public.vw_actividades_dimensiones as
with primer as (
  select distinct on (r.user_id, r.activity_type)
    r.user_id, r.activity_type, r.accuracy, r.level_reached, r.duration_ms, r.metrics,
    coalesce(ru.device_type::text, 'sin_dato') as device_type
  from public.activity_results r
  join public.profiles p on p.id = r.user_id and p.role = 'participante'
  left join public.activity_runs ru on ru.id = r.run_id
  where r.protocol_version = 'v2'
    and not exists (select 1 from public.analisis_excluidos x where x.user_id = r.user_id)
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
    when 'deep_read' then 'Comprensión (de 8)'
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
