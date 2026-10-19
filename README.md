# FocusLab

Aplicación web desarrollada como proyecto de tesis (Ingeniería en Sistemas
de Información, UMG). Registra cómo se desempeñan jóvenes universitarios
en actividades cognitivas breves y cómo usan herramientas de
productividad. Con esos datos genera, para cada participante, un informe
descriptivo de su perfil atencional.

**No es un instrumento clínico.** No diagnostica, no usa terminología
médica y sus métricas no están normadas: describen el desempeño de una
persona en una sesión, sin compararla con una población.

## El problema

Los estudiantes universitarios trabajan rodeados de interrupciones
(notificaciones, cambios de pestaña, multitarea) y suelen tener poca
información concreta sobre cómo responde su atención. FocusLab busca
ofrecer esa información en un formato accesible y, para el investigador,
reunir datos de desempeño y de comportamiento de un mismo grupo de
participantes, para explorar si se relacionan.

## Qué incluye

**Seis actividades**, cada una basada en un paradigma de psicología
cognitiva:

| Actividad | Paradigma | Qué mide |
|---|---|---|
| Reaction Test | Psychomotor Vigilance Task | Alerta: tiempo de reacción y su variabilidad |
| Focus Flow | SART | Atención sostenida: veces que se responde cuando había que frenar |
| Memory Matrix | Bloques de Corsi | Memoria de trabajo visoespacial: longitud de secuencia |
| Word Sprint | Stroop | Atención selectiva e inhibición: precisión e interferencia |
| Pattern Hunt | Búsqueda visual | Atención selectiva visual: tiempo de detección |
| Deep Read | Lectura con notificaciones simuladas | Comprensión de lectura bajo distracción |

Cada una tiene instrucciones, una práctica que no se guarda y una ronda
registrada de 2 a 4 minutos. Funcionan en computadora y en celular, y
registran el tipo de dispositivo, porque los tiempos de reacción no son
comparables entre ambos.

**Cuatro herramientas**: Pomodoro, Kanban, Hábitos y Calendario. Además de
su función normal, registran cómo se usan (interrupciones, pausas,
latencia para retomar).

**Informe de IA.** Al terminar la sesión, la app envía un resumen de los
resultados a un flujo de n8n que le pide a `gpt-4o-mini` un informe con
perfil, fortalezas, áreas de mejora y recomendaciones.

**Panel del investigador**: datos agregados, avance por participante,
reporte imprimible del taller, análisis exploratorio y exportación CSV
seudonimizada. Hay también un rol de autoridad académica que solo ve
datos agregados.

## Tecnologías y arquitectura

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui · Supabase (PostgreSQL, Auth, Row Level Security) · n8n Cloud +
OpenAI · Vercel · Vitest y Playwright.

```
Navegador ──> Next.js en Vercel ──> Supabase (Postgres + Auth + RLS)
                    │   ▲
                    ▼   │ callback con secreto compartido
               n8n Cloud ──> OpenAI
Power BI ──> Supabase (rol de solo lectura, vistas seudonimizadas)
```

El código se separa en presentación (`src/app`, `src/components`), lógica
de negocio (`src/lib/services`, con las métricas como funciones puras en
`src/lib/activities` y `src/lib/analysis`) y acceso a datos
(`src/lib/supabase`). Cada tabla tiene políticas RLS: un participante
solo puede leer y escribir sus propios datos.

Más detalle en [`ARCHITECTURE.md`](./ARCHITECTURE.md). Las decisiones de
diseño están en [`docs/decisiones_tecnicas.md`](./docs/decisiones_tecnicas.md)
y el estado del proyecto en [`docs/estado_proyecto.md`](./docs/estado_proyecto.md).

## Instalación

Requisitos: Node.js 20 o superior y un proyecto de Supabase.

