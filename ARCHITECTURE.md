# FocusLab — Arquitectura

Documento vivo: se actualiza en cada sprint. Sirve como base directa para los
diagramas UML del Capítulo 5 de la tesis (casos de uso, secuencia,
componentes, clases, entidad-relación, infraestructura).

## 1. Contexto

FocusLab mide y analiza patrones de atención en jóvenes universitarios
mediante actividades cognitivas gamificadas y herramientas de productividad,
y usa un agente de IA para generar informes de perfil atencional
personalizados. La aplicación **no realiza diagnóstico clínico**: no usa
terminología médica ni genera etiquetas clínicas.

## 2. Desviación respecto al stack original

El prompt del proyecto fija Next.js 14 como stack obligatorio ("no cambiar").
El 2026-08-23, durante el propio Sprint 0, se decidió explícitamente usar
**Next.js 16** en su lugar (App Router, React 19.2, Tailwind CSS v4,
Turbopack). Motivo: decisión del autor de la tesis, documentada aquí para
que el Capítulo 5 sea consistente con el código.

Implicaciones técnicas relevantes de Next.js 16 (vs. 14) que afectan al
código de este repositorio:

- **APIs de request asíncronas**: `cookies()`, `headers()`, `params` y
  `searchParams` son siempre `Promise` (ver `src/lib/supabase/server.ts` y
  las páginas dinámicas bajo `informes/[sessionId]`).
- **`middleware.ts` → `proxy.ts`**: el archivo de intercepción de requests se
  llama `src/proxy.ts` y exporta una función `proxy()` (antes `middleware()`).
- **Tailwind CSS v4**: configuración basada en CSS (`src/app/globals.css`),
  sin `tailwind.config.ts`.

## 3. Capas de la arquitectura

Separación estricta presentación / lógica de negocio / acceso a datos:

```
src/
├── app/                      # Presentación: rutas (App Router), Server/Client Components
│   ├── (auth)/                #   Grupo de rutas públicas de autenticación
│   ├── (participante)/        #   Grupo de rutas protegidas del rol Participante
│   └── admin/                 #   Rutas protegidas de Investigador / Autoridad
├── components/
│   ├── ui/                    # Presentación: primitivos shadcn/ui (button, card, input, ...)
│   └── layout/                # Presentación: shells de navegación (AppShell, ComingSoon, ...)
├── lib/
│   ├── supabase/               # Acceso a datos: clientes de Supabase (browser/server/admin) + proxy
│   ├── services/                # Lógica de negocio: casos de uso sobre las tablas (Sprint 1+)
│   ├── types/database.ts        # Acceso a datos: tipos generados/mantenidos del esquema
│   └── constants/nav.ts         # Presentación: catálogo de navegación, actividades y herramientas
├── hooks/                      # Lógica de negocio (cliente): useEventTracker, etc. (Sprint 1+)
└── proxy.ts                    # Borde de red: autenticación (Supabase) en cada request
supabase/
└── migrations/                 # Acceso a datos: esquema SQL + políticas RLS + vistas agregadas
```

Regla de dependencia: `app/` (presentación) llama a `lib/services/`
(lógica de negocio), que a su vez usa `lib/supabase/` (acceso a datos). Los
Client Components nunca importan `lib/supabase/server.ts` ni
`lib/supabase/admin.ts` (marcados con `import "server-only"`).

## 4. Roles y control de acceso

| Rol | Descripción | Acceso |
|---|---|---|
| `participante` | Se registra, hace las actividades y usa las herramientas, consulta su informe. | Solo sus propios datos (RLS). |
| `investigador` | Administra el taller piloto (soy yo, único usuario con este rol). | Datos agregados/anonimizados del panel + lectura de tablas base para soporte del taller. |
| `autoridad` | Autoridades académicas. | Solo lectura de vistas agregadas y anonimizadas, sin identificadores individuales. |

Control de acceso en dos niveles:

1. **`src/proxy.ts`** (borde de red): refresca la sesión de Supabase en cada
   request y redirige a `/login` a quien no esté autenticado e intente
   entrar a una ruta no pública.
2. **Layouts de grupo de rutas** (autorización de negocio):
   `src/app/(participante)/layout.tsx` exige sesión; `src/app/admin/layout.tsx`
   además exige `role IN ('investigador', 'autoridad')` y oculta
   `/admin/participantes` (datos identificables) a `autoridad`.
