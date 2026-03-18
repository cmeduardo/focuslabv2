# PROMPT PARA CLAUDE CODE — FocusLab

## Contexto del Proyecto

Eres un ingeniero full-stack senior. Tu misión es construir **FocusLab**, una web app que mide y analiza patrones de atención de usuarios universitarios mediante captura de eventos de interacción. La app combina herramientas de productividad reales con actividades diseñadas para detectar patrones cognitivos, todo envuelto en una interfaz moderna y atractiva para jóvenes de 18-25 años.

---

## Stack Tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Frontend | Next.js 14+ (App Router), React 18+, TypeScript | Despliegue en Vercel |
| Estilos | Tailwind CSS + shadcn/ui | Tema oscuro por defecto, acentos neón/gradientes |
| Estado | Zustand | Estado global ligero |
| Backend/API | Next.js API Routes + Supabase Edge Functions cuando se necesite lógica server-side pesada |
| Base de datos | Supabase (PostgreSQL) | Auth, Realtime, Storage, Row Level Security |
| Auth | Supabase Auth | Email/password + OAuth (Google, GitHub) |
| Analytics pipeline | Supabase + webhook hacia n8n | n8n orquesta el agente IA que analiza informes |
| Gráficos | Recharts o Chart.js | Para dashboards y reportes visuales |
| Animaciones | Framer Motion | Transiciones y micro-interacciones |

---

## Arquitectura General

```
┌──────────────────────────────────────────────────┐
│                   FRONTEND (Next.js / Vercel)                    │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐               │
│  │ Productivi-│  │ Actividades│  │  Dashboard   │               │
│  │ dad Tools  │  │ de Atención│  │  & Reportes  │               │
│  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘               │
│        │               │                │                        │
│  ┌─────▼───────────────▼────────────────▼───────┐               │
│  │         EVENT CAPTURE ENGINE                  │               │
│  │  (clicks, scrolls, focus/blur, idle time,     │               │
│  │   keystroke cadence, task switches, etc.)      │               │
│  └──────────────────────┬───────────────────────┘               │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────┐
│              SUPABASE (Backend)                               │
│                                                                │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐               │
│  │   Auth   │  │ PostgreSQL│  │  Edge Fns    │               │
│  │          │  │ (eventos, │  │  (procesar   │               │
│  │          │  │  usuarios, │  │   reportes)  │               │
│  │          │  │  sesiones) │  │              │               │
│  └──────────┘  └─────┬─────┘  └──────┬───────┘               │
│                      │               │                        │
│                      ▼               ▼                        │
│              ┌───────────────────────────┐                    │
│              │  Webhook / DB Trigger     │                    │
│              └────────────┬──────────────┘                    │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────┐
│              n8n (Orquestación IA)                             │
│                                                                │
│  1. Recibe webhook con reporte del usuario                    │
│  2. Agente IA analiza patrones de atención                    │
│  3. Genera insights y recomendaciones                         │
│  4. Devuelve análisis a Supabase vía API                      │
│  5. Frontend muestra resultados al usuario                    │
└──────────────────────────────────────────────────┘
```

---

## Estructura de Carpetas

