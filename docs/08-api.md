# 08 · API v1

Base: `/api/v1`. Formato JSON. Los errores siguen `application/problem+json` ([05-backend.md](05-backend.md#manejo-global-de-errores)). Toda respuesta trae `x-correlation-id`. El contrato ejecutable (schemas Zod) está en `packages/shared`, y el OpenAPI se genera en `/api/docs`.

> **Estado de implementación (29 oct 2026).** Implementados y verificados en la VM: `/health`,
> `/auth/*`, `POST /ingest`, `GET /events` (filtros host/usuario/IP/tipo/fecha), `GET /alerts`
> (filtros `severidad` y `regla_id`) y `GET /forensics/verify`. **Pendientes (Sprint 6):**
> `GET /events/:id`, `GET /timeline`, `GET /alerts/:id`, `POST /alerts/:id/asignar` y
> `PATCH /alerts/:id` —estos tres últimos necesitan la migración 0005 (`estado`, `asignada_a`,
> `version`)— y el agente de Windows. El filtro por `estado` de `/alerts` también es del Sprint 6.

## Salud

| Método | Ruta | Auth | Respuesta |
| --- | --- | --- | --- |
| GET | `/health` | pública | `{ estado: "ok", db: "ok", redis: "ok" }` |

## Autenticación

| Método | Ruta | Auth | Cuerpo | Respuesta |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | pública | `{ usuario, clave }` | 200 `{ accessToken, usuario: { id, usuario, rol } }` y cookie de refresh |
| POST | `/auth/refresh` | cookie | — | 200 `{ accessToken }` y una cookie nueva |
| POST | `/auth/logout` | Bearer | — | 204, revoca la familia actual |
| POST | `/auth/logout-all` | Bearer | — | 204, revoca todas las sesiones |
| GET | `/auth/me` | Bearer | — | 200 usuario |

## Ingesta (agentes)

| Método | Ruta | Auth | Cuerpo | Respuesta |
| --- | --- | --- | --- | --- |
| POST | `/ingest` | `X-Agent-Key` | `EventoIngesta` | 202 `{ id, secuencia }` · 409 si está duplicado · 400 si no es válido |

```ts
// packages/shared — EventoIngestaSchema (mismos campos que el agente Python actual)
{
  event_id: string (1..64),
  ts: string ISO-8601 con zona,
  host: string (1..120),
  source: string (1..60),
  event_type: 'login_failed' | 'login_success' | 'user_created',
  usuario?: string | null (..120),
  src_ip?: string IP | null,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low',
  raw: string (1..8192)
}
```

## Eventos y línea de tiempo

| Método | Ruta | Roles | Query |
| --- | --- | --- | --- |
| GET | `/events` | todos | `host, usuario, src_ip, event_type, desde, hasta, pagina, tamano (≤100)` |
| GET | `/events/:id` | todos | — |
| GET | `/timeline` | todos | `host?, usuario?, src_ip?, desde, hasta`. Devuelve eventos y alertas mezclados, en orden cronológico |

Las respuestas paginadas tienen la forma `{ items: T[], total, pagina, tamano }`.

## Alertas

| Método | Ruta | Roles | Cuerpo / Query | Notas |
| --- | --- | --- | --- | --- |
| GET | `/alerts` | todos | `estado, severidad, regla_id, pagina, tamano` | Ordenadas por `ts` descendente |
| GET | `/alerts/:id` | todos | — | Incluye los eventos que la provocaron |
| POST | `/alerts/:id/asignar` | admin, analista | `{ usuarioId, version }` | Un analista solo puede asignársela a sí mismo |
| PATCH | `/alerts/:id` | admin, analista asignado | `{ estado, version }` | 409 si `version` no coincide |

## Forense

| Método | Ruta | Roles | Respuesta |
| --- | --- | --- | --- |
| GET | `/forensics/verify` | admin, auditor | `{ integra: boolean, eslabones: n, primerFallo?: { secuencia, eventoId, motivo } }` |
| GET | `/forensics/eslabon/:eventoId` | admin, auditor | El eslabón del evento |

## Administración

| Método | Ruta | Roles |
| --- | --- | --- |
| GET, POST | `/users` | admin |
| PATCH | `/users/:id` (rol, activo) | admin |
| GET, POST | `/agents` | admin. El POST devuelve la llave **una sola vez** |
| POST | `/agents/:id/revocar` | admin |

## Compatibilidad con el backend anterior

| Antes (FastAPI) | Ahora |
| --- | --- |
| `GET /health` | `GET /api/v1/health` |
| `POST /ingest` (abierto, 200) | `POST /api/v1/ingest` (con `X-Agent-Key`, 202) |
| `GET /alerts?limite=` | `GET /api/v1/alerts?tamano=` (requiere Bearer) |