3. **Row Level Security en Postgres** (última línea de defensa, ver
   `supabase/migrations/`): cada tabla filtra por `user_id = auth.uid()`,
   con una política adicional de solo lectura para `investigador`. Las
   vistas agregadas (`vw_*`) se autofiltran con `current_user_role()` y no
   exponen ninguna columna identificable.

## 5. Mapa de rutas

| Ruta | Rol | Estado | Sprint |
|---|---|---|---|
| `/` | público | Landing | 0 |
| `/login`, `/registro`, `/consentimiento` | público | Implementado | 1 |
| `/dashboard` | participante | Accesos rápidos y "Tu progreso": mejores marcas propias e historial por actividad (solo protocolo v2, sin comparar con otros) | 1, 2026-10 |
| `/actividades` | participante | Listado de las 6 actividades | 1 |
| `/actividades/{reaction-test,focus-flow,memory-matrix,word-sprint,pattern-hunt,deep-read}` | participante | Implementado | 2 |
| `/herramientas` | participante | Listado de las 4 herramientas | 1 |
| `/herramientas/{pomodoro,kanban,habitos,calendario}` | participante | Implementado | 3 |
| `/informes` | participante | Historial de informes (RF-12) | 4 |
| `/informes/[sessionId]` | participante | Detalle de informe (RF-11), auto-refresh mientras está `pendiente` | 4 |
| `/admin` | investigador, autoridad | Panel agregado sobre las vistas `vw_*` (RF-13) + exportación CSV (RF-14) | 4 |
| `/admin/participantes` | investigador | Consentimiento, avance e informes por participante; reintento de informes atascados | 4 |
| `/admin/reporte` | investigador, autoridad | Reporte agregado del taller, imprimible / "Descargar PDF" (RF-14) | 5 |
| `/admin/analisis` + 8 subrutas | investigador | Vistas del tablero de Power BI del investigador (páginas 3 a 10) en la web. Cada página valida el rol en el servidor (`requireResearcher`); cálculos puros en `src/lib/analysis/`, gráficas en SVG propio (`src/components/analysis/`) | 5 |

Endpoints de API (implementados, ver §7):

| Endpoint | Método | Rol | Sprint |
|---|---|---|---|
| `/api/sessions/[sessionId]/complete` | `POST` | participante | 4 |
| `/api/webhooks/ai-report` | `POST` | n8n (secreto compartido) | 4 |
| `/api/activity-runs/[runId]/abandon` | `POST` | participante (sendBeacon) | 5 |
| `/admin/export?dataset=dimensiones\|actividades\|eventos\|sesiones\|herramientas` | `GET` | investigador, autoridad | 4 |
| `/admin/export?dataset=participantes\|ensayos` (seudonimizados) | `GET` | investigador | 5 |

## 6. Modelo de datos (entidad-relación)

```
auth.users (Supabase Auth)
   └─ 1:1 ─ profiles (id, full_name, role)
                 ├─ 1:N ─ consents (user_id, consent_version, accepted_at)
                 ├─ 1:N ─ sessions (user_id, status, started_at, ended_at)
                 │           ├─ 1:N ─ interaction_events (session_id, user_id, event_type, payload, occurred_at)
                 │           ├─ 1:N ─ activity_runs (session_id, user_id, activity_type, protocol_version, status, contexto de dispositivo)
                 │           │           ├─ 1:N ─ activity_trials (run_id, trial_index, condition, stimulus_onset_ms, rt_ms, response, correct, input_type, valid)
                 │           │           └─ 1:0..1 ─ activity_results (run_id)
                 │           ├─ 1:N ─ activity_results (session_id, user_id, activity_type, duration_ms, accuracy, level_reached, metrics, protocol_version)
                 │           └─ 1:1 ─ ai_reports (session_id, status, attentional_profile, strengths, areas_for_improvement, recommendations, raw_response)
                 ├─ 1:N ─ pomodoro_sessions (user_id, session_id?, work_duration_minutes, break_duration_minutes, completed_cycles, interrupted, pause_count, paused_ms)
                 ├─ 1:N ─ kanban_tasks (user_id, title, status, position)
                 ├─ 1:N ─ habits (user_id, name, archived)
                 │           └─ 1:N ─ habit_logs (habit_id, user_id, log_date, completed)
                 └─ 1:N ─ calendar_events (user_id, title, start_at, end_at)
```

