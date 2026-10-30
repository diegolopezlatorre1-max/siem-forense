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

## 26 oct: demo con Hydra y cierre del Sprint 3 (sesión 17)

- Laboratorio completo arriba: Ubuntu (.101) con API, worker y agente; Kali (.103) como atacante. La red host-only se arregló en ambas con `nmcli ... autoconnect yes` (al reiniciar perdían la IP).
- Ataque desde Kali: `hydra -l intruso -P` con 12 contraseñas contra el SSH de Ubuntu. El agente leyó los `login_failed` de `auth.log`, los envió a `/ingest` (202) y el worker generó **LINUX-001** (fuerza bruta SSH, high, T1110, clave 192.168.56.103, 5 intentos) a los pocos segundos; también saltó **LINUX-002** sobre la misma IP. **Objetivo del Sprint 2/3 cumplido: la alerta aparece en menos de 1 minuto en la API nueva.**
- **Problemas:** el agente no arrancaba con `sudo -E agent_linux.py` ("Falta SIEM_AGENT_KEY") porque Ubuntu 26.04 ignora `-E` de sudo; se corre sin sudo, ya que el usuario está en el grupo `adm` y puede leer `auth.log`. En los primeros intentos de Hydra se colaron erratas al teclear (`-p` en vez de `-P`, ruta `wordlist` sin la s): hay que cuidar mayúsculas y la ruta `/usr/share/wordlists/`.

**Retro Sprint 3.** Bien: migración al monorepo TS sin perder los datos del laboratorio; la cadena recolección→reglas→alertas funciona igual que con el backend Python; demo con Hydra en verde. Mejorar: fijar la IP host-only con autoconexión desde el principio; evitar scripts con comillas por SSH desde PowerShell (se corren como archivos .sh copiados). Pendiente para S4: autenticación (doble token), RBAC/ABAC y la cadena HMAC forense.

## 26 oct: autenticación con doble token (sesiones 18 y 19)

- Migración 0003: `usuarios` (Argon2id) y `refresh_tokens` (familia, hash, usado/revocado). Los 114 eventos y las alertas siguen intactos.
- Access JWT HS256 con `jose` (10 min, en memoria); refresh opaco de 32 bytes en cookie `HttpOnly; SameSite=Strict; Path=/api/v1/auth`, guardado solo como hash SHA-256. Login, `/auth/me`, refresh rotativo, logout y logout-all.
- Seguridad de sesión: cada refresh rota el token; reutilizar uno ya usado (fuera de una gracia de 10 s para pestañas concurrentes) revoca toda la familia; máximo de `MAX_SESIONES` por usuario (se revoca la más antigua). `JwtAuthGuard` valida el access y que la familia no esté revocada, con caché de 30 s en Redis.
- Verificado en la VM: 13 pruebas unitarias nuevas (tokens y auth) y e2e en verde (12 en total). Login real desde el PC con `curl`: 200 con access + cookie; `/auth/me` 200; clave mala 401.
- **Decisiones/notas:** se eligió `jose` (ESM, probado) para el JWT; `ioredis` se importa con `{ Redis }` (named) en ESM; `gen_random_uuid()` es nativo en PostgreSQL 16, sin extensión. Se creó el usuario `admin` (clave en `docs/privado/`).
- **Problema:** `git apply` del parche falló por contexto estricto; se desplegó a la VM con commit + push + pull, que resultó más fiable.

## 26 oct: RBAC, ABAC y rate limiting (sesión 20)

