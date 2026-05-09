-- Tabla para bloques de tiempo del calendario semanal
CREATE TABLE public.calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_key DATE NOT NULL,
  start_hour NUMERIC(5,2) NOT NULL,         -- hora de inicio en decimal, ej: 9.5 = 09:30
  duration_hours NUMERIC(5,2) NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  type TEXT NOT NULL DEFAULT 'study',       -- 'study' | 'pomodoro' | 'task'
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calendar_blocks_user ON public.calendar_blocks(user_id, date_key);

ALTER TABLE public.calendar_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own calendar blocks"
  ON public.calendar_blocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
