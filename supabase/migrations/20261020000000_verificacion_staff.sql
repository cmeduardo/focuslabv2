-- FocusLab · 20261020000000 · Segundo factor por correo para el staff
--
-- El investigador y la autoridad confirman cada inicio de sesión con un código
-- de 6 dígitos que llega a su correo. La verificación queda ligada a la sesión
-- de Supabase Auth (claim session_id del JWT): al cerrar sesión se borra la
-- fila y el siguiente inicio de sesión pide otro código. Las políticas del
-- investigador y las vistas de análisis la exigen, así que una sesión sin
-- verificar no lee datos de participantes aunque llame a la API directamente.
-- Power BI (lector_powerbi) no pasa por Auth y no cambia.

create table public.verificaciones_sesion (
  sesion_auth_id uuid primary key references auth.sessions (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  codigo_hash text not null,
  intentos smallint not null default 0,
  enviado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  verificada_en timestamptz
);

create index verificaciones_sesion_perfil_idx on public.verificaciones_sesion (perfil_id);

-- Sin políticas: solo la escribe el servidor (service_role) y la leen las funciones.
alter table public.verificaciones_sesion enable row level security;
revoke all on public.verificaciones_sesion from anon, authenticated;

comment on table public.verificaciones_sesion is 'Código por correo que confirma cada sesión del investigador o la autoridad (segundo factor).';

-- security definer: la tabla no es legible desde la API.
create or replace function public.sesion_staff_verificada()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.verificaciones_sesion v
    where v.perfil_id = auth.uid()
      and v.sesion_auth_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and v.verificada_en is not null
  );
$$;

create or replace function public.es_investigador_verificado()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.rol_usuario_actual() = 'investigador', false)
    and public.sesion_staff_verificada();
$$;

create or replace function public.puede_leer_agregados()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user = 'lector_powerbi'
    or (coalesce(public.rol_usuario_actual() in ('investigador', 'autoridad'), false)
        and public.sesion_staff_verificada());
$$;

create or replace function public.puede_leer_por_participante()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user = 'lector_powerbi'
    or public.es_investigador_verificado();
$$;

alter policy perfiles_select_investigador on public.perfiles
  using (public.es_investigador_verificado());
alter policy consentimientos_select_investigador on public.consentimientos
  using (public.es_investigador_verificado());
alter policy sesiones_select_investigador on public.sesiones
  using (public.es_investigador_verificado());
alter policy eventos_interaccion_select_investigador on public.eventos_interaccion
  using (public.es_investigador_verificado());
alter policy intentos_actividad_select_investigador on public.intentos_actividad
  using (public.es_investigador_verificado());
alter policy ensayos_actividad_select_investigador on public.ensayos_actividad
  using (public.es_investigador_verificado());
alter policy resultados_actividad_select_investigador on public.resultados_actividad
  using (public.es_investigador_verificado());
alter policy informes_ia_select_investigador on public.informes_ia
  using (public.es_investigador_verificado());
alter policy sesiones_pomodoro_select_investigador on public.sesiones_pomodoro
  using (public.es_investigador_verificado());
alter policy tareas_kanban_select_investigador on public.tareas_kanban
  using (public.es_investigador_verificado());
alter policy habitos_select_investigador on public.habitos
  using (public.es_investigador_verificado());
alter policy registros_habito_select_investigador on public.registros_habito
  using (public.es_investigador_verificado());
alter policy eventos_calendario_select_investigador on public.eventos_calendario
  using (public.es_investigador_verificado());

revoke execute on function public.sesion_staff_verificada(), public.es_investigador_verificado()
  from public, anon;
grant execute on function public.sesion_staff_verificada(), public.es_investigador_verificado()
  to authenticated, lector_powerbi;
