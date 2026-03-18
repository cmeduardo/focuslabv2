CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  device_info JSONB DEFAULT '{}',       -- user agent, screen size, etc.
  pages_visited TEXT[] DEFAULT '{}',
  total_events INTEGER DEFAULT 0,
  focus_score NUMERIC(5,2),             -- calculado al cerrar sesión
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON public.sessions(user_id, started_at DESC);
