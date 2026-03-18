CREATE TYPE report_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status report_status DEFAULT 'pending',

  -- Datos agregados del período
  raw_data JSONB NOT NULL DEFAULT '{}',

  -- Análisis generado por IA (n8n)
  ai_analysis JSONB,                    -- insights, patrones detectados
  attention_profile TEXT,               -- tipo de perfil atencional
  recommendations TEXT[],               -- recomendaciones personalizadas
  focus_score_avg NUMERIC(5,2),

  generated_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_user ON public.reports(user_id, created_at DESC);
