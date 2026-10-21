# ADR 0005 · Los agentes quedan fuera del monorepo TS

- **Fecha:** 18 oct 2026
- **Estado:** Aceptada

## Contexto
El CORE regula el backend y el frontend. Los agentes son clientes ligeros que corren en las máquinas vigiladas. El agente Linux (Python) ya funciona, tolera el `auth.log` dañado y tiene pruebas.

## Decisión
- El agente Linux se mantiene en Python y se mueve a `agents/linux/`. El agente Windows será PowerShell nativo (`agents/windows/`).
- Ambos se autentican con una llave de agente (`X-Agent-Key`) y envían el contrato `EventoIngesta` definido en `packages/shared`. La API lo valida con Zod, así que el contrato sigue siendo uno solo.

## Consecuencias
No se instala Node en las máquinas vigiladas. El agente conserva sus pruebas con pytest. El contrato del agente se documenta en [08-api.md](../08-api.md).
