# ADR 0004 · Detección asíncrona con BullMQ sobre Redis

- **Fecha:** 18 oct 2026
- **Estado:** Aceptada

## Contexto
Hoy `/ingest` ejecuta todas las reglas de forma síncrona en cada petición (`ejecutar_reglas()`), lo que frena la ingesta. El CORE pide colas en memoria o Redis para las tareas asíncronas.

## Decisión
`/ingest` guarda, sella y responde 202, y además encola `evaluar-reglas` en BullMQ (Redis 7). Un proceso worker separado consume la cola. Redis también sirve de almacén para el rate limiting.

## Consecuencias
La ingesta no depende del costo de las reglas. Se agrega un proceso más (worker). Si Redis cae, los eventos igual se guardan y se sellan, y el worker reevalúa la ventana reciente al arrancar.
