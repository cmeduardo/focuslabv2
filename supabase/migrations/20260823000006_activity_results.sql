-- FocusLab · 0006 · activity_results
-- Resultado estructurado de cada una de las seis actividades cognitivas (RF-05).

create table public.activity_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_type public.activity_type not null,
  duration_ms integer not null check (duration_ms >= 0),
  accuracy numeric(5, 2) check (accuracy between 0 and 100),
  level_reached integer check (level_reached >= 0),
  -- Métricas adicionales específicas de cada actividad (p. ej. tiempos de
  -- reacción individuales, secuencia de Memory Matrix, distractores de
  -- Pattern Hunt) sin exponer texto libre identificable.
  metrics jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);

comment on table public.activity_results is 'Una fila por actividad cognitiva completada, vinculada a session_id y usuario (RF-04, RF-05).';

create index activity_results_session_id_idx on public.activity_results (session_id);
create index activity_results_user_id_idx on public.activity_results (user_id);
create index activity_results_activity_type_idx on public.activity_results (activity_type);

alter table public.activity_results enable row level security;

create policy "activity_results_select_own"
  on public.activity_results for select
  using (user_id = auth.uid());

create policy "activity_results_insert_own"
  on public.activity_results for insert
  with check (user_id = auth.uid());

create policy "activity_results_select_researcher"
  on public.activity_results for select
  using (public.current_user_role() = 'investigador');
