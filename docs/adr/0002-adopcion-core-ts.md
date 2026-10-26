# ADR 0002 · Adoptar el estándar CORE y migrar a TypeScript

- **Fecha:** 18 oct 2026
- **Estado:** Aceptada

## Contexto
Se publicó el [estándar técnico obligatorio](../02-estandar-core.md) para todos los proyectos. Exige TypeScript estricto de punta a punta, Vue 3 + Pinia, validación con Zod/Joi, doble token, RBAC/ABAC, migraciones versionadas con bloqueos, logs con correlation-id y colas. El backend Python actual no tiene autenticación, ni migraciones, ni colas, ni frontend.

Se consideraron dos caminos: mantener FastAPI (con Pydantic en lugar de Zod y tipos TS generados desde OpenAPI) o migrar a Node + TypeScript.

## Decisión
Migrar el backend a **Node + TypeScript** en un monorepo con el frontend, compartiendo los schemas Zod. Así se cumple el estándar de forma literal y sin interpretaciones.

## Consecuencias
- Se reescribe la API (unas 150 líneas de Python): motor, cargador de reglas, servicio de detección e ingesta. El diseño y las pruebas se portan uno a uno.
- Se conservan las reglas YAML, el modelo de datos (mismas tablas), el laboratorio y el agente Linux ([0005](0005-agentes-fuera-del-core.md)).
- Vuelve Redis (ya estaba en `docker-compose.yml`).
- La VM Ubuntu necesita Node 22 LTS.
- Riesgo para el plazo: se absorbe con el orden de recorte de [10-plan-sprints.md](../10-plan-sprints.md).
