-- FocusLab · 20261019000000 · Esquema completo de la base de datos
--
-- Consolida en una sola las migraciones de agosto a octubre de 2026. Crea
-- desde cero todo lo que la aplicación necesita en un proyecto de Supabase:
-- tipos, tablas, funciones, disparadores, políticas RLS, vistas de análisis,
-- el rol de Power BI y los permisos. Se pega una sola vez en el SQL Editor de
-- un proyecto nuevo. Los nombres siguen el contrato de
-- docs/esquema_es.md, que es el del diagrama entidad-relación de la tesis.

-- ---------------------------------------------------------------------------
-- 1. Extensión y tipos enumerados
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create type public.rol_usuario as enum ('participante', 'investigador', 'autoridad');

create type public.estado_sesion as enum ('en_progreso', 'completada', 'abandonada');

-- Las seis actividades cognitivas.
create type public.tipo_actividad as enum (
  'reaction_test',
  'focus_flow',
  'memory_matrix',
  'word_sprint',
  'pattern_hunt',
  'deep_read'
);

create type public.estado_intento as enum ('en_curso', 'completada', 'incompleta');

create type public.estado_informe as enum ('pendiente', 'completado', 'fallido');

create type public.tipo_dispositivo as enum ('mobile', 'tablet', 'desktop');

create type public.tipo_entrada as enum ('touch', 'mouse', 'keyboard');

-- tool_progress: hito dentro de una herramienta (el detalle va en `datos`).
-- session_pulse: autorreporte de concentración cada 3 actividades.
create type public.tipo_evento_interaccion as enum (
  'click',
  'visibility_change',
  'idle_start',
  'idle_end',
  'activity_start',
  'activity_end',
  'tool_start',
  'tool_end',
  'tool_interrupt',
  'tool_progress',
  'session_pulse'
);

create type public.estado_tarea_kanban as enum ('pendiente', 'en_progreso', 'completado');

-- ---------------------------------------------------------------------------
-- 2. Tablas e índices
-- ---------------------------------------------------------------------------

-- 1:1 con auth.users; la crea el disparador on_auth_user_created.
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text,
  rol public.rol_usuario not null default 'participante',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  version_consentimiento text not null default 'v1',
  aceptado_en timestamptz not null default now()
);

create index consentimientos_perfil_id_idx on public.consentimientos (perfil_id);

create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  estado public.estado_sesion not null default 'en_progreso',
  iniciada_en timestamptz not null default now(),
  finalizada_en timestamptz
);

create index sesiones_perfil_id_idx on public.sesiones (perfil_id);
create index sesiones_iniciada_en_idx on public.sesiones (iniciada_en);

create table public.eventos_interaccion (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  tipo_evento public.tipo_evento_interaccion not null,
  -- Detalle del evento (herramienta, estado de la pestaña...), sin datos identificables.
  datos jsonb not null default '{}'::jsonb,
  ocurrido_en timestamptz not null default now()
);

create index eventos_interaccion_sesion_id_idx on public.eventos_interaccion (sesion_id);
create index eventos_interaccion_perfil_id_idx on public.eventos_interaccion (perfil_id);
create index eventos_interaccion_tipo_evento_idx on public.eventos_interaccion (tipo_evento);
create index eventos_interaccion_ocurrido_en_idx on public.eventos_interaccion (ocurrido_en);

create table public.intentos_actividad (
  -- Lo genera el cliente: el guardado final es un upsert y un reintento no duplica el intento.
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  tipo_actividad public.tipo_actividad not null,
  version_protocolo text not null default 'v2',
  estado public.estado_intento not null default 'en_curso',
  iniciado_en timestamptz not null default now(),
  finalizado_en timestamptz,
  rondas_practica smallint not null default 1 check (rondas_practica between 0 and 2),
  -- Copia de los parámetros con que se corrió (src/lib/activities/config.ts).
  configuracion jsonb not null default '{}'::jsonb,
  tipo_dispositivo public.tipo_dispositivo,
  entrada_principal public.tipo_entrada,
  conteo_entradas jsonb not null default '{}'::jsonb,
  ancho_ventana integer check (ancho_ventana >= 0),
  alto_ventana integer check (alto_ventana >= 0),
  proporcion_pixeles numeric(4, 2),
  orientacion text check (orientacion in ('portrait', 'landscape')),
  navegador text,
  sistema_operativo text,
  frecuencia_refresco_est numeric(5, 1),
  perdidas_visibilidad integer not null default 0 check (perdidas_visibilidad >= 0)
);

