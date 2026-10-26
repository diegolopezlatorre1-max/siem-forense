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
  stores/
    auth.ts            usuario, accessToken (en memoria), estado de sesión
    alerts.ts          normalizado
    events.ts          normalizado
    ui.ts              filtros y preferencias (persistencia selectiva)
  router/
    index.ts
    guards.ts
  views/               LoginView, EventosView, AlertasView, VerificarView, LineaTiempoView
  components/
  composables/
```

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
| Usuarios y agentes | `/admin` | admin |
