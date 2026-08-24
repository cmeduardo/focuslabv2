-- FocusLab · 0001 · Extensiones, tipos enumerados y funciones auxiliares
-- Capa: acceso a datos (Supabase / PostgreSQL)

create extension if not exists "pgcrypto";

-- Roles de usuario (ver "Roles de usuario" en el prompt del proyecto)
create type public.user_role as enum ('participante', 'investigador', 'autoridad');

-- Estado de una sesión de uso de la aplicación
create type public.session_status as enum ('en_progreso', 'completada', 'abandonada');

-- Las seis actividades cognitivas gamificadas (módulo 3)
create type public.activity_type as enum (
  'reaction_test',
  'focus_flow',
  'memory_matrix',
  'word_sprint',
  'pattern_hunt',
  'deep_read'
);

-- Catálogo de eventos capturados por el motor de captura (módulo 2)
create type public.interaction_event_type as enum (
  'click',
  'visibility_change',
  'idle_start',
  'idle_end',
  'activity_start',
  'activity_end',
  'tool_start',
  'tool_end',
  'tool_interrupt'
);

create type public.kanban_task_status as enum ('pendiente', 'en_progreso', 'completado');

create type public.ai_report_status as enum ('pendiente', 'completado', 'fallido');

-- Devuelve el rol del usuario autenticado consultando public.profiles.
-- security definer: necesario para evaluarse dentro de las políticas RLS de
-- otras tablas sin recursión ni depender de que el llamador tenga acceso
-- directo a profiles.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Trigger genérico para mantener updated_at al día.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
