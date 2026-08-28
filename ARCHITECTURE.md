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
| `/login`, `/registro`, `/consentimiento` | público | Wireframe (formularios deshabilitados) | 1 |
| `/dashboard` | participante | Accesos rápidos | 1 |
| `/actividades` | participante | Listado de las 6 actividades | 1 |
| `/actividades/{reaction-test,focus-flow,memory-matrix,word-sprint,pattern-hunt,deep-read}` | participante | Wireframe | 2 |
| `/herramientas` | participante | Listado de las 4 herramientas | 1 |
| `/herramientas/{pomodoro,kanban,habitos,calendario}` | participante | Wireframe | 3 |
| `/informes` | participante | Wireframe (historial, RF-12) | 4 |
| `/informes/[sessionId]` | participante | Wireframe (detalle de informe, RF-11) | 4 |
| `/admin` | investigador, autoridad | Wireframe (panel agregado, RF-13) | 4 |
| `/admin/participantes` | investigador | Wireframe (gestión del taller) | 4 |

Endpoints de API planeados (no implementados aún, ver §7):

| Endpoint | Método | Rol | Sprint |
|---|---|---|---|
| `/api/sessions/[sessionId]/complete` | `POST` | participante | 4 |
| `/api/webhooks/ai-report` | `POST` | n8n (secreto compartido) | 4 |

## 6. Modelo de datos (entidad-relación)

```
auth.users (Supabase Auth)
   └─ 1:1 ─ profiles (id, full_name, role)
                 ├─ 1:N ─ consents (user_id, consent_version, accepted_at)
                 ├─ 1:N ─ sessions (user_id, status, started_at, ended_at)
                 │           ├─ 1:N ─ interaction_events (session_id, user_id, event_type, payload, occurred_at)
                 │           ├─ 1:N ─ activity_results (session_id, user_id, activity_type, duration_ms, accuracy, level_reached, metrics)
                 │           └─ 1:1 ─ ai_reports (session_id, status, attentional_profile, strengths, areas_for_improvement, recommendations, raw_response)
                 ├─ 1:N ─ pomodoro_sessions (user_id, session_id?, work_duration_minutes, break_duration_minutes, completed_cycles, interrupted)
                 ├─ 1:N ─ kanban_tasks (user_id, title, status, position)
                 ├─ 1:N ─ habits (user_id, name, archived)
                 │           └─ 1:N ─ habit_logs (habit_id, user_id, log_date, completed)
                 └─ 1:N ─ calendar_events (user_id, title, start_at, end_at)
```

Vistas agregadas y anonimizadas (sin `user_id` ni ninguna otra columna
identificable), pensadas para Power BI Desktop vía el conector nativo de
PostgreSQL (RF-13, RF-14, RS-04):

- `vw_activity_results_summary` — distribución de resultados por actividad.
- `vw_interaction_events_summary` — frecuencia diaria de eventos pasivos.
- `vw_sessions_summary` — estadísticos descriptivos de sesiones por día.
- `vw_tool_usage_summary` — uso agregado de herramientas por día.

El esquema completo, con todas las políticas RLS, vive en
`supabase/migrations/` (un archivo por entidad, numerado). Para aplicarlo:
pegar cada archivo en el SQL Editor de Supabase en orden, o usar
`supabase db push` si más adelante se enlaza el proyecto con el CLI.

## 7. Flujo de informe de IA (diseño, Sprint 4)

1. El participante termina su sesión → el frontend llama a
   `POST /api/sessions/[sessionId]/complete`.
2. El Route Handler marca `sessions.status = 'completada'`, crea la fila en
   `ai_reports` con `status = 'pendiente'` y llama a
   `generateAttentionReport(sessionId)` — una función de `lib/services/`
   fácil de mockear (para poder probar el resto del flujo sin depender de
   que la instancia de n8n esté configurada).
3. En producción, `generateAttentionReport` dispara el webhook hacia n8n con
   el resumen estructurado de la sesión (resultados de actividades + eventos
   agregados). n8n llama a GPT-4o-mini.
4. n8n responde al webhook de retorno `POST /api/webhooks/ai-report`
   (autenticado con un secreto compartido, `AI_REPORT_WEBHOOK_SECRET`), que
   usa el cliente `admin` (service role, bypassa RLS) para actualizar la fila
   de `ai_reports` a `status = 'completado'` con el contenido del informe.
5. El participante consulta el resultado en `/informes/[sessionId]`.

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

## 7ter. Las seis actividades cognitivas (Sprint 2)

Cada actividad (`src/app/(participante)/actividades/*/page.tsx`) sigue el
mismo patrón de tres fases sobre una infraestructura compartida:

1. **`useActivityResult(activityType)`** (`src/hooks/use-activity-result.ts`)
   orquesta el ciclo de vida: `start()` cronometra y emite
   `logEvent("activity_start", ...)`; `finish(outcome)` cronometra el fin,
   emite `activity_end`, y guarda la fila en `activity_results` vía
   `saveActivityResult` (`src/lib/services/activity-results.ts`, insert
   directo desde el cliente — política RLS `activity_results_insert_own`,
   igual que ya hace `interaction_events`).
