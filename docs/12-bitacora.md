# 12 · Bitácora

Nota corta al cerrar cada sesión: qué se hizo y qué falló (el "daily" de Scrum). La retro va al cerrar cada sprint.

## Semana 1 (6 al 14 oct)

- **Día 1:** Git, VS Code, Python 3.12, Docker Desktop y DBeaver. El Python de la Store no creaba venv, así que se usó el de python.org.
- **Día 2:** estructura de carpetas. `.gitignore` y `.env.example` quedaron vacíos y se corrigieron después.
- **Día 3:** Docker Desktop choca con VirtualBox, así que el stack corre en Ubuntu. PostgreSQL 16 y Redis 7 con docker compose. DBeaver conectado.
- **Día 4:** API FastAPI con `/health` en Ubuntu (Python 3.14). Ubuntu perdió internet y se arregló reconectando el cable del Adaptador 1.
- **Día 5:** Ubuntu .101, Windows 10 .102 y Kali .103 en la red solo-anfitrión, con hora de Bogotá. `auth.log` tiene bytes basura por un cierre de VirtualBox: hay que leerlo con `grep -a`.

## Sprint 1 (14 oct): recolección de logs de Linux

Tabla `eventos`, `/ingest` (409 ante duplicados), parser de `auth.log` con 3 pruebas y agente que sigue el archivo. Demo: 3 intentos SSH fallidos desde el PC llegaron a la base en segundos. Se fusionó a `main` con el PR #2.

**Retro.** Bien: flujo completo funcionando; parser con pruebas; `/ingest` rechaza duplicados. Mejorar: cuidar las rutas (`~/siem-forense`); mantener una sola copia de cada archivo; revisar internet antes de `git pull`.

## Sprint 2 (14 oct): detección y alertas

Reglas YAML con cargador (2 pruebas), motor de ventana deslizante (5 pruebas), tabla `alertas`, servicio que conecta motor y base, `GET /alerts` y reglas LINUX-001 a 004. Un ataque manual de fuerza bruta generó LINUX-001 (high, T1110, 5 intentos desde 192.168.56.1).

**Problemas:** la alerta no salía con intentos lentos (la regla exige 5 en 60 s), dos agentes simultáneos producían respuestas 200/409 por parejas, y aparecían huecos en los id de PostgreSQL (es normal).

**Retro.** Pendiente: la prueba con Hydra pasa al Sprint 3.

## 18 oct: estándar CORE y reestructuración

- Se publica el estándar técnico obligatorio ([02](02-estandar-core.md)). Se decide migrar a TypeScript (NestJS + Vue 3) ([ADR 0002](adr/0002-adopcion-core-ts.md)).
- **Incidente de seguridad:** `docs/Documentacion_SIEM_Forense.docx` estaba versionado en GitHub con la contraseña real de PostgreSQL. Se dejó de versionar, se movió a `docs/privado/historico/` y hay que rotar la contraseña. Lección: los secretos solo van en `docs/privado/` y en `.env`.
- Se crea la documentación nueva en Markdown y la rama `reestructuracion-core`.

## 21 oct: monorepo y base de la API (sesiones 14 a 16, código)

- Monorepo pnpm con `packages/shared` (schemas Zod), `apps/api` (NestJS 12, ESM) y el esqueleto de `apps/web` (Vite + Vue 3). Lint y `typecheck` en verde sin `any`.
- El agente Linux pasó a `agents/linux/` y ahora envía `X-Agent-Key` a `/api/v1/ingest`.
- API: configuración validada con Zod (falla al arrancar si falta algo), logs pino con `correlationId`, filtro problem+json, migraciones 0001 (compatible con las tablas de Python) y 0002 (`agentes`), `/health`, `/ingest` con llave de agente (202/400/401/409), cola BullMQ con worker aparte y `GET /alerts` paginado.
- Motor y cargador de reglas portados: los 5 casos de `test_motor.py` y los 2 de `test_reglas.py` pasan en Vitest (17 pruebas unitarias en la API).
- **Pendiente de verificar en la VM:** `pytest` del agente, migraciones contra la base real, e2e (`pnpm --filter api test:e2e`) y la demo con Hydra. En el PC no hay Python ni Docker.
- `GET /alerts` sigue abierto, como en el backend Python, hasta que llegue el JWT en S4.
- Se agregó el OpenAPI en `/api/docs` (solo en desarrollo), generado desde los schemas Zod de `packages/shared`.
- Se retiró el backend Python (`app/`, `tests/` y `requirements.txt` de la raíz). Sus pruebas ya corren portadas en Vitest; si la demo fallara, sigue en el historial de Git (commit `e56bafa`).
- Se generó `docs/export/SIEM_Forense.docx` con pandoc 3.5 (`scripts/export-docs.sh`). Los diagramas Mermaid salen como texto en el Word.
- **Problemas:** BullMQ 6 no admite `:` en los ids de job (se usa `-`); con `bufferLogs`, Nest se quedaba colgado sin mostrar errores de arranque (se imprimen y se sale con código 1); `pnpm` no está en el PATH del PC hasta hacer `corepack enable`.

