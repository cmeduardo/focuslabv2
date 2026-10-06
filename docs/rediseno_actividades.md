# Rediseño de las actividades cognitivas (v2)

Fecha: 2026-10-04. Cada una de las seis actividades mide ahora una dimensión
distinta de la atención, sobre un paradigma clásico de psicología cognitiva.
Funciona igual en laptop y en celular, guarda datos por ensayo y registra el
contexto de dispositivo. Todos los parámetros viven en
`src/lib/activities/config.ts`.

## 1. Resumen por actividad

| Actividad | Paradigma de base | Dimensión atencional | Métrica principal | Métricas complementarias | Duración aprox. |
|---|---|---|---|---|---|
| Reaction Test | Psychomotor Vigilance Task (Dinges y Powell, 1985) | Alerta / vigilancia | TR promedio (ms) y su desviación estándar | Mediana, lapsos (> 500 ms), anticipaciones (< 100 ms o antes del estímulo), 10 % más rápido / más lento, tendencia 1.ª vs. 2.ª mitad, precisión (% respuestas válidas) | 3 min (22 ensayos, espera de 2 a 10 s) |
| Focus Flow | SART (Robertson et al., 1997) | Atención sostenida | Tasa de errores de comisión (% de "3" respondidos) | Omisiones, TR medio y DE en aciertos, CV, TR previo a una comisión vs. a una inhibición correcta, precisión | 2.5 min (108 ensayos × 1.15 s, 12 objetivos = 11 %) |
| Memory Matrix | Bloques de Corsi (1972) | Memoria de trabajo visoespacial | Nivel máximo (span, en bloques) | Secuencias correctas, errores de orden vs. de bloque, tiempo de respuesta por secuencia, ms por bloque, latencia del primer toque, precisión | 2 a 4 min (longitud 2 a 9, 2 intentos por nivel) |
| Word Sprint | Efecto Stroop (Stroop, 1935) | Atención selectiva e inhibición | Precisión global (%) | TR congruente, TR incongruente, efecto de interferencia (solo aciertos), precisión por condición, sin respuesta, interferencia por mitad | 2.5 min (48 ensayos, 50 % congruentes) |
| Pattern Hunt | Búsqueda visual (Treisman y Gelade, 1980) | Atención selectiva visual | Velocidad de detección (TR en aciertos con objetivo presente) | Precisión, pendiente de búsqueda (ms por elemento) por tipo (rasgo / conjunción) y presencia, omisiones, falsas alarmas, tabla de TR por tipo × tamaño × presencia | 3 min (48 ensayos: 2 tipos × 6/12/18 × presente/ausente × 4) |
| Deep Read | Lectura con distractores | Resistencia a la distracción | Puntuación de comprensión (de 5) | Tiempo de lectura, palabras por minuto, notificaciones cerradas / abiertas / ignoradas, tiempo de reacción a la notificación, salidas de pestaña, literal vs. inferencia, cambios de respuesta | 4 min (418 palabras, 3 notificaciones, 5 preguntas) |

Todas las actividades guardan tiempo, precisión y nivel cuando aplica (RF-05):
`activity_results.duration_ms`, `accuracy` y `level_reached` (este último solo
en Memory Matrix).

Cada actividad empieza con instrucciones y una ronda de práctica de 1 a 6
ensayos, con retroalimentación inmediata. La práctica se puede repetir una vez
y **no se guarda ni se envía a n8n**. La ronda registrada no muestra si se
acertó o no; la excepción es Memory Matrix, donde el avance de nivel es parte
de la dinámica.

## 2. Cambios de esquema

Migración `supabase/migrations/20261004000001_activity_runs_trials.sql`,
estrictamente aditiva: no borra ni renombra nada.

**Tipos nuevos:** `activity_run_status` (`en_curso`, `completada`,
`incompleta`), `device_type` (`mobile`, `tablet`, `desktop`) e `input_type`
(`touch`, `mouse`, `keyboard`). **Función nueva:** `has_accepted_consent()`
(security definer).

**`activity_runs`** (nueva; una fila por intento registrado de una actividad):

- Identidad y estado: `id` (lo genera el cliente, para que guardar sea
  idempotente), `session_id` → sessions, `user_id` → profiles,
  `activity_type`, `protocol_version` (`'v2'`), `status`, `started_at`,
  `ended_at`.
- Ejecución: `practice_rounds` (0 a 2) y `config` (jsonb, copia de los
  parámetros usados).