- **RBAC global, denegado por defecto** (`AccesoGuard`): decoradores `@Publico`, `@AgenteKey`, `@Roles`/`@Autenticado`. `/alerts`, `/auth/me`, logout y logout-all ya exigen Bearer; `/ingest` usa la llave de agente; `/health` es público. Nuevo módulo `users`: `GET`/`POST /users` solo admin.
- **ABAC** (`PolicyGuard`) con políticas puras de ownership de alertas (`alertaPuedeModificar`/`Asignar`), con pruebas; se conectarán a los endpoints de alertas en el Sprint 6.
- **Rate limiting** con `@nestjs/throttler` y un almacén propio en Redis (`RedisThrottlerStorage`): login 5/min por IP+usuario, refresh 30/min, ingest 600/min, resto 120/min. El 429 sale como problem+json.
- Verificado en la VM: 48 pruebas unitarias y 17 e2e en verde. En vivo desde el PC: el auditor recibe **403** en `/users`, el admin **200**, y la 6.ª petición de login seguida devuelve **429**.
- **Problemas:** un e2e fallaba por el servidor efímero de supertest (`req.ip` nulo) —se endureció `getTracker` y el e2e escucha en un puerto real—; y dos access tokens emitidos en el mismo segundo salían idénticos (JWT con `iat`/`exp` por segundos): se añadió un `jti` único a cada uno.

## 26 oct: cadena forense HMAC y cierre del Sprint 4 (sesión 21)

- Migración 0004 (`cadena_forense`). El eslabón **génesis es implícito**: `hash_0 = HMAC(CLAVE_FORENSE, "GENESIS|siem-forense")` se calcula en ejecución, sin meter la clave en una migración. El primer eslabón real es la secuencia 1.
- **Sellado dentro de la transacción de ingesta**: en vez del `SELECT ... FOR UPDATE` del plan (que bajo concurrencia bifurca por leer una cola móvil), se usa `pg_advisory_xact_lock`, que serializa la escritura de la cadena de forma fiable. Canónico con claves en orden alfabético y `ts` en UTC; `hash_n = HMAC(clave, hash_{n-1}|n|canonico)`. `/ingest` ahora devuelve `{ id, secuencia }`.
- **`GET /forensics/verify`** (admin, auditor): recorre por secuencia en lotes de 1000 y devuelve el primer fallo: `evento_alterado`, `cadena_rota`, `eslabon_faltante` o `evento_sin_sellar`. `CLAVE_FORENSE` pasó a ser obligatoria en la config.
- Verificado en la VM: 52 pruebas unitarias y 22 e2e. En vivo: alterar un evento da `integra:false` con `evento_alterado` en el eslabón exacto (secuencia 1, eventoId 179) y restaurarlo vuelve a `integra:true`; 20 ingestas concurrentes dejan la cadena válida (e2e).
- **Nota operativa:** al habilitar el sellado a mitad del proyecto, quedaron eventos antiguos sin eslabón (el servidor corrió con el código viejo mientras el agente seguía ingiriendo). Se estableció una **línea base limpia** reiniciando solo la tabla `cadena_forense` (los eventos no se tocan); desde ahí todo evento nuevo se sella. En producción el sellado estaría activo desde el primer evento.

**Retro Sprint 4.** Bien: doble token con rotación y detección de reutilización, RBAC/ABAC, rate limiting en Redis y cadena forense, todo verificado en el laboratorio real. Mejorar: desplegar el código a la VM antes de probarlo en vivo (evita el estado mezclado que ensució la cadena); aplicar el `REVOKE UPDATE/DELETE` del usuario de la app (docs/07) para que ni siquiera se pueda alterar `eventos` desde la aplicación. Pendiente: frontend (S5).

## 28–29 oct: frontend Vue y cierre del Sprint 5 (sesiones 22 a 25)

- **Sesión 22 (cliente HTTP, auth, guards):** instancia Axios con interceptores (Bearer +
  `x-correlation-id`; ante 401, un único refresh en cola y reintento; backoff en GET ante
  red/5xx); store `auth` con el access **solo en memoria**; guards async (restaurar sesión /
  `meta.roles` → 403); vistas Login y 403. Prueba del *single-flight* del refresh (3 casos).
