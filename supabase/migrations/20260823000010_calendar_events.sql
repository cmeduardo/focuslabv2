-- FocusLab · 0010 · calendar_events
-- Herramienta de productividad: calendario semanal simple (RF-09).

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

comment on table public.calendar_events is 'Eventos del calendario semanal personal del participante.';

create index calendar_events_user_id_idx on public.calendar_events (user_id);
create index calendar_events_start_at_idx on public.calendar_events (start_at);

alter table public.calendar_events enable row level security;

create policy "calendar_events_all_own"
  on public.calendar_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "calendar_events_select_researcher"
  on public.calendar_events for select
  using (public.current_user_role() = 'investigador');