create index intentos_actividad_sesion_id_idx on public.intentos_actividad (sesion_id);
create index intentos_actividad_perfil_id_idx on public.intentos_actividad (perfil_id);
create index intentos_actividad_en_curso_idx on public.intentos_actividad (sesion_id) where estado = 'en_curso';

create table public.ensayos_actividad (
  id bigint generated always as identity primary key,
  intento_id uuid not null references public.intentos_actividad (id) on delete cascade,
  -- Redundante con el intento a propósito: la RLS compara con auth.uid() sin join.
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  indice_ensayo integer not null check (indice_ensayo >= 0),
  condicion jsonb not null default '{}'::jsonb,
  -- Milisegundos desde el inicio de la ronda registrada (performance.now()).
  inicio_estimulo_ms double precision,
  respuesta_en_ms double precision,
  tiempo_reaccion_ms double precision,
  respuesta text,
  detalle_respuesta jsonb,
  correcto boolean,
  -- valid, lapse, anticipation, commission, omission, hit, timeout...
  clasificacion text,
  tipo_entrada public.tipo_entrada,
  valido boolean not null default true,
  motivo_invalidez text,
  unique (intento_id, indice_ensayo)
);

create index ensayos_actividad_perfil_id_idx on public.ensayos_actividad (perfil_id);

create table public.resultados_actividad (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  tipo_actividad public.tipo_actividad not null,
  duracion_ms integer not null check (duracion_ms >= 0),
  precision numeric(5, 2) check (precision between 0 and 100),
  nivel_alcanzado integer check (nivel_alcanzado >= 0),
  metricas jsonb not null default '{}'::jsonb,
  completado_en timestamptz not null default now(),
  intento_id uuid references public.intentos_actividad (id) on delete set null,
  -- 'v1': mecánicas anteriores al rediseño del 4 de octubre; el análisis usa solo 'v2'.
  version_protocolo text not null default 'v1'
);

create index resultados_actividad_sesion_id_idx on public.resultados_actividad (sesion_id);
create index resultados_actividad_perfil_id_idx on public.resultados_actividad (perfil_id);
create index resultados_actividad_tipo_actividad_idx on public.resultados_actividad (tipo_actividad);
-- Un resumen por intento: el reintento del guardado hace upsert ignorando duplicados.
create unique index resultados_actividad_intento_id_key on public.resultados_actividad (intento_id);

