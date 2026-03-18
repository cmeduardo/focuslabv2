CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE public.tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  estimated_pomodoros INTEGER DEFAULT 1,
  completed_pomodoros INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.pomodoro_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES public.tasks(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id),
  duration_seconds INTEGER NOT NULL DEFAULT 1500,  -- 25 min default
  break_duration_seconds INTEGER DEFAULT 300,       -- 5 min default
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  interruptions INTEGER DEFAULT 0,
  focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.habits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#8B5CF6',
  frequency TEXT DEFAULT 'daily',       -- 'daily', 'weekdays', 'custom'
  target_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
  streak_current INTEGER DEFAULT 0,
  streak_best INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.habit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  habit_id BIGINT NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  UNIQUE(habit_id, completed_at)
);

CREATE INDEX idx_tasks_user ON public.tasks(user_id, status);
CREATE INDEX idx_pomodoro_user ON public.pomodoro_sessions(user_id, started_at DESC);
CREATE INDEX idx_habits_user ON public.habits(user_id);