2. **UI compartida** en `src/components/activities/`: `ActivityLayout`
   (header), `ActivityIntro` (instrucciones + botón "Comenzar"),
   `ActivityResult` (estadísticas de cierre genéricas `{label, value}[]`).
3. **El juego** (`*-game.tsx`) es un componente "tonto": solo recibe
   `onFinish(outcome)` y no conoce Supabase ni la sesión.

Ninguna actividad cambia `sessions.status` — el participante puede hacer
varias actividades dentro de la misma sesión `en_progreso` (Sprint 4 marca
`completada` vía `/api/sessions/[sessionId]/complete`).

Las mecánicas se revisaron cuatro veces (2026-08-27) tras feedback directo:
primero porque las versiones iniciales —pocos ensayos, objetivos fáciles
de anticipar— no generaban carga atencional real; después porque, ya con
paradigmas válidos, la interacción se sentía demasiado plana para el
Objetivo específico 2 de la tesis ("percibidas como juegos o desafíos, no
como evaluaciones clínicas"); una tercera vez para subirle la dificultad
puntual a Reaction Test, Focus Flow y Pattern Hunt, y para reemplazar Word
Sprint (decisión léxica: real vs. pseudopalabra) por una tarea Stroop —el
prompt original solo pedía "velocidad de procesamiento/precisión léxica"
como constructo, no la mecánica exacta, y Stroop es un paradigma de
atención mucho más reconocible para un usuario sin formación en
psicología, además de igual de válido para procesamiento/interferencia.
Y una cuarta ronda porque Focus Flow (el SART en grilla) no convencía por
sí solo: se fusionó con Reaction Test en una sola mecánica más completa
bajo el nombre "Reaction Test" (en la tesis solo está fijado el nombre y
el constructo de una línea de cada actividad, no la mecánica exacta), y
el slot "Focus Flow" se rediseñó desde cero como una actividad de
seguimiento visual continuo (MOT) — no redundante con la fusionada. De
paso, Deep Read sumó tiempo límite real (el propio one-liner de la tesis
lo pedía y no estaba implementado) y distractores más difíciles de
adivinar sin leer. Las versiones actuales combinan ambas cosas: la
mecánica de fondo sigue paradigmas establecidos de psicología cognitiva
(citables en el capítulo de metodología), y encima cada una tiene una
capa de "juego" — puntaje en vivo, racha con multiplicador (`StreakBadge`,
`src/components/activities/streak-badge.tsx`), feedback sonoro vía Web
Audio sin assets (`src/lib/audio/beep.ts`, incluye `playCombo()` en
hitos de racha) y animaciones de acierto/error (`.animate-pop` /
`.animate-shake` en `globals.css`). El puntaje vive en `metrics.score`
(jsonb) — no es parte del constructo medido, es la envoltura gamificada
sobre `accuracy`/`level_reached`, que son los valores que importan para
el perfil atencional.

| Actividad | Paradigma / mecánica | `accuracy` | `level_reached` |
|---|---|---|---|
| Reaction Test | Mecánica fusionada (2026-08-27): SART (Robertson et al. 1997) con incertidumbre espacial como columna vertebral —cadencia VARIABLE (900–2000ms, rompe el ritmo predecible), 90s, el estímulo aparece en 1 de 9 celdas al azar— más tiempo de reacción y puntería tipo PVT: el círculo-objetivo se achica con la racha (72px → 32px) y se mide la distancia del clic a su centro (`aimDistancesPx`). Responder al frecuente (círculo), inhibir el infrecuente (~20%, cuadrado). Cualquier clic fuera de la celda activa —incluso sin estímulo visible— cuenta como arranque en falso (`falseStarts`). | aciertos / (aciertos + omisiones) | — |
| Focus Flow | Multiple Object Tracking (Pylyshyn & Storm, 1988): 8 rondas, cada una resalta 2–3 puntos ("blancos") entre 6–13 durante ~1.8s; luego todos quedan idénticos y se mueven al azar (rebotando en los bordes) durante 4.2–7.5s, cada vez más rápido y con más puntos; al detenerse, hay que marcar cuáles eran los blancos. Posiciones y velocidades viven en refs, se escriben al DOM vía `requestAnimationFrame` (nunca por `setState`, para no tirar el framerate). Paradigma real detrás de "seguimiento visual continuo" (el one-liner original de la tesis para esta actividad), y mecánica distinta de todo el resto del sprint. | blancos identificados / blancos totales, sumado en las 8 rondas | cantidad de puntos de la ronda final (13, proxy de dificultad máxima) |
| Memory Matrix | secuencia en cuadrícula 3×3, +1 celda por nivel (estilo Simon) | clics correctos / clics totales | último nivel completo (máx. 10) |
| Word Sprint | Efecto Stroop (Stroop, 1935): nombre de un color renderizado con tinta de otro color (~30% congruente / 70% incongruente), responder al color de la tinta ignorando la palabra. 24 rondas, 1.6s/ronda. La interferencia (RT incongruente − RT congruente, `metrics.incongruentAvgMs`/`congruentAvgMs`) es la señal diagnóstica — mucho más intuitiva para el usuario que una decisión léxica abstracta. | % respuestas correctas | — |
| Pattern Hunt | Búsqueda por *conjunción* (Treisman & Gelade, 1980) con distractor "casi-objetivo": el objetivo combina forma+color+tamaño (estrella violeta grande) entre 3 tipos de distractor (estrellas grises, círculos violeta, estrellas violeta chicas) — no hay pop-out, exige revisión serial. 10 rondas, cuadrícula 5×5 → 9×9, con límite de 7s por ronda. | rondas encontradas sin clic erróneo | tamaño de cuadrícula máximo (9) |
| Deep Read | Cada partida elige 3 párrafos al azar (sin repetir, orden aleatorio) de un banco de 8, 3 preguntas por párrafo (2 literales + 1 de inferencia, 9 en total). Tiempo límite real por párrafo (45s) y por pregunta (20s, corre incluso durante una relectura) — si se acaba, avanza solo y cuenta como no respondida (`readingTimeouts`/`questionTimeouts`). Los distractores de las 24 preguntas están escritos para ser creíbles dentro del tema del párrafo (misma dirección que la opción correcta, algunos combinan dos datos del texto) — no se pueden adivinar por sentido común sin leer. El participante puede releer el párrafo antes de confirmar (`rereadCount`/`rereadTimeMs`) y cambiar de opción antes de confirmar (`answerChanges`) — analiza no solo cuánto entendió sino *cómo* llegó a la respuesta (relectura, dudas, tiempo por pregunta `questionTimesMs`, precisión literal vs. inferencia por separado). También mide resistencia a la distracción (`distractionsShown`/`distractionsClicked`, notificación a ignorar durante la lectura). | % preguntas correctas | — |

`metrics` (jsonb) guarda el detalle específico de cada una (tiempos de
reacción individuales, respuestas por ronda, etc.) para el informe de IA
del Sprint 4.

### Profundidad de `metrics` por actividad (2026-08-27)

Pedido explícito: extraer la mayor cantidad de información posible del
comportamiento de cada usuario, no solo el resultado final — son las
variables que el agente de IA (Sprint 4) va a tener disponibles para
construir el perfil atencional y que sustentan la Hipótesis 1 (patrones
diferenciados) y la Hipótesis 2 (los datos pasivos/de comportamiento
enriquecen la precisión del perfil, más allá del puntaje). Además de lo ya
descrito en la tabla, cada actividad guarda:

- **Reaction Test** (mecánica fusionada): `reactionRtSD`, `rtCV`,
  `earlyAvgMs`/`lateAvgMs` (decaimiento de vigilancia: ¿empeora la
  reacción con el tiempo?), `commissionTimesMs` (un commission rápido es
  la firma clásica de impulsividad/lapso, más diagnóstico que solo
  contarlos), `omissionsByThirdPct` (tasa de omisión por tercio de la
  prueba), `aimDistancesPx`/`targetSizesPx` (qué tan lejos del centro cae
  cada clic válido — distingue error motriz de error atencional),
  `falseStarts` (clics fuera de la celda activa, incluso sin estímulo
  visible — impulsividad).
- **Focus Flow** (MOT): por ronda, `targetsPerRound`, `correctPerRound`,
  `falsePositivesPerRound` (blanco confundido con distractor),
  `missedPerRound` (blanco nunca marcado), `speedPxPerSec`,
  `dotsPerRound`, `trackingDurationMsPerRound`, `recallLatencyMs` (tiempo
  entre que los puntos se detienen y el primer clic — duda vs. respuesta
  fluida).
- **Memory Matrix**: `clickLatenciesMs` (tiempo entre cada clic durante el
  recuerdo — hesitación vs. respuesta fluida), `mistakeAtStep` (en qué
  punto de la secuencia falló: olvido temprano vs. tardío).
- **Word Sprint (Stroop)**: `congruentAccuracy`/`incongruentAccuracy`
  (no solo el RT sino también si la interferencia genera errores),
  `postErrorAvgMs`/`postCorrectAvgMs` (enlentecimiento post-error: ¿se
  frena y se cuida después de fallar, o sigue igual de impulsivo?).
- **Pattern Hunt**: `searchSlopeMsPerCell` (regresión simple tiempo vs.
  tamaño de cuadrícula — la firma real de búsqueda serial vs. paralela),
  `wrongClicksByType` (a qué distractor confunde más: el "casi-objetivo"
  chico, el de igual color, o el de igual forma).
- **Deep Read**: `readingWpm` por párrafo (velocidad de lectura), que
  cruzado con `rereadCount` distingue leer rápido-y-bien de leer
  rápido-pero-inseguro; `readingTimeouts`/`questionTimeouts` (cuántas
  veces se acabó el tiempo límite, agregado 2026-08-27 junto con el resto
  del tiempo límite real).

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
- **Sprint 3** — las cuatro herramientas de productividad.
- **Sprint 4** — flujo de informe con IA (`generateAttentionReport`,
  endpoints de `/api`) + panel administrativo.
- **Sprint 5** — integración, pruebas, pulido de UI, despliegue en Vercel.