- Contexto de dispositivo: `device_type`, `input_primary`, `input_counts`
  (jsonb, conteo por tipo de entrada), `viewport_w`, `viewport_h`,
  `device_pixel_ratio`, `orientation`, `browser`, `os`, `refresh_hz_est`
  (estimada con requestAnimationFrame) y `visibility_losses`.

**`activity_trials`** (nueva; una fila por ensayo registrado):

- Identidad: `id`, `run_id` → activity_runs, `user_id`, `trial_index`, con
  `unique(run_id, trial_index)`.
- Condición: `condition` (jsonb: congruente, tamaño de conjunto, objetivo
  presente, dígito, longitud...).
- Tiempos, en ms relativos al inicio de la ronda: `stimulus_onset_ms`,
  `response_at_ms`, `rt_ms`.
- Respuesta: `response`, `response_detail` (jsonb: toques de Memory Matrix,
  notificaciones de Deep Read), `correct`, `classification`, `input_type`.
- Validez: `valid` e `invalid_reason` (la pestaña perdió visibilidad durante
  el ensayo).

**`activity_results`** (aditiva): `run_id` → activity_runs (único) y
`protocol_version` (`'v1'` por defecto en las filas anteriores, `'v2'` en las
nuevas).

**`vw_activity_results_summary`**: agrupa también por `protocol_version`
(columna nueva al final).

**RLS (RS-02 y RS-05)**:

- Las dos tablas nuevas tienen `select_own` e `insert_own` por
  `user_id = (select auth.uid())`. `activity_runs` también tiene `update_own`.
  Ambas tienen `select_researcher`.
- El insert exige además `has_accepted_consent()` y que la sesión o la corrida
  pertenezcan al mismo usuario.

**Relaciones:** sessions 1:N activity_runs; activity_runs 1:N activity_trials;
activity_runs 1:0..1 activity_results.

## 3. Cambios para los diagramas del capítulo 5

### Diagrama ER

Agregar `activity_runs` y `activity_trials` con los atributos de la sección
2, más las columnas nuevas de `activity_results` (`run_id`,
`protocol_version`). Relaciones: `sessions ─1:N─ activity_runs ─1:N─
activity_trials`, `activity_runs ─1:0..1─ activity_results`, y `profiles
─1:N─` ambas tablas nuevas (por `user_id`).

### Diagrama de clases

- **ActivityRun**: id, sessionId, activityType, protocolVersion, status,
  practiceRounds, config, DeviceContext, visibilityLosses; métodos `start()`,
  `complete(trials, summary)`, `markIncomplete()`.
- **TrialRecord**: trialIndex, condition, stimulusOnsetMs, responseAtMs, rtMs,
  response, detail, correct, classification, inputType, valid, invalidReason.
- **DeviceContext**: deviceType, viewportW, viewportH, devicePixelRatio,
  orientation, browser, os, refreshHzEst.
- **ActivitySummary**: accuracy, levelReached, primary, metrics, report,
  styleNote.
- **ActivityShell** (motor común): compone `useTrialClock`,
  `useResponseInput` y `useWakeLock`, y delega en `Round` (una por actividad)
  y en `summarize()` (una función pura por actividad).

### Diagrama de estados de una actividad

```
[Instrucciones] → [Práctica] → [Práctica lista] ─(repetir, máx. 1)→ [Práctica]
                                     │
                                     └→ [Cuenta regresiva] → [En curso] → [Guardando] → [Completada]
                                                                  │
                                    (salir / cerrar la página) ───┴→ [Incompleta]
```

"En curso", "Completada" e "Incompleta" son los estados que persisten en
`activity_runs.status`. Si el guardado falla, el resultado queda en una cola
local y se reintenta al volver a /actividades.

### Diagrama de componentes

Componentes nuevos:

- Motor común:
  - `ActivityShell`: `src/components/activities/activity-shell.tsx`.
  - `RoundProgress`: `src/components/activities/round-progress.tsx`.
- Rondas, una por actividad: `ReactionTestRound`, `FocusFlowRound`,
  `MemoryMatrixRound`, `WordSprintRound`, `PatternHuntRound`,
  `DeepReadRound`.
- `PendingRunsFlusher`.
- Hooks: `useTrialClock`, `useResponseInput`, `useWakeLock`.
- Lógica pura: `lib/activities/` (`config`, `stats`, `rng`,
  `device-context`, `report`, y `<actividad>/{trials,metrics}`).
- Servicio: `lib/services/activity-runs.ts`.
- Endpoint: `POST /api/activity-runs/[runId]/abandon` (sendBeacon al cerrar
  la página).

