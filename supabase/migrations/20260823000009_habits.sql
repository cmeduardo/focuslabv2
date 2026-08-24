-- FocusLab · 0009 · habits, habit_logs
-- Herramienta de productividad: rastreador de hábitos (RF-08).

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.habits is 'Hábitos definidos por el usuario para seguimiento diario.';

create index habits_user_id_idx on public.habits (user_id);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

comment on table public.habit_logs is 'Cumplimiento diario de un hábito. user_id está desnormalizado para simplificar las políticas RLS.';

create index habit_logs_habit_id_idx on public.habit_logs (habit_id);
create index habit_logs_user_id_idx on public.habit_logs (user_id);
create index habit_logs_log_date_idx on public.habit_logs (log_date);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

create policy "habits_all_own"
  on public.habits for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "habits_select_researcher"
  on public.habits for select
  using (public.current_user_role() = 'investigador');

create policy "habit_logs_all_own"
  on public.habit_logs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "habit_logs_select_researcher"
  on public.habit_logs for select
  using (public.current_user_role() = 'investigador');