Vistas agregadas y anonimizadas (sin `user_id` ni ninguna otra columna
identificable), pensadas para Power BI Desktop vía el conector nativo de
PostgreSQL (RF-13, RF-14, RS-04). Desde `20261004000002` cuentan **solo
participantes y solo datos v2**, y aceptan el rol de solo lectura
`powerbi_reader` (Power BI se conecta directo a Postgres, sin
`auth.uid()`); guía completa en `docs/power_bi.md`:

- `vw_activity_results_summary` — distribución de resultados por actividad.
- `vw_interaction_events_summary` — frecuencia diaria de eventos pasivos.
- `vw_sessions_summary` — estadísticos descriptivos de sesiones por día.
- `vw_tool_usage_summary` — uso agregado de herramientas por día.
- `vw_actividades_dimensiones` — métrica principal de cada dimensión
  atencional por dispositivo (primer intento de cada participante).
- `vw_participantes_analisis` — **solo investigador / Power BI**: una fila
  por participante seudonimizado (`P-XXXXXX`) con métricas cognitivas y
  variables pasivas (H1/H2).
- `vw_ensayos_analisis` — **solo investigador / Power BI**: ensayos
  registrados con seudónimo.

El esquema completo, con todas las políticas RLS, vive en
`supabase/migrations/` (un archivo por entidad, numerado). Para aplicarlo:
pegar cada archivo en el SQL Editor de Supabase en orden, o usar
`supabase db push` si más adelante se enlaza el proyecto con el CLI.

## 7. Flujo de informe de IA (Sprint 4)

1. El participante termina su sesión → el botón **"Terminar sesión"** del
   `AppShell` (`components/layout/complete-session-button.tsx`, Server
   Action `complete-session-action.ts`) o, equivalentemente,
   `POST /api/sessions/[sessionId]/complete`.
2. Ambas entradas delegan en el mismo orquestador,
   `completeSessionAndRequestReport()` (`lib/services/ai-reports.ts`), para
   no duplicar la secuencia: marca `sessions.status = 'completada'`
   (`markSessionCompleted`, filtra por `user_id` + `status = 'en_progreso'`
   para no completar dos veces ni la sesión de otro), crea la fila en
   `ai_reports` con `status = 'pendiente'` (con el cliente `admin`: no hay
   policy de insert para participantes) y llama a
   `generateAttentionReport(sessionId)`.
3. `generateAttentionReport` arma el resumen estructurado de la sesión
   (primer intento completado de cada actividad en `activity_results`, con
   sus métricas curadas y el dispositivo de `activity_runs`, más el conteo
   de `tool_start` por herramienta desde `interaction_events`; ver
   `docs/rediseno_actividades.md` §4) y dispara el webhook hacia n8n
   (`N8N_AI_REPORT_WEBHOOK_URL`). Sin esa variable configurada, no hace nada
   y el informe queda `pendiente` (mock-friendly, como estaba previsto). Un
   fallo de red hacia n8n se loguea pero no rompe el cierre de sesión del
   participante. n8n llama a GPT-4o-mini.
4. n8n responde al webhook de retorno `POST /api/webhooks/ai-report`
   (`src/app/api/webhooks/ai-report/route.ts`), autenticado con un secreto
   compartido (`AI_REPORT_WEBHOOK_SECRET`, comparación timing-safe contra el
   header `X-Webhook-Secret`). Este endpoint es tráfico servidor-a-servidor,
   por lo que está agregado a `PUBLIC_PATHS` en `lib/supabase/proxy.ts` (no
   pasa por el chequeo de sesión de Supabase). Usa el cliente `admin` para
   actualizar la fila de `ai_reports` a `status = 'completado'` (filtrando
   por `status = 'pendiente'`, así un reintento del webhook no pisa un
   informe ya completado).
5. El participante consulta el resultado en `/informes` (historial,
   `listAiReports`) y `/informes/[sessionId]` (detalle, `getAiReport`). Si
   el informe sigue `pendiente`, la página se auto-refresca sola cada 3s
   (`components/reports/pending-auto-refresh.tsx`) hasta que cambie de
   estado — en la práctica el ciclo completo (n8n + GPT-4o-mini + callback)
   tarda unos 5 segundos.

### Workflow de n8n (armado 2026-09-19)

Workflow **"FocusLab - Informe de IA (Sprint 4)"**, publicado en la instancia
local de n8n (Docker, puerto 5678). Reemplaza al workflow de prueba viejo
("FocusLab AI Agent", de la versión inicial de la tesis, sin usar). Cinco
nodos en cadena:

