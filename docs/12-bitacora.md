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
