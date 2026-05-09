# FocusLab — Instrucciones del Proyecto

## Qué es este proyecto
FocusLab es una web app para medir y analizar patrones de atención de
usuarios universitarios (18-25 años). Combina herramientas de productividad
con actividades cognitivas tipo mini-juego. Los datos se analizan mediante
un agente IA orquestado por n8n.

## Stack
- Frontend: Next.js 14+ (App Router), React 18+, TypeScript
- Estilos: Tailwind CSS + shadcn/ui (tema oscuro, acentos neón)
- Estado: Zustand
- Backend: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- Gráficos: Recharts
- Animaciones: Framer Motion
- Deploy: Vercel

## Reglas de código
- TypeScript estricto, nunca usar `any`
- Comentarios en español
- Componentes funcionales con hooks, nunca class components
- Un componente por archivo
- Usar server components donde sea posible, `'use client'` solo cuando
  se necesiten hooks o interactividad del browser
- Validar inputs con Zod en API routes
- Manejo de errores con try/catch y mensajes amigables al usuario
- Nombrar archivos en PascalCase para componentes, camelCase para utils

## Estructura de carpetas
- `src/app/` — Pages y API routes (App Router)
- `src/components/` — Componentes React organizados por dominio
- `src/lib/` — Utilidades, clientes Supabase, stores Zustand
- `src/hooks/` — Custom hooks
- `src/types/` — TypeScript types e interfaces
- `supabase/migrations/` — Migraciones SQL numeradas

## Estilo visual
- Dark mode por defecto (#0F0F1A fondo)
- Glassmorphism en cards
- Gradientes neón (púrpura #8B5CF6, cyan #06B6D4, lima #84CC16)
- Micro-animaciones con Framer Motion
- Mobile-first, responsive

## Comandos
- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run lint` — linter

## Estado actual
- Fases 1-4 completadas (fundación, event capture, tools, actividades)
- Supabase conectado y funcionando con trigger handle_new_user
- Todas las tablas creadas con RLS habilitado
- Bug de persistencia corregido: stores ahora guardan datos en Supabase
- Migración 008_calendar_blocks.sql pendiente de ejecutar en Supabase

## Decisiones técnicas ya implementadas
- Los stores de Zustand usan patrón "optimistic updates":
  la UI responde inmediatamente y Supabase se sincroniza en
  segundo plano. Si falla, se hace rollback del estado local.
- Fuente de verdad: Supabase. Zustand es solo caché local.
- Cada store obtiene user_id de useAuthStore.getState().user
- useAuthStore se inicializa en el cliente via AuthInitializer
  (src/components/auth/AuthInitializer.tsx) montado en el layout
- Cada página hace fetch desde Supabase al montar (useEffect)
- Los nombres en DB son snake_case, en frontend camelCase.
  Hay funciones mapper (ej: rowToTask) para la conversión.
- IDs en DB son BIGINT; en frontend se convierten a String()
  para que los tipos sean consistentes con el resto del sistema.
- task_status en DB: 'pending'/'in_progress'/'completed'/'cancelled'
  En frontend: 'todo'/'in_progress'/'done'. Mapeo via statusToDb/statusFromDb
  en useTaskStore.
- habit_logs usa columna `completed_at` (no `date`) para las fechas.
- pomodoro_sessions usa `ended_at` (no `completed_at`) y campo `completed boolean`.
- PomodoroTimer carga tareas con fetchTasks al montar para
  el selector de vinculación
- saveSession() en usePomodoroStore persiste en
  pomodoro_sessions y llama incrementPomodoro en la tarea
- WeeklyCalendar usa useCalendarStore con persistencia en Supabase
  (tabla calendar_blocks). Carga bloques de la semana visible con fetchBlocks.

## Archivos clave modificados
- src/components/auth/AuthInitializer.tsx — nuevo, inicializa useAuthStore
- src/app/(dashboard)/layout.tsx — incluye AuthInitializer
- src/lib/store/useAuthStore.ts — store de auth (user, profile, loading)
- src/lib/store/useTaskStore.ts — CRUD async + mapeo de status enums
- src/lib/store/useHabitStore.ts — CRUD habits + habit_logs
- src/lib/store/usePomodoroStore.ts — saveSession corregido
- src/lib/store/useCalendarStore.ts — nuevo, CRUD bloques de calendario
- src/components/tools/TaskBoard.tsx — fetch al montar
- src/components/tools/HabitTracker.tsx — migrado a useHabitStore
- src/components/tools/PomodoroTimer.tsx — saveSession + fetchTasks
- src/components/tools/WeeklyCalendar.tsx — migrado a useCalendarStore
- supabase/migrations/008_calendar_blocks.sql — nueva tabla (ejecutar en Supabase)