```bash
npm install
cp .env.local.example .env.local   # completar los valores
npm run dev                        # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm test` | Pruebas unitarias |
| `npm run test:e2e` | Pruebas de punta a punta |
| `npm run demo:seed -- 20` / `npm run demo:purge` | Crea o borra participantes ficticios (`@demo.focuslab.test`) |

## Configuración

### Variables de entorno

En `.env.local` (no se sube a git) y, para producción, en el proyecto de
Vercel:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública; todo lo que se hace con ella pasa por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo en el servidor (webhook de retorno, reintentos, scripts) |
| `N8N_AI_REPORT_WEBHOOK_URL` | Webhook de n8n. Sin ella, los informes quedan `pendiente` |
| `AI_REPORT_WEBHOOK_SECRET` | Secreto compartido con n8n para el webhook de retorno |

### Supabase

1. Pegar [`supabase/migrations/20261019000000_esquema.sql`](./supabase/migrations/20261019000000_esquema.sql) en el SQL Editor
   de un proyecto nuevo. Crea tipos, tablas, funciones, políticas RLS,
   vistas de análisis, el rol `lector_powerbi` y los permisos. Un cambio de
   esquema posterior va en una migración nueva.
2. En *Authentication → URL Configuration*, poner como Site URL y URL de
   redirección el dominio donde corre la app. Con la confirmación de
   correo activada, la plantilla de *Confirm signup* debe apuntar a
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
3. En *Authentication → Sign In / Providers → Email*, largo mínimo de
   contraseña 10 y los cuatro tipos de carácter (los mismos requisitos que
   valida el formulario).
4. Toda cuenta nueva es `participante`. Para asignar otro rol, en el SQL
   Editor:

   ```sql
   update public.perfiles set rol = 'investigador'
   where id = (select id from auth.users where email = 'correo@ejemplo.com');
   ```

### n8n

El flujo tiene cinco nodos: Webhook → Construir prompt → Generar informe
con OpenAI → Procesar respuesta → Callback a Next.js (detalle en
`ARCHITECTURE.md` §9). El código del nodo «Construir prompt» está en
[`docs/n8n/construir-prompt-v2.js`](./docs/n8n/construir-prompt-v2.js).
Hay que crear una credencial de OpenAI y una *Header Auth* llamada
`X-Webhook-Secret` con el valor de `AI_REPORT_WEBHOOK_SECRET`. La URL de
retorno no se configura en n8n: la app la envía en cada solicitud. Al
activar el flujo, su URL de producción va en `N8N_AI_REPORT_WEBHOOK_URL`.

### Power BI (opcional)

Los tableros se conectan a Supabase con un rol de solo lectura que solo
ve vistas seudonimizadas. Pasos en [`docs/power_bi.md`](./docs/power_bi.md).

## Pruebas

```bash
npm test            # Vitest: métricas de actividades, informes, análisis, seguridad
npm run test:e2e    # Playwright: Desktop Chrome, Pixel 7 e iPhone 13
```

Las pruebas E2E levantan su propio servidor en el puerto 3100, leen
`.env.local` y **crean usuarios reales** (`@focuslab.test`) en el proyecto
de Supabase configurado. Los borran al terminar, pero conviene correrlas
contra un proyecto de desarrollo.

## Limitaciones conocidas

- Las métricas son descriptivas y no están normadas; no permiten
  clasificar a una persona ni compararla con una población.
- El taller piloto tuvo una muestra pequeña. Las correlaciones del panel de
  análisis son exploratorias.
- Los tiempos de reacción en pantallas táctiles son más lentos que con
  mouse o teclado. Por eso se analizan por tipo de dispositivo, y el
  umbral de lapso (500 ms) viene de estudios de laboratorio.
- La calidad del informe depende del modelo de lenguaje. Para Focus Flow
  hubo que calcular la interpretación antes de enviarla al modelo, porque
  el modelo la contradecía.
- Los informes que no regresan de n8n no se reintentan solos; el
  investigador los reintenta desde el panel.

La lista completa está en [`docs/estado_proyecto.md`](./docs/estado_proyecto.md).
