import type { Router } from 'vue-router';

import { useAuthStore } from '../stores/auth.js';

// Guard asíncrono (F3 de docs/06-frontend.md):
// 1. ruta pública -> pasa.
// 2. sin access en memoria -> intenta restaurar con la cookie; si falla -> /login?redirect=...
// 3. meta.roles sin el rol del usuario -> /403.
export function registrarGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();

    if (to.meta.public === true) return true;

    if (auth.accessToken === null) {
      try {
        await auth.restaurarSesion();
      } catch {
        return { name: 'login', query: { redirect: to.fullPath } };
      }
    }

    const roles = to.meta.roles;
    if (roles !== undefined && (auth.rol === null || !roles.includes(auth.rol))) {
      return { name: 'forbidden' };
    }

    return true;
  });
}
