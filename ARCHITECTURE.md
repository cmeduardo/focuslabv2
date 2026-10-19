# FocusLab — Arquitectura

Describe cómo está construido el sistema tal como existe en el código. Las
razones de las decisiones están en
[`docs/decisiones_tecnicas.md`](./docs/decisiones_tecnicas.md) y lo que
falta o tiene limitaciones, en
[`docs/estado_proyecto.md`](./docs/estado_proyecto.md).

## 1. Contexto

FocusLab registra el desempeño de jóvenes universitarios en seis
actividades cognitivas y su uso de cuatro herramientas de productividad.
Al cerrar una sesión, un flujo externo (n8n + GPT-4o-mini) redacta un
informe de perfil atencional. La aplicación **no realiza diagnóstico
clínico**: no usa terminología médica ni genera etiquetas clínicas.

## 2. Stack

- **Next.js 16** (App Router) con React 19 y TypeScript. Convenciones de
  esta versión que se notan en el código:
  - `cookies()`, `headers()`, `params` y `searchParams` son `Promise`
    (ver `src/lib/supabase/server.ts` y las páginas dinámicas).
  - La intercepción de requests vive en `src/proxy.ts`, que exporta
    `proxy()` (lo que antes era `middleware.ts`).
- **Tailwind CSS v4** (configuración en `src/app/globals.css`, sin
  `tailwind.config.ts`) y componentes de shadcn/ui.
- **Supabase**: PostgreSQL, Auth y Row Level Security.
- **n8n Cloud** + OpenAI `gpt-4o-mini` para los informes.
- **Vercel** para el despliegue. Vitest y Playwright para las pruebas.

## 3. Capas

```
src/
├── app/                 Presentación: rutas del App Router
│   ├── (auth)/          login, registro, consentimiento (públicas)
│   ├── (participante)/  dashboard, actividades, herramientas, informes
│   ├── admin/           panel, participantes, reporte, análisis, export
│   ├── api/             endpoints (cierre de sesión, abandono, webhook)
│   └── auth/confirm/    confirmación de correo
├── components/          Presentación: actividades, herramientas, informes,
│                        análisis, layout y primitivos de ui/
├── hooks/               Lógica en el cliente: captura de eventos, reloj de
│                        ensayos, entrada, wake lock, sesión de herramienta
├── lib/
│   ├── services/        Lógica de negocio: un archivo por caso de uso
│   ├── activities/      Generación de ensayos y métricas (funciones puras)
│   ├── analysis/        Cálculos del panel de análisis (funciones puras)
│   ├── auth/            Política de contraseñas y redirecciones seguras
│   ├── supabase/        Acceso a datos: clientes browser / server / admin
│   └── types/           Tipos del esquema de la base
└── proxy.ts             Refresco de sesión y protección de rutas
supabase/
└── migrations/
    ├── 20261019000000_esquema.sql              Esquema completo: tablas, RLS, vistas y permisos
    └── 20261020000000_verificacion_staff.sql   Código por correo para el investigador y la autoridad
```

Regla de dependencia: `app/` llama a `lib/services/`, que usa
`lib/supabase/`. `lib/supabase/server.ts` y `lib/supabase/admin.ts` llevan
`import "server-only"`, así que un Client Component no puede importarlos.
Los servicios de herramientas y actividades se llaman también desde el
navegador con el cliente público, siempre sujetos a RLS.

## 4. Roles y control de acceso

| Rol | Acceso |
|---|---|
| `participante` | Rol por defecto. Actividades, herramientas e informes propios. Por RLS solo lee y escribe sus filas. |
| `investigador` | Todo `/admin`: panel agregado, listado de participantes, reporte, análisis y exportaciones seudonimizadas. Lectura de las tablas base por políticas `select_researcher`. |
| `autoridad` | `/admin` y `/admin/reporte`, solo con vistas agregadas, sin datos identificables. |

El control ocurre en tres niveles:

