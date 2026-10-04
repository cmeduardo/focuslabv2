-- FocusLab · 20261004000001 · activity_runs + activity_trials (rediseño v2)
-- Rediseño de las seis actividades (2026-10-04): cada una pasa a un
-- paradigma clásico (PVT, SART, Corsi, Stroop, búsqueda visual, lectura con
-- distractores) con datos POR ENSAYO y contexto de dispositivo, porque el
-- taller mezcla laptops y celulares. Cambios estrictamente aditivos:
--   * activity_runs: una fila por intento registrado de una actividad
--     (en_curso → completada | incompleta) con el contexto de dispositivo.
--   * activity_trials: una fila por ensayo registrado (la práctica NO se
--     guarda), escrita en lote al terminar.
--   * activity_results: + run_id y + protocol_version ('v1' = mecánicas
--     anteriores, 'v2' = rediseño), para no mezclar filas no comparables.

create type public.activity_run_status as enum ('en_curso', 'completada', 'incompleta');
create type public.device_type as enum ('mobile', 'tablet', 'desktop');
create type public.input_type as enum ('touch', 'mouse', 'keyboard');

-- RS-05 como defensa en profundidad: el layout de participante ya
-- redirige a /consentimiento, pero la base tampoco acepta datos de
-- actividad de alguien sin consentimiento registrado.
create or replace function public.has_accepted_consent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.consents where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- activity_runs
-- ---------------------------------------------------------------------------
create table public.activity_runs (
  -- El id lo genera el cliente (crypto.randomUUID) para que el guardado
  -- final sea un upsert idempotente: un reintento por falla de red nunca
  -- duplica la corrida.
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_type public.activity_type not null,
  protocol_version text not null default 'v2',
  status public.activity_run_status not null default 'en_curso',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Cuántas veces se hizo la ronda de práctica antes de la registrada (1 o 2).
  practice_rounds smallint not null default 1 check (practice_rounds between 0 and 2),
  -- Copia de los parámetros con que se corrió (config.ts), para que un
  -- cambio futuro de parámetros no vuelva ambiguos los datos ya guardados.
  config jsonb not null default '{}'::jsonb,

  -- Contexto de dispositivo
  device_type public.device_type,
  input_primary public.input_type,
  input_counts jsonb not null default '{}'::jsonb,
  viewport_w integer check (viewport_w >= 0),
  viewport_h integer check (viewport_h >= 0),
  device_pixel_ratio numeric(4, 2),
  orientation text check (orientation in ('portrait', 'landscape')),
  browser text,
  os text,
  refresh_hz_est numeric(5, 1),
  visibility_losses integer not null default 0 check (visibility_losses >= 0)
);

comment on table public.activity_runs is 'Un intento registrado de una actividad cognitiva (v2), con su estado y el contexto de dispositivo del participante.';

create index activity_runs_session_id_idx on public.activity_runs (session_id);
create index activity_runs_user_id_idx on public.activity_runs (user_id);
create index activity_runs_en_curso_idx on public.activity_runs (session_id) where status = 'en_curso';

alter table public.activity_runs enable row level security;

create policy "activity_runs_select_own"
  on public.activity_runs for select
  using (user_id = (select auth.uid()));

create policy "activity_runs_insert_own"
  on public.activity_runs for insert
  with check (
    user_id = (select auth.uid())
    and (select public.has_accepted_consent())
    and exists (
      select 1 from public.sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

create policy "activity_runs_update_own"
  on public.activity_runs for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "activity_runs_select_researcher"
  on public.activity_runs for select
  using (public.current_user_role() = 'investigador');

-- ---------------------------------------------------------------------------
-- activity_trials
-- ---------------------------------------------------------------------------
create table public.activity_trials (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.activity_runs (id) on delete cascade,
  -- Redundante con activity_runs.user_id a propósito: RLS directa por
  -- auth.uid() sin join por cada fila.
  user_id uuid not null references public.profiles (id) on delete cascade,
  trial_index integer not null check (trial_index >= 0),
  -- Condición específica de cada actividad (congruente, tamaño de conjunto,
  -- objetivo presente, dígito, longitud de secuencia...). jsonb porque cada
  -- actividad tiene condiciones distintas.
  condition jsonb not null default '{}'::jsonb,
  -- Tiempos en ms relativos al inicio de la ronda registrada
  -- (performance.now()), con precisión sub-milisegundo.
  stimulus_onset_ms double precision,
  response_at_ms double precision,
  rt_ms double precision,
  response text,
  -- Línea de tiempo de la respuesta cuando no cabe en un solo valor (toques
  -- de Memory Matrix, notificaciones durante la lectura de Deep Read...).
  response_detail jsonb,
  correct boolean,
  -- Clasificación propia de la actividad: valid | lapse | anticipation |
  -- commission | omission | hit | timeout ...
  classification text,
  input_type public.input_type,
  valid boolean not null default true,
  invalid_reason text,
  unique (run_id, trial_index)
);

comment on table public.activity_trials is 'Un ensayo registrado de una actividad cognitiva (v2). La práctica no se guarda.';

create index activity_trials_user_id_idx on public.activity_trials (user_id);

alter table public.activity_trials enable row level security;

create policy "activity_trials_select_own"
  on public.activity_trials for select
  using (user_id = (select auth.uid()));

create policy "activity_trials_insert_own"
  on public.activity_trials for insert
  with check (
    user_id = (select auth.uid())
    and (select public.has_accepted_consent())
    and exists (
      select 1 from public.activity_runs r
      where r.id = run_id and r.user_id = (select auth.uid())
    )
  );

create policy "activity_trials_select_researcher"
  on public.activity_trials for select
  using (public.current_user_role() = 'investigador');

-- ---------------------------------------------------------------------------
-- activity_results: columnas aditivas
-- ---------------------------------------------------------------------------
alter table public.activity_results
  add column run_id uuid references public.activity_runs (id) on delete set null,
  add column protocol_version text not null default 'v1';

-- Una sola fila de resumen por corrida: el reintento del guardado final
-- hace upsert ignorando duplicados.
create unique index activity_results_run_id_key on public.activity_results (run_id);

-- ---------------------------------------------------------------------------
-- Vista agregada: separar por versión de protocolo (columna nueva al final,
-- create or replace exige mantener el orden de las existentes).
-- ---------------------------------------------------------------------------
create or replace view public.vw_activity_results_summary as
select
  activity_type,
  count(*) as total_resultados,
  avg(duration_ms) as duracion_ms_promedio,
  avg(accuracy) as precision_promedio,
  avg(level_reached) as nivel_promedio,
  stddev(accuracy) as precision_desv_estandar,
  protocol_version
from public.activity_results
where public.current_user_role() in ('investigador', 'autoridad')
group by activity_type, protocol_version;
