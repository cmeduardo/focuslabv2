# Decisiones técnicas

Cada entrada explica qué se decidió y por qué. La descripción del sistema
está en [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Plataforma

**Next.js 16 con App Router.** Es la versión estable que había cuando se
reconstruyó la aplicación (agosto de 2026). Permite tener Server
Components, Server Actions y endpoints en un mismo proyecto que se
despliega en Vercel sin configuración adicional. Lo que cambia frente a
versiones anteriores (APIs de request asíncronas, `proxy.ts` en lugar de
`middleware.ts`, Tailwind v4 sin archivo de configuración) se resume en
`ARCHITECTURE.md` §2.

**Supabase con RLS como última barrera.** Las herramientas y actividades
escriben desde el navegador con la clave pública, así que la seguridad no
puede depender solo de la interfaz: cada tabla filtra por
`auth.uid()`. La clave `service_role` se usa solo en el servidor, en los
casos donde no hay usuario (webhook de retorno, reintentos, scripts).

**Capa de servicios.** Toda consulta a la base pasa por
`src/lib/services/`, con funciones `(supabase, params) => …` que reciben
el cliente. La misma función sirve en el servidor y en el navegador, y la
lógica no queda repartida entre páginas.

**El rol no se cambia desde la aplicación.** Un trigger bloquea cualquier
cambio de `perfiles.rol` que no venga del servidor. Así, un participante
no puede darse el rol de investigador llamando a la API directamente.

**Un solo script de esquema.** El proyecto de Supabase no está enlazado al
CLI, así que el esquema se aplica a mano en el SQL Editor. Las migraciones
incrementales se consolidaron en una sola,
`supabase/migrations/20261019000000_esquema.sql`, con el estado final
completo: se lee de una vez y crea un proyecto nuevo idéntico al de
producción. Un cambio posterior va en una migración nueva.

## Actividades

**Un paradigma de psicología cognitiva por actividad.** La primera versión
usaba mecánicas propias y no quedaba claro qué dimensión medía cada una. En
la versión 2 cada actividad replica un paradigma publicado (PVT, SART,
Corsi, Stroop, búsqueda visual, lectura con interrupciones). Así cada
métrica tiene una interpretación conocida y las seis actividades cubren
dimensiones distintas.

**Datos por ensayo, no solo un puntaje.** `ensayos_actividad` guarda cada
estímulo y su respuesta. Con eso se pueden recalcular las métricas, ver
distribuciones y descartar ensayos inválidos (por ejemplo, cuando la
pestaña perdió visibilidad) sin depender del resumen que calculó el
navegador.

**Versión de protocolo en cada resultado.** Las filas de la primera
versión se conservan con `version_protocolo = 'v1'`, pero ninguna vista de
análisis las cuenta: se miden de otra forma y no son comparables.

**Práctica sin registro y ronda sin retroalimentación.** La práctica sirve
para entender la consigna y no se guarda. En la ronda que se registra no
se indica si cada respuesta fue correcta, para no influir en las
siguientes. Memory Matrix es la excepción: subir de nivel es parte de la
tarea.

**Contexto de dispositivo en cada intento.** El taller se hizo con
computadoras y celulares. Una pantalla táctil agrega entre 30 y 80 ms de
latencia, así que el tipo de dispositivo y de entrada se guarda en cada
intento y los análisis se hacen por dispositivo, sin compararlos entre sí.

**Solo cuenta el primer intento.** Repetir una actividad mejora el
resultado por práctica. El informe y las vistas de análisis usan solo el
primer intento completado de cada actividad. Los demás intentos se
guardan y se mencionan solo como interés.

**Guardado que no pierde datos.** Al terminar una ronda, el resultado se
guarda en un lote idempotente (el id lo genera el cliente), con reintentos
y una cola local si no hay red. Si la persona cierra la página a mitad,
`sendBeacon` marca el intento como incompleto.

## Captura de comportamiento

**Hitos de herramientas en `eventos_interaccion`.** Cada señal nueva de una
herramienta (cambio de columna en Kanban, latencia para retomar un
Pomodoro, anticipación al agendar) se guarda como un evento `tool_progress`
con `datos` jsonb, no como una columna nueva. Así no hace falta cambiar
el esquema por cada señal, y las tablas de cada herramienta guardan solo
el estado final.

**Pomodoro espera a la persona tras el descanso.** El siguiente bloque no
arranca solo, para poder medir cuánto tarda la persona en retomar.

**Hábitos: solo se marca el día de hoy.** Los seis días anteriores se ven
pero no se pueden editar. Así el registro refleja lo que la persona marcó
ese día y no se completa hacia atrás.

**Autorreporte por sesión, no por actividad.** Al principio, después de
cada actividad aparecía una pantalla para calificar la concentración, y
resultaba repetitiva. Ahora es un aviso opcional en el listado de
actividades cada tres actividades completadas.

## Informe de IA

**La generación corre fuera de la aplicación (n8n).** El prompt se puede
ajustar sin desplegar la app, y una llamada lenta a OpenAI no bloquea el
cierre de sesión: el webhook responde de inmediato y el informe llega
después por un callback autenticado con un secreto compartido.

**No se cierran sesiones sin actividades.** Después de cerrar una sesión
se abre otra automáticamente. En el taller, pulsar "Terminar sesión" en
esa sesión nueva generó informes vacíos. Ahora la app avisa y deja la
sesión abierta.

**Las interpretaciones que el modelo se equivoca se calculan antes.** En
Focus Flow, aun con la regla escrita en el prompt, el modelo presentaba un
75 % de comisión como fortaleza. Ahora el nodo que arma el prompt calcula
la lectura con los mismos cortes que usa la app y se la pasa al modelo ya
resuelta.

**Lenguaje no clínico.** El prompt prohíbe el vocabulario diagnóstico y
las comparaciones con "lo normal", y describe estilos en lugar de errores.

## Análisis

**Vistas en la base, no cálculos en Power BI.** Las vistas `vw_*` aplican
los criterios (solo participantes, solo v2, primer intento) dentro de la
base de datos. Así Power BI, el panel web y las exportaciones CSV parten
de los mismos números.

**Seudónimos y un rol de solo lectura.** Power BI se conecta con
`lector_powerbi`, que solo puede leer vistas. A nivel de participante se
expone únicamente `P-XXXXXX`, derivado del id. La autoridad académica no
ve ninguna vista por participante.

**El análisis también está en la web.** `/admin/analisis` aplica las
mismas reglas que las medidas DAX con funciones puras probadas, para que
el análisis se pueda consultar sin Power BI y para tener una segunda
forma de verificar las cifras.
