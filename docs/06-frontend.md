# 06 · Frontend (Vue 3 + Pinia + TypeScript)

Cubre F1, F2 y F3 del [estándar CORE](02-estandar-core.md).

## Stack

Vue 3 (Composition API, `<script setup lang="ts">`), Vite, Pinia, vue-router 4, Axios y Zod (desde `@siem/shared`). Pruebas con Vitest y @vue/test-utils.

## Estructura

```
apps/web/src/
  main.ts
  api/
    http.ts            instancia Axios con interceptores
    auth.api.ts        funciones tipadas por recurso, que validan la respuesta con Zod
    alerts.api.ts
    events.api.ts
    forensics.api.ts
    timeline.api.ts
    users.api.ts
  stores/
    auth.ts            usuario, accessToken (en memoria), estado de sesión
    alerts.ts          normalizado
    events.ts          normalizado
    users.ts           normalizado (solo admin)
    timeline.ts        última consulta de la línea de tiempo
    ui.ts              filtros y preferencias (persistencia selectiva)
  router/
    rutas.ts           lista de rutas con meta.public / meta.roles / meta.menu
    menu.ts            seccionesPara(rutas, rol): el menú sale de las rutas
    index.ts
    guards.ts
  components/
    AppLayout.vue      barra superior fija: marca, menú por rol, usuario y cerrar sesión
    ChipSeveridad.vue  severidad de una alerta (Baja, Media, Alta, Crítica)
    ChipEstado.vue     estado de una alerta (Abierta, En progreso, …)
    IndicadorCarga.vue "Cargando…" con indicador animado (role=status)
    AvisoError.vue     problem+json de la API (detail › title › texto por defecto) o slot
    EstadoVacio.vue    listas y tablas sin resultados
    etiquetas.ts       textos visibles de severidades y estados
  views/               Login, 403, Inicio, Eventos, Alertas, LineaTiempo, Verificar, Usuarios
  styles/
    tokens.css         colores, tipografía, espaciado, radios y sombras; modo oscuro
    base.css           elementos, maquetación (.pagina, .panel, .tabla-contenedor) y .chip/.aviso
```

## Estilos

Los colores salen solo de `styles/tokens.css` (variables CSS); ninguna vista escribe un color fijo. El modo oscuro sigue la preferencia del sistema (`prefers-color-scheme`) y solo redefine colores y sombras. `styles/base.css` da estilo a botones, campos y tablas, así que las vistas solo añaden su maquetación en `<style scoped>`. Los botones son secundarios por defecto y la acción principal lleva `class="primario"`. Los chips usan `class="chip"` con `sev-<severidad>` o `est-<estado>`, pero las vistas los pintan con `ChipSeveridad` y `ChipEstado`.

Cada vista es un `<main class="pagina">`: ancho fluido hasta 1280 px, o `pagina estrecha` (820 px) para formularios y resultados cortos. Arriba va una `cabecera-pagina` con el título y el total. Filtros, tablas y bloques van en un `.panel`, y las tablas dentro de `.tabla-contenedor` para que se desplacen en horizontal en pantallas angostas. Carga, error y vacío se muestran siempre con `IndicadorCarga`, `AvisoError` y `EstadoVacio`.

## Menú y layout

`App.vue` envuelve en `AppLayout` toda ruta que no sea pública: Login y 403 van sin menú. Antes de la primera navegación (`matched` vacío) tampoco se pinta, para que el menú no aparezca un instante a quien el guard va a mandar al login.

El menú no se escribe a mano. Una ruta aparece en él si tiene `meta.menu` (su título), y `meta.roles` decide quién la ve, con la misma regla que el guard. Así el menú nunca ofrece una ruta que daría 403, y agregar una sección es agregar una ruta. Inicio muestra las mismas secciones como tarjetas, con una línea de descripción.

## F1 · TypeScript estricto