1. **`src/proxy.ts`** refresca la sesión de Supabase en cada request y manda
   a `/login` a quien entre sin sesión a una ruta no pública. Son públicas
   `/`, `/login`, `/registro`, `/olvide-contrasena`, `/consentimiento`, `/auth/*` y
   `/api/webhooks/*` (el webhook se autentica con su propio secreto).
2. **Layouts y páginas.** `(participante)/layout.tsx` exige sesión y
   consentimiento aceptado. `admin/layout.tsx` exige `investigador` o
   `autoridad` y una sesión confirmada con código (si no, manda a
   `/verificacion`), y cada página exclusiva del investigador vuelve a
   validar el rol en el servidor.
3. **RLS en Postgres.** Cada tabla filtra por `perfil_id = auth.uid()`. Las
   políticas del investigador (`es_investigador_verificado()`) y las vistas
   `vw_*` (`puede_leer_agregados()`, `puede_leer_por_participante()`)
   exigen además `sesion_staff_verificada()`. Las vistas no exponen
   columnas identificables. Un trigger impide cambiar `perfiles.rol` desde
   la API pública (`impedir_cambio_de_rol()`).

**Segundo factor del staff.** Al entrar a `/admin`, el investigador y la
autoridad reciben por correo un código de 6 dígitos (vence en 10 minutos,
5 intentos, reenvío cada 60 s). La confirmación se guarda en
`verificaciones_sesion`, ligada al `session_id` del JWT de Supabase Auth:
vale mientras dure esa sesión y se borra en cascada al cerrarla. La tabla
no es accesible desde la API; la escribe el servidor con la service role
(`src/lib/services/verificacion-staff.ts`).

**Correos de autenticación.** Supabase llama al Send Email Hook
(`/api/webhooks/correo-auth`), que verifica la firma (Standard Webhooks),
arma el enlace hacia `/auth/confirm` con el dominio de la app y envía con la
Gmail API desde la cuenta de la UMG (`src/lib/email/`).

## 5. Rutas

| Ruta | Rol | Contenido |
|---|---|---|
| `/` | público | Página de inicio |
| `/login`, `/registro`, `/consentimiento` | público | Autenticación y consentimiento informado |
| `/olvide-contrasena` | público | Pide el enlace para restablecer la contraseña |
| `/restablecer-contrasena` | con sesión de recuperación | Elegir la contraseña nueva |
| `/verificacion` | investigador, autoridad | Código por correo antes de entrar a `/admin` |
| `/dashboard` | participante | Accesos rápidos y progreso propio por actividad |
| `/actividades`, `/actividades/<actividad>` | participante | Listado y las seis actividades |
| `/herramientas`, `/herramientas/<herramienta>` | participante | Pomodoro, Kanban, Hábitos y Calendario |
| `/informes`, `/informes/[sessionId]` | participante | Historial y detalle del informe; se refresca cada 3 s mientras está `pendiente` |
| `/admin` | investigador, autoridad | Panel sobre las vistas agregadas y exportación CSV |
| `/admin/participantes` | investigador | Consentimiento, avance e informes por participante; reintento manual de informes |
| `/admin/reporte` | investigador, autoridad | Reporte agregado del taller, imprimible |
| `/admin/analisis/*` | investigador | Análisis por participante, dimensión y ensayo (ver §10) |

| Endpoint | Método | Quién lo llama |
|---|---|---|
| `/api/sessions/[sessionId]/complete` | `POST` | Participante (cierra la sesión y pide el informe) |
| `/api/activity-runs/[runId]/abandon` | `POST` | Navegador con `sendBeacon` al cerrar la página a mitad de una ronda |
| `/api/webhooks/ai-report` | `POST` | n8n, con el header `X-Webhook-Secret` |
| `/admin/export?dataset=…` | `GET` | `dimensiones`, `actividades`, `eventos`, `sesiones`, `herramientas` (staff); `participantes`, `ensayos` (solo investigador) |

## 6. Modelo de datos

