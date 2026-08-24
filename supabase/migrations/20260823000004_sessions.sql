-- FocusLab · 0004 · sessions
-- Una sesión de uso agrupa actividades, eventos y, al finalizar, un informe de IA.

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.session_status not null default 'en_progreso',
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

comment on table public.sessions is 'Sesión de uso de la aplicación (RF-02). session_id de referencia para eventos, resultados e informes.';

create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_started_at_idx on public.sessions (started_at);

alter table public.sessions enable row level security;

create policy "sessions_select_own"
  on public.sessions for select
  using (user_id = auth.uid());

create policy "sessions_insert_own"
  on public.sessions for insert
  with check (user_id = auth.uid());

create policy "sessions_update_own"
  on public.sessions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "sessions_select_researcher"
  on public.sessions for select
  using (public.current_user_role() = 'investigador');
