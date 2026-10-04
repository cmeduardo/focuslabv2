# Tableros de Power BI (RF-13, RF-15)

Guía para armar en Power BI Desktop los tableros del capítulo 5, conectados
directo a Supabase con el conector nativo de PostgreSQL. Las vistas que se
usan las crea la migración `20261004000002_analysis_views.sql`.

## 1. Criterios del análisis

- **Solo datos v2.** Las mecánicas anteriores (v1) no cumplen el enfoque
  actual y no se incluyen en ninguna vista.
- **Solo participantes.** Las vistas excluyen los perfiles `investigador` y
  `autoridad`, para que las pruebas del investigador nunca contaminen el
  análisis.
- **Unidad de análisis: el participante.** Se toma su **primer intento
  completado** de cada desafío. Es el mismo criterio que usa el informe de
  IA: los reintentos tienen efecto de práctica.
- **Dispositivo como variable.** Los tiempos de reacción en celular son de
  30 a 80 ms más lentos por la latencia táctil. Se reportan por separado y
  no se comparan entre dispositivos.
- **Seudónimos.** El nivel participante usa `participante = P-XXXXXX`
  (hash del id). Nunca se exponen el nombre ni el correo.

## 2. Conexión

**Paso 1 (una sola vez, en el SQL Editor de Supabase).** Activa el rol de
solo lectura con una contraseña que elijas. No la guardes en el repo.

```sql
alter role powerbi_reader with login password 'UNA-CONTRASEÑA-LARGA';
```

**Paso 2 (en Power BI Desktop).** Ve a Obtener datos → Base de datos
PostgreSQL y completa:

- **Servidor:** el host del *Session pooler*, por ejemplo
  `aws-0-<región>.pooler.supabase.com:5432`. Está en Supabase → Connect →
  Session pooler. Hay que usar el pooler porque la conexión directa es solo
  IPv6 en el plan gratuito.
- **Base de datos:** `postgres`.
- **Modo:** Importar. Las vistas son livianas; se actualiza con "Actualizar".
- **Credenciales (pestaña "Base de datos"):** usuario
  `powerbi_reader.pnujclczjylrlxhzrmbz` (el pooler exige el sufijo con el ref
  del proyecto) y la contraseña del paso 1.
- **Si pregunta por cifrado:** dejar SSL activado.

**Paso 3.** Selecciona las vistas que necesita cada archivo (sección 4).

## 3. Vistas disponibles

| Vista | Nivel | Quién la ve | Para qué |
|---|---|---|---|
| `vw_actividades_dimensiones` | Agregado por desafío × dispositivo | Investigador, autoridad, Power BI | Media, DE, rango de la métrica principal y precisión |
| `vw_activity_results_summary` | Agregado por desafío | Investigador, autoridad, Power BI | Conteos y precisión media |
| `vw_sessions_summary` | Agregado por día × estado | Investigador, autoridad, Power BI | Asistencia y duración de sesiones |
| `vw_interaction_events_summary` | Agregado por día × tipo de evento | Investigador, autoridad, Power BI | Volumen de eventos pasivos |
| `vw_tool_usage_summary` | Agregado por día × herramienta | Investigador, autoridad, Power BI | Uso de Pomodoro y Kanban |
| `vw_participantes_analisis` | Una fila por participante | Investigador, Power BI | Hipótesis H1 y H2: métricas cognitivas y variables pasivas |
| `vw_ensayos_analisis` | Una fila por ensayo | Investigador, Power BI | Distribuciones de TR, efecto por condición |

Columnas de `vw_participantes_analisis`:

- **Cognitivas:**
  - Reaction Test: `rt_promedio_ms`, `rt_desv_ms`, `rt_lapsos`,
    `rt_anticipaciones`.
  - Focus Flow: `ff_comision_pct`, `ff_omision_pct`, `ff_rt_ms`.
  - Memory Matrix: `mm_span`, `mm_secuencias_correctas`.
  - Word Sprint: `ws_precision_pct`, `ws_interferencia_ms`.
  - Pattern Hunt: `ph_deteccion_ms`, `ph_pendiente_conjuncion`,
    `ph_precision_pct`.
  - Deep Read: `dr_comprension`, `dr_palabras_minuto`,
    `dr_notificaciones_ignoradas`, `dr_salidas_pestana`.
- **Pasivas (H1):** `cambios_pestana_por_sesion`, `inactividad_promedio_s`,
  `periodos_inactividad`, `pomodoro_interrupcion_pct`,
  `pomodoro_pausas_promedio`, `eventos_totales`, `clics`,
  `sesion_minutos_promedio`.
- **Subjetiva:** `pulso_concentracion_promedio` (1 a 5).
- **Contexto:** `dispositivo_principal`, `actividades_completadas`,
  `sesiones`.

## 4. Archivos y tableros propuestos

Dos archivos `.pbix`, para cumplir RS-04 y RF-15:

- **`FocusLab-Autoridades.pbix`**: solo vistas agregadas. Es el que se
  comparte (o se exporta a PDF) con las autoridades académicas.
- **`FocusLab-Investigador.pbix`**: incluye además las vistas de
  participante y de ensayo.

### Tablero 1. Resumen del taller (ambos archivos)

- **Tarjetas:** participantes con resultados, sesiones, % de sesiones
  completadas y participantes por dispositivo.
- **Gráfico de columnas:** sesiones por día (`vw_sessions_summary`).
- **Gráfico de anillo:** participantes por dispositivo
  (`vw_actividades_dimensiones`, filtrado a `reaction_test`).
