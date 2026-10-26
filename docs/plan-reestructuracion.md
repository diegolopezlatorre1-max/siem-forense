# Plan de reestructuración — SIEM Forense Centralizado

## Contexto

El 14 de octubre el proyecto se simplificó a Python/FastAPI + PostgreSQL, sin Redis y sin frontend. La imagen nueva en `docs/` (`Captura de pantalla 2026-10-18 144207.png`) define un **estándar técnico obligatorio ("CORE") para todos los proyectos**, y el estado actual no lo cumple:

| Pilar | Exige | Estado actual |
|---|---|---|
| Seguridad y acceso | Doble token (access en memoria + refresh rotativo en cookie HttpOnly/SameSite=Strict/Secure), revocación de sesiones concurrentes; RBAC/ABAC por endpoint con middleware de *resource ownership*; Argon2id/bcrypt; validación estricta con schemas (Zod/Joi); prevención de XSS/SQLi; rate limiting | Sin autenticación; `/ingest` abierto |
| Frontend | Vue 3 + Pinia + TypeScript estricto (sin `any`); stores normalizados con estados de carga/error/caché; Navigation Guards asíncronos; Axios/Fetch tipado con interceptores y reintentos | No existe |
| Backend y persistencia | Arquitectura limpia (Controladores/Servicios/Repositorios, SOLID); PostgreSQL con migraciones versionadas y transacciones ACID (bloqueo optimista/pesimista); manejo global de excepciones, logs estructurados con `x-correlation-id`, colas en memoria/Redis | Todo en `app/main.py`, `create_all()` sin migraciones, sin colas, sin logs |

**Decisiones tomadas con el usuario:**
1. **Migrar el backend a Node + TypeScript.** Así se cumple de forma literal "TS de punta a punta" y Zod.
2. La documentación nueva se escribe en **Markdown dentro de `docs/`** (la fuente) y además se **exporta a .docx** para la entrega.
3. **El secreto expuesto:** el .docx que está rastreado en Git contiene la contraseña real de PostgreSQL. Hay que **rotarla** y **sacar el archivo del repo**, sin reescribir el historial.

**Resultado esperado:** documentación nueva que describe el proyecto redefinido y, a partir de ella, un monorepo TS (NestJS + Vue 3) que cumple el CORE. Se conservan el corazón forense (cadena de hashes), las reglas YAML y el laboratorio.

---

## Fase 0 — Seguridad inmediata (antes que nada)

> Estado de Git comprobado el 18 oct con `git fetch`: el `dev` local (`0193675`) es igual a `origin/dev`. `origin/main` no tiene commits que falten en dev; solo le falta el trabajo del Sprint 2. La única novedad local es la captura del estándar CORE, que está sin rastrear y se versionará como `docs/assets/estandar-core.png`. El trabajo se hará en una rama `reestructuracion-core` creada desde `dev`.

1. Rotar la contraseña de PostgreSQL en Ubuntu: `ALTER USER siem PASSWORD '...'` y actualizar `.env` allí.
2. `git rm --cached docs/Documentacion_SIEM_Forense.docx`: el archivo queda en local como histórico. Añadir a `.gitignore` las reglas `docs/*.docx` (excepto el export nuevo, ver Fase 1) y `docs/privado/`.
3. Las credenciales salen de toda la documentación versionada. Pasan a `docs/privado/credenciales.md` (ignorado por Git).

---

## Fase 1 — Nueva documentación (`docs/`)

Estructura. Cada archivo es corto y enlaza a los demás:

```
docs/
  README.md                  índice y "dónde vamos" (estado del sprint)
  01-vision-y-alcance.md     qué es, objetivos, alcance v1, fuera de alcance, cambio de rumbo (14 oct → 18 oct)
  02-estandar-core.md        transcripción de la imagen + matriz de cumplimiento (requisito → cómo se cumple → archivo/módulo → prueba)
  03-arquitectura.md         diagrama de componentes, flujo de ingesta→cola→detección→alerta, flujo forense, despliegue en Ubuntu
  04-seguridad.md            modelo de amenazas breve, flujo de doble token, RBAC/ABAC (matriz rol×endpoint), Argon2id, rate limits, cabeceras (helmet/CSP)
  05-backend.md              capas, módulos, convenciones, errores (RFC 7807 problem+json), logging, colas
  06-frontend.md             estructura Vue, stores, guards, cliente Axios, convenciones TS estricto
  07-datos.md                modelo de datos (ERD), migraciones, estrategia de bloqueo (optimista vs pesimista y dónde)
  08-api.md                  contrato de endpoints v1 (se complementa con el OpenAPI generado)
  09-deteccion-y-forense.md  formato de reglas YAML, motor de ventana, MITRE, cadena HMAC y verificación
  10-plan-sprints.md         backlog, sprints redefinidos y orden de recorte
  11-laboratorio.md          (se mueve el contenido de lab/README.md y docker-notas.txt)
  12-bitacora.md             (se mueve NOTAS.md; se conserva el historial de problemas resueltos, sección 5/8 del docx viejo, resumido)
  adr/                       decisiones: 0001-simplificacion-14oct, 0002-adopcion-core-ts, 0003-nestjs-typeorm, 0004-bullmq-redis, 0005-agentes-fuera-del-core
  privado/                   (ignorado) credenciales
  export/SIEM_Forense.docx   generado con pandoc, sí versionado
```

