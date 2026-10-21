# ADR 0003 · NestJS + TypeORM + Zod

- **Fecha:** 18 oct 2026
- **Estado:** Aceptada

## Contexto
El CORE pide capas (controladores, servicios y repositorios), guards por endpoint, manejo global de excepciones, migraciones y bloqueo optimista o pesimista.

## Decisión
- **NestJS:** sus módulos, la inyección de dependencias, los guards, interceptors y exception filters corresponden directamente a lo que pide B1, S2 y B3.
- **TypeORM:** migraciones versionadas, `@VersionColumn` (bloqueo optimista) y `lock: { mode: 'pessimistic_write' }` (pesimista) de forma nativa. Prisma se descartó porque no tiene bloqueo pesimista sin SQL crudo.
- **Zod** con `nestjs-zod`: los mismos schemas en la API y en la web (`packages/shared`), y el OpenAPI generado a partir de ellos.

## Consecuencias
Se usa un único lenguaje de validación en todo el sistema. TypeORM exige cuidado con `synchronize` (siempre `false`).
