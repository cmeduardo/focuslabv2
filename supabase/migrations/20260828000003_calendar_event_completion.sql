-- FocusLab · 20260828000003 · calendar_events: seguimiento real vs. planeado
-- Señal de función ejecutiva/planificación: ¿lo que el participante agendó
-- realmente lo hizo? null = todavía sin responder (evento futuro, o pasado
-- sin reflexión aún); true/false = respuesta explícita del participante,
-- capturada una vez que el evento ya pasó (RF-09 + enriquecimiento
-- 2026-08-28).

alter table public.calendar_events
  add column completed boolean;

comment on column public.calendar_events.completed is 'null = sin responder todavía; true/false = el participante confirmó si cumplió lo que agendó, preguntado una vez que end_at ya pasó.';