- `tsconfig`: `strict`, `noImplicitAny`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`.
- ESLint: `@typescript-eslint/no-explicit-any: error`, `vue/no-v-html: error`.
- Los tipos del dominio **no se escriben a mano**: se importan de `@siem/shared` (`type Alerta = z.infer<typeof AlertaSchema>`). Cada función de `api/*.api.ts` valida la respuesta con el schema antes de entregarla al store. Si el backend cambia el contrato, falla el typecheck o falla la validación con un error claro.

## F2 · Stores normalizados

Forma común para las colecciones:

```ts
interface ColeccionState<T extends { id: number }> {
  byId: Record<number, T>;
  allIds: number[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: Problem | null;   // el problem+json del backend
  fetchedAt: number | null; // caché: no se vuelve a pedir si han pasado menos de 30 s, salvo force
}
```

- Las acciones `fetchAll({ force })`, `upsert(item)` y `actualizarEstado(id, estado, version)` aplican la actualización optimista en la UI y la revierten si llega un 409.
- **Persistencia selectiva:** solo `ui` (filtros, tamaño de página) se guarda en `localStorage`. `auth` **nunca** se persiste: tras recargar la página, la sesión se recupera con la cookie de refresh.

## F3 · Routing y red

**Guard asíncrono** (`router.beforeEach`):
1. Si la ruta es pública (`meta.public`), se deja pasar.
2. Si no hay access en memoria, se intenta `auth.restaurarSesion()` (`POST /auth/refresh`). Si falla, se redirige a `/login?redirect=...`.
3. Si `meta.roles` no incluye el rol del usuario, se redirige a `/403`.

**Cliente Axios** (`api/http.ts`):
- `baseURL: '/api/v1'`, `withCredentials: true` (la cookie de refresh) y `timeout: 10 s`.
- Interceptor de petición: añade `Authorization: Bearer <access>` y `x-correlation-id` (UUID nuevo).
- Interceptor de respuesta:
  - **401:** un solo refresh compartido (una promesa en vuelo; las demás peticiones esperan en cola). Si sale bien, se reintenta la original. Si falla, se cierra la sesión y se navega a `/login`.
  - **Errores de red, 502, 503 y 504 en GET/HEAD:** hasta 3 reintentos con backoff exponencial y jitter (300 ms, 600 ms, 1200 ms).
  - Cualquier otro error se normaliza a `Problem` (schema compartido) para que los stores lo guarden tipado.

## Vistas

| Vista | Ruta | Roles |
| --- | --- | --- |
| Login | `/login` | público |
| Eventos (tabla con filtros host/usuario/IP/tipo/fecha) | `/eventos` | todos |
| Alertas (MITRE, severidad, estado, asignación) | `/alertas` | todos (editar: admin y analista) |
| Verificar cadena (verde/rojo y eslabón roto) | `/verificar` | admin, auditor |
| Línea de tiempo | `/linea-tiempo` | todos |
| Usuarios (lista y alta con rol) | `/admin` | admin |

**Usuarios (`/admin`):** lista los usuarios (`GET /users`) y crea uno nuevo (`POST /users`) con usuario, contraseña de 8 caracteres o más y rol. Antes de enviar, valida con el mismo `CrearUsuarioSchema` del backend. Un nombre repetido (409) se muestra como "Ese nombre de usuario ya existe", y la contraseña se borra del formulario tras crear. **Fuera de alcance por ahora:** cambiar el rol, desactivar usuarios (`PATCH /users/:id`, que no existe en el backend) y gestionar agentes desde la web (no hay `GET/POST /agents`; las llaves se crean con `pnpm --filter api agente:crear`).

**Nota sobre el 409 en Alertas:** la vista no aplica el cambio antes de la respuesta, como pedía el plan original. Envía la acción, aplica la alerta que devuelve el backend y, ante un 409, muestra el aviso y recarga la lista. Es más simple y evita estados intermedios incoherentes; el usuario ve el mismo resultado.