```
auth.users (Supabase Auth)
   └─ 1:1 ─ perfiles (id, nombre_completo, rol)
                 ├─ 1:N ─ consentimientos (version_consentimiento, aceptado_en)
                 ├─ 1:N ─ sesiones (estado, iniciada_en, finalizada_en)
                 │           ├─ 1:N ─ eventos_interaccion (tipo_evento, datos, ocurrido_en)
                 │           ├─ 1:N ─ intentos_actividad (tipo_actividad, version_protocolo, estado, contexto de dispositivo)
                 │           │           ├─ 1:N ─ ensayos_actividad (indice_ensayo, condicion, inicio_estimulo_ms, tiempo_reaccion_ms, respuesta, correcto, tipo_entrada, valido)
                 │           │           └─ 1:0..1 ─ resultados_actividad (intento_id)
                 │           ├─ 1:N ─ resultados_actividad (tipo_actividad, duracion_ms, precision, nivel_alcanzado, metricas, version_protocolo)
                 │           └─ 1:1 ─ informes_ia (estado, perfil_atencional, fortalezas, areas_de_mejora, recomendaciones, respuesta_cruda)
                 ├─ 1:N ─ sesiones_pomodoro (duracion_trabajo/descanso_minutos, ciclos_completados, interrumpida, veces_pausado, ms_pausado)
                 ├─ 1:N ─ tareas_kanban (titulo, estado, posicion)
                 ├─ 1:N ─ habitos (nombre, archivado)
                 │           └─ 1:N ─ registros_habito (fecha, completado)
                 └─ 1:N ─ eventos_calendario (titulo, inicio_en, fin_en, completado)
```

- **`sesiones`**: `en_progreso`, `completada` o `abandonada`. El layout del
  participante reutiliza la sesión `en_progreso` más reciente o crea una.
- **`intentos_actividad`**: un intento registrado de una actividad, con estado
  `en_curso`, `completada` o `incompleta`, la copia de los parámetros
  usados (`config`) y el contexto del dispositivo (tipo, entrada
  predominante, viewport, navegador, sistema, pérdidas de visibilidad).
- **`ensayos_actividad`**: un ensayo de un intento, con su condición,
  tiempos relativos al inicio de la ronda, respuesta y validez.
- **`resultados_actividad`**: el resumen de un intento. `version_protocolo`
  distingue las mecánicas actuales (`v2`) de las anteriores (`v1`).
- **`eventos_interaccion`**: eventos de captura pasiva (§8) con `datos`
  jsonb.

Las vistas de análisis (sección 6 de `supabase/migrations/20261019000000_esquema.sql`) cuentan
solo perfiles `participante` y solo datos `v2`, y las puede leer el rol de
solo lectura `lector_powerbi`:

| Vista | Nivel |
|---|---|
| `vw_resumen_resultados_actividad` | Por actividad |
| `vw_resumen_sesiones` | Por día y estado |
| `vw_resumen_eventos_interaccion` | Por día y tipo de evento |
| `vw_resumen_uso_herramientas` | Por día y herramienta |
| `vw_actividades_dimensiones` | Métrica principal por actividad y dispositivo |
| `vw_participantes_analisis` | Una fila por participante seudonimizado (`P-XXXXXX`); solo investigador |
| `vw_ensayos_analisis` | Una fila por ensayo con seudónimo; solo investigador |

La tabla `analisis_excluidos` lista las
cuentas que no forman parte de la cohorte del taller, como las que
probaron la app antes del 10 de octubre. Solo `vw_actividades_dimensiones`
la descuenta, porque es agregada y no permite filtrar por participante; en
las vistas con seudónimo el filtro se hace en Power BI. No tiene acceso
para `anon` ni `authenticated`: la lee la vista, que es `SECURITY DEFINER`.

## 7. Actividades cognitivas

Cada actividad se basa en un paradigma de psicología cognitiva y mide una
dimensión distinta. Los parámetros están en `src/lib/activities/config.ts`.

