# SIEM Forense Centralizado

Sistema SIEM con módulo de auditoría forense. Recolecta logs de varias máquinas, detecta comportamientos sospechosos con reglas YAML y sella cada evento en una cadena HMAC verificable, que permite demostrar que la evidencia no fue alterada.

Cumple el [estándar técnico obligatorio CORE](docs/02-estandar-core.md).

## Tecnologías

- **Backend:** Node 22 + TypeScript, NestJS, TypeORM, PostgreSQL 16, BullMQ/Redis 7, Zod, pino.
- **Frontend:** Vue 3, Pinia, vue-router, Axios, TypeScript estricto.
- **Agentes:** Python (Linux) y PowerShell (Windows).
- **Laboratorio:** VirtualBox con Ubuntu (servidor), Windows 10 (fuente) y Kali (atacante).

## Estado

Sprints 0 a 2 terminados con el backend Python (recolección, reglas y alertas). Sprint 3 en curso: reestructuración al estándar CORE. El backend Python se retiró; la API es NestJS (`apps/api`). Ver [docs/10-plan-sprints.md](docs/10-plan-sprints.md).

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `apps/api` | API NestJS y worker de detección |
| `apps/web` | Interfaz Vue 3 |
| `packages/shared` | Schemas Zod y tipos compartidos |
| `agents/` | Agentes de recolección (Linux y Windows) |
| `rules/` | Reglas de detección en YAML |
| `docs/` | Documentación ([índice](docs/README.md)) |
| `scripts/` | Utilidades (exportar la documentación) |

## Arranque rápido

Ver [docs/11-laboratorio.md](docs/11-laboratorio.md#cómo-encender-todo). En resumen, en la VM:

```bash
pnpm install
docker compose up -d postgres redis
pnpm --filter api migration:run
pnpm --filter api start          # API en :3000 (OpenAPI en /api/docs)
pnpm --filter api start:worker   # worker de detección, en otra terminal
```

## Seguridad

Nunca se versionan secretos: `.env` y `docs/privado/` están en `.gitignore`. Para generar valores, usar `.env.example` como plantilla con `openssl rand -base64 48`.