```
focuslab/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Home / Overview
│   │   │   ├── tools/
│   │   │   │   ├── pomodoro/page.tsx
│   │   │   │   ├── tasks/page.tsx
│   │   │   │   ├── habits/page.tsx
│   │   │   │   └── calendar/page.tsx
│   │   │   ├── activities/
│   │   │   │   ├── page.tsx                # Lista de actividades
│   │   │   │   ├── reaction-test/page.tsx
│   │   │   │   ├── focus-flow/page.tsx
│   │   │   │   ├── memory-matrix/page.tsx
│   │   │   │   ├── word-sprint/page.tsx
│   │   │   │   ├── pattern-hunt/page.tsx
│   │   │   │   └── deep-read/page.tsx
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx                # Lista de reportes
│   │   │   │   └── [id]/page.tsx           # Detalle de reporte
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── events/route.ts             # Ingesta de eventos
│   │   │   ├── reports/
│   │   │   │   ├── generate/route.ts       # Generar reporte
│   │   │   │   └── webhook/route.ts        # Callback de n8n
│   │   │   └── auth/callback/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                        # Landing page
│   ├── components/
│   │   ├── ui/                             # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── tools/
│   │   │   ├── PomodoroTimer.tsx
│   │   │   ├── TaskBoard.tsx
│   │   │   ├── HabitTracker.tsx
│   │   │   └── WeeklyCalendar.tsx
│   │   ├── activities/
│   │   │   ├── ReactionTest.tsx
│   │   │   ├── FocusFlow.tsx
│   │   │   ├── MemoryMatrix.tsx
│   │   │   ├── WordSprint.tsx
│   │   │   ├── PatternHunt.tsx
│   │   │   └── DeepRead.tsx
│   │   ├── reports/
│   │   │   ├── AttentionChart.tsx
│   │   │   ├── ReportCard.tsx
│   │   │   └── InsightPanel.tsx
│   │   └── tracking/
│   │       └── EventCapture.tsx            # Provider global de captura
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                   # Browser client
│   │   │   ├── server.ts                   # Server client
│   │   │   └── middleware.ts
│   │   ├── tracking/
│   │   │   ├── collector.ts                # Recolecta eventos en buffer
│   │   │   ├── processors.ts              # Calcula métricas derivadas
│   │   │   └── types.ts
│   │   ├── store/
│   │   │   ├── useAuthStore.ts
│   │   │   ├── usePomodoroStore.ts
│   │   │   ├── useTaskStore.ts
│   │   │   └── useActivityStore.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useEventTracker.ts
│   │   ├── usePomodoro.ts
│   │   ├── useIdleDetection.ts
│   │   └── useFocusMetrics.ts
│   └── types/
│       ├── events.ts
│       ├── activities.ts
│       └── reports.ts
├── supabase/
│   └── migrations/
│       ├── 001_users_profiles.sql
│       ├── 002_events.sql
│       ├── 003_sessions.sql
│       ├── 004_activities_results.sql
│       ├── 005_tasks_and_tools.sql
│       ├── 006_reports.sql
│       └── 007_rls_policies.sql
├── public/
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.local.example
```

---

## Modelo de Base de Datos (Supabase / PostgreSQL)

Crea las siguientes migraciones SQL en orden:

### 001 — Perfiles de Usuario