-- La fila nace 'pendiente' al cerrar la sesión y n8n la completa por el webhook de retorno.
create table public.informes_ia (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null unique references public.sesiones (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  estado public.estado_informe not null default 'pendiente',
  perfil_atencional text,
  fortalezas jsonb not null default '[]'::jsonb,
  areas_de_mejora jsonb not null default '[]'::jsonb,
  recomendaciones jsonb not null default '[]'::jsonb,
  respuesta_cruda jsonb,
  solicitado_en timestamptz not null default now(),
  completado_en timestamptz
);

create index informes_ia_perfil_id_idx on public.informes_ia (perfil_id);
create index informes_ia_estado_idx on public.informes_ia (estado);

create table public.sesiones_pomodoro (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  sesion_id uuid references public.sesiones (id) on delete set null,
  duracion_trabajo_minutos integer not null check (duracion_trabajo_minutos > 0),
  duracion_descanso_minutos integer not null check (duracion_descanso_minutos > 0),
  iniciada_en timestamptz not null default now(),
  finalizada_en timestamptz,
  ciclos_completados integer not null default 0 check (ciclos_completados >= 0),
  interrumpida boolean not null default false,
  veces_pausado integer not null default 0 check (veces_pausado >= 0),
  ms_pausado integer not null default 0 check (ms_pausado >= 0)
);

create index sesiones_pomodoro_perfil_id_idx on public.sesiones_pomodoro (perfil_id);
create index sesiones_pomodoro_sesion_id_idx on public.sesiones_pomodoro (sesion_id);

create table public.tareas_kanban (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  titulo text not null,
  descripcion text,
  estado public.estado_tarea_kanban not null default 'pendiente',
  posicion integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index tareas_kanban_perfil_id_idx on public.tareas_kanban (perfil_id);
create index tareas_kanban_estado_idx on public.tareas_kanban (estado);

create table public.habitos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  nombre text not null,
  archivado boolean not null default false,
  creado_en timestamptz not null default now()
);

create index habitos_perfil_id_idx on public.habitos (perfil_id);

create table public.registros_habito (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid not null references public.habitos (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  fecha date not null,
  completado boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (habito_id, fecha)
);

create index registros_habito_habito_id_idx on public.registros_habito (habito_id);
create index registros_habito_perfil_id_idx on public.registros_habito (perfil_id);
create index registros_habito_fecha_idx on public.registros_habito (fecha);

create table public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  titulo text not null,
  descripcion text,
  inicio_en timestamptz not null,
  fin_en timestamptz not null,
  creado_en timestamptz not null default now(),
  completado boolean,
  check (fin_en > inicio_en)
);

create index eventos_calendario_perfil_id_idx on public.eventos_calendario (perfil_id);
create index eventos_calendario_inicio_en_idx on public.eventos_calendario (inicio_en);

-- Cuentas que no cuentan en el análisis. Se llena a mano desde el SQL Editor.
create table public.analisis_excluidos (
  perfil_id uuid primary key references public.perfiles (id) on delete cascade,
  motivo text not null,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Funciones
-- ---------------------------------------------------------------------------

create or replace function public.marcar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

-- security definer: las políticas RLS de otras tablas la usan sin leer perfiles directamente.
create or replace function public.rol_usuario_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- RS-05 en la base: sin consentimiento no se aceptan datos de actividad.
create or replace function public.acepto_consentimiento()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.consentimientos where perfil_id = auth.uid());
$$;

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- El rol solo cambia desde el servidor (service_role) o el SQL Editor (postgres).
create or replace function public.impedir_cambio_de_rol()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rol is distinct from old.rol
     and current_user in ('authenticated', 'anon') then
    raise exception 'El rol de un perfil no se puede cambiar desde la aplicación.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Seudónimo estable por participante, sin nombre ni correo.
create or replace function public.codigo_participante(uid uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'P-' || upper(substr(md5(uid::text), 1, 6));
$$;

-- No son security definer: current_user tiene que ser quien consulta
-- (lector_powerbi desde Power BI, authenticated desde la API).
create or replace function public.puede_leer_agregados()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user = 'lector_powerbi'
    or coalesce(public.rol_usuario_actual() in ('investigador', 'autoridad'), false);
$$;

create or replace function public.puede_leer_por_participante()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user = 'lector_powerbi'
    or coalesce(public.rol_usuario_actual() = 'investigador', false);
$$;

-- ---------------------------------------------------------------------------
-- 4. Disparadores
-- ---------------------------------------------------------------------------

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil();

create trigger perfiles_actualizado_en
  before update on public.perfiles
  for each row execute function public.marcar_actualizado_en();

create trigger perfiles_impedir_cambio_de_rol
  before update on public.perfiles
  for each row execute function public.impedir_cambio_de_rol();

create trigger tareas_kanban_actualizado_en
  before update on public.tareas_kanban
  for each row execute function public.marcar_actualizado_en();

-- ---------------------------------------------------------------------------
-- 5. Seguridad a nivel de fila
-- ---------------------------------------------------------------------------
-- Cada participante ve y escribe solo sus filas; el investigador lee todo.
-- informes_ia y perfiles no tienen política de insert: los escribe el
-- servidor con la service role (y el disparador, en el caso de perfiles).
-- analisis_excluidos no tiene políticas: solo la leen las vistas.

alter table public.perfiles enable row level security;
alter table public.consentimientos enable row level security;
alter table public.sesiones enable row level security;
alter table public.eventos_interaccion enable row level security;
alter table public.intentos_actividad enable row level security;
alter table public.ensayos_actividad enable row level security;
alter table public.resultados_actividad enable row level security;
alter table public.informes_ia enable row level security;
alter table public.sesiones_pomodoro enable row level security;
alter table public.tareas_kanban enable row level security;
alter table public.habitos enable row level security;
alter table public.registros_habito enable row level security;
alter table public.eventos_calendario enable row level security;
alter table public.analisis_excluidos enable row level security;

create policy perfiles_select_propio on public.perfiles
  for select using (id = auth.uid());
create policy perfiles_update_propio on public.perfiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy perfiles_select_investigador on public.perfiles
  for select using (public.rol_usuario_actual() = 'investigador');

create policy consentimientos_select_propio on public.consentimientos
  for select using (perfil_id = auth.uid());
create policy consentimientos_insert_propio on public.consentimientos
  for insert with check (perfil_id = auth.uid());
create policy consentimientos_select_investigador on public.consentimientos
  for select using (public.rol_usuario_actual() = 'investigador');

create policy sesiones_select_propio on public.sesiones
  for select using (perfil_id = auth.uid());
create policy sesiones_insert_propio on public.sesiones
  for insert with check (perfil_id = auth.uid());
create policy sesiones_update_propio on public.sesiones
  for update using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy sesiones_select_investigador on public.sesiones
  for select using (public.rol_usuario_actual() = 'investigador');

create policy eventos_interaccion_select_propio on public.eventos_interaccion
  for select using (perfil_id = auth.uid());
create policy eventos_interaccion_insert_propio on public.eventos_interaccion
  for insert with check (perfil_id = auth.uid());
create policy eventos_interaccion_select_investigador on public.eventos_interaccion
  for select using (public.rol_usuario_actual() = 'investigador');

create policy intentos_actividad_select_propio on public.intentos_actividad
  for select using (perfil_id = (select auth.uid()));
create policy intentos_actividad_insert_propio on public.intentos_actividad
  for insert with check (
    perfil_id = (select auth.uid())
    and (select public.acepto_consentimiento())
    and exists (
      select 1 from public.sesiones s
      where s.id = sesion_id and s.perfil_id = (select auth.uid())
    )
  );
create policy intentos_actividad_update_propio on public.intentos_actividad
  for update using (perfil_id = (select auth.uid())) with check (perfil_id = (select auth.uid()));
create policy intentos_actividad_select_investigador on public.intentos_actividad
  for select using (public.rol_usuario_actual() = 'investigador');

create policy ensayos_actividad_select_propio on public.ensayos_actividad
  for select using (perfil_id = (select auth.uid()));
create policy ensayos_actividad_insert_propio on public.ensayos_actividad
  for insert with check (
    perfil_id = (select auth.uid())
    and (select public.acepto_consentimiento())
    and exists (
      select 1 from public.intentos_actividad i
      where i.id = intento_id and i.perfil_id = (select auth.uid())
    )
  );
create policy ensayos_actividad_select_investigador on public.ensayos_actividad
  for select using (public.rol_usuario_actual() = 'investigador');

create policy resultados_actividad_select_propio on public.resultados_actividad
  for select using (perfil_id = auth.uid());
create policy resultados_actividad_insert_propio on public.resultados_actividad
  for insert with check (perfil_id = auth.uid());
create policy resultados_actividad_select_investigador on public.resultados_actividad
  for select using (public.rol_usuario_actual() = 'investigador');

create policy informes_ia_select_propio on public.informes_ia
  for select using (perfil_id = auth.uid());
create policy informes_ia_select_investigador on public.informes_ia
  for select using (public.rol_usuario_actual() = 'investigador');

create policy sesiones_pomodoro_todo_propio on public.sesiones_pomodoro
  for all using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy sesiones_pomodoro_select_investigador on public.sesiones_pomodoro
  for select using (public.rol_usuario_actual() = 'investigador');

create policy tareas_kanban_todo_propio on public.tareas_kanban
  for all using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy tareas_kanban_select_investigador on public.tareas_kanban
  for select using (public.rol_usuario_actual() = 'investigador');

create policy habitos_todo_propio on public.habitos
  for all using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy habitos_select_investigador on public.habitos
  for select using (public.rol_usuario_actual() = 'investigador');

create policy registros_habito_todo_propio on public.registros_habito
  for all using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy registros_habito_select_investigador on public.registros_habito
  for select using (public.rol_usuario_actual() = 'investigador');

create policy eventos_calendario_todo_propio on public.eventos_calendario
  for all using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy eventos_calendario_select_investigador on public.eventos_calendario
  for select using (public.rol_usuario_actual() = 'investigador');

-- ---------------------------------------------------------------------------
-- 6. Vistas de análisis
-- ---------------------------------------------------------------------------
-- Solo participantes y solo protocolo v2. Son SECURITY DEFINER a propósito
-- (el Security Advisor lo marca): la autoridad y Power BI no tienen lectura
-- de las tablas base. Cada vista filtra con puede_leer_agregados() o
-- puede_leer_por_participante(), que se evalúan con quien consulta: un
-- participante o un visitante recibe cero filas. Ninguna expone perfil_id.
-- `dia` es la medianoche de Guatemala, no de UTC.

create view public.vw_resumen_resultados_actividad as
select
  r.tipo_actividad,
  count(*) as total_resultados,
  avg(r.duracion_ms) as duracion_ms_promedio,
  avg(r.precision) as precision_promedio,
  avg(r.nivel_alcanzado) as nivel_promedio,
  stddev(r.precision) as precision_desv_estandar,
  r.version_protocolo
from public.resultados_actividad r
join public.perfiles p on p.id = r.perfil_id and p.rol = 'participante'
where public.puede_leer_agregados() and r.version_protocolo = 'v2'
group by r.tipo_actividad, r.version_protocolo;

create view public.vw_resumen_eventos_interaccion as
select
  e.tipo_evento,
  (date_trunc('day', e.ocurrido_en at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  count(*) as total_eventos
from public.eventos_interaccion e
join public.perfiles p on p.id = e.perfil_id and p.rol = 'participante'
where public.puede_leer_agregados()
group by e.tipo_evento, (date_trunc('day', e.ocurrido_en at time zone 'America/Guatemala') at time zone 'America/Guatemala');

create view public.vw_resumen_sesiones as
select
  (date_trunc('day', s.iniciada_en at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  s.estado,
  count(*) as total_sesiones,
  avg(extract(epoch from (coalesce(s.finalizada_en, now()) - s.iniciada_en))) as duracion_segundos_promedio
from public.sesiones s
join public.perfiles p on p.id = s.perfil_id and p.rol = 'participante'
where public.puede_leer_agregados()
group by (date_trunc('day', s.iniciada_en at time zone 'America/Guatemala') at time zone 'America/Guatemala'), s.estado;

create view public.vw_resumen_uso_herramientas as
select
  'pomodoro' as herramienta,
  (date_trunc('day', sp.iniciada_en at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  count(*) as total_usos,
  sum(case when sp.interrumpida then 1 else 0 end) as total_interrupciones
from public.sesiones_pomodoro sp
join public.perfiles p on p.id = sp.perfil_id and p.rol = 'participante'
where public.puede_leer_agregados()
group by (date_trunc('day', sp.iniciada_en at time zone 'America/Guatemala') at time zone 'America/Guatemala')
union all
select
  'kanban' as herramienta,
  (date_trunc('day', k.creado_en at time zone 'America/Guatemala') at time zone 'America/Guatemala') as dia,
  count(*) as total_usos,
  0 as total_interrupciones
from public.tareas_kanban k
join public.perfiles p on p.id = k.perfil_id and p.rol = 'participante'
where public.puede_leer_agregados()
group by (date_trunc('day', k.creado_en at time zone 'America/Guatemala') at time zone 'America/Guatemala');

-- Métrica principal de cada dimensión por dispositivo, sobre el primer
-- intento completado de cada participante (los reintentos tienen efecto de práctica).
create view public.vw_actividades_dimensiones as
with primer as (
  select distinct on (r.perfil_id, r.tipo_actividad)
    r.perfil_id, r.tipo_actividad, r.precision, r.nivel_alcanzado, r.duracion_ms, r.metricas,
    coalesce(i.tipo_dispositivo::text, 'sin_dato') as tipo_dispositivo
  from public.resultados_actividad r
  join public.perfiles p on p.id = r.perfil_id and p.rol = 'participante'
  left join public.intentos_actividad i on i.id = r.intento_id
  where r.version_protocolo = 'v2'
    and not exists (select 1 from public.analisis_excluidos x where x.perfil_id = r.perfil_id)
  order by r.perfil_id, r.tipo_actividad, r.completado_en
),
principal as (
  select
    tipo_actividad,
    tipo_dispositivo,
    perfil_id,
    precision,
    duracion_ms,
    case tipo_actividad
      when 'reaction_test' then (metricas ->> 'rtMeanMs')::numeric
      when 'focus_flow' then (metricas ->> 'commissionRatePct')::numeric
      when 'memory_matrix' then nivel_alcanzado::numeric
      when 'word_sprint' then precision
      when 'pattern_hunt' then (metricas ->> 'detectionSpeedMs')::numeric
      when 'deep_read' then (metricas ->> 'comprehensionScore')::numeric
    end as valor
  from primer
)
select
  tipo_actividad,
  case tipo_actividad
    when 'reaction_test' then 'Alerta'
    when 'focus_flow' then 'Atención sostenida'
    when 'memory_matrix' then 'Memoria de trabajo visoespacial'
    when 'word_sprint' then 'Atención selectiva e inhibición'
    when 'pattern_hunt' then 'Atención selectiva visual'
    when 'deep_read' then 'Resistencia a la distracción'
  end as dimension,
  case tipo_actividad
    when 'reaction_test' then 'TR promedio (ms)'
    when 'focus_flow' then 'Comisiones (%)'
    when 'memory_matrix' then 'Span (bloques)'
    when 'word_sprint' then 'Precisión (%)'
    when 'pattern_hunt' then 'Velocidad de detección (ms)'
    when 'deep_read' then 'Comprensión (de 8)'
  end as metrica_principal,
  tipo_dispositivo,
  count(distinct perfil_id) as participantes,
  avg(valor) as valor_promedio,
  stddev(valor) as valor_desv_estandar,
  min(valor) as valor_minimo,
  max(valor) as valor_maximo,
  avg(precision) as precision_promedio,
  avg(duracion_ms) / 1000.0 as duracion_s_promedio
from principal
where public.puede_leer_agregados()
group by tipo_actividad, tipo_dispositivo;

-- Una fila por participante: métricas cognitivas (primer intento v2) y
-- variables pasivas de todas sus sesiones (hipótesis H1 y H2).
create view public.vw_participantes_analisis as
with primer as (
  select distinct on (r.perfil_id, r.tipo_actividad)
    r.perfil_id, r.tipo_actividad, r.precision, r.nivel_alcanzado, r.metricas,
    i.tipo_dispositivo::text as tipo_dispositivo
  from public.resultados_actividad r
  join public.perfiles p on p.id = r.perfil_id and p.rol = 'participante'
  left join public.intentos_actividad i on i.id = r.intento_id
  where r.version_protocolo = 'v2'
  order by r.perfil_id, r.tipo_actividad, r.completado_en
),
cognitivas as (
  select
    perfil_id,
    mode() within group (order by tipo_dispositivo) as dispositivo_principal,
    count(*) as actividades_completadas,
    max((metricas ->> 'rtMeanMs')::numeric) filter (where tipo_actividad = 'reaction_test') as rt_promedio_ms,
    max((metricas ->> 'rtSdMs')::numeric) filter (where tipo_actividad = 'reaction_test') as rt_desv_ms,
    max((metricas ->> 'lapses')::numeric) filter (where tipo_actividad = 'reaction_test') as rt_lapsos,
    max((metricas ->> 'anticipations')::numeric) filter (where tipo_actividad = 'reaction_test') as rt_anticipaciones,
    max((metricas ->> 'commissionRatePct')::numeric) filter (where tipo_actividad = 'focus_flow') as ff_comision_pct,
    max((metricas ->> 'omissionRatePct')::numeric) filter (where tipo_actividad = 'focus_flow') as ff_omision_pct,
    max((metricas ->> 'goRtMeanMs')::numeric) filter (where tipo_actividad = 'focus_flow') as ff_rt_ms,
    max(nivel_alcanzado) filter (where tipo_actividad = 'memory_matrix') as mm_span,
    max((metricas ->> 'correctSequences')::numeric) filter (where tipo_actividad = 'memory_matrix') as mm_secuencias_correctas,
    max(precision) filter (where tipo_actividad = 'word_sprint') as ws_precision_pct,
    max((metricas ->> 'interferenceMs')::numeric) filter (where tipo_actividad = 'word_sprint') as ws_interferencia_ms,
    max((metricas ->> 'detectionSpeedMs')::numeric) filter (where tipo_actividad = 'pattern_hunt') as ph_deteccion_ms,
    max((metricas ->> 'conjunctionPresentSlopeMsPerItem')::numeric) filter (where tipo_actividad = 'pattern_hunt') as ph_pendiente_conjuncion,
    max(precision) filter (where tipo_actividad = 'pattern_hunt') as ph_precision_pct,
    max((metricas ->> 'comprehensionScore')::numeric) filter (where tipo_actividad = 'deep_read') as dr_comprension,
    max((metricas ->> 'wordsPerMinute')::numeric) filter (where tipo_actividad = 'deep_read') as dr_palabras_minuto,
    max((metricas ->> 'notificationsIgnored')::numeric) filter (where tipo_actividad = 'deep_read') as dr_notificaciones_ignoradas,
    max((metricas ->> 'visibilityExits')::numeric) filter (where tipo_actividad = 'deep_read') as dr_salidas_pestana
  from primer
  group by perfil_id
),
uso as (
  select
    s.perfil_id,
    count(*) as sesiones,
    avg(extract(epoch from (coalesce(s.finalizada_en, now()) - s.iniciada_en))) / 60.0 as sesion_minutos_promedio
  from public.sesiones s
  group by s.perfil_id
),
eventos as (
  select
    e.perfil_id,
    count(*) as eventos_totales,
    count(*) filter (where e.tipo_evento = 'click') as clics,
    count(*) filter (where e.tipo_evento = 'visibility_change' and e.datos ->> 'state' = 'hidden') as cambios_pestana,
    avg((e.datos ->> 'rating')::numeric) filter (where e.tipo_evento = 'session_pulse') as pulso_concentracion_promedio
  from public.eventos_interaccion e
  group by e.perfil_id
),
-- idle_start se emite tras 60 s sin interacción (IDLE_THRESHOLD_MS en
-- use-event-tracker.ts): la inactividad real es 60 s más el intervalo hasta idle_end.
inactividad as (
  select perfil_id, avg(duracion_s) as inactividad_promedio_s, count(*) as periodos_inactividad
  from (
    select
      e.perfil_id,
      e.tipo_evento,
      lag(e.tipo_evento) over w as previo,
      60 + extract(epoch from (e.ocurrido_en - lag(e.ocurrido_en) over w)) as duracion_s
    from public.eventos_interaccion e
    where e.tipo_evento in ('idle_start', 'idle_end')
    window w as (partition by e.sesion_id order by e.ocurrido_en)
  ) x
  where tipo_evento = 'idle_end' and previo = 'idle_start'
  group by perfil_id
),
pomodoro as (
  select
    perfil_id,
    count(*) as pomodoros,
    avg(case when interrumpida then 1.0 else 0.0 end) * 100 as pomodoro_interrupcion_pct,
    avg(veces_pausado) as pomodoro_pausas_promedio
  from public.sesiones_pomodoro
  group by perfil_id
)
select
  public.codigo_participante(c.perfil_id) as participante,
  c.dispositivo_principal,
  c.actividades_completadas,
  c.rt_promedio_ms, c.rt_desv_ms, c.rt_lapsos, c.rt_anticipaciones,
  c.ff_comision_pct, c.ff_omision_pct, c.ff_rt_ms,
  c.mm_span, c.mm_secuencias_correctas,
  c.ws_precision_pct, c.ws_interferencia_ms,
  c.ph_deteccion_ms, c.ph_pendiente_conjuncion, c.ph_precision_pct,
  c.dr_comprension, c.dr_palabras_minuto, c.dr_notificaciones_ignoradas, c.dr_salidas_pestana,
  u.sesiones,
  u.sesion_minutos_promedio,
  coalesce(ev.cambios_pestana, 0)::numeric / greatest(u.sesiones, 1) as cambios_pestana_por_sesion,
  ina.inactividad_promedio_s,
  coalesce(ina.periodos_inactividad, 0) as periodos_inactividad,
  coalesce(ev.eventos_totales, 0) as eventos_totales,
  coalesce(ev.clics, 0) as clics,
  ev.pulso_concentracion_promedio,
  coalesce(po.pomodoros, 0) as pomodoros,
  po.pomodoro_interrupcion_pct,
  po.pomodoro_pausas_promedio
from cognitivas c
left join uso u on u.perfil_id = c.perfil_id
left join eventos ev on ev.perfil_id = c.perfil_id
left join inactividad ina on ina.perfil_id = c.perfil_id
left join pomodoro po on po.perfil_id = c.perfil_id
where public.puede_leer_por_participante();

-- Una fila por ensayo de intentos completados, para distribuciones de TR y efectos por condición.
create view public.vw_ensayos_analisis as
select
  public.codigo_participante(t.perfil_id) as participante,
  i.tipo_actividad,
  i.tipo_dispositivo::text as tipo_dispositivo,
  i.entrada_principal::text as entrada_principal,
  i.frecuencia_refresco_est,
  i.iniciado_en as corrida_inicio,
  t.indice_ensayo,
  t.condicion,
  t.inicio_estimulo_ms,
  t.tiempo_reaccion_ms,
  t.respuesta,
  t.correcto,
  t.clasificacion,
  t.tipo_entrada::text as tipo_entrada,
  t.valido,
  t.motivo_invalidez
from public.ensayos_actividad t
join public.intentos_actividad i on i.id = t.intento_id and i.estado = 'completada'
join public.perfiles p on p.id = t.perfil_id and p.rol = 'participante'
where public.puede_leer_por_participante();

-- ---------------------------------------------------------------------------
-- 7. Rol de Power BI y permisos
-- ---------------------------------------------------------------------------
-- Supabase otorga por defecto todo lo que se crea en public a anon,
-- authenticated y service_role; aquí se recorta. lector_powerbi se crea sin
-- contraseña: se le asigna a mano (ver docs/power_bi.md).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'lector_powerbi') then
    create role lector_powerbi nologin;
  end if;
end
$$;

grant usage on schema public to lector_powerbi;

-- Desde la API, cada quien solo puede editar su nombre.
revoke all on public.perfiles from anon;
revoke insert, update, delete on public.perfiles from authenticated;
grant update (nombre_completo) on public.perfiles to authenticated;

revoke all on public.analisis_excluidos from anon, authenticated;

revoke execute on function public.crear_perfil(), public.impedir_cambio_de_rol()
  from public, anon, authenticated;

-- Las usan las políticas RLS, que se evalúan con el rol de quien consulta.
revoke execute on function public.rol_usuario_actual(), public.acepto_consentimiento()
  from public, anon;
grant execute on function public.rol_usuario_actual(), public.acepto_consentimiento()
  to authenticated;

grant execute on function public.rol_usuario_actual(), public.puede_leer_agregados(),
  public.puede_leer_por_participante(), public.codigo_participante(uuid)
  to lector_powerbi;

revoke all on
  public.vw_resumen_resultados_actividad,
  public.vw_resumen_eventos_interaccion,
  public.vw_resumen_sesiones,
  public.vw_resumen_uso_herramientas,
  public.vw_actividades_dimensiones,
  public.vw_participantes_analisis,
  public.vw_ensayos_analisis
from anon;

grant select on
  public.vw_resumen_resultados_actividad,
  public.vw_resumen_eventos_interaccion,
  public.vw_resumen_sesiones,
  public.vw_resumen_uso_herramientas,
  public.vw_actividades_dimensiones,
  public.vw_participantes_analisis,
  public.vw_ensayos_analisis
to lector_powerbi;

-- ---------------------------------------------------------------------------
-- 8. Comentarios
-- ---------------------------------------------------------------------------

comment on table public.perfiles is 'Perfil de aplicación por usuario. 1:1 con auth.users.';
comment on table public.consentimientos is 'Registro de aceptación del consentimiento informado, con fecha y hora.';
comment on table public.sesiones is 'Sesión de uso de la aplicación (RF-02). Agrupa eventos, resultados e informes.';
comment on table public.eventos_interaccion is 'Eventos de interacción no intrusivos capturados por useEventTracker, agrupados por sesión.';
comment on table public.intentos_actividad is 'Un intento registrado de una actividad cognitiva (v2), con su estado y el contexto de dispositivo del participante.';
comment on table public.ensayos_actividad is 'Un ensayo registrado de una actividad cognitiva (v2). La práctica no se guarda.';
comment on table public.resultados_actividad is 'Resumen de cada actividad cognitiva completada, vinculado a la sesión y al participante (RF-04, RF-05).';
comment on table public.informes_ia is 'Informe de perfil atencional por sesión. No contiene diagnóstico clínico ni terminología médica.';
comment on table public.sesiones_pomodoro is 'Bloques de Pomodoro configurados por el usuario; las interrupciones también quedan en eventos_interaccion.';
comment on table public.tareas_kanban is 'Tareas del tablero Kanban personal. posicion ordena las tarjetas dentro de cada columna (estado).';
comment on table public.habitos is 'Hábitos definidos por el usuario para seguimiento diario.';
comment on table public.registros_habito is 'Cumplimiento diario de un hábito. perfil_id está desnormalizado para simplificar las políticas RLS.';
comment on table public.eventos_calendario is 'Eventos del calendario semanal personal del participante.';
comment on table public.analisis_excluidos is 'Participantes que no cuentan en el análisis (cuentas de prueba previas al taller).';

comment on column public.sesiones_pomodoro.veces_pausado is 'Cuántas veces se pausó este bloque.';
comment on column public.sesiones_pomodoro.ms_pausado is 'Tiempo total en pausa (ms): separa el enfoque real del tiempo transcurrido (finalizada_en - iniciada_en).';
comment on column public.eventos_calendario.completado is 'null = sin responder todavía; true/false = el participante confirmó si cumplió lo que agendó, preguntado una vez que fin_en ya pasó.';

comment on view public.vw_resumen_resultados_actividad is 'Distribución agregada de resultados por actividad cognitiva (RF-13). Sin identificadores individuales.';
comment on view public.vw_resumen_eventos_interaccion is 'Frecuencia diaria de eventos pasivos por tipo (RF-13). Sin identificadores individuales.';
comment on view public.vw_resumen_sesiones is 'Estadísticos descriptivos básicos de sesiones por día (RF-13). Sin identificadores individuales.';
comment on view public.vw_resumen_uso_herramientas is 'Uso agregado de las herramientas de productividad por día (RF-13). Sin identificadores individuales.';
comment on view public.vw_actividades_dimensiones is 'Métrica principal de cada dimensión atencional por dispositivo (v2, solo participantes, primer intento). Agregada, sin identificadores.';
comment on view public.vw_participantes_analisis is 'Una fila por participante (seudónimo): métricas cognitivas v2 (primer intento) y variables pasivas. Solo investigador y Power BI.';
comment on view public.vw_ensayos_analisis is 'Ensayos registrados (v2) de intentos completados, por participante seudonimizado. Solo investigador y Power BI.';