1. **Webhook** — `POST /webhook/focuslab-ai-report`, responde
   inmediatamente (`responseMode: onReceived`) para no bloquear al caller;
   el resto de la cadena sigue en background. Body esperado:
   `{ sessionId, activities: [...], sessionDurationMs, toolUsage: [...] }`.
2. **Construir prompt** (Code) — arma `systemPrompt` (perfil atencional,
   explícitamente sin diagnóstico clínico ni mención de TDAH, en español) y
   `userPrompt` (los datos de la sesión) a partir del body.
3. **Generar informe con OpenAI** (HTTP Request) — `POST` a
   `https://api.openai.com/v1/chat/completions`, modelo `gpt-4o-mini`,
   `response_format: json_object`. Usa la credencial existente **"OpenAI
   account"** (reutilizada, no se creó una nueva).
4. **Procesar respuesta** (Code) — parsea el JSON de OpenAI a los campos de
   `ai_reports`: `attentional_profile`, `strengths`, `areas_for_improvement`,
   `recommendations`, más `sessionId` (recuperado de "Construir prompt" vía
   `$('Construir prompt')`) y `rawResponse`.
5. **Callback a Next.js** (HTTP Request) — `POST` a
   `AI_REPORT_WEBHOOK_URL`, autenticado con la credencial Header Auth
   **"Webhook FocusLab Secret"** (también reutilizada — header
   `X-Webhook-Secret`). El Route Handler `POST /api/webhooks/ai-report`
   valida ese mismo header contra `AI_REPORT_WEBHOOK_SECRET`.

**Validado end-to-end (2026-09-24/25)**, tanto con `curl` directo al
webhook como jugando una actividad real en el navegador y usando el botón
"Terminar sesión": los cinco nodos corren sin error (la credencial "OpenAI
account" estaba vencida — se renovó — y la credencial "Webhook FocusLab
Secret" del nodo Callback se resincronizó con `AI_REPORT_WEBHOOK_SECRET` de
`.env.local`), la fila de `ai_reports` termina en `status = 'completado'`
con contenido coherente en español y sin terminología clínica, y `/informes/
[sessionId]` lo muestra correctamente. Un caso límite probado: sesión sin
ninguna actividad completada — GPT igual arma un perfil razonable en vez de
fallar, aunque la card de "Fortalezas" queda vacía (cosmético, no bloquea).

**Nota de red local**: la URL de callback usada para pruebas en local es
`http://172.17.0.1:3000/api/webhooks/ai-report` (la IP del gateway del
bridge de Docker en Linux), no `localhost`, porque el contenedor de n8n no
tiene `host.docker.internal` mapeado y `localhost` dentro del contenedor no
llega al Next.js corriendo en el host. Hay que actualizar esa URL en el
nodo "Callback a Next.js" cuando se despliegue (Vercel) o si cambia el
setup de Docker.

## 7bis. Autenticación y motor de captura (Sprint 1)

Flujo implementado con Server Actions (`app/(auth)/*/actions.ts`), la capa
`lib/services/{auth,consents,sessions}.ts` y el cliente de servidor de
Supabase (`lib/supabase/server.ts`):

1. `/registro` → `signUpWithPassword()`. Si el proyecto de Supabase exige
   confirmación de correo (por defecto), no hay sesión inmediata: se
   muestra "revisa tu correo" en vez de redirigir.
2. El enlace del correo de confirmación debe apuntar a
   `GET /auth/confirm?token_hash=...&type=signup`, que llama a
   `supabase.auth.verifyOtp()` y redirige a `/consentimiento`.
3. `/login` → `signInWithPassword()` → redirige a `?redirect=` o `/dashboard`.
4. `src/app/(participante)/layout.tsx` exige sesión, exige haber aceptado el
   consentimiento (si no, redirige a `/consentimiento`), y llama a
   `getOrCreateActiveSession()` (RF-02): reutiliza la sesión `en_progreso`
   más reciente del usuario en vez de crear una por cada visita.
5. Ese `session.id` se pasa a `EventTrackerProvider`
   (`components/tracking/event-tracker-provider.tsx`), que monta
   `useEventTracker` (`hooks/use-event-tracker.ts`): captura clics,
   `visibilitychange` e inactividad (60s sin clic/tecla/mouse) en todo el
   área de participante, los agrupa en memoria y los inserta en lote en
   `interaction_events` cada 5s o al desmontar. Expone `logEvent()` vía
   `useEventLogger()` para que las actividades y herramientas (Sprint 2/3)
   reporten `activity_start/end` y `tool_start/end/interrupt`.
