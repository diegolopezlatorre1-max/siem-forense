import type { Rol } from '@siem/shared';
import type { RouteRecordRaw } from 'vue-router';

export interface Seccion {
  nombre: string; // nombre de la ruta
  ruta: string;
  titulo: string;
}

// Secciones del menú visibles para un rol, en el orden en que se declaran las rutas.
// Una ruta entra al menú si tiene meta.menu; meta.roles (si existe) decide quién la ve,
// con la misma regla que el guard, así el menú nunca ofrece una ruta que daría 403.
export function seccionesPara(rutas: readonly RouteRecordRaw[], rol: Rol | null): Seccion[] {
  if (rol === null) return [];
  return rutas
    .filter((r) => r.meta?.menu !== undefined && (r.meta.roles === undefined || r.meta.roles.includes(rol)))
    .map((r) => ({ nombre: String(r.name), ruta: r.path, titulo: r.meta?.menu ?? '' }));
}
