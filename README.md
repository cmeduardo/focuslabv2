# FocusLab

Aplicación web de tesis (Ingeniería en Sistemas de Información, UMG) que
mide y analiza patrones de atención en jóvenes universitarios mediante
actividades cognitivas gamificadas y herramientas de productividad. No
realiza diagnóstico clínico.

Arquitectura, módulos, rutas y modelo de datos: ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Empezar

```bash
npm install
cp .env.local.example .env.local   # completar con las credenciales de Supabase
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Base de datos

El esquema de Supabase (tablas, políticas RLS, vistas agregadas para Power
BI) vive en [`supabase/migrations/`](./supabase/migrations). Para
aplicarlo a tu proyecto de Supabase, pega cada archivo en el SQL Editor en
orden (o usa `supabase db push` si enlazas el proyecto con el CLI).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui ·
Supabase (PostgreSQL + Auth + RLS) · Vercel.