6. Al cerrar sesión (`components/layout/logout-action.ts`, Server Action)
   se marca la sesión `en_progreso` como `abandonada` antes de hacer
   `auth.signOut()`.

**Validado directamente contra el proyecto real de Supabase** (usuario de
prueba creado y borrado vía API admin, ver historial de sesión): el trigger
`handle_new_user` crea `profiles` automáticamente, las políticas RLS de
`consents`/`sessions`/`interaction_events` permiten insertar solo lo propio,
un participante no puede leer `profiles` de otros ni las vistas `vw_*`
agregadas, `getOrCreateActiveSession` reutiliza la sesión correctamente, y
el `on delete cascade` limpia todo al borrar el usuario.

### Configuración del dashboard de Supabase (aplicada 2026-08-26)

- **Authentication → Emails → Confirm email**: **desactivado**. Se optó por
  esto en vez de configurar la plantilla de confirmación con `token_hash`,
  para simplificar el registro del taller piloto y evitar el rate limit del
  proveedor de correo por defecto. Consecuencia: `signUpWithPassword()` deja
  sesión inmediata (no pasa por el estado "revisa tu correo"), y la ruta
  `GET /auth/confirm` (`src/app/auth/confirm/route.ts`) queda sin usar
  mientras esto siga desactivado. Si se reactiva confirmación por correo más
  adelante, ahí sí hay que configurar Auth → Email Templates → Confirm
  signup con `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
- **Authentication → URL Configuration**: Site URL =
  `https://focuslabv2.vercel.app` (el proyecto ya está desplegado en Vercel,
  antes de lo previsto para Sprint 5).
- **Migrations**: los 12 archivos de `supabase/migrations/` ya están
  aplicados en el proyecto de Supabase.

**Nota (2026-09-25)**: `.env.local` tenía cargado un ref de Supabase que ya
no existe (proyecto borrado/pausado, no resolvía ni por DNS). Se corrigió
apuntando de nuevo al proyecto **focuslabv2** (org "Dev" en el dashboard de
Supabase). De paso se notó que **Confirm email volvió a estar activado**
en ese proyecto (contradice lo de arriba) — probablemente se reseteó junto
con el resto de la config al recrear/pausar el proyecto. Antes del taller
piloto real hay que volver a desactivarlo en Authentication → Emails, o el
registro de los participantes se va a quedar trabado en "revisa tu correo"
(Supabase Auth además rate-limita el envío de esos correos en el plan free,
así que probar registro repetidas veces sin desactivarlo agota el límite
rápido).

## 7ter. Las seis actividades cognitivas (rediseño v2, 2026-10-04)

Detalle completo (tabla por actividad, esquema, diagramas del capítulo 5,
payload de n8n y pantallas): **`docs/rediseno_actividades.md`**.

Cada actividad mide una dimensión distinta sobre un paradigma clásico:
Reaction Test (PVT, alerta), Focus Flow (SART, atención sostenida), Memory
Matrix (Corsi, memoria de trabajo visoespacial), Word Sprint (Stroop,
atención selectiva e inhibición), Pattern Hunt (búsqueda visual por rasgo y
conjunción) y Deep Read (lectura con notificaciones simuladas). Funcionan en
laptop y celular (taller mixto). Todos los parámetros numéricos viven en
`src/lib/activities/config.ts`.

Arquitectura:

1. **`ActivityShell`** (`src/components/activities/activity-shell.tsx`) es el
   motor común. Recorre instrucciones, práctica (repetible una vez, nunca se
   guarda), cuenta regresiva, ronda registrada a pantalla completa (`100dvh`,
   sin scroll ni zoom por doble toque, aviso de girar el teléfono), guardado
   y resultado. Además pide Wake Lock, cuenta las pérdidas de visibilidad,
   captura el contexto de dispositivo y descarta el clic fantasma táctil al
   cerrar la capa.
2. **Hooks de medición**:
   - `useTrialClock` registra el inicio del estímulo en el frame de
     requestAnimationFrame en que se pinta, acepta una sola respuesta por
     ensayo y marca el ensayo inválido si la pestaña se oculta.
   - `useResponseInput` usa Pointer Events (`pointerdown`) y teclas
     asignadas, toma el tiempo de `event.timeStamp` y registra el tipo de
     entrada.