- Export: `pandoc docs/README.md docs/0*.md docs/1*.md -o docs/export/SIEM_Forense.docx --toc` mediante un script `scripts/export-docs.sh`. El README raíz se reescribe con la stack nueva, cómo levantar el proyecto y un enlace a `docs/`.
- Se borran `NOTAS.md`, `lab/README.md` y `docs/docker-notas.txt` después de migrar su contenido.

---

## Fase 2 — Proyecto redefinido (stack y estructura)

**Stack elegida:**
- **Monorepo con pnpm workspaces.** Node 22 LTS en la VM de Ubuntu y en el PC.
- **API: NestJS** (controladores, servicios, repositorios, guards, interceptors y exception filters nativos, de modo que la arquitectura limpia sale de forma natural).
- **ORM: TypeORM** con migraciones versionadas, `@VersionColumn` para el bloqueo optimista y `lock: { mode: 'pessimistic_write' }` para el pesimista.
- **Validación: Zod**, con schemas compartidos entre front y back (`nestjs-zod` para pipes y para el OpenAPI).
- **Cola: BullMQ sobre Redis**, que vuelve al `docker-compose.yml` (ya está definido).
- **Logs:** `nestjs-pino` en JSON, con `x-correlation-id` propagado por la request, los jobs y la respuesta.
- **Seguridad:** `argon2` (Argon2id), `@nestjs/jwt`, `@nestjs/throttler` con almacén en Redis, `helmet` y `cookie-parser`.
- **Web:** Vue 3 + Vite + Pinia + vue-router + Axios, con `strict: true` y `noImplicitAny`. ESLint con `@typescript-eslint/no-explicit-any: error`.
- **Pruebas:** Vitest para unidades (API, shared y web), supertest para e2e de la API y pytest para el agente.

**Estructura objetivo:**
```
apps/
  api/src/
    main.ts, app.module.ts
    common/        correlation-id.middleware, all-exceptions.filter (problem+json), logging, zod-validation.pipe,
                   guards/{jwt-auth, roles, ownership(policy)}, decorators/{Roles, CheckPolicy, CurrentUser}
    config/        schema Zod de variables de entorno (falla al arrancar si falta algo)
    database/      data-source.ts, migrations/
    modules/
      auth/        controller · service · refresh-token.repository · strategies · dto
      users/       roles: admin | analista | auditor
      agents/      API keys de agentes (hash Argon2), guard de ingesta
      events/      POST /ingest → transacción: evento + eslabón forense → encola job
      detection/   rules.loader (YAML + Zod), engine.ts (puerto de motor.py), detection.processor (BullMQ)
      alerts/      listado, asignación, cambio de estado con @VersionColumn (409 si hay conflicto)
      forensics/   chain.service (HMAC-SHA256, SELECT ... FOR UPDATE del último eslabón), GET /forensics/verify
      timeline/    consulta por host/usuario/IP/fecha
    test/          e2e
  web/src/
    api/http.ts    instancia Axios tipada: interceptor que adjunta el access token, en 401 hace un único refresh (cola de peticiones) y reintenta con backoff para errores de red/5xx idempotentes
    stores/        auth (token solo en memoria), events/alerts normalizados {byId, allIds, status, error, fetchedAt}
    router/        guards async: restaurar sesión con /auth/refresh antes de resolver, meta.roles
    views/         Login, Eventos, Alertas, Verificar cadena, Línea de tiempo
packages/
  shared/          schemas Zod + tipos inferidos (EventoIngesta, Alerta, Rol, Paginación, Problem)
agents/
  linux/           parser + colector Python (se mueven app/parsers y app/collectors con sus pruebas); envía con header X-Agent-Key
  windows/         agente PowerShell (Sprint 6)
rules/             YAML sin cambios de formato (LINUX-001..004)
lab/ → docs/11     docker-compose.yml: postgres, redis, api (y web servida por la api o nginx)
```

**Qué se reaprovecha y qué se porta:**
- `app/parsers/auth_linux.py`, `app/collectors/agent_linux.py` y `tests/test_parser.py` se **mueven** a `agents/linux/`. Los agentes son clientes externos y no forman parte del backend (ADR 0005). Solo se añade la cabecera de API key.
- `app/detection/motor.py` se porta a `modules/detection/engine.ts` y `tests/test_motor.py` a `engine.spec.ts`, con los mismos 5 casos.
- `app/detection/reglas.py` se porta a `rules.loader.ts`. La lista `OBLIGATORIOS` pasa a ser un schema Zod.
- La lógica de deduplicación de `app/detection/servicio.py` (misma regla + clave dentro de la ventana) pasa al processor, más la constraint única que ya existe en `alertas`.
- Los modelos `Evento` y `Alerta` de `app/db.py` se convierten en entidades TypeORM y en la migración inicial. Se mantienen los nombres de tabla y columnas para no perder datos del laboratorio. Las tablas nuevas son `usuarios`, `refresh_tokens` (con familia, hash y revocado), `agentes` y `cadena_forense`. `alertas` recibe además `estado`, `asignada_a` y `version`.
- `app/` (FastAPI) se **elimina** cuando la API Nest alcanza la paridad (ingesta + reglas + `/alerts`). Lo mismo pasa con `requirements.txt` (queda solo en `agents/linux/`).

