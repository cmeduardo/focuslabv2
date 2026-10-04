-- FocusLab · Limpieza previa al taller piloto (NO es una migración).
--
-- Borra los datos de prueba para que el taller arranque con una base limpia:
--   * todo lo generado por cuentas que NO son participantes (investigador,
--     autoridad): sesiones y, en cascada, eventos, resultados, corridas,
--     ensayos e informes; más sus herramientas de productividad.
--   * los resultados v1 (mecánicas anteriores al rediseño 2026-10-04) de
--     cualquier cuenta.
-- NO borra perfiles, cuentas ni consentimientos.
--
-- Es IRREVERSIBLE. Correr primero el bloque "Vista previa" y revisar los
-- conteos; luego el bloque "Borrado" en el SQL Editor de Supabase.

-- ── Vista previa ──────────────────────────────────────────────────────────
select 'sesiones de no-participantes' as que, count(*)
from public.sessions s join public.profiles p on p.id = s.user_id
where p.role <> 'participante'
union all
select 'resultados v1', count(*) from public.activity_results where protocol_version = 'v1'
union all
select 'pomodoros de no-participantes', count(*)
from public.pomodoro_sessions x join public.profiles p on p.id = x.user_id where p.role <> 'participante'
union all
select 'tareas kanban de no-participantes', count(*)
from public.kanban_tasks x join public.profiles p on p.id = x.user_id where p.role <> 'participante'
union all
select 'hábitos de no-participantes', count(*)
from public.habits x join public.profiles p on p.id = x.user_id where p.role <> 'participante'
union all
select 'eventos de calendario de no-participantes', count(*)
from public.calendar_events x join public.profiles p on p.id = x.user_id where p.role <> 'participante';

-- ── Borrado (descomentar para ejecutar) ───────────────────────────────────
-- begin;
-- delete from public.activity_results where protocol_version = 'v1';
-- delete from public.sessions s using public.profiles p
--   where p.id = s.user_id and p.role <> 'participante';
-- delete from public.pomodoro_sessions x using public.profiles p
--   where p.id = x.user_id and p.role <> 'participante';
-- delete from public.kanban_tasks x using public.profiles p
--   where p.id = x.user_id and p.role <> 'participante';
-- delete from public.habits x using public.profiles p
--   where p.id = x.user_id and p.role <> 'participante';
-- delete from public.calendar_events x using public.profiles p
--   where p.id = x.user_id and p.role <> 'participante';
-- commit;