- **Sesión 23 (Eventos):** al construir la vista se descubrió que **`GET /events` no existía**
  en el backend (estaba documentado pero nunca se implementó). Se creó: `EventoSchema` y
  `EventosQuerySchema` en `@siem/shared`, `listar` con filtros en el repositorio y
  `EventsQueryController` (rol: todos), siguiendo el patrón de `GET /alerts`. Frontend: store
  `events` normalizado (caché 30 s), store `ui` con filtros persistidos en `localStorage` y la
  vista con tabla, filtros y paginador (`raw` como texto, sin `v-html`).
- **Sesión 24 (Alertas):** se añadieron filtros `severidad` y `regla_id` a `GET /alerts`
  (backend) y la vista de Alertas con tarjetas (franja/chip de severidad, MITRE, paginador).
  El filtro por estado, la asignación y `GET /alerts/:id` quedan para el Sprint 6 (la tabla aún
  no tiene esas columnas).
- **Sesión 25 (Verificar cadena + roles):** vista Verificar que llama a `GET /forensics/verify`
  (verde con nº de eslabones o rojo con la secuencia y el motivo del primer fallo) y rutas por
  rol (`/verificar` solo admin/auditor; el guard manda a `/403` a quien no corresponde).
- **Demo en vivo (29 oct):** stack completo arriba en la VM con el código de los Sprints 5
  (`git pull` de `dev`). Verificado desde el PC: `/health` 200, login `admin` 200,
  `GET /events` 169 eventos (116 `login_failed`), `GET /alerts` 18 alertas (LINUX-001: 6,
  LINUX-003: 5), `GET /forensics/verify` **íntegra** con 13 eslabones. Login en el navegador
  funcionando tras corregir el bug de abajo.
- **Bug corregido (commit `c6e80f5`):** el login en el navegador fallaba **sin enviar la
  petición** porque el interceptor generaba el `x-correlation-id` con `crypto.randomUUID()`,
  que solo existe en contexto seguro (HTTPS/localhost). La web se sirve por `http://192.168.56.101`
  (HTTP + IP), así que la función era `undefined` y Axios rechazaba cada petición. Se añadió un
  generador con respaldo en `crypto.getRandomValues`. Afectaba a todo el frontend, no solo al login.
- **Correcciones de documentación:** se aclaró en [11](11-laboratorio.md) que la contraseña del
  SO de las máquinas no está en el repo (solo las de servicios/app); se añadió a [08](08-api.md)
  una nota de estado de implementación (qué endpoints existen y cuáles son del Sprint 6).

**Retro Sprint 5.** Bien: frontend completo (login con sesión persistente, eventos, alertas y
verificación) con TS estricto, stores normalizados y acceso por rol; el bug de `crypto.randomUUID`
se encontró y corrigió en la demo en vivo. Mejorar: **probar el frontend en la URL real del
laboratorio** (HTTP + IP), no solo contra la API o en `localhost`; verificar el contrato del
backend antes de construir una vista (la ausencia de `GET /events` apareció a mitad de la sesión).
Pendiente S6: agente de Windows, reglas WIN, flujo de alertas (estado/asignación, migración 0005)
y línea de tiempo.

## 29–30 oct: Sprint 6 en código (sesiones 26 a 29)

Todo el código del Sprint 6 quedó en `dev` con pruebas unitarias, dos semanas antes de lo planeado.
Falta la demo de cada sesión en el laboratorio; los pasos están en `docs/tareas-manuales.txt`.

- **Sesión 28 (flujo de alertas, Carlos, PR #5 y #6):** migración 0005 (`estado`, `asignada_a`,
  `version`), `GET /alerts/:id`, `POST /alerts/:id/asignar` y `PATCH /alerts/:id`, con 409 si la
  `version` no coincide (bloqueo optimista con un `UPDATE ... WHERE version = :v`). El ABAC
  reutiliza `alerta.policy.ts`. En la vista de Alertas: filtro por estado, etiqueta de estado,
  "Asignármela" y selector de estado. Ante un 409 se muestra el aviso y se recarga la lista.
  9 pruebas del servicio y 4 del store.
