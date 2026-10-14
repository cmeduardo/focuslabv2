-- FocusLab · Ajustes del Security Advisor de Supabase (2026-10-13)
--
-- Lo que NO se cambia, a propósito: las 7 vistas vw_* siguen siendo
-- SECURITY DEFINER (el advisor las marca como error). Agregan datos de
-- todos los participantes para la autoridad y para Power BI, que no tienen
-- ni deben tener lectura de las tablas base; pasarlas a security_invoker
-- obligaría a darles lectura fila por fila. Cada vista filtra por rol con
-- can_read_aggregates() / can_read_participant_level() (o
-- current_user_role() en 0012), y esas funciones se evalúan con el usuario
-- que consulta, no con el dueño de la vista: un participante o un anónimo
-- recibe cero filas.

-- 1. Las vistas no son para visitantes sin sesión (Supabase les otorga
--    SELECT por defecto sobre todo lo que se crea en public).
revoke all on
  public.vw_activity_results_summary,
  public.vw_interaction_events_summary,
  public.vw_sessions_summary,
  public.vw_tool_usage_summary,
  public.vw_actividades_dimensiones,
  public.vw_participantes_analisis,
  public.vw_ensayos_analisis
from anon;

-- 2. search_path fijo en las funciones que no lo tenían (advisor:
--    "Function Search Path Mutable"). Solo usan funciones de pg_catalog.
alter function public.set_updated_at() set search_path = '';
alter function public.participant_code(uuid) set search_path = '';

-- 3. handle_new_user es la función del trigger que crea el perfil al
--    registrarse: nadie la necesita como RPC. El trigger se dispara igual
--    sin este permiso.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 4. current_user_role y has_accepted_consent las usan las políticas RLS,
--    que se evalúan con el rol de quien consulta: `authenticated` (y
--    powerbi_reader, otorgado en 20261004000002) las sigue necesitando.
--    Solo devuelven datos del propio usuario. Se quita el acceso anónimo.
revoke execute on function public.current_user_role(), public.has_accepted_consent()
  from public, anon;
grant execute on function public.current_user_role(), public.has_accepted_consent()
  to authenticated;