3. **Una `Round` por actividad** (`*-round.tsx`): solo estímulos y reglas.
4. **Métricas puras** en `src/lib/activities/<actividad>/metrics.ts`
   (probadas en `tests/unit/`). Devuelven `ActivitySummary`, con la métrica
   principal, todas las métricas, el subconjunto curado para n8n (`report`)
   y una frase de estilo, nunca de falla.
5. **Persistencia** (`src/lib/services/activity-runs.ts`):
   - Se crea la fila en `activity_runs` al empezar la ronda registrada.
   - Al terminar se guarda en un solo lote idempotente: corrida, ensayos,
     resumen y estado `completada`, con 3 reintentos y cola en
     `localStorage` que se vacía al volver a /actividades.
   - Si se cierra la página a mitad, `sendBeacon` llama a
     `POST /api/activity-runs/[runId]/abandon` y la corrida queda
     `incompleta`.

Las mecánicas anteriores (v1, Sprint 2: Reaction Test mezclado con SART,
Focus Flow como MOT, Deep Read con 3 párrafos) se reemplazaron por completo;
sus filas siguen en `activity_results` con `protocol_version = 'v1'`. El
historial de esas iteraciones está en git (antes de `df2784d`).

Pruebas: `npm test` (Vitest, métricas y generadores) y `npm run test:e2e`
(Playwright en Desktop Chrome, Pixel 7 e iPhone 13 contra focuslabv2, con
un usuario de prueba que se crea y se borra en cada corrida y
`NEXT_PUBLIC_ACTIVITY_FAST=1`).

### Pulso de sesión (2026-08-28, reemplaza al autorreporte por-actividad)

Primer intento: una pantalla de autorreporte obligatoria
(`PostActivityRating`) entre que terminaba cada juego y se guardaba el
resultado, integrada en `useActivityResult`. Feedback directo tras
probarlo: se sentía repetitivo y nada agradable — 6 actividades, 6
pantallas iguales seguidas. Se sacó por completo de
`useActivityResult`/`ActivityPhase` (volvió a las tres fases originales,
`finish()` guarda directo otra vez) y se reemplazó por un **pulso a nivel
de sesión**: `SessionPulseCheck`
(`src/components/activities/session-pulse.tsx`), montado en
`/actividades` (el listado, el momento "entre actividades" — nunca
interrumpe mientras se está jugando). Cada vez que se visita esa página,
cuenta cuántas filas de `activity_results` tiene la sesión actual; cada
3 actividades completadas (`Math.floor(count / 3)` como número de hito)
dispara un `toast.custom` de `sonner` con emojis tocables — sin pantalla
aparte, sin botón "Saltar" explícito: tocás una carita o lo ignorás y se
cierra solo a los 15s. Qué hito ya se mostró queda en `sessionStorage`
(por `session_id`, no se repite si volvés a la página). La respuesta (o
`null` si se cerró solo sin tocar nada) se registra vía
`logEvent("session_pulse", { rating, completedCount, milestone })` sobre
`interaction_events` — nuevo valor de enum, no una columna nueva. Con 6
actividades por sesión son como mucho 2 pulsos, y al ser por sesión (no
por actividad) encaja mejor con el criterio de validación de H2 que ya
compara el informe de *sesión completa*, no informes por actividad —
bonus: comparar el pulso temprano (hito 1) contra el tardío (hito 2) da
un espejo subjetivo del decaimiento de vigilancia que ya miden
objetivamente Reaction Test/Word Sprint.

## 7quater. Las cuatro herramientas de productividad (Sprint 3)

Mismo patrón de capas que las actividades (§7ter), pero para datos
persistentes en vez de un resultado de una sola vez: un servicio plano en
`src/lib/services/{pomodoro,kanban,habits,calendar-events}.ts` (funciones
`async (supabase, params) => …`, sin `server-only` — se llaman desde
Client Components con el cliente de browser, sujeto a RLS `*_all_own`,
igual que `activity-results.ts`) + un componente en
`src/components/tools/*.tsx` que la `page.tsx` monta dentro de
`ToolLayout` (`src/components/tools/tool-layout.tsx`, calco de
`ActivityLayout`). Cada herramienta usa `useToolSession(tool)`
(`src/hooks/use-tool-session.ts`) para emitir `tool_start`/`tool_end` al
motor de captura al montar/desmontar la página (RF-06 a RF-09). El
esquema ya existía desde Sprint 0 (`supabase/migrations/…0007`–`…0010`) —
esta ronda fue solo UI + CRUD, sin migraciones nuevas.

