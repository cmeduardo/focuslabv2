-- FocusLab · 20260828000002 · interaction_event_type: tool_progress
-- Hito granular dentro del uso de una herramienta de productividad (p. ej.
-- un ciclo de Pomodoro, un cambio de estado en Kanban) — mismo espíritu
-- que activity_start/activity_end pero para eventos intermedios, no solo
-- el inicio/fin de la herramienta. El detalle vive en payload (jsonb
-- libre), no hace falta un valor de enum nuevo por cada señal.
alter type public.interaction_event_type add value 'tool_progress';