- **Sesión 26 (agente Windows):** `agents/windows/` en PowerShell 5.1, sin dependencias. El parser
  (`ParserWindows.psm1`) va separado del bucle (`agente_windows.ps1`), igual que en Linux, y recibe
  el XML del registro, así se prueba sin el Event Log (`Probar-Parser.ps1`, 17 pruebas). Detalles:
  - Lee 4625, 4624 y 4720 con `Get-WinEvent -FilterXPath` por `EventRecordID` y reanuda desde
    `.ultimo-registro`.
  - Descarta el ruido del 4624: logons de servicio, cuentas `...$`, `DWM-n` y `NT AUTHORITY`.
  - Normaliza la IP (`-` pasa a null y `::ffff:` a IPv4).
  - El `event_id` es el SHA-256 del XML y `ts` va en ISO UTC con milisegundos.
  - El cuerpo se envía como bytes UTF-8, para no depender de cómo PowerShell 5.1 codifica las
    cadenas (las tildes en nombres de usuario podrían llegar rotas).
- **Sesión 27 (reglas WIN):** `windows_fuerza_bruta.yml` (WIN-001, 4625 por IP, 5 en 60 s, T1110)
  y `windows_usuario_creado.yml` (WIN-002, 4720 por host, umbral 1, T1136.001).
  - **Problema encontrado al diseñarlas:** las reglas solo filtraban por `event_type`, y Linux y
    Windows comparten `login_failed`. Una fuerza bruta a Windows habría disparado también
    LINUX-001/002/003, y fallos repartidos entre los dos sistemas sumaban para el umbral.
  - **Solución:** campo opcional `source` en `ReglaSchema`. El motor descarta los eventos de otro
    origen y `recientes()` ahora trae `source`. Las 4 reglas de Linux llevan `source: auth.log` y
    las de Windows `source: windows-security`. Las reglas sin `source` se comportan como antes.
  - 5 pruebas nuevas del motor, entre ellas "no mezcla orígenes para llegar al umbral" y "LINUX-001
    ignora Windows", y 1 del cargador (las 6 reglas del repo cargan y todas declaran su origen).
- **Sesión 29 (línea de tiempo):**
  - **Contrato:** `LineaTiempoQuerySchema` y `LineaTiempoSchema` en `@siem/shared`. La query exige
    al menos host, usuario o IP y un rango válido.
  - **Backend:** módulo `timeline/` con la función pura `mezclar()` (orden ascendente; a igual
    `ts`, el evento va antes que su alerta), `TimelineService` y `GET /timeline`. Los eventos
    cumplen todos los sujetos; las alertas, una `clave` igual a cualquiera de ellos (nuevo
    `AlertasRepository.porClaves`). Tope de 500 por tipo, con `truncada`.
  - **Frontend:** store `timeline`, vista `LineaTiempoView` en `/linea-tiempo` (todos los roles)
    con cronología vertical (alertas resaltadas por severidad), rango por defecto de 24 h y
    atajo por URL (`?src_ip=...`). El enlace está en Inicio.
  - **Pruebas:** 4 del servicio, 3 del schema, 4 del store y `/timeline` en la prueba de OpenAPI.
- **Verificado en el PC (30 oct):** `pnpm typecheck`, `pnpm lint` y `pnpm test` en verde (API 71,
  web 11 y shared 7 pruebas), `build` de la API y de la web, y las 17 pruebas del parser de Windows.
  - **No verificado:** el agente contra el Event Log real. Sin permisos de administrador, el
    registro Security da "operación no válida"; se probará en la VM Windows.
  - **No ejecutados:** los e2e, que necesitan la base de la VM.
- **Limitaciones conocidas:**
  - WIN-002 deduplica por host en 60 s: dos usuarios creados en el mismo minuto en el mismo
    equipo dan una sola alerta.
  - En la línea de tiempo, el filtro de alertas es por `clave` y no sabe si esa clave era una IP,
    un usuario o un host (la alerta no guarda el `agrupar_por`).
  - Siguen pendientes `GET /events/:id` y que `GET /alerts/:id` incluya los eventos que provocaron
    la alerta.

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
