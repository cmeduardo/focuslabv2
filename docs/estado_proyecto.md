# Estado del proyecto

Actualizado: octubre de 2026.

## Implementado

| Módulo | Estado |
|---|---|
| Registro, inicio de sesión y consentimiento informado | Completo |
| Seis actividades cognitivas (protocolo v2) con datos por ensayo | Completo |
| Cuatro herramientas de productividad con captura de uso | Completo |
| Captura pasiva de eventos (clics, visibilidad, inactividad) | Completo |
| Informe de IA vía n8n Cloud, con reintento manual | Completo |
| Panel del investigador, reporte del taller y exportación CSV | Completo |
| Análisis web (`/admin/analisis`) y vistas para Power BI | Completo |
| Pruebas unitarias (Vitest) y de punta a punta (Playwright) | Completo |
| Despliegue en Vercel | En producción |

## Historial

| Etapa | Fechas | Contenido |
|---|---|---|
| Prototipo | mar – jul 2026 | Primera versión con actividades, herramientas e informes |
| Reconstrucción (Sprint 0) | ago 2026 | Arquitectura por capas y esquema con RLS |
| Sprints 1 – 3 | ago – sep 2026 | Autenticación, captura, actividades y herramientas |
| Sprint 4 | sep 2026 | Informes de IA y panel administrativo |
| Sprint 5 | oct 2026 | Rediseño de actividades (v2), pruebas, análisis |
| Taller piloto | 10 oct 2026 | Aplicación con participantes |
| Ajustes posteriores | oct 2026 | Seguridad, prompt v2.1, cierre de sesiones vacías, análisis limitado a la cohorte del taller, tableros finales de Power BI, correos por Gmail, recuperación de contraseña, confirmación de correo y código por correo para el staff |

Cada etapa tiene un tag en el repositorio (`prototipo-v1`, `sprint-0` …
`sprint-5`, `taller-piloto`).

## Limitaciones y pendientes

**De medición**

- Las métricas no están normadas. Describen una sesión, no permiten
  clasificar a una persona.
- El umbral de lapso de Reaction Test (500 ms) viene del PVT de
  laboratorio. En pantallas táctiles los tiempos son más lentos, por eso
  se analiza por dispositivo.
- Word Sprint usa 50 % de ensayos congruentes con 4 colores, así que la
  palabra predice el color más que al azar. Es una limitación menor del
  diseño.
- En Deep Read las preguntas se responden de memoria, sin volver al texto.
- `detectDeviceType` clasifica como tablet un celular Android cuyo lado
  corto mide 600 px o más. En el taller, una tablet de 598 px quedó como
  celular.
- Un intento sin ninguna respuesta (por ejemplo, Word Sprint con todos los
  ensayos sin contestar) no se marca automáticamente como inválido. El
  prompt le indica al modelo que lo ignore, pero las vistas de análisis lo
  cuentan.
- El autorreporte de concentración (`session_pulse`) es opcional y la
  mayoría de las sesiones del taller no lo respondió, así que
  `pulso_concentracion_promedio` tiene pocos datos.

**De análisis**

- La muestra del taller piloto es pequeña. Las correlaciones son
  exploratorias, sin inferencia causal.

**Técnicas**

- Los informes que no regresan de n8n quedan `pendiente` hasta que el
  investigador los reintenta desde `/admin/participantes`.
- La calidad del informe depende del modelo. Las interpretaciones que el
  modelo contradecía se calculan antes de enviarlas (por ahora, Focus
  Flow).
- En desarrollo local los informes no se completan: la URL de retorno
  apunta a la red de Docker (`172.17.0.1:3000`) y no a la app local. Para
  probarlos hay que usar el despliegue.
- `src/lib/types/database.ts` está escrito a mano. Habría que regenerarlo
  con el CLI de Supabase.
- Las migraciones se aplican a mano en el SQL Editor y la base no tiene
  una tabla de control de migraciones. El esquema base está consolidado
  en `supabase/migrations/20261019000000_esquema.sql`; lo posterior va en
  migraciones nuevas.
- Los correos dependen del refresh token de la cuenta de la UMG. Si se
  cambia la contraseña de esa cuenta o la UMG revoca el acceso, hay que
  generar uno nuevo con OAuth Playground y actualizar `GMAIL_REFRESH_TOKEN`.
- El registro no tiene captcha (Turnstile pendiente). Supabase limita los
  correos por hora, lo que frena el abuso del envío.
- Las pruebas E2E crean usuarios reales en el proyecto de Supabase
  configurado.