```sql
-- Extiende la tabla auth.users de Supabase
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  university TEXT,
  career TEXT,
  semester INTEGER,
  birth_date DATE,
  timezone TEXT DEFAULT 'America/Guatemala',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 002 — Eventos de Interacción

```sql
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
```

### 003 — Sesiones

```sql
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
```

### 004 — Resultados de Actividades

```sql
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
```

### 005 — Tareas y Herramientas

```sql
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
```

### 006 — Reportes

```sql
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
```

### 007 — RLS Policies

```sql
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
```

---

## Sistema de Captura de Eventos

### Event Collector (`lib/tracking/collector.ts`)

Implementa un collector que:
1. Usa un **buffer en memoria** que acumula eventos (max 50 o cada 10 segundos)
2. Envía los eventos en **batch** al endpoint `/api/events` mediante `navigator.sendBeacon` o `fetch`
3. Usa `sendBeacon` en el evento `beforeunload` para no perder datos al cerrar
4. Cada evento tiene la estructura:

```typescript
interface TrackingEvent {
  event_type: string;
  category: EventCategory;
  page: string;
  target?: string;
  metadata?: Record<string, any>;
  timestamp: string; // ISO 8601
}
```

### Eventos a Capturar

| Categoría | Evento | Metadata |
|-----------|--------|----------|
| navigation | `page_view` | `{ from, to, duration_on_page }` |
| interaction | `click` | `{ target_label, target_type, coordinates }` |
| interaction | `scroll` | `{ depth_percent, direction, velocity }` |
| focus | `tab_focus` | `{ was_hidden_for_ms }` |
| focus | `tab_blur` | `{ page, active_element }` |
| idle | `idle_start` | `{ last_active_element }` |
| idle | `idle_end` | `{ idle_duration_ms }` |
| tool_usage | `pomodoro_start` | `{ duration, task_id }` |
| tool_usage | `pomodoro_complete` | `{ interruptions, focus_rating }` |
| tool_usage | `pomodoro_interrupt` | `{ elapsed_seconds, reason }` |
| tool_usage | `task_created` | `{ priority, estimated_pomodoros }` |
| tool_usage | `task_completed` | `{ actual_time, was_on_time }` |
| activity | `activity_start` | `{ activity_type }` |
| activity | `activity_response` | `{ reaction_time_ms, correct, attempt }` |
| activity | `activity_complete` | `{ score, duration, metrics }` |
| session | `session_start` | `{ device_info, screen_size }` |
| session | `session_end` | `{ total_duration, pages_visited }` |

### EventCapture Provider (`components/tracking/EventCapture.tsx`)

Crea un React Context Provider que envuelva toda la app dentro del dashboard layout. Este provider:
- Inicia el collector al montar
- Registra listeners globales (clicks, scrolls, focus, blur, visibility change)
- Detecta idle (30 segundos sin actividad)
- Expone un hook `useEventTracker()` para emitir eventos custom desde cualquier componente
- Se limpia en unmount

---

## Herramientas de Productividad

### 1. Pomodoro Timer (`/tools/pomodoro`)

**Funcionalidades:**
- Timer visual circular con animación de progreso (ring SVG animado)
- Modos: Focus (25 min), Short Break (5 min), Long Break (15 min) — todos configurables
- Auto-start del break al completar un pomodoro
- Contador de pomodoros completados en el día
- Vinculación opcional con una tarea
- Al completar, pedir rating de enfoque (1-5 estrellas) con animación
- Sonido sutil de notificación (Web Audio API, no archivos de audio)
- Estadísticas del día: pomodoros completados, tiempo total de enfoque, racha
- **Tracking**: capturar inicio, pausas, interrupciones, completado y rating

**UI**: Diseño minimalista centrado. Fondo oscuro con el timer como protagonista. Gradiente púrpura-azul en el ring de progreso. Botones grandes touch-friendly.

### 2. Gestión de Tareas (`/tools/tasks`)

**Funcionalidades:**
- Vista Kanban con columnas: To Do, In Progress, Done
- Drag & drop entre columnas (usar @dnd-kit/core)
- Crear tarea con: título, descripción, prioridad (color-coded), fecha límite, pomodoros estimados, tags
- Filtros por prioridad, tag, fecha
- Progreso visual de pomodoros (barra con segmentos)
- Quick actions: marcar completada, iniciar pomodoro vinculado
- **Tracking**: capturar creación, movimientos entre columnas, tiempo en cada estado, completado

**UI**: Cards con bordes de color según prioridad. Efecto glassmorphism en las columnas. Badge animado al completar.

### 3. Habit Tracker (`/tools/habits`)

**Funcionalidades:**
- Grid de hábitos con el mes actual (estilo GitHub contributions)
- Crear hábito con nombre, ícono (emoji picker), color, frecuencia
- Check diario con animación de confetti (canvas-confetti)
- Racha actual y mejor racha
- Porcentaje de cumplimiento mensual
- **Tracking**: capturar checks y patrones de consistencia

**UI**: Cuadrícula con colores vibrantes. Iconos grandes. Animación satisfactoria al marcar completado.

### 4. Calendario Semanal (`/tools/calendar`)

**Funcionalidades:**
- Vista de semana con bloques de tiempo
- Visualización de pomodoros programados y completados
- Drag para crear bloques de estudio
- Integración visual con tareas (mostrar deadlines)
- Resumen semanal de horas de enfoque
- **Tracking**: capturar creación y cumplimiento de bloques

---

## Actividades de Atención

Cada actividad debe ser visualmente atractiva, sentirse como un mini-juego y generar métricas específicas de atención.

### 1. Reaction Test (`/activities/reaction-test`)

**Objetivo**: Medir tiempo de reacción y atención sostenida.

**Mecánica**:
- Pantalla muestra un color de fondo que cambia de rojo a verde en intervalos aleatorios (2-7 segundos)
- El usuario debe hacer click/tap lo más rápido posible al ver verde
- Si hace click en rojo: penalización visual y registro de impulsividad
- 20 rondas con intervalos variables
- Variante avanzada: aparecen formas de colores, solo responder a una combinación específica (go/no-go task)

**Métricas**:
```json
{
  "avg_reaction_time_ms": 287,
  "min_reaction_time_ms": 198,
  "max_reaction_time_ms": 456,
  "false_starts": 2,
  "missed_signals": 0,
  "consistency_score": 85.4,
  "fatigue_trend": [280, 275, 290, 310, 340],
  "reaction_times": [...]
}
```

**UI**: Fondo que transiciona suavemente. Feedback visual inmediato (ripple effect). Resultado final con gráfico de barras de los tiempos.

### 2. Focus Flow (`/activities/focus-flow`)

**Objetivo**: Medir atención sostenida y capacidad de concentración continua.

**Mecánica**:
- Un objeto (partícula brillante) se mueve por la pantalla siguiendo una trayectoria suave
- El usuario debe mantener el cursor/dedo sobre el objeto mientras se mueve
- Si se aleja demasiado, un indicador visual muestra "desenfoque"
- Duración: 2 minutos
- La velocidad y complejidad del movimiento aumentan progresivamente
- Distractores visuales aparecen en la periferia (pop-ups sutiles, movimientos)

**Métricas**:
```json
{
  "total_tracking_time_ms": 120000,
  "time_on_target_ms": 98000,
  "time_off_target_ms": 22000,
  "accuracy_percent": 81.6,
  "longest_focus_streak_ms": 34000,
  "distraction_responses": 3,
  "performance_over_time": [90, 85, 78, 72, 80]
}
```

**UI**: Fondo oscuro con partícula neón que deja trail. Bordes de la zona de seguimiento con glow. Distractores con colores llamativos pero periféricos.

### 3. Memory Matrix (`/activities/memory-matrix`)

**Objetivo**: Medir memoria de trabajo y capacidad de retención a corto plazo.

**Mecánica**:
- Grid de NxN (empieza 3x3, escala hasta 7x7)
- Se iluminan celdas aleatorias por 3 segundos
- El usuario debe reproducir el patrón haciendo click en las celdas correctas
- Niveles progresivos: más celdas y patrones más complejos
- Cada nivel tiene 3 intentos

**Métricas**:
```json
{
  "max_level_reached": 5,
  "accuracy_per_level": [100, 100, 85, 70, 50],
  "avg_response_time_per_cell_ms": 890,
  "working_memory_span": 5,
  "error_patterns": "edge_bias",
  "total_correct": 28,
  "total_attempts": 35
}
```

**UI**: Grid con efecto neon-glow al iluminar celdas. Animación de "pulso" al seleccionar. Transiciones suaves entre niveles. Colores cyberpunk.

### 4. Word Sprint (`/activities/word-sprint`)

**Objetivo**: Medir velocidad de procesamiento cognitivo y atención selectiva.

**Mecánica**:
- Palabras aparecen una por una en pantalla a velocidad creciente
- Hay dos categorías (ej: "Animal" vs "No Animal")
- El usuario debe clasificar cada palabra con tecla izquierda/derecha o swipe
- Duración: 60 segundos
- Las palabras incluyen trampas semánticas (ej: "tiger" fácil, "catfish" trampa)

**Métricas**:
```json
{
  "total_words": 45,
  "correct": 38,
  "incorrect": 5,
  "missed": 2,
  "accuracy_percent": 84.4,
  "avg_decision_time_ms": 780,
  "stroop_effect_detected": true,
  "speed_accuracy_tradeoff": 0.72,
  "performance_by_difficulty": { "easy": 95, "medium": 82, "hard": 68 }
}
```

**UI**: Palabra grande centrada con tipografía bold. Dos zonas laterales color-coded. Animación de la palabra entrando/saliendo. Streak counter con flames animation.

### 5. Pattern Hunt (`/activities/pattern-hunt`)

**Objetivo**: Medir atención visual y detección de patrones.

**Mecánica**:
- Grid de símbolos/formas donde el usuario debe encontrar el patrón que no coincide (odd-one-out)
- Cada nivel: encontrar N elementos diferentes en el grid
- Timer por nivel (15 segundos)
- Los patrones se vuelven más sutiles progresivamente (cambios de tamaño, rotación, tono de color)

**Métricas**:
```json
{
  "levels_completed": 12,
  "avg_detection_time_ms": 4200,
  "accuracy_percent": 91.6,
  "visual_search_efficiency": 0.85,
  "difficulty_threshold": "subtle_color",
  "false_positives": 1,
  "pattern_types_mastered": ["shape", "size", "rotation"]
}
```

**UI**: Grid limpio con formas geométricas coloridas. Highlight animado al encontrar el diferente. Progress bar con niveles. Palette de colores vibrantes.

### 6. Deep Read (`/activities/deep-read`)

**Objetivo**: Medir comprensión lectora y atención durante la lectura.

**Mecánica**:
- Presenta un texto corto (200-400 palabras) sobre un tema interesante para universitarios (tecnología, ciencia, cultura pop)
- Tracking detallado del scroll, tiempo por párrafo, re-lecturas
- Al terminar, 5 preguntas de comprensión (mezcla de detalle y comprensión general)
- Variante: texto con palabras que cambian sutilmente si no se lee con atención

**Métricas**:
```json
{
  "total_reading_time_ms": 95000,
  "time_per_paragraph_ms": [12000, 18000, 15000, 22000, 28000],
  "re_reads": 2,
  "scroll_speed_avg": 45,
  "comprehension_score": 80,
  "detail_questions_correct": 3,
  "inference_questions_correct": 1,
  "reading_pattern": "linear_with_rereads"
}
```

**UI**: Texto con tipografía legible, modo lectura (fondo ligeramente más cálido). Indicador sutil de progreso. Quiz con cards animadas.

---

## Dashboard Principal (`/dashboard`)

La página principal del dashboard muestra:

1. **Greeting personalizado** con hora del día y nombre
2. **Focus Score** del día (0-100) en un gauge/meter animado
3. **Quick Stats**: pomodoros hoy, tareas completadas, racha de hábitos
4. **Timeline de hoy**: actividad reciente en formato timeline vertical
5. **Siguiente tarea sugerida** basada en prioridad y deadline
6. **Widget de streak**: días consecutivos de uso
7. **Mini chart**: tendencia de focus score últimos 7 días (sparkline)
8. **Accesos rápidos**: botones para iniciar pomodoro, nueva tarea, actividad rápida

**Layout**: Grid responsive. Cards con glassmorphism. Colores oscuros con acentos neón (púrpura, cyan, verde lima). Micro-animaciones al cargar datos.

---

## Generación de Reportes e Integración con n8n

### Endpoint: `/api/reports/generate` (POST)

1. Recibe `user_id` y rango de fechas
2. Agrega datos del período:
   - Total de eventos por categoría
   - Distribución de tiempo por herramienta/actividad
   - Patrones de uso (horas pico, días más activos)
   - Resultados de actividades de atención
   - Estadísticas de pomodoro (completados vs interrumpidos)
   - Métricas de tareas (velocidad de completado, procrastinación)
   - Hábitos (consistencia)
3. Crea registro en tabla `reports` con estado 'pending'
4. Envía webhook a n8n con el `report_id` y `raw_data`

### Estructura del payload para n8n:

```json
{
  "report_id": 42,
  "user_id": "uuid-here",
  "period": { "start": "2025-03-01", "end": "2025-03-15" },
  "user_profile": {
    "university": "USAC",
    "career": "Ingeniería en Sistemas",
    "semester": 6
  },
  "summary": {
    "total_sessions": 23,
    "total_focus_time_minutes": 780,
    "total_events": 12450,
    "active_days": 12,
    "avg_session_duration_minutes": 45
  },
  "attention_metrics": {
    "avg_reaction_time_ms": 305,
    "sustained_attention_score": 72.5,
    "working_memory_span": 5,
    "processing_speed_percentile": 68,
    "distraction_resistance": 0.78,
    "focus_consistency": 0.65
  },
  "productivity_metrics": {
    "pomodoros_completed": 45,
    "pomodoros_interrupted": 12,
    "completion_rate": 0.79,
    "avg_focus_rating": 3.8,
    "tasks_completed": 18,
    "tasks_overdue": 3,
    "habit_consistency": 0.72
  },
  "patterns": {
    "peak_focus_hours": [9, 10, 15, 16],
    "low_focus_hours": [13, 14, 22],
    "most_productive_day": "Tuesday",
    "avg_idle_time_per_session_minutes": 8,
    "tab_switches_per_hour": 12,
    "attention_fatigue_onset_minutes": 35
  },
  "activity_history": [...]
}
```

### Endpoint: `/api/reports/webhook` (POST)

Callback de n8n que recibe:

```json
{
  "report_id": 42,
  "status": "completed",
  "ai_analysis": {
    "attention_profile": "Focused Sprinter",
    "summary": "Texto descriptivo del análisis...",
    "strengths": ["Alta velocidad de reacción", "Buena memoria de trabajo"],
    "areas_to_improve": ["Atención sostenida después de 30 min", "Consistencia en hábitos"],
    "patterns_detected": [
      "Pico de rendimiento entre 9-11 AM",
      "Fatiga cognitiva notable después de almuerzos",
      "Tendencia a procrastinar tareas de alta prioridad"
    ],
    "recommendations": [
      "Programar tareas complejas entre 9-11 AM",
      "Hacer breaks activos después del almuerzo",
      "Usar técnica de 2-minute rule para tareas urgentes"
    ],
    "risk_indicators": {
      "burnout_risk": "low",
      "attention_deficit_indicators": "none",
      "stress_patterns": "moderate_exam_period"
    }
  }
}
```

Actualiza el reporte en Supabase con el análisis de la IA.

---

## UI/UX — Guías de Diseño

### Paleta de Colores

```css
:root {
  /* Fondo */
  --bg-primary: #0F0F1A;
  --bg-secondary: #1A1A2E;
  --bg-card: rgba(26, 26, 46, 0.7);

  /* Acentos */
  --accent-purple: #8B5CF6;
  --accent-cyan: #06B6D4;
  --accent-lime: #84CC16;
  --accent-pink: #EC4899;
  --accent-orange: #F59E0B;

  /* Gradientes */
  --gradient-primary: linear-gradient(135deg, #8B5CF6, #06B6D4);
  --gradient-warm: linear-gradient(135deg, #EC4899, #F59E0B);
  --gradient-cool: linear-gradient(135deg, #06B6D4, #84CC16);

  /* Texto */
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #475569;

  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 16px;
}
```

### Principios de UI

1. **Dark mode first**: fondo oscuro profundo, elementos que "flotan" con sombras sutiles
2. **Glassmorphism**: cards con transparencia, blur y bordes semi-transparentes
3. **Gradientes neón**: acentos en gradientes vibrantes, especialmente en elementos interactivos
4. **Micro-animaciones**: todo transiciona suavemente (Framer Motion). Hover effects, loading states, celebrations
5. **Tipografía**: Inter o Geist como font principal. Títulos en bold, cuerpo en regular
6. **Spacing generoso**: no apretar elementos. Dejar respirar
7. **Mobile-first**: diseño responsive. Touch targets mínimo 44px
8. **Gamificación visual**: XP, streaks, badges, progress bars con animaciones satisfactorias
9. **Feedback inmediato**: toda acción del usuario tiene respuesta visual

### Componentes de Layout

- **Sidebar** (desktop): colapsable, iconos con labels, indicador de página activa con glow
- **Bottom Navigation** (mobile): 5 items max (Home, Tools, Activities, Reports, Profile)
- **TopBar**: search, notificaciones, avatar con dropdown
- **Cards**: bordes con gradiente sutil, sombra con color del acento, hover lift effect

---

## Variables de Entorno

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/focuslab-report
N8N_WEBHOOK_SECRET=your-shared-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Instrucciones de Implementación

Construye el proyecto en este orden:

### Fase 1 — Fundación
1. Inicializa el proyecto Next.js con TypeScript y Tailwind
2. Instala dependencias: `@supabase/supabase-js`, `@supabase/ssr`, `zustand`, `framer-motion`, `recharts`, `lucide-react`, `@dnd-kit/core`, `@dnd-kit/sortable`
3. Configura shadcn/ui con tema oscuro customizado
4. Configura Supabase client (browser + server)
5. Implementa autenticación (register, login, logout, middleware de protección)
6. Crea el layout del dashboard con Sidebar y TopBar
7. Ejecuta las migraciones SQL en Supabase

### Fase 2 — Event Capture Engine
8. Implementa el Event Collector con buffer y batch sending
9. Crea el EventCapture Provider
10. Implementa el hook `useEventTracker`
11. Crea el endpoint `/api/events` para recibir batches
12. Implementa gestión de sesiones (inicio, fin, heartbeat)

### Fase 3 — Herramientas de Productividad
13. Pomodoro Timer completo con tracking
14. Task Manager con Kanban y drag & drop
15. Habit Tracker con grid mensual
16. Calendario semanal

### Fase 4 — Actividades de Atención
17. Reaction Test
18. Focus Flow
19. Memory Matrix
20. Word Sprint
21. Pattern Hunt
22. Deep Read

### Fase 5 — Dashboard y Reportes
23. Dashboard principal con widgets y stats
24. Página de reportes con listado
25. Endpoint de generación de reportes
26. Endpoint webhook para n8n
27. Visualización de reportes con análisis IA

### Fase 6 — Polish
28. Animaciones y transiciones
29. Responsive design
30. Loading states y skeleton screens
31. Error handling y empty states
32. Optimización de performance (React.memo, useMemo, virtualización si necesario)

---

## Reglas para el Desarrollo

- Usa TypeScript estricto en todo el proyecto
- Cada componente en su propio archivo
- Hooks custom para lógica reutilizable
- Validación con Zod en los endpoints API
- Manejo de errores consistente con try/catch y mensajes amigables
- Comentarios en español para mantener contexto del proyecto
- Commits atómicos y descriptivos
- No uses `any` en TypeScript, define tipos explícitos
- Usa `server components` de Next.js donde sea posible, `'use client'` solo cuando se necesiten hooks o interactividad del browser
- Las actividades deben ser divertidas y visualmente impactantes, no aburridas ni clínicas