| Actividad | Paradigma | Dimensión | Métrica principal | Ronda registrada |
|---|---|---|---|---|
| Reaction Test | Psychomotor Vigilance Task | Alerta | TR medio y su desviación estándar | 22 ensayos, espera de 2 a 10 s |
| Focus Flow | SART | Atención sostenida | % de comisión (responder al 3) | 108 ensayos, 12 objetivos |
| Memory Matrix | Bloques de Corsi | Memoria de trabajo visoespacial | Span | Longitud 2 a 9, 2 intentos por nivel |
| Word Sprint | Stroop | Atención selectiva e inhibición | Precisión e interferencia | 48 ensayos, 50 % congruentes |
| Pattern Hunt | Búsqueda visual por rasgo y conjunción | Atención selectiva visual | TR de detección | 48 ensayos (2 tipos × 6/12/18 × presente/ausente) |
| Deep Read | Lectura con notificaciones simuladas | Resistencia a la distracción | Comprensión (de 8) | 418 palabras, 3 notificaciones, 8 preguntas |

Componentes:

1. **`ActivityShell`** (`src/components/activities/activity-shell.tsx`):
   motor común de todas las actividades. Recorre instrucciones, práctica,
   cuenta regresiva, ronda registrada a pantalla completa, guardado y
   resultado. Pide Wake Lock, cuenta las pérdidas de visibilidad y captura
   el contexto del dispositivo.
2. **Hooks de medición.** `useTrialClock` marca el inicio del estímulo en
   el frame en que se pinta, acepta una sola respuesta por ensayo y lo
   invalida si la pestaña se oculta. `useResponseInput` escucha
   `pointerdown` y teclas, toma el tiempo de `event.timeStamp` y registra
   el tipo de entrada.
3. **Una `Round` por actividad** (`*-round.tsx`): estímulos y reglas.
4. **Métricas** en `src/lib/activities/<actividad>/metrics.ts`: funciones
   puras, probadas en `tests/unit/`, que devuelven un `ActivitySummary`
   (métrica principal, todas las métricas, el subconjunto que va al
   informe y una frase descriptiva).
5. **Persistencia** (`src/lib/services/activity-runs.ts`): la fila de
   `intentos_actividad` se crea al empezar la ronda. Al terminar, intento,
   ensayos y resumen se guardan en un lote idempotente con 3 reintentos; si
   falla, quedan en una cola de `localStorage` que `PendingRunsFlusher`
   vacía al volver a `/actividades`.

Estados de una actividad:

```
[Instrucciones] → [Práctica] → [Práctica lista] ─(repetir, máx. 1)→ [Práctica]
                                     │
                                     └→ [Cuenta regresiva] → [En curso] → [Guardando] → [Completada]
                                                                  │
                                    (salir / cerrar la página) ───┴→ [Incompleta]
```

La práctica no se guarda. Durante la ronda registrada no se muestra si
una respuesta fue correcta, salvo en Memory Matrix, donde subir de nivel
es parte de la dinámica.

## 8. Captura pasiva y herramientas

`EventTrackerProvider` monta `useEventTracker` en toda el área del
participante. Registra clics, cambios de visibilidad e inactividad (60 s
sin clic, tecla ni movimiento), los agrupa y los inserta en
`eventos_interaccion` cada 5 s. Las actividades y herramientas reportan sus
propios eventos con `useEventLogger()`:

| Evento | Origen |
|---|---|
| `activity_start`, `activity_end` | Actividades |
| `tool_start`, `tool_end`, `tool_interrupt` | `useToolSession` al abrir y cerrar cada herramienta |
| `tool_progress` | Hitos dentro de una herramienta (tabla siguiente) |
| `session_pulse` | Autorreporte de concentración (1 a 5) que aparece en `/actividades` cada 3 actividades completadas |

| Herramienta | Qué guarda | Hitos de `tool_progress` |
|---|---|---|
| Pomodoro | `sesiones_pomodoro`: duración, ciclos completados, interrupción, pausas y tiempo pausado. Tras cada descanso espera a que la persona reanude. | `work_complete`, `break_complete`, `cycle_resume` (latencia de reanudación) |
| Kanban | `tareas_kanban`, en tres columnas | `task_created`, `status_change`, `task_deleted` |
| Hábitos | `habitos` y `registros_habito`. Solo se marca el día de hoy. | `habit_created`, `checkin` |
| Calendario | `eventos_calendario`; los eventos pasados preguntan "¿Lo hiciste?" | `event_created` (anticipación), `week_navigated`, `reflection` |