- **Tabla:** uso de herramientas (`vw_tool_usage_summary`).

### Tablero 2. Dimensiones atencionales (ambos archivos)

- **Una tarjeta múltiple por dimensión:** `valor_promedio` ±
  `valor_desv_estandar`, con su `metrica_principal`.
- **Columnas agrupadas:** `valor_promedio` por `activity_type`, con leyenda
  `device_type` y barras de error con la DE (Análisis → Barras de error).
- **Segmentador:** `device_type`.

### Tablero 3. Patrones diferenciados (H1, solo investigador)

- **Dispersión:** `cambios_pestana_por_sesion` (eje X) vs.
  `ff_comision_pct` (eje Y), con un punto por `participante`, color por
  `dispositivo_principal` y línea de tendencia (Análisis).
- **Dispersión:** `inactividad_promedio_s` vs. `rt_lapsos`.
- **Dispersión:** `dr_salidas_pestana` vs. `dr_comprension`.
- **Matriz de correlaciones:** tabla con las medidas DAX de la sección 5
  entre variables pasivas (filas) y cognitivas (columnas), con formato
  condicional de color.
- **Opcional, agrupación:** visual de dispersión → "Buscar clústeres
  automáticamente" sobre dos o tres métricas estandarizadas, para mostrar
  perfiles diferenciados.

### Tablero 4. Variables pasivas y perfil (H2, solo investigador)

- **Tabla por participante:** métricas cognitivas, variables pasivas y
  `pulso_concentracion_promedio`, con formato condicional.
- **Columnas apiladas:** `pomodoro_interrupcion_pct` por participante.
- Sirve de apoyo para el cotejo cualitativo entre el informe de IA y los
  datos de comportamiento (criterio de validación de H2).

### Tablero 5. Detalle por ensayo (solo investigador)

- **Histograma de `rt_ms`** (`vw_ensayos_analisis`, filtrado a
  `activity_type = reaction_test` y `valid = true`), con segmentador por
  `device_type`.
- **Word Sprint:** promedio de `rt_ms` por condición. Columna personalizada
  en Power Query:
  `congruente = Record.Field(Json.Document([condition]), "congruent")`.
- **Pattern Hunt:** líneas de `rt_ms` promedio vs. `setSize` (extraído de
  `condition`), con leyenda por `type`. Muestra la pendiente de búsqueda.

## 5. Medidas DAX

```dax
// Participantes con datos en la variable seleccionada
Participantes = DISTINCTCOUNT ( vw_participantes_analisis[participante] )

// Correlación de Pearson entre dos columnas (ejemplo: cambios de pestaña
// vs. comisiones en Focus Flow). Duplicar cambiando las dos columnas.
Corr Pestaña vs Comisión =
VAR T =
    FILTER (
        vw_participantes_analisis,
        NOT ISBLANK ( vw_participantes_analisis[cambios_pestana_por_sesion] )
            && NOT ISBLANK ( vw_participantes_analisis[ff_comision_pct] )
    )
VAR n = COUNTROWS ( T )
VAR mx = AVERAGEX ( T, vw_participantes_analisis[cambios_pestana_por_sesion] )
VAR my = AVERAGEX ( T, vw_participantes_analisis[ff_comision_pct] )
VAR cov = SUMX ( T, ( vw_participantes_analisis[cambios_pestana_por_sesion] - mx ) * ( vw_participantes_analisis[ff_comision_pct] - my ) )
VAR sx = SQRT ( SUMX ( T, ( vw_participantes_analisis[cambios_pestana_por_sesion] - mx ) ^ 2 ) )
VAR sy = SQRT ( SUMX ( T, ( vw_participantes_analisis[ff_comision_pct] - my ) ^ 2 ) )
RETURN IF ( n >= 3 && sx * sy > 0, DIVIDE ( cov, sx * sy ) )

// Promedio ponderado por participantes en la vista agregada
Media ponderada =
DIVIDE (
    SUMX ( vw_actividades_dimensiones, vw_actividades_dimensiones[valor_promedio] * vw_actividades_dimensiones[participantes] ),
    SUM ( vw_actividades_dimensiones[participantes] )
)
```

Con una muestra pequeña (un solo taller), conviene reportar las
correlaciones como **exploratorias**, junto con n y sin inferencias causales.
Si se necesitan pruebas de significancia, se pueden calcular desde la
exportación CSV "Participantes" (por ejemplo, en Excel o en Python).

## 6. Datos de demostración

Para armar los tableros antes del taller hay 20 participantes ficticios
(`npm run demo:seed`, correos `@demo.focuslab.test`), generados a partir de
rasgos latentes para que las relaciones de H1 tengan forma. Sus métricas se
calculan con las mismas funciones de la app.

Se borran con `npm run demo:purge` o con
`supabase/scripts/reset_pre_taller.sql`. **Hay que borrarlos antes del
taller real**: las vistas los cuentan como participantes.

## 7. Exportaciones desde la app (alternativa sin Power BI)

`/admin` → CSV:

- Datasets agregados, para investigador y autoridad: Dimensiones,
  Actividades, Eventos, Sesiones y Herramientas.
- Datasets seudonimizados, solo para el investigador: Participantes y
  Ensayos.

`/admin/reporte` → "Descargar PDF" genera el reporte agregado del taller con
el diálogo de impresión del navegador.
