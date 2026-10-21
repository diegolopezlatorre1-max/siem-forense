# ADR 0001 · Simplificar a FastAPI + PostgreSQL

- **Fecha:** 14 oct 2026
- **Estado:** Reemplazada por [0002](0002-adopcion-core-ts.md)

## Contexto
El plan original incluía OpenSearch, Redis y un frontend en React/Node, y el plazo de un SIEM funcional para mediados de noviembre estaba en riesgo.

## Decisión
Quitar OpenSearch, Redis y el frontend separado. PostgreSQL guarda todo y FastAPI sirve la interfaz con plantillas. La cadena forense se mantiene.

## Consecuencias
Menos piezas y menos memoria en la VM. Se cumplieron los Sprints 1 y 2 en Python. El 18 oct el estándar CORE volvió obligatorios un frontend Vue, TypeScript y las colas, así que esta decisión quedó reemplazada.
