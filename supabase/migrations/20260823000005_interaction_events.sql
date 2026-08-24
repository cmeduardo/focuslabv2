-- FocusLab · 0005 · interaction_events
-- Motor de captura de eventos (módulo 2 / RF-03): clics, cambios de pestaña,
-- inactividad e inicio/fin de actividades y herramientas.

create table public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type public.interaction_event_type not null,
  -- Datos específicos del evento (p. ej. selector del elemento, herramienta,
  -- duración de inactividad). Estructura libre, no identificable.
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

comment on table public.interaction_events is 'Eventos de interacción no intrusivos capturados por useEventTracker, agrupados por session_id.';

create index interaction_events_session_id_idx on public.interaction_events (session_id);
create index interaction_events_user_id_idx on public.interaction_events (user_id);
create index interaction_events_event_type_idx on public.interaction_events (event_type);
create index interaction_events_occurred_at_idx on public.interaction_events (occurred_at);

alter table public.interaction_events enable row level security;

create policy "interaction_events_select_own"
  on public.interaction_events for select
  using (user_id = auth.uid());

create policy "interaction_events_insert_own"
  on public.interaction_events for insert
  with check (user_id = auth.uid());

create policy "interaction_events_select_researcher"
  on public.interaction_events for select
  using (public.current_user_role() = 'investigador');
