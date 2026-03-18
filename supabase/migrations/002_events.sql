CREATE TYPE event_category AS ENUM (
  'navigation',    -- cambio de página, clicks en nav
  'interaction',   -- clicks, scrolls, key presses
  'focus',         -- focus/blur de ventana/tab
  'idle',          -- periodos de inactividad
  'tool_usage',    -- uso de pomodoro, tareas, etc.
  'activity',      -- eventos dentro de actividades
  'session'        -- inicio/fin de sesión
);

CREATE TABLE public.events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  event_type TEXT NOT NULL,            -- ej: 'click', 'scroll', 'tab_blur', 'pomodoro_start'
  category event_category NOT NULL,
  page TEXT,                           -- ruta actual
  target TEXT,                         -- elemento interactuado (selector o label)
  metadata JSONB DEFAULT '{}',         -- datos adicionales flexibles
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_events_user_time ON public.events(user_id, timestamp DESC);
CREATE INDEX idx_events_session ON public.events(session_id);
CREATE INDEX idx_events_category ON public.events(category);
CREATE INDEX idx_events_type ON public.events(event_type);

-- Particionamiento por mes recomendado para escalabilidad futura
