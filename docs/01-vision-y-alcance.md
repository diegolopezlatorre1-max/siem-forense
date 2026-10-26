# 01 · Visión y alcance

## Qué es

Un SIEM (Security Information and Event Management) reúne los logs de varias máquinas, los normaliza, detecta comportamientos sospechosos con reglas y avisa con alertas. Este proyecto le suma un **módulo forense**: cada evento se sella con una cadena de hashes HMAC, lo que permite demostrar que la evidencia no fue alterada después de recibirla.

## Cómo funciona, en 6 pasos

1. Las máquinas del laboratorio (Ubuntu y Windows 10) generan logs de seguridad.
2. Un **agente** en cada máquina lee los logs, los convierte en eventos y los envía a la API con su llave de agente.
3. La **API** valida el evento y, en una sola transacción, lo guarda en PostgreSQL y lo encadena al eslabón anterior de la cadena forense.
4. La API deja un trabajo en la **cola** (Redis), y un **worker** evalúa las reglas de detección y crea las alertas.
5. Los analistas consultan eventos y alertas, y gestionan las alertas desde la **interfaz web** (Vue 3).
6. Un **auditor** puede verificar en cualquier momento que la cadena forense está íntegra y, si no lo está, en qué eslabón se rompió.

## Objetivos v1

| # | Objetivo | Cómo se mide |
| --- | --- | --- |
| O1 | Recolectar logs de Linux (auth.log) y Windows (4624, 4625, 4720) | Un evento real llega a la base en segundos |
| O2 | Detectar ataques con reglas declarativas en YAML | Hydra desde Kali dispara LINUX-001 en menos de 1 minuto |
| O3 | Garantizar la integridad de la evidencia | Alterar un evento en la base hace que la verificación marque FALLO en el eslabón exacto |
| O4 | Cumplir el estándar técnico obligatorio CORE | Matriz de [02-estandar-core.md](02-estandar-core.md) completa y con pruebas |
| O5 | Acceso seguro por roles | El auditor puede consultar pero no modificar; el analista solo modifica las alertas asignadas a él |

## Alcance v1

- Agente Linux (Python) y agente Windows (PowerShell).
- API NestJS: ingesta, detección asíncrona, alertas, cadena forense, línea de tiempo y autenticación.
- Interfaz web Vue 3: login, eventos, alertas, verificación de la cadena y línea de tiempo.
- 4 reglas de Linux y 2 de Windows, con técnica MITRE ATT&CK.
- Roles: `admin`, `analista` y `auditor`.
- Despliegue en la VM Ubuntu con Docker Compose.

## Fuera de alcance (trabajo futuro)

- OpenSearch o cualquier buscador dedicado. PostgreSQL basta para el volumen del laboratorio.
- Alta disponibilidad y escalado horizontal.
- Notificaciones externas (correo, Slack).
- Correlación entre fuentes con reglas de secuencia.
- Sellado de tiempo externo (TSA, RFC 3161) para la cadena forense.

## Cambios de rumbo

| Fecha | Cambio | Motivo |
| --- | --- | --- |
| 14 oct | Se quitaron OpenSearch, Redis y el frontend; se dejó solo FastAPI + PostgreSQL | Garantizar el plazo ([ADR 0001](adr/0001-simplificacion-14oct.md)) |
| 18 oct | Migración a TypeScript (NestJS + Vue 3); vuelven Redis (cola) y el frontend | Estándar CORE obligatorio ([ADR 0002](adr/0002-adopcion-core-ts.md)) |

## Equipo y roles Scrum

El proyecto es para dos personas. Mientras haya un solo desarrollador, esa persona cumple los tres papeles (Product Owner, Scrum Master y equipo de desarrollo). Cuando entre el compañero, se reparten.
