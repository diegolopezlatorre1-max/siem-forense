# Documentación: SIEM Forense Centralizado

Proyecto de la carrera de Ciberseguridad · Actualizado el 22 de octubre de 2026

## Dónde vamos

| Indicador | Estado |
| --- | --- |
| Metodología | Scrum (sprints de ~1 semana, demo y retro al final de cada uno) |
| Avance | ✔ Sprint 0 · ✔ Sprint 1 · ✔ Sprint 2 (motor y 4 reglas, sin la prueba con Hydra) · ▶ Sprint 3: reestructuración al estándar CORE |
| Siguiente | Código del Sprint 3 terminado (monorepo, API Nest, ingesta con llave, motor, worker, OpenAPI; backend Python retirado). Sesiones 13 y 14 verificadas en la VM (clave rotada; lint, typecheck y pruebas en verde). Faltan las sesiones 15 y 16 en la VM (migraciones, e2e, llave del agente) y la demo con Hydra. Después, ▶ Sprint 4: seguridad y forense |
| Meta | SIEM funcional para el 15 de noviembre; margen hasta diciembre |
| Estándar | [Estándar técnico obligatorio "CORE"](02-estandar-core.md), obligatorio para todos los proyectos |

**Cambio de rumbo (18 oct):** se publicó el estándar técnico obligatorio (el "CORE"). Exige TypeScript de punta a punta, un frontend en Vue 3 + Pinia, autenticación con doble token, RBAC/ABAC, migraciones versionadas, colas y logs con correlation-id. La simplificación del 14 de octubre (solo FastAPI + PostgreSQL) ya no lo cumple, así que el backend se migra a NestJS y se recuperan Redis (para la cola) y el frontend. El corazón del proyecto no cambia: recolección, reglas YAML y cadena forense de hashes. Ver [ADR 0002](adr/0002-adopcion-core-ts.md).

## Índice

| # | Documento | Contenido |
| --- | --- | --- |
| 01 | [Visión y alcance](01-vision-y-alcance.md) | Qué es, objetivos, alcance v1 y fuera de alcance |
| 02 | [Estándar CORE](02-estandar-core.md) | Requisitos obligatorios y matriz de cumplimiento |
| 03 | [Arquitectura](03-arquitectura.md) | Componentes, flujos y despliegue |
| 04 | [Seguridad](04-seguridad.md) | Amenazas, doble token, RBAC/ABAC, cifrado, rate limiting |
| 05 | [Backend](05-backend.md) | Capas, módulos, errores, logs y colas |
| 06 | [Frontend](06-frontend.md) | Vue 3, Pinia, guards y cliente HTTP |
| 07 | [Datos](07-datos.md) | Modelo, migraciones y bloqueos |
| 08 | [API](08-api.md) | Contrato de endpoints v1 |
| 09 | [Detección y forense](09-deteccion-y-forense.md) | Reglas, motor y cadena HMAC |
| 10 | [Plan por sprints](10-plan-sprints.md) | Backlog, sprints y orden de recorte |
| 11 | [Laboratorio](11-laboratorio.md) | Máquinas, red y cómo encender todo |
| 12 | [Bitácora](12-bitacora.md) | Diario, retros y problemas resueltos |
| — | [Decisiones (ADR)](adr/) | Por qué se eligió cada cosa |
| — | [Plan de reestructuración por fases](plan-reestructuracion.md) | Fases 0–3 de la migración al CORE (Fases 0 y 1 hechas salvo rotar la clave; Fase 3 en el Sprint 3) |

## Reglas de la documentación

- La fuente es el Markdown de esta carpeta. El Word de entrega se genera con `scripts/export-docs.sh` en `export/SIEM_Forense.docx`.
- **Nunca se escriben contraseñas, llaves ni secretos en esta carpeta.** Las credenciales del laboratorio van en `docs/privado/` (ignorada por Git).
- Cada sesión de trabajo actualiza la [bitácora](12-bitacora.md) y la tabla "Dónde vamos".