| Herramienta | Mecánica | Datos que guarda |
|---|---|---|
| Pomodoro | Bloques de trabajo/descanso configurables (25/5 min por defecto, cantidad de ciclos programable), alternan con cuenta regresiva de 1s. Al terminar un descanso (salvo el último ciclo) **no arranca solo el siguiente bloque**: pasa a una fase `"ready"` que espera a que el participante toque "Empezar ciclo" — mide la latencia de reanudación tras el descanso (`tool_progress` "cycle_resume"), mismo constructo que `recallLatencyMs` en Focus Flow o `questionTimesMs` en Deep Read (2026-08-28, a pedido explícito: "más interactivo" + más señal de comportamiento). Al completar todos los ciclos cierra solo con una pantalla de resumen. Al pasar de trabajo a descanso suma un ciclo (`completed_cycles`, persistido en cada transición). "Detener" en cualquier fase (incluida `"ready"`) marca `interrupted: true` + `logEvent("tool_interrupt")`; si el participante navega fuera con la sesión abierta, un cleanup best-effort también la marca interrumpida. Pausar congela el conteo (no resta del tiempo del bloque) pero **sí queda registrado** (`pause_count`/`paused_ms`, agregado 2026-08-28 tras notar que `ended_at - started_at` por sí solo no distingue tiempo enfocado real de tiempo con la sesión abierta pero pausada). | Una fila en `pomodoro_sessions` por sesión de Pomodoro iniciada (duración configurada, ciclos completados, si terminó interrumpida, cuántas veces pausó y cuánto tiempo total). |
| Kanban | 3 columnas (pendiente/en progreso/completado). Mover una tarjeta funciona con drag-and-drop nativo (sin librería — el proyecto no tiene `dnd-kit` ni similar) o con un `<Select>` de respaldo por tarjeta (accesibilidad/touch). `position` usa `Date.now()` al crear o mover, alcanza para ordenar sin una consulta de conteo extra. | Filas en `kanban_tasks` (título, descripción opcional, estado, posición). |
| Hábitos | Ventana rodante de los últimos 7 días terminando hoy, por hábito. Decisión de diseño (2026-08-27, feedback directo de Eduardo): **solo se puede marcar/desmarcar el día de hoy** — los otros 6 son historial de solo lectura (sin `onClick`), para que sea un check-in del momento real y no una bitácora editable en retrospectiva (esto también cuida la validez del dato para la tesis: no se puede "completar" un hábito hacia atrás). El toggle de hoy es un `upsert` sobre `habit_logs` (`unique(habit_id, log_date)`); rachas de 3/5/7 días disparan `playCombo()` + un toast en vez del `playHit()` normal. Archivar es soft-delete (`archived`), conserva el historial. | Filas en `habits` + `habit_logs` (una por hábito×día marcado). |
| Calendario | Semana actual por defecto (lunes a domingo), navegación semana anterior/siguiente. Grid de 7 columnas (colapsa a 1 en mobile), cada día lista sus eventos ordenados por hora con un botón "+" para crear uno (hora de inicio/fin vía `<input type="time">`, combinada con la fecha de esa columna). Señal de seguimiento real vs. planeado (2026-08-28): cuando un evento ya pasó (`end_at < ahora`) y todavía no tiene respuesta (`completed` es `null`), la tarjeta muestra "¿Lo hiciste?" con Sí/No en vez de la hora — una vez respondido queda fijo (no se puede cambiar) y se ve como una pill con check o tachado. Es autorreporte de función ejecutiva/planificación, dato relevante para el perfil atencional más allá de cuántos eventos agendó. | Filas en `calendar_events` (título, rango `start_at`/`end_at`, `completed`). |

### Instrumentación granular: `tool_progress` (2026-08-28)

Pedido explícito (mismo espíritu que "Profundidad de `metrics`" en
§7ter, aplicado a herramientas): escarbar la mayor cantidad de
información posible del comportamiento, no solo el resultado final de
cada acción. En vez de agregar columnas nuevas a cada tabla de
herramienta cada vez que se quiere capturar una señal más (cada
migración hay que pegarla a mano en el dashboard de Supabase — no hay
CLI enlazado, ver §8 más abajo), esta capa vive en `interaction_events`
(ya existente, `payload` jsonb libre) bajo un nuevo valor de enum,
`tool_progress` — hitos granulares dentro de una herramienta, análogo a
`activity_start`/`activity_end` pero para eventos intermedios. Las
tablas de resumen (`pomodoro_sessions`, etc.) se quedan solo con
agregados finales de la sesión.

