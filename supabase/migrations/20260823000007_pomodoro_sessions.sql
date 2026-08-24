-- FocusLab · 0007 · pomodoro_sessions
-- Herramienta de productividad: temporizador Pomodoro configurable (RF-06).

create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  work_duration_minutes integer not null check (work_duration_minutes > 0),
  break_duration_minutes integer not null check (break_duration_minutes > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed_cycles integer not null default 0 check (completed_cycles >= 0),
  interrupted boolean not null default false
);

comment on table public.pomodoro_sessions is 'Bloques de Pomodoro configurados por el usuario; las interrupciones también se reflejan como interaction_events.';

create index pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);
create index pomodoro_sessions_session_id_idx on public.pomodoro_sessions (session_id);

alter table public.pomodoro_sessions enable row level security;

create policy "pomodoro_sessions_all_own"
  on public.pomodoro_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "pomodoro_sessions_select_researcher"
  on public.pomodoro_sessions for select
  using (public.current_user_role() = 'investigador');