**Puntos clave de diseño del CORE:**
- **Doble token:** access JWT de 10 min, solo en memoria de Pinia. Refresh opaco de 7 días en cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`, guardado como hash. Cada refresh rota el token. Si se **reutiliza** un refresh ya usado, se revoca la familia completa. Hay un límite de N sesiones activas por usuario (la más antigua se revoca), además de `POST /auth/logout-all`.
- **RBAC + ABAC:** `RolesGuard` por endpoint y `PolicyGuard` de ownership. Ejemplo: solo el analista asignado o un admin puede cambiar el estado de una alerta. El auditor es de solo lectura.
- **ACID y bloqueos:** la ingesta hace evento + eslabón en una sola transacción con **bloqueo pesimista** del último eslabón, para que la cadena no se bifurque con ingestas concurrentes. La edición de alertas usa **bloqueo optimista** con `version`.
- **Colas:** `/ingest` responde 202 y encola `evaluate-rules` en BullMQ con el correlationId. Con esto se elimina la evaluación síncrona que hoy hace `ejecutar_reglas()` en cada request.
- **XSS/SQLi:** solo consultas parametrizadas del ORM, sin HTML crudo en Vue (`v-html` prohibido por lint), CSP con helmet y escape del campo `raw` al mostrarlo.

---

## Fase 3 — Sprints redefinidos (hoy es 18 oct; meta funcional a mediados de noviembre)

| Sprint | Fechas | Objetivo / Demo |
|---|---|---|
| S3 Reestructuración | 19–25 oct | Fases 0–1 completas; monorepo, Nest base (config, logs, correlation-id, filtro global, migraciones), `packages/shared`, ingesta con API key, motor y reglas portados con pruebas, worker BullMQ. **Demo:** ataque Hydra desde Kali genera la alerta LINUX-001 en la API nueva (queda cerrada la sesión 13 pendiente). Se borra `app/`. |
| S4 Seguridad + forense | 26 oct–1 nov | Usuarios con Argon2id, doble token con rotación y revocación, RBAC/ABAC, throttler. Cadena HMAC con bloqueo pesimista y `/forensics/verify`. **Demo:** alterar un evento en BD hace que verify marque FALLO en el eslabón exacto; un auditor recibe 403 al modificar. |
| S5 Frontend | 2–8 nov | Vue: login, guards, Axios con refresh y reintentos, stores normalizados, vistas de Eventos, Alertas y Verificar. |
| S6 Windows + flujo de alertas | 9–15 nov | Agente PowerShell (4624/4625/4720), 2 reglas de Windows, línea de tiempo, estados y asignación de alertas con bloqueo optimista. **SIEM funcional.** |
| S7 Cierre | 16 nov–dic | 3 escenarios de ataque, pruebas de seguridad (reutilización de refresh, rate limit, XSS en `raw`), docs finales y export, video, tag v1.0 y merge a main. |

**Orden de recorte** (de primero a último): reglas de Windows → línea de tiempo → asignación de alertas (ABAC se demuestra con otra política) → vista Verificar (queda como endpoint).
**Nunca se recorta:** ninguno de los tres pilares del CORE, la cadena forense con verificador, la recolección de Linux, las 4 reglas con pruebas y la documentación.

---

## Verificación

- `pnpm -r lint && pnpm -r typecheck`: sin `any` y en modo estricto.
- `pnpm -r test`: `engine.spec.ts` reproduce los 5 casos de `test_motor.py`; hay pruebas del loader de reglas, de la cadena (mismo evento da el mismo sello, una alteración se detecta) y de rotación y reutilización del refresh.
- `pnpm --filter api test:e2e` (supertest con Postgres y Redis de docker compose): ingesta sin key da 401; ingesta duplicada da 409; login, refresh y logout-all; auditor recibe 403; PATCH de alerta con versión vieja recibe 409; exceder el rate limit da 429; toda respuesta trae `x-correlation-id` y los errores salen en formato problem+json.
- `cd agents/linux && pytest`: las pruebas del parser siguen pasando.
- **End-to-end en el laboratorio:** `docker compose up -d` en Ubuntu, migraciones, API y worker, agente con `sudo`, `hydra` desde Kali (192.168.56.103) contra SSH y alerta visible en la vista de Alertas en menos de un minuto. Después, `UPDATE eventos SET raw=...` en DBeaver hace que "Verificar cadena" marque rojo.
- `scripts/export-docs.sh` genera `docs/export/SIEM_Forense.docx` sin errores.