Eventos actuales (`logEvent("tool_progress", { tool, type, ... })`):

- **Pomodoro**: `work_complete`/`break_complete` (`cycleIndex, wallMs` —
  tiempo real de esa fase, incluye cualquier pausa dentro de ese bloque
  específico), `cycle_resume` (`cycleIndex, latencyMs` — ver checkpoint
  `"ready"` en la tabla de arriba). Con esto se puede reconstruir el
  timeline completo de una sesión y ver si la latencia de reanudación
  crece en los últimos ciclos (mismo análisis que
  `omissionsByThirdPct`/`earlyAvgMs`/`lateAvgMs` en las actividades).
- **Kanban**: `task_created`; `status_change` (`taskId, from, to,
  msSinceCreated`); `task_deleted` (`taskId, status, msSinceCreated`) —
  permite reconstruir cuánto vive una tarea en cada columna sin una
  tabla de historial.
- **Hábitos**: `checkin` (`habitId, streak, latencyMs`), solo al marcar
  como cumplido — `latencyMs` es el tiempo desde que se abrió la
  herramienta hasta el check-in, qué tan rápido se compromete con el
  hábito de hoy; `habit_created`.
- **Calendario**: `event_created` (`leadTimeMs` = con cuánta
  anticipación agenda, `start_at - ahora`); `week_navigated`
  (`direction, weeksFromToday`) en los botones anterior/siguiente/Hoy;
  `reflection` (`eventId, completed`) al responder "¿Lo hiciste?".

## 8. Variables de entorno

Ver `.env.local.example`. Resumen:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clientes browser/server (`lib/supabase/client.ts`, `server.ts`, `proxy.ts`). Sujetos a RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Cliente admin (`lib/supabase/admin.ts`), solo en Route Handlers de servidor. Bypassa RLS. |
| `N8N_AI_REPORT_WEBHOOK_URL`, `AI_REPORT_WEBHOOK_SECRET` | Flujo de informes de IA (Sprint 4). |

## 9. Estado por sprint

- **Sprint 0 (hecho)** — estructura del proyecto (Next.js 16 + TS + Tailwind
  v4 + shadcn/ui), esquema completo de Supabase con RLS, clientes de
  Supabase (browser/server/admin) y `proxy.ts`, navegación completa con
  páginas wireframe, este documento.
- **Sprint 1 (hecho)** — autenticación funcional (registro, confirmación de
  correo, login, consentimiento) con Server Actions, ciclo de vida de
  `sessions` (RF-02), motor de captura de eventos `useEventTracker` (RF-03).
  Validado contra el proyecto real de Supabase. Configuración del dashboard
  aplicada y proyecto desplegado en Vercel, ver §7bis.
- **Sprint 2 (hecho)** — las seis actividades cognitivas, ver §7ter.
- **Sprint 3 (hecho)** — las cuatro herramientas de productividad, ver
  §7quater.
- **Sprint 4 (hecho)** — flujo de informe con IA de punta a punta:
  `completeSessionAndRequestReport`, `generateAttentionReport`, ambos
  endpoints de `/api`, workflow de n8n, y UI de `/informes` +
  `/informes/[sessionId]` con el botón "Terminar sesión", ver §7. Validado
  end-to-end contra el proyecto real. Panel administrativo: `/admin` lee las
  vistas agregadas `vw_*` con el cliente del usuario (RLS + `current_user_role()`,
  sin `user_id`, RS-04) y ofrece exportación CSV por dataset (RF-14);
  `/admin/participantes` (solo investigador) lista consentimiento, sesiones y
  último informe, y permite reintentar manualmente informes `fallido` o
  `pendiente` por más de 5 min (`retryAiReport`, vía Server Action).
- **Sprint 5** — integración, pruebas, pulido de UI, despliegue en Vercel.
  Análisis del investigador en la web (2026-10-05): `/admin/analisis`
  replica las páginas 3 a 10 del tablero de Power BI. Los z, tramos,
  índices, estilos y correlaciones se calculan con las mismas reglas que las
  medidas DAX (`docs/power_bi.md` §8) y cuadran con las cifras de control de
  los datos de demostración.