## 9. Informe de IA

```
Participante          Next.js (Vercel)                 n8n Cloud            OpenAI
     │  Terminar sesión     │                               │                   │
     │─────────────────────>│ ¿hay desafíos? si no: aviso   │                   │
     │                      │ sesión → completada           │                   │
     │                      │ informes_ia → pendiente        │                   │
     │                      │── POST webhook (resumen) ────>│                   │
     │<── /informes/[id] ───│                               │── chat/completions>│
     │   (refresca c/3 s)   │<── POST /api/webhooks/ai-report (X-Webhook-Secret)│
     │                      │ informes_ia → completado       │                   │
```

1. El botón **"Terminar sesión"** (Server Action) y
   `POST /api/sessions/[sessionId]/complete` usan el mismo orquestador,
   `completeSessionAndRequestReport()` (`src/lib/services/ai-reports.ts`).
   Si la sesión no tiene ningún desafío completado, no la cierra y avisa.
   Si tiene, la marca `completada`, crea el informe `pendiente` y llama a
   `generateAttentionReport()`.
2. `generateAttentionReport()` arma el resumen y lo envía a
   `N8N_AI_REPORT_WEBHOOK_URL`. Sin esa variable, el informe queda
   `pendiente`. Un fallo de red se registra en el log pero no impide cerrar
   la sesión.
3. n8n construye el prompt, llama a OpenAI y devuelve el resultado al
   `callbackUrl` que recibió. El endpoint compara el secreto en tiempo
   constante y solo actualiza informes que siguen `pendiente`.
4. Los informes que no llegan no se reintentan solos: el investigador los
   reintenta desde `/admin/participantes`.

Resumen que recibe n8n:

```json
{
  "sessionId": "…",
  "callbackUrl": "https://<dominio>/api/webhooks/ai-report",
  "sessionDurationMs": 0,
  "deviceType": "mobile | tablet | desktop | null",
  "activities": [
    {
      "activityType": "reaction_test",
      "protocolVersion": "v2",
      "accuracy": 86.36,
      "levelReached": null,
      "durationMs": 171000,
      "attemptsCompleted": 1,
      "incompleteAttempts": 0,
      "deviceType": "mobile",
      "inputType": "touch",
      "metrics": { "rtMeanMs": 312, "…": "…" }
    }
  ],
  "toolUsage": [{ "tool": "pomodoro", "count": 1 }]
}
```

Solo va el primer intento completado de cada actividad. Los demás se
cuentan en `attemptsCompleted`.

El flujo de n8n tiene cinco nodos: **Webhook** (responde de inmediato) →
**Construir prompt** (Code; su código está en
[`docs/n8n/construir-prompt-v2.js`](./docs/n8n/construir-prompt-v2.js)) →
**Generar informe con OpenAI** (HTTP, `gpt-4o-mini`,
`response_format: json_object`) → **Procesar respuesta** (Code) →
**Callback a Next.js** (HTTP con credencial Header Auth
`X-Webhook-Secret`).

## 10. Análisis

`/admin/analisis` lee las vistas de §6 con el cliente del usuario y
calcula en `src/lib/analysis/` (funciones puras, probadas):

- puntaje z dentro de variable × dispositivo (vacío con menos de 3
  personas o sin variación);
- índices pasivo y de dificultad, y el estilo que sale de sus signos;
- correlación de Pearson sobre pares completos (no se muestra con menos
  de 5 pares);
- distribuciones de ensayos, usando solo el primer intento y los ensayos
  válidos.

Son las mismas reglas que las medidas de Power BI. La conexión y los
tableros se explican en [`docs/power_bi.md`](./docs/power_bi.md).
