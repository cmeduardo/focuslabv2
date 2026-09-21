-- FocusLab · 20260828000004 · interaction_event_type: session_pulse
-- Reemplaza el autorreporte por-actividad (se sintió repetitivo, feedback
-- directo 2026-08-28) por un pulso liviano a nivel de sesión, cada 3
-- actividades completadas: "¿cómo te sentiste concentrándote hasta
-- ahora?", un toast no bloqueante con emojis, en vez de una pantalla
-- obligatoria por cada actividad.
alter type public.interaction_event_type add value 'session_pulse';
