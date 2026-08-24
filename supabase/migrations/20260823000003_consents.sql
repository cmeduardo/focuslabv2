-- FocusLab · 0003 · consents
-- RS-05: consentimiento informado obligatorio antes de iniciar la captura de datos.

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_version text not null default 'v1',
  accepted_at timestamptz not null default now()
);

comment on table public.consents is 'Registro de aceptación del consentimiento informado, con fecha y hora.';

create index consents_user_id_idx on public.consents (user_id);

alter table public.consents enable row level security;

create policy "consents_select_own"
  on public.consents for select
  using (user_id = auth.uid());

create policy "consents_insert_own"
  on public.consents for insert
  with check (user_id = auth.uid());

create policy "consents_select_researcher"
  on public.consents for select
  using (public.current_user_role() = 'investigador');
