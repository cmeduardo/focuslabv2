# FocusLab

Aplicación web de tesis (Ingeniería en Sistemas de Información, UMG) que
mide y analiza patrones de atención en jóvenes universitarios mediante
actividades cognitivas gamificadas y herramientas de productividad. Al
cerrar una sesión, un flujo de IA genera un informe de perfil atencional
para el participante. **No realiza diagnóstico clínico.**

Caso de estudio: taller piloto en el Centro Cultural Santo Tomás de Aquino.

## Contenido

- [Stack](#stack)
- [Puesta en marcha](#puesta-en-marcha)
- [Base de datos](#base-de-datos)
- [Roles y cuentas](#roles-y-cuentas)
- [Seguridad](#seguridad)
- [Informes con IA (n8n)](#informes-con-ia-n8n)
- [Pruebas](#pruebas)
- [Datos de demostración y limpieza](#datos-de-demostración-y-limpieza)
- [Power BI](#power-bi)
- [Despliegue](#despliegue)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Historial del proyecto](#historial-del-proyecto)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
shadcn/ui · Supabase (PostgreSQL, Auth, RLS) · n8n + GPT-4o-mini ·
Power BI · Vercel. Pruebas con Vitest y Playwright.

## Puesta en marcha

Requisitos: Node.js 20 o superior y un proyecto de Supabase.

```bash
npm install
cp .env.local.example .env.local   # y completar los valores
npm run dev                        # http://localhost:3000
```

Variables de entorno (`.env.local`, nunca se sube a git):

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública; todo lo que hace con ella pasa por RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo en el servidor (webhook de n8n, scripts). Nunca en el navegador. |
| `N8N_AI_REPORT_WEBHOOK_URL` | Webhook de n8n que genera el informe. Opcional: sin ella el informe queda `pendiente`. |
| `AI_REPORT_WEBHOOK_SECRET` | Secreto compartido con n8n para el webhook de retorno. |

Comandos disponibles:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` / `npm start` | Build de producción y servidor. |
| `npm run lint` | ESLint. |
| `npm test` | Pruebas unitarias (Vitest). |
| `npm run test:e2e` | Pruebas de punta a punta (Playwright). |
| `npm run demo:seed` / `npm run demo:purge` | Crea o borra participantes ficticios. |

## Base de datos

El esquema completo (tablas, políticas RLS, vistas agregadas y vistas de
análisis) está en [`supabase/migrations/`](./supabase/migrations). Se
aplica en orden, ya sea con el CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

o pegando cada archivo en el SQL Editor del dashboard, del más antiguo al
más reciente. Las migraciones ya aplicadas no se editan ni se renombran:
cualquier cambio va en una migración nueva.

En el dashboard de Supabase (Authentication → URL Configuration) la URL del
sitio y las de redirección deben apuntar al dominio donde corre la app,
para que funcione el correo de confirmación del registro.

## Roles y cuentas

| Rol | Qué puede hacer |
|---|---|
| `participante` | Registrarse, aceptar el consentimiento, hacer las actividades, usar las herramientas y ver sus propios informes. Es el rol por defecto. |
| `investigador` | Todo el panel `/admin`: datos agregados, participantes, reporte del taller, análisis y exportación CSV. |
| `autoridad` | Solo lectura de `/admin` y `/admin/reporte`, sin datos identificables. |

Toda cuenta nueva es `participante`. El rol no se puede cambiar desde la
aplicación ni desde la API pública (lo impide la base de datos); para dar
otro rol, desde el SQL Editor:

```sql
update public.profiles set role = 'investigador'
where id = (select id from auth.users where email = 'correo@ejemplo.com');
```

## Seguridad

Además de las políticas RLS de cada tabla:

| Medida | Dónde |
|---|---|
| Contraseñas de al menos 10 caracteres, con minúscula, mayúscula, número y símbolo, y sin el correo dentro | `src/lib/auth/password-policy.ts` (formulario y servidor) + Supabase Auth |
| El rol de un perfil solo cambia desde el servidor o el SQL Editor | Migración `20261013000001_profiles_role_lock.sql` |
| Las redirecciones tras el login o la confirmación solo van a rutas internas | `src/lib/auth/safe-redirect.ts` |
| Cabeceras de seguridad: CSP, anti-iframe, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy` | `next.config.ts` |
| Los CSV exportados no ejecutan fórmulas al abrirse en Excel | `src/lib/csv.ts` |
| El webhook de n8n exige un secreto compartido (comparación de tiempo constante) | `src/app/api/webhooks/ai-report/route.ts` |
| La clave `service_role` solo se usa en el servidor | `src/lib/supabase/admin.ts` |

**Configuración del dashboard de Supabase.** No vive en el repositorio y
hay que revisarla en cada proyecto nuevo:

- *Authentication → Sign In / Providers → Email*: largo mínimo de
  contraseña **10** y requisitos **"Lowercase, uppercase letters, digits
  and symbols"** (los mismos del formulario; es lo que frena a quien llame
  a la API directo). *Secure email change* y *Secure password change*
  activados.
- *Authentication → Rate Limits*: límites bajos para inicios de sesión y
  registros por IP, para frenar ataques de fuerza bruta.
- *Advisors → Security Advisor*: sin alertas pendientes.

Las pruebas de `tests/e2e/security.spec.ts` comprueban el bloqueo del rol,
las redirecciones y las cabeceras.

## Informes con IA (n8n)

Cuando el participante pulsa **«Terminar sesión»**, la app marca la sesión
como completada, crea el informe en estado `pendiente` y llama al webhook
de n8n con un resumen de sus resultados. n8n consulta a GPT-4o-mini y
devuelve el informe a `POST /api/webhooks/ai-report`, autenticado con el
header `X-Webhook-Secret`. La página del informe se actualiza sola en
cuanto llega (unos 5 segundos).

Para montar el flujo en otra instancia de n8n:

1. Importar [`docs/n8n/FocusLab - Informe de IA (Sprint 4).json`](./docs/n8n).
2. Crear la credencial de OpenAI y asignarla al nodo «Generar informe con
   OpenAI».
3. Crear una credencial *Header Auth* con nombre `X-Webhook-Secret` y el
   mismo valor que `AI_REPORT_WEBHOOK_SECRET`, y asignarla al nodo
   «Callback a Next.js». La URL de retorno no se configura: la app la
   manda en cada solicitud.
4. Activar el flujo y copiar la URL de producción del webhook a
   `N8N_AI_REPORT_WEBHOOK_URL`.

El detalle de cada nodo está en `ARCHITECTURE.md` §7.

## Pruebas

```bash
npm test            # unitarias: métricas de actividades, informes, análisis
npm run test:e2e    # punta a punta, levanta su propio servidor en el puerto 3100
```

Las pruebas E2E leen `.env.local` y **crean usuarios reales** en el
proyecto de Supabase configurado (correos `@focuslab.test`), que se borran
al terminar. Conviene correrlas contra un proyecto de desarrollo, no contra
el de producción.

## Datos de demostración y limpieza

- `npm run demo:seed -- 20` crea 20 participantes ficticios
  (`@demo.focuslab.test`) con una sesión completa, útiles para armar los
  tableros sin datos reales. `npm run demo:purge` los borra.
- [`supabase/scripts/reset_pre_taller.sql`](./supabase/scripts/reset_pre_taller.sql)
  deja la base limpia antes de un taller: borra lo generado por cuentas que
  no son participantes. **No es una migración**: se ejecuta a mano en el
  SQL Editor y no se puede deshacer.

## Power BI

Los tableros se conectan directo a Supabase con el conector de PostgreSQL,
mediante un rol de solo lectura (`powerbi_reader`) que solo ve las vistas
de análisis, con participantes seudonimizados. La guía paso a paso está en
[`docs/power_bi.md`](./docs/power_bi.md). Las mismas vistas se pueden
consultar en la web en `/admin/analisis`.

## Despliegue

La app se despliega en Vercel desde la rama `main`: cada push genera un
nuevo despliegue. En el proyecto de Vercel se configuran las mismas
variables de entorno de la tabla de arriba. n8n corre aparte, en n8n Cloud.

## Estructura del repositorio

```
src/
├── app/            Rutas: (auth), (participante), admin y api
├── components/     Interfaz: actividades, herramientas, informes, análisis, ui
├── lib/            Lógica: servicios, métricas de actividades, análisis, clientes de Supabase
├── hooks/          Captura de eventos de interacción
└── proxy.ts        Sesión y protección de rutas en cada request
supabase/
├── migrations/     Esquema SQL, RLS y vistas
└── scripts/        Scripts manuales (limpieza previa al taller)
tests/
├── unit/           Vitest
└── e2e/            Playwright
docs/               Diagramas UML, flujo de n8n, guía de Power BI, rediseño de actividades
scripts/            Datos de demostración
```

La arquitectura completa (capas, rutas, modelo de datos, decisiones de
diseño) está en [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Historial del proyecto

| Etapa | Fechas | Contenido |
|---|---|---|
| Prototipo | mar – jul 2026 | Primera versión: actividades, herramientas, dashboard e informes con n8n. |
| Reconstrucción (Sprint 0) | ago 2026 | Nueva arquitectura por capas, esquema de base de datos con RLS. |
| Sprints 1 – 3 | ago – sep 2026 | Autenticación y captura de eventos, seis actividades, cuatro herramientas. |
| Sprint 4 | sep 2026 | Informes con IA y panel administrativo. |
| Sprint 5 | oct 2026 | Rediseño de las actividades, pruebas, análisis para Power BI, ajustes previos al taller. |
| Taller piloto | 10 oct 2026 | Aplicación con participantes en el Centro Cultural Santo Tomás de Aquino. |

Cada etapa tiene un tag en el repositorio (`prototipo-v1`, `sprint-0` …
`sprint-5`, `taller-piloto`).
