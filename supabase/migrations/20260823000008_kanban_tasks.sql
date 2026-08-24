-- FocusLab · 0008 · kanban_tasks
-- Herramienta de productividad: tablero Kanban personal (RF-07).

create table public.kanban_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  status public.kanban_task_status not null default 'pendiente',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.kanban_tasks is 'Tareas del tablero Kanban personal. position ordena las tarjetas dentro de cada columna (status).';

create index kanban_tasks_user_id_idx on public.kanban_tasks (user_id);
create index kanban_tasks_status_idx on public.kanban_tasks (status);

create trigger set_kanban_tasks_updated_at
  before update on public.kanban_tasks
  for each row execute function public.set_updated_at();

alter table public.kanban_tasks enable row level security;

create policy "kanban_tasks_all_own"
  on public.kanban_tasks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "kanban_tasks_select_researcher"
  on public.kanban_tasks for select
  using (public.current_user_role() = 'investigador');
