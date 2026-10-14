# SIEM Forense Centralizado

Sistema SIEM con módulo de auditoría forense: recolecta logs de varias máquinas, los normaliza, detecta comportamientos sospechosos con reglas y guarda la evidencia en una cadena de hashes verificable.

## Tecnologías
Python, FastAPI, PostgreSQL, Redis, OpenSearch, Docker y VirtualBox (Ubuntu, Windows 10 y Kali).

## Estado
Semana 1 de 10 terminada: laboratorio, base de datos, cola y API base funcionando. Proyecto universitario, octubre a diciembre de 2026.

## Estructura
- `app/`: código del SIEM
- `rules/`: reglas de detección
- `tests/`: pruebas automáticas
- `docs/`: documentación
- `lab/`: mapa del laboratorio