Se retiraron `useActivityResult`, `ActivityIntro`, `ActivityResult`,
`ActivityLayout`, los seis `*-game.tsx`, `stroop-colors.ts` y
`deep-read-passages.ts`.

## 4. Payload de n8n y ajuste del prompt

`buildSessionSummary` (`src/lib/services/ai-reports.ts`) ahora envía lo
siguiente:

```json
{
  "sessionId": "…",
  "callbackUrl": "…",
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
      "metrics": { "dimension": "alerta (vigilancia)", "rtMeanMs": 312, "…": "…" }
    }
  ],
  "toolUsage": [{ "tool": "pomodoro", "count": 1 }]
}
```

- Solo va el **primer intento completado** de cada actividad en la sesión. Los
  demás intentos se cuentan en `attemptsCompleted`.
- `metrics` es el subconjunto curado `ActivitySummary.report`. Las filas v1 no
  lo traen.
- Al completar la sesión, toda corrida que siga `en_curso` pasa a
  `incompleta`.

**Prompt del agente:** el código completo del nodo "Construir prompt" está en
`docs/n8n/construir-prompt-v2.js`. Agrega:

- Reglas de lenguaje no clínico más explícitas: estilos y tendencias, nunca
  "errores", "normal" ni comparaciones con una población.
- La advertencia de no interpretar como rasgo personal la diferencia de
  tiempos entre celular y laptop.
- Una guía de interpretación por dimensión para cada una de las seis
  actividades.

## 5. Pantallas por actividad (para capturas de prototipos)

Las cuatro pantallas de cada actividad viven en la misma ruta y son estados
del `ActivityShell`. La práctica y la ejecución se muestran a pantalla
completa.

| Actividad | Ruta | Instrucciones | Práctica | Ejecución | Resultado |
|---|---|---|---|---|---|
| Reaction Test | `/actividades/reaction-test` | al cargar | "Empezar práctica" | "Comenzar el reto" | al terminar los 22 ensayos |
| Focus Flow | `/actividades/focus-flow` | al cargar | "Empezar práctica" | "Comenzar el reto" | al terminar los 108 ensayos |
| Memory Matrix | `/actividades/memory-matrix` | al cargar | "Empezar práctica" | "Comenzar el reto" | al fallar dos intentos de un nivel (o llegar a 9) |
| Word Sprint | `/actividades/word-sprint` | al cargar | "Empezar práctica" | "Comenzar el reto" | al terminar los 48 ensayos |
| Pattern Hunt | `/actividades/pattern-hunt` | al cargar | "Empezar práctica" | "Comenzar el reto" | al terminar los 48 ensayos |
| Deep Read | `/actividades/deep-read` | al cargar | "Empezar práctica" | "Comenzar el reto" | tras la 5.ª pregunta |

Pantallas intermedias que también conviene capturar: "¡Práctica lista!" (con
"Practicar otra vez"), la cuenta regresiva, el aviso "Gira tu teléfono"
(Memory Matrix, Word Sprint y Pattern Hunt en celular horizontal) y la
confirmación de salida ("Tu ronda quedará incompleta").

## 6. Decisiones tomadas y pendientes

**Decididas (2026-10-04):**

- **Datos v1 fuera del análisis.** Todas las vistas de análisis filtran
  `protocol_version = 'v2'` y solo perfiles `participante` (migración
  `20261004000002_analysis_views.sql`). La limpieza física de la base queda en
  `supabase/scripts/reset_pre_taller.sql`, para correr antes del taller.
- **Reportes del admin.** CSV agregado (investigador y autoridad), CSV
  seudonimizado por participante y por ensayo (solo investigador) y reporte
  PDF agregado en `/admin/reporte`.
- **Power BI.** Rol de solo lectura `powerbi_reader` y vistas que lo aceptan.
  La guía de conexión y los tableros están en `docs/power_bi.md`.
- **Prompt de n8n.** Se actualiza en n8n Cloud con
  `docs/n8n/construir-prompt-v2.js`.

**Pendientes:**

1. **Validez de TR en celular.** El umbral de lapso (500 ms) es el del PVT de
   laboratorio. Se analiza por `device_type`, sin comparar entre
   dispositivos.
2. **Stroop al 50 %.** Con 4 colores, la palabra predice la tinta más que al
   azar. Es una limitación menor, para mencionar en la metodología.
3. **Deep Read sin volver al texto.** Las preguntas se responden de memoria.
   Permitir relectura sería un cambio pequeño.
4. **Tipos de Supabase.** `src/lib/types/database.ts` sigue escrito a mano.
   Regenerarlo requiere conectar el CLI o el MCP.
