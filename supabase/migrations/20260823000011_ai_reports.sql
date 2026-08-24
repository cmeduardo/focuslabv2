-- FocusLab · 0011 · ai_reports
-- Informe de perfil atencional generado por el agente de IA (módulo 5 / RF-10, RF-11).
--
-- Flujo: al finalizar una sesión se crea una fila en estado 'pendiente' y se
-- dispara el webhook a n8n (o el mock local, ver generateAttentionReport()).
-- n8n llama a GPT-4o-mini y responde al webhook de retorno de la app, que
-- actualiza esta misma fila a 'completado' con el contenido del informe.

create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.ai_report_status not null default 'pendiente',
  attentional_profile text,
  strengths jsonb not null default '[]'::jsonb,
  areas_for_improvement jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  -- Respuesta completa devuelta por n8n/GPT-4o-mini, para auditoría.
  raw_response jsonb,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.ai_reports is 'Informe de perfil atencional por sesión. No contiene diagnóstico clínico ni terminología médica (ver contexto del proyecto).';

create index ai_reports_user_id_idx on public.ai_reports (user_id);
create index ai_reports_status_idx on public.ai_reports (status);

alter table public.ai_reports enable row level security;

-- RF-12: historial de sesiones e informes anteriores del participante.
create policy "ai_reports_select_own"
  on public.ai_reports for select
  using (user_id = auth.uid());

create policy "ai_reports_select_researcher"
  on public.ai_reports for select
  using (public.current_user_role() = 'investigador');

-- No se define policy de insert/update para usuarios autenticados: las filas
-- de ai_reports son gestionadas por el backend (Route Handlers) usando la
-- service role key de Supabase, tanto al crear el registro 'pendiente' como
-- al recibir el webhook de retorno de n8n. Ver ARCHITECTURE.md.
