import type { RouteRecordRaw } from 'vue-router';
import type { Rol } from '@siem/shared';

// Tipado de los metadatos de ruta usados por los guards y el menú.
declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean; // ruta accesible sin sesión
    roles?: readonly Rol[]; // roles permitidos; si falta, basta estar autenticado
    menu?: string; // título en el menú principal; si falta, la ruta no aparece en él
    titulo?: string; // título de la pestaña si la ruta no está en el menú
  }
}

// Separadas del router para poder probar el menú sin navegador (createWebHistory usa window).
export const rutas: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    meta: { public: true, titulo: 'Iniciar sesión' },
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/403',
    name: 'forbidden',
    meta: { public: true, titulo: 'Acceso denegado' },
    component: () => import('../views/ForbiddenView.vue'),
  },
  {
    path: '/',
    name: 'inicio',
    meta: { titulo: 'Inicio' },
    component: () => import('../views/InicioView.vue'),
  },
  {
    path: '/eventos',
    name: 'eventos',
    meta: { menu: 'Eventos' },
    component: () => import('../views/EventosView.vue'),
  },
  {
    path: '/alertas',
    name: 'alertas',
    meta: { menu: 'Alertas' },
    component: () => import('../views/AlertasView.vue'),
  },
  {
    path: '/linea-tiempo',
    name: 'linea-tiempo',
    meta: { menu: 'Línea de tiempo' },
    component: () => import('../views/LineaTiempoView.vue'),
  },
  {
    path: '/verificar',
    name: 'verificar',
    meta: { roles: ['admin', 'auditor'], menu: 'Verificar cadena' },
    component: () => import('../views/VerificarView.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    meta: { roles: ['admin'], menu: 'Usuarios' },
    component: () => import('../views/UsuariosView.vue'),
  },
];
