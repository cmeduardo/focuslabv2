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
