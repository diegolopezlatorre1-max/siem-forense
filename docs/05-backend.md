# 05 · Backend (NestJS)

Cubre B1 y B3 del [estándar CORE](02-estandar-core.md). La persistencia (B2) está en [07-datos.md](07-datos.md).

## Capas

```
Controller   HTTP: rutas, guards, validación Zod y forma de la respuesta. Sin lógica de negocio.
   ↓
Service      Casos de uso: orquesta repositorios, transacciones, colas y políticas.
   ↓
Repository   Acceso a datos tras una interfaz (p. ej. EventosRepository). Implementación con TypeORM.
   ↓
Entity       Mapeo de tablas (TypeORM).

Dominio puro (sin Nest ni TypeORM): engine.ts, políticas ABAC, cadena.ts (cálculo del HMAC).
```

**SOLID en la práctica:**
- **S:** un servicio por caso de uso de cada módulo (`IngestaService`, `VerificacionService`).
- **O:** las reglas nuevas son archivos YAML, sin tocar código.
- **L/I:** los repositorios exponen interfaces pequeñas, y las pruebas usan versiones en memoria.
- **D:** los servicios dependen de *tokens* de inyección (`EVENTOS_REPO`), no de clases de TypeORM.

## Estructura

```
apps/api/src/
  main.ts                 arranque HTTP (helmet, cookies, CORS, pipes, filtro global)
  main.worker.ts          arranque del worker (solo módulos de detección)
  app.module.ts
  config/                 env.schema.ts (Zod), config.module.ts
  common/
    middleware/correlation-id.middleware.ts
    filters/all-exceptions.filter.ts
    pipes/zod-validation.pipe.ts
    guards/               jwt-auth, roles, policy, agent-key
    decorators/           @Public, @Roles, @CheckPolicy, @UsuarioActual
    errors/               errores de dominio (ConflictoError, NoEncontradoError...)
  database/
    data-source.ts        usado por la CLI de migraciones
    migrations/
  modules/
    auth/  users/  agents/  events/  detection/  alerts/  forensics/  timeline/  health/
```

Cada módulo sigue el mismo patrón: `x.module.ts`, `x.controller.ts`, `x.service.ts`, `x.repository.ts` (interfaz y token), `typeorm-x.repository.ts`, `x.entity.ts`, `*.spec.ts`.

## Manejo global de errores

`AllExceptionsFilter` convierte cualquier excepción en `application/problem+json` (RFC 7807):

```json
{
  "type": "https://siem.local/errores/conflicto",
  "title": "Evento ya recibido",
  "status": 409,
  "detail": "event_id repetido",
  "instance": "/api/v1/ingest",
  "correlationId": "4f0c2a1e-..."
}
```

| Origen | Status |
| --- | --- |
| `ZodError` | 400, con `errors[]` (ruta y mensaje) |
| Sin autenticación | 401 |
| `RolesGuard` o `PolicyGuard` | 403 |
| `NoEncontradoError` | 404 |
| Clave única violada (PG 23505) / `OptimisticLockVersionMismatchError` | 409 |
| Throttler | 429 |
| Cualquier otra cosa | 500 (se registra el stack; al cliente no se le muestra el detalle) |

## Logs estructurados

- `nestjs-pino`: JSON a stdout (en desarrollo, `pino-pretty`).
- Campos base: `time`, `level`, `msg`, `correlationId`, `contexto` (módulo), `usuarioId` o `agenteId`.
- **Correlation ID:** el middleware toma `x-correlation-id` de la petición (si es un UUID válido) o genera uno, lo guarda en un `AsyncLocalStorage` propio (`common/contexto.ts`), lo añade a cada log (`mixin` de pino) y lo devuelve en la respuesta. Al encolar un job se copia en `job.data.correlationId`, y el worker lo restaura.
- Se redactan `authorization`, `cookie`, `password`, `clave` y `x-agent-key`.
- Eventos de seguridad con nombre fijo: `auth.login_ok`, `auth.login_fallido`, `auth.refresh_reutilizado`, `forense.verificacion_fallida`.

## Colas (BullMQ + Redis)

| Cola | Job | Productor | Consumidor | Reintentos |
| --- | --- | --- | --- | --- |
| `deteccion` | `evaluar-reglas` `{eventType, correlationId}` | `IngestaService` tras el COMMIT | `DeteccionProcessor` (worker) | 3, backoff exponencial de 1 s |

- `jobId = evaluar-reglas-{eventType}-{segundo}` (BullMQ no admite `:` en ids propios) con `delay` de 1 s, para agrupar ráfagas: 100 eventos en el mismo segundo producen 1 evaluación, que corre cuando ese segundo ya terminó.
- El worker procesa un job a la vez (concurrencia 1), así la deduplicación de alertas no compite consigo misma.
- Si Redis no responde, `/ingest` igual guarda el evento y responde 202 (se registra un warning). Al arrancar, el worker reevalúa la ventana reciente de cada tipo vigilado.
- Los jobs fallidos quedan en la cola con su error para inspeccionarlos.

## Convenciones

- Prefijo global `/api/v1`. OpenAPI en `/api/docs` (solo en desarrollo).
- Nombres de dominio en español (como el código heredado), y sufijos técnicos de Nest en inglés (`Controller`, `Service`, `Module`).
- Configuración solo a través de `ConfigService` tipado; nada de `process.env` suelto.
