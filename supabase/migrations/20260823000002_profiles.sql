-- FocusLab · 0002 · profiles
-- Extiende auth.users con el rol de la aplicación y datos básicos de perfil.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'participante',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de aplicación por usuario. 1:1 con auth.users.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea automáticamente el perfil (rol por defecto: participante) al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

-- RS-02: cada participante ve y edita únicamente su propio perfil.
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- El investigador (administrador del taller) necesita ver la lista de
-- participantes para dar mantenimiento y soporte durante el taller piloto.
create policy "profiles_select_researcher"
  on public.profiles for select
  using (public.current_user_role() = 'investigador');

-- No se define policy de insert: profiles se crea solo vía trigger
-- (security definer) al registrarse en auth.users.
