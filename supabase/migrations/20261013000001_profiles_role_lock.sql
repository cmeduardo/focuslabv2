-- FocusLab · Bloqueo del rol en profiles
--
-- La política "profiles_update_own" (0002) deja que cada usuario actualice
-- su propia fila, y Supabase otorga UPDATE sobre todas las columnas de las
-- tablas de public a `authenticated`. Juntas permitían que un participante
-- se cambiara el rol a sí mismo desde el navegador:
--
--   PATCH /rest/v1/profiles?id=eq.<su id>   {"role": "investigador"}
--
-- y con eso leyera los datos de todos los participantes. Se cierra con dos
-- barreras independientes.

-- 1. Privilegios por columna: desde la API, un usuario solo puede editar su
--    nombre. `anon` no necesita nada de esta tabla.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2. Trigger: aunque alguien vuelva a otorgar UPDATE completo por error, el
--    rol solo cambia desde el servidor (service_role) o el SQL Editor
--    (postgres). Ver README, "Roles y cuentas".
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon') then
    raise exception 'El rol de un perfil no se puede cambiar desde la aplicación.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.prevent_role_self_change() from public, anon, authenticated;

create trigger profiles_prevent_role_self_change
  before update on public.profiles
  for each row execute function public.prevent_role_self_change();
