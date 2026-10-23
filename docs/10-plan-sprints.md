# 10 · Plan por sprints

Cada sesión dura de 1,5 a 2 horas. Al cerrar cada sprint, el objetivo debe verse funcionando (la demo), y `dev` se fusiona a `main` con un Pull Request.

Leyenda: ✔ hecho · ▶ siguiente · sin marca = pendiente.

## Historial (backend Python, ya cerrado)

| Sprint | Resultado |
| --- | --- |
| ✔ S0 Fundamentos | Herramientas, repo, PostgreSQL en Docker, FastAPI `/health`, laboratorio de 3 VMs |
| ✔ S1 Recolección Linux | Tabla `eventos`, `/ingest` con 409 ante duplicados, parser con pruebas y agente |
| ✔ S2 Detección | Reglas YAML, motor de ventana con pruebas, tabla `alertas`, `/alerts`, 4 reglas Linux. Queda pendiente la prueba con Hydra, que pasa a S3 |

## Backlog del producto (v1)

| ID | Historia | Req. CORE | Sprint |
| --- | --- | --- | --- |
| H1 | Como agente, envío eventos autenticado con mi llave | S2, S3 | S3 |
| H2 | Como sistema, guardo y sello cada evento de forma atómica | B2 | S4 |
| H3 | Como sistema, evalúo reglas en segundo plano | B3 | S3 |
| H4 | Como usuario, inicio sesión y mi sesión se renueva sola | S1, F3 | S4–S5 |
| H5 | Como admin, cierro todas las sesiones de un usuario | S1 | S4 |
| H6 | Como auditor, verifico la integridad de la cadena | — | S4–S5 |
| H7 | Como analista, veo y filtro eventos y alertas | F2 | S5 |
| H8 | Como analista, tomo una alerta y cambio su estado sin pisar a otro | S2, B2 | S6 |
| H9 | Como sistema, recibo eventos de Windows | — | S6 |
| H10 | Como analista, consulto la línea de tiempo de un host, usuario o IP | — | S6 |

## Sprint 3: Reestructuración al CORE · 19 al 25 oct · ▶

**Objetivo:** documentación nueva, monorepo TS y paridad con el backend Python.

| Sesión | Qué se hace | Terminado cuando |
| --- | --- | --- |
| ✔ 13 | Rotar la contraseña de PostgreSQL; documentación nueva en `docs/` y su export a Word | Docs en el repo; el `.docx` antiguo ya no se versiona |
| ▶ 14 | Monorepo pnpm: `apps/api` (Nest), `apps/web` (Vite), `packages/shared`; ESLint/TS estricto; mover el agente Python a `agents/linux` | `pnpm -r typecheck` y `pytest` en verde |
| 15 | Base de la API: configuración Zod, pino + correlation-id, filtro problem+json, TypeORM con migraciones 0001 y `/health` | e2e de `/health` y de errores en verde |
| 16 | Ingesta con `AgentKeyGuard` (migración 0002 parcial: `agentes`); motor y cargador de reglas portados con sus pruebas; cola BullMQ y worker; `/alerts` | 5 pruebas del motor y 2 del cargador pasando |
| 17 | **Demo:** Hydra desde Kali contra SSH de Ubuntu; borrar `app/` (FastAPI, ya retirado el 21 oct) | LINUX-001 salta en menos de 1 min en la API nueva |

## Sprint 4: Seguridad y forense · 26 oct al 1 nov

| Sesión | Qué se hace | Terminado cuando |
| --- | --- | --- |
| 18 | Usuarios con Argon2id, login, emisión del access y del refresh | Se inicia sesión con curl |
| 19 | Rotación, detección de reutilización, límite de sesiones, logout y logout-all | e2e de auth en verde |
| 20 | RBAC global, ABAC (`PolicyGuard`) y throttler en Redis | El auditor recibe 403; una ráfaga de logins recibe 429 |
| 21 | Cadena HMAC con bloqueo pesimista en la ingesta y `/forensics/verify` | Alterar un evento marca FALLO en el eslabón exacto; 20 ingestas concurrentes dejan una cadena válida |

## Sprint 5: Frontend · 2 al 8 nov

| Sesión | Qué se hace | Terminado cuando |
| --- | --- | --- |
| 22 | Cliente Axios con interceptores (refresh en cola y reintentos), store `auth` y guards | Login en el navegador; recargar la página mantiene la sesión |
| 23 | Store `events` normalizado y vista de Eventos con filtros | Se ven y filtran los eventos |
| 24 | Store `alerts` y vista de Alertas (MITRE y severidad) | Se ven las alertas |
| 25 | Vista Verificar cadena (verde o rojo) y rutas por rol | El auditor verifica pero no edita |

## Sprint 6: Windows y flujo de alertas · 9 al 15 nov

| Sesión | Qué se hace | Terminado cuando |
| --- | --- | --- |
| 26 | Agente PowerShell (4624, 4625 y 4720) con llave de agente | Los eventos de Windows llegan a la base |
| 27 | Reglas WIN-001 y WIN-002 con pruebas | Crear un usuario en Windows genera una alerta |
| 28 | Asignación y estados de alertas con bloqueo optimista (migración 0005) | Dos pestañas editando a la vez: la segunda recibe 409 |
| 29 | Línea de tiempo (API y vista) | Sale ordenada y mezcla eventos y alertas |

**Al cerrar el S6 (15 nov), el SIEM es funcional.**

## Sprint 7: Cierre y entrega · 16 nov a diciembre

| Sesión | Qué se hace | Terminado cuando |
| --- | --- | --- |
| 30 | 3 escenarios: fuerza bruta, usuario en Windows y alteración de evidencia | Escenarios documentados con capturas |
| 31 | Pruebas de seguridad: reutilización de refresh, rate limit, XSS en `raw`, IDOR en alertas | Todas en verde y documentadas |
| 32 | Docker Compose completo (api, worker y web con nginx); docs finales y export | `docker compose up` levanta todo |
| 33 | Video demo de 5 a 8 minutos, tag `v1.0` y merge a `main` | Proyecto entregado |

## Si hay atraso

Se recorta en este orden: reglas de Windows → línea de tiempo → asignación de alertas (el ABAC se demuestra con otra política de ownership) → vista Verificar (queda como endpoint).

**Nunca se recorta:** los tres pilares del CORE (seguridad, frontend Vue y backend en capas), la cadena forense con verificador, la recolección de Linux, al menos 4 reglas con pruebas y la documentación.
