-- Deep Read v2 (qanats-v2) pasa de 5 a 8 preguntas: la versión anterior se
-- acertaba sin leer. Solo cambia la etiqueta de la métrica principal en
-- vw_actividades_dimensiones ("Comprensión (de 8)"); el valor sigue siendo
-- metrics.comprehensionScore (número de aciertos).
--
-- create or replace conserva columnas, permisos (authenticated,
-- powerbi_reader) y el comentario. Los datos de demostración se generaron
-- con 5 preguntas: hay que borrarlos antes del taller de todos modos
-- (npm run demo:purge) y, si se vuelven a sembrar, ya salen con 8.

create or replace view public.vw_actividades_dimensiones as
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

comment on view public.vw_actividades_dimensiones is 'Métrica principal de cada dimensión atencional por dispositivo (v2, solo participantes, primer intento). Agregada, sin identificadores.';

