-- FocusLab · 20260828000001 · pomodoro_sessions: registro de pausas
-- El contador de tiempo se congela al pausar, pero hasta ahora no quedaba
-- ningún rastro de cuánto tiempo ni cuántas veces — ended_at - started_at
-- podía incluir minutos u horas de pausa sin que se notara en el dato.

alter table public.pomodoro_sessions
  add column pause_count integer not null default 0 check (pause_count >= 0),
  add column paused_ms integer not null default 0 check (paused_ms >= 0);

comment on column public.pomodoro_sessions.pause_count is 'Cuántas veces se pausó este bloque.';
comment on column public.pomodoro_sessions.paused_ms is 'Tiempo total en pausa (ms) — permite distinguir duración real de enfoque de tiempo total transcurrido (ended_at - started_at).';
