-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Política base: cada usuario solo ve sus datos
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can CRUD own events"
  ON public.events FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own sessions"
  ON public.sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own activity results"
  ON public.activity_results FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own tasks"
  ON public.tasks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own pomodoro sessions"
  ON public.pomodoro_sessions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own habits"
  ON public.habits FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own habit logs"
  ON public.habit_logs FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT USING (auth.uid() = user_id);

-- Política para que el service_role (n8n webhook) pueda escribir análisis
CREATE POLICY "Service can update reports"
  ON public.reports FOR UPDATE
  USING (true)
  WITH CHECK (true);