## 22 oct: VMs, clave rotada y monorepo en la VM (sesiones 13 y 14)

- Red host-only y VMs listas: Ubuntu (.101) y Kali (.103) se hacen ping. La VM Ubuntu es la misma del Sprint 2 (Ubuntu 26.04, con Docker y los datos).
- **Sesión 13:** respaldo con `pg_dump` (85 eventos y 11 alertas) y rotación de la contraseña de PostgreSQL. Se comprobó por red que la nueva entra y la filtrada no. El `.env` de la VM tiene la clave nueva y `CLAVE_FORENSE` y `SECRETO_JWT` nuevos; todo guardado en `docs/privado/`.
- **Sesión 14:** la VM pasó a `reestructuracion-core`. Node 22.22 (de apt) y pnpm 9.15.9 con corepack. `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde (3 pruebas en shared y 25 en la API) y `pytest` del agente en verde (3).
- **Problemas:** en un clon limpio fallaban `typecheck` de `apps/web` y 3 archivos de prueba de la API ("Failed to resolve entry for package @siem/shared"), porque `packages/shared` se exporta desde `dist/`, que está en `.gitignore` y nadie compilaba. En el PC no se veía porque ya había un `dist/` viejo. Se agregó `"prepare": "pnpm run build"` a shared, así `pnpm install` lo compila. Los `__pycache__` del backend viejo eran de root (el agente corría con `sudo`) y hubo que borrarlos con `sudo`.

## 26 oct: base de la API en la VM (sesión 15)

- La API arranca en la VM y responde desde el PC: `/health` en 200 con db y redis en ok, el `x-correlation-id` vuelve igual, y los errores salen como problem+json con `correlationId` (404, 400 en la query de `/alerts`, 401 en `/ingest` sin llave). `GET /alerts` lee las 11 alertas del Sprint 2. El worker arranca y se conecta a Redis.
- Redis sigue solo en `127.0.0.1`: la API y los e2e corren dentro de la VM.
- El e2e queda para la sesión 16, porque necesita la tabla `agentes` (migración 0002).
- **Problemas:** al reiniciar, la VM perdió la IP host-only (no quedó en autoconexión) y se arregló con `nmcli connection modify hostonly connection.autoconnect yes`. `/health` respondía 503 con `redis: error` porque BullMQ 6 dejó `ioredis` como dependencia opcional y no estaba instalado; las pruebas unitarias no lo veían porque usan dobles. Se agregó `ioredis` a `apps/api`.

## 26 oct: migraciones y llave del agente (sesión 16)

- Respaldo previo (`siem-2026-10-26-pre-migraciones.dump`) y migraciones 0001 y 0002 aplicadas sobre la base del Sprint 2 sin perder datos: siguen los 85 eventos y las 11 alertas. `event_id` pasó a `varchar(64)`, hay 4 índices nuevos en `eventos`, la tabla `agentes` y la columna `eventos.agente_id` (vacía en los eventos viejos).
- Agente `ubuntu` creado (id 1). La llave no se mostró: quedó en `~/.siem-agente.env` de la VM (permisos 600) y en `docs/privado/`.
- e2e en verde (9 pruebas): `/health`, correlation-id, 404 problem+json, `/ingest` (401, 400, 202 y 409) y `/alerts`.
- **Problema:** PowerShell 5.1 rompe las comillas de los comandos que se pasan por `ssh`; los comandos con SQL se corren como scripts copiados a la VM.

## Problemas resueltos (Sprints 0 a 2)

| Problema | Solución |
| --- | --- |
| Clonar por HTTPS daba error de autenticación | Usar SSH |
| `python -m venv` fallaba con Python 3.13 de la Store | Python 3.12.10 de python.org con `py -3.12` y los alias de la Store desactivados |
| Docker Desktop: Virtual Machine Platform not enabled, y después error 500 al usar VirtualBox | Todo el stack corre con Docker dentro de Ubuntu |
| Docker podía gastar demasiada RAM | `.wslconfig` con `memory=6GB` |
| `.gitignore` y `.env.example` subidos vacíos | Se llenaron y se subieron con un commit de corrección |
| Ubuntu sin red solo-anfitrión y SSH apagado | Adaptador 2 (192.168.56.101) y `sudo systemctl enable --now ssh` |
| Reloj de Ubuntu atrasado (errores en apt) | `America/Bogota` y NTP con `timedatectl` |
| VirtualBox se cerró y la pantalla quedó negra | VMSVGA, 128 MB de vídeo, sin 3D |
| DBeaver: falla de contraseña | Usuario y base `siem` (se había escrito `siem-forence`) |
| `/ingest` devolvía 500 con un evento repetido | Capturar `IntegrityError`, hacer rollback y responder 409 |
| `auth.log` con bytes nulos | El parser los limpia y el agente lee en modo binario |
| Faltaba `__init__.py` y había una copia duplicada al mover archivos | Se corrigió; mantener una sola copia |
