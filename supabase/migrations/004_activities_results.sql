CREATE TYPE activity_type AS ENUM (
  'reaction_test',
  'focus_flow',
  'memory_matrix',
  'word_sprint',
  'pattern_hunt',
  'deep_read'
);

CREATE TABLE public.activity_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id),
  activity activity_type NOT NULL,
  score NUMERIC(10,2),
  max_score NUMERIC(10,2),
  duration_seconds INTEGER,
  metrics JSONB NOT NULL DEFAULT '{}',  -- métricas específicas por actividad
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON public.activity_results(user_id, completed_at DESC);
CREATE INDEX idx_activity_type ON public.activity_results(activity);
