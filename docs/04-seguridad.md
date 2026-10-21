# 04 · Seguridad

Cubre los requisitos S1, S2 y S3 del [estándar CORE](02-estandar-core.md).

## Modelo de amenazas (resumen)

| Amenaza | Activo | Control |
| --- | --- | --- |
| Robo del access token por XSS | Sesión | Token solo en memoria (nunca en `localStorage`), CSP estricta, sin `v-html`, campo `raw` escapado |
| Robo o reutilización del refresh token | Sesión | Cookie HttpOnly/Secure/SameSite=Strict, rotación en cada uso, detección de reutilización que revoca la familia |
| CSRF contra `/auth/refresh` | Sesión | `SameSite=Strict`, `Path` limitado a `/api/v1/auth` y verificación del encabezado `Origin` |
| Fuerza bruta contra el login | Cuentas | Rate limit de 5 intentos/min por IP+usuario, Argon2id |
| Agente falso que inyecta eventos | Evidencia | API key por agente (guardada con hash) y `host` del evento comparado con el registrado del agente |
| Alteración de evidencia en la base | Evidencia | Cadena HMAC con clave fuera de la base (`CLAVE_FORENSE`) y verificador |
| Inyección SQL | Base de datos | Solo el query builder o repositorios de TypeORM con parámetros; prohibido concatenar SQL |
| Escalada de privilegios | Datos | RBAC por endpoint, denegado por defecto, más ABAC de ownership |
| Fuga de secretos | Todo | `.env` fuera de Git, schema Zod de la configuración y ningún secreto en `docs/` |

## S1 · Autenticación con doble token

| Token | Formato | Vida | Dónde vive |
| --- | --- | --- | --- |
| Access | JWT HS256 (`sub`, `rol`, `sid`, `exp`) firmado con `SECRETO_JWT` | 10 min | Memoria del store `auth` (Pinia), nunca persistido |
| Refresh | 32 bytes aleatorios (base64url), opaco | 7 días | Cookie `refresh_token; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. En la base solo se guarda su hash SHA-256 |

**Rotación y reutilización.** Cada sesión tiene una *familia* (`familia_id`). Cada `POST /auth/refresh` marca el token actual como `usado`, emite uno nuevo de la misma familia y devuelve un access nuevo. Si llega un refresh **ya usado**, se supone que fue robado: se revoca toda la familia, se responde 401 y se deja un log `auth.refresh_reutilizado` con nivel `warn`.

**Sesiones concurrentes.**
- Hay un máximo de `MAX_SESIONES=3` familias activas por usuario. Al iniciar una cuarta sesión, se revoca la más antigua.
- `POST /auth/logout` revoca la familia actual. `POST /auth/logout-all` revoca todas las del usuario.
- El access lleva `sid` (la familia). `JwtAuthGuard` rechaza los access cuya familia esté revocada, con una caché de 30 s en Redis. Así, revocar surte efecto antes de que venza el access.

## S2 · Autorización RBAC + ABAC

**Roles:** `admin`, `analista` y `auditor`. Los agentes no son usuarios: usan `AgentKeyGuard` y solo pueden llamar a `/ingest`.

| Endpoint | admin | analista | auditor | agente |
| --- | :-: | :-: | :-: | :-: |
| `POST /ingest` | | | | ✔ |
| `GET /events`, `GET /timeline` | ✔ | ✔ | ✔ | |
| `GET /alerts` | ✔ | ✔ | ✔ | |
| `PATCH /alerts/:id` (estado) | ✔ | ✔ si está asignada a él (ABAC) | | |
| `POST /alerts/:id/asignar` | ✔ | ✔ solo para tomarla él mismo | | |
| `GET /forensics/verify` | ✔ | | ✔ | |
| `GET/POST /users`, `GET/POST /agents` | ✔ | | | |

- **Denegado por defecto:** `RolesGuard` es global y un endpoint sin `@Roles()` o `@Public()` responde 403.
- **ABAC:** `@CheckPolicy(AlertaPolicy.puedeModificar)`. El `PolicyGuard` carga el recurso desde el repositorio y evalúa `(usuario, recurso) => boolean`. Las políticas son funciones puras con pruebas unitarias.

## S3 · Cifrado, validación y abuso

- **Hashing:** Argon2id (`argon2`, memoryCost 19 MiB, timeCost 2, parallelism 1, según la recomendación de OWASP) para las contraseñas y las API keys de los agentes.
- **Validación:** cada entrada pasa por un schema Zod con `.strict()` (se rechazan los campos desconocidos). Lo mismo aplica a las variables de entorno al arrancar, a las reglas YAML al cargarlas y a las respuestas del backend en el frontend.
- **SQLi:** solo TypeORM con parámetros. Una regla de lint/revisión prohíbe `query()` con plantillas de texto.
- **XSS:** `helmet` con CSP `default-src 'self'`, Vue escapa por defecto, `vue/no-v-html: error` y el campo `raw` se muestra en `<pre>` como texto.
- **Rate limiting** (`@nestjs/throttler` con almacén en Redis):

| Ruta | Límite |
| --- | --- |
| `POST /auth/login` | 5/min por IP + usuario |
| `POST /auth/refresh` | 30/min por IP |
| `POST /ingest` | 600/min por agente |
| Resto | 120/min por usuario |

- **Cabeceras:** `helmet` (HSTS cuando haya HTTPS, `X-Content-Type-Options`, `Referrer-Policy`) y CORS restringido al origen de la web.

## Secretos

| Variable | Uso | Rotación |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Base de datos | Rotada el 18 oct tras quedar expuesta en un .docx del repositorio |
| `SECRETO_JWT` | Firma de los access tokens | Rotarla invalida todos los access |
| `CLAVE_FORENSE` | HMAC de la cadena | **No se rota** sin re-sellar la cadena (ver [09](09-deteccion-y-forense.md)) |

Se generan con `openssl rand -base64 48` y viven solo en el `.env` de la VM y en `docs/privado/`.
